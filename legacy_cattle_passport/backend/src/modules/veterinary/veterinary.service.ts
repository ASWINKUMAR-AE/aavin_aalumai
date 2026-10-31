import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { AuditService } from '../../services/audit.service.js';
import { RowDataPacket } from 'mysql2';

export class VeterinaryService {
  static async getAssignedCows(vetUserId: string) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT c.*,
              u.full_name as owner_name, u.phone as owner_phone,
              fp.farmer_id_code, fp.village as owner_village,
              (SELECT token FROM cow_qr_tokens WHERE cow_id = c.id AND is_revoked = 0 ORDER BY created_at DESC LIMIT 1) as qr_token,
              (SELECT wr.status FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as active_withdrawal_status,
              (SELECT wr.restriction_end FROM withdrawal_restrictions wr WHERE wr.cow_id = c.id AND wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP() LIMIT 1) as withdrawal_end_time
       FROM cows c
       JOIN cow_veterinarian_assignments cva ON c.id = cva.cow_id
       JOIN users u ON c.current_owner_user_id = u.id
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       WHERE cva.vet_user_id = ? AND c.is_active = 1
       ORDER BY c.health_status = 'under_treatment' DESC, c.updated_at DESC`,
      [vetUserId]
    );
    return rows;
  }

  static async getActiveWithdrawalAlerts(vetUserId?: string) {
    let sql = `
      SELECT wr.*,
             c.tag_number, c.name as cow_name, c.breed,
             u.full_name as owner_name, u.phone as owner_phone, fp.village,
             tr.dosage, tr.reason_for_treatment, tr.milk_withholding_end_time,
             COALESCE(mc.brand_name, tr.custom_medicine_name) as medicine_name,
             vet_u.full_name as prescribed_by_vet
      FROM withdrawal_restrictions wr
      JOIN cows c ON wr.cow_id = c.id
      JOIN users u ON c.current_owner_user_id = u.id
      LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
      JOIN treatment_records tr ON wr.treatment_id = tr.id
      LEFT JOIN medicine_catalog mc ON tr.medicine_id = mc.id
      JOIN users vet_u ON tr.vet_user_id = vet_u.id
      WHERE wr.status = 'active' AND wr.restriction_end > UTC_TIMESTAMP()
    `;
    const params: any[] = [];
    if (vetUserId) {
      sql += ` AND tr.vet_user_id = ?`;
      params.push(vetUserId);
    }
    sql += ` ORDER BY wr.restriction_end ASC`;

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  static async recordHealthObservation(vetUserId: string, data: any, ipAddress?: string) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const healthRecordId = uuidv4();
      await connection.query(
        `INSERT INTO cow_health_records (id, cow_id, recorded_by_vet_user_id, examination_date,
                                        body_temperature_c, heart_rate_bpm, rumen_motility,
                                        body_condition_score, clinical_signs, diagnosis,
                                        health_status_assigned, recommendations, next_follow_up_date,
                                        respiration_rate_bpm, udder_quarter_status, scc_reading)
         VALUES (?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          healthRecordId,
          data.cowId,
          vetUserId,
          data.bodyTemperatureC || null,
          data.heartRateBpm || null,
          data.rumenMotility || null,
          data.bodyConditionScore || null,
          data.clinicalSigns,
          data.diagnosis,
          data.healthStatusAssigned,
          data.recommendations || null,
          data.nextFollowUpDate || null,
          data.respirationRateBpm || null,
          data.udderQuarterStatus ? (typeof data.udderQuarterStatus === 'string' ? data.udderQuarterStatus : JSON.stringify(data.udderQuarterStatus)) : null,
          data.sccReading || null,
        ]
      );

      // Update cow's overall health status and optionally SCC
      const updateFields = [`health_status = ?`];
      const updateParams: any[] = [data.healthStatusAssigned];
      if (data.sccReading) {
        updateFields.push(`somatic_cell_count = ?`);
        updateParams.push(data.sccReading);
      }
      if (data.healthStatusAssigned === 'critical' || data.healthStatusAssigned === 'under_treatment') {
        updateFields.push(`milk_safety_index = 45`);
      } else {
        updateFields.push(`milk_safety_index = 98`);
      }
      updateParams.push(data.cowId);

      await connection.query(
        `UPDATE cows SET ${updateFields.join(', ')} WHERE id = ?`,
        updateParams
      );

      await connection.commit();

      await AuditService.log({
        actorUserId: vetUserId,
        action: 'HEALTH_EXAMINATION_RECORDED',
        entityType: 'cow_health_records',
        entityId: healthRecordId,
        ipAddress,
        details: { cowId: data.cowId, diagnosis: data.diagnosis, status: data.healthStatusAssigned },
      });

      return { healthRecordId, status: data.healthStatusAssigned };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async recordTreatment(vetUserId: string, data: any, ipAddress?: string) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const treatmentId = uuidv4();
      const startDate = new Date(data.treatmentStartDate);
      const endDate = new Date(data.treatmentEndDate);

      // Deterministic milk withholding end time = endDate + withdrawalPeriodDays
      const withholdingEndDate = new Date(endDate);
      withholdingEndDate.setDate(withholdingEndDate.getDate() + Number(data.withdrawalPeriodDays));

      await connection.query(
        `INSERT INTO treatment_records (id, cow_id, vet_user_id, medicine_id, custom_medicine_name,
                                       dosage, route_of_administration, treatment_start_date,
                                       treatment_end_date, withdrawal_period_days, milk_withholding_end_time,
                                       reason_for_treatment, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          treatmentId,
          data.cowId,
          vetUserId,
          data.medicineId || null,
          data.customMedicineName || null,
          data.dosage,
          data.routeOfAdministration || 'intramuscular',
          startDate,
          endDate,
          data.withdrawalPeriodDays,
          withholdingEndDate,
          data.reasonForTreatment,
          data.notes || null,
        ]
      );

      // If withdrawal period > 0, insert active restriction record
      if (data.withdrawalPeriodDays > 0) {
        const restrictionId = uuidv4();
        await connection.query(
          `INSERT INTO withdrawal_restrictions (id, treatment_id, cow_id, restriction_start, restriction_end, status, reason)
           VALUES (?, ?, ?, ?, ?, 'active', ?)`,
          [
            restrictionId,
            treatmentId,
            data.cowId,
            startDate,
            withholdingEndDate,
            `Active withdrawal: ${data.reasonForTreatment} (${data.withdrawalPeriodDays} days milk withholding)`,
          ]
        );

        // Update cow status
        await connection.query(
          `UPDATE cows SET health_status = 'under_treatment', milking_status = 'quarantine_hold' WHERE id = ?`,
          [data.cowId]
        );

        // Create in-app notification for the farmer owner
        const [cowRow] = await connection.query<RowDataPacket[]>(
          `SELECT current_owner_user_id, tag_number, name FROM cows WHERE id = ?`,
          [data.cowId]
        );
        if (cowRow.length > 0) {
          const ownerId = cowRow[0].current_owner_user_id;
          await connection.query(
            `INSERT INTO notifications (id, user_id, title, body, category, related_entity_type, related_entity_id)
             VALUES (?, ?, ?, ?, 'withdrawal_warning', 'cow', ?)`,
            [
              uuidv4(),
              ownerId,
              `⚠️ Withdrawal Hold Activated: ${cowRow[0].name}`,
              `Dr. recorded treatment for ${cowRow[0].tag_number}. Milk MUST BE WITHHELD until ${withholdingEndDate.toISOString().split('T')[0]} due to food safety withdrawal compliance.`,
              data.cowId,
            ]
          );
        }
      }

      await connection.commit();

      await AuditService.log({
        actorUserId: vetUserId,
        action: 'TREATMENT_AND_WITHDRAWAL_RECORDED',
        entityType: 'treatment_records',
        entityId: treatmentId,
        ipAddress,
        details: {
          cowId: data.cowId,
          withdrawalDays: data.withdrawalPeriodDays,
          withholdingEnds: withholdingEndDate.toISOString(),
        },
      });

      return { treatmentId, withholdingEndDate: withholdingEndDate.toISOString() };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async recordVaccination(vetUserId: string, data: any, ipAddress?: string) {
    const vaccinationId = uuidv4();
    await db.query(
      `INSERT INTO vaccination_records (id, cow_id, administered_by_vet_user_id, vaccine_name,
                                      batch_number, dose, administration_date, next_booster_due_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vaccinationId,
        data.cowId,
        vetUserId,
        data.vaccineName,
        data.batchNumber,
        data.dose,
        data.administrationDate,
        data.nextBoosterDueDate,
        data.notes || null,
      ]
    );

    await AuditService.log({
      actorUserId: vetUserId,
      action: 'VACCINATION_RECORDED',
      entityType: 'vaccination_records',
      entityId: vaccinationId,
      ipAddress,
      details: { cowId: data.cowId, vaccine: data.vaccineName },
    });

    return { vaccinationId };
  }

  static async getMedicineCatalog() {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM medicine_catalog ORDER BY category, brand_name ASC`
    );
    return rows;
  }

  static async getAppointments(vetUserId?: string, farmerUserId?: string) {
    let sql = `
      SELECT a.*,
             c.tag_number, c.name as cow_name,
             u_farmer.full_name as farmer_name, u_farmer.phone as farmer_phone,
             fp.village,
             u_vet.full_name as vet_name
      FROM appointments a
      JOIN cows c ON a.cow_id = c.id
      JOIN users u_farmer ON a.farmer_user_id = u_farmer.id
      LEFT JOIN farmer_profiles fp ON u_farmer.id = fp.user_id
      LEFT JOIN users u_vet ON a.vet_user_id = u_vet.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (vetUserId) {
      sql += ` AND (a.vet_user_id = ? OR a.vet_user_id IS NULL)`;
      params.push(vetUserId);
    }
    if (farmerUserId) {
      sql += ` AND a.farmer_user_id = ?`;
      params.push(farmerUserId);
    }
    sql += ` ORDER BY a.requested_date ASC`;

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  static async createAppointment(farmerUserId: string, data: any) {
    const appointmentId = uuidv4();

    // If vetUserId not provided, pick the assigned primary vet for the cow
    let vetUserId = data.vetUserId;
    if (!vetUserId) {
      const [assigned] = await db.query<RowDataPacket[]>(
        `SELECT vet_user_id FROM cow_veterinarian_assignments WHERE cow_id = ? AND is_primary = 1 LIMIT 1`,
        [data.cowId]
      );
      if (assigned.length > 0) {
        vetUserId = assigned[0].vet_user_id;
      } else {
        const [defaultVet] = await db.query<RowDataPacket[]>(
          `SELECT user_id FROM veterinary_profiles LIMIT 1`
        );
        vetUserId = defaultVet.length > 0 ? defaultVet[0].user_id : null;
      }
    }

    await db.query(
      `INSERT INTO appointments (id, farmer_user_id, cow_id, vet_user_id, requested_date, appointment_type, farmer_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'requested')`,
      [
        appointmentId,
        farmerUserId,
        data.cowId,
        vetUserId,
        new Date(data.requestedDate),
        data.appointmentType,
        data.farmerNotes || null,
      ]
    );

    return { appointmentId };
  }

  static async updateAppointmentStatus(appointmentId: string, status: string, vetNotes?: string) {
    await db.query(
      `UPDATE appointments SET status = ?, vet_notes = COALESCE(?, vet_notes) WHERE id = ?`,
      [status, vetNotes || null, appointmentId]
    );
    return { appointmentId, status };
  }
}

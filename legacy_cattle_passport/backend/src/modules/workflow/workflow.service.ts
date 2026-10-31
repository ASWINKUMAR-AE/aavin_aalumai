import { db } from '../../config/database.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../services/audit.service.js';

export interface RecordMilkDto {
  farmerUserId?: string;
  farmerName?: string;
  boothId: string;
  collectionDate: string;
  session: 'morning' | 'evening';
  quantityLitres: number;
  route: 'direct' | 'vendor';
  vendorId?: string;
  vendorName?: string;
  measurementMethod: 'farmer_wise' | 'combined';
  cowId?: string;
  notes?: string;
  createdByUserId: string;
}

export interface GenerateBoothReceiptDto {
  boothId: string;
  collectionDate: string;
  session: 'morning' | 'evening' | 'full_day';
  notes?: string;
  createdByUserId: string;
}

export interface ConfirmBmcDeliveryDto {
  measuredReceivedQuantity: number;
  receivedByUserId: string;
  receivedByName: string;
  notes?: string;
  thresholdLitres?: number;
}

export class WorkflowService {
  // 1. Get Booths
  static async getBooths() {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT b.*, bmc.name as bmc_name FROM booths b
       LEFT JOIN bmcs bmc ON b.assigned_bmc_id = bmc.id
       ORDER BY b.name ASC`
    );
    return rows;
  }

  // 2. Get BMCs
  static async getBmcs() {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM bmcs ORDER BY name ASC`
    );
    return rows;
  }

  // 3. Get Vendors
  static async getVendors() {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM vendors ORDER BY name ASC`
    );
    return rows;
  }

  // 4. Record Milk Transaction (Route A or Route B)
  static async recordMilkTransaction(data: RecordMilkDto) {
    if (data.quantityLitres <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    // Check for active veterinary withdrawal if cow or farmer is provided
    if (data.cowId) {
      const [wdRows] = await db.query<RowDataPacket[]>(
        `SELECT wr.*, mc.brand_name FROM withdrawal_restrictions wr
         LEFT JOIN treatment_records tr ON wr.treatment_id = tr.id
         LEFT JOIN medicine_catalog mc ON tr.medicine_id = mc.id
         WHERE wr.cow_id = ? AND wr.status = 'active' AND wr.restriction_end > NOW()`,
        [data.cowId]
      );
      if (wdRows && wdRows.length > 0) {
        throw new Error(`Milk supply rejected: Cow has active antibiotic/medicine withdrawal restriction until ${wdRows[0].restriction_end}`);
      }
    }

    const txId = `mtx-${uuidv4().substring(0, 8)}`;
    const allocation = data.measurementMethod === 'farmer_wise' ? 'measured' : 'not_available';

    await db.query(
      `INSERT INTO milk_transactions 
       (id, farmer_user_id, farmer_name, booth_id, collection_date, session, quantity_litres, route, vendor_id, vendor_name, measurement_method, individual_allocation, status, created_by_user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'recorded', ?, ?)`,
      [
        txId,
        data.farmerUserId || null,
        data.farmerName || null,
        data.boothId,
        data.collectionDate,
        data.session,
        data.quantityLitres,
        data.route,
        data.vendorId || null,
        data.vendorName || null,
        data.measurementMethod,
        allocation,
        data.createdByUserId,
        data.notes || null,
      ]
    );

    // If farmer-wise, create in-app notification for farmer
    if (data.farmerUserId) {
      await db.query(
        `INSERT INTO notifications (id, user_id, title, body, category, related_entity_type, related_entity_id)
         VALUES (?, ?, 'Milk Quantity Recorded', ?, 'collection_receipt', 'milk_transaction', ?)`,
        [
          `notif-${uuidv4().substring(0, 8)}`,
          data.farmerUserId,
          `Successfully recorded ${data.quantityLitres.toFixed(2)} Litres for ${data.session} collection on ${data.collectionDate}.`,
          txId,
        ]
      );
    }

    return {
      id: txId,
      message: 'Milk transaction recorded successfully',
      quantityLitres: data.quantityLitres,
    };
  }

  // 5. Query Milk Transactions
  static async listMilkTransactions(boothId?: string, collectionDate?: string, farmerUserId?: string) {
    let sql = `SELECT * FROM milk_transactions WHERE 1=1`;
    const params: any[] = [];

    if (boothId) {
      sql += ` AND booth_id = ?`;
      params.push(boothId);
    }
    if (collectionDate) {
      sql += ` AND collection_date = ?`;
      params.push(collectionDate);
    }
    if (farmerUserId) {
      sql += ` AND farmer_user_id = ?`;
      params.push(farmerUserId);
    }
    sql += ` ORDER BY created_at DESC`;

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  // 6. Review Booth Daily Collection
  static async reviewBoothCollection(boothId: string, collectionDate: string) {
    const [txRows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM milk_transactions 
       WHERE booth_id = ? AND collection_date = ? AND status = 'recorded'`,
      [boothId, collectionDate]
    );

    let directLitres = 0;
    let vendorLitres = 0;
    const contributingFarmerIds = new Set<string>();

    for (const tx of txRows) {
      const qty = parseFloat(tx.quantity_litres);
      if (tx.route === 'direct') {
        directLitres += qty;
        if (tx.farmer_user_id) contributingFarmerIds.add(tx.farmer_user_id);
      } else {
        vendorLitres += qty;
      }
    }

    const totalLitres = directLitres + vendorLitres;

    // Get assigned BMC
    const [boothRows] = await db.query<RowDataPacket[]>(
      `SELECT b.*, bmc.name as bmc_name, bmc.id as bmc_id 
       FROM booths b 
       JOIN bmcs bmc ON b.assigned_bmc_id = bmc.id 
       WHERE b.id = ?`,
      [boothId]
    );

    return {
      booth: boothRows[0] || null,
      collectionDate,
      totalRecordsCount: txRows.length,
      contributingFarmersCount: contributingFarmerIds.size,
      directLitres,
      vendorLitres,
      totalLitres,
      records: txRows,
    };
  }

  // 7. Generate Booth Receipt (Booth -> BMC Dispatch)
  static async generateBoothReceipt(data: GenerateBoothReceiptDto) {
    const review = await this.reviewBoothCollection(data.boothId, data.collectionDate);
    if (review.records.length === 0) {
      throw new Error('No unreceipted milk transactions available for this collection date');
    }

    const receiptId = `BR-${new Date().getFullYear()}-MDU-${Math.floor(100 + Math.random() * 900)}`;
    const verificationCode = `VCODE-MDU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const recordIds = review.records.map((r: any) => r.id);
    const measurementBasis = review.directLitres > 0 && review.vendorLitres > 0 
      ? 'mixed' 
      : (review.directLitres > 0 ? 'farmer_wise' : 'combined');

    const bmcId = review.booth.bmc_id;
    const bmcName = review.booth.bmc_name;
    const boothName = review.booth.name;

    // Insert Booth Receipt
    await db.query(
      `INSERT INTO booth_receipts
       (id, booth_id, booth_name, bmc_id, bmc_name, collection_date, session, dispatch_quantity, measurement_basis, included_record_ids, total_records_count, total_farmers_count, created_by_user_id, status, verification_code, notes, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent_to_bmc', ?, ?, NOW())`,
      [
        receiptId,
        data.boothId,
        boothName,
        bmcId,
        bmcName,
        data.collectionDate,
        data.session,
        review.totalLitres,
        measurementBasis,
        JSON.stringify(recordIds),
        review.totalRecordsCount,
        review.contributingFarmersCount,
        data.createdByUserId,
        verificationCode,
        data.notes || null,
      ]
    );

    // Update transactions to included_in_receipt
    await db.query(
      `UPDATE milk_transactions SET status = 'included_in_receipt', receipt_id = ?
       WHERE id IN (?)`,
      [receiptId, recordIds]
    );

    // Create entry in BMC Deliveries pending queue
    const deliveryId = `DEL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    await db.query(
      `INSERT INTO bmc_deliveries
       (id, booth_receipt_id, booth_id, booth_name, bmc_id, collection_date, dispatch_time, declared_dispatch_quantity, status)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 'pending_arrival')`,
      [
        deliveryId,
        receiptId,
        data.boothId,
        boothName,
        bmcId,
        data.collectionDate,
        review.totalLitres,
      ]
    );

    return {
      receiptId,
      deliveryId,
      verificationCode,
      dispatchQuantity: review.totalLitres,
      status: 'sent_to_bmc',
      message: 'Booth receipt created and dispatched to BMC',
    };
  }

  // 8. List Pending BMC Deliveries
  static async listBmcDeliveries(bmcId?: string) {
    let sql = `SELECT * FROM bmc_deliveries WHERE 1=1`;
    const params: any[] = [];
    if (bmcId) {
      sql += ` AND bmc_id = ?`;
      params.push(bmcId);
    }
    sql += ` ORDER BY collection_date DESC, created_at DESC`;

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  // 9. Confirm BMC Delivery & Check Quantity Mismatch
  static async confirmBmcDelivery(deliveryId: string, data: ConfirmBmcDeliveryDto) {
    const [delRows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM bmc_deliveries WHERE id = ?`,
      [deliveryId]
    );
    if (!delRows || delRows.length === 0) {
      throw new Error('BMC delivery record not found');
    }

    const delivery = delRows[0];
    const declared = parseFloat(delivery.declared_dispatch_quantity);
    const measured = data.measuredReceivedQuantity;
    const difference = declared - measured; // Declared - Measured
    const diffAbs = Math.abs(difference);
    const threshold = data.thresholdLitres || 5.0; // 5 Litres threshold

    let status: string = 'matched';
    let discrepancyCaseId: string | null = null;

    if (diffAbs > threshold) {
      status = 'mismatch_investigation';
      discrepancyCaseId = `DISC-${Math.floor(100 + Math.random() * 900)}`;
      const diffPercent = declared > 0 ? (diffAbs / declared) * 100 : 0;

      // Get BMC details
      const [bmcRows] = await db.query<RowDataPacket[]>(
        `SELECT name FROM bmcs WHERE id = ?`,
        [delivery.bmc_id]
      );
      const bmcName = bmcRows[0]?.name || 'BMC Centre';

      // Insert Discrepancy Case
      await db.query(
        `INSERT INTO discrepancy_cases
         (id, bmc_delivery_id, booth_id, booth_name, bmc_id, bmc_name, collection_date, declared_quantity, measured_quantity, difference_litres, difference_percent, status, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'under_investigation', ?)`,
        [
          discrepancyCaseId,
          deliveryId,
          delivery.booth_id,
          delivery.booth_name,
          delivery.bmc_id,
          bmcName,
          delivery.collection_date,
          declared,
          measured,
          difference,
          diffPercent,
          data.receivedByUserId,
        ]
      );

      // Create initial investigation note
      await db.query(
        `INSERT INTO discrepancy_notes (id, discrepancy_id, author_name, note, evidence_reference)
         VALUES (?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          discrepancyCaseId,
          data.receivedByName,
          data.notes || `Discrepancy detected: Declared ${declared}L vs Measured ${measured}L (Difference: ${difference.toFixed(2)}L). Investigation opened.`,
          'RECEIPT-VERIFICATION',
        ]
      );
    }

    // Update BMC Delivery
    await db.query(
      `UPDATE bmc_deliveries 
       SET measured_received_quantity = ?, difference_litres = ?, status = ?, received_at = NOW(), received_by_user_id = ?, discrepancy_case_id = ?
       WHERE id = ?`,
      [
        measured,
        difference,
        status,
        data.receivedByUserId,
        discrepancyCaseId,
        deliveryId,
      ]
    );

    return {
      deliveryId,
      declaredQuantity: declared,
      measuredQuantity: measured,
      differenceLitres: difference,
      status,
      discrepancyCaseId,
      hasDiscrepancy: status === 'mismatch_investigation',
    };
  }

  // 10. List Discrepancies
  static async listDiscrepancies(status?: string) {
    let sql = `SELECT dc.*, 
               (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', dn.id, 'author', dn.author_name, 'note', dn.note, 'evidenceReference', dn.evidence_reference, 'timestamp', dn.created_at))
                FROM discrepancy_notes dn WHERE dn.discrepancy_id = dc.id) as notes
               FROM discrepancy_cases dc WHERE 1=1`;
    const params: any[] = [];
    if (status) {
      sql += ` AND dc.status = ?`;
      params.push(status);
    }
    sql += ` ORDER BY dc.created_at DESC`;

    const [rows] = await db.query<RowDataPacket[]>(sql, params);
    return rows;
  }

  // 11. Add Note / Resolve / Escalate Discrepancy
  static async updateDiscrepancy(caseId: string, action: 'add_note' | 'resolve' | 'escalate', payload: any) {
    if (action === 'add_note') {
      await db.query(
        `INSERT INTO discrepancy_notes (id, discrepancy_id, author_name, note, evidence_reference)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), caseId, payload.authorName, payload.note, payload.evidenceReference || null]
      );
      return { success: true, message: 'Investigation note added' };
    }

    if (action === 'resolve') {
      await db.query(
        `UPDATE discrepancy_cases 
         SET status = 'resolved', resolution_reason = ?, resolved_at = NOW(), resolved_by_user_id = ?
         WHERE id = ?`,
        [payload.resolutionReason, payload.resolvedByUserId, caseId]
      );
      return { success: true, message: 'Discrepancy marked resolved' };
    }

    if (action === 'escalate') {
      await db.query(
        `UPDATE discrepancy_cases 
         SET status = 'escalated_to_union', union_review_notes = ?
         WHERE id = ?`,
        [payload.reason || 'Escalated by BMC manager for Union enforcement', caseId]
      );
      return { success: true, message: 'Case escalated to Union' };
    }

    throw new Error('Invalid discrepancy action');
  }

  // 12. Generate BMC Daily Receipt (BMC -> Union)
  static async generateBmcReceipt(bmcId: string, collectionDate: string, createdByUserId: string) {
    const [delRows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM bmc_deliveries 
       WHERE bmc_id = ? AND collection_date = ? AND measured_received_quantity IS NOT NULL`,
      [bmcId, collectionDate]
    );

    if (!delRows || delRows.length === 0) {
      throw new Error('No confirmed booth deliveries found for this BMC on the specified date');
    }

    let totalDeclared = 0;
    let totalReceived = 0;
    let hasDiscrepancies = false;
    let unresolvedCases = 0;

    for (const d of delRows) {
      totalDeclared += parseFloat(d.declared_dispatch_quantity);
      totalReceived += parseFloat(d.measured_received_quantity);
      if (d.status === 'mismatch_investigation' || d.status === 'escalated_to_union') {
        hasDiscrepancies = true;
        unresolvedCases++;
      }
    }

    const netDifference = totalDeclared - totalReceived;
    const bmcReceiptId = `BMCR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const verificationCode = `VCODE-UNION-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Get BMC Name
    const [bmcRows] = await db.query<RowDataPacket[]>(
      `SELECT name FROM bmcs WHERE id = ?`,
      [bmcId]
    );
    const bmcName = bmcRows[0]?.name || 'Melur BMC Hub';

    await db.query(
      `INSERT INTO bmc_receipts
       (id, bmc_id, bmc_name, union_id, collection_date, included_delivery_ids, total_booths_count, total_declared_quantity, total_received_quantity, net_difference, has_discrepancies, unresolved_cases_count, created_by_user_id, status, verification_code, submitted_at)
       VALUES (?, ?, ?, 'union-madurai-01', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent_to_union', ?, NOW())`,
      [
        bmcReceiptId,
        bmcId,
        bmcName,
        collectionDate,
        JSON.stringify(delRows.map((d) => d.id)),
        delRows.length,
        totalDeclared,
        totalReceived,
        netDifference,
        hasDiscrepancies ? 1 : 0,
        unresolvedCases,
        createdByUserId,
        verificationCode,
      ]
    );

    return {
      bmcReceiptId,
      bmcName,
      collectionDate,
      totalBoothsCount: delRows.length,
      totalDeclaredQuantity: totalDeclared,
      totalReceivedQuantity: totalReceived,
      netDifference,
      hasDiscrepancies,
      unresolvedCasesCount: unresolvedCases,
      status: 'sent_to_union',
      message: 'BMC daily receipt generated and submitted to Union',
    };
  }

  // 13. Union Review & Reports
  static async listUnionBmcReceipts() {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM bmc_receipts ORDER BY collection_date DESC, created_at DESC`
    );
    return rows;
  }

  static async reviewUnionReceipt(receiptId: string, notes: string, reviewerUserId: string) {
    await db.query(
      `UPDATE bmc_receipts 
       SET status = 'reviewed_by_union', union_review_notes = ?, reviewed_by_user_id = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [notes, reviewerUserId, receiptId]
    );
    return { success: true, message: 'BMC receipt reviewed and approved by Union' };
  }

  // 14. Consolidated District Collection Summary (No Double Counting)
  static async getConsolidatedSummary(collectionDate?: string) {
    const targetDate = collectionDate || new Date().toISOString().split('T')[0];

    // Booth level
    const [boothSumRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(id) as total_tx_count, 
              COALESCE(SUM(quantity_litres), 0) as total_booth_intake,
              COUNT(DISTINCT farmer_user_id) as total_farmers_count
       FROM milk_transactions WHERE collection_date = ?`,
      [targetDate]
    );

    // BMC level intake
    const [bmcSumRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(id) as total_deliveries,
              COALESCE(SUM(declared_dispatch_quantity), 0) as total_declared_dispatch,
              COALESCE(SUM(measured_received_quantity), 0) as total_bmc_received,
              COALESCE(SUM(difference_litres), 0) as total_transit_difference
       FROM bmc_deliveries WHERE collection_date = ?`,
      [targetDate]
    );

    // Discrepancy counts
    const [discCountRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(id) as active_discrepancies 
       FROM discrepancy_cases 
       WHERE status IN ('open', 'under_investigation', 'escalated_to_union')`
    );

    return {
      date: targetDate,
      farmerAndBoothLevel: {
        recordedIntakeLitres: parseFloat(boothSumRows[0].total_booth_intake),
        transactionCount: boothSumRows[0].total_tx_count,
        farmersCount: boothSumRows[0].total_farmers_count,
      },
      bmcLevel: {
        declaredDispatchLitres: parseFloat(bmcSumRows[0].total_declared_dispatch),
        measuredIntakeLitres: parseFloat(bmcSumRows[0].total_bmc_received),
        netTransitVarianceLitres: parseFloat(bmcSumRows[0].total_transit_difference),
        deliveriesCount: bmcSumRows[0].total_deliveries,
      },
      discrepancies: {
        activeCount: discCountRows[0].active_discrepancies,
      },
    };
  }
}

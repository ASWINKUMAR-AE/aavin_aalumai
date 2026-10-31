import { Request, Response } from 'express';
import { VeterinaryService } from './veterinary.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class VeterinaryController {
  static async getAssignedCows(req: Request, res: Response) {
    try {
      const cows = await VeterinaryService.getAssignedCows(req.user!.id);
      return sendSuccess(res, cows);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getWithdrawalAlerts(req: Request, res: Response) {
    try {
      const vetUserId = req.user!.roles.includes('admin') ? undefined : req.user!.id;
      const alerts = await VeterinaryService.getActiveWithdrawalAlerts(vetUserId);
      return sendSuccess(res, alerts);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async recordHealth(req: Request, res: Response) {
    try {
      const result = await VeterinaryService.recordHealthObservation(req.user!.id, req.body, req.ip);
      return sendSuccess(res, result, 'Clinical examination recorded successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async recordTreatment(req: Request, res: Response) {
    try {
      const result = await VeterinaryService.recordTreatment(req.user!.id, req.body, req.ip);
      return sendSuccess(res, result, 'Treatment & withdrawal restriction recorded successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async recordVaccination(req: Request, res: Response) {
    try {
      const result = await VeterinaryService.recordVaccination(req.user!.id, req.body, req.ip);
      return sendSuccess(res, result, 'Vaccination recorded successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getMedicines(req: Request, res: Response) {
    try {
      const medicines = await VeterinaryService.getMedicineCatalog();
      return sendSuccess(res, medicines);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getAppointments(req: Request, res: Response) {
    try {
      const isVet = req.user!.roles.includes('veterinary');
      const isFarmer = req.user!.roles.includes('farmer');

      const appointments = await VeterinaryService.getAppointments(
        isVet ? req.user!.id : undefined,
        isFarmer ? req.user!.id : undefined
      );
      return sendSuccess(res, appointments);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async createAppointment(req: Request, res: Response) {
    try {
      const result = await VeterinaryService.createAppointment(req.user!.id, req.body);
      return sendSuccess(res, result, 'Appointment request submitted successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, vetNotes } = req.body;
      const result = await VeterinaryService.updateAppointmentStatus(id, status, vetNotes);
      return sendSuccess(res, result, 'Appointment updated');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}

import { Request, Response } from 'express';
import { CowsService } from './cows.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class CowsController {
  static async list(req: Request, res: Response) {
    try {
      const { centreId, search } = req.query as { centreId?: string; search?: string };
      let ownerId: string | undefined = undefined;

      // If logged in as farmer, restrict strictly to own cows
      if (req.user!.roles.includes('farmer') && !req.user!.roles.includes('admin')) {
        ownerId = req.user!.id;
      }

      const cows = await CowsService.listCows({ ownerId, centreId, search });
      return sendSuccess(res, cows);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const cow = await CowsService.createCow(req.user!.id, req.body);
      return sendSuccess(res, cow, 'Cow registered successfully with unique digital passport', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const cow = await CowsService.getCowById(req.params.id);
      if (!cow) return sendError(res, 'Cow not found', 404);

      if (req.user!.roles.includes('farmer') && cow.current_owner_user_id !== req.user!.id) {
        return sendError(res, 'Forbidden: You do not have permission to view this cow', 403);
      }

      return sendSuccess(res, cow);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async lookup(req: Request, res: Response) {
    try {
      const { identifier } = req.params;
      const cow = await CowsService.lookupCowByIdentifier(identifier);
      if (!cow) return sendError(res, 'Cow record not found with the scanned QR token or Tag ID', 404);

      // Farmers can only lookup their own cows
      if (req.user!.roles.includes('farmer') && cow.current_owner_user_id !== req.user!.id) {
        return sendError(res, 'Forbidden: This cow belongs to another farmer', 403);
      }

      return sendSuccess(res, cow, 'Cow digital passport retrieved');
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getPassport(req: Request, res: Response) {
    try {
      const passport = await CowsService.getDigitalPassport(req.params.id);
      if (!passport) return sendError(res, 'Digital passport not found', 404);

      if (req.user!.roles.includes('farmer') && passport.cow.current_owner_user_id !== req.user!.id) {
        return sendError(res, 'Forbidden: You can only view digital passports for your own cattle', 403);
      }

      return sendSuccess(res, passport);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getPortalAllTags(req: Request, res: Response) {
    try {
      const data = await CowsService.getPortalAllTags();
      return sendSuccess(res, data, 'Cattle QR tags list for web portal');
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getPortalPassport(req: Request, res: Response) {
    try {
      const { identifier } = req.params;
      const cow = await CowsService.lookupCowByIdentifier(identifier);
      if (!cow) return sendError(res, 'Cow not found with the specified ID or Tag Number', 404);

      const passport = await CowsService.getDigitalPassport(cow.id);
      return sendSuccess(res, passport, 'Digital Passport retrieved successfully for portal');
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getPortalSummary(req: Request, res: Response) {
    try {
      const summary = await CowsService.getPortalSummary();
      return sendSuccess(res, summary, 'Portal analytics summary retrieved');
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async createPortalTag(req: Request, res: Response) {
    try {
      const { ownerId, tagNumber, name, breed, averageDailyYield, healthStatus } = req.body;
      if (!ownerId || !tagNumber || !name || !breed) {
        return sendError(res, 'Farmer ownerId, tagNumber, name, and breed are required', 400);
      }

      const cow = await CowsService.createPortalTag({
        ownerId,
        tagNumber,
        name,
        breed,
        averageDailyYield: parseFloat(averageDailyYield) || 12.0,
        healthStatus,
      });

      return sendSuccess(res, cow, 'New cattle registered and QR tag generated successfully in MySQL', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const cowId = req.params.id;
      const existing = await CowsService.getCowById(cowId);
      if (!existing) {
        return sendError(res, 'Cow record not found', 404);
      }

      // Record-level permission check: farmers can only edit their own cows
      // Doctors (veterinary) and Admins can update any cow's record!
      const isFarmerOnly = req.user!.roles.includes('farmer') &&
        !req.user!.roles.includes('veterinary') &&
        !req.user!.roles.includes('admin');

      if (isFarmerOnly && existing.current_owner_user_id !== req.user!.id) {
        return sendError(res, 'Forbidden: You can only update your own cattle records', 403);
      }

      const updatedCow = await CowsService.updateCow(cowId, req.body, req.user!.id);
      return sendSuccess(res, updatedCow, 'Cattle record updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updatePortalCow(req: Request, res: Response) {
    try {
      const cowId = req.params.id;
      const updatedCow = await CowsService.updateCow(cowId, req.body);
      return sendSuccess(res, updatedCow, 'Cattle record updated successfully via portal');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}



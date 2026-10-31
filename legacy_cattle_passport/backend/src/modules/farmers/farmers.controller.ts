import { Request, Response } from 'express';
import { FarmersService } from './farmers.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class FarmersController {
  static async getMe(req: Request, res: Response) {
    try {
      const profile = await FarmersService.getFarmerProfile(req.user!.id);
      if (!profile) return sendError(res, 'Farmer profile not found', 404);
      return sendSuccess(res, profile);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async updateMe(req: Request, res: Response) {
    try {
      const updated = await FarmersService.updateFarmerProfile(req.user!.id, req.body);
      return sendSuccess(res, updated, 'Profile updated successfully');
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async updateById(req: Request, res: Response) {
    try {
      const targetUserId = req.params.id;
      // Permission check: a pure farmer role can only update their own account
      // Veterinary doctors, Admins, Society operators, and Collection operators can update any farmer profile
      const isFarmerOnly = req.user!.roles.includes('farmer') &&
        !req.user!.roles.includes('veterinary') &&
        !req.user!.roles.includes('admin') &&
        !req.user!.roles.includes('booth') &&
        !req.user!.roles.includes('collection_operator');

      if (isFarmerOnly && targetUserId !== req.user!.id) {
        return sendError(res, 'Forbidden: You can only update your own farmer profile', 403);
      }

      const updated = await FarmersService.updateFarmerProfile(targetUserId, req.body);
      return sendSuccess(res, updated, 'Farmer profile updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updatePortalFarmer(req: Request, res: Response) {
    try {
      const targetUserId = req.params.id;
      const updated = await FarmersService.updateFarmerProfile(targetUserId, req.body);
      return sendSuccess(res, updated, 'Farmer profile updated successfully via portal');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }


  static async listAll(req: Request, res: Response) {
    try {
      const { centreId } = req.query as { centreId?: string };
      const farmers = await FarmersService.listAllFarmers(centreId);
      return sendSuccess(res, farmers);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const profile = await FarmersService.getFarmerProfile(req.params.id);
      if (!profile) return sendError(res, 'Farmer not found', 404);
      return sendSuccess(res, profile);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getFarmerCows(req: Request, res: Response) {
    try {
      const targetUserId = req.params.id === 'me' ? req.user!.id : req.params.id;

      // Record-level permission check: Farmers can only see their own cows
      if (req.user!.roles.includes('farmer') && targetUserId !== req.user!.id) {
        return sendError(res, 'Forbidden: You can only view your own cows', 403);
      }

      const cows = await FarmersService.getFarmerCows(targetUserId);
      return sendSuccess(res, cows);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getFarmerPayments(req: Request, res: Response) {
    try {
      const targetUserId = req.params.id === 'me' ? req.user!.id : req.params.id;

      if (req.user!.roles.includes('farmer') && targetUserId !== req.user!.id) {
        return sendError(res, 'Forbidden: You can only view your own payments', 403);
      }

      const payments = await FarmersService.getFarmerPayments(targetUserId);
      return sendSuccess(res, payments);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }
}

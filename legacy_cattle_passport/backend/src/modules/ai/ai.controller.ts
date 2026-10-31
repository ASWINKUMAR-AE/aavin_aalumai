import { Request, Response } from 'express';
import { AIService } from './ai.service.js';
import { CowsService } from '../cows/cows.service.js';
import { ProductionService } from '../production/production.service.js';
import { db } from '../../config/database.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class AIController {
  static async chat(req: Request, res: Response) {
    try {
      const { message, language } = req.body;
      if (!message) return sendError(res, 'Message is required', 400);

      const userId = req.user!.id;

      // 1. Query live database records for this user (phpMyAdmin / MySQL)
      let dbContextText = '';
      try {
        const [cows, prodSummary, recentCollections] = await Promise.all([
          CowsService.listCows({ ownerId: userId }).catch(() => []),
          ProductionService.getProductionSummary(userId).catch(() => null),
          db.query(
            `SELECT mcr.receipt_number, mcr.quantity_litres, mcr.calculated_amount_inr,
                    mqt.fat_percentage, mqt.snf_percentage, msd.decision as safety_decision,
                    c.name as cow_name, c.tag_number
             FROM milk_collection_records mcr
             LEFT JOIN milk_quality_tests mqt ON mcr.id = mqt.collection_record_id
             LEFT JOIN milk_safety_decisions msd ON mcr.id = msd.collection_record_id
             LEFT JOIN cows c ON mcr.cow_id = c.id
             WHERE mcr.farmer_user_id = ?
             ORDER BY mcr.created_at DESC LIMIT 5`,
            [userId]
          ).then(([rows]: any) => rows).catch(() => []),
        ]);

        if (cows && cows.length > 0) {
          dbContextText += `\n[VERIFIED DATABASE RECORDS FROM AAVIN MYSQL DB]:\n`;
          dbContextText += `- Registered Cows (${cows.length}): ` +
            cows.map((c: any) => `${c.name || 'Cow'} (#${c.tag_number}, Breed: ${c.breed}, Health: ${c.health_status}, Status: ${c.milking_status}, Withdrawal: ${c.active_withdrawal_status || 'None'})`).join('; ') + '\n';
        }

        if (prodSummary && Array.isArray(prodSummary.weeklyTrend) && prodSummary.weeklyTrend.length > 0) {
          const total7DayLitres = prodSummary.weeklyTrend.reduce((acc: number, r: any) => acc + Number(r.total_litres || 0), 0);
          dbContextText += `- 7-Day Total Yield: ${total7DayLitres.toFixed(1)} Litres recorded across ${prodSummary.weeklyTrend.length} days\n`;
        }

        if (recentCollections && recentCollections.length > 0) {
          dbContextText += `- Recent Collections: ` +
            recentCollections.map((r: any) => `Receipt #${r.receipt_number}: ${r.quantity_litres}L (Fat: ${r.fat_percentage || 0}%, SNF: ${r.snf_percentage || 0}%, Safety: ${r.safety_decision || 'CLEAR'}, Amount: Rs.${r.calculated_amount_inr || 0})`).join('; ') + '\n';
        }
      } catch (dbErr) {
        console.warn('[AI Controller] DB context retrieval warning:', dbErr);
      }

      // 2. Build targeted prompt
      let fullPrompt = '';
      if (dbContextText.trim().length > 0) {
        fullPrompt = `${dbContextText}\n` +
          `Task: The user has real records in the Aavin database. Answer their question by converting these verified database records into a clear, natural, friendly, and structured message for best communication. Separate recorded facts from suggestions.\n\n` +
          `User Question: ${message}`;
      } else {
        fullPrompt = `Note: No existing cattle records found in database for this specific user. Answer the farmer's question using expert Aavin Dairy & Veterinary advisory knowledge (fodder, milk quality FAT/SNF improvement, breeds, clinical hygiene).\n\n` +
          `User Question: ${message}`;
      }

      const systemInstruction = `You are the Aavin Madurai Dairy Intelligence Assistant (Tamil Nadu Milk Producers Federation). Provide supportive, accurate, friendly advice in ${
        language === 'ta' ? 'Tamil (தமிழ்) with clear simple terms' : 'clear, natural English'
      }. If database data is provided, communicate their real cow and milk stats clearly. Never prescribe prescription antibiotics directly or alter veterinary withdrawal periods.`;

      const response = await AIService.executePrompt(userId, 'chat', fullPrompt, systemInstruction);
      return sendSuccess(res, response);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async cowSummary(req: Request, res: Response) {
    try {
      const { cowId, language } = req.body;
      const passport = await CowsService.getDigitalPassport(cowId);
      if (!passport) return sendError(res, 'Cow not found', 404);

      const prompt = `Analyze this cow digital passport and provide a concise summary for the farmer:\n` +
        `Tag: ${passport.cow.tag_number}, Breed: ${passport.cow.breed}, Health Status: ${passport.cow.health_status}, Milking Status: ${passport.cow.milking_status}\n` +
        `Withdrawal: ${passport.cow.active_withdrawal_status || 'None'}\n` +
        `Recent Health: ${JSON.stringify(passport.healthRecords.slice(0, 2))}\n` +
        `Recent Treatments: ${JSON.stringify(passport.treatments.slice(0, 2))}\n` +
        `Recent Yield: ${JSON.stringify(passport.production.slice(0, 5))}\n` +
        `Give 3 key actionable takeaways for the farmer in ${language === 'ta' ? 'Tamil' : 'English'}.`;

      const response = await AIService.executePrompt(req.user!.id, 'cow_summary', prompt);
      return sendSuccess(res, response);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async productionInsights(req: Request, res: Response) {
    try {
      const { language } = req.body;
      const summary = await ProductionService.getProductionSummary(req.user!.id);

      const prompt = `Provide production insights for this farmer's 7-day milk collection data:\n` +
        `${JSON.stringify(summary.weeklyTrend)}\n` +
        `Highlight daily trends, morning vs evening variance, and feeding recommendations in ${
          language === 'ta' ? 'Tamil' : 'English'
        }.`;

      const response = await AIService.executePrompt(req.user!.id, 'production_insights', prompt);
      return sendSuccess(res, response);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async qualitySummary(req: Request, res: Response) {
    try {
      const { collectionId, language } = req.body;
      const prompt = `Explain the milk quality results for collection ID: ${collectionId} in ${
        language === 'ta' ? 'Tamil' : 'English'
      }. Explain Fat %, SNF %, Temperature, and why the CLEAR/REVIEW/HOLD decision was made transparently.`;

      const response = await AIService.executePrompt(req.user!.id, 'quality_summary', prompt);
      return sendSuccess(res, response);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async getConfig(req: Request, res: Response) {
    try {
      const config = await AIService.getSettings();
      return sendSuccess(res, config);
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async updateConfig(req: Request, res: Response) {
    try {
      const updated = await AIService.updateSettings(req.user!.id, req.body);
      return sendSuccess(res, updated, 'AI configuration updated successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async testConnectivity(req: Request, res: Response) {
    try {
      const testPrompt = 'Respond with "Aavin Dairy AI operational" in 5 words.';
      const result = await AIService.executePrompt(req.user!.id, 'test_connectivity', testPrompt);
      return sendSuccess(res, result, 'AI connectivity test passed');
    } catch (err: any) {
      return sendError(res, err.message, 500);
    }
  }

  static async getHealth(req: Request, res: Response) {
    try {
      const settings = await AIService.getSettings();
      return sendSuccess(res, {
        status: 'healthy',
        activeProvider: settings.active_provider,
        fallbackEnabled: Boolean(settings.fallback_enabled),
        fallbackProvider: settings.fallback_provider,
      });
    } catch (err: any) {
      return sendError(res, err.message);
    }
  }

  static async translate(req: Request, res: Response) {
    try {
      const { text, sourceLanguage, targetLanguage } = req.body;
      if (!text || typeof text !== 'string') {
        return sendError(res, 'Text is required for translation', 400);
      }

      const { IndicTrans2BackendService } = await import('./indictrans2.service.js');
      const result = await IndicTrans2BackendService.translate(
        text,
        sourceLanguage,
        targetLanguage
      );

      return sendSuccess(res, result, 'Translation completed via IndicTrans2');
    } catch (err: any) {
      return sendError(res, err.message || 'Translation failed', 500);
    }
  }
}


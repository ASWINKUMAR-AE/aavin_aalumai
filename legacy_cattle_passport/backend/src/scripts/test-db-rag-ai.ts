import { AIService } from '../modules/ai/ai.service.js';
import { db } from '../config/database.js';
import { CowsService } from '../modules/cows/cows.service.js';
import { ProductionService } from '../modules/production/production.service.js';

async function testDbRagAI() {
  const userId = 'usr-farmer-01'; // Farmer Murugan

  console.log('--- Step 1: Query Database Records for Farmer Murugan ---');
  const cows = await CowsService.listCows({ ownerId: userId });
  console.log(`Found ${cows.length} cows in DB:`, cows.map((c: any) => `${c.name} (#${c.tag_number})`));

  const prodSummary = await ProductionService.getProductionSummary(userId);
  const total7DayLitres = (prodSummary?.weeklyTrend || []).reduce((acc: number, r: any) => acc + Number(r.total_litres || 0), 0);
  console.log('7-Day Total Yield in DB:', total7DayLitres, 'Litres');

  const [collections] = await db.query<any[]>(
    `SELECT mcr.receipt_number, mcr.quantity_litres, mcr.calculated_amount_inr,
            mqt.fat_percentage, mqt.snf_percentage, msd.decision as safety_decision,
            c.name as cow_name
     FROM milk_collection_records mcr
     LEFT JOIN milk_quality_tests mqt ON mcr.id = mqt.collection_record_id
     LEFT JOIN milk_safety_decisions msd ON mcr.id = msd.collection_record_id
     LEFT JOIN cows c ON mcr.cow_id = c.id
     WHERE mcr.farmer_user_id = ?
     ORDER BY mcr.created_at DESC LIMIT 3`,
    [userId]
  );
  console.log('Recent Collections in DB:', collections.length);

  console.log('\n--- Step 2: Testing AI Database-to-Message Conversion (Gemma 3:12B) ---');
  let dbContextText = `[VERIFIED DATABASE RECORDS FROM AAVIN MYSQL DB]:\n` +
    `- Registered Cows (${cows.length}): ` +
    cows.map((c: any) => `${c.name || 'Cow'} (#${c.tag_number}, Breed: ${c.breed}, Health: ${c.health_status}, Status: ${c.milking_status}, Withdrawal: ${c.active_withdrawal_status || 'None'})`).join('; ') + '\n' +
    `- 7-Day Production: ${total7DayLitres} Litres\n` +
    `- Recent Collections: ` +
    collections.map((r: any) => `Receipt #${r.receipt_number}: ${r.quantity_litres}L (Fat: ${r.fat_percentage}%, SNF: ${r.snf_percentage}%, Safety: ${r.safety_decision}, Amount: Rs.${r.calculated_amount_inr})`).join('; ');

  const fullPrompt = `${dbContextText}\n` +
    `Task: Convert these verified database records into a clear, natural, and friendly message answering: "How are my cows performing and what is my milk quality status?"`;

  const start = Date.now();
  const aiRes = await AIService.executePrompt(userId, 'chat', fullPrompt);
  console.log(`\n✅ AI DB-to-Message Response (${Date.now() - start}ms):\n`);
  console.log(aiRes.text);

  process.exit(0);
}

testDbRagAI().catch(console.error);

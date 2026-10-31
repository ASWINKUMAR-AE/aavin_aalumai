import {
  DemoUser,
  Farmer,
  Cow,
  Booth,
  BMC,
  UnionConfig,
  Vendor,
  MilkRecord,
  BoothReceipt,
  BMCDelivery,
  DiscrepancyCase,
  BMCReceipt,
  InAppNotification,
  SocietyIncomeRecord,
} from '../types/aavin';

// Today's dates
const todayStr = '2026-10-14';
const yesterdayStr = '2026-10-13';
const twoDaysAgoStr = '2026-10-12';
const threeDaysAgoStr = '2026-10-11';
const fourDaysAgoStr = '2026-10-10';

// ============================================================================
// 1. UNION CONFIG
// ============================================================================
export const GENERATED_UNION: UnionConfig = {
  id: 'UNION001',
  name: "Aavin Madurai District Co-operative Milk Producers' Union Ltd.",
  headquarters: 'Sathamangalam, Madurai - 625020',
  district: 'Madurai',
  generalManager: 'Er. K. Rajendran',
  mismatchThresholdLitres: 5.0,
  mismatchThresholdPercent: 0.5,
};

// ============================================================================
// 2. 10 BULK MILK COOLING CENTERS (BMCs)
// ============================================================================
interface BmcDef {
  id: string;
  code: string;
  name: string;
  location: string;
  taluk: string;
  capacityLitres: number;
  managerName: string;
  phone: string;
}

const BMC_DEFS: BmcDef[] = [
  { id: 'BMC001', code: 'AAVIN-BMC-MDU-01', name: 'Melur Central Bulk Milk Cooling Centre', location: 'Trichy Main Road, Melur', taluk: 'Melur', capacityLitres: 5000, managerName: 'P. Arumugam', phone: '9842001001' },
  { id: 'BMC002', code: 'AAVIN-BMC-MDU-02', name: 'Vadipatti Bulk Milk Cooling Centre', location: 'Dindigul Highway, Vadipatti', taluk: 'Vadipatti', capacityLitres: 5000, managerName: 'K. Balakrishnan', phone: '9842001002' },
  { id: 'BMC003', code: 'AAVIN-BMC-MDU-03', name: 'Usilampatti Bulk Milk Cooling Centre', location: 'Theni Main Road, Usilampatti', taluk: 'Usilampatti', capacityLitres: 5000, managerName: 'G. Veerappan', phone: '9842001003' },
  { id: 'BMC004', code: 'AAVIN-BMC-MDU-04', name: 'Tirumangalam Bulk Milk Cooling Centre', location: 'Kappalur Industrial Area, Tirumangalam', taluk: 'Tirumangalam', capacityLitres: 5000, managerName: 'S. Ramamoorthy', phone: '9842001004' },
  { id: 'BMC005', code: 'AAVIN-BMC-MDU-05', name: 'Madurai East Bulk Milk Cooling Centre', location: 'Othakadai, Madurai East', taluk: 'Madurai East', capacityLitres: 5000, managerName: 'R. Sundar', phone: '9842001005' },
  { id: 'BMC006', code: 'AAVIN-BMC-MDU-06', name: 'Alanganallur Bulk Milk Cooling Centre', location: 'Jallikattu Road, Alanganallur', taluk: 'Vadipatti', capacityLitres: 4000, managerName: 'M. Dharmalingam', phone: '9842001006' },
  { id: 'BMC007', code: 'AAVIN-BMC-MDU-07', name: 'Peraiyur Bulk Milk Cooling Centre', location: 'Sedapatti Road, Peraiyur', taluk: 'Peraiyur', capacityLitres: 4000, managerName: 'T. Karuppasamy', phone: '9842001007' },
  { id: 'BMC008', code: 'AAVIN-BMC-MDU-08', name: 'Kottampatti Bulk Milk Cooling Centre', location: 'Singampunari Road, Kottampatti', taluk: 'Melur', capacityLitres: 4000, managerName: 'V. Shanmugavel', phone: '9842001008' },
  { id: 'BMC009', code: 'AAVIN-BMC-MDU-09', name: 'Sedapatti Bulk Milk Cooling Centre', location: 'Kallupatti Junction, Sedapatti', taluk: 'Peraiyur', capacityLitres: 4000, managerName: 'A. Marimuthu', phone: '9842001009' },
  { id: 'BMC010', code: 'AAVIN-BMC-MDU-10', name: 'Kallikudi Bulk Milk Cooling Centre', location: 'Virudhunagar Border Road, Kallikudi', taluk: 'Tirumangalam', capacityLitres: 4000, managerName: 'N. Palanisamy', phone: '9842001010' },
];

// ============================================================================
// 3. 30 PRIMARY SOCIETIES (DCS - EXACTLY 3 PER BMC)
// ============================================================================
interface BoothDef {
  code: string;
  name: string;
  village: string;
  taluk: string;
  operatorName: string;
  phone: string;
}

const SOCIETY_NAMES: Record<string, BoothDef[]> = {
  BMC001: [
    { code: 'AAVIN-DCS-01', name: 'Melur North Primary Milk Producers Co-op', village: 'Melur North', taluk: 'Melur', operatorName: 'P. Kannan', phone: '9842002001' },
    { code: 'AAVIN-DCS-02', name: 'Melur Town Milk Supply Society', village: 'Melur Town', taluk: 'Melur', operatorName: 'S. Alagar', phone: '9842002002' },
    { code: 'AAVIN-DCS-03', name: 'Navinipatti Village Co-op Society', village: 'Navinipatti', taluk: 'Melur', operatorName: 'M. Palanivel', phone: '9842002003' },
  ],
  BMC002: [
    { code: 'AAVIN-DCS-04', name: 'Vadipatti Town Milk Producers Society', village: 'Vadipatti Town', taluk: 'Vadipatti', operatorName: 'K. Balu', phone: '9842002004' },
    { code: 'AAVIN-DCS-05', name: 'Katchakatti Village Dairy Co-op', village: 'Katchakatti', taluk: 'Vadipatti', operatorName: 'R. Muthuramalingam', phone: '9842002005' },
    { code: 'AAVIN-DCS-06', name: 'Palamedu Primary Milk Society', village: 'Palamedu', taluk: 'Vadipatti', operatorName: 'C. Vellaisamy', phone: '9842002006' },
  ],
  BMC003: [
    { code: 'AAVIN-DCS-07', name: 'Usilampatti Central Dairy Co-op', village: 'Usilampatti', taluk: 'Usilampatti', operatorName: 'V. Pandian', phone: '9842002007' },
    { code: 'AAVIN-DCS-08', name: 'Valandur Farmers Milk Collection Center', village: 'Valandur', taluk: 'Usilampatti', operatorName: 'G. Mayandi', phone: '9842002008' },
    { code: 'AAVIN-DCS-09', name: 'Chekkanurani Rural Milk Producers Society', village: 'Chekkanurani', taluk: 'Usilampatti', operatorName: 'S. Karuppiah', phone: '9842002009' },
  ],
  BMC004: [
    { code: 'AAVIN-DCS-10', name: 'Tirumangalam South Milk Supply Society', village: 'Tirumangalam', taluk: 'Tirumangalam', operatorName: 'A. Subbiah', phone: '9842002010' },
    { code: 'AAVIN-DCS-11', name: 'Kappalur Village Dairy Producers Society', village: 'Kappalur', taluk: 'Tirumangalam', operatorName: 'T. Chelladurai', phone: '9842002011' },
    { code: 'AAVIN-DCS-12', name: 'Maravankulam Co-op Milk Center', village: 'Maravankulam', taluk: 'Tirumangalam', operatorName: 'N. Jeyaraj', phone: '9842002012' },
  ],
  BMC005: [
    { code: 'AAVIN-DCS-13', name: 'Othakadai Dairy Farmers Co-op Society', village: 'Othakadai', taluk: 'Madurai East', operatorName: 'R. Ganesan', phone: '9842002013' },
    { code: 'AAVIN-DCS-14', name: 'Chittampatti Primary Milk Center', village: 'Chittampatti', taluk: 'Madurai East', operatorName: 'D. Saravanan', phone: '9842002014' },
    { code: 'AAVIN-DCS-15', name: 'Karuppayurani Village Milk Co-op', village: 'Karuppayurani', taluk: 'Madurai East', operatorName: 'M. Senthilkumar', phone: '9842002015' },
  ],
  BMC006: [
    { code: 'AAVIN-DCS-16', name: 'Alanganallur East Milk Supply Society', village: 'Alanganallur', taluk: 'Vadipatti', operatorName: 'M. Ramanathan', phone: '9842002016' },
    { code: 'AAVIN-DCS-17', name: 'Vavadurani Farmers Dairy Society', village: 'Vavadurani', taluk: 'Vadipatti', operatorName: 'P. Thangaraj', phone: '9842002017' },
    { code: 'AAVIN-DCS-18', name: 'Mettupatti Village Milk Collection Center', village: 'Mettupatti', taluk: 'Vadipatti', operatorName: 'K. Rajendran', phone: '9842002018' },
  ],
  BMC007: [
    { code: 'AAVIN-DCS-19', name: 'Peraiyur Town Milk Producers Co-op', village: 'Peraiyur', taluk: 'Peraiyur', operatorName: 'S. Natarajan', phone: '9842002019' },
    { code: 'AAVIN-DCS-20', name: 'T. Kallupatti Dairy Collection Center', village: 'T. Kallupatti', taluk: 'Peraiyur', operatorName: 'A. Gurusamy', phone: '9842002020' },
    { code: 'AAVIN-DCS-21', name: 'Sedapatti North Milk Producers Society', village: 'Sedapatti North', taluk: 'Peraiyur', operatorName: 'M. Boominathan', phone: '9842002021' },
  ],
  BMC008: [
    { code: 'AAVIN-DCS-22', name: 'Kottampatti Farmers Co-op Milk Society', village: 'Kottampatti', taluk: 'Melur', operatorName: 'R. Thirupathi', phone: '9842002022' },
    { code: 'AAVIN-DCS-23', name: 'Karungalakudi Village Milk Center', village: 'Karungalakudi', taluk: 'Melur', operatorName: 'P. Murugesan', phone: '9842002023' },
    { code: 'AAVIN-DCS-24', name: 'Ayyapatti Primary Dairy Society', village: 'Ayyapatti', taluk: 'Melur', operatorName: 'V. Sethuraman', phone: '9842002024' },
  ],
  BMC009: [
    { code: 'AAVIN-DCS-25', name: 'Sedapatti South Dairy Farmers Society', village: 'Sedapatti South', taluk: 'Peraiyur', operatorName: 'K. Chinnasamy', phone: '9842002025' },
    { code: 'AAVIN-DCS-26', name: 'Kudipatti Village Milk Collection Center', village: 'Kudipatti', taluk: 'Peraiyur', operatorName: 'S. Alagarsamy', phone: '9842002026' },
    { code: 'AAVIN-DCS-27', name: 'Athikaripatti Co-op Milk Society', village: 'Athikaripatti', taluk: 'Peraiyur', operatorName: 'T. Muthiah', phone: '9842002027' },
  ],
  BMC010: [
    { code: 'AAVIN-DCS-28', name: 'Kallikudi Town Dairy Producers Co-op', village: 'Kallikudi', taluk: 'Tirumangalam', operatorName: 'M. Selvaraj', phone: '9842002028' },
    { code: 'AAVIN-DCS-29', name: 'Sivarakottai Primary Milk Center', village: 'Sivarakottai', taluk: 'Tirumangalam', operatorName: 'V. Paramasivam', phone: '9842002029' },
    { code: 'AAVIN-DCS-30', name: 'Kariyapatti Road Village Milk Society', village: 'Kariyapatti Road', taluk: 'Tirumangalam', operatorName: 'P. Anandhan', phone: '9842002030' },
  ],
};

// ============================================================================
// 4. GENERATE BMCS & BOOTHS
// ============================================================================
export const GENERATED_BOOTHS: Booth[] = [];
export const GENERATED_BMCS: BMC[] = [];

BMC_DEFS.forEach((bDef) => {
  const societies = SOCIETY_NAMES[bDef.id] || [];
  const assignedBoothIds: string[] = [];

  societies.forEach((sDef, idx) => {
    const boothNumber = (parseInt(bDef.id.replace('BMC', '')) - 1) * 3 + (idx + 1);
    const boothId = `BOOTH${boothNumber.toString().padStart(3, '0')}`;
    assignedBoothIds.push(boothId);

    GENERATED_BOOTHS.push({
      id: boothId,
      code: sDef.code,
      name: sDef.name,
      taluk: sDef.taluk,
      village: sDef.village,
      district: 'Madurai',
      assignedBmcId: bDef.id,
      capacityLitres: 3500,
      operatorName: sDef.operatorName,
      phone: sDef.phone,
    });
  });

  GENERATED_BMCS.push({
    id: bDef.id,
    code: bDef.code,
    name: bDef.name,
    location: bDef.location,
    district: 'Madurai',
    capacityLitres: bDef.capacityLitres,
    managerName: bDef.managerName,
    phone: bDef.phone,
    assignedBoothIds,
  });
});

// ============================================================================
// 5. 200 FARMERS & THEIR COWS (DISTRIBUTED OVER 30 SOCIETIES)
// ============================================================================
const FIRST_NAMES = [
  'Murugesan', 'Selvi', 'Alagarsamy', 'Meenakshi', 'Kannan', 'Muthu', 'Sundaram',
  'Lakshmi', 'Palanivel', 'Anitha', 'Saravanan', 'Revathi', 'Marimuthu', 'Bhavani',
  'Ganesan', 'Kavitha', 'Thangavel', 'Priya', 'Natarajan', 'Radhika', 'Vellaisamy',
  'Chitra', 'Boominathan', 'Vasanthi', 'Karuppasamy', 'Malliga', 'Senthilkumar',
  'Shenbagam', 'Mayandi', 'Parameswari', 'Jeyaraj', 'Dhanalakshmi', 'Sethuraman',
  'Pandiselvi', 'Paramasivam', 'Vijaya', 'Chinnasamy', 'Rajeswari', 'Thirupathi',
  'Sangeetha', 'Gurusamy', 'Umadevi', 'Alagumalai', 'Kalaivani', 'Muthiah',
  'Nagammal', 'Selvaraj', 'Kamatchi', 'Anandhan', 'Karpagam'
];

const INITIALS = ['K.', 'M.', 'P.', 'S.', 'R.', 'V.', 'A.', 'T.', 'G.', 'N.', 'C.', 'D.'];

const BANKS = [
  { name: 'Canara Bank', ifsc: 'CNRB0001092' },
  { name: 'State Bank of India', ifsc: 'SBIN0000874' },
  { name: 'Indian Overseas Bank', ifsc: 'IOBA0000284' },
  { name: 'Indian Bank', ifsc: 'IDIB000M021' },
];

const BREEDS = [
  'Jersey Cross',
  'Holstein Friesian Cross',
  'Kangayam',
  'Murrah Buffalo',
  'Gir Cross',
  'Red Sindhi Cross',
];

const COW_NAMES = [
  'Kamadhenu', 'Lakshmi', 'Ponni', 'Gowri', 'Kaveri', 'Bhavani', 'Ganga',
  'Yamuna', 'Amirtham', 'Sundari', 'Malliga', 'Chithra', 'Thangam', 'Rathnam',
  'Manikyam', 'Valli', 'Devi', 'Poomagal', 'Senthamarai', 'Kuyil'
];

export const GENERATED_FARMERS: Farmer[] = [];
export const GENERATED_COWS: Cow[] = [];
export const GENERATED_MILK_RECORDS: MilkRecord[] = [];

let farmerCounter = 1;
let cowCounter = 1;

// Distribute 200 farmers: 20 societies have 7 farmers (140), 10 societies have 6 farmers (60)
GENERATED_BOOTHS.forEach((booth, bIdx) => {
  const farmersInBoothCount = bIdx < 20 ? 7 : 6;

  for (let f = 0; f < farmersInBoothCount; f++) {
    const fId = `FARMER${farmerCounter.toString().padStart(3, '0')}`;
    const initial = INITIALS[(farmerCounter * 7) % INITIALS.length];
    const nameStr = FIRST_NAMES[(farmerCounter * 13) % FIRST_NAMES.length];
    const fullName = `${initial} ${nameStr}`;
    const bank = BANKS[farmerCounter % BANKS.length];
    const cowsCount = (farmerCounter % 3) + 2; // 2, 3, or 4 cows

    GENERATED_FARMERS.push({
      id: fId,
      farmerIdCode: `FARM-MDU-${100 + farmerCounter}`,
      name: fullName,
      mobileNumber: `98420${(10000 + farmerCounter).toString()}`,
      address: `${10 + f}, South Street, ${booth.village}`,
      village: booth.village,
      community: `${booth.taluk} Taluk`,
      numberOfCows: cowsCount,
      assignedBoothId: booth.id,
      verificationStatus: farmerCounter % 15 === 0 ? 'pending' : 'verified',
      bankAccountName: fullName.replace('.', ''),
      bankName: `${bank.name} - ${booth.taluk}`,
      bankAccountNumber: `10928374${(1000 + farmerCounter).toString()}`,
      bankIfsc: bank.ifsc,
      upiId: `${nameStr.toLowerCase()}${farmerCounter}@upi`,
      createdAt: '2025-01-10T08:00:00Z',
    });

    // Generate cows for this farmer
    for (let c = 0; c < cowsCount; c++) {
      const cId = `COW${cowCounter.toString().padStart(3, '0')}`;
      const breed = cowCounter === 1 ? 'Jersey Cross' : BREEDS[(cowCounter + c) % BREEDS.length];
      const cowName = cowCounter === 1 ? 'Lakshmi (AIC-106353)' : COW_NAMES[(cowCounter + c * 3) % COW_NAMES.length];
      // Cow 1 uses the exact Pashu Aadhaar UID from the user's uploaded ear tag: 106353486450
      const tagId = cowCounter === 1 ? '106353486450' : `100100${(100000 + cowCounter).toString()}`;
      const isQuarantine = cowCounter === 18 || cowCounter === 72 || cowCounter === 145 || cowCounter === 290;
      const dailyYield = cowCounter === 1 ? 13.5 : Number((10 + ((cowCounter * 7) % 60) / 10).toFixed(1));

      GENERATED_COWS.push({
        id: cId,
        cowId: `COW-MDU-${cowCounter.toString().padStart(3, '0')}`,
        tagId,
        farmerId: fId,
        farmerName: fullName,
        breed,
        name: cowName,
        dateOfBirth: '2022-03-15',
        approxAgeMonths: 34,
        sex: 'female',
        currentStatus: isQuarantine ? 'quarantine_hold' : 'lactating',
        dailyMilkYield: dailyYield,
        healthStatus: isQuarantine ? 'quarantine_hold' : 'healthy',
        lactationStage: 'peak',
        identificationMarks: `RFID Pashu Aadhaar #${tagId}, ${breed} characteristics, AIC ear tag`,
        photoUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=500',
        verificationStatus: 'verified',
        medicalHistory: isQuarantine ? [
          {
            id: `MED-${cId}`,
            date: yesterdayStr,
            vetName: 'Dr. R. Anand BVSc',
            diagnosis: 'Sub-acute Mastitis - Left Hind Quarter',
            symptoms: 'Swollen udder tissue, somatic cell count elevated',
            bodyTemperatureC: 39.4,
            heartRateBpm: 76,
            rumenMotility: 'Reduced (1/2min)',
            recommendations: 'Intramammary Ceftiofur therapy. Strict milk withholding for 72 hours.',
            followUpDate: '2026-10-16',
          }
        ] : [
          {
            id: `MED-${cId}`,
            date: '2026-09-28',
            vetName: 'Dr. R. Anand BVSc',
            diagnosis: 'Routine Veterinary Health & Udder Assessment',
            symptoms: 'Optimal physical condition, clear eyes, moist muzzle',
            bodyTemperatureC: 38.6,
            heartRateBpm: 68,
            rumenMotility: 'Normal (3/2min)',
            recommendations: 'CMT test negative. Continue high-protein green fodder and mineral supplement.',
            followUpDate: '2026-11-20',
          }
        ],
        treatmentRecords: isQuarantine ? [
          {
            id: `TRT-${cId}`,
            date: yesterdayStr,
            vetName: 'Dr. R. Anand BVSc',
            medicineName: 'Ceftiofur Intramammary Infusion 125mg',
            genericName: 'Ceftiofur Hydrochloride',
            dosage: '1 Syringe per affected quarter q24h',
            route: 'intramammary',
            treatmentStartDate: yesterdayStr,
            treatmentEndDate: '2026-10-15',
            withdrawalPeriodDays: 3,
            withdrawalEndDate: '2026-10-16',
            reason: 'Sub-acute Mastitis',
            notes: 'MANDATORY WITHDRAWAL: Prohibit milk supply to booth until clearance.',
          }
        ] : [],
        activeWithdrawal: isQuarantine ? {
          hasActiveWithdrawal: true,
          medicineName: 'Ceftiofur Intramammary Infusion',
          reason: 'Mastitis therapy',
          treatmentStartDate: yesterdayStr,
          withdrawalEndDate: '2026-10-16',
          daysRemaining: 2,
        } : undefined,
        vaccinationHistory: [
          {
            id: `VAC-${cId}`,
            date: '2026-05-15',
            vaccineName: 'Foot & Mouth Disease (FMD) Bi-valent',
            batchNumber: 'FMD-TN-2026-09',
            nextDueDate: '2026-11-15',
            administeredBy: 'Dr. R. Anand BVSc',
          },
          {
            id: `VAC2-${cId}`,
            date: '2026-02-10',
            vaccineName: 'Hemorrhagic Septicemia & Black Quarter',
            batchNumber: 'HS-BQ-2026-01',
            nextDueDate: '2027-02-10',
            administeredBy: 'Dr. R. Anand BVSc',
          }
        ],
        inseminationHistory: [
          {
            id: `AI-${cId}`,
            date: '2025-11-04',
            bullId: 'BAIF-JER-9921',
            breed: 'Purebred Jersey',
            technicianName: 'S. Shanmugam',
            pregnancyStatus: 'confirmed_pregnant',
            expectedCalvingDate: '2026-08-12',
          }
        ],
        createdAt: '2025-01-12T09:30:00Z',
      });

      // Generate 14 days of milk records for Farmer 1's cows (for rich 7-day & 14-day bar charts)
      if (farmerCounter === 1 && !isQuarantine) {
        for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
          const recDate = new Date(2026, 9, 14 - dayOffset);
          const dateStr = recDate.toISOString().split('T')[0];
          const variance = Math.sin(dayOffset * 0.8 + c) * 0.7;
          const adjustedDaily = Number((dailyYield + variance).toFixed(1));
          const morningLitres = Number((adjustedDaily * 0.56).toFixed(1));
          const eveningLitres = Number((adjustedDaily * 0.44).toFixed(1));
          const fat = Number((4.1 + ((dayOffset + c) % 5) * 0.08).toFixed(2));
          const snf = Number((8.4 + ((dayOffset * 2 + c) % 4) * 0.06).toFixed(2));

          // Morning record
          GENERATED_MILK_RECORDS.push({
            id: `MR-${dateStr}-M-${cId}`,
            farmerId: fId,
            farmerName: fullName,
            cowId: cId,
            cowTagId: tagId,
            cowName,
            fatPercentage: fat,
            snfPercentage: snf,
            boothId: booth.id,
            collectionDate: dateStr,
            session: 'morning',
            quantityLitres: morningLitres,
            route: 'direct',
            measurementMethod: 'farmer_wise',
            individualAllocation: 'measured',
            status: 'recorded',
            createdBy: `${booth.operatorName} (${booth.id})`,
            notes: `Morning yield for ${cowName}. Fat: ${fat}%, SNF: ${snf}%`,
            createdAt: `${dateStr}T06:30:00Z`,
          });

          // Evening record
          GENERATED_MILK_RECORDS.push({
            id: `MR-${dateStr}-E-${cId}`,
            farmerId: fId,
            farmerName: fullName,
            cowId: cId,
            cowTagId: tagId,
            cowName,
            fatPercentage: Number((fat + 0.1).toFixed(2)),
            snfPercentage: snf,
            boothId: booth.id,
            collectionDate: dateStr,
            session: 'evening',
            quantityLitres: eveningLitres,
            route: 'direct',
            measurementMethod: 'farmer_wise',
            individualAllocation: 'measured',
            status: 'recorded',
            createdBy: `${booth.operatorName} (${booth.id})`,
            notes: `Evening yield for ${cowName}. Fat: ${(fat + 0.1).toFixed(2)}%, SNF: ${snf}%`,
            createdAt: `${dateStr}T17:45:00Z`,
          });
        }
      } else if (!isQuarantine && farmerCounter <= 60) {
        // Today's milk record for other active cows
        const morningQty = Number((dailyYield * 0.55).toFixed(1));
        const fat = Number((3.9 + (cowCounter % 7) * 0.1).toFixed(2));
        const snf = Number((8.3 + (cowCounter % 5) * 0.08).toFixed(2));

        GENERATED_MILK_RECORDS.push({
          id: `MR-${todayStr}-${cId}`,
          farmerId: fId,
          farmerName: fullName,
          cowId: cId,
          cowTagId: tagId,
          cowName,
          fatPercentage: fat,
          snfPercentage: snf,
          boothId: booth.id,
          collectionDate: todayStr,
          session: 'morning',
          quantityLitres: morningQty,
          route: 'direct',
          measurementMethod: 'farmer_wise',
          individualAllocation: 'measured',
          status: 'recorded',
          createdBy: `${booth.operatorName} (${booth.id})`,
          notes: `Morning yield for ${cowName}. Fat: ${fat}%, SNF: ${snf}%`,
          createdAt: `${todayStr}T06:30:00Z`,
        });
      }

      cowCounter++;
    }

    farmerCounter++;
  }
});

// ============================================================================
// 6. DISPATCH RECEIPTS & DELIVERIES (CONNECTING BOOTHS TO BMCS)
// ============================================================================
export const GENERATED_BOOTH_RECEIPTS: BoothReceipt[] = [];
export const GENERATED_BMC_DELIVERIES: BMCDelivery[] = [];
export const GENERATED_DISCREPANCY_CASES: DiscrepancyCase[] = [];
export const GENERATED_BMC_RECEIPTS: BMCReceipt[] = [];
export const GENERATED_SOCIETY_INCOME: SocietyIncomeRecord[] = [
  {
    id: 'INC-2026-1012-01',
    societyId: 'BOOTH001',
    societyName: 'Melur North Primary Milk Producers Co-op',
    bmcId: 'BMC001',
    transactionDate: yesterdayStr,
    financialPeriod: '2026-10',
    category: 'quality_incentive',
    description: 'SNF & Fat Benchmark Quality Performance Bonus',
    referenceNumber: 'BONUS-SNF-9901',
    amountInr: 12500.0,
    relatedMilkLitres: 1850.0,
    notes: 'Incentive for zero bacterial contamination and >8.5% average SNF',
    enteredBy: 'R. Sundar (BMC In-Charge)',
    enteredByUserId: 'BMC001',
    status: 'submitted_to_union',
    createdAt: `${yesterdayStr}T11:00:00Z`,
    auditTrail: [
      {
        timestamp: `${yesterdayStr} 11:00 AM`,
        user: 'R. Sundar',
        action: 'CREATED_BONUS',
        reason: 'Monthly quality test benchmarks achieved',
      },
    ],
  },
  {
    id: 'INC-2026-1012-02',
    societyId: 'BOOTH002',
    societyName: 'Melur Town Milk Supply Society',
    bmcId: 'BMC001',
    transactionDate: todayStr,
    financialPeriod: '2026-10',
    category: 'procurement_payment',
    description: 'Farmer Procurement Settlement - Melur Town Feeder',
    referenceNumber: 'TXN-AAVIN-MDU-9902',
    amountInr: 52800.0,
    relatedMilkLitres: 1340.0,
    notes: 'Dispatched to Melur BMC, payment cleared for verified records',
    enteredBy: 'R. Sundar (BMC In-Charge)',
    enteredByUserId: 'BMC001',
    status: 'verified',
    createdAt: `${todayStr}T10:15:00Z`,
  },
  {
    id: 'INC-2026-1010-01',
    societyId: 'BOOTH002',
    societyName: 'Melur Town Milk Supply Society',
    bmcId: 'BMC001',
    transactionDate: twoDaysAgoStr,
    financialPeriod: '2026-10',
    category: 'transport_subsidy',
    description: 'Rural Cluster Cold-Chain Transit Subsidy',
    referenceNumber: 'SUB-TRANS-4412',
    amountInr: 4500.0,
    notes: 'Government approved transport subsidy reimbursement for rural feeder route',
    enteredBy: 'R. Sundar (BMC In-Charge)',
    enteredByUserId: 'BMC001',
    status: 'submitted_to_union',
    createdAt: `${twoDaysAgoStr}T14:20:00Z`,
  },
  {
    id: 'INC-2026-1009-01',
    societyId: 'BOOTH001',
    societyName: 'Melur North Primary Milk Producers Co-op',
    bmcId: 'BMC001',
    transactionDate: threeDaysAgoStr,
    financialPeriod: '2026-10',
    category: 'chilling_incentive',
    description: 'Rapid BMC Chill Vat Compliance Credit',
    referenceNumber: 'CHILL-INC-1009',
    amountInr: 7400.0,
    notes: 'Milk intake chilling within 2 hours of collection incentive',
    enteredBy: 'R. Sundar (BMC In-Charge)',
    enteredByUserId: 'BMC001',
    status: 'submitted_to_union',
    createdAt: `${threeDaysAgoStr}T16:00:00Z`,
  },
];

// Generate delivery records for the 10 BMCs
GENERATED_BMCS.forEach((bmc, bmcIdx) => {
  const bmcBooths = GENERATED_BOOTHS.filter(b => b.assignedBmcId === bmc.id);
  const deliveryIds: string[] = [];
  let bmcDeclaredSum = 0;
  let bmcReceivedSum = 0;

  bmcBooths.forEach((booth, sIdx) => {
    const isAnomalySociety = (bmcIdx === 1 && sIdx === 0) || (bmcIdx === 2 && sIdx === 2); // Vadipatti DCS & Chekkanurani
    const declaredQty = isAnomalySociety ? 980.0 : 820.0 + (sIdx * 45);
    const measuredQty = isAnomalySociety ? declaredQty - 30.0 : declaredQty; // 30L anomaly
    const diff = declaredQty - measuredQty;

    bmcDeclaredSum += declaredQty;
    bmcReceivedSum += measuredQty;

    const receiptId = `BR-${yesterdayStr}-${booth.id}`;
    const deliveryId = `DEL-${yesterdayStr}-${booth.id}`;
    deliveryIds.push(deliveryId);

    // Booth Receipt
    GENERATED_BOOTH_RECEIPTS.push({
      id: receiptId,
      boothId: booth.id,
      boothName: booth.name,
      bmcId: bmc.id,
      bmcName: bmc.name,
      collectionDate: yesterdayStr,
      session: 'full_day',
      dispatchQuantity: declaredQty,
      measurementBasis: 'farmer_wise',
      includedRecordIds: [],
      totalRecordsCount: 28,
      totalFarmersCount: 7,
      createdAt: `${yesterdayStr}T18:45:00Z`,
      createdBy: `${booth.operatorName} (${booth.id})`,
      status: 'sent_to_bmc',
      verificationCode: `BR-${booth.id}-9928`,
      notes: `Dispatch via insulated route tanker to ${bmc.name}`,
    });

    // BMC Delivery
    const discrepancyId = isAnomalySociety ? `DISC-${bmc.id}-${booth.id}` : undefined;

    GENERATED_BMC_DELIVERIES.push({
      id: deliveryId,
      boothReceiptId: receiptId,
      boothId: booth.id,
      boothName: booth.name,
      bmcId: bmc.id,
      collectionDate: yesterdayStr,
      dispatchTime: `${yesterdayStr} 18:45`,
      declaredDispatchQuantity: declaredQty,
      measuredReceivedQuantity: measuredQty,
      difference: diff,
      receivedAt: `${yesterdayStr}T20:15:00Z`,
      receivedBy: `${bmc.managerName} (BMC In-Charge)`,
      status: diff > 5 ? 'mismatch_investigation' : 'matched',
      discrepancyCaseId: discrepancyId,
    });

    // Discrepancy Case if difference exists
    if (isAnomalySociety) {
      GENERATED_DISCREPANCY_CASES.push({
        id: discrepancyId!,
        bmcDeliveryId: deliveryId,
        boothId: booth.id,
        boothName: booth.name,
        bmcId: bmc.id,
        bmcName: bmc.name,
        collectionDate: yesterdayStr,
        declaredQuantity: declaredQty,
        measuredQuantity: measuredQty,
        differenceLitres: diff,
        differencePercent: Number(((diff / declaredQty) * 100).toFixed(2)),
        status: 'open',
        createdAt: `${yesterdayStr}T20:25:00Z`,
        createdBy: `${bmc.managerName} (${bmc.id})`,
        investigationNotes: [
          {
            id: `NOTE-${discrepancyId}-01`,
            timestamp: `${yesterdayStr} 8:30 PM`,
            author: `${bmc.managerName} (BMC Staff)`,
            note: `Tanker custody seal was intact upon arrival. Ultrasonic dipstick showed ${measuredQty}L vs society manifest of ${declaredQty}L (-${diff}L variance).`,
            evidenceReference: `Seal Tag #TN-MDU-${booth.id}-48`,
          },
          {
            id: `NOTE-${discrepancyId}-02`,
            timestamp: `${yesterdayStr} 9:15 PM`,
            author: `${booth.operatorName} (Society Operator)`,
            note: 'Weighing scale was re-zeroed before tanker loading. Requesting union inspection of tanker discharge pipe valve.',
          }
        ],
        unionReviewNotes: 'Escalated to General Manager for joint audit of transit temperature & flow meter calibration.',
      });
    }

    // Society Income Record (DCS Handling Commission)
    GENERATED_SOCIETY_INCOME.push({
      id: `INC-${todayStr}-${booth.id}`,
      societyId: booth.id,
      societyName: booth.name,
      bmcId: bmc.id,
      transactionDate: todayStr,
      financialPeriod: '2026-10',
      category: 'procurement_payment',
      description: `Daily Milk Procurement Cycle for ${booth.name}`,
      referenceNumber: `TXN-AAVIN-${booth.id}-99`,
      amountInr: Math.round(declaredQty * 40.5),
      relatedMilkLitres: declaredQty,
      notes: 'Approved daily payment disbursement based on morning/evening milk fat average 4.2%',
      enteredBy: `${bmc.managerName} (BMC In-Charge)`,
      enteredByUserId: bmc.id,
      status: 'verified',
      createdAt: `${todayStr}T09:00:00Z`,
    });
  });

  // BMC Daily Consolidated Receipt
  GENERATED_BMC_RECEIPTS.push({
    id: `BMCR-${yesterdayStr}-${bmc.id}`,
    bmcId: bmc.id,
    bmcName: bmc.name,
    unionId: 'UNION001',
    collectionDate: yesterdayStr,
    includedDeliveryIds: deliveryIds,
    totalBoothsCount: bmcBooths.length,
    totalDeclaredQuantity: bmcDeclaredSum,
    totalReceivedQuantity: bmcReceivedSum,
    netDifference: bmcDeclaredSum - bmcReceivedSum,
    hasDiscrepancies: bmcDeclaredSum - bmcReceivedSum > 5,
    unresolvedCasesCount: bmcDeclaredSum - bmcReceivedSum > 5 ? 1 : 0,
    createdAt: `${yesterdayStr}T21:00:00Z`,
    createdBy: `${bmc.managerName} (BMC In-Charge)`,
    status: bmcIdx === 0 || bmcIdx === 1 ? 'sent_to_union' : 'reviewed_by_union',
    verificationCode: `BMCR-MDU-${bmc.id}-7718`,
    unionReviewNotes: bmcIdx === 0 ? 'Pending GM signature & final consolidation seal.' : undefined,
  });
});

// ============================================================================
// 7. DEMO USERS, VENDORS & NOTIFICATIONS
// ============================================================================
export const GENERATED_DEMO_USERS: DemoUser[] = [
  {
    id: 'FARMER001',
    username: 'farmer_murugan',
    fullName: 'K. Murugesan (Farmer)',
    role: 'farmer',
    phone: '9842000002',
    email: 'murugan.dairy@gmail.com',
    associatedId: 'FARMER001',
    description: 'Dairy Farmer • Melur North DCS (Owns 3 Cows)',
  },
  {
    id: 'BOOTH001',
    username: 'booth_kannan',
    fullName: 'P. Kannan (Society Officer)',
    role: 'booth',
    phone: '9842002001',
    email: 'melurnorth.booth@aavin.tn.gov.in',
    associatedId: 'BOOTH001',
    description: 'Society Officer • Melur North Primary Milk Producers Co-op',
  },
  {
    id: 'BOOTH002',
    username: 'booth_muthu',
    fullName: 'S. Muthu (Society Officer)',
    role: 'booth',
    phone: '9842000011',
    email: 'muthu.booth@aavin.tn.gov.in',
    associatedId: 'BOOTH002',
    description: 'Society Officer • Melur Town Milk Supply Society',
  },
  {
    id: 'BMC001',
    username: 'bmc_raman',
    fullName: 'M. Ramanathan (BMC Manager)',
    role: 'bmc',
    phone: '9842000007',
    email: 'raman.bmc@aavin.tn.gov.in',
    associatedId: 'BMC001',
    description: 'BMC Manager • Melur Central Bulk Milk Cooling Centre',
  },
  {
    id: 'BMC002',
    username: 'bmc_balakrishnan',
    fullName: 'K. Balakrishnan (BMC Manager)',
    role: 'bmc',
    phone: '9842001002',
    email: 'vadipatti.bmc@aavin.tn.gov.in',
    associatedId: 'BMC002',
    description: 'BMC Manager • Vadipatti Bulk Milk Cooling Centre',
  },
  {
    id: 'UNION001',
    username: 'union_director',
    fullName: 'Er. K. Rajendran (Union GM)',
    role: 'union',
    phone: '9842000008',
    email: 'gm.madurai@aavin.tn.gov.in',
    associatedId: 'UNION001',
    description: 'Union Executive • Aavin Madurai District Co-op Milk Producers Union',
  },
  {
    id: 'VET001',
    username: 'vet_anand',
    fullName: 'Dr. R. Anand BVSc (Veterinary Officer)',
    role: 'veterinary',
    phone: '9842000004',
    email: 'dr.anand.vet@aavin.tn.gov.in',
    associatedId: 'VET001',
    description: 'Veterinary Surgeon • Aavin Dispensary Melur Division',
  },
  {
    id: 'ADMIN001',
    username: 'admin_aavin',
    fullName: 'Dr. S. Sundaram (Admin)',
    role: 'admin',
    phone: '9842000001',
    email: 'sysadmin@aavin.tn.gov.in',
    associatedId: 'ADMIN001',
    description: 'System Admin • Identity, Verifications & Security Management',
  },
];

export const GENERATED_VENDORS: Vendor[] = [
  {
    id: 'VEND001',
    code: 'VEND-MDU-501',
    name: 'V. Kumar (Tanker Logistics)',
    vehicleNumber: 'TN-59-BZ-4819',
    vehicleType: 'Insulated SS Tanker (3000L)',
    phone: '9842000006',
    routeName: 'Melur -> Othakadai -> Madurai Central Dairy',
  },
  {
    id: 'VEND002',
    code: 'VEND-MDU-502',
    name: 'S. Murugavel (Can Pickup)',
    vehicleNumber: 'TN-59-CA-1120',
    vehicleType: 'Tata Ace Milk Can Carrier (800L)',
    phone: '9842000014',
    routeName: 'Alanganallur Rural Hamlets Route',
  },
  {
    id: 'VEND003',
    code: 'VEND-MDU-503',
    name: 'M. Pandian (Insulated Chilled Tanker)',
    vehicleNumber: 'TN-59-DE-9012',
    vehicleType: 'Insulated SS Tanker (5000L)',
    phone: '9842000018',
    routeName: 'Vadipatti -> Usilampatti Route',
  },
];

export const GENERATED_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'NOTIF-001',
    recipientId: 'UNION001',
    recipientRole: 'union',
    title: 'Audit Warning: Vadipatti Tanker Discrepancy',
    message: '30.0 L shrinkage recorded on Vadipatti -> BMC intake. Case DISC-BMC002-BOOTH004 opened.',
    type: 'discrepancy_alert',
    isRead: false,
    timestamp: `${yesterdayStr}T20:30:00Z`,
    linkRoute: '/(union)/discrepancies',
  },
  {
    id: 'NOTIF-002',
    recipientId: 'UNION001',
    recipientRole: 'union',
    title: 'Daily Receipt Ready for Sign-Off',
    message: 'Melur BMC submitted consolidated daily receipt for 3 feeder societies.',
    type: 'receipt_generated',
    isRead: false,
    timestamp: `${yesterdayStr}T21:15:00Z`,
    linkRoute: '/(union)/receipt-review',
  },
];

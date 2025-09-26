const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Helper function to parse dose/volume/duration strings into { value, unit }
const parseDrugDetail = (detailString) => {
  if (!detailString) return { value: '', unit: '' };
  const parts = detailString.split(' ');
  if (parts.length > 1) {
    const unit = parts.pop();
    const value = parts.join(' ');
    return { value, unit };
  } else {
    return { value: detailString, unit: '' };
  }
};

const regimens = [
  {
    id: "folfox6",
    name: "FOLFOX6",
    drugs: [
      { name: "Oxaliplatin", dose: { value: "85", unit: "mg/m²" }, volume: { value: "250-500", unit: "mg" }, duration: { value: "2", unit: "ชั่วโมง" }},
      { name: "Leucovorin", dose: { value: "400", unit: "mg/m²" }, volume: { value: "250", unit: "mg" }, duration: { value: "2", unit: "ชั่วโมง" }},
      { name: "5-FU (Bolus)", dose: { value: "400", unit: "mg/m²" }, volume: { value: "100", unit: "mg" }, duration: { value: "15", unit: "ชั่วโมง" }},
      { name: "5-FU (Infusion)", dose: { value: "2400", unit: "mg/m²" }, volume: { value: "1000", unit: "mg" }, duration: { value: "46", unit: "ชั่วโมง" }}
    ],
    instructions: "ระหว่างให้ยาแนะนำให้อมน้ำแข็งเพื่อป้องกันการดูดซึมยาในเยื่อบุปาก ลดภาวะการอักเสบหรือแผลเกิดขึ้นในช่องปากและลำคอ (mucositis) ดื่มน้ำอย่างน้อย 2-3 ลิตรต่อวัน หรือเป็นไปตามคำแนะนำของแพทย์ พยาบาล",
    sideEffects: ["คลื่นไส้อาเจียน", "เหนื่อยล้า", "อ่อนแรง", "มึนงง", "ปวดศีรษะ", "ผมร่วง", "ผิวแห้งแตกเป็นแผล", "ตามีน้ำตามากหรือตาไวต่อแสง"],
    precautions: ["หลีกเลี่ยงอากาศเย็นจัด", "หลีกเลี่ยงอาหารเครื่องดื่มที่เย็น", "ใส่เสื้อผ้าให้ความอบอุ่นร่างกาย", "ตรวจสัญญาชีพทุก 4 ชั่วโมง"]
  },
  {
    id: "carboplatin_5fu",
    name: "Carboplatin + 5FU",
    drugs: [
      { name: "Carboplatin", dose: { value: "AUC 5-6", unit: "" }, volume: { value: "250-500", unit: "mg" }, duration: { value: "1", unit: "ชั่วโมง" }},
      { name: "5-FU", dose: { value: "1000", unit: "mg/m²/day" }, volume: { value: "1000", unit: "mg" }, duration: { value: "24 ชั่วโมง", unit: "x 4 วัน" }}
    ],
    instructions: "ดื่มน้ำอย่างน้อย 2-3 ลิตรต่อวัน หรือเป็นไปตามคำแนะนำของแพทย์ พยาบาล หากมีคลื่นไส้อาเจียนเมื่อรับประทานอาหารให้ใช้ยาแก้คลื่นไส้ตามที่แพทย์สั่ง",
    sideEffects: ["คลื่นไส้อาเจียน", "ท้องเสียหรือท้องผูก", "ปวดท้อง", "กระเพาะอาหารอักเสบ", "ช่องปากเป็นแผล", "วิงเวียน", "มีเสียงในหูอื้อ"],
    precautions: ["สังเกตอาการแพ้ยา", "ผื่นคัน", "เกิดลมพิษ", "ไข้", "หลอดลมหดเกร็ง", "ความดันโลหิตต่ำ"]
  },
  {
    id: "etoposide",
    name: "Etoposide",
    drugs: [
      { name: "Etoposide", dose: { value: "100", unit: "mg/m²" }, volume: { value: "250-500", unit: "mg" }, duration: { value: "1-2", unit: "ชั่วโมง" }}
    ],
    instructions: "ดื่มน้ำอย่างน้อย 2-3 ลิตรต่อวัน หรือเป็นไปตามคำแนะนำของแพทย์ พยาบาล หากมีอาการคลื่นไส้ มียาบรรเทาอาการคลื่นไส้ ยาแก้คลื่นไส้",
    sideEffects: ["เบื่ออาหาร", "คลื่นไส้อาเจียน", "เหนื่อยล้า", "ปวดศีรษะ", "ท้องเสีย", "ปากเป็นแผล", "ไข้", "ผมร่วง", "ผิวแห้งแตกเป็นแผล"],
    precautions: ["สังเกตอาการผิดปกติ", "มือและเท้าบวมแดงหรือลอก", "มีไข้", "เจ็บคอ", "ปัสสาวะมีเลือดปน"]
  },
  {
    id: "gemcitabine",
    name: "Gemcitabine",
    drugs: [
      { name: "Gemcitabine", dose: { value: "1000-1250", unit: "mg/m²" }, volume: { value: "250-500", unit: "mg" }, duration: { value: "30", unit: "ชั่วโมง" }}
    ],
    instructions: "ดื่มน้ำอย่างน้อย 2-3 ลิตรต่อวัน หรือเป็นไปตามคำแนะนำของแพทย์ พยาบาล พักผ่อนให้เต็มที่และรับประทานอาหารให้ถูกสัดส่วนที่แพทย์แนะนำ",
    sideEffects: ["คลื่นไส้อาเจียน", "มีไข้", "หนาวสั่น", "ปวดศีรษะ", "ผื่นคัน", "เหงื่อออกมาก", "หัวใจเต้นผิดจังหวะ"],
    precautions: ["สังเกตอาการสูญเสียการได้ยิน", "อาจมีชัก", "ปวดศีรษะ", "ตาพร่ามัว", "เฝ้าระวังหัวใจเต้นผิดจังหวะ"]
  },
  {
    id: "other",
    name: "อื่นๆ (ระบุเอง)",
    drugs: [],
    instructions: "",
    sideEffects: [],
    precautions: []
  }
];

async function main() {
  console.log('Start seeding ...');

  // Seed Users
const hashedPasswordNurse = await bcrypt.hash('123', 10);
const hashedPasswordPharmacist = await bcrypt.hash('123', 10);

// ผู้ใช้ a (พยาบาล)
await prisma.user.upsert({
  where: { username: 'somying_n' },
  update: {},
  create: {
    username: 'a',
    password: hashedPasswordNurse,
    fullName: 'พยาบาล สมหญิง ใจดี',
    role: 'NURSE'
  }
});

// ผู้ใช้ b (เภสัชกร)
await prisma.user.upsert({
  where: { username: 'somsak_p' },
  update: {},
  create: {
    username: 'b',
    password: hashedPasswordPharmacist,
    fullName: 'เภสัชกร สมศักดิ์ สุขใจ',
    role: 'PHARMACIST'
  }
});

// เพิ่มผู้ใช้ c (พยาบาล)
await prisma.user.upsert({
  where: { username: 'c' },
  update: {},
  create: {
    username: 'c',
    password: hashedPasswordNurse, // ใช้รหัสผ่านเดียวกันกับพยาบาลคนอื่น
    fullName: 'พยาบาล สมศรี ใจกว้าง', // เปลี่ยนชื่อตามต้องการ
    role: 'NURSE'
  }
});

// เพิ่มผู้ใช้ d (เภสัชกร)
await prisma.user.upsert({
  where: { username: 'd' },
  update: {},
  create: {
    username: 'd',
    password: hashedPasswordPharmacist, // ใช้รหัสผ่านเดียวกันกับเภสัชกรคนอื่น
    fullName: 'เภสัชกร สมหมาย ทำงานดี', // เปลี่ยนชื่อตามต้องการ
    role: 'PHARMACIST'
  }
});

  // Seed Regimens
  for (const regimen of regimens) {
    await prisma.regimen.upsert({
      where: { id: regimen.id },
      update: {},
      create: regimen,
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
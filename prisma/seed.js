const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const drugsToSeed = [
  {
    name: 'Cisplatin',
  },
  {
    name: 'Carboplatin',
  },
  {
    name: 'Luecovorin',
  },
  {
    name: 'Etoposide',
  },
  {
    name: 'Paclitaxel',
  },
  {
    name: 'Gemcitibine',
  },
  {
    name: 'Docetaxel',
  },
  {
    name: 'Cyclophophamide',
  },
  {
    name: 'Doxorubicin',
  },
  {
    name: 'Vincristine',
  },
  {
    name: 'Oxaliplatin',
  },
  {
    name: 'Irrinotecan',
  },
  {
    name: '5FU',
  },
  {
    name: '5FU (Large)',
  }
];

const wardsToSeed = [
  { name: 'ตึกพิเศษอาคารมะเร็งชั้น 7' },
];

async function main() {
  console.log('Start seeding ...');

  // Clear old data
  await prisma.order.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.drug.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.ward.deleteMany({}); // Clear wards

  // Seed Wards
  const createdWards = [];
  for (const wardData of wardsToSeed) {
    const ward = await prisma.ward.create({
      data: wardData,
    });
    createdWards.push(ward);
    console.log(`Created ward: ${ward.name} (ID: ${ward.id})`);
  }

  // Seed Users
  const hashedPasswordNurse = await bcrypt.hash('1234', 10);
  const firstWardId = createdWards[0].id;

  await prisma.user.create({
    data: {
      username: 'nurse',
      password: hashedPasswordNurse,
      fullName: 'พยาบาล​วิชาชีพ​',
      wardId: firstWardId, // Assign user to the first ward
    }
  });

  // Seed Drugs
  for (const drugData of drugsToSeed) {
    await prisma.drug.create({
      data: drugData,
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
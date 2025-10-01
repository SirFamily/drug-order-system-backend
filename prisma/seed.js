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


async function main() {
  console.log('Start seeding ...');

  // Clear old data
  await prisma.order.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.drug.deleteMany({});
  await prisma.user.deleteMany({});

  // Seed Users
  const hashedPasswordNurse = await bcrypt.hash('1234', 10);
  await prisma.user.create({
    data: {
      username: 'nurse',
      password: hashedPasswordNurse,
      fullName: 'พยาบาล สมหญิง ใจดี',
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
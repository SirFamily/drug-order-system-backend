const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/drugs
const getAllDrugs = async (req, res) => {
  try {
    const drugs = await prisma.drug.findMany();
    res.json(drugs);
  } catch (error) {
    console.error('Get all drugs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getAllDrugs };

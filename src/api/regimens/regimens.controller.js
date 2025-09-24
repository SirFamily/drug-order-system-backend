const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllRegimens = async (req, res) => {
  try {
    const regimens = await prisma.regimen.findMany();
    res.json(regimens);
  } catch (error) {
    console.error('Get all regimens error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getAllRegimens };

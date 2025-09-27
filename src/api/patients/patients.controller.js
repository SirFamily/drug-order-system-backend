const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/patients
const getAllPatients = async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      include: {
        orders: true,
      },
    });
    res.json(patients);
  } catch (error) {
    console.error('Get all patients error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/patients/:id
const getPatientById = async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
    });
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    console.error(`Get patient ${id} error:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getAllPatients, getPatientById };

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/patients
const getAllPatients = async (req, res) => {
  const userWardId = req.user?.wardId;
  const { status } = req.query; // 'ACTIVE', 'COMPLETED', or undefined for default

  try {
    const whereClause = {};

    // Filter by ward if the user has a wardId
    if (userWardId) {
      whereClause.wardId = userWardId;
    }

    // Filter by status
    if (status && (status === 'ACTIVE' || status === 'COMPLETED')) {
      whereClause.status = status;
    } else {
      // Default to ACTIVE patients if no or invalid status is provided
      whereClause.status = 'ACTIVE';
    }

    const patients = await prisma.patient.findMany({
      where: whereClause,
      include: {
        orders: {
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      }
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
  const userWardId = req.user?.wardId;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Security check: If user belongs to a ward, check if they have access to this patient
    if (userWardId) {
      const orderCount = await prisma.order.count({
        where: {
          patientId: id,
          wardId: userWardId,
        },
      });

      if (orderCount === 0) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this patient.' });
      }
    }

    res.json(patient);
  } catch (error) {
    console.error(`Get patient ${id} error:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const completePatientStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
    res.json(updatedPatient);
  } catch (error) {
    console.error(`Error completing patient ${id}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getAllPatients, getPatientById, completePatientStatus };

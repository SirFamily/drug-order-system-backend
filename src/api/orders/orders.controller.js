const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getIo } = require('../../../src/utils/socket'); // Import getIo

// GET /api/orders
const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        createdBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
        regimen: { select: { name: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(orders);
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        createdBy: true,
        approvedBy: true,
        regimen: true,
      },
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error(`Get order ${id} error:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const patientData = JSON.parse(req.body.patient);
    const otherData = JSON.parse(req.body.otherData);

    const { regimenId, createdById, notes } = req.body; // Extract notes directly from req.body

    if (!patientData || !regimenId || !createdById) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let attachments = [];
    if (req.files) {
      attachments = req.files.map(file => ({
        fileName: file.originalname,
        fileUrl: `/public/uploads/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size,
      }));
    }

    const { drugs, startDate, completionDate, ...restOfOtherData } = otherData;

    const dataToCreate = {
      patient: patientData,
      regimenId,
      createdById,
      attachments,
      drugs: drugs || [],
      notes: notes, // Add notes here
      ...restOfOtherData,
    };

    if (startDate) {
      dataToCreate.startDate = new Date(startDate);
    }
    if (completionDate) {
      dataToCreate.completionDate = new Date(completionDate);
    }

    const newOrder = await prisma.order.create({
      data: dataToCreate,
      include: { // Include related data to emit a complete object
        createdBy: { select: { fullName: true } },
        regimen: { select: { name: true } },
      }
    });

    const io = getIo(); // Get the initialized io instance
    io.emit('order:created', newOrder); // Emit WebSocket event

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const approvedById = req.user.userId; // From JWT middleware

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        approvedById,
      },
      include: {
        createdBy: { select: { fullName: true } },
        approvedBy: { select: { fullName: true } },
        regimen: { select: { name: true } },
      }
    });

    const io = getIo(); // Get the initialized io instance
    io.emit('order:updated', updatedOrder); // Emit WebSocket event

    res.json(updatedOrder);
  } catch (error) {
    console.error(`Update order ${id} status error:`, error);
    if (error.code === 'P2025') { // Record not found
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { 
  getAllOrders, 
  getOrderById, 
  createOrder, 
  updateOrderStatus 
};

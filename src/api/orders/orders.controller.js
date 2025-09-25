const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getIo } = require('../../../src/utils/socket'); // Import getIo

// Helper function to generate a new order ID
const generateOrderId = async () => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const datePrefix = `ORD-${year}${month}${day}`;

  const lastOrder = await prisma.order.findFirst({
    where: { id: { startsWith: datePrefix } },
    orderBy: { id: 'desc' },
  });

  let nextNumber = 1;
  if (lastOrder) {
    const lastNumber = parseInt(lastOrder.id.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${datePrefix}-${nextNumber.toString().padStart(3, '0')}`;
};

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
        fileName: file.filename, // Use the new filename from multer
        fileUrl: `/public/uploads/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size,
      }));
    }

    const { drugs, startDate, completionDate, ...restOfOtherData } = otherData;

    const newOrderId = await generateOrderId(); // Generate the new order ID

    const dataToCreate = {
      id: newOrderId, // Use the generated ID
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
        createdBy: { select: { fullName: true, role: true } },
        regimen: { select: { name: true } },
      }
    });

    // Create notification for Pharmacists
    const pharmacists = await prisma.user.findMany({ where: { role: 'PHARMACIST' } });
    const io = getIo();

    for (const pharmacist of pharmacists) {
      const notification = await prisma.notification.create({
        data: {
          userId: pharmacist.id,
          message: `คำสั่งยาใหม่ ${newOrder.id} โดย ${newOrder.createdBy.fullName} รอการตรวจสอบ`,
          type: 'new_order',
          status: newOrder.status, // Add status
          relatedId: newOrder.id,
        }
      });
      io.to(pharmacist.id).emit('notification:new', notification); // Emit to specific pharmacist
    }

    io.emit('order:created', newOrder); // Emit WebSocket event for general updates

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
        createdBy: { select: { fullName: true, id: true } },
        approvedBy: { select: { fullName: true } },
        regimen: { select: { name: true } },
      }
    });

    // Create notification for the Nurse who created the order
    const io = getIo();
    const notificationMessage = `คำสั่งยา ${updatedOrder.id} ได้รับการ ${updatedOrder.status === 'COMPLETED' ? 'อนุมัติ' : 'ปฏิเสธ'} โดย ${updatedOrder.approvedBy?.fullName || 'เภสัชกร'}`;
    
    const notification = await prisma.notification.create({
      data: {
        userId: updatedOrder.createdById,
        message: notificationMessage,
        type: 'order_status',
        status: updatedOrder.status, // Add status
        relatedId: updatedOrder.id,
      }
    });
    io.to(updatedOrder.createdById).emit('notification:new', notification); // Emit to specific nurse

    io.emit('order:updated', updatedOrder); // Emit WebSocket event for general updates

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
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  const { patientId, latest } = req.query;

  try {
    let where = {};
    if (patientId) {
      where.patientId = patientId;
    }

    let orders = [];
    if (patientId && latest === 'true') {
      const latestOrder = await prisma.order.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { fullName: true } },
          patient: true,
        },
      });
      orders = latestOrder ? [latestOrder] : [];
    } else {
      orders = await prisma.order.findMany({
        where,
        include: {
          createdBy: { select: { fullName: true } },
          patient: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    // Enrich drugs for all fetched orders
    const enrichedOrders = await Promise.all(orders.map(async (order) => {
      const enrichedDrugs = await Promise.all(order.drugs.map(async (drug) => {
        const drugInfo = await prisma.drug.findUnique({ where: { id: drug.drugId } });
        return {
          ...drug,
          name: drugInfo?.name || drug.name,
          description: drugInfo?.description || '',
        };
      }));
      return { ...order, drugs: enrichedDrugs };
    }));

    if (patientId && latest === 'true') {
      return res.json(enrichedOrders[0] || null); // Return single object or null
    } else {
      return res.json(enrichedOrders); // Return array of objects
    }

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
        patient: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Enrich drugs with details from the Drug model
    const enrichedDrugs = await Promise.all(order.drugs.map(async (drug) => {
      const drugInfo = await prisma.drug.findUnique({ where: { id: drug.drugId } });
      return {
        ...drug,
        name: drugInfo?.name || drug.name,
        description: drugInfo?.description || '',
      };
    }));

    let parsedAttachments = [];
    if (order.attachments && typeof order.attachments === 'string') {
      try {
        parsedAttachments = JSON.parse(order.attachments);
      } catch (parseError) {
        console.error('Error parsing attachments JSON:', parseError);
        parsedAttachments = []; // Fallback to empty array on parse error
      }
    } else if (Array.isArray(order.attachments)) {
      parsedAttachments = order.attachments;
    }

    res.json({ ...order, drugs: enrichedDrugs, attachments: parsedAttachments });

  } catch (error) {
    console.error(`Get order ${id} error:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const patientData = JSON.parse(req.body.patient);
    const drugsData = JSON.parse(req.body.drugs);
    const otherData = JSON.parse(req.body.otherData);
    const createdById = req.body.createdById;
    const notes = req.body.notes;
    const existingAttachmentsData = JSON.parse(req.body.existingAttachments || '[]'); // Parse existing attachments

    if (!patientData || !patientData.hn || !drugsData || !createdById) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find or create patient
    const patientRecord = await prisma.patient.upsert({
      where: { hn: patientData.hn },
      update: { fullName: patientData.fullName, an: patientData.an },
      create: { hn: patientData.hn, fullName: patientData.fullName, an: patientData.an },
    });

    let newAttachments = [];
    if (req.files) {
      newAttachments = req.files.map(file => ({
        fileName: file.filename,
        fileUrl: `/public/uploads/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size,
      }));
    }

    const combinedAttachments = [...existingAttachmentsData, ...newAttachments]; // Combine existing and new

    const newOrderId = await generateOrderId();

    const dataToCreate = {
      id: newOrderId,
      patientId: patientRecord.id,
      createdById,
      drugs: drugsData.map(d => ({ drugId: d.drugId, dose: d.dose, day: d.day })), // Save only essential info
      attachments: combinedAttachments, // Use combined attachments
      notes,
      ...otherData,
    };

    if (dataToCreate.startDate) {
      dataToCreate.startDate = new Date(dataToCreate.startDate);
    }
    if (dataToCreate.completionDate) {
      dataToCreate.completionDate = new Date(dataToCreate.completionDate);
    }

    const newOrder = await prisma.order.create({
      data: dataToCreate,
    });

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { 
  getAllOrders, 
  getOrderById, 
  createOrder, 
};
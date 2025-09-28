const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

const parseAttachments = (attachments) => {
  if (!attachments) {
    return [];
  }

  if (Array.isArray(attachments)) {
    return attachments;
  }

  if (typeof attachments === 'string') {
    try {
      return JSON.parse(attachments);
    } catch (error) {
      console.error('Error parsing attachments JSON:', error);
      return [];
    }
  }

  return [];
};

const enrichOrdersWithDrugDetails = async (orders) => {
  if (!orders.length) {
    return orders;
  }

  const drugIds = new Set();
  orders.forEach((order) => {
    (order.drugs ?? []).forEach((drug) => {
      if (drug?.drugId) {
        drugIds.add(drug.drugId);
      }
    });
  });

  if (!drugIds.size) {
    return orders.map((order) => ({
      ...order,
      drugs: order.drugs ?? [],
    }));
  }

  const drugRecords = await prisma.drug.findMany({
    where: { id: { in: Array.from(drugIds) } },
  });
  const drugLookup = new Map(drugRecords.map((record) => [record.id, record]));

  return orders.map((order) => ({
    ...order,
    drugs: (order.drugs ?? []).map((drug) => {
      const drugInfo = drugLookup.get(drug.drugId);
      return {
        ...drug,
        name: drugInfo?.name ?? drug.name ?? '',
        description: drugInfo?.description ?? '',
      };
    }),
  }));
};

const getAllOrders = async (req, res) => {
  const { patientId, latest } = req.query;

  try {
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
      const where = patientId ? { patientId } : {};
      orders = await prisma.order.findMany({
        where,
        include: {
          createdBy: { select: { fullName: true } },
          patient: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    const enrichedOrders = await enrichOrdersWithDrugDetails(orders);
    const response = enrichedOrders.map((order) => ({
      ...order,
      attachments: parseAttachments(order.attachments),
    }));

    if (patientId && latest === 'true') {
      res.json(response[0] ?? null);
    } else {
      res.json(response);
    }
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

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

    const [enrichedOrder] = await enrichOrdersWithDrugDetails([order]);

    res.json({
      ...enrichedOrder,
      attachments: parseAttachments(enrichedOrder.attachments),
    });
  } catch (error) {
    console.error(`Get order ${id} error:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const createOrder = async (req, res) => {
  try {
    const patientData = JSON.parse(req.body.patient);
    const drugsData = JSON.parse(req.body.drugs);
    const otherData = JSON.parse(req.body.otherData);
    const createdById = req.body.createdById;
    const notes = req.body.notes;
    const existingAttachmentsData = JSON.parse(req.body.existingAttachments || '[]');

    if (!patientData || !patientData.hn || !drugsData || !createdById) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const patientRecord = await prisma.patient.upsert({
      where: { hn: patientData.hn },
      update: { fullName: patientData.fullName, an: patientData.an },
      create: { hn: patientData.hn, fullName: patientData.fullName, an: patientData.an },
    });

    let newAttachments = [];
    if (req.files) {
      newAttachments = req.files.map((file) => ({
        fileName: file.filename,
        fileUrl: `/public/uploads/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size,
      }));
    }

    const combinedAttachments = [...existingAttachmentsData, ...newAttachments];

    const newOrderId = await generateOrderId();

    const dataToCreate = {
      id: newOrderId,
      patientId: patientRecord.id,
      createdById,
      drugs: drugsData.map((drug) => ({
        drugId: drug.drugId,
        dose: drug.dose,
        day: drug.day,
      })),
      attachments: combinedAttachments,
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

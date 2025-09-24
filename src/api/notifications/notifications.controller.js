const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/notifications
const getNotifications = async (req, res) => {
  const userId = req.user.userId; // From JWT middleware

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId; // From JWT middleware

  try {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ message: 'Notification not found or not authorized' });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(updatedNotification);
  } catch (error) {
    console.error(`Mark notification ${id} as read error:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getNotifications, markAsRead };

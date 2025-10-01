const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user from DB to get the latest data, including wardId
      const user = await prisma.user.findUnique({ 
        where: { id: decoded.userId },
        select: { id: true, fullName: true, username: true, wardId: true }, // Select only necessary fields
      });

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = user; // Attach the full user object to the request
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };
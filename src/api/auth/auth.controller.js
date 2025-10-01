const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { ward: true }, // Include ward information
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, fullName: user.fullName, wardId: user.wardId }, // Include wardId in token
      process.env.JWT_SECRET || 'your_default_secret_key',
      { expiresIn: process.env.JWT_EXPIRATION || '15d' }
    );

    res.json({ 
      message: 'Login successful', 
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        wardId: user.wardId,
        wardName: user.ward.name, // Include wardName in user response
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { login };

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { setIo } = require('./src/utils/socket');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Adjust to your frontend URL
    methods: ["GET", "POST"]
  }
});

setIo(io); // Initialize the socket.io instance in the utility file

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/public', express.static('public'));

// API Routes
const authRoutes = require('./src/api/auth/auth.routes');
app.use('/api/auth', authRoutes);

const regimenRoutes = require('./src/api/regimens/regimens.routes');
app.use('/api/regimens', regimenRoutes);

const orderRoutes = require('./src/api/orders/orders.routes');
app.use('/api/orders', orderRoutes);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

// Basic Route
app.get('/', (req, res) => {
  res.send('Drug Order System Backend is running!');
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
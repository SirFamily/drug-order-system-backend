const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const { startSharedImageCleanup } = require('./src/utils/sharedImageCleanup');

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/public', express.static('public'));

// API Routes
const authRoutes = require('./src/api/auth/auth.routes');
app.use('/api/auth', authRoutes);

const drugRoutes = require('./src/api/drugs/drugs.routes');
app.use('/api/drugs', drugRoutes);

const orderRoutes = require('./src/api/orders/orders.routes');
app.use('/api/orders', orderRoutes);

const patientRoutes = require('./src/api/patients/patients.routes');
app.use('/api/patients', patientRoutes);

const shareRoutes = require('./src/api/share/share.routes');
app.use('/api/share', shareRoutes);

// Basic Route
app.get('/', (req, res) => {
  res.send('Drug Order System Backend is running!');
});

startSharedImageCleanup();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

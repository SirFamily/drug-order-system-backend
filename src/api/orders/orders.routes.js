const express = require('express');
const { 
  getAllOrders, 
  getOrderById, 
  createOrder, 
  updateOrderStatus 
} = require('./orders.controller');
const { protect, authorize } = require('../../middleware/auth.middleware');

const upload = require('../../middleware/upload');

const router = express.Router();

router.get('/', protect, getAllOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, upload.array('attachments', 10), createOrder);
router.patch('/:id/status', protect, authorize(['PHARMACIST']), updateOrderStatus);

module.exports = router;

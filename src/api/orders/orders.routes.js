const express = require('express');
const {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
} = require('./orders.controller');
const { protect } = require('../../middleware/auth.middleware');
const upload = require('../../middleware/upload');

const router = express.Router();

router.get('/', protect, getAllOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, upload.array('attachments', 10), createOrder);
router.put('/:id', protect, upload.array('attachments', 10), updateOrder);
router.delete('/:id', protect, deleteOrder);

module.exports = router;
const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const { getNotifications, markAsReadAndDelete } = require('./notifications.controller');

const router = express.Router();

router.route('/').get(protect, getNotifications);
router.route('/:id').delete(protect, markAsReadAndDelete);

module.exports = router;

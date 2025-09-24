const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const { getNotifications, markAsRead } = require('./notifications.controller');

const router = express.Router();

router.route('/').get(protect, getNotifications);
router.route('/:id/read').patch(protect, markAsRead);

module.exports = router;

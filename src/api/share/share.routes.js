const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const { saveSharedImage } = require('./share.controller');

const router = express.Router();

router.post('/images', protect, saveSharedImage);

module.exports = router;

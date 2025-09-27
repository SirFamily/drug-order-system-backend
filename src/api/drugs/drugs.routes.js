const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const { getAllDrugs } = require('./drugs.controller');

const router = express.Router();

router.route('/').get(protect, getAllDrugs);

module.exports = router;

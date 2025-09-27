const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const { getAllPatients, getPatientById } = require('./patients.controller');

const router = express.Router();

router.route('/').get(protect, getAllPatients);
router.route('/:id').get(protect, getPatientById);

module.exports = router;

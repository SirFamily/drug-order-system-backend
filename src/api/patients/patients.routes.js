const express = require('express');
const { protect } = require('../../middleware/auth.middleware');
const { getAllPatients, getPatientById, completePatientStatus } = require('./patients.controller');

const router = express.Router();

router.route('/').get(protect, getAllPatients);
router.route('/:id').get(protect, getPatientById);
router.route('/:id/complete').patch(protect, completePatientStatus);

module.exports = router;

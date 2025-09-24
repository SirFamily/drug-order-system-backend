const express = require('express');
const { getAllRegimens } = require('./regimens.controller');

const router = express.Router();

router.get('/', getAllRegimens);

module.exports = router;

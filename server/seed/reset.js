const express = require('express');
const { reset } = require('../db');
const router = express.Router();
router.post('/', (req, res) => { reset(); res.json({ reset: true }); });
module.exports = router;
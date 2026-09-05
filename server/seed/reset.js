const express = require('express');
const { reset } = require('../db');
const router = express.Router();
router.post('/', async (req, res, next) => { try { await reset(); res.json({ reset: true }); } catch (error) { next(error); } });
module.exports = router;
const express = require('express');
const { statements } = require('../db');
const { processInvoice } = require('../engine/orchestrator');
const router = express.Router();
router.post('/', async (req, res, next) => {
  try {
    const invoices = req.body?.limit ? statements.invoices.all().slice(0, Number(req.body.limit)) : statements.invoices.all();
    const results = [];
    for (const invoice of invoices) results.push(await processInvoice(invoice));
    res.json({ processed: results.length, results });
  } catch (error) { next(error); }
});
module.exports = router;
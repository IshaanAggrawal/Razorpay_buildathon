const express = require('express');
const { statements } = require('../db');
const { processInvoice } = require('../engine/orchestrator');
const router = express.Router();
router.post('/', async (req, res, next) => {
  try {
    const allInvoices = await statements.invoices.all();
    const invoices = req.body?.limit ? allInvoices.slice(0, Number(req.body.limit)) : allInvoices;
    console.log(`[recovery] starting batch of ${invoices.length} invoice(s)`);
    const results = [];
    for (const invoice of invoices) results.push(await processInvoice(invoice));
    const summary = results.reduce((counts, result) => { counts[result.status] = (counts[result.status] || 0) + 1; return counts; }, {});
    console.log(`[recovery] completed ${JSON.stringify(summary)}`);
    res.json({ processed: results.length, results });
  } catch (error) { next(error); }
});
module.exports = router;
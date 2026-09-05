const express = require('express');
const { statements } = require('../db');
const { parsePromiseDateWithModel, expirePromise } = require('../engine/promiseTracker');
const router = express.Router();
router.get('/', (req, res) => res.json(statements.promises.all()));
router.post('/', async (req, res, next) => {
  try {
    const invoice = statements.invoice.get(req.body.invoice_id);
    if (!invoice) return res.status(400).json({ error: `Invoice ${req.body.invoice_id} does not exist` });
    if (!req.body.raw_text?.trim()) return res.status(400).json({ error: 'raw_text is required' });
    const parsed = await parsePromiseDateWithModel(req.body.raw_text, req.body.today ? new Date(req.body.today) : new Date());
    const result = statements.insertPromise.run(req.body.invoice_id, req.body.raw_text.trim(), parsed.date, parsed.confidence);
    res.json({ id: result.lastInsertRowid, invoice_id: invoice.id, ...parsed });
  } catch (error) { next(error); }
});
router.post('/:id/expire', (req, res) => {
  const promise = expirePromise(req.params.id, req.body.today || new Date().toISOString().slice(0, 10));
  if (!promise) return res.status(404).json({ error: 'Promise not found' });
  res.json(promise);
});
module.exports = router;
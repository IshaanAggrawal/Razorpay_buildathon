const express = require('express');
const { statements } = require('../db');
const { parsePromiseDateWithModel, expirePromise } = require('../engine/promiseTracker');
const router = express.Router();
router.get('/', async (req, res, next) => { try { res.json(await statements.promises.all()); } catch (error) { next(error); } });
router.post('/', async (req, res, next) => {
  try {
    const invoice = await statements.invoice.get(req.body.invoice_id);
    if (!invoice) return res.status(400).json({ error: `Invoice ${req.body.invoice_id} does not exist` });
    if (!req.body.raw_text?.trim()) return res.status(400).json({ error: 'raw_text is required' });
    const parsed = await parsePromiseDateWithModel(req.body.raw_text, req.body.today ? new Date(req.body.today) : new Date());
    if (!parsed.date) {
      await statements.insertAudit.run(invoice.id, 'system', 'escalate_to_manager', `Customer reply "${req.body.raw_text.trim()}" contains no actionable payment date; no promise was created.`);
      return res.json({ invoice_id: invoice.id, status: 'no_promise', action: 'escalate_to_manager', date: null, confidence: parsed.confidence, message: 'No payment promise detected. The invoice was escalated for human review.' });
    }
    const result = await statements.insertPromise.run(req.body.invoice_id, req.body.raw_text.trim(), parsed.date, parsed.confidence);
    res.json({ id: result.lastInsertRowid, invoice_id: invoice.id, status: 'pending', ...parsed, message: `Promise tracked until ${parsed.date}.` });
  } catch (error) { next(error); }
});
router.post('/:id/expire', async (req, res, next) => { try {
  const promise = await expirePromise(req.params.id, req.body.today || new Date().toISOString().slice(0, 10));
  if (!promise) return res.status(404).json({ error: 'Promise not found' });
  res.json(promise);
  } catch (error) { next(error); }
});
module.exports = router;
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { statements } = require('../db');
const { calculateAging } = require('../engine/aging');
const router = express.Router();

function parseCsv(text) {
  const normalized = text.trim();
  if (!normalized) return [];
  const [header, ...lines] = normalized.split(/\r?\n/);
  const keys = header.split(',');
  return lines.filter(Boolean).map((line) => Object.fromEntries(line.split(',').map((value, index) => [keys[index], value])));
}

router.get('/sample', (req, res) => res.type('text/csv').send(fs.readFileSync(path.join(__dirname, '..', 'data', 'mock_invoices.csv'), 'utf8')));
router.get('/', async (req, res, next) => { try { res.json(await statements.invoices.all()); } catch (error) { next(error); } });
router.post('/', async (req, res, next) => {
  try {
    const input = [req.body];
    if (!input[0]?.id) return res.status(400).json({ error: 'id is required' });
    const invoice = { ...input[0], amount: Number(input[0].amount), days_overdue: Number(input[0].days_overdue || 0), past_default_count: Number(input[0].past_default_count || 0), dnc_flag: Number(input[0].dnc_flag || 0), contact_count: Number(input[0].contact_count || 0), status: input[0].status || 'open' };
    const aging = calculateAging(invoice);
    await require('../db').statements.insertInvoice.run({ ...invoice, risk_score: aging.riskScore, bucket: aging.bucket });
    res.status(201).json({ created: invoice.id });
  } catch (error) { next(error); }
});
router.post('/:id/mark-paid', async (req, res, next) => {
  try {
    const invoice = await statements.invoice.get(req.params.id);
    if (!invoice) return res.status(404).json({ error: `Invoice ${req.params.id} not found` });
    if (invoice.status !== 'open') return res.status(409).json({ error: `Invoice is already ${invoice.status}` });
    await statements.markPaid.run(invoice.id);
    await statements.insertAudit.run(invoice.id, 'system', 'marked_paid', `Invoice ${invoice.id} for ₹${(invoice.amount / 100).toFixed(2)} marked paid; removed from at-risk pool.`);
    res.json(await statements.invoice.get(invoice.id));
  } catch (error) { next(error); }
});
router.post('/bulk', express.text({ type: '*/*' }), async (req, res, next) => {
  try {
  const input = Array.isArray(req.body) ? req.body : parseCsv(req.body || '');
  if (!input.length) return res.status(400).json({ error: 'Upload a non-empty CSV or JSON array' });
  const required = ['id', 'customer_id', 'customer_name', 'amount', 'due_date', 'days_overdue'];
  const missing = required.filter((key) => !(key in input[0]));
  if (missing.length) return res.status(400).json({ error: `Missing CSV columns: ${missing.join(', ')}` });
  const insert = statements.insertInvoice;
  for (const raw of input) {
    const invoice = { ...raw, amount: Number(raw.amount), days_overdue: Number(raw.days_overdue), past_default_count: Number(raw.past_default_count || 0), dnc_flag: Number(raw.dnc_flag || 0), contact_count: Number(raw.contact_count || 0), status: raw.status || 'open' };
    const aging = calculateAging(invoice);
    await insert.run({ ...invoice, risk_score: aging.riskScore, bucket: aging.bucket });
  }
  res.json({ imported: input.length });
  } catch (error) { next(error); }
});

module.exports = router;
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
router.get('/', (req, res) => res.json(statements.invoices.all()));
router.post('/bulk', express.text({ type: '*/*' }), (req, res) => {
  const input = Array.isArray(req.body) ? req.body : parseCsv(req.body || '');
  if (!input.length) return res.status(400).json({ error: 'Upload a non-empty CSV or JSON array' });
  const required = ['id', 'customer_id', 'customer_name', 'amount', 'due_date', 'days_overdue'];
  const missing = required.filter((key) => !(key in input[0]));
  if (missing.length) return res.status(400).json({ error: `Missing CSV columns: ${missing.join(', ')}` });
  const insert = statements.insertInvoice;
  const transaction = require('../db').db.transaction((rows) => rows.map((raw) => {
    const invoice = { ...raw, amount: Number(raw.amount), days_overdue: Number(raw.days_overdue), past_default_count: Number(raw.past_default_count || 0), dnc_flag: Number(raw.dnc_flag || 0), contact_count: Number(raw.contact_count || 0), status: raw.status || 'open' };
    const aging = calculateAging(invoice);
    return insert.run({ ...invoice, risk_score: aging.riskScore, bucket: aging.bucket });
  }));
  transaction(input);
  res.json({ imported: input.length });
});

module.exports = router;
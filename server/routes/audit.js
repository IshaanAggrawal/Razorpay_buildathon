const express = require('express');
const { statements } = require('../db');
const router = express.Router();
router.get('/', (req, res) => res.json(statements.audit.all(Number(req.query.limit || 200))));
router.get('/export', (req, res) => {
  const rows = statements.audit.all(100000);
  const keys = ['id', 'invoice_id', 'actor', 'action', 'reasoning', 'timestamp'];
  const csv = [keys.join(','), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
  res.type('text/csv').attachment('audit-log.csv').send(csv);
});
module.exports = router;
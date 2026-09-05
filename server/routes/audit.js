const express = require('express');
const { statements } = require('../db');
const router = express.Router();
router.get('/', async (req, res, next) => { try { res.json(await statements.audit.all(Number(req.query.limit || 200))); } catch (error) { next(error); } });
router.get('/export', async (req, res, next) => { try {
  const rows = await statements.audit.all(100000);
  const keys = ['id', 'invoice_id', 'actor', 'action', 'reasoning', 'timestamp'];
  const csv = [keys.join(','), ...rows.map((row) => keys.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
  res.type('text/csv').attachment('audit-log.csv').send(csv);
  } catch (error) { next(error); }
});
module.exports = router;
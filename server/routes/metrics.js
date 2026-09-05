const express = require('express');
const { db } = require('../db');
const router = express.Router();
router.get('/', (req, res) => {
  const amountAtRisk = db.prepare("SELECT COALESCE(SUM(amount), 0) AS value FROM invoices WHERE status = 'open'").get().value;
  const recovered = db.prepare("SELECT COALESCE(SUM(amount), 0) AS value FROM invoices WHERE status = 'paid'").get().value;
  const escalations = db.prepare("SELECT COUNT(*) AS value FROM audit_log WHERE action IN ('escalate_to_manager', 'escalate_to_human')").get().value;
  const promises = db.prepare('SELECT COUNT(*) AS total, SUM(status = \'broken\') AS broken FROM promises').get();
  res.json({ amountAtRisk, amountRecovered: recovered, recoveryRate: amountAtRisk + recovered ? Number((recovered / (amountAtRisk + recovered) * 100).toFixed(2)) : 0, escalationCount: escalations, brokenPromiseRate: promises.total ? Number((promises.broken / promises.total * 100).toFixed(2)) : 0 });
});
module.exports = router;
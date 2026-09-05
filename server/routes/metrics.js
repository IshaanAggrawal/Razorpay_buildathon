const express = require('express');
const { statements } = require('../db');
const router = express.Router();
router.get('/', async (req, res, next) => {
 try {
  const metrics = await statements.metrics.get();
  const amountAtRisk = Number(metrics.amount_at_risk || 0);
  const recovered = Number(metrics.amount_recovered || 0);
  const escalations = Number(metrics.escalation_count || 0);
  const promiseTotal = Number(metrics.promise_total || 0);
  const brokenPromises = Number(metrics.broken_promises || 0);
  res.json({ amountAtRisk, amountRecovered: recovered, recoveryRate: amountAtRisk + recovered ? Number((recovered / (amountAtRisk + recovered) * 100).toFixed(2)) : 0, escalationCount: escalations, brokenPromiseRate: promiseTotal ? Number((brokenPromises / promiseTotal * 100).toFixed(2)) : 0 });
 } catch (error) { next(error); }
});
module.exports = router;
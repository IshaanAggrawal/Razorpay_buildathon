const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateAging } = require('../engine/aging');
const { checkInputGuardrails, validateDecisionOutput } = require('../engine/guardrails');

test('aging assigns buckets and deterministic risk score', () => {
  assert.deepEqual(calculateAging({ amount: 100000, days_overdue: 30, past_default_count: 2 }), { daysOverdue: 30, bucket: '0-30', riskScore: 400 });
  assert.equal(calculateAging({ amount: 100000, days_overdue: 31 }).bucket, '31-60');
  assert.equal(calculateAging({ amount: 100000, days_overdue: 61 }).bucket, '60+');
});

test('input guardrails block every deterministic stop condition', () => {
  const base = { amount: 100000, status: 'open', contact_count: 0 };
  assert.equal(checkInputGuardrails({ ...base, dnc_flag: 1 }).reason, 'dnc');
  assert.equal(checkInputGuardrails({ ...base, amount: 49999 }).reason, 'below_cost_floor');
  assert.equal(checkInputGuardrails({ ...base, contact_count: 4 }).reason, 'max_contacts');
  assert.equal(checkInputGuardrails({ ...base, status: 'disputed' }).reason, 'already_resolved');
  assert.equal(checkInputGuardrails(base).allowed, true);
});

test('output guardrail validates actions and routes low confidence', () => {
  const valid = { action: 'firm_followup', confidence: 0.8, reasoning: 'Amount 100000 and 31 days overdue.', message_draft: 'Please arrange payment.' };
  assert.equal(validateDecisionOutput(valid).valid, true);
  assert.equal(validateDecisionOutput({ ...valid, confidence: 0.5 }).needsEscalation, true);
  assert.equal(validateDecisionOutput({ ...valid, action: 'send_sms' }).reason, 'invalid_action');
  assert.equal(validateDecisionOutput({ ...valid, reasoning: 'x'.repeat(301) }).reason, 'invalid_reasoning');
});
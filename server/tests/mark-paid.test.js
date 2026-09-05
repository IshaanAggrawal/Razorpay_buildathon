const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index');
const { reset, statements } = require('../db');

function invoice(id, status = 'open') {
  return { id, customer_id: `CUS-${id}`, customer_name: 'Test Customer', amount: 250000, due_date: '2026-09-01', days_overdue: 4, past_default_count: 0, dnc_flag: 0, status, contact_count: 0, risk_score: 35, bucket: '0-30' };
}

test('mark-paid updates recovery metrics and rejects resolved invoices', async (t) => {
  reset();
  statements.insertInvoice.run(invoice('INV-PAID-TEST'));
  statements.insertInvoice.run(invoice('INV-DISPUTED-TEST', 'disputed'));
  const server = app.listen(0);
  t.after(() => { server.close(); reset(); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const paidResponse = await fetch(`${baseUrl}/api/invoices/INV-PAID-TEST/mark-paid`, { method: 'POST' });
  const paid = await paidResponse.json();
  assert.equal(paidResponse.status, 200);
  assert.equal(paid.status, 'paid');

  const metrics = await fetch(`${baseUrl}/api/metrics`).then((response) => response.json());
  assert.equal(metrics.amountRecovered, 250000);
  assert.equal(metrics.recoveryRate, 100);

  const paidAgain = await fetch(`${baseUrl}/api/invoices/INV-PAID-TEST/mark-paid`, { method: 'POST' });
  assert.equal(paidAgain.status, 409);
  assert.match((await paidAgain.json()).error, /already paid/);

  const disputed = await fetch(`${baseUrl}/api/invoices/INV-DISPUTED-TEST/mark-paid`, { method: 'POST' });
  assert.equal(disputed.status, 409);
  assert.match((await disputed.json()).error, /already disputed/);
});

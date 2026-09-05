const fs = require('node:fs');
const path = require('node:path');

const headers = ['id', 'customer_id', 'customer_name', 'amount', 'due_date', 'days_overdue', 'past_default_count', 'dnc_flag', 'status', 'contact_count'];
const rows = [headers.join(',')];
for (let index = 1; index <= 100; index += 1) {
  const amount = index <= 10 ? 30000 + index * 1000 : 200000 + ((index * 47391) % 48000000);
  const days = index <= 60 ? (index * 7) % 91 : (index * 11) % 91;
  const defaults = index >= 81 && index <= 90 ? 3 + (index % 3) : index % 3;
  const dnc = index >= 11 && index <= 20;
  const status = index === 98 ? 'disputed' : 'open';
  const contacts = index === 99 ? 4 : index % 3;
  const largeAmount = index === 100 ? 250000000 : amount;
  rows.push([`INV-${String(index).padStart(4, '0')}`, `CUS-${String(index).padStart(4, '0')}`, `Customer ${index}`, largeAmount, `2026-06-${String((index % 28) + 1).padStart(2, '0')}`, days, defaults, dnc ? 1 : 0, status, contacts].join(','));
}
fs.writeFileSync(path.join(__dirname, 'mock_invoices.csv'), `${rows.join('\n')}\n`);
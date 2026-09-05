const invoices = new Map();
const promises = new Map();
const auditLog = [];
let nextPromiseId = 1;

function clone(value) {
  return value ? { ...value } : value;
}

const statements = {
  invoice: { get: (id) => clone(invoices.get(id)) },
  invoices: { all: () => [...invoices.values()].sort((left, right) => right.risk_score - left.risk_score).map(clone) },
  insertInvoice: { run: (invoice) => { invoices.set(invoice.id, { ...invoice }); return { changes: 1 }; } },
  incrementContact: { run: (id) => { const invoice = invoices.get(id); if (invoice) invoice.contact_count += 1; return { changes: invoice ? 1 : 0 }; } },
  markPaid: { run: (id) => { const invoice = invoices.get(id); if (!invoice || invoice.status !== 'open') return { changes: 0 }; invoice.status = 'paid'; return { changes: 1 }; } },
  insertAudit: { run: (invoiceId, actor, action, reasoning) => { const row = { id: auditLog.length + 1, invoice_id: invoiceId, actor, action, reasoning, timestamp: new Date().toISOString() }; auditLog.push(row); return { lastInsertRowid: row.id, changes: 1 }; } },
  audit: { all: (limit) => auditLog.slice(-limit).reverse().map(clone) },
  insertPromise: { run: (invoiceId, rawText, promisedDate, confidence) => { const row = { id: nextPromiseId++, invoice_id: invoiceId, raw_text: rawText, promised_date: promisedDate, confidence, status: 'pending' }; promises.set(row.id, row); return { lastInsertRowid: row.id, changes: 1 }; } },
  promise: { get: (id) => clone(promises.get(Number(id))) },
  promises: { all: () => [...promises.values()].sort((left, right) => right.id - left.id).map(clone) },
  updatePromise: { run: (status, id) => { const promise = promises.get(Number(id)); if (promise) promise.status = status; return { changes: promise ? 1 : 0 }; } }
};

const db = {
  transaction: (callback) => (rows) => callback(rows),
  prepare: (query) => ({
    get: () => {
      if (query.includes("status = 'open'")) return { value: [...invoices.values()].filter((invoice) => invoice.status === 'open').reduce((sum, invoice) => sum + invoice.amount, 0) };
      if (query.includes("status = 'paid'")) return { value: [...invoices.values()].filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.amount, 0) };
      if (query.includes('COUNT(*) AS value')) return { value: auditLog.filter((row) => ['escalate_to_manager', 'escalate_to_human'].includes(row.action)).length };
      if (query.includes('COUNT(*) AS total')) return { total: promises.size, broken: [...promises.values()].filter((promise) => promise.status === 'broken').length };
      return {};
    }
  })
};

function reset() {
  invoices.clear();
  promises.clear();
  auditLog.length = 0;
  nextPromiseId = 1;
}

module.exports = { db, statements, reset };

const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for Neon storage');
const sql = neon(process.env.DATABASE_URL);

const ready = (async () => {
  await sql`CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, customer_name TEXT NOT NULL, amount INTEGER NOT NULL, due_date DATE NOT NULL, days_overdue INTEGER NOT NULL, past_default_count INTEGER NOT NULL DEFAULT 0, dnc_flag BOOLEAN NOT NULL DEFAULT FALSE, status TEXT NOT NULL DEFAULT 'open', contact_count INTEGER NOT NULL DEFAULT 0, risk_score DOUBLE PRECISION NOT NULL DEFAULT 0, bucket TEXT NOT NULL DEFAULT '0-30')`;
  await sql`CREATE TABLE IF NOT EXISTS promises (id SERIAL PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES invoices(id), raw_text TEXT NOT NULL, promised_date DATE, confidence DOUBLE PRECISION NOT NULL, status TEXT NOT NULL DEFAULT 'pending')`;
  await sql`CREATE TABLE IF NOT EXISTS audit_log (id SERIAL PRIMARY KEY, invoice_id TEXT, actor TEXT NOT NULL, action TEXT NOT NULL, reasoning TEXT NOT NULL, timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
})();

const run = async (query, values = []) => { await ready; return sql.query(query, values); };
const one = async (query, values = []) => (await run(query, values))[0] || null;

const statements = {
  invoice: { get: (id) => one('SELECT * FROM invoices WHERE id = $1', [id]) },
  invoices: { all: () => run('SELECT * FROM invoices ORDER BY risk_score DESC') },
  insertInvoice: { run: (invoice) => run(`INSERT INTO invoices (id, customer_id, customer_name, amount, due_date, days_overdue, past_default_count, dnc_flag, status, contact_count, risk_score, bucket) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO UPDATE SET customer_id=EXCLUDED.customer_id, customer_name=EXCLUDED.customer_name, amount=EXCLUDED.amount, due_date=EXCLUDED.due_date, days_overdue=EXCLUDED.days_overdue, past_default_count=EXCLUDED.past_default_count, dnc_flag=EXCLUDED.dnc_flag, status=EXCLUDED.status, contact_count=EXCLUDED.contact_count, risk_score=EXCLUDED.risk_score, bucket=EXCLUDED.bucket`, [invoice.id, invoice.customer_id, invoice.customer_name, invoice.amount, invoice.due_date, invoice.days_overdue, invoice.past_default_count, Boolean(invoice.dnc_flag), invoice.status, invoice.contact_count, invoice.risk_score, invoice.bucket]) },
  incrementContact: { run: (id) => run('UPDATE invoices SET contact_count = contact_count + 1 WHERE id = $1', [id]) },
  markPaid: { run: (id) => run("UPDATE invoices SET status = 'paid' WHERE id = $1 AND status = 'open'", [id]) },
  insertAudit: { run: (invoiceId, actor, action, reasoning) => run('INSERT INTO audit_log (invoice_id, actor, action, reasoning) VALUES ($1,$2,$3,$4)', [invoiceId, actor, action, reasoning]) },
  audit: { all: (limit) => run('SELECT * FROM audit_log ORDER BY id DESC LIMIT $1', [limit]) },
  insertPromise: { run: (invoiceId, rawText, promisedDate, confidence) => run('INSERT INTO promises (invoice_id, raw_text, promised_date, confidence) VALUES ($1,$2,$3,$4) RETURNING id', [invoiceId, rawText, promisedDate, confidence]) },
  promise: { get: (id) => one('SELECT * FROM promises WHERE id = $1', [id]) },
  promises: { all: () => run('SELECT * FROM promises ORDER BY id DESC') },
  updatePromise: { run: (status, id) => run('UPDATE promises SET status = $1 WHERE id = $2', [status, id]) },
  metrics: { get: async () => one("SELECT (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'open') AS amount_at_risk, (SELECT COALESCE(SUM(amount), 0) FROM invoices WHERE status = 'paid') AS amount_recovered, (SELECT COUNT(*) FROM audit_log WHERE action IN ('escalate_to_manager', 'escalate_to_human')) AS escalation_count, (SELECT COUNT(*) FROM promises) AS promise_total, (SELECT COUNT(*) FROM promises WHERE status = 'broken') AS broken_promises") }
};

async function reset() {
  await ready;
  await sql`TRUNCATE TABLE promises, audit_log, invoices RESTART IDENTITY CASCADE`;
}

module.exports = { db: null, statements, reset, ready, isNeon: true };

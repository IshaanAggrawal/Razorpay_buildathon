const Database = require('better-sqlite3');
const path = require('node:path');

const databasePath = path.join(__dirname, 'recovery.sqlite');
const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, customer_name TEXT NOT NULL,
    amount INTEGER NOT NULL, due_date TEXT NOT NULL, days_overdue INTEGER NOT NULL,
    past_default_count INTEGER NOT NULL DEFAULT 0, dnc_flag INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open', contact_count INTEGER NOT NULL DEFAULT 0,
    risk_score REAL NOT NULL DEFAULT 0, bucket TEXT NOT NULL DEFAULT '0-30'
  );
  CREATE TABLE IF NOT EXISTS promises (
    id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id TEXT NOT NULL, raw_text TEXT NOT NULL,
    promised_date TEXT, confidence REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY(invoice_id) REFERENCES invoices(id)
  );
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, invoice_id TEXT, actor TEXT NOT NULL,
    action TEXT NOT NULL, reasoning TEXT NOT NULL, timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const statements = {
  invoice: db.prepare('SELECT * FROM invoices WHERE id = ?'),
  invoices: db.prepare('SELECT * FROM invoices ORDER BY risk_score DESC'),
  insertInvoice: db.prepare(`INSERT OR REPLACE INTO invoices (id, customer_id, customer_name, amount, due_date, days_overdue, past_default_count, dnc_flag, status, contact_count, risk_score, bucket) VALUES (@id, @customer_id, @customer_name, @amount, @due_date, @days_overdue, @past_default_count, @dnc_flag, @status, @contact_count, @risk_score, @bucket)`),
  incrementContact: db.prepare('UPDATE invoices SET contact_count = contact_count + 1 WHERE id = ?'),
    markPaid: db.prepare("UPDATE invoices SET status = 'paid' WHERE id = ? AND status = 'open'"),
  insertAudit: db.prepare('INSERT INTO audit_log (invoice_id, actor, action, reasoning) VALUES (?, ?, ?, ?)'),
  audit: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?'),
  insertPromise: db.prepare('INSERT INTO promises (invoice_id, raw_text, promised_date, confidence) VALUES (?, ?, ?, ?)'),
  promise: db.prepare('SELECT * FROM promises WHERE id = ?'),
  promises: db.prepare('SELECT * FROM promises ORDER BY id DESC'),
  updatePromise: db.prepare('UPDATE promises SET status = ? WHERE id = ?')
};

function reset() {
  db.exec('DELETE FROM promises; DELETE FROM audit_log; DELETE FROM invoices;');
}

module.exports = { db, statements, reset };

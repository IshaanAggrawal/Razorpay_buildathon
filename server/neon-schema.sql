CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  due_date DATE NOT NULL,
  days_overdue INTEGER NOT NULL,
  past_default_count INTEGER NOT NULL DEFAULT 0,
  dnc_flag BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open',
  contact_count INTEGER NOT NULL DEFAULT 0,
  risk_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  bucket TEXT NOT NULL DEFAULT '0-30'
);

CREATE TABLE IF NOT EXISTS promises (
  id SERIAL PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  raw_text TEXT NOT NULL,
  promised_date DATE,
  confidence DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  invoice_id TEXT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
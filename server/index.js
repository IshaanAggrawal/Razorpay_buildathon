require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');
require('./db');
const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
	const startedAt = Date.now();
	res.on('finish', () => console.log(`[http] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`));
	next();
});
app.get(['/api/health', '/health'], (req, res) => res.json({ ok: true, storage: process.env.VERCEL ? 'temporary:/tmp' : 'local:sqlite' }));
app.use(['/api/invoices', '/invoices'], require('./routes/invoices'));
app.use(['/api/recover', '/recover'], require('./routes/recover'));
app.use(['/api/promises', '/promises'], require('./routes/promises'));
app.use(['/api/metrics', '/metrics'], require('./routes/metrics'));
app.use(['/api/audit', '/audit'], require('./routes/audit'));
app.use(['/api/seed/reset', '/seed/reset'], require('./seed/reset'));
app.use(['/api', '/invoices', '/recover', '/promises', '/metrics', '/audit', '/seed'], (req, res, next) => {
	if (req.path.startsWith('/api') || req.originalUrl.startsWith('/api')) return res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
	next();
});
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

app.use((error, req, res, next) => { console.error(error); res.status(500).json({ error: error.message }); });
const port = Number(process.env.PORT || 5000);
if (require.main === module) app.listen(port, () => console.log(`Revenue recovery API listening on http://localhost:${port}`));
module.exports = app;
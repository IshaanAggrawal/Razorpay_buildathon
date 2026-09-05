const app = require('../server/index');

module.exports = (req, res) => {
	const pathParts = Array.isArray(req.query?.path) ? req.query.path : req.query?.path ? [req.query.path] : [];
	if (!req.url.startsWith('/api/') && pathParts.length) {
		const query = new URL(req.url, 'http://vercel.local').search;
		req.url = `/api/${pathParts.map((part) => encodeURIComponent(part)).join('/')}${query}`;
	}
	return app(req, res);
};
module.exports = require('../server/index');

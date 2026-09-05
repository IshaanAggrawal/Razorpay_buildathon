module.exports = process.env.DATABASE_URL && process.env.NODE_ENV !== 'test' ? require('./db-neon') : require('./db-sqlite');

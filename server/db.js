module.exports = process.env.DATABASE_URL ? require('./db-neon') : require('./db-sqlite');

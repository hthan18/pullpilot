const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:hello123@localhost:5432/devflow'
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected! Current time:', res.rows[0].now);
  }
  pool.end();
});
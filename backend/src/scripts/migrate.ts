import fs from 'node:fs/promises';
import path from 'node:path';
import pool from '../config/db';

async function migrate() {
  const migrationsDirectory = path.resolve(process.cwd(), 'migrations');
  const entries = await fs.readdir(migrationsDirectory);
  const migrationFiles = entries
    .filter((entry) => entry.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  if (migrationFiles.length === 0) {
    throw new Error(`No SQL migrations found in ${migrationsDirectory}`);
  }

  for (const migrationFile of migrationFiles) {
    const migrationPath = path.join(migrationsDirectory, migrationFile);
    const sql = await fs.readFile(migrationPath, 'utf8');
    await pool.query(sql);
    console.log(`Applied migration: ${migrationFile}`);
  }
}

migrate()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

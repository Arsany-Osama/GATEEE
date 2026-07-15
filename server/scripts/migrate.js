const fs = require('fs');
const path = require('path');
const db = require('../db/knex');

const migrationsDir = path.join(__dirname, '..', 'migrations');

const splitSql = (sql) => {
  const statements = [];
  let delimiter = ';';
  let buffer = '';

  for (const rawLine of sql.split(/\r?\n/)) {
    const line = rawLine.trim();
    const delimiterMatch = line.match(/^DELIMITER\s+(.+)$/i);
    if (delimiterMatch) {
      delimiter = delimiterMatch[1];
      continue;
    }

    buffer += `${rawLine}\n`;
    if (buffer.trimEnd().endsWith(delimiter)) {
      const statement = buffer.trimEnd().slice(0, -delimiter.length).trim();
      if (statement) statements.push(statement);
      buffer = '';
    }
  }

  const tail = buffer.trim();
  if (tail) statements.push(tail);
  return statements.filter((statement) => statement && !statement.startsWith('--'));
};

const ensureSchemaMigrations = async () => {
  await db.raw(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY schema_migrations_filename_unique (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const run = async () => {
  await ensureSchemaMigrations();
  const executedRows = await db('schema_migrations').select('filename');
  const executed = new Set(executedRows.map((row) => row.filename));
  const files = fs.readdirSync(migrationsDir)
    .filter((file) => /\.(sql|js)$/i.test(file))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    if (executed.has(file)) {
      console.log(`Skipping ${file}`);
      continue;
    }

    console.log(`Running ${file}`);
    const filePath = path.join(migrationsDir, file);
    if (file.endsWith('.js')) {
      const migration = require(filePath);
      if (typeof migration.up !== 'function') {
        throw new Error(`${file} does not export an up() function.`);
      }
      await migration.up(db);
    } else {
      const sql = fs.readFileSync(filePath, 'utf8');
      for (const statement of splitSql(sql)) {
        await db.raw(statement);
      }
    }

    await db('schema_migrations').insert({ filename: file });
    console.log(`Recorded ${file}`);
  }

  console.log('Migrations complete.');
};

run()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.destroy();
  });

// Запустить один раз: node migrate.js
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id INTEGER PRIMARY KEY,
      type TEXT, cycle TEXT, sphere TEXT,
      proposal TEXT, responsible TEXT,
      "responsibleAll" TEXT, stakeholders TEXT,
      "completionForm" TEXT, deadline TEXT,
      status TEXT, "position2024" TEXT,
      "position2026" TEXT, "adgsPosition" TEXT,
      "caseNote" TEXT
    )
  `);

  for (const row of data) {
    await pool.query(`
      INSERT INTO cases VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (id) DO NOTHING
    `, [row.id, row.type, row.cycle, row.sphere, row.proposal,
        row.responsible, row.responsibleAll, row.stakeholders,
        row.completionForm, row.deadline, row.status,
        row.position2024, row.position2026, row.adgsPosition, row.caseNote]);
  }

  console.log(`✅ Перенесено ${data.length} записей`);
  await pool.end();
}

migrate().catch(console.error);

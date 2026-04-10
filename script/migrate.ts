import { Pool } from "pg";
import { readFileSync } from "fs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Creating table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY,
        type TEXT,
        cycle TEXT,
        sphere TEXT,
        proposal TEXT,
        responsible TEXT,
        "responsibleAll" TEXT,
        stakeholders TEXT,
        "completionForm" TEXT,
        deadline TEXT,
        status TEXT,
        position2024 TEXT,
        position2026 TEXT,
        "adgsPosition" TEXT,
        "caseNote" TEXT
      )
    `);

    console.log("Loading data.json...");
    const data = JSON.parse(readFileSync("data.json", "utf8"));

    console.log(`Inserting ${data.length} records...`);
    for (const r of data) {
      await client.query(`
        INSERT INTO recommendations (id, type, cycle, sphere, proposal, responsible, "responsibleAll", stakeholders, "completionForm", deadline, status, position2024, position2026, "adgsPosition", "caseNote")
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (id) DO UPDATE SET
          type=EXCLUDED.type, cycle=EXCLUDED.cycle, sphere=EXCLUDED.sphere,
          proposal=EXCLUDED.proposal, responsible=EXCLUDED.responsible,
          "responsibleAll"=EXCLUDED."responsibleAll", stakeholders=EXCLUDED.stakeholders,
          "completionForm"=EXCLUDED."completionForm", deadline=EXCLUDED.deadline,
          status=EXCLUDED.status, position2024=EXCLUDED.position2024,
          position2026=EXCLUDED.position2026, "adgsPosition"=EXCLUDED."adgsPosition",
          "caseNote"=EXCLUDED."caseNote"
      `, [r.id, r.type, r.cycle, r.sphere, r.proposal, r.responsible, r.responsibleAll,
          r.stakeholders, r.completionForm, r.deadline, r.status, r.position2024,
          r.position2026, r.adgsPosition, r.caseNote]);
    }

    console.log("Done!");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

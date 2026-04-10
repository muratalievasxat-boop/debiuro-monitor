// This file just tests the PG connection
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT COUNT(*) FROM recommendations").then(r => { console.log("PG rows:", r.rows[0].count); pool.end(); });

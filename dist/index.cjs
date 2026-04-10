var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);

// server/routes.ts
var import_http = require("http");
var import_multer = __toESM(require("multer"), 1);
var XLSX = __toESM(require("xlsx"), 1);

// server/storage.ts
var import_pg = require("pg");
var pool = new import_pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});
function splitExecs(raw) {
  if (!raw) return [];
  return raw.replace(/_x000d_/g, "\n").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
}
function normalizeForm(raw) {
  if (!raw) return "\u041F\u0440\u043E\u0447\u0435\u0435";
  const s = raw.trim();
  if (!s) return "\u041F\u0440\u043E\u0447\u0435\u0435";
  if (s.includes("\u0410\u0414\u0413\u0421")) return "\u0412 \u0410\u0414\u0413\u0421";
  if (s.includes("\u0410\u043F\u043F\u0430\u0440\u0430\u0442") || s.includes("\u0410\u041F\u0420")) return "\u0412 \u0410\u043F\u043F\u0430\u0440\u0430\u0442 \u041F\u0440\u0430\u0432\u0438\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430";
  if (/закон/i.test(s)) return "\u0417\u0430\u043A\u043E\u043D\u043E\u0434\u0430\u0442\u0435\u043B\u044C\u043D\u044B\u0439 \u0430\u043A\u0442";
  if (/президент/i.test(s)) return "\u0412 \u0410\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044E \u041F\u0440\u0435\u0437\u0438\u0434\u0435\u043D\u0442\u0430";
  if (/постановление/i.test(s)) return "\u041F\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435";
  if (/приказ/i.test(s)) return "\u041F\u0440\u0438\u043A\u0430\u0437";
  return "\u041F\u0440\u043E\u0447\u0435\u0435";
}
function isOverdue(deadline, status) {
  if (!deadline || !status) return false;
  if (status !== "\u0412 \u0440\u0430\u0431\u043E\u0442\u0435") return false;
  return deadline.includes("2024") || deadline.includes("2025");
}
async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY,
      type TEXT, cycle TEXT, sphere TEXT, proposal TEXT,
      responsible TEXT, responsible_all TEXT,
      stakeholders TEXT, completion_form TEXT,
      deadline TEXT, status TEXT, position_2024 TEXT,
      position_2026 TEXT, adgs_position TEXT, case_note TEXT
    );
    CREATE TABLE IF NOT EXISTS status_history (
      id SERIAL PRIMARY KEY,
      "recommendationId" INTEGER NOT NULL,
      "oldStatus" TEXT, "newStatus" TEXT,
      "oldDeadline" TEXT, "newDeadline" TEXT,
      "oldPosition2026" TEXT, "newPosition2026" TEXT,
      "changedBy" TEXT, "changedAt" TEXT NOT NULL, comment TEXT
    );
  `);
}
initTables().catch(console.error);
var storage = {
  async countImported() {
    const r = await pool.query("SELECT COUNT(*) as cnt FROM recommendations");
    return parseInt(r.rows[0].cnt);
  },
  async getAll(filters = {}) {
    const conditions = [];
    const params = [];
    let i = 1;
    if (filters.cycle) {
      conditions.push(`cycle = $${i++}`);
      params.push(filters.cycle);
    }
    if (filters.status) {
      conditions.push(`status = $${i++}`);
      params.push(filters.status);
    }
    if (filters.sphere) {
      conditions.push(`sphere = $${i++}`);
      params.push(filters.sphere);
    }
    if (filters.type) {
      conditions.push(`type = $${i++}`);
      params.push(filters.type);
    }
    if (filters.responsible) {
      conditions.push(`(responsible ILIKE $${i} OR responsible_all ILIKE $${i})`);
      params.push(`%${filters.responsible}%`);
      i++;
    }
    if (filters.search) {
      conditions.push(`(proposal ILIKE $${i} OR responsible ILIKE $${i} OR sphere ILIKE $${i} OR stakeholders ILIKE $${i})`);
      params.push(`%${filters.search}%`);
      i++;
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const r = await pool.query(`SELECT * FROM recommendations ${where} ORDER BY id`, params);
    return r.rows;
  },
  async getById(id) {
    const r = await pool.query("SELECT * FROM recommendations WHERE id = $1", [id]);
    return r.rows[0];
  },
  async upsertMany(rows) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const r of rows) {
        await client.query(`
          INSERT INTO recommendations (id,type,cycle,sphere,proposal,responsible,responsible_all,stakeholders,completion_form,deadline,status,position_2024,position_2026,adgs_position,case_note)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
          ON CONFLICT (id) DO UPDATE SET
            type=EXCLUDED.type, cycle=EXCLUDED.cycle, sphere=EXCLUDED.sphere,
            proposal=EXCLUDED.proposal, responsible=EXCLUDED.responsible,
            responsible_all=EXCLUDED.responsible_all, stakeholders=EXCLUDED.stakeholders,
            completion_form=EXCLUDED.completion_form, deadline=EXCLUDED.deadline,
            status=EXCLUDED.status, position_2024=EXCLUDED.position_2024,
            position_2026=EXCLUDED.position_2026, adgs_position=EXCLUDED.adgs_position,
            case_note=EXCLUDED.case_note
        `, [
          r.id,
          r.type,
          r.cycle,
          r.sphere,
          r.proposal,
          r.responsible,
          r.responsibleAll,
          r.stakeholders,
          r.completionForm,
          r.deadline,
          r.status,
          r.position_2024,
          r.position_2026,
          r.adgsPosition,
          r.caseNote
        ]);
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
  async updateStatus(id, payload) {
    const old = await this.getById(id);
    if (!old) return void 0;
    await pool.query(`
      INSERT INTO status_history ("recommendationId","oldStatus","newStatus","oldDeadline","newDeadline","oldPosition2026","newPosition2026","changedBy","changedAt",comment)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [
      id,
      old.status,
      payload.status,
      old.deadline,
      payload.deadline ?? old.deadline,
      old.position_2026,
      payload.position_2026 ?? old.position_2026,
      payload.changedBy ?? "\u0410\u043D\u043E\u043D\u0438\u043C",
      (/* @__PURE__ */ new Date()).toLocaleString("ru-RU"),
      payload.comment
    ]);
    await pool.query(`
      UPDATE recommendations SET status=$1, deadline=$2, position_2026=$3, adgs_position=$4 WHERE id=$5
    `, [
      payload.status,
      payload.deadline ?? old.deadline,
      payload.position_2026 ?? old.position_2026,
      payload.adgsPosition ?? old.adgsPosition,
      id
    ]);
    return this.getById(id);
  },
  async getHistory(recId) {
    if (recId) {
      const r2 = await pool.query(`SELECT * FROM status_history WHERE "recommendationId"=$1 ORDER BY id`, [recId]);
      return r2.rows;
    }
    const r = await pool.query("SELECT * FROM status_history ORDER BY id");
    return r.rows;
  },
  async getStats() {
    const all = await this.getAll();
    const total = all.length;
    const byStatus = {};
    const byType = {};
    const sphereMap = {};
    const execMap = {};
    const cycleMap = {};
    const formMap = {};
    let overdueCount = 0;
    const overdueExecMap = {};
    for (const r of all) {
      const s = r.status || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E";
      byStatus[s] = (byStatus[s] || 0) + 1;
      const t = r.type || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D";
      byType[t] = (byType[t] || 0) + 1;
      if (r.sphere) {
        if (!sphereMap[r.sphere]) sphereMap[r.sphere] = { count: 0, done: 0, inWork: 0, rejected: 0 };
        sphereMap[r.sphere].count++;
        if (s === "\u0418\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043E") sphereMap[r.sphere].done++;
        else if (s === "\u0412 \u0440\u0430\u0431\u043E\u0442\u0435") sphereMap[r.sphere].inWork++;
        else if (s === "\u041D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F") sphereMap[r.sphere].rejected++;
      }
      let primaryExec = r.responsible?.trim() || "";
      if (r.responsibleAll) {
        try {
          primaryExec = JSON.parse(r.responsibleAll)[0] || primaryExec;
        } catch {
        }
      }
      if (primaryExec) {
        if (!execMap[primaryExec]) execMap[primaryExec] = { count: 0, done: 0 };
        execMap[primaryExec].count++;
        if (s === "\u0418\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043E") execMap[primaryExec].done++;
      }
      const c = r.cycle || "?";
      if (!cycleMap[c]) cycleMap[c] = { total: 0, done: 0, inWork: 0, rejected: 0, noStatus: 0, doneAnalysis: 0, doneMonitoring: 0, totalAnalysis: 0, totalMonitoring: 0 };
      cycleMap[c].total++;
      if (s === "\u0418\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043E") cycleMap[c].done++;
      else if (s === "\u0412 \u0440\u0430\u0431\u043E\u0442\u0435") cycleMap[c].inWork++;
      else if (s === "\u041D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F") cycleMap[c].rejected++;
      else cycleMap[c].noStatus++;
      const typeNorm = (r.type || "").trim().toLowerCase();
      if (typeNorm === "\u0430\u043D\u0430\u043B\u0438\u0437") {
        cycleMap[c].totalAnalysis++;
        if (s === "\u0418\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043E") cycleMap[c].doneAnalysis++;
      } else if (typeNorm === "\u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433") {
        cycleMap[c].totalMonitoring++;
        if (s === "\u0418\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043E") cycleMap[c].doneMonitoring++;
      }
      const form = normalizeForm(r.completionForm);
      if (!formMap[form]) formMap[form] = { total: 0, done: 0 };
      formMap[form].total++;
      if (s === "\u0418\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043E") formMap[form].done++;
      if (isOverdue(r.deadline, r.status)) {
        overdueCount++;
        overdueExecMap[primaryExec || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"] = (overdueExecMap[primaryExec || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D"] || 0) + 1;
      }
    }
    const byCycle = ["I", "II", "III", "IV", "V", "VI", "VII"].map((c) => ({
      cycle: c,
      ...cycleMap[c] || { total: 0, done: 0, inWork: 0, rejected: 0, noStatus: 0, doneAnalysis: 0, doneMonitoring: 0, totalAnalysis: 0, totalMonitoring: 0 }
    }));
    const bySphere = Object.entries(sphereMap).sort((a, b) => b[1].count - a[1].count).slice(0, 15).map(([sphere, v]) => ({ sphere, ...v }));
    const byExec = Object.entries(execMap).sort((a, b) => b[1].count - a[1].count).map(([responsible, v]) => ({ responsible, ...v }));
    const byForm = Object.entries(formMap).sort((a, b) => b[1].total - a[1].total).map(([form, v]) => ({ form, ...v }));
    const overdueByExec = Object.entries(overdueExecMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([responsible, count]) => ({ responsible, count }));
    return { total, byStatus, byCycle, bySphere, byExec, byType, byForm, overdue: overdueCount, overdueByExec };
  }
};

// shared/schema.ts
var import_sqlite_core = require("drizzle-orm/sqlite-core");
var import_drizzle_zod = require("drizzle-zod");
var import_zod = require("zod");
var recommendations = (0, import_sqlite_core.sqliteTable)("recommendations", {
  id: (0, import_sqlite_core.integer)("id").primaryKey(),
  // original №
  type: (0, import_sqlite_core.text)("type"),
  // Анализ / Мониторинг
  cycle: (0, import_sqlite_core.text)("cycle"),
  // I–VII
  sphere: (0, import_sqlite_core.text)("sphere"),
  proposal: (0, import_sqlite_core.text)("proposal"),
  responsible: (0, import_sqlite_core.text)("responsible"),
  responsibleAll: (0, import_sqlite_core.text)("responsible_all"),
  // JSON array of all execs (for multi-exec records)
  stakeholders: (0, import_sqlite_core.text)("stakeholders"),
  completionForm: (0, import_sqlite_core.text)("completion_form"),
  deadline: (0, import_sqlite_core.text)("deadline"),
  status: (0, import_sqlite_core.text)("status"),
  // normalized
  position2024: (0, import_sqlite_core.text)("position_2024"),
  position2026: (0, import_sqlite_core.text)("position_2026"),
  adgsPosition: (0, import_sqlite_core.text)("adgs_position"),
  caseNote: (0, import_sqlite_core.text)("case_note")
});
var insertRecommendationSchema = (0, import_drizzle_zod.createInsertSchema)(recommendations);
var statusHistory = (0, import_sqlite_core.sqliteTable)("status_history", {
  id: (0, import_sqlite_core.integer)("id").primaryKey({ autoIncrement: true }),
  recommendationId: (0, import_sqlite_core.integer)("recommendation_id").notNull(),
  oldStatus: (0, import_sqlite_core.text)("old_status"),
  newStatus: (0, import_sqlite_core.text)("new_status"),
  oldDeadline: (0, import_sqlite_core.text)("old_deadline"),
  newDeadline: (0, import_sqlite_core.text)("new_deadline"),
  oldPosition2026: (0, import_sqlite_core.text)("old_position_2026"),
  newPosition2026: (0, import_sqlite_core.text)("new_position_2026"),
  changedBy: (0, import_sqlite_core.text)("changed_by"),
  changedAt: (0, import_sqlite_core.text)("changed_at").notNull(),
  comment: (0, import_sqlite_core.text)("comment")
});
var updateStatusSchema = import_zod.z.object({
  status: import_zod.z.string(),
  deadline: import_zod.z.string().optional(),
  position2026: import_zod.z.string().optional(),
  adgsPosition: import_zod.z.string().optional(),
  changedBy: import_zod.z.string().optional(),
  comment: import_zod.z.string().optional()
});

// server/routes.ts
var upload = (0, import_multer.default)({ storage: import_multer.default.memoryStorage() });
function normalizeStatus(raw) {
  if (!raw) return "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E";
  const s = raw.toString().trim().toLowerCase();
  if (s.includes("\u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043E")) return "\u0418\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043E";
  if (s.includes("\u0432 \u0440\u0430\u0431\u043E\u0442\u0435") || s.includes("\u0432 \u0440\u0430\u0431\u043E\u0442\u0443")) return "\u0412 \u0440\u0430\u0431\u043E\u0442\u0435";
  if (s.includes("\u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F") || s.includes("\u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436")) return "\u041D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F";
  if (s.includes("\u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442")) return "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u043F\u043E\u0437\u0438\u0446\u0438\u044F";
  return raw.toString().trim() || "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E";
}
function normalizeSphere(raw) {
  if (!raw) return "";
  const map = {
    "\u0433\u043E\u0441\u0437\u0430\u043A\u0443\u043F\u043A\u0438": "\u0413\u043E\u0441\u0437\u0430\u043A\u0443\u043F\u043A\u0438",
    "\u0433\u043E\u0441\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435": "\u0413\u043E\u0441\u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435",
    "\u0433\u043E\u0441\u0443\u0441\u043B\u0443\u0433\u0438": "\u0413\u043E\u0441\u0443\u0441\u043B\u0443\u0433\u0438",
    "\u0446\u0438\u0444\u0440\u043E\u0432\u0438\u0437\u0430\u0446\u0438\u044F": "\u0426\u0438\u0444\u0440\u043E\u0432\u0438\u0437\u0430\u0446\u0438\u044F",
    "\u0446\u0438\u0444\u0440\u043E\u0432\u044B\u0435 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u044F": "\u0426\u0438\u0444\u0440\u043E\u0432\u043E\u0435 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435",
    "\u0446\u0438\u0444\u0440\u043E\u0432\u043E\u0435 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u044F": "\u0426\u0438\u0444\u0440\u043E\u0432\u043E\u0435 \u0440\u0430\u0437\u0432\u0438\u0442\u0438\u0435",
    "\u043E\u0431\u0449\u0430\u044F": "\u041E\u0431\u0449\u0430\u044F",
    "\u043D\u0435\u0434\u0440\u043E\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F": "\u041D\u0435\u0434\u0440\u043E\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435",
    "\u043F\u0440\u043E\u043C\u044B\u0448\u043B\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u0438 \u0441\u0442\u0440\u043E\u0438\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E ": "\u041F\u0440\u043E\u043C\u044B\u0448\u043B\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u0438 \u0441\u0442\u0440\u043E\u0438\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E",
    "\u0433\u043E\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432\u0435\u043D\u043D\u043E-\u0447\u0430\u0441\u0442\u043D\u043E\u0435 \u043F\u0430\u0440\u0442\u043D\u0435\u0440\u0441\u0442\u0432\u043E ": "\u0413\u043E\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432\u0435\u043D\u043D\u043E-\u0447\u0430\u0441\u0442\u043D\u043E\u0435 \u043F\u0430\u0440\u0442\u043D\u0435\u0440\u0441\u0442\u0432\u043E",
    "\u0444\u0443\u043D\u043A\u0446\u0438\u0438 ": "\u0424\u0443\u043D\u043A\u0446\u0438\u0438",
    "\u043E\u0442\u043A\u0430\u0437\u044B \u0432 \u0440\u0435\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438 \u043F\u0440\u0430\u0432 \u0433\u0440\u0430\u0436\u0434\u0430\u043D ": "\u041E\u0442\u043A\u0430\u0437\u044B \u0432 \u0440\u0435\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u0438 \u043F\u0440\u0430\u0432 \u0433\u0440\u0430\u0436\u0434\u0430\u043D"
  };
  const key = raw.toString().trim().toLowerCase();
  return map[key] || raw.toString().trim();
}
async function registerRoutes(httpServer, app2) {
  const count = await storage.countImported();
  if (count === 0) {
    try {
      const fs = await import("fs");
      const path2 = await import("path");
      const dataPath = path2.join(process.cwd(), "data.json");
      if (fs.existsSync(dataPath)) {
        const raw = JSON.parse(fs.readFileSync(dataPath, "utf8"));
        await storage.upsertMany(raw);
        console.log(`Seeded ${raw.length} recommendations from data.json`);
      }
    } catch (e) {
      console.log("No data.json found, DB empty until import");
    }
  }
  app2.get("/api/stats", async (_req, res) => {
    try {
      res.json(await storage.getStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/recommendations", async (req, res) => {
    try {
      const { search, cycle, status, sphere, type, responsible, page = "1", pageSize = "50" } = req.query;
      const all = await storage.getAll({ search, cycle, status, sphere, type, responsible });
      const total = all.length;
      const p = parseInt(page);
      const ps = parseInt(pageSize);
      const items = all.slice((p - 1) * ps, p * ps);
      res.json({ total, page: p, pageSize: ps, pages: Math.ceil(total / ps), items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/recommendations/:id", async (req, res) => {
    try {
      const rec = await storage.getById(parseInt(req.params.id));
      if (!rec) return res.status(404).json({ error: "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" });
      res.json(rec);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.patch("/api/recommendations/:id/status", async (req, res) => {
    try {
      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const updated = await storage.updateStatus(parseInt(req.params.id), parsed.data);
      if (!updated) return res.status(404).json({ error: "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/history", async (req, res) => {
    try {
      const recId = req.query.recId ? parseInt(req.query.recId) : void 0;
      res.json(await storage.getHistory(recId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/import", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "\u0424\u0430\u0439\u043B \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D" });
    try {
      const wb = XLSX.read(req.file.buffer, { type: "buffer" });
      const ws = wb.Sheets["\u043F\u0435\u0440\u0435\u0447\u0435\u043D\u044C"] || wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      const rows = [];
      for (let i = 2; i < raw.length; i++) {
        const row = raw[i];
        if (!row[0] || isNaN(Number(row[0]))) continue;
        const rawExec = row[5]?.toString().trim() || null;
        const execList = rawExec ? splitExecs(rawExec) : [];
        const primaryExec = execList[0] || rawExec || null;
        const responsibleAll = execList.length > 1 ? JSON.stringify(execList) : null;
        rows.push({
          id: Number(row[0]),
          type: row[1]?.toString().trim() || null,
          cycle: row[2]?.toString().trim() || null,
          sphere: normalizeSphere(row[3]),
          proposal: row[4]?.toString().trim() || null,
          responsible: primaryExec,
          responsibleAll,
          stakeholders: row[6]?.toString().trim() || null,
          completionForm: row[7]?.toString().trim() || null,
          deadline: row[8]?.toString().replace(/\n/g, " ").trim() || null,
          status: normalizeStatus(row[9]),
          position2024: row[10]?.toString().trim() || null,
          position2026: row[11]?.toString().trim() || null,
          adgsPosition: row[12]?.toString().trim() || null,
          caseNote: row[13]?.toString().trim() || null
        });
      }
      await storage.upsertMany(rows);
      res.json({ imported: rows.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/export", async (req, res) => {
    try {
      const { cycle, status, sphere, type, responsible } = req.query;
      const data = await storage.getAll({ cycle, status, sphere, type, responsible });
      const rows = data.map((r) => {
        let execDisplay = r.responsible || "";
        if (r.responsibleAll) {
          try {
            const arr = JSON.parse(r.responsibleAll);
            if (arr.length > 1) execDisplay = arr.join(", ");
          } catch (_) {
          }
        }
        return {
          "\u2116": r.id,
          "\u0422\u0438\u043F": r.type,
          "\u0426\u0438\u043A\u043B": r.cycle,
          "\u0421\u0444\u0435\u0440\u0430": r.sphere,
          "\u041F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435": r.proposal,
          "\u041E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C": execDisplay,
          "\u0417\u0430\u0438\u043D\u0442\u0435\u0440\u0435\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u0413\u041E": r.stakeholders,
          "\u0424\u043E\u0440\u043C\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F": r.completionForm,
          "\u0421\u0440\u043E\u043A \u0438\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F": r.deadline,
          "\u0421\u0442\u0430\u0442\u0443\u0441 \u0413\u041E": r.status,
          "\u041F\u043E\u0437\u0438\u0446\u0438\u044F \u0413\u041E 2024-2025": r.position2024,
          "\u041F\u043E\u0437\u0438\u0446\u0438\u044F \u0413\u041E \u043D\u0430 27.03.2026": r.position2026,
          "\u041F\u043E\u0437\u0438\u0446\u0438\u044F \u0410\u0414\u0413\u0421": r.adgsPosition,
          "\u041A\u0435\u0439\u0441": r.caseNote
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 60 }, { wch: 18 }, { wch: 30 }, { wch: 40 }, { wch: 18 }, { wch: 24 }, { wch: 40 }, { wch: 40 }, { wch: 30 }, { wch: 15 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wb_ws = ws, "\u041F\u043E\u0441\u0442\u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      res.setHeader("Content-Disposition", `attachment; filename=postmonitoring-${date}.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/meta", async (_req, res) => {
    try {
      const all = await storage.getAll();
      const spheres = [...new Set(all.map((r) => r.sphere).filter(Boolean))].sort();
      const execs = [...new Set(all.map((r) => r.responsible?.trim()).filter(Boolean))].sort();
      const cycles = ["I", "II", "III", "IV", "V", "VI", "VII"];
      const statuses = ["\u0418\u0441\u043F\u043E\u043B\u043D\u0435\u043D\u043E", "\u0412 \u0440\u0430\u0431\u043E\u0442\u0435", "\u041D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F", "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u043F\u043E\u0437\u0438\u0446\u0438\u044F", "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E"];
      const types = [...new Set(all.map((r) => r.type).filter(Boolean))].sort();
      res.json({ spheres, execs, cycles, statuses, types });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  return (0, import_http.createServer)(app2);
}

// server/index.ts
var app = (0, import_express.default)();
app.use(import_express.default.json());
var distPath = import_path.default.join(process.cwd(), "dist", "public");
app.use(import_express.default.static(distPath, { index: false }));
registerRoutes(null, app).then((server) => {
  app.get("/{*path}", (_req, res) => {
    res.sendFile(import_path.default.join(distPath, "index.html"));
  });
  const PORT = process.env.PORT || 3e3;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

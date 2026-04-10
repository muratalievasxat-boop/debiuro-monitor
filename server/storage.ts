import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

export interface RecFilter {
  search?: string;
  cycle?: string;
  status?: string;
  sphere?: string;
  type?: string;
  responsible?: string;
}

export interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byCycle: {
    cycle: string; total: number; done: number; inWork: number; rejected: number; noStatus: number;
    doneAnalysis: number; doneMonitoring: number; totalAnalysis: number; totalMonitoring: number;
  }[];
  bySphere: { sphere: string; count: number; done: number; inWork: number; rejected: number }[];
  byExec: { responsible: string; count: number; done: number }[];
  byType: Record<string, number>;
  byForm: { form: string; total: number; done: number }[];
  overdue: number;
  overdueByExec: { responsible: string; count: number }[];
}

export function splitExecs(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.replace(/_x000d_/g, '\n').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
}

function normalizeForm(raw: string | null | undefined): string {
  if (!raw) return 'Прочее';
  const s = raw.trim();
  if (!s) return 'Прочее';
  if (s.includes('АДГС')) return 'В АДГС';
  if (s.includes('Аппарат') || s.includes('АПР')) return 'В Аппарат Правительства';
  if (/закон/i.test(s)) return 'Законодательный акт';
  if (/президент/i.test(s)) return 'В Администрацию Президента';
  if (/постановление/i.test(s)) return 'Постановление';
  if (/приказ/i.test(s)) return 'Приказ';
  return 'Прочее';
}

function isOverdue(deadline: string | null | undefined, status: string | null | undefined): boolean {
  if (!deadline || !status) return false;
  if (status !== 'В работе') return false;
  return deadline.includes('2024') || deadline.includes('2025');
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

export const storage = {
  async countImported(): Promise<number> {
    const r = await pool.query("SELECT COUNT(*) as cnt FROM recommendations");
    return parseInt(r.rows[0].cnt);
  },

  async getAll(filters: RecFilter = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (filters.cycle) { conditions.push(`cycle = $${i++}`); params.push(filters.cycle); }
    if (filters.status) { conditions.push(`status = $${i++}`); params.push(filters.status); }
    if (filters.sphere) { conditions.push(`sphere = $${i++}`); params.push(filters.sphere); }
    if (filters.type) { conditions.push(`type = $${i++}`); params.push(filters.type); }
    if (filters.responsible) {
      conditions.push(`(responsible ILIKE $${i} OR responsible_all ILIKE $${i})`);
      params.push(`%${filters.responsible}%`); i++;
    }
    if (filters.search) {
      conditions.push(`(proposal ILIKE $${i} OR responsible ILIKE $${i} OR sphere ILIKE $${i} OR stakeholders ILIKE $${i})`);
      params.push(`%${filters.search}%`); i++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const r = await pool.query(`SELECT * FROM recommendations ${where} ORDER BY id`, params);
    return r.rows;
  },

  async getById(id: number): Promise<any | undefined> {
    const r = await pool.query("SELECT * FROM recommendations WHERE id = $1", [id]);
    return r.rows[0];
  },

  async upsertMany(rows: any[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
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
        `, [r.id, r.type, r.cycle, r.sphere, r.proposal, r.responsible, r.responsibleAll,
            r.stakeholders, r.completionForm, r.deadline, r.status, r.position_2024,
            r.position_2026, r.adgsPosition, r.caseNote]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async updateStatus(id: number, payload: any): Promise<any | undefined> {
    const old = await this.getById(id);
    if (!old) return undefined;

    await pool.query(`
      INSERT INTO status_history ("recommendationId","oldStatus","newStatus","oldDeadline","newDeadline","oldPosition2026","newPosition2026","changedBy","changedAt",comment)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [id, old.status, payload.status, old.deadline, payload.deadline ?? old.deadline,
        old.position_2026, payload.position_2026 ?? old.position_2026,
        payload.changedBy ?? 'Аноним', new Date().toLocaleString('ru-RU'), payload.comment]);

    await pool.query(`
      UPDATE recommendations SET status=$1, deadline=$2, position_2026=$3, adgs_position=$4 WHERE id=$5
    `, [payload.status, payload.deadline ?? old.deadline,
        payload.position_2026 ?? old.position_2026,
        payload.adgsPosition ?? old.adgsPosition, id]);

    return this.getById(id);
  },

  async getHistory(recId?: number): Promise<any[]> {
    if (recId) {
      const r = await pool.query(`SELECT * FROM status_history WHERE "recommendationId"=$1 ORDER BY id`, [recId]);
      return r.rows;
    }
    const r = await pool.query("SELECT * FROM status_history ORDER BY id");
    return r.rows;
  },

  async getStats(): Promise<Stats> {
    const all = await this.getAll();
    const total = all.length;
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const sphereMap: Record<string, { count: number; done: number; inWork: number; rejected: number }> = {};
    const execMap: Record<string, { count: number; done: number }> = {};
    const cycleMap: Record<string, any> = {};
    const formMap: Record<string, { total: number; done: number }> = {};
    let overdueCount = 0;
    const overdueExecMap: Record<string, number> = {};

    for (const r of all) {
      const s = r.status || 'Не указано';
      byStatus[s] = (byStatus[s] || 0) + 1;
      const t = r.type || 'Не указан';
      byType[t] = (byType[t] || 0) + 1;

      if (r.sphere) {
        if (!sphereMap[r.sphere]) sphereMap[r.sphere] = { count: 0, done: 0, inWork: 0, rejected: 0 };
        sphereMap[r.sphere].count++;
        if (s === 'Исполнено') sphereMap[r.sphere].done++;
        else if (s === 'В работе') sphereMap[r.sphere].inWork++;
        else if (s === 'Не поддерживается') sphereMap[r.sphere].rejected++;
      }

      let primaryExec = r.responsible?.trim() || '';
      if (r.responsibleAll) {
        try { primaryExec = JSON.parse(r.responsibleAll)[0] || primaryExec; } catch {}
      }
      if (primaryExec) {
        if (!execMap[primaryExec]) execMap[primaryExec] = { count: 0, done: 0 };
        execMap[primaryExec].count++;
        if (s === 'Исполнено') execMap[primaryExec].done++;
      }

      const c = r.cycle || '?';
      if (!cycleMap[c]) cycleMap[c] = { total:0,done:0,inWork:0,rejected:0,noStatus:0,doneAnalysis:0,doneMonitoring:0,totalAnalysis:0,totalMonitoring:0 };
      cycleMap[c].total++;
      if (s === 'Исполнено') cycleMap[c].done++;
      else if (s === 'В работе') cycleMap[c].inWork++;
      else if (s === 'Не поддерживается') cycleMap[c].rejected++;
      else cycleMap[c].noStatus++;
      const typeNorm = (r.type || '').trim().toLowerCase();
      if (typeNorm === 'анализ') { cycleMap[c].totalAnalysis++; if (s === 'Исполнено') cycleMap[c].doneAnalysis++; }
      else if (typeNorm === 'мониторинг') { cycleMap[c].totalMonitoring++; if (s === 'Исполнено') cycleMap[c].doneMonitoring++; }

      const form = normalizeForm(r.completionForm);
      if (!formMap[form]) formMap[form] = { total: 0, done: 0 };
      formMap[form].total++;
      if (s === 'Исполнено') formMap[form].done++;

      if (isOverdue(r.deadline, r.status)) {
        overdueCount++;
        overdueExecMap[primaryExec || 'Не указан'] = (overdueExecMap[primaryExec || 'Не указан'] || 0) + 1;
      }
    }

    const byCycle = ['I','II','III','IV','V','VI','VII'].map(c => ({
      cycle: c, ...(cycleMap[c] || { total:0,done:0,inWork:0,rejected:0,noStatus:0,doneAnalysis:0,doneMonitoring:0,totalAnalysis:0,totalMonitoring:0 })
    }));
    const bySphere = Object.entries(sphereMap).sort((a,b) => b[1].count - a[1].count).slice(0,15).map(([sphere,v]) => ({ sphere, ...v }));
    const byExec = Object.entries(execMap).sort((a,b) => b[1].count - a[1].count).map(([responsible,v]) => ({ responsible, ...v }));
    const byForm = Object.entries(formMap).sort((a,b) => b[1].total - a[1].total).map(([form,v]) => ({ form, ...v }));
    const overdueByExec = Object.entries(overdueExecMap).sort((a,b) => b[1]-a[1]).slice(0,10).map(([responsible,count]) => ({ responsible, count }));

    return { total, byStatus, byCycle, bySphere, byExec, byType, byForm, overdue: overdueCount, overdueByExec };
  },
};

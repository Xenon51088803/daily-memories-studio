import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

export function dayAt(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function nextDay(day) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
export function validDay(day) {
  return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && !isNaN(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day;
}
const hash = value => createHash('sha256').update(value).digest('hex');
export function openDiary(directory) {
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, 'diary.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS owner (id INTEGER PRIMARY KEY CHECK(id=1), salt TEXT NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY CHECK(id=1), failures INTEGER NOT NULL, reset INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS entries (date TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, mood TEXT NOT NULL, version INTEGER NOT NULL, updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS quotes (date TEXT PRIMARY KEY, text TEXT NOT NULL);`);
  // Existing entries remain plain text; new editor entries explicitly use Markdown.
  if (!db.prepare('PRAGMA table_info(entries)').all().some(column => column.name === 'format')) {
    db.exec("ALTER TABLE entries ADD COLUMN format TEXT NOT NULL DEFAULT 'plain'");
  }
  return {
    close: () => db.close(),
    configured: () => !!db.prepare('SELECT id FROM owner WHERE id=1').get(),
    setup(password) {
      if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw new Error('密码需要 10–200 个字符');
      const salt = randomBytes(24).toString('hex');
      const result = db.prepare('INSERT OR IGNORE INTO owner VALUES (1, ?, ?)').run(salt, scryptSync(password, salt, 64).toString('hex'));
      if (!result.changes) throw new Error('已设置密码，请直接登录');
    },
    resetPassword(password) {
      if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw new Error('密码需要 10–200 个字符');
      const salt = randomBytes(24).toString('hex');
      const passwordHash = scryptSync(password, salt, 64).toString('hex');
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('INSERT OR REPLACE INTO owner VALUES (1, ?, ?)').run(salt, passwordHash);
        db.exec('DELETE FROM sessions; DELETE FROM attempts; COMMIT;');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    login(password) {
      const now = Date.now();
      const attempts = db.prepare('SELECT * FROM attempts WHERE id=1').get();
      if (attempts && attempts.reset > now && attempts.failures >= 8) throw new Error('尝试次数过多，请 15 分钟后重试');
      const owner = db.prepare('SELECT * FROM owner WHERE id=1').get();
      const valid = owner && typeof password === 'string' && password.length <= 200 && timingSafeEqual(scryptSync(password, owner.salt, 64), Buffer.from(owner.password, 'hex'));
      if (!valid) {
        const failures = attempts && attempts.reset > now ? Number(attempts.failures) + 1 : 1;
        db.prepare('INSERT OR REPLACE INTO attempts VALUES(1, ?, ?)').run(failures, attempts && attempts.reset > now ? attempts.reset : now + 900000);
        throw new Error('密码不正确');
      }
      db.prepare('DELETE FROM attempts').run();
      db.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
      const token = randomBytes(32).toString('hex');
      db.prepare('INSERT INTO sessions VALUES (?, ?)').run(hash(token), now + 7 * 86400000);
      return token;
    },
    authenticated(token) {
      return typeof token === 'string' && !!db.prepare('SELECT token FROM sessions WHERE token=? AND expires>?').get(hash(token), Date.now());
    },
    logout(token) { if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token)); },
    publicQuotes(today = dayAt()) {
      return db.prepare('SELECT date, text FROM quotes WHERE date<=? AND text!=? ORDER BY date DESC').all(today, '');
    },
    editorQuotes() {
      return db.prepare('SELECT date, text FROM quotes WHERE text!=? ORDER BY date DESC').all('');
    },
    quote(date) {
      if (!validDay(date) || date < '1900-01-01') throw new Error('展示日期无效');
      const source = new Date(`${date}T12:00:00Z`);
      source.setUTCDate(source.getUTCDate() - 1);
      const entry = this.entry(source.toISOString().slice(0, 10));
      return { date, text: entry.tomorrow, version: entry.version };
    },
    saveQuote(data, today = dayAt()) {
      const {date, text, version} = data;
      if (!validDay(date) || date < '1900-01-01' || date > nextDay(today)) throw new Error('展示日期只能选择明天或之前的日期');
      if (typeof text !== 'string' || text.length > 200 || !Number.isInteger(version) || version < 0) throw new Error('句子格式不正确，最多 200 字');
      const source = new Date(`${date}T12:00:00Z`);
      source.setUTCDate(source.getUTCDate() - 1);
      const entry = this.entry(source.toISOString().slice(0, 10));
      // Preserve private diary fields; the shared entry revision prevents lost updates.
      this.save({...entry, tomorrow:text, version}, today);
      return this.quote(date);
    },
    entry(date) {
      if (!validDay(date)) throw new Error('日期无效');
      const entry = db.prepare('SELECT * FROM entries WHERE date=?').get(date) || { date, title: '', body: '', mood: '', version: 0, updated: '', format: 'markdown' };
      return { ...entry, tomorrow: db.prepare('SELECT text FROM quotes WHERE date=?').get(nextDay(date))?.text || '', received: db.prepare('SELECT text FROM quotes WHERE date=?').get(date)?.text || '' };
    },
    calendar() {
      return db.prepare("SELECT date, CASE WHEN body!='' OR title!='' THEN 1 ELSE 0 END AS diary FROM entries ORDER BY date DESC").all();
    },
    save(data, today = dayAt()) {
      const { date, title, body, mood, tomorrow, version } = data;
      if (data.format !== undefined && !['plain', 'markdown'].includes(data.format)) throw new Error('日记正文格式不正确');
      if (!validDay(date) || date > today) throw new Error('只能记录今天或过去的生活');
      if (typeof title !== 'string' || title.length > 100 || typeof body !== 'string' || body.length > 50000 || typeof tomorrow !== 'string' || tomorrow.length > 200 || !['', '晴朗', '平静', '充实', '低落', '疲惫'].includes(mood) || !Number.isInteger(version)) throw new Error('内容格式或长度不正确');
      db.exec('BEGIN IMMEDIATE');
      try {
        const current = db.prepare('SELECT version, format FROM entries WHERE date=?').get(date);
        if ((current?.version || 0) !== version) throw new Error('这篇日记已在其他窗口更新，请复制当前文字后刷新');
        db.prepare('INSERT OR REPLACE INTO entries (date, title, body, mood, version, updated, format) VALUES (?, ?, ?, ?, ?, ?, ?)').run(date, title, body, mood, version + 1, new Date().toISOString(), data.format ?? current?.format ?? 'plain');
        if (tomorrow.trim()) db.prepare('INSERT OR REPLACE INTO quotes VALUES (?, ?)').run(nextDay(date), tomorrow.trim());
        else db.prepare('DELETE FROM quotes WHERE date=?').run(nextDay(date));
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return this.entry(date);
    },
    backup() {
      return { format: 'tomorrow-diary-v1', exported: new Date().toISOString(), entries: db.prepare('SELECT * FROM entries ORDER BY date').all(), quotes: db.prepare('SELECT * FROM quotes ORDER BY date').all() };
    },
  };
}

export function diaryStore() {
  // A single connection per server process, including development hot reloads.
  const key = Symbol.for('tomorrow.diary.store.v3');
  if (!globalThis[key]) globalThis[key] = openDiary(process.env.DIARY_DATA_DIR || path.join(process.cwd(), '.diary-data'));
  return globalThis[key];
}

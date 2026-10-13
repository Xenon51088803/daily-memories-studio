import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDiary, dayAt, nextDay, validDay } from '../src/lib/diary-store.mjs';
import { DatabaseSync } from 'node:sqlite';
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tomorrow-unit-'));
  const store = openDiary(directory);
  t.after(() => store.close());
  return { store, directory };
}
const entry = (date, patch = {}) => ({date, title:'秘密标题', body:'私密内容，不可公开', mood:'平静', tomorrow:'明天也要好好生活', version:0, ...patch});
test('legacy database migration preserves text and Markdown survives quote edits and reopen', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tomorrow-migration-'));
  const old = new DatabaseSync(path.join(directory, 'diary.sqlite'));
  old.exec('CREATE TABLE entries (date TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, mood TEXT NOT NULL, version INTEGER NOT NULL, updated TEXT NOT NULL)');
  old.prepare('INSERT INTO entries VALUES (?, ?, ?, ?, ?, ?)').run('2026-10-09', '旧日记', '# 原样 *文字*\n第二行', '', 1, 'old');
  old.close();
  const store = openDiary(directory);
  assert.equal(store.entry('2026-10-09').format, 'plain');
  assert.equal(store.entry('2026-10-09').body, '# 原样 *文字*\n第二行');
  assert.equal(store.entry('2026-10-10').format, 'markdown');
  store.save(entry('2026-10-10', { body: '## 私密标题\n\n**生活**', format: 'markdown' }), '2026-10-10');
  store.saveQuote({ ...store.quote('2026-10-11'), text: '新的句子' }, '2026-10-10');
  assert.equal(store.entry('2026-10-10').format, 'markdown');
  assert.equal(store.backup().entries[1].format, 'markdown');
  assert.throws(() => store.save(entry('2026-10-08', { format: 'html' }), '2026-10-10'), /格式/);
  assert.equal(JSON.stringify(store.publicQuotes('2026-10-11')).includes('私密'), false);
  store.close();
  const reopened = openDiary(directory);
  t.after(() => reopened.close());
  assert.equal(reopened.entry('2026-10-10').body, '## 私密标题\n\n**生活**');
  assert.equal(reopened.entry('2026-10-10').format, 'markdown');
});
test('Shanghai midnight, leap days and year boundaries', () => {
  assert.equal(dayAt(new Date('2026-12-31T15:59:59Z')), '2026-12-31');
  assert.equal(dayAt(new Date('2026-12-31T16:00:00Z')), '2027-01-01');
  assert.equal(nextDay('2024-02-28'), '2024-02-29');
  assert.equal(nextDay('2026-12-31'), '2027-01-01');
  assert.equal(validDay('2026-02-30'), false);
});
test('future letters are embargoed and public projection never includes a diary', t => {
  const {store} = fixture(t);
  store.save(entry('2026-10-10'), '2026-10-10');
  assert.deepEqual(store.publicQuotes('2026-10-10'), []);
  assert.deepEqual(store.publicQuotes('2026-10-11').map(q => ({...q})), [{date:'2026-10-11',text:'明天也要好好生活'}]);
  assert.equal(JSON.stringify(store.publicQuotes('2026-10-11')).includes('私密'), false);
  assert.equal(store.entry('2026-10-10').body, '私密内容，不可公开');
  assert.equal(store.entry('2026-10-11').received, '明天也要好好生活');
});
test('content persists in a second connection', t => {
  const {store,directory} = fixture(t);
  store.save(entry('2026-10-09'), '2026-10-10');
  const second = openDiary(directory);
  assert.equal(second.entry('2026-10-09').title, '秘密标题');
  second.close();
});
test('stale versions cannot overwrite diary or letter', t => {
  const {store} = fixture(t);
  store.save(entry('2026-10-10'), '2026-10-10');
  assert.throws(() => store.save(entry('2026-10-10',{tomorrow:'overwrite'}), '2026-10-10'), /其他窗口/);
  assert.equal(store.entry('2026-10-10').tomorrow, '明天也要好好生活');
});
test('clearing a letter removes its public record without deleting diary', t => {
  const {store} = fixture(t);
  store.save(entry('2026-10-10'), '2026-10-10');
  store.save(entry('2026-10-10',{tomorrow:'  ',version:1}), '2026-10-10');
  assert.deepEqual(store.publicQuotes('2026-10-12'), []);
  assert.equal(store.entry('2026-10-10').body,'私密内容，不可公开');
});
test('invalid, future and oversized entries are rejected without writing', t => {
  const {store} = fixture(t);
  for (const invalid of [entry('2026-02-30'),entry('2026-10-11'),entry('2026-10-10',{tomorrow:'x'.repeat(201)}),entry('2026-10-10',{body:'x'.repeat(50001)})]) assert.throws(() => store.save(invalid,'2026-10-10'));
  assert.deepEqual(store.calendar(), []);
});
test('password setup is single use; sessions revoke on logout; exports omit credentials', t => {
  const {store} = fixture(t);
  assert.equal(store.configured(), false);
  assert.throws(() => store.setup('short'));
  store.setup('test-only-password-2026');
  assert.throws(() => store.setup('new-password-2026'), /已设置/);
  assert.throws(() => store.login('wrong'), /不正确/);
  const token = store.login('test-only-password-2026');
  assert.equal(store.authenticated(token), true);
  assert.equal(store.authenticated('forged-token'), false);
  const backup = JSON.stringify(store.backup());
  assert.equal(/password|salt|token/.test(backup), false);
  store.logout(token);
  assert.equal(store.authenticated(token), false);
});
test('repeated wrong passwords are rate limited', t => {
  const {store} = fixture(t);
  store.setup('test-only-password-2026');
  for(let i=0;i<8;i++) assert.throws(() => store.login('wrong'));
  assert.throws(() => store.login('test-only-password-2026'), /尝试次数/);
});
test('local password recovery preserves entries and revokes old sessions', t => {
  const {store} = fixture(t);
  store.setup('test-only-password-2026');
  const token = store.login('test-only-password-2026');
  store.save(entry('2026-10-10'), '2026-10-10');
  store.resetPassword('replacement-password-2026');
  assert.equal(store.authenticated(token), false);
  assert.throws(() => store.login('test-only-password-2026'));
  assert.ok(store.login('replacement-password-2026'));
  assert.equal(store.entry('2026-10-10').body, '私密内容，不可公开');
});
test('studio quote editing preserves diary fields and shares conflict protection', t => {
  const {store} = fixture(t);
  store.save(entry('2026-10-10'), '2026-10-10');
  const quote = store.quote('2026-10-11');
  assert.deepEqual(Object.keys(quote).sort(), ['date','text','version']);
  store.saveQuote({...quote,text:'修改后给明天的话'},'2026-10-10');
  const privateEntry=store.entry('2026-10-10');
  assert.equal(privateEntry.body,'私密内容，不可公开');
  assert.equal(privateEntry.title,'秘密标题');
  assert.equal(privateEntry.mood,'平静');
  assert.equal(privateEntry.tomorrow,'修改后给明天的话');
  assert.deepEqual(store.publicQuotes('2026-10-10'),[]);
  assert.equal(JSON.stringify(store.editorQuotes()).includes('私密'),false);
  assert.throws(()=>store.saveQuote({...quote,text:'stale overwrite'},'2026-10-10'),/其他窗口/);
  assert.throws(()=>store.save(entry('2026-10-10',{version:1}),'2026-10-10'),/其他窗口/);
  store.saveQuote({...store.quote('2026-10-11'),text:''},'2026-10-10');
  assert.deepEqual(store.editorQuotes(),[]);
  assert.equal(store.entry('2026-10-10').body,'私密内容，不可公开');
});
test('studio rejects invalid release dates, excessive scheduling and oversized quotes', t => {
  const {store}=fixture(t);
  for(const quote of [{date:'2026-02-30',text:'x',version:0},{date:'2026-10-12',text:'x',version:0},{date:'2026-10-11',text:'x'.repeat(201),version:0}]) assert.throws(()=>store.saveQuote(quote,'2026-10-10'));
  assert.deepEqual(store.editorQuotes(),[]);
});

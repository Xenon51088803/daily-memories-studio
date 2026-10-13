import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { validateContent } from '../src/lib/content-schema.ts';
import { publicContent, publicImages } from '../src/lib/public-content.mjs';
import { albumViews, photoImportMeta } from '../src/lib/photo-albums.mjs';
const base = JSON.parse(await fs.readFile(new URL('../src/content/site.example.json',import.meta.url),'utf8'));
const album=(id,privateValue=false)=>({id,title:id,date:'2026-08-23',location:'测试地点',note:'相册小记',coverId:'',private:privateValue});
const photo=(id,albumId,date='',privateValue=false)=>({id,albumId,date,src:`/images/${id}.webp`,title:id,subtitle:'',orientation:'horizontal',private:privateValue});
test('folder import parses padded dates, Windows paths and rejects impossible dates',()=>{
  assert.deepEqual(photoImportMeta('photos/2026/2026.8.23-示例湖泊/a.jpg'),{date:'2026-08-23',location:'示例湖泊',title:'示例湖泊'});
  assert.equal(photoImportMeta('2025\\2025.11.29-示例公园\\a.jpg').date,'2025-11-29');
  assert.equal(photoImportMeta('a.jpg').date,'');
  assert.throws(()=>photoImportMeta('2026.2.30-无效/a.jpg'),/日期无效/);
});
test('old backups remain readable and album fields survive round trips',()=>{
  const legacy=structuredClone(base);delete legacy.albums;legacy.photographs=[photo('old','','')];
  delete legacy.photographs[0].albumId;delete legacy.photographs[0].date;
  assert.deepEqual(validateContent(legacy).albums,[]);
  const content={...base,albums:[album('trip')],photographs:[photo('one','trip','2026-08-24')]};
  content.albums[0].coverId='one';
  const valid=validateContent(content);
  assert.deepEqual(validateContent(JSON.parse(JSON.stringify(valid))),valid);
  content.photographs[0].albumId='missing';assert.throws(()=>validateContent(content),/所属相册不存在/);
  content.photographs[0].albumId='trip';content.albums[0].coverId='missing';assert.throws(()=>validateContent(content),/封面必须/);
});
test('whole private albums disappear with files, covers, counts and year navigation',()=>{
  const content={...base,albums:[album('hidden',true),album('visible'),album('empty')],photographs:[photo('secret','hidden','2024-01-01'),photo('one','visible','2026-08-24'),photo('private-cover','visible','2025-01-01',true)]};
  content.albums[1].coverId='private-cover';content.home={...content.home,cover:'/images/secret.webp'};
  const result=publicContent(content);
  assert.deepEqual(result.albums.map(a=>a.id),['visible']);
  assert.equal(result.albums[0].coverId,'');assert.equal(result.home.cover,'');
  assert.equal(result.photographs.length,1);
  assert.ok(!publicImages(content).includes('/images/secret.webp'));
  const views=albumViews(result);assert.equal(views.length,1);assert.equal(views[0].year,'2026');assert.equal(views[0].cover.id,'one');
  assert.doesNotMatch(JSON.stringify(result),/private-cover|secret|hidden/);
});
test('albums use chronological day groups while preserving photo order within a day',()=>{
  const content={...base,albums:[album('trip')],photographs:[photo('later','trip','2026-08-26'),photo('first','trip','2026-08-23'),photo('second','trip','2026-08-23'),photo('legacy','')]};
  const views=albumViews(content);
  assert.equal(views[0].start,'2026-08-23');assert.equal(views[0].end,'2026-08-26');
  assert.deepEqual(views[0].photos.map(p=>p.id),['first','second','later']);
  assert.equal(views[1].year,'未标日期');
});

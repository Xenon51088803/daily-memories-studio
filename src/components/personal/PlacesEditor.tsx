"use client";
import { useState } from 'react';
import type { SiteContent, PhotoPlace } from '@/lib/content-schema';
import { photoRecords } from '@/lib/photo-memories.mjs';
import styles from './AlbumStudio.module.scss';

export function PlacesEditor({content,onEdit}:{content:SiteContent;onEdit:(change:(draft:SiteContent)=>void)=>void}) {
  const [selected,setSelected]=useState('');
  const places=content.places??[];
  const place=places.find(p=>p.id===selected)||places[0];
  const update=(change:Partial<PhotoPlace>)=>onEdit(c=>{Object.assign(c.places!.find(p=>p.id===place!.id)!,change);});
  const add=()=>{const p:PhotoPlace={id:`place-${crypto.randomUUID()}`,name:'新地点',city:'',aliases:[],latitude:null,longitude:null};onEdit(c=>{(c.places??=[]).push(p);});setSelected(p.id);};
  const remove=()=>{
    if(!place||!window.confirm('删除地点归类？照片和原来的拍摄地点文字会保留。'))return;
    onEdit(c=>{c.places=c.places?.filter(p=>p.id!==place.id);for(const photo of c.photographs)if(photo.placeId===place.id)photo.placeId='';});setSelected('');
  };
  return <section className={styles.box} aria-label="管理地点">
    <div className={styles.actions}><h3>把同一个地方的记忆连起来</h3><button onClick={add}>＋ 新增地点</button></div>
    <p className={styles.hint}>地点归类跨相册生效。同一地点相邻拍摄日间隔不超过 3 天算一次到访，分开的到访才会出现在「故地重游」中。只含私密照片的地点不会发布。</p>
    {place?<>
      <label className={styles.field}><span>选择管理的地点</span><select aria-label="选择管理的地点" value={place.id} onChange={e=>setSelected(e.target.value)}>{places.map(p=><option key={p.id} value={p.id}>{p.city?`${p.city} · `:''}{p.name}</option>)}</select></label>
      <div className={styles.fields}>
        <label className={styles.field}><span>地点名称</span><input value={place.name} onChange={e=>update({name:e.target.value})}/></label>
        <label className={styles.field}><span>所在城市</span><input value={place.city} onChange={e=>update({city:e.target.value})}/></label>
      </div>
      <label className={styles.field}><span>其他写法（每行一个）</span><textarea key={place.id} rows={3} defaultValue={place.aliases.join('\n')} onBlur={e=>update({aliases:e.target.value.split(/\n/).map(s=>s.trim()).filter(Boolean)})}/></label>
      <p className={styles.hint}>例如「洱海」与「大理洱海」可归为同一地点。当前关联 {photoRecords(content).filter(r=>r.place.id===place.id).length} 张照片；也可以在每张照片的「地点归类」中手动选择。</p>
      <details className={styles.placeCoordinates}>
        <summary>地图位置（可选）</summary>
        <p className={styles.hint}>填写确认过的 WGS84 经纬度后，地点会显示在足迹地图上；没有坐标时仍能从地图下方选择照片。景区标记只表示地点，不是精确拍摄位置。<a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(place.city+' '+place.name)}`} target="_blank" rel="noreferrer">在 OpenStreetMap 查找此地 ↗</a></p>
        <div className={styles.fields}>
          <label className={styles.field}><span>纬度</span><input aria-label="纬度" type="number" step="any" min={-90} max={90} value={place.latitude??''} onChange={e=>update({latitude:Number.isFinite(e.target.valueAsNumber)?e.target.valueAsNumber:null})}/></label>
          <label className={styles.field}><span>经度</span><input aria-label="经度" type="number" step="any" min={-180} max={180} value={place.longitude??''} onChange={e=>update({longitude:Number.isFinite(e.target.valueAsNumber)?e.target.valueAsNumber:null})}/></label>
        </div>
      </details>
      <div className={styles.actions}><button onClick={remove}>删除地点归类</button></div>
    </>:<p className={styles.hint}>还没有地点归类。点击「新增地点」开始整理。</p>}
  </section>;
}

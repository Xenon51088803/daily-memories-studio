"use client";
import { useState } from 'react';
import type { SiteContent } from '@/lib/content-schema';
import { albumViews } from '@/lib/photo-albums.mjs';
import { resolvePhotoPlace } from '@/lib/photo-memories.mjs';
import { PhotoMoment } from './PhotoMoment';
import { PlaceMap } from './PlaceMap';
import styles from './Memories.module.scss';

export function TripReplay({content,initialAlbum=''}:{content:SiteContent;initialAlbum?:string}) {
  const albums=albumViews(content);
  const [selected,setSelected]=useState(initialAlbum);
  const album=albums.find(a=>a.id===selected)||albums.find(a=>a.start!==a.end)||albums[0];
  if(!album)return <p className={styles.empty}>这一年还没有相册。</p>;
  return <section aria-label="旅程回放">
    <div className={styles.sectionTop}><div><span className={styles.eyebrow}>沿着日子，重新走一遍</span><h2>那些在路上的时光。</h2></div><label className={styles.selectLabel}>选择旅程<select aria-label="选择旅程" value={album.id} onChange={e=>setSelected(e.target.value)}>{albums.map(a=><option key={a.id} value={a.id}>{a.title} · {a.start||'日期待补'}</option>)}</select></label></div>
    <TripDays key={album.id} content={content} album={album}/>
  </section>;
}
function TripDays({content,album}:{content:SiteContent;album:ReturnType<typeof albumViews>[number]}) {
  const days=[...new Set(album.photos.map(p=>p.date||album.date))];
  const [day,setDay]=useState(days[0]);
  const [photoId,setPhotoId]=useState('');
  const selectedDay=days.includes(day)?day:days[0];
  const index=days.indexOf(selectedDay);
  const photos=album.photos.filter(p=>(p.date||album.date)===selectedDay);
  const active=photos.find(p=>p.id===photoId)||photos[0];
  const place=resolvePhotoPlace(active,album,content.places);
  const choose=(value:string)=>{setDay(value);setPhotoId('');};
  return <>
    <header className={styles.tripTitle}><h3>{album.title}</h3><span>{album.start.replaceAll('-','.')} {album.end!==album.start&&`— ${album.end.replaceAll('-','.')}`} · {album.photos.length} 张照片</span>{album.note&&<p>{album.note}</p>}</header>
    <nav className={styles.route} aria-label="旅程日期">{days.map((date,i)=>{
      const first=album.photos.find(p=>(p.date||album.date)===date)!;
      const location=resolvePhotoPlace(first,album,content.places);
      return <button key={date} aria-label={`回到 ${date||'未标日期'}`} aria-pressed={date===selectedDay} onClick={()=>choose(date)}><span className={styles.routeDot}>{String(i+1).padStart(2,'0')}</span><span>{date?date.slice(5).replace('-','.'):'未标日期'}<small>{location.name}</small></span></button>;
    })}</nav>
    <div className={styles.tripStage} aria-live="polite">
      <div className={styles.tripSide}><span className={styles.eyebrow}>第 {index+1} 段记忆 / {days.length}</span><h3>{place.name}</h3><p>{selectedDay?selectedDay.replaceAll('-','.'):'日期待补'}{place.city&&` · ${place.city}`}</p><PlaceMap key={place.id} place={place}/><div className={styles.stepControls}><button disabled={index===0} onClick={()=>choose(days[index-1])}>← 前一天</button><button disabled={index===days.length-1} onClick={()=>choose(days[index+1])}>后一天 →</button></div><small>按拍摄日期回看</small></div>
      <PhotoMoment key={selectedDay} photos={photos} onPhotoChange={p=>setPhotoId(p.id)}/>
    </div>
  </>;
}

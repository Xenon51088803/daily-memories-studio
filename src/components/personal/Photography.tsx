"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Photograph, PhotoAlbum, PhotoPlace, SiteContent } from '@/lib/content-schema';
import { placeMemories, photoRecords, daysBetween, seasonalMemories } from '@/lib/photo-memories.mjs';
import { siteContent, assetPath } from './data';
import { AlbumGallery } from './AlbumGallery';
import { TripReplay } from './TripReplay';
import { PhotoMoment } from './PhotoMoment';
import { MemoryMap } from './MemoryMap';
import styles from './Memories.module.scss';

type Visit={date:string;endDate?:string;photos:Photograph[];albums:PhotoAlbum[]};
type PlaceGroup=PhotoPlace & {visits:Visit[];days:Visit[];photoCount:number;latest:string;cover:Photograph};
type View='places'|'revisit'|'trips'|'albums';
const labelDate=(date:string)=>date?date.replaceAll('-','.'):'未标日期';
const visitLabel=(visit:Visit)=>visit.endDate&&visit.endDate!==visit.date?`${labelDate(visit.date)} — ${labelDate(visit.endDate)}`:labelDate(visit.date);
export function Photography({content=siteContent,initialAlbum=''}:{content?:SiteContent;initialAlbum?:string}={}) {
  const [view,setView]=useState<View>(initialAlbum&&initialAlbum!=='all'?'trips':'places');
  const [year,setYear]=useState('全部');
  const [city,setCity]=useState('全部');
  const [placeId,setPlaceId]=useState('');
  const [memoryDate,setMemoryDate]=useState<string|null>(null);
  const [today,setToday]=useState('');
  const story=useRef<HTMLDivElement>(null);
  const records=useMemo(()=>photoRecords(content),[content]);
  const years=[...new Set(records.map(r=>r.date?r.date.slice(0,4):'未标日期'))].sort((a,b)=>a==='未标日期'?1:b==='未标日期'?-1:b.localeCompare(a));
  const places=useMemo(()=>placeMemories(content,year) as PlaceGroup[],[content,year]);
  const cities=[...new Set(places.map(p=>p.city||'其他地点'))].sort();
  const activeCity=cities.includes(city)?city:'全部';
  const visible=useMemo(()=>places.filter(p=>activeCity==='全部'||(p.city||'其他地点')===activeCity),[places,activeCity]);
  const selected=visible.find(p=>p.id===placeId)||visible[0];
  const repeat=places.filter(p=>p.visits.filter(v=>v.date).length>1);
  const seasonal=seasonalMemories(content,today);
  const scopedContent=useMemo(()=>({...content,photographs:records.filter(r=>year==='全部'||(r.date?r.date.slice(0,4):'未标日期')===year).map(r=>r.photo)}),[content,records,year]);
  useEffect(()=>{setToday(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));},[]);
  useEffect(()=>{
    if(initialAlbum)return;
    const sync=()=>{const hash=window.location.hash.slice(1);if(hash.startsWith('album-')||hash==='unfiled')setView('albums');};
    sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);
  },[initialAlbum]);
  const choosePlace=(id:string)=>{setPlaceId(id);setMemoryDate(null);if(window.innerWidth<=900)requestAnimationFrame(()=>story.current?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));};
  const openMemory=(id:string,date:string)=>{setYear('全部');setCity('全部');setView('places');setPlaceId(id);setMemoryDate(date);};
  if(!content.photographs.length)return <p className={styles.empty}>还没有公开的照片。等一个值得记下的片刻。</p>;
  return <section className={styles.memories} aria-label="回忆的坐标">
    <nav className={styles.modes} aria-label="照片浏览方式">{([['places','地点索引'],['revisit','故地重游'],['trips','旅程回放'],['albums','全部相册']] as [View,string][]).map(([key,title])=><button key={key} aria-pressed={view===key} onClick={()=>setView(key)}>{title}</button>)}</nav>
    {view!=='albums'&&<div className={styles.filters}><div className={styles.years} aria-label="筛选照片年份">{['全部',...years].map(y=><button key={y} aria-pressed={year===y} onClick={()=>{setYear(y);setCity('全部');setMemoryDate(null);}}>{y}</button>)}</div><span>{scopedContent.photographs.length} 张照片 · {places.filter(p=>p.id!=='unlocated').length} 个地点</span></div>}
    {view==='places'&&<>
      <div className={styles.sectionTop}><div><span className={styles.eyebrow}>回忆有它自己的坐标</span><h2>你想回到哪里？</h2></div>{cities.length>1&&<label className={styles.selectLabel}>所在城市<select aria-label="所在城市" value={cities.includes(city)?city:'全部'} onChange={e=>{setCity(e.target.value);setMemoryDate(null);}}><option value="全部">全部城市</option>{cities.map(c=><option key={c}>{c}</option>)}</select></label>}</div>
      {selected?<div className={styles.placeLayout}>
        <MemoryMap places={visible} selectedId={selected.id} onSelect={choosePlace}/>
        <div ref={story} className={styles.storyAnchor}><PlaceStory key={`${selected.id}:${year}:${memoryDate}`} place={selected} initialDate={memoryDate}/></div>
      </div>:<p className={styles.empty}>这个年份还没有留下照片。</p>}
    </>}
    {view==='revisit'&&<Revisit key={year} places={repeat}/>}
    {view==='trips'&&<TripReplay key={year} content={scopedContent} initialAlbum={initialAlbum==='all'?'':initialAlbum}/>}
    {view==='albums'&&<AlbumGallery content={content} initialAlbum={initialAlbum==='all'?'all':initialAlbum}/>}
    {view==='places'&&seasonal.records.length>0&&<aside className={styles.seasonal} aria-label="季节回望"><div><span className={styles.eyebrow}>偶尔，遇见旧时光</span><h3>{seasonal.label}</h3></div><div className={styles.seasonalList}>{seasonal.records.map(r=><button key={r.photo.id} onClick={()=>openMemory(r.place.id,r.date)}><img src={assetPath(r.photo.src)} alt="" loading="lazy"/><span>{r.place.name}<small>{labelDate(r.date)}</small></span><span aria-hidden="true">↗</span></button>)}</div></aside>}
  </section>;
}
function PlaceStory({place,initialDate}:{place:PlaceGroup;initialDate:string|null}) {
  const [date,setDate]=useState(initialDate);
  const visit=place.days.find(v=>v.date===date)||place.days.at(-1)!;
  return <section className={styles.placeStory} aria-label={`${place.name}的记忆`}>
    <header><span className={styles.eyebrow}>{place.city||'日常留存'}</span><h3>{place.name}</h3><p>{place.visits.filter(v=>v.date).length} 次到访 · {place.days.length} 个有照片的日子</p></header>
    <nav className={styles.dates} aria-label="选择记录日期">{place.days.map(v=><button key={v.date} aria-pressed={v.date===visit.date} onClick={()=>setDate(v.date)}>{labelDate(v.date)}<small>{v.photos.length} 张</small></button>)}</nav>
    <PhotoMoment key={visit.date} photos={visit.photos}/>
    {visit.albums.filter(a=>a.note).map(a=><details className={styles.note} key={a.id}><summary>{a.title} · 相册小记</summary><p>{a.note}</p></details>)}
  </section>;
}
function Revisit({places}:{places:PlaceGroup[]}) {
  const [selected,setSelected]=useState('');
  const place=places.find(p=>p.id===selected)||places[0];
  return <section aria-label="故地重游">
    <div className={styles.sectionTop}><div><span className={styles.eyebrow}>熟悉的地方，不同的日子</span><h2>又回到了这里。</h2></div>{place&&<label className={styles.selectLabel}>重访地点<select aria-label="重访地点" value={place.id} onChange={e=>setSelected(e.target.value)}>{places.map(p=><option key={p.id} value={p.id}>{p.name} · {p.visits.filter(v=>v.date).length} 次到访</option>)}</select></label>}</div>
    <p className={styles.visitHint}>相邻拍摄日间隔不超过 3 天，合为同一次到访；每一天的照片仍可在地点索引中查看。</p>
    {place?<VisitPair key={place.id} place={place}/>:<p className={styles.empty}>这里还没有分别到访的记录。连续几天的照片会归为同一次到访，隔些日子再回来，就能在这里重逢。</p>}
  </section>;
}
function VisitPair({place}:{place:PlaceGroup}) {
  const visits=place.visits.filter(v=>v.date);
  const [leftDate,setLeftDate]=useState(visits[0].date);
  const [rightDate,setRightDate]=useState(visits.at(-1)!.date);
  const left=visits.find(v=>v.date===leftDate)||visits[0];
  const right=visits.find(v=>v.date===rightDate)||visits.at(-1)!;
  return <>
    <div className={styles.pairHeading}><h3>{place.name}</h3><span>两次到访，相隔 {daysBetween(left.endDate||left.date,right.date)} 天</span></div>
    <div className={styles.pair}>
      {([{key:'left',label:'那一次',value:left,set:setLeftDate,other:right},{key:'right',label:'再一次',value:right,set:setRightDate,other:left}] as const).map(side=><section key={side.key} aria-label={side.label}><div className={styles.pairDate}><span>{side.label}</span><label><span className={styles.srOnly}>{side.label}的日期</span><select aria-label={`${side.label}的日期`} value={side.value.date} onChange={e=>side.set(e.target.value)}>{visits.map(v=><option key={v.date} value={v.date} disabled={side.key==='left'?v.date>=right.date:v.date<=left.date}>{visitLabel(v)}</option>)}</select></label></div><PhotoMoment key={side.value.date} photos={side.value.photos} compact/>{side.value.albums.filter(a=>a.note).map(a=><details className={styles.note} key={a.id}><summary>{a.title} · 小记</summary><p>{a.note}</p></details>)}</section>)}
    </div>
    <p className={styles.closing}>照片替我们记得，上一次来到这里的样子。</p>
  </>;
}

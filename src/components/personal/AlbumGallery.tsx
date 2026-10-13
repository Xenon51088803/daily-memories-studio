"use client";
import { useEffect, useRef, useState } from 'react';
import { siteContent, assetPath } from './data';
import { albumViews } from '@/lib/photo-albums.mjs';
import type { Photograph, SiteContent } from '@/lib/content-schema';
import styles from './Albums.module.scss';
const dateLabel = (date: string) => date.replaceAll('-', '.');
export function AlbumGallery({content=siteContent,initialAlbum=''}:{content?:SiteContent;initialAlbum?:string}={}) {
  const albums = albumViews(content);
  const years = [...new Set(albums.map(a => a.year))];
  const [year,setYear] = useState('全部');
  const [selected,setSelected] = useState(initialAlbum);
  const [active,setActive] = useState<Photograph|null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement|null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const album = albums.find(a => a.id === selected);
  useEffect(() => {
    if(initialAlbum) {setSelected(initialAlbum);return;}
    const sync = () => {setSelected(window.location.hash.slice(1));setActive(null);dialog.current?.close();};
    sync(); window.addEventListener('hashchange',sync);
    return () => window.removeEventListener('hashchange',sync);
  },[initialAlbum]);
  useEffect(() => {if(selected) heading.current?.focus();},[selected]);
  useEffect(() => {
    if(!active) return;
    dialog.current?.showModal();
    const overflow=document.body.style.overflow; document.body.style.overflow='hidden';
    return () => {document.body.style.overflow=overflow;};
  },[active]);
  const navigate=(id:string)=>{if(initialAlbum)setSelected(id);else window.location.hash=id;};
  const move=(step:number)=>{
    if(!album||!active) return;
    const index=album.photos.findIndex(p=>p.id===active.id);
    setActive(album.photos[(index+step+album.photos.length)%album.photos.length]);
  };
  if(!albums.length) return <p className={styles.empty}>还没有公开的相册。等一个值得记下的片刻。</p>;
  const days=album?[...new Set(album.photos.map(p=>p.date||album.date))]:[];
  return <section className={styles.gallery} aria-label="生活相册">
    {album ? <>
      <button className={styles.back} onClick={()=>navigate('')}>← 回到所有相册</button>
      <header className={styles.albumHeader}>
        <p className={styles.meta}>{dateLabel(album.start)}{album.end!==album.start&&` — ${dateLabel(album.end)}`} · {album.photos.length} 张照片</p>
        <h2 ref={heading} tabIndex={-1}>{album.title}</h2>
        {album.location&&<p className={styles.location}>{album.location}</p>}
        {album.note&&<p className={styles.note}>{album.note}</p>}
      </header>
      {days.map(day=><section key={day} className={styles.day} aria-label={day||'未标日期'}>
        <h3>{day?dateLabel(day):'某一个值得记住的日子'}</h3>
        <div className={styles.photoGrid}>{album.photos.filter(p=>(p.date||album.date)===day).map((photo,index)=><figure key={photo.id} className={index===0&&photo.orientation==='horizontal'?styles.wide:''}>
          <button className={styles.photoButton} aria-label={`放大照片：${photo.title}`} onClick={e=>{trigger.current=e.currentTarget;setActive(photo);}}>
            <img src={assetPath(photo.src)} alt={photo.title} loading="lazy"/><span aria-hidden="true">↗</span>
          </button>
          <figcaption><span>{photo.title}</span>{photo.location&&<small>{photo.location}</small>}{photo.subtitle&&<p>{photo.subtitle}</p>}</figcaption>
        </figure>)}</div>
      </section>)}
      <p className={styles.end}>这些片刻，就留在这里。</p>
    </> : <>
      <nav className={styles.years} aria-label="按年份浏览相册">
        {['全部',...years].map(y=><button key={y} aria-pressed={year===y} onClick={()=>setYear(y)}>{y}</button>)}
        <span>{albums.length} 本相册 · {content.photographs.length} 张照片</span>
      </nav>
      {years.filter(y=>year==='全部'||year===y).map(y=><section key={y} className={styles.yearSection}>
        <h2>{y}<small>留在这一年的片刻</small></h2>
        <div className={styles.albumGrid}>{albums.filter(a=>a.year===y).map(a=><button key={a.id} className={styles.card} onClick={()=>navigate(a.id)} aria-label={`打开相册：${a.title}`}>
          <div className={styles.cover}><img src={assetPath(a.cover.src)} alt={a.cover.title} loading="lazy"/><span>{a.photos.length} 张</span></div>
          <div className={styles.cardText}><p className={styles.meta}>{a.start?dateLabel(a.start):'日期待补'}{a.start!==a.end&&` — ${dateLabel(a.end)}`}</p><h3>{a.title}<span aria-hidden="true">↗</span></h3><p>{a.location||'日常留存'}</p>{a.note&&<p className={styles.excerpt}>{a.note}</p>}</div>
        </button>)}</div>
      </section>)}
    </>}
    <dialog ref={dialog} className={styles.lightbox} aria-label="照片放大浏览" onClose={()=>{setActive(null);trigger.current?.focus();}} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}}}>
      <div className={styles.lightboxTop}><span>{active?.title}</span><button autoFocus onClick={()=>dialog.current?.close()}>关闭 ×</button></div>
      {active&&<img src={assetPath(active.src)} alt={active.title}/>}
      <div className={styles.lightboxTop}><button onClick={()=>move(-1)} aria-label="上一张照片">← 上一张</button><span>{album&&active?`${album.photos.findIndex(p=>p.id===active.id)+1} / ${album.photos.length}`:''}</span><button onClick={()=>move(1)} aria-label="下一张照片">下一张 →</button></div>
    </dialog>
  </section>;
}


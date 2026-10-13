"use client";
import { useEffect, useRef, useState } from 'react';
import type { Photograph } from '@/lib/content-schema';
import { assetPath } from './data';
import styles from './Memories.module.scss';

export function PhotoMoment({photos,compact=false,onPhotoChange}:{photos:Photograph[];compact?:boolean;onPhotoChange?:(photo:Photograph)=>void}) {
  const [index,setIndex]=useState(0);
  const [open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const safeIndex=Math.min(index,Math.max(0,photos.length-1));
  const photo=photos[safeIndex];
  const choose=(next:number)=>{setIndex(next);onPhotoChange?.(photos[next]);};
  const move=(step:number)=>choose((safeIndex+step+photos.length)%photos.length);
  useEffect(()=>{
    if(!open)return;
    dialog.current?.showModal();
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=overflow;};
  },[open]);
  if(!photo)return null;
  return <div className={`${styles.moment} ${compact?styles.compact:''}`}>
    <figure>
      <button ref={trigger} className={styles.photo} aria-label={`放大照片：${photo.title}`} onClick={()=>setOpen(true)}><img src={assetPath(photo.src)} alt={photo.title} loading="lazy"/><span aria-hidden="true">↗</span></button>
      <figcaption><span>{photo.title}</span><small>{safeIndex+1} / {photos.length}</small>{photo.subtitle&&<p>{photo.subtitle}</p>}</figcaption>
    </figure>
    {photos.length>1&&<div className={styles.thumbnails} aria-label="选择照片">{photos.map((p,i)=><button key={p.id} aria-label={`第 ${i+1} 张：${p.title}`} aria-pressed={i===safeIndex} onClick={()=>choose(i)}><img src={assetPath(p.src)} alt="" loading="lazy"/></button>)}</div>}
    <dialog ref={dialog} className={styles.lightbox} aria-label="照片放大浏览" onClose={()=>{setOpen(false);trigger.current?.focus();}} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}}}>
      <div className={styles.lightboxControls}><span>{photo.title}</span><button autoFocus onClick={()=>dialog.current?.close()}>关闭 ×</button></div>
      {open&&<img src={assetPath(photo.src)} alt={photo.title}/>}
      <div className={styles.lightboxControls}><button onClick={()=>move(-1)} disabled={photos.length<2} aria-label="上一张照片">← 上一张</button><span>{safeIndex+1} / {photos.length}</span><button onClick={()=>move(1)} disabled={photos.length<2} aria-label="下一张照片">下一张 →</button></div>
    </dialog>
  </div>;
}

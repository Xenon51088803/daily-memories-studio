"use client";
import { useState } from 'react';
import { placeMapUrl } from '@/lib/photo-memories.mjs';
import styles from './Memories.module.scss';

export function PlaceMap({place}:{place:{id:string;name:string;latitude:number|null;longitude:number|null}}) {
  const [shown,setShown]=useState(false);
  const url=placeMapUrl(place);
  if(!url)return null;
  return <div className={styles.map}>
    <button className={styles.quietButton} onClick={()=>setShown(!shown)} aria-expanded={shown}>{shown?'收起地图':'在地图上看这个地方'} ↗</button>
    {shown&&<><iframe title={`${place.name}地图`} src={url} loading="lazy" referrerPolicy="no-referrer"/><p>地点位置 · 非拍摄轨迹 <a href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=14/${place.latitude}/${place.longitude}`} target="_blank" rel="noreferrer">在 OpenStreetMap 打开 ↗</a></p></>}
  </div>;
}

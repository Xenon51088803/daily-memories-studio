"use client";
import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker, MarkerClusterGroup } from 'leaflet';
import type { PhotoPlace } from '@/lib/content-schema';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import styles from './MemoryMap.module.scss';

type Place = PhotoPlace & {photoCount:number;visits:{date:string}[]};
const located = (p:PhotoPlace) => typeof p.latitude==='number' && typeof p.longitude==='number' && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude)<=90 && Math.abs(p.longitude)<=180;

/** Leaflet is loaded only in the browser; the exported Pages site needs no server. */
export function MemoryMap({places,selectedId,onSelect}:{places:Place[];selectedId:string;onSelect:(id:string)=>void}) {
  const container=useRef<HTMLDivElement>(null);
  const map=useRef<LeafletMap|null>(null);
  const markers=useRef(new Map<string,Marker>());
  const layer=useRef<MarkerClusterGroup|null>(null);
  const choose=useRef(onSelect); choose.current=onSelect;
  const selection=useRef(selectedId);selection.current=selectedId;
  const pendingFocus=useRef<string|null>(null);
  const focusPlace=(id:string)=>{
    pendingFocus.current=id;
    const marker=markers.current.get(id);
    if(marker&&map.current&&layer.current) {
      layer.current.zoomToShowLayer(marker,()=>{if(map.current&&layer.current?.hasLayer(marker))marker.openTooltip();});
      pendingFocus.current=null;
    }
  };
  const selectPlace=(id:string)=>{choose.current(id);focusPlace(id);};
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const [tilesFailed,setTilesFailed]=useState(false);
  useEffect(()=>{
    let disposed=false;
    import('leaflet').then(async module=>{
      const L=module.default;
      await import('leaflet.markercluster');
      if(disposed||!container.current)return;
      const instance=L.map(container.current,{scrollWheelZoom:false,attributionControl:true,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}).setView([31,110],5);
      instance.zoomControl.setPosition('topleft');
      const zoomIn=container.current.querySelector('.leaflet-control-zoom-in');zoomIn?.setAttribute('aria-label','放大地图');zoomIn?.setAttribute('title','放大地图');
      const zoomOut=container.current.querySelector('.leaflet-control-zoom-out');zoomOut?.setAttribute('aria-label','缩小地图');zoomOut?.setAttribute('title','缩小地图');
      map.current=instance;
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{
        maxZoom:19,attribution:'Tiles &copy; <a href="https://www.arcgis.com/home/item.html?id=3b93337983e9436f8db950e38a8629af" target="_blank" rel="noopener noreferrer">Esri</a> — Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community',
      }).on('tileerror',()=>setTilesFailed(true)).addTo(instance);
      layer.current=L.markerClusterGroup({maxClusterRadius:42,showCoverageOnHover:false,animate:false,
        iconCreateFunction:cluster=>L.divIcon({className:styles.cluster,html:`<span aria-label="展开 ${cluster.getChildCount()} 个地点">${cluster.getChildCount()}</span>`,iconSize:[42,42]}),
      }).addTo(instance);
      let previousWidth=container.current.clientWidth;
      const observer=new ResizeObserver(()=>{
        if(disposed||!container.current)return;
        instance.invalidateSize();
        const width=container.current.clientWidth;
        if(width!==previousWidth&&markers.current.size)instance.fitBounds(L.latLngBounds(Array.from(markers.current.values()).map(m=>m.getLatLng())),{padding:[48,48],maxZoom:12,animate:false});
        previousWidth=width;
      });observer.observe(container.current);
      instance.once('unload',()=>observer.disconnect());
      setReady(true);
    }).catch(()=>{if(!disposed)setError('地图暂时未能加载，可以从下方选择地点。');});
    return()=>{disposed=true;map.current?.stop();map.current?.remove();map.current=null;layer.current=null;markers.current.clear();};
  },[]);
  useEffect(()=>{
    if(!ready)return;
    let disposed=false;
    import('leaflet').then(L=>{
      if(disposed||!map.current||!layer.current)return;
      layer.current.clearLayers();markers.current.clear();
      const points: [number,number][]=[];
      for(const place of places.filter(located)) {
        const point:[number,number]=[place.latitude!,place.longitude!];points.push(point);
        const icon=L.divIcon({className:styles.pin,html:'<span aria-hidden="true"></span>',iconSize:[30,38],iconAnchor:[15,36],tooltipAnchor:[0,-32]});
        const marker=L.marker(point,{icon,keyboard:true,title:place.name,alt:`地图地点：${place.name}`,riseOnHover:true});
        marker.on('add',()=>{
          marker.getElement()?.setAttribute('aria-label',`地图地点：${place.name}`);
          marker.getElement()?.setAttribute('aria-pressed',String(place.id===selection.current));
        }).addTo(layer.current);
        const tooltip=document.createElement('span');tooltip.textContent=`${place.name} · ${place.photoCount} 张照片`;
        marker.bindTooltip(tooltip,{direction:'top'}).on('click',()=>choose.current(place.id));
        const element=marker.getElement();
        element?.setAttribute('aria-label',`地图地点：${place.name}`);
        markers.current.set(place.id,marker);
      }
      if(points.length)map.current.fitBounds(L.latLngBounds(points),{padding:[48,48],maxZoom:12,animate:false});
      else map.current.setView([31,110],5);
      // Reapply selection after rebuilding markers (e.g. year or city filter).
      for(const [id,marker] of markers.current)marker.getElement()?.setAttribute('aria-pressed',String(id===selection.current));
      if(pendingFocus.current)focusPlace(pendingFocus.current);
    });
    return()=>{disposed=true;};
    // Selection has its own effect, so choosing a pin does not reset the viewport.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[places,ready]);
  useEffect(()=>{
    for(const [id,marker] of markers.current) {
      marker.getElement()?.setAttribute('aria-pressed',String(id===selectedId));
      marker.setZIndexOffset(id===selectedId?1000:0);
      if(id===selectedId)layer.current?.zoomToShowLayer(marker,()=>{if(map.current&&layer.current?.hasLayer(marker))marker.openTooltip();});
    }
  },[selectedId]);
  const reset=()=>{
    const points=Array.from(markers.current.values()).map(marker=>[marker.getLatLng().lat,marker.getLatLng().lng] as [number,number]);
    if(points.length)map.current?.fitBounds(points,{padding:[48,48],maxZoom:12});
  };
  const missing=places.filter(p=>!located(p));
  return <section className={styles.shell} aria-label="足迹地图">
    <div className={styles.toolbar}><span>在地图上，重逢一段回忆</span><button type="button" onClick={reset} disabled={!ready||places.every(p=>!located(p))}>查看全部地点</button></div>
    <div ref={container} className={styles.canvas} aria-label="可缩放的地点地图"/>
    {!ready&&<p role="status">{error||'正在展开地图…'}</p>}
    {tilesFailed&&<p role="status">部分底图未能加载。地点标记和下方地点选择仍可使用。</p>}
    <p className={styles.hint}>点击标记查看照片，点击数字展开附近地点 · ＋ / − 缩放，拖动地图探索 · 标记为景点位置，并非每张照片的拍摄点</p>
    <nav className={styles.places} aria-label="选择地点">{places.map(p=><button key={p.id} type="button" aria-label={`回到${p.name}`} aria-pressed={selectedId===p.id} onClick={()=>selectPlace(p.id)}>{p.name}<small>{p.photoCount} 张{!located(p)?' · 待定位':''}</small></button>)}</nav>
    {missing.length>0&&<p className={styles.hint}>待定位的地点仍可点击查看照片，补充位置后会出现在地图上。</p>}
  </section>;
}

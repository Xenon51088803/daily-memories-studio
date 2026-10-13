"use client";
import { useState, type InputHTMLAttributes } from 'react';
import type { SiteContent, PhotoAlbum, Photograph } from '@/lib/content-schema';
import { photoImportMeta } from '@/lib/photo-albums.mjs';
import { Photography } from './Photography';
import { PlacesEditor } from './PlacesEditor';
import styles from './AlbumStudio.module.scss';

type Props = { content: SiteContent; onEdit: (change: (draft: SiteContent) => void) => void; onBusyChange: (busy: boolean) => void };
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const newAlbum = (): PhotoAlbum => ({id:id('album'),title:'新相册',date:'',location:'',note:'',coverId:'',private:true});
function Field({label,value,onChange,type='text',multiline=false}:{label:string;value:string;onChange:(value:string)=>void;type?:string;multiline?:boolean}) {
  return <label className={styles.field}><span>{label}</span>{multiline ? <textarea rows={4} value={value} onChange={e=>onChange(e.target.value)}/> : <input type={type} value={value} onChange={e=>onChange(e.target.value)}/>}</label>;
}
export function AlbumStudio({content,onEdit,onBusyChange}:Props) {
  const [albumId,setAlbumId] = useState('');
  const [photoId,setPhotoId] = useState('');
  const [status,setStatus] = useState('');
  const [error,setError] = useState('');
  const [preview,setPreview] = useState(false);
  const [overview,setOverview] = useState(false);
  const [managePlaces,setManagePlaces] = useState(false);
  const [undo,setUndo] = useState<SiteContent|null>(null);
  const albums = content.albums ?? [];
  const album = albums.find(a=>a.id===albumId);
  const photos = content.photographs.filter(p=>(p.albumId||'')===albumId);
  const photo = photos.find(p=>p.id===photoId) || photos[0];
  const editAlbum = (change: Partial<PhotoAlbum>) => onEdit(c=>{Object.assign(c.albums!.find(a=>a.id===albumId)!,change);});
  const editPhoto = (change: Partial<Photograph>) => onEdit(c=>{
    const target=c.photographs.find(p=>p.id===photo?.id)!;
    if(change.albumId!==undefined&&change.albumId!==target.albumId) {
      for(const a of c.albums??[]) if(a.coverId===target.id) a.coverId='';
      // Moving out of a private album must not make a photo public by accident.
      if(c.albums?.find(a=>a.id===target.albumId)?.private) change.private=true;
    }
    Object.assign(target,change);
  });
  const chooseAlbum = (value:string) => {setAlbumId(value);setPhotoId('');setPreview(false);};
  const createAlbum = () => {const a=newAlbum();onEdit(c=>{(c.albums??=[]).push(a);});chooseAlbum(a.id);};
  const addPhoto = () => {
    const p:Photograph={id:id('photo'),src:'',title:'未命名照片',subtitle:'',orientation:'horizontal',private:false,albumId,date:album?.date||'',location:album?.location||''};
    onEdit(c=>{c.photographs.push(p);});setPhotoId(p.id);
  };
  const upload = async (file:File) => {
    if(!file.size || file.size>20_000_000) throw new Error('图片必须在 20 MB 以内');
    const data=new FormData();data.set('file',file);
    const response=await fetch('/api/studio/upload',{method:'POST',headers:{'X-Homepage-Editor':'1'},body:data});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error||'上传失败');
    return result as {src:string;orientation:'horizontal'|'vertical'};
  };
  const importPhotos = async (files:File[],folders:boolean) => {
    const supported=files.filter(f=>/\.(jpe?g|png|webp)$/i.test(f.name));
    if(!supported.length) {setError('没有找到 JPEG、PNG 或 WebP 图片。');return;}
    if(content.photographs.length+supported.length>300) {setError('照片总数最多 300 张，请分批整理后再导入。');return;}
    onBusyChange(true);setError('');setPreview(false);
    const next=structuredClone(content);next.albums??=[];
    let imported=0,duplicates=0;const failures:string[]=[];
    let destination=albumId;
    try {
      for(const [index,file] of supported.entries()) {
        setStatus(`正在导入 ${index+1} / ${supported.length}：${file.name}`);
        try {
          if(file.size>20_000_000) throw new Error('超过 20 MB');
          const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');
          if(next.photographs.some(p=>p.importKey===hash)){duplicates++;continue;}
          const meta=photoImportMeta(folders?file.webkitRelativePath:file.name);
          const result=await upload(file);
          let target=next.albums.find(a=>a.id===destination);
          if(folders) target=next.albums.find(a=>a.date===meta.date&&a.location===meta.location&&a.title===meta.title);
          if(!target) {target={...newAlbum(),...meta};next.albums.push(target);}
          const p:Photograph={id:id('photo'),...result,title:meta.location||file.name.replace(/\.[^.]+$/,''),subtitle:'',private:false,albumId:target.id,date:meta.date||target.date,location:meta.location||target.location,importKey:hash};
          next.photographs.push(p);if(!target.coverId)target.coverId=p.id;
          if(!folders) destination=target.id;
          imported++;
        } catch(e) {failures.push(`${file.name}：${e instanceof Error?e.message:'读取失败'}`);}
      }
      if(imported) {onEdit(c=>{c.albums=next.albums;c.photographs=next.photographs;});if(!folders)chooseAlbum(destination);}
      setStatus(`已导入 ${imported} 张，跳过 ${duplicates} 张重复照片、${files.length-supported.length} 个非图片文件。新建相册默认私密；请检查并点击上方「保存到网页」。`);
      if(failures.length)setError(`以下 ${failures.length} 张未导入，已完成的照片仍保留，可重试失败文件：\n${failures.join('\n')}`);
    } finally {onBusyChange(false);}
  };
  const removePhoto = () => {if(!photo)return;setUndo(structuredClone(content));onEdit(c=>{c.photographs=c.photographs.filter(p=>p.id!==photo.id);for(const a of c.albums??[])if(a.coverId===photo.id)a.coverId='';});setPhotoId('');};
  const removeAlbum = () => {
    if(!album||!window.confirm('删除相册分组？照片会保留在「零散照片」中，原私密相册里的照片仍保持私密。'))return;
    setUndo(structuredClone(content));onEdit(c=>{for(const p of c.photographs)if(p.albumId===album.id){p.albumId='';if(album.private)p.private=true;}c.albums=c.albums?.filter(a=>a.id!==album.id);});chooseAlbum('');
  };
  const movePhoto = (step:number) => {if(!photo)return;const index=photos.findIndex(p=>p.id===photo.id);const other=photos[index+step];if(!other)return;onEdit(c=>{const a=c.photographs.findIndex(p=>p.id===photo.id),b=c.photographs.findIndex(p=>p.id===other.id);[c.photographs[a],c.photographs[b]]=[c.photographs[b],c.photographs[a]];});};
  return <div className={styles.studio}>
    <div className={styles.imports}>
      <div><h2>给回忆，一个可以回去的地方</h2><p>按地点寻找，重访熟悉的日子，也沿着旅程慢慢回看。新相册默认私密。</p></div>
      <div className={styles.actions}><button onClick={createAlbum}>＋ 新增相册</button><button onClick={()=>setOverview(!overview)}>{overview?'收起全部预览':'预览全部相册'}</button>
        <button onClick={()=>setManagePlaces(!managePlaces)} aria-expanded={managePlaces}>{managePlaces?'收起地点管理':'管理地点'}</button>
        <label>导入分类文件夹<input aria-label="导入分类文件夹" type="file" multiple accept="image/jpeg,image/png,image/webp" {...({webkitdirectory:''} as InputHTMLAttributes<HTMLInputElement>)} onChange={e=>{const files=Array.from(e.currentTarget.files||[]);e.currentTarget.value='';if(files.length)void importPhotos(files,true);}}/></label>
      </div>
      <p className={styles.hint}>文件夹可按「2026 / 2026.8.23-大理洱海」命名，自动识别日期和地点。同一图片重复导入会跳过。</p>
    </div>
    {status&&<p role="status" className={styles.message}>{status}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}
    {managePlaces&&<PlacesEditor content={content} onEdit={onEdit}/>}
    {overview&&<section className={styles.box} aria-label="全部相册本机预览"><p className={styles.hint}>本机预览包含私密相册及照片，仅供你整理；发布时会自动排除私密内容。</p><Photography content={content} initialAlbum="all"/></section>}
    {undo&&<button onClick={()=>{onEdit(c=>{c.albums=undo.albums;c.photographs=undo.photographs;});setUndo(null);}}>撤销最近一次删除（恢复删除时的照片状态）</button>}
    <div className={styles.layout}>
      <aside className={styles.sidebar} aria-label="相册列表">
        <button aria-pressed={!albumId} onClick={()=>chooseAlbum('')}>零散照片 <small>{content.photographs.filter(p=>!p.albumId).length} 张</small></button>
        {[...albums].sort((a,b)=>b.date.localeCompare(a.date)).map(a=><button key={a.id} aria-pressed={a.id===albumId} onClick={()=>chooseAlbum(a.id)}><span>{a.private?'🔒 ':''}{a.title}</span><small>{a.date||'日期待补'} · {content.photographs.filter(p=>p.albumId===a.id).length} 张</small></button>)}
      </aside>
      <div className={styles.main}>
        {album ? <section className={styles.box}>
          <div className={styles.actions}><h3>编辑相册</h3><button onClick={()=>setPreview(!preview)} disabled={!photos.length}>{preview?'收起预览':'预览此相册'}</button><button onClick={removeAlbum}>删除相册分组</button></div>
          <div className={styles.fields}><Field label="相册标题" value={album.title} onChange={title=>editAlbum({title})}/><Field label="相册地点" value={album.location} onChange={location=>editAlbum({location})}/><Field label="相册起始日期" type="date" value={album.date} onChange={date=>editAlbum({date})}/>
            <label className={styles.field}>相册封面<select aria-label="相册封面" value={album.coverId} onChange={e=>editAlbum({coverId:e.target.value})}><option value="">自动选择第一张可见照片</option>{photos.map(p=><option key={p.id} value={p.id}>{p.private?'（私密）':''}{p.title}</option>)}</select></label></div>
          <Field label="相册小记（可选）" value={album.note} multiline onChange={note=>editAlbum({note})}/>
          <label className={styles.toggle}><input type="checkbox" checked={album.private} onChange={e=>editAlbum({private:e.target.checked})}/>整本相册私密</label>
          <p className={styles.hint}>私密相册及其中的照片不会发布；公开相册中，单张私密照片仍会隐藏。保存后需重新发布，公网才会更新。</p>
        </section> : <p className={styles.hint}>原有照片保留在这里。可以逐张选择所属相册，或新建一个相册后批量上传。</p>}
        {preview&&album&&<section className={styles.box} aria-label="本机相册预览"><p className={styles.hint}>本机预览包含私密照片，仅供你整理。</p><Photography content={content} initialAlbum={album.id}/></section>}
        <section className={styles.box}>
          <div className={styles.actions}><h3>{album?.title||'零散照片'} · {photos.length} 张</h3><button onClick={addPhoto}>＋ 新增照片</button><label>批量上传照片<input type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="批量上传照片" onChange={e=>{const files=Array.from(e.currentTarget.files||[]);e.currentTarget.value='';if(files.length)void importPhotos(files,false);}}/></label></div>
          <div className={styles.thumbs}>{photos.map(p=><button key={p.id} aria-pressed={photo?.id===p.id} onClick={()=>setPhotoId(p.id)} aria-label={`${p.private?'🔒 私密 · ':''}${p.title}`}>{p.src&&<img src={p.src} alt="" loading="lazy"/>}<span>{p.private?'🔒 ':''}{p.title}</span></button>)}</div>
          {!photos.length&&<p className={styles.hint}>相册还没有照片，可以一次上传多张。</p>}
        </section>
        {photo&&<section className={styles.box} aria-label="编辑照片">
          <div className={styles.actions}><h3>编辑照片</h3><button onClick={removePhoto}>删除照片</button></div>
          {photo.src&&<img className={styles.previewImage} src={photo.src} alt="照片预览"/>}
          <label className={styles.file}>上传照片<input aria-label="上传照片" type="file" accept="image/jpeg,image/png,image/webp" onChange={async e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(!file)return;onBusyChange(true);setError('');try{const result=await upload(file);editPhoto({...result,importKey:''});}catch(e){setError(e instanceof Error?e.message:'上传失败');}finally{onBusyChange(false);}}}/></label>
          <Field label="照片路径" value={photo.src} onChange={src=>editPhoto({src,importKey:''})}/>
          <label className={styles.toggle}><input type="checkbox" checked={photo.private===true} onChange={e=>editPhoto({private:e.target.checked})}/>私密照片（仅自己可见）</label>
          {album?.private&&<p className={styles.hint}>所属相册为私密，这张照片当前不会公开。</p>}
          <div className={styles.fields}><Field label="照片标题" value={photo.title} onChange={title=>editPhoto({title})}/><Field label="拍摄日期" type="date" value={photo.date||''} onChange={date=>editPhoto({date})}/><Field label="拍摄地点" value={photo.location||''} onChange={location=>editPhoto({location,placeId:''})}/>
            <label className={styles.field}>地点归类<select aria-label="地点归类" value={photo.placeId||''} onChange={e=>editPhoto({placeId:e.target.value})}><option value="">按拍摄地点文字自动归类</option>{(content.places??[]).map(p=><option key={p.id} value={p.id}>{p.city?`${p.city} · `:''}{p.name}</option>)}</select></label>
            <label className={styles.field}>所属相册<select aria-label="所属相册" value={photo.albumId||''} onChange={e=>editPhoto({albumId:e.target.value})}><option value="">零散照片</option>{albums.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></label>
            <label className={styles.field}>画面方向<select aria-label="画面方向" value={photo.orientation} onChange={e=>editPhoto({orientation:e.target.value as Photograph['orientation']})}><option value="horizontal">横幅</option><option value="vertical">竖幅</option></select></label></div>
          <Field label="照片说明" value={photo.subtitle} multiline onChange={subtitle=>editPhoto({subtitle})}/>
          <div className={styles.actions}><button disabled={photos[0]?.id===photo.id} onClick={()=>movePhoto(-1)}>向前一张 ↑</button><button disabled={photos.at(-1)?.id===photo.id} onClick={()=>movePhoto(1)}>向后一张 ↓</button></div>
          <p className={styles.hint}>相册按拍摄日期排列，同一天内按这里的顺序显示。私密照片文件不会发布；以前公开过的副本可能仍存在于缓存或仓库历史中。</p>
        </section>}
      </div>
    </div>
  </div>;
}

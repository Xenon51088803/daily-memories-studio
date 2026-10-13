/** @param {import('./content-schema').SiteContent} content */
export function albumViews(content) {
  const albums = [...(content.albums ?? [])];
  if (content.photographs.some(p => !p.albumId)) albums.push({id:'unfiled',title:'零散的片刻',date:'',location:'',note:'一些尚未归入相册的照片。',coverId:'',private:false});
  return albums.map(album => {
    const photos = content.photographs.filter(p => (p.albumId || 'unfiled') === album.id)
      .sort((a,b) => (a.date || album.date).localeCompare(b.date || album.date));
    const dates = photos.map(p => p.date || album.date).filter(Boolean).sort();
    const start = dates[0] || album.date;
    const end = dates.at(-1) || start;
    return {...album,photos,start,end,year:start ? start.slice(0,4) : '未标日期',cover:photos.find(p => p.id === album.coverId) || photos[0]};
  }).filter(a => a.photos.length).sort((a,b) => b.start.localeCompare(a.start));
}

export function photoImportMeta(relativePath) {
  const parts = relativePath.replaceAll('\\','/').split('/');
  const folder = parts.slice(0,-1).reverse().find(p => /^\d{4}[.-]\d{1,2}[.-]\d{1,2}[-_]/.test(p));
  const match = folder?.match(/^(\d{4})[.-](\d{1,2})[.-](\d{1,2})[-_](.+)$/);
  if (!match) return {date:'',location:'',title:'新相册'};
  const date = `${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
  if (!Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error(`文件夹日期无效：${folder}`);
  return {date,location:match[4],title:match[4]};
}

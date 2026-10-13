const normal = value => (value || '').trim().normalize('NFKC').replace(/\s+/g, '').toLowerCase();

/** Resolve explicit assignment first; aliases are exact normalized matches only. */
export function resolvePhotoPlace(photo, album, places = []) {
  const location = (photo.location || album?.location || '').trim();
  const explicit = places.find(p => p.id === photo.placeId);
  if (explicit) return explicit;
  const matches = places.filter(p => location && [p.name, `${p.city}${p.name}`, ...(p.aliases || [])].some(alias => normal(alias) === normal(location)));
  const place = matches.length === 1 ? matches[0] : undefined;
  return place || { id: location ? `location:${normal(location)}` : 'unlocated', name: location || '未标地点', city:'', aliases:[], latitude:null, longitude:null };
}

/** @param {import('./content-schema').SiteContent} content */
export function photoRecords(content) {
  return content.photographs.map(photo => {
    const album = content.albums?.find(a => a.id === photo.albumId);
    return {photo, album, date:photo.date || album?.date || '', place:resolvePhotoPlace(photo, album, content.places)};
  });
}

/** @param {import('./content-schema').SiteContent} content */
export function placeMemories(content, year = '全部') {
  // Group before filtering years, so a trip across New Year's Day stays one visit.
  const records = photoRecords(content);
  const groups = new Map();
  for (const record of records) {
    if (!groups.has(record.place.id)) groups.set(record.place.id, {...record.place, records:[]});
    groups.get(record.place.id).records.push(record);
  }
  return [...groups.values()].map(place => {
    const dates = [...new Set(place.records.map(r => r.date))].sort();
    const days = dates.map(date => {
      const entries = place.records.filter(r => r.date === date);
      return {date, photos:entries.map(r => r.photo), albums:[...new Map(entries.filter(r => r.album).map(r => [r.album.id, r.album])).values()]};
    });
    // Up to two days without a photo can occur within a continuous stay.
    // An album alone is not a visit: an annual album can contain multiple trips.
    const sessions = [];
    for (const day of days) {
      const previous = sessions.at(-1);
      if (day.date && previous?.endDate && daysBetween(previous.endDate, day.date) <= 3) {
        previous.days.push(day); previous.endDate = day.date;
      } else sessions.push({date:day.date,endDate:day.date,days:[day]});
    }
    const included = day => year === '全部' || (day.date ? day.date.slice(0,4) : '未标日期') === year;
    const visibleDays = days.filter(included);
    const visits = sessions.map(session => {
      const selected = session.days.filter(included);
      return {date:selected[0]?.date || '',endDate:selected.at(-1)?.date || '',photos:selected.flatMap(d=>d.photos),albums:[...new Map(selected.flatMap(d=>d.albums).map(a=>[a.id,a])).values()]};
    }).filter(v=>v.photos.length);
    const visibleRecords = place.records.filter(included);
    return {...place, records:visibleRecords, days:visibleDays, visits, photoCount:visibleRecords.length, latest:visibleDays.at(-1)?.date || '', cover:visibleDays.at(-1)?.photos[0]};
  }).filter(p=>p.photoCount).sort((a,b) => b.latest.localeCompare(a.latest) || a.name.localeCompare(b.name,'zh-CN'));
}

export function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.round(Math.abs(Date.parse(a) - Date.parse(b)) / 86400000);
}

/** Only past years; prefer this month, otherwise this season. No fabricated empty memories. */
export function seasonalMemories(content, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return {label:'', records:[]};
  const year = Number(today.slice(0,4)), month = Number(today.slice(5,7));
  const season = m => Math.floor((m % 12) / 3);
  const older = photoRecords(content).filter(r => r.date && Number(r.date.slice(0,4)) < year);
  const exact = older.filter(r => Number(r.date.slice(5,7)) === month);
  const matches = exact.length ? exact : older.filter(r => season(Number(r.date.slice(5,7))) === season(month));
  const unique = [...new Map(matches.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>[`${r.place.id}:${r.date}`,r])).values()];
  return {label:exact.length ? '往年的这个月' : '往年的这个季节', records:unique.slice(0,3)};
}

export function placeMapUrl(place) {
  const {latitude:lat,longitude:lon} = place;
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) return '';
  const bbox = [Math.max(-180,lon-.025),Math.max(-90,lat-.018),Math.min(180,lon+.025),Math.min(90,lat+.018)].join(',');
  return `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({bbox,layer:'mapnik',marker:`${lat},${lon}`})}`;
}

// Project owner content into public data before either rendering or exporting.
// A private image also wins over duplicate gallery entries and reused covers.
import { resolvePhotoPlace } from './photo-memories.mjs';
/** @param {import('./content-schema').SiteContent} source */
export function publicContent(source) {
  const content = structuredClone(source);
  const key = value => typeof value === 'string' ? value.toLowerCase() : '';
  const hiddenAlbums = new Set((content.albums ?? []).filter(a => a.private).map(a => a.id));
  const hidden = privateImagePaths(content);
  content.photographs = content.photographs.filter(p => !p.private && !hiddenAlbums.has(p.albumId) && !hidden.has(key(p.src)));
  for (const photo of content.photographs) delete photo.importKey;
  // Explicitly bind legacy aliases before discarding unused private place metadata.
  const usedPlaces = new Set();
  for (const photo of content.photographs) {
    const place = resolvePhotoPlace(photo, content.albums?.find(a => a.id === photo.albumId), content.places);
    if (content.places?.some(p => p.id === place.id)) { photo.placeId = place.id; usedPlaces.add(place.id); }
  }
  if (content.places) content.places = content.places.filter(p => usedPlaces.has(p.id)).map(p => ({...p,aliases:[]}));
  if (content.albums) content.albums = content.albums.filter(a => !a.private && content.photographs.some(p => p.albumId === a.id)).map(a => ({
    ...a,
    coverId: content.photographs.some(p => p.id === a.coverId && p.albumId === a.id) ? a.coverId : '',
  }));
  if (hidden.has(key(content.home.cover))) {
    content.home.cover = '';
    content.home.coverAlt = '';
    content.home.coverTitle = '';
    content.home.coverSubtitle = '';
    content.home.coverDescription = '';
  }
  for (const item of [...content.journal, ...content.projects]) {
    if (hidden.has(key(item.cover))) item.cover = '';
  }
  return content;
}

function privateImagePaths(content) {
  const albums = new Set((content.albums ?? []).filter(a => a.private).map(a => a.id));
  return new Set(content.photographs.filter(p => (p.private || albums.has(p.albumId)) && p.src).map(p => p.src.toLowerCase()));
}

/** Collect only images referenced by the public projection. */
export function publicImages(content) {
  const images = new Set();
  const visit = value => {
    if (typeof value === 'string' && value.startsWith('/images/')) images.add(value);
    else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => {
      if (key !== 'markdown') visit(item);
    });
  };
  visit(publicContent(content));
  // A path entered into a text field must not accidentally publish a private file.
  const hidden = privateImagePaths(content);
  return [...images].filter(src => !hidden.has(src.toLowerCase()));
}

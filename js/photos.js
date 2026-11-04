import { account, onSyncChange } from './sync.js';
import { esc, ICON } from './ui.js';

// Photo proof for milestones. A photo is shrunk in the browser (longest side 1200 px, JPEG, which also drops
// EXIF data such as the location) and uploaded to the private Supabase bucket "grow-proofs" under
// "<user id>/<quest>/<milestone>-<time>.jpg"; row level security keeps each account to its own folder
// (see supabase.sql). The milestone only stores that path. Images are shown through short-lived signed links.

const BUCKET = 'grow-proofs';
const MAX = 1200;
const QUALITY = 0.82;
const LINK_SECONDS = 3600;

const links = new Map(); // path → { url, until }

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Older Safari: let an <img> decode it.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function shrink(file) {
  const img = await decode(file);
  const w = img.width;
  const h = img.height;
  const scale = Math.min(1, MAX / Math.max(w, h));
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(w * scale), height: Math.round(h * scale) });
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close?.();
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', QUALITY));
}

// Resolves to the stored path, or throws an Error whose message can be shown.
export async function uploadPhoto(file, questId, msId) {
  const acc = account();
  if (!acc) throw new Error('Für Fotos melde dich in den Einstellungen an.');
  if (!navigator.onLine) throw new Error('Offline. Wähle das Foto nochmal, wenn du wieder online bist.');
  let blob;
  try {
    blob = await shrink(file);
  } catch {
    throw new Error('Dieses Bild konnte nicht gelesen werden.');
  }
  const path = `${acc.user.id}/${questId}/${msId}-${Date.now().toString(36)}.jpg`;
  const { error } = await acc.db.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw new Error('Hochladen hat nicht geklappt. Versuch es gleich nochmal.');
  return path;
}

// Best effort: a file that stays behind only costs a little space.
export function deletePhoto(path) {
  links.delete(path);
  account()?.db.storage.from(BUCKET).remove([path]).catch(() => {});
}

const fresh = path => {
  const l = links.get(path);
  return l && l.until > Date.now() ? l.url : null;
};

// An <img> for a stored photo; fillPhotos() gives it its link. Tapping it opens the big view.
export function photoThumb(path, cls = '') {
  const url = fresh(path);
  return `<button type="button" class="g-photo ${cls}" data-show-photo="${esc(path)}" aria-label="Foto ansehen">`
    + `<img data-photo="${esc(path)}" alt="Beweisfoto"${url ? ` src="${esc(url)}"` : ''}>${ICON.camera}</button>`;
}

// Gives every photo in `root` a signed link, fetching the missing ones in one request.
export async function fillPhotos(root = document) {
  const imgs = [...root.querySelectorAll('img[data-photo]:not([src])')];
  if (!imgs.length) return;
  const missing = [...new Set(imgs.map(i => i.dataset.photo).filter(p => !fresh(p)))];
  const acc = account();
  if (missing.length && acc) {
    const { data } = await acc.db.storage.from(BUCKET).createSignedUrls(missing, LINK_SECONDS).catch(() => ({ data: null }));
    for (const d of data ?? []) if (d.signedUrl) links.set(d.path, { url: d.signedUrl, until: Date.now() + (LINK_SECONDS - 60) * 1000 });
  }
  // Query again: the view may have been redrawn while the links were on their way.
  for (const img of root.querySelectorAll('img[data-photo]:not([src])')) {
    const url = fresh(img.dataset.photo);
    if (url) img.src = url;
  }
}
onSyncChange(() => fillPhotos());

// --- big view -------------------------------------------------------------------------------

const viewer = document.getElementById('photoView');
viewer.addEventListener('click', () => viewer.close());

document.addEventListener('click', e => {
  const b = e.target.closest('[data-show-photo]');
  if (!b) return;
  const url = fresh(b.dataset.showPhoto);
  if (!url) return;
  viewer.innerHTML = `<img src="${esc(url)}" alt="Beweisfoto"><button type="button" class="icon-btn" aria-label="Schließen">${ICON.close}</button>`;
  viewer.showModal();
});

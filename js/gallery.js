import { GALLERY_BASE_ITEMS, STORAGE_KEYS } from "./data.js?v=20260331-9";

export function loadUnlockedGallery() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.gallery);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadReachedEndings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.endings);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUnlockedGallery(items) {
  localStorage.setItem(STORAGE_KEYS.gallery, JSON.stringify(items));
}

function getUnlockedGallerySet() {
  return new Set(loadUnlockedGallery());
}

function getReachedEndingsSet() {
  return new Set(loadReachedEndings());
}

function reconcileUnlockedGallery() {
  const unlocked = getUnlockedGallerySet();
  const reachedEndings = getReachedEndingsSet();
  let changed = false;

  GALLERY_BASE_ITEMS.forEach((item) => {
    if (unlocked.has(item.id) || !reachedEndings.has(item.endingId)) {
      return;
    }
    unlocked.add(item.id);
    changed = true;
  });

  if (changed) {
    saveUnlockedGallery([...unlocked]);
  }

  return unlocked;
}

export function unlockGalleryItem(galleryId, endingId) {
  const gallery = getUnlockedGallerySet();
  const endings = getReachedEndingsSet();
  gallery.add(galleryId);
  endings.add(endingId);
  saveUnlockedGallery([...gallery]);
  localStorage.setItem(STORAGE_KEYS.endings, JSON.stringify([...endings]));
}

export function getGalleryItems() {
  const unlocked = reconcileUnlockedGallery();
  return GALLERY_BASE_ITEMS.map((item) => ({
    ...item,
    unlocked: unlocked?.has(item.id) || false,
  }));
}

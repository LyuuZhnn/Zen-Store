import { KEYS, readProducts, readWishlist, safeWrite, notify } from './storage.js';
export function getWishlist() {
  const available = new Set(readProducts().map(p => p.id));
  const valid = readWishlist().filter(id => available.has(id));
  if (valid.length !== readWishlist().length) safeWrite(KEYS.wishlist, valid);
  return valid;
}
export function hasWishlist(productId) { return getWishlist().includes(productId); }
export function toggleWishlist(productId) {
  if (!readProducts().some(p => p.id === productId)) { notify('Produk tidak ditemukan di katalog.', 'error'); return false; }
  const items = getWishlist();
  const exists = items.includes(productId);
  const next = exists ? items.filter(id => id !== productId) : [...items, productId];
  if (!safeWrite(KEYS.wishlist, next)) { notify('Wishlist gagal disimpan.', 'error'); return false; }
  notify(exists ? 'Produk dihapus dari wishlist.' : 'Produk disimpan ke wishlist.');
  return true;
}
export function removeWishlist(productId, quiet = false) {
  if (!safeWrite(KEYS.wishlist, getWishlist().filter(id => id !== productId))) { notify('Wishlist gagal diperbarui.', 'error'); return false; }
  if (!quiet) notify('Produk dihapus dari wishlist.');
  return true;
}

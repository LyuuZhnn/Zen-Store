/* Centralized, defensive LocalStorage helpers shared by storefront modules. */
export const KEYS = Object.freeze({
  products: 'zen_store_products_v1', categories: 'zen_store_categories_v1', cart: 'zen_store_cart_v1',
  wishlist: 'zen_store_wishlist_v1', settings: 'zen_store_settings_v1', orders: 'zen_store_orders_v1',
  theme: 'zen_store_theme_v1', adminAuth: 'zen_store_admin_auth_v1'
});
export const DEFAULT_SETTINGS = Object.freeze({
  storeName: 'ZEN STORE', description: 'ZEN STORE adalah proyek toko online statis dengan fokus pada katalog yang jelas dan alur belanja praktis.',
  whatsapp: '', bannerTitle: 'Belanja dengan ritme kamu sendiri.',
  bannerDescription: 'Temukan pilihan yang tepat, dengan pengalaman yang terasa lebih sederhana. Jelajahi katalog ZEN STORE dan simpan hal yang menarik perhatianmu.',
  promotionText: '', shippingInfo: '', paymentInstructions: '', featuredCategoryIds: [],
  additionalCost: 0, showFeatured: true
});

export function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return structuredCloneSafe(fallback);
    const parsed = JSON.parse(raw);
    return parsed === null || typeof parsed !== typeof fallback ? structuredCloneSafe(fallback) : parsed;
  } catch (error) {
    console.warn(`Data lokal ${key} tidak dapat dibaca. Menggunakan nilai aman.`, error);
    return structuredCloneSafe(fallback);
  }
}
function structuredCloneSafe(value) {
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
}
export function safeWrite(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (error) { console.error(`Gagal menyimpan ${key}`, error); return false; }
}
export function readProducts() {
  const data = safeRead(KEYS.products, []);
  if (!Array.isArray(data)) return [];
  return data.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && Number.isFinite(Number(p.price)) && Number(p.price) >= 0 && Number.isFinite(Number(p.stock)) && Number(p.stock) >= 0);
}
export function readCategories() {
  const data = safeRead(KEYS.categories, []);
  if (!Array.isArray(data)) return [];
  return data.filter(c => c && typeof c.id === 'string' && typeof c.name === 'string');
}
export function readCart() {
  const data = safeRead(KEYS.cart, []);
  if (!Array.isArray(data)) return [];
  return data.filter(x => x && typeof x.productId === 'string' && Number.isInteger(Number(x.quantity)) && Number(x.quantity) > 0).map(x => ({ productId: x.productId, quantity: Number(x.quantity) }));
}
export function readWishlist() {
  const data = safeRead(KEYS.wishlist, []);
  return Array.isArray(data) ? [...new Set(data.filter(x => typeof x === 'string'))] : [];
}
export function readSettings() {
  const value = safeRead(KEYS.settings, DEFAULT_SETTINGS);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...value, storeName: 'ZEN STORE', featuredCategoryIds: Array.isArray(value.featuredCategoryIds) ? value.featuredCategoryIds.filter(x => typeof x === 'string') : [] };
}
export function readOrders() {
  const data = safeRead(KEYS.orders, []);
  return Array.isArray(data) ? data.filter(o => o && typeof o.id === 'string' && Array.isArray(o.items)) : [];
}
export function makeId(prefix = 'id') {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}
export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
export function formatMoney(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
}
export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Tanggal tidak tersedia' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
export function safeImageURL(value = '') {
  const source = String(value).trim();
  if (!source) return '';
  if (/^(https?:\/\/|\.\.\/|\.\/|assets\/)/i.test(source) && !/^javascript:/i.test(source)) return source;
  return '';
}
export function notify(message, type = 'success', title = '') {
  const region = document.querySelector('#toast-region');
  if (!region) { console.info(`[${type}] ${message}`); return; }
  const node = document.createElement('div');
  node.className = `toast ${type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : ''}`;
  const iconId = type === 'error' ? 'close' : type === 'warning' ? 'info' : 'check-circle';
  const defaultTitle = type === 'error' ? 'Ada kendala' : type === 'warning' ? 'Perhatian' : 'Berhasil';
  const spriteBase = document.body?.dataset.app === 'admin' ? '../assets/icons/sprite.svg#' : './assets/icons/sprite.svg#';
  node.innerHTML = `<span class="toast-mark"><svg class="icon"><use href="${spriteBase}${iconId}"></use></svg></span><div><strong>${escapeHTML(title || defaultTitle)}</strong><p>${escapeHTML(message)}</p></div><button class="toast-dismiss" type="button" aria-label="Tutup notifikasi"><svg class="icon icon-sm"><use href="${spriteBase}close"></use></svg></button>`;
  const dismiss = () => node.remove();
  node.querySelector('.toast-dismiss').addEventListener('click', dismiss);
  region.append(node);
  window.setTimeout(dismiss, 4700);
}
export function writeOrNotify(key, value, message = 'Perubahan berhasil disimpan.') {
  if (!safeWrite(key, value)) { notify('Penyimpanan browser gagal. Periksa ruang penyimpanan atau pengaturan browser.', 'error'); return false; }
  if (message) notify(message);
  return true;
}
export function exportBundle() {
  return {
    schemaVersion: 1, exportedAt: new Date().toISOString(), app: 'ZEN STORE',
    products: readProducts(), categories: readCategories(), settings: readSettings(), orders: readOrders(),
    cart: readCart(), wishlist: readWishlist(), theme: safeRead(KEYS.theme, 'light')
  };
}
export function validateImportBundle(bundle) {
  const errors = [];
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) return { valid: false, errors: ['Berkas harus berupa objek JSON.'] };
  if (bundle.schemaVersion !== 1) errors.push('Versi struktur data tidak didukung.');
  for (const key of ['products', 'categories', 'settings', 'orders']) {
    if (bundle[key] === undefined) errors.push(`Bagian "${key}" tidak ditemukan.`);
  }
  if (!Array.isArray(bundle.products)) errors.push('Daftar produk harus berbentuk array.');
  if (!Array.isArray(bundle.categories)) errors.push('Daftar kategori harus berbentuk array.');
  if (!Array.isArray(bundle.orders)) errors.push('Daftar pesanan harus berbentuk array.');
  if (bundle.cart !== undefined && !Array.isArray(bundle.cart)) errors.push('Keranjang harus berbentuk array.');
  if (bundle.wishlist !== undefined && !Array.isArray(bundle.wishlist)) errors.push('Wishlist harus berbentuk array.');
  if (!bundle.settings || typeof bundle.settings !== 'object' || Array.isArray(bundle.settings)) errors.push('Pengaturan toko tidak valid.');
  if (errors.length) return { valid: false, errors };
  const ids = new Set();
  for (const [index, p] of bundle.products.entries()) {
    if (!p || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || !p.name.trim()) errors.push(`Produk nomor ${index + 1}: identitas atau nama tidak valid.`);
    if (!Number.isFinite(Number(p?.price)) || Number(p.price) <= 0) errors.push(`Produk nomor ${index + 1}: harga harus lebih besar dari nol.`);
    if (p?.discountPrice !== undefined && p?.discountPrice !== null && p?.discountPrice !== '' && (!Number.isFinite(Number(p.discountPrice)) || Number(p.discountPrice) <= 0 || Number(p.discountPrice) >= Number(p.price))) errors.push(`Produk nomor ${index + 1}: harga diskon tidak valid.`);
    if (p?.image !== undefined && typeof p.image !== 'string') errors.push(`Produk nomor ${index + 1}: sumber gambar tidak valid.`);
    if (p?.published !== undefined && typeof p.published !== 'boolean') errors.push(`Produk nomor ${index + 1}: status publikasi tidak valid.`);
    if (!Number.isInteger(Number(p?.stock)) || Number(p.stock) < 0) errors.push(`Produk nomor ${index + 1}: stok harus bilangan bulat nol atau lebih.`);
    if (p?.id && ids.has(p.id)) errors.push(`ID produk duplikat: ${p.id}.`);
    if (p?.id) ids.add(p.id);
  }
  const categoryIds = new Set();
  for (const [index, c] of bundle.categories.entries()) {
    if (!c || typeof c.id !== 'string' || !c.id || typeof c.name !== 'string' || !c.name.trim()) errors.push(`Kategori nomor ${index + 1} tidak valid.`);
    if (c?.id && categoryIds.has(c.id)) errors.push(`ID kategori duplikat: ${c.id}.`);
    if (c?.id) categoryIds.add(c.id);
  }
  if (Array.isArray(bundle.cart) && bundle.cart.some(x => !x || typeof x.productId !== 'string' || !Number.isInteger(Number(x.quantity)) || Number(x.quantity) < 1)) errors.push('Ada item keranjang yang tidak valid.');
  if (Array.isArray(bundle.wishlist) && bundle.wishlist.some(id => typeof id !== 'string')) errors.push('Ada item wishlist yang tidak valid.');
  for (const field of ['storeName','description','whatsapp','bannerTitle','bannerDescription','promotionText','shippingInfo','paymentInstructions']) {
    if (bundle.settings[field] !== undefined && typeof bundle.settings[field] !== 'string') errors.push(`Pengaturan ${field} harus berupa teks.`);
  }
  if (bundle.settings.additionalCost !== undefined && (!Number.isFinite(Number(bundle.settings.additionalCost)) || Number(bundle.settings.additionalCost) < 0)) errors.push('Biaya tambahan pada pengaturan tidak valid.');
  if (bundle.settings.featuredCategoryIds !== undefined && (!Array.isArray(bundle.settings.featuredCategoryIds) || bundle.settings.featuredCategoryIds.some(id => typeof id !== 'string'))) errors.push('Daftar kategori unggulan tidak valid.');
  for (const [index, order] of bundle.orders.entries()) {
    if (!order || typeof order.id !== 'string' || !order.id || !Array.isArray(order.items)) errors.push(`Pesanan nomor ${index + 1} tidak valid.`);
    else {
      for (const item of order.items) {
        if (!item || typeof item.name !== 'string' || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || !Number.isFinite(Number(item.price)) || Number(item.price) < 0 || !Number.isFinite(Number(item.subtotal)) || Number(item.subtotal) < 0) errors.push(`Rincian pesanan ${order.id} tidak valid.`);
      }
      if (order.total !== undefined && (!Number.isFinite(Number(order.total)) || Number(order.total) < 0)) errors.push(`Total pesanan ${order.id} tidak valid.`);
    }
  }
  if (errors.length) return { valid: false, errors };
  const safeSettings = { ...DEFAULT_SETTINGS, ...bundle.settings };
  safeSettings.featuredCategoryIds = Array.isArray(safeSettings.featuredCategoryIds) ? safeSettings.featuredCategoryIds.filter(id => categoryIds.has(id)) : [];
  return { valid: true, errors: [], data: {
    products: bundle.products.map(p => ({ ...p, name: p.name.trim(), price: Number(p.price), stock: Number(p.stock), categoryId: categoryIds.has(p.categoryId) ? p.categoryId : '' })),
    categories: bundle.categories.map(c => ({ ...c, name: c.name.trim() })), settings: safeSettings,
    orders: bundle.orders.filter(o => o && typeof o.id === 'string' && Array.isArray(o.items)),
    cart: (Array.isArray(bundle.cart) ? bundle.cart : []).filter(x => bundle.products.some(p => p.id === x.productId)).map(x => ({ productId: x.productId, quantity: Number(x.quantity) })),
    wishlist: Array.isArray(bundle.wishlist) ? [...new Set(bundle.wishlist.filter(id => bundle.products.some(p => p.id === id)))] : [],
    theme: bundle.theme === 'dark' ? 'dark' : 'light'
  }};
}
export function applyImportData(data) {
  const pairs = [[KEYS.products, data.products], [KEYS.categories, data.categories], [KEYS.settings, data.settings], [KEYS.orders, data.orders], [KEYS.cart, data.cart], [KEYS.wishlist, data.wishlist], [KEYS.theme, data.theme]];
  let previous = [];
  try {
    previous = pairs.map(([key]) => [key, localStorage.getItem(key)]);
    for (const [key, value] of pairs) localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    for (const [key, value] of previous) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch {} }
    console.error('Impor dibatalkan dan data sebelumnya dicoba dipulihkan.', error);
    return false;
  }
}

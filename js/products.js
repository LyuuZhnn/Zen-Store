import { KEYS, readProducts, readCategories, readSettings, readCart, readWishlist, safeWrite, notify } from './storage.js';
export function listProducts() { return readProducts(); }
export function getProduct(id) { return readProducts().find(p => p.id === id) || null; }
export function saveProduct(input, id = '') {
  const name = String(input.name || '').trim();
  const price = Number(input.price);
  const stock = Number(input.stock);
  const discountPrice = input.discountPrice === '' || input.discountPrice == null ? null : Number(input.discountPrice);
  const categories = new Set(readCategories().map(c => c.id));
  const errors = [];
  if (!name) errors.push('Nama produk wajib diisi.');
  if (!Number.isFinite(price) || price <= 0) errors.push('Harga harus lebih besar dari nol.');
  if (!Number.isInteger(stock) || stock < 0) errors.push('Stok harus bilangan bulat nol atau lebih.');
  if (discountPrice !== null && (!Number.isFinite(discountPrice) || discountPrice <= 0 || discountPrice >= price)) errors.push('Harga diskon harus lebih kecil dari harga normal dan lebih besar dari nol.');
  if (input.categoryId && !categories.has(input.categoryId)) errors.push('Kategori yang dipilih tidak ditemukan.');
  if (errors.length) return { ok: false, errors };
  const image = String(input.image || '').trim();
  if (image && !/^(https?:\/\/|\.\.\/|\.\/|assets\/)/i.test(image)) return { ok: false, errors: ['Gambar harus berupa URL http(s) atau path aset lokal.'] };
  const products = readProducts();
  const existing = id ? products.find(p => p.id === id) : null;
  if (id && !existing) return { ok: false, errors: ['Produk yang ingin diperbarui tidak ditemukan.'] };
  const product = {
    id: existing?.id || `product-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`,
    name, price, discountPrice, description: String(input.description || '').trim(),
    categoryId: categories.has(input.categoryId) ? input.categoryId : '',
    stock, image, featured: Boolean(input.featured), published: Boolean(input.published),
    variants: String(input.variants || '').split(',').map(v => v.trim()).filter(Boolean).slice(0, 30),
    createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  const next = existing ? products.map(p => p.id === id ? product : p) : [...products, product];
  if (!safeWrite(KEYS.products, next)) return { ok: false, errors: ['Browser gagal menyimpan data. Coba ekspor data lama atau periksa ruang LocalStorage.'] };
  const settings = readSettings();
  settings.featuredCategoryIds = settings.featuredCategoryIds.filter(x => categories.has(x));
  notify(existing ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.');
  return { ok: true, product };
}
export function deleteProduct(id) {
  const product = getProduct(id);
  if (!product) return { ok: false, error: 'Produk tidak ditemukan.' };
  if (!safeWrite(KEYS.products, readProducts().filter(p => p.id !== id))) return { ok: false, error: 'Produk tidak berhasil dihapus dari penyimpanan.' };
  const cart = readCart().filter(x => x.productId !== id);
  const wishlist = readWishlist().filter(x => x !== id);
  safeWrite(KEYS.cart, cart); safeWrite(KEYS.wishlist, wishlist);
  return { ok: true, product };
}
export function saveCategory(input, id = '') {
  const name = String(input.name || '').trim();
  if (!name) return { ok: false, error: 'Nama kategori wajib diisi.' };
  if (name.length > 60) return { ok: false, error: 'Nama kategori maksimal 60 karakter.' };
  const categories = readCategories();
  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id)) return { ok: false, error: 'Kategori dengan nama tersebut sudah ada.' };
  const existing = categories.find(c => c.id === id);
  if (id && !existing) return { ok: false, error: 'Kategori tidak ditemukan.' };
  const category = { id: existing?.id || `category-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`}`, name, color: input.color || 'blue', createdAt: existing?.createdAt || new Date().toISOString() };
  const next = existing ? categories.map(c => c.id === id ? category : c) : [...categories, category];
  if (!safeWrite(KEYS.categories, next)) return { ok: false, error: 'Kategori gagal disimpan di browser.' };
  notify(existing ? 'Kategori diperbarui.' : 'Kategori ditambahkan.');
  return { ok: true, category };
}
export function deleteCategory(id) {
  const products = readProducts();
  if (products.some(p => p.categoryId === id)) return { ok: false, error: 'Kategori masih digunakan produk. Pindahkan produk ke kategori lain sebelum menghapusnya.' };
  const categories = readCategories();
  if (!categories.some(c => c.id === id)) return { ok: false, error: 'Kategori tidak ditemukan.' };
  if (!safeWrite(KEYS.categories, categories.filter(c => c.id !== id))) return { ok: false, error: 'Kategori gagal dihapus.' };
  const settings = readSettings(); settings.featuredCategoryIds = settings.featuredCategoryIds.filter(x => x !== id); safeWrite(KEYS.settings, settings);
  notify('Kategori dihapus.'); return { ok: true };
}
export function categoryName(id) { return readCategories().find(c => c.id === id)?.name || 'Tanpa kategori'; }

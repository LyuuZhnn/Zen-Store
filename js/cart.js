import { KEYS, readCart, readProducts, safeWrite, notify } from './storage.js';
export function getCartDetails() {
  const products = readProducts();
  const current = readCart();
  const valid = current.flatMap(line => {
    const product = products.find(p => p.id === line.productId && p.published === true);
    if (!product || Number(product.stock) < 1) return [];
    return [{ productId: product.id, quantity: Math.min(line.quantity, Number(product.stock)) }];
  });
  if (JSON.stringify(valid) !== JSON.stringify(current)) safeWrite(KEYS.cart, valid);
  const items = valid.map(line => {
    const product = products.find(p => p.id === line.productId);
    const price = Number(product.price);
    const discountPrice = Number(product.discountPrice);
    const unitPrice = Number.isFinite(discountPrice) && discountPrice > 0 && discountPrice < price ? discountPrice : price;
    return { product, productId: product.id, quantity: line.quantity, unitPrice, subtotal: unitPrice * line.quantity };
  });
  return { items, quantity: items.reduce((sum, item) => sum + item.quantity, 0), total: items.reduce((sum, item) => sum + item.subtotal, 0) };
}
export function addToCart(productId, quantity = 1) {
  const product = readProducts().find(p => p.id === productId);
  const amount = Number(quantity);
  if (!product || product.published !== true) { notify('Produk tidak tersedia atau belum dipublikasikan.', 'error'); return false; }
  if (!Number.isInteger(amount) || amount < 1) { notify('Jumlah harus berupa bilangan bulat lebih dari nol.', 'warning'); return false; }
  const cart = readCart();
  const current = cart.find(x => x.productId === productId)?.quantity || 0;
  if (Number(product.stock) < 1 || current + amount > Number(product.stock)) { notify(`Jumlah melebihi stok yang tersedia (${product.stock}).`, 'warning'); return false; }
  if (cart.some(x => x.productId === productId)) cart.find(x => x.productId === productId).quantity += amount;
  else cart.push({ productId, quantity: amount });
  if (!safeWrite(KEYS.cart, cart)) { notify('Keranjang tidak dapat disimpan di browser ini.', 'error'); return false; }
  notify(`${product.name} ditambahkan ke keranjang.`);
  return true;
}
export function setCartQuantity(productId, quantity) {
  const product = readProducts().find(p => p.id === productId);
  const amount = Number(quantity);
  if (!product || product.published !== true) { removeFromCart(productId); return false; }
  if (!Number.isInteger(amount) || amount < 1) { notify('Jumlah minimal adalah 1. Gunakan tombol hapus untuk menghapus barang.', 'warning'); return false; }
  if (amount > Number(product.stock)) { notify(`Stok ${product.name} saat ini ${product.stock}.`, 'warning'); return false; }
  const cart = readCart();
  const line = cart.find(x => x.productId === productId);
  if (!line) return false;
  line.quantity = amount;
  if (!safeWrite(KEYS.cart, cart)) { notify('Perubahan keranjang gagal disimpan.', 'error'); return false; }
  return true;
}
export function removeFromCart(productId, quiet = false) {
  const cart = readCart().filter(x => x.productId !== productId);
  if (!safeWrite(KEYS.cart, cart)) { notify('Item tidak berhasil dihapus dari penyimpanan.', 'error'); return false; }
  if (!quiet) notify('Item dihapus dari keranjang.');
  return true;
}
export function clearCart(quiet = true) {
  const ok = safeWrite(KEYS.cart, []);
  if (!ok) notify('Keranjang tidak dapat dikosongkan.', 'error');
  else if (!quiet) notify('Keranjang sudah dikosongkan.');
  return ok;
}

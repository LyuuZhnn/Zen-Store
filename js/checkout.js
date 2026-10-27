import { KEYS, readProducts, readCart, readSettings, readOrders, safeWrite, makeId, formatMoney, notify } from './storage.js';
import { getCartDetails, clearCart } from './cart.js';

function normalizeWhatsApp(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith('8')) digits = `62${digits}`;
  return /^\d{8,15}$/.test(digits) ? digits : '';
}
export function createLocalOrder(customer) {
  const settings = readSettings();
  const phone = normalizeWhatsApp(settings.whatsapp);
  if (!phone) return { ok: false, error: 'Nomor WhatsApp toko belum diatur atau formatnya tidak valid. Minta pengelola mengaturnya di admin.' };
  const cart = getCartDetails();
  if (!cart.items.length) return { ok: false, error: 'Keranjang masih kosong.' };
  const products = readProducts();
  for (const item of cart.items) {
    const actual = products.find(p => p.id === item.productId && p.published === true);
    if (!actual || actual.stock < item.quantity) return { ok: false, error: `Stok ${item.product?.name || 'produk'} berubah. Periksa kembali keranjang.` };
  }
  const buyerName = String(customer.name || '').trim();
  const buyerPhone = String(customer.phone || '').trim();
  const address = String(customer.address || '').trim();
  const note = String(customer.note || '').trim();
  if (buyerName.length < 2) return { ok: false, error: 'Nama pembeli wajib diisi (minimal 2 karakter).' };
  const buyerDigits = buyerPhone.replace(/\D/g, '');
  if (buyerDigits.length < 8 || buyerDigits.length > 15) return { ok: false, error: 'Nomor WhatsApp pembeli harus memiliki 8–15 digit.' };
  const addCost = Number(settings.additionalCost) || 0;
  if (addCost < 0) return { ok: false, error: 'Pengaturan biaya tambahan tidak valid. Hubungi pengelola.' };
  const order = {
    id: `ZEN-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    createdAt: new Date().toISOString(), status: 'Disiapkan lokal', source: 'browser-local',
    customer: { name: buyerName, phone: buyerPhone, address, note },
    items: cart.items.map(item => ({ productId: item.productId, name: item.product.name, price: item.unitPrice, quantity: item.quantity, subtotal: item.subtotal })),
    subtotal: cart.total, additionalCost: addCost, total: cart.total + addCost
  };
  const orders = readOrders();
  if (!safeWrite(KEYS.orders, [order, ...orders])) return { ok: false, error: 'Pesanan tidak dapat disimpan di browser ini. Keranjang tetap dipertahankan.' };
  const lines = [
    `Halo ${settings.storeName || 'ZEN STORE'}, saya ingin meninjau pesanan berikut.`, '',
    `Referensi lokal: ${order.id}`, `Nama: ${buyerName}`, `WhatsApp pembeli: ${buyerPhone}`,
    ...(address ? [`Alamat / pengiriman: ${address}`] : []), '', 'Rincian pesanan:',
    ...order.items.map((item, index) => `${index + 1}. ${item.name}\n   ${item.quantity} x ${formatMoney(item.price)} = ${formatMoney(item.subtotal)}`),
    '', `Subtotal: ${formatMoney(order.subtotal)}`,
    ...(addCost > 0 ? [`Biaya tambahan yang dikonfigurasi toko: ${formatMoney(addCost)}`] : []),
    `TOTAL: ${formatMoney(order.total)}`,
    ...(note ? ['', `Catatan: ${note}`] : []), '', 'Pesanan ini dibuat oleh website; mohon konfirmasi ketersediaan dan total akhir.'
  ];
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
  return { ok: true, order, url, clearCart };
}

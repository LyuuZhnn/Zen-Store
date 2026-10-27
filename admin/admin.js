import {
  KEYS, DEFAULT_SETTINGS, safeRead, safeWrite, readProducts, readCategories, readSettings, readOrders,
  readCart, readWishlist, formatMoney, formatDate, escapeHTML, makeId, notify,
  exportBundle, validateImportBundle, applyImportData
} from '../js/storage.js';
import { saveProduct, deleteProduct, saveCategory, deleteCategory, categoryName, getProduct } from '../js/products.js';
import { applyTheme, getTheme, toggleTheme } from '../js/theme.js';

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
const SPRITE = '../assets/icons/sprite.svg#';
const icon = (id, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="${SPRITE}${id}"></use></svg>`;
const ADMIN_LABELS = {
  dashboard: ['Dashboard', 'Ringkasan katalog dan data lokal toko.'],
  products: ['Manajemen Produk', 'Kelola katalog, harga, stok, dan publikasi.'],
  'add-product': ['Tambah Produk', 'Masukkan informasi produk yang sebenarnya.'],
  categories: ['Manajemen Kategori', 'Kelola struktur kategori katalog.'],
  orders: ['Pesanan Lokal', 'Catatan pesanan yang tersedia pada browser ini.'],
  settings: ['Pengaturan Toko', 'Konfigurasi informasi publik dan kontak toko.'],
  data: ['Ekspor & Impor Data', 'Cadangkan dan pulihkan data lokal.'],
  about: ['Tentang ZEN STORE', 'Informasi proyek dan batasan teknis.']
};
let activeAdminView = 'dashboard';
let editingProductId = '';
let editingCategoryId = '';

function showAuth() {
  $('#admin-shell').hidden = true;
  $('#auth-screen').hidden = false;
  const auth = safeRead(KEYS.adminAuth, null);
  const loginForm = $('#login-form'); const setupForm = $('#setup-form');
  const setup = !auth || typeof auth.username !== 'string' || typeof auth.hash !== 'string' || typeof auth.salt !== 'string';
  loginForm.hidden = setup; setupForm.hidden = !setup;
  $('#auth-title').textContent = setup ? 'Siapkan akses lokal.' : 'Selamat datang kembali.';
  $('#auth-description').textContent = setup ? 'Buat username dan kata sandi untuk membuka panel ini pada browser sekarang.' : 'Masuk untuk mengelola katalog dan pengaturan ZEN STORE pada browser ini.';
  $('#login-error').hidden = true; $('#setup-error').hidden = true;
  document.title = `${setup ? 'Buat Akses Admin' : 'Login Admin'} — ZEN STORE`;
}
function showDashboard(username) {
  $('#auth-screen').hidden = true; $('#admin-shell').hidden = false;
  const label = String(username || 'Admin lokal');
  $('#admin-username-label').textContent = label;
  $('#admin-avatar').textContent = label.slice(0, 2).toUpperCase();
  document.title = 'Admin Dashboard — ZEN STORE';
  applyTheme(getTheme());
  navigateAdmin('dashboard'); renderAll();
}
function bytesToHex(bytes) { return [...bytes].map(n => n.toString(16).padStart(2, '0')).join(''); }
async function passwordHash(password, saltHex) {
  if (!crypto?.subtle || !crypto?.getRandomValues) throw new Error('Browser ini tidak mendukung Web Crypto. Buka halaman admin melalui HTTPS atau browser modern.');
  const data = new TextEncoder().encode(`${saltHex}:${password}`);
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
}
function randomSalt() { const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return bytesToHex(bytes); }
function equalText(a, b) { if (a.length !== b.length) return false; let result = 0; for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i); return result === 0; }
function authError(id, message) { const node = document.getElementById(id); node.textContent = message; node.hidden = false; }

$('#setup-form').addEventListener('submit', async e => {
  e.preventDefault(); $('#setup-error').hidden = true;
  const form = e.currentTarget; if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  const username = String(data.username || '').trim(); const password = String(data.password || '');
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) { authError('setup-error', 'Username harus 3–50 karakter dan hanya memakai huruf, angka, titik, garis bawah, atau tanda hubung.'); return; }
  if (password.length < 10) { authError('setup-error', 'Kata sandi lokal minimal 10 karakter.'); return; }
  if (password !== data.confirmPassword) { authError('setup-error', 'Konfirmasi kata sandi belum sama.'); return; }
  try {
    const salt = randomSalt(); const hash = await passwordHash(password, salt);
    if (!safeWrite(KEYS.adminAuth, { username, salt, hash, createdAt: new Date().toISOString() })) { authError('setup-error', 'Browser tidak dapat menyimpan akses lokal.'); return; }
    sessionStorage.setItem('zen_store_admin_session', username);
    form.reset(); notify('Akses admin lokal berhasil dibuat. Ingat, ini bukan perlindungan server.', 'warning', 'Akses lokal dibuat'); showDashboard(username);
  } catch (error) { authError('setup-error', error.message || 'Akses lokal tidak dapat dibuat.'); }
});
$('#login-form').addEventListener('submit', async e => {
  e.preventDefault(); $('#login-error').hidden = true;
  const form = e.currentTarget; if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form));
  const auth = safeRead(KEYS.adminAuth, null);
  if (!auth) { showAuth(); return; }
  if (String(data.username).trim().toLowerCase() !== String(auth.username).toLowerCase()) { authError('login-error', 'Username atau kata sandi tidak cocok.'); return; }
  try {
    const hash = await passwordHash(String(data.password), auth.salt);
    if (!equalText(hash, auth.hash)) { authError('login-error', 'Username atau kata sandi tidak cocok.'); return; }
    sessionStorage.setItem('zen_store_admin_session', auth.username);
    form.reset(); notify('Berhasil masuk ke panel admin lokal.'); showDashboard(auth.username);
  } catch (error) { authError('login-error', error.message || 'Validasi login tidak dapat dilakukan.'); }
});

document.addEventListener('click', e => {
  const toggle = e.target.closest('[data-toggle-password]');
  if (toggle) { const input = toggle.closest('.password-wrap')?.querySelector('input'); if (input) { input.type = input.type === 'password' ? 'text' : 'password'; toggle.textContent = input.type === 'password' ? 'Lihat' : 'Sembunyi'; toggle.setAttribute('aria-label', input.type === 'password' ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi'); } }
});

function navigateAdmin(view) {
  if (!ADMIN_LABELS[view]) view = 'dashboard';
  activeAdminView = view;
  $$('.admin-view').forEach(section => { const active = section.dataset.adminSection === view; section.hidden = !active; });
  $$('#admin-nav [data-admin-view]').forEach(button => {
    const active = button.dataset.adminView === view || (view === 'add-product' && button.dataset.adminView === 'add-product');
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  $('#admin-page-title').textContent = ADMIN_LABELS[view][0];
  $('#admin-page-subtitle').textContent = ADMIN_LABELS[view][1];
  closeAdminDrawer();
  if (view === 'products') renderProductsTable();
  if (view === 'categories') renderCategoriesTable();
  if (view === 'orders') renderOrdersTable();
  if (view === 'settings') fillSettingsForm();
  if (view === 'add-product') { populateProductCategorySelect(); if (!editingProductId) resetProductForm(); }
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
function openAdminDrawer() { $('#admin-sidebar').classList.add('is-open'); $('#admin-overlay').hidden = false; $('#admin-overlay').classList.add('is-visible'); $('#admin-menu').setAttribute('aria-expanded','true'); }
function closeAdminDrawer() { $('#admin-sidebar').classList.remove('is-open'); $('#admin-overlay').classList.remove('is-visible'); $('#admin-overlay').hidden = true; $('#admin-menu').setAttribute('aria-expanded','false'); }
function logout() {
  if (!window.confirm('Keluar dari sesi admin pada browser ini? Data lokal tetap tersimpan.')) return;
  sessionStorage.removeItem('zen_store_admin_session'); $('#admin-shell').hidden = true; closeAdminDrawer(); showAuth(); notify('Sesi admin lokal sudah ditutup.');
}
$('#sidebar-logout').addEventListener('click', logout);
$('#admin-menu').addEventListener('click', openAdminDrawer);
$('#admin-overlay').addEventListener('click', closeAdminDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAdminDrawer(); });
$('#admin-theme-toggle').addEventListener('click', () => applyTheme(toggleTheme()));
$('#admin-nav').addEventListener('click', e => { const button = e.target.closest('[data-admin-view]'); if (button) { if (button.dataset.adminView === 'add-product') { editingProductId = ''; resetProductForm(); } navigateAdmin(button.dataset.adminView); } });
document.addEventListener('click', e => {
  const goto = e.target.closest('[data-admin-view]');
  if (goto && !goto.closest('#admin-nav')) { if (goto.dataset.adminView === 'add-product') { editingProductId = ''; resetProductForm(); } navigateAdmin(goto.dataset.adminView); return; }
  const action = e.target.closest('[data-action]');
  if (action?.dataset.action === 'add-category') openCategoryModal();
  if (action?.dataset.action === 'edit-category') { const cat = readCategories().find(c => c.id === action.dataset.id); if (cat) openCategoryModal(cat); }
  if (action?.dataset.action === 'delete-category') handleDeleteCategory(action.dataset.id);
  if (action?.dataset.action === 'edit-product') beginEditProduct(action.dataset.id);
  if (action?.dataset.action === 'delete-product') handleDeleteProduct(action.dataset.id);
  if (action?.dataset.action === 'delete-order') handleDeleteOrder(action.dataset.id);
  if (action?.dataset.action === 'view-order') handleViewOrder(action.dataset.id);
  if (action?.dataset.action === 'close-modal') closeModal();
});

function renderStats() {
  const products = readProducts(); const categories = readCategories(); const orders = readOrders();
  const values = [
    ['Total produk', products.length, 'package', '#e5eeff', '#4269cf', 'Semua produk, termasuk draf'],
    ['Kategori', categories.length, 'layers', '#eee8ff', '#7965c1', 'Kategori yang dibuat admin'],
    ['Stok tersedia', products.filter(p => Number(p.stock) > 0).length, 'check-circle', '#dff4eb', '#33866e', 'Produk dengan stok lebih dari nol'],
    ['Stok habis', products.filter(p => Number(p.stock) === 0).length, 'tag', '#ffebdd', '#a66c42', 'Produk dengan stok nol'],
    ['Pesanan lokal', orders.length, 'bag', '#def7fb', '#367e8e', 'Catatan yang ada di browser ini'],
    ['Dipublikasikan', products.filter(p => p.published === true).length, 'sparkles', '#fae7f0', '#a45e85', 'Produk yang tampil di toko'],
  ];
  $('#admin-stats').innerHTML = values.map(([label,value,iconId,tint,color,note]) => `<article class="stat-card" style="--stat-tint:${tint};--stat-color:${color}"><div class="stat-top"><span class="stat-label">${label}</span><span class="stat-icon">${icon(iconId)}</span></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></article>`).join('');
  $('#nav-products-count').textContent = products.length; $('#nav-categories-count').textContent = categories.length; $('#nav-orders-count').textContent = orders.length;
  const recent = [...products].sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0,4);
  $('#dashboard-recent-products').innerHTML = recent.length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Produk</th><th>Harga</th><th>Status</th></tr></thead><tbody>${recent.map(p=>`<tr><td><div class="table-product"><span class="table-product-image">${productImage(p)}</span><span class="table-product-meta"><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(categoryName(p.categoryId))}</small></span></div></td><td class="price-strong">${formatMoney(p.price)}</td><td>${p.published ? '<span class="badge badge-green">Publik</span>' : '<span class="badge badge-gray">Draf</span>'}</td></tr>`).join('')}</tbody></table></div>` : adminEmpty('Belum ada produk', 'Tambahkan produk asli ketika katalog sudah siap dikelola.', 'Tambah produk', 'add-product');
}
function adminEmpty(title, description, actionLabel = '', view = '') {
  return `<div class="empty-state compact"><div class="empty-art"><img src="../assets/images/catalog-empty.svg" alt=""></div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${actionLabel ? `<button class="btn btn-primary btn-sm" data-admin-view="${escapeHTML(view)}">${escapeHTML(actionLabel)} ${icon('arrow-right','icon-sm')}</button>` : ''}</div>`;
}
function productImage(product) {
  const src = String(product.image || '').trim();
  if (!/^(https?:\/\/|\.\.\/|\.\/|assets\/)/i.test(src)) return icon('package');
  const normalized = src.startsWith('assets/') ? `../${src}` : src;
  return `<img src="${escapeHTML(normalized)}" alt="" loading="lazy" onerror="this.hidden=true">`;
}
function renderProductsTable() {
  const search = String($('#product-search')?.value || '').toLocaleLowerCase('id-ID').trim();
  const publish = $('#product-publish-filter')?.value || 'all'; const stock = $('#product-stock-filter')?.value || 'all';
  let products = readProducts();
  if (search) products = products.filter(p => `${p.name} ${p.description || ''}`.toLocaleLowerCase('id-ID').includes(search));
  if (publish === 'published') products = products.filter(p=>p.published === true);
  if (publish === 'draft') products = products.filter(p=>p.published !== true);
  if (stock === 'available') products = products.filter(p=>Number(p.stock)>0);
  if (stock === 'out') products = products.filter(p=>Number(p.stock)===0);
  if (!products.length) { $('#products-table').innerHTML = adminEmpty(readProducts().length ? 'Tidak ada produk yang cocok' : 'Belum ada produk', readProducts().length ? 'Ubah pencarian atau filter untuk melihat produk lainnya.' : 'Katalog dimulai kosong. Gunakan formulir untuk menambahkan produk milik toko.', 'Tambah produk', 'add-product'); return; }
  $('#products-table').innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Produk</th><th>Harga</th><th>Stok</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${products.map(p=>`<tr><td><div class="table-product"><span class="table-product-image">${productImage(p)}</span><span class="table-product-meta"><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(categoryName(p.categoryId))}</small></span></div></td><td><span class="price-strong">${formatMoney(p.discountPrice && Number(p.discountPrice) < Number(p.price) ? p.discountPrice : p.price)}</span>${p.discountPrice && Number(p.discountPrice)<Number(p.price) ? `<div class="table-subtitle"><s>${formatMoney(p.price)}</s></div>` : ''}</td><td>${Number(p.stock)===0 ? '<span class="badge badge-amber">Habis · 0</span>' : `<span class="badge badge-green">${Number(p.stock)} tersedia</span>`}</td><td>${p.published ? '<span class="badge badge-green">Dipublikasikan</span>' : '<span class="badge badge-gray">Draf</span>'}${p.featured ? '<div style="margin-top:4px"><span class="badge badge-violet">Pilihan</span></div>' : ''}</td><td><div class="table-actions"><button class="icon-button" type="button" data-action="edit-product" data-id="${escapeHTML(p.id)}" aria-label="Edit ${escapeHTML(p.name)}" title="Edit">${icon('edit')}</button><button class="icon-button danger-action" type="button" data-action="delete-product" data-id="${escapeHTML(p.id)}" aria-label="Hapus ${escapeHTML(p.name)}" title="Hapus">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
$('#product-search').addEventListener('input', renderProductsTable);
$('#product-publish-filter').addEventListener('change', renderProductsTable);
$('#product-stock-filter').addEventListener('change', renderProductsTable);
function populateProductCategorySelect(selected = '') {
  const select = $('#product-category'); if (!select) return;
  select.innerHTML = '<option value="">Tanpa kategori</option>' + readCategories().map(c=>`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`).join('');
  select.value = readCategories().some(c => c.id === selected) ? selected : '';
}
function resetProductForm() {
  editingProductId = ''; $('#product-editor-form').reset(); $('#product-editor-form').elements.id.value = '';
  $('#product-editor-form').elements.stock.value = '0'; $('#product-page-heading').textContent = 'Tambah produk'; $('#product-form-errors').hidden = true;
  populateProductCategorySelect();
}
function beginEditProduct(id) {
  const product = getProduct(id); if (!product) { notify('Produk tidak ditemukan.', 'error'); renderProductsTable(); return; }
  editingProductId = id; navigateAdmin('add-product');
  const form = $('#product-editor-form');
  for (const field of ['name','price','discountPrice','categoryId','stock','image','description']) form.elements[field].value = product[field] ?? '';
  form.elements.variants.value = Array.isArray(product.variants) ? product.variants.join(', ') : '';
  form.elements.featured.checked = product.featured === true; form.elements.published.checked = product.published === true; form.elements.id.value = product.id;
  $('#product-page-heading').textContent = 'Edit produk'; $('#product-form-errors').hidden = true;
}
function handleDeleteProduct(id) {
  const product = getProduct(id); if (!product) { notify('Produk tidak ditemukan.', 'error'); return; }
  if (!window.confirm(`Hapus produk "${product.name}"? Produk ini juga akan dihapus dari keranjang dan wishlist lokal.`)) return;
  const result = deleteProduct(id);
  if (!result.ok) { notify(result.error, 'error'); return; }
  notify('Produk dihapus.'); renderAll();
}
$('#product-editor-form').addEventListener('submit', e => {
  e.preventDefault(); const form = e.currentTarget;
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form)); data.featured = form.elements.featured.checked; data.published = form.elements.published.checked;
  const result = saveProduct(data, editingProductId);
  const errBox = $('#product-form-errors');
  if (!result.ok) { errBox.innerHTML = `<strong>Periksa isian berikut:</strong><ul>${result.errors.map(msg=>`<li>${escapeHTML(msg)}</li>`).join('')}</ul>`; errBox.hidden = false; return; }
  resetProductForm(); renderAll(); navigateAdmin('products');
});
$('#cancel-product-edit').addEventListener('click', () => { resetProductForm(); navigateAdmin('products'); });

function renderCategoriesTable() {
  const categories = readCategories(); $('#category-total-badge').textContent = `${categories.length} kategori`;
  if (!categories.length) { $('#categories-table').innerHTML = `<div class="empty-state compact"><div class="empty-art"><img src="../assets/images/catalog-empty.svg" alt=""></div><h3>Belum ada kategori</h3><p>Tambahkan kategori sesuai susunan katalog yang benar. Produk tidak dibuat otomatis.</p><button class="btn btn-primary btn-sm" data-action="add-category">Tambah kategori ${icon('plus','icon-sm')}</button></div>`; return; }
  $('#categories-table').innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Nama kategori</th><th>Jumlah produk</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>${categories.map(c=>`<tr><td><span class="table-title">${escapeHTML(c.name)}</span></td><td>${readProducts().filter(p=>p.categoryId===c.id).length}</td><td>${formatDate(c.createdAt)}</td><td><div class="table-actions"><button class="icon-button" type="button" data-action="edit-category" data-id="${escapeHTML(c.id)}" aria-label="Edit ${escapeHTML(c.name)}">${icon('edit')}</button><button class="icon-button danger-action" type="button" data-action="delete-category" data-id="${escapeHTML(c.id)}" aria-label="Hapus ${escapeHTML(c.name)}">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>`;
}
function openCategoryModal(category = null) {
  editingCategoryId = category?.id || '';
  const modal = $('#admin-modal');
  modal.innerHTML = `<div class="admin-modal-header"><div><h2 id="modal-title">${category ? 'Edit kategori' : 'Tambah kategori'}</h2><p>Nama kategori harus sesuai dengan struktur katalog toko.</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Tutup">${icon('close')}</button></div><form id="category-form"><div class="admin-modal-body"><label class="field"><span>Nama kategori *</span><input name="name" required minlength="1" maxlength="60" value="${escapeHTML(category?.name || '')}" placeholder="Nama kategori"></label><label class="field" style="margin-top:14px"><span>Warna aksen (opsional)</span><select name="color"><option value="blue" ${category?.color==='blue'?'selected':''}>Biru</option><option value="violet" ${category?.color==='violet'?'selected':''}>Violet</option><option value="mint" ${category?.color==='mint'?'selected':''}>Mint</option><option value="peach" ${category?.color==='peach'?'selected':''}>Peach</option><option value="cyan" ${category?.color==='cyan'?'selected':''}>Cyan</option></select></label><div class="form-error-list" id="category-errors" hidden></div></div><div class="admin-modal-footer"><button class="btn btn-secondary" type="button" data-action="close-modal">Batal</button><button class="btn btn-primary" type="submit">Simpan kategori</button></div></form>`;
  if (modal.showModal) modal.showModal(); else modal.setAttribute('open','');
  $('#category-form').addEventListener('submit', e => {
    e.preventDefault(); const form=e.currentTarget; if(!form.reportValidity())return;
    const result = saveCategory(Object.fromEntries(new FormData(form)), editingCategoryId);
    if (!result.ok) { const box=$('#category-errors'); box.textContent=result.error; box.hidden=false; return; }
    closeModal(); renderAll(); navigateAdmin('categories');
  });
}
function handleDeleteCategory(id) {
  const category = readCategories().find(c=>c.id===id); if(!category) {notify('Kategori tidak ditemukan.','error');return;}
  if(!window.confirm(`Hapus kategori "${category.name}"?`))return;
  const result=deleteCategory(id); if(!result.ok){notify(result.error,'warning');return;} renderAll();
}
function closeModal() { const modal=$('#admin-modal'); if(modal.open && modal.close)modal.close(); else modal.removeAttribute('open'); }
$('#admin-modal').addEventListener('click', e => { if(e.target === $('#admin-modal'))closeModal(); });

function renderOrdersTable() {
  const search=String($('#order-search')?.value||'').trim().toLocaleLowerCase('id-ID'); const status=$('#order-status-filter')?.value||'all';
  let orders=readOrders().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(search)orders=orders.filter(o=>`${o.id} ${o.customer?.name||''} ${o.customer?.phone||''}`.toLocaleLowerCase('id-ID').includes(search));
  if(status!=='all')orders=orders.filter(o=>(o.status||'Disiapkan lokal')===status);
  if(!orders.length){$('#orders-table').innerHTML=adminEmpty(readOrders().length?'Tidak ada pesanan yang cocok':'Belum ada pesanan lokal',readOrders().length?'Coba ubah pencarian atau filter.':'Pesanan hanya akan terlihat di sini jika dibuat/disimpan pada browser ini. Checkout pembeli dari perangkat lain tidak otomatis tersinkron.');return;}
  const statuses=['Disiapkan lokal','Dalam proses','Selesai lokal','Dibatalkan lokal'];
  $('#orders-table').innerHTML=`<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Referensi / tanggal</th><th>Pembeli</th><th>Rincian</th><th>Total</th><th>Status lokal</th><th>Aksi</th></tr></thead><tbody>${orders.map(o=>`<tr><td><span class="table-title">${escapeHTML(o.id)}</span><div class="table-subtitle">${formatDate(o.createdAt)}</div></td><td><span class="table-title">${escapeHTML(o.customer?.name||'Pembeli')}</span><div class="table-subtitle">${escapeHTML(o.customer?.phone||'')}</div></td><td>${(o.items||[]).length} item</td><td class="price-strong">${formatMoney(o.total)}</td><td><select class="control order-status-select" data-order-status="${escapeHTML(o.id)}" aria-label="Status pesanan ${escapeHTML(o.id)}">${statuses.map(s=>`<option value="${s}" ${(o.status||'Disiapkan lokal')===s?'selected':''}>${s}</option>`).join('')}</select></td><td><div class="table-actions"><button class="icon-button" type="button" data-action="view-order" data-id="${escapeHTML(o.id)}" aria-label="Lihat rincian pesanan" title="Rincian">${icon('info')}</button><button class="icon-button danger-action" type="button" data-action="delete-order" data-id="${escapeHTML(o.id)}" aria-label="Hapus pesanan" title="Hapus">${icon('trash')}</button></div></td></tr>`).join('')}</tbody></table></div>`;
  $$('[data-order-status]').forEach(select=>select.addEventListener('change',()=>updateOrderStatus(select.dataset.orderStatus,select.value)));
}
$('#order-search').addEventListener('input',renderOrdersTable);
$('#order-status-filter').addEventListener('change',renderOrdersTable);
function updateOrderStatus(id,status) {
  const allowed=['Disiapkan lokal','Dalam proses','Selesai lokal','Dibatalkan lokal'];
  if(!allowed.includes(status)){notify('Status tidak dikenal.','error');return;}
  const orders=readOrders(); const order=orders.find(o=>o.id===id); if(!order)return;
  order.status=status; order.updatedAt=new Date().toISOString();
  if(!safeWrite(KEYS.orders,orders)){notify('Status pesanan gagal disimpan.','error');return;}
  notify('Status lokal pesanan diperbarui.');renderStats();
}

function handleViewOrder(id) {
  const order=readOrders().find(item=>item.id===id);
  if(!order){notify('Catatan pesanan tidak ditemukan.','error');return;}
  const modal=$('#admin-modal');
  modal.innerHTML=`<div class="admin-modal-header"><div><h2 id="modal-title">Rincian pesanan</h2><p>${escapeHTML(order.id)} · ${formatDate(order.createdAt)}</p></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Tutup">${icon('close')}</button></div><div class="admin-modal-body"><div class="order-detail-buyer"><strong>${escapeHTML(order.customer?.name||'Pembeli')}</strong><span>${escapeHTML(order.customer?.phone||'Nomor tidak tersedia')}</span>${order.customer?.address?`<p>${escapeHTML(order.customer.address)}</p>`:''}${order.customer?.note?`<p>Catatan: ${escapeHTML(order.customer.note)}</p>`:''}</div><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${order.items.map(item=>`<tr><td>${escapeHTML(item.name||'Produk')}</td><td>${Number(item.quantity)||0}</td><td>${formatMoney(item.price)}</td><td class="price-strong">${formatMoney(item.subtotal)}</td></tr>`).join('')}</tbody></table></div><div class="summary-line"><span>Subtotal produk</span><strong>${formatMoney(order.subtotal)}</strong></div>${Number(order.additionalCost)>0?`<div class="summary-line"><span>Biaya tambahan</span><strong>${formatMoney(order.additionalCost)}</strong></div>`:''}<div class="summary-line total-line"><span>Total lokal</span><strong>${formatMoney(order.total)}</strong></div><div class="notice notice-warning">${icon('shield-info')}<span>Status ini adalah catatan lokal dan bukan bukti pembayaran atau konfirmasi pesanan dari toko.</span></div></div><div class="admin-modal-footer"><button class="btn btn-secondary" type="button" data-action="close-modal">Tutup</button></div>`;
  if(modal.showModal)modal.showModal();else modal.setAttribute('open','');
}

function handleDeleteOrder(id) {
  const order=readOrders().find(o=>o.id===id);if(!order)return;
  if(!window.confirm(`Hapus catatan pesanan ${order.id} dari browser ini?`))return;
  if(!safeWrite(KEYS.orders,readOrders().filter(o=>o.id!==id))){notify('Pesanan gagal dihapus.','error');return;}
  notify('Catatan pesanan lokal dihapus.');renderAll();
}

function fillSettingsForm() {
  const settings=readSettings(); const form=$('#settings-form');
  for(const field of ['storeName','description','whatsapp','bannerTitle','bannerDescription','promotionText','shippingInfo','paymentInstructions','additionalCost']) form.elements[field].value=settings[field] ?? (field==='additionalCost'?0:'');
  const chosen=new Set(Array.isArray(settings.featuredCategoryIds)?settings.featuredCategoryIds:[]);
  const categories=readCategories();
  $('#featured-categories-settings').innerHTML=categories.length
    ? categories.map(category=>`<label class="featured-category-choice"><input type="checkbox" name="featuredCategoryIds" value="${escapeHTML(category.id)}" ${chosen.has(category.id)?'checked':''}><span>${escapeHTML(category.name)}</span></label>`).join('')
    : '<p class="help-text">Belum ada kategori. Buat kategori di menu Kategori terlebih dahulu.</p>';
}
$('#settings-form').addEventListener('submit', e => {
  e.preventDefault(); const form=e.currentTarget;if(!form.reportValidity())return;
  const data=Object.fromEntries(new FormData(form));
  const additionalCost=Number(data.additionalCost);
  if(!Number.isFinite(additionalCost)||additionalCost<0){notify('Biaya tambahan harus nol atau lebih.','error');return;}
  const prev=readSettings(); const selectedCategories=$$('#featured-categories-settings input[name="featuredCategoryIds"]:checked').map(input=>input.value); const knownCategoryIds=new Set(readCategories().map(category=>category.id)); const next={...DEFAULT_SETTINGS,...prev,...data,additionalCost,featuredCategoryIds:selectedCategories.filter(id=>knownCategoryIds.has(id))};
  next.storeName='ZEN STORE';
  if(!safeWrite(KEYS.settings,next)){notify('Pengaturan gagal disimpan di browser.','error');return;}
  notify('Pengaturan toko berhasil disimpan.');renderAll();
});

function downloadJSON(data,filename) {
  let url='';
  try { const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();return true; }
  catch(error){console.error(error);notify('Berkas JSON tidak bisa dibuat pada browser ini.','error');return false;}
  finally {if(url)window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
}
$('#export-data').addEventListener('click',()=>{const bundle=exportBundle();if(downloadJSON(bundle,`zen-store-backup-${new Date().toISOString().slice(0,10)}.json`))notify('Berkas JSON berhasil disiapkan untuk diunduh.');});
$('#import-data').addEventListener('click',async()=>{
  const file=$('#import-file').files?.[0];if(!file){notify('Pilih berkas JSON terlebih dahulu.','warning');return;}
  if(file.size>10*1024*1024){notify('Ukuran berkas lebih dari 10 MB.','error');return;}
  let bundle;try{bundle=JSON.parse(await file.text());}catch{notify('Isi berkas bukan JSON yang valid. Data lama tidak diubah.','error');return;}
  const validation=validateImportBundle(bundle);
  if(!validation.valid){notify(`Impor ditolak: ${validation.errors.slice(0,3).join(' ')}`,'error');return;}
  const data=validation.data;
  const message=`Ganti data lokal saat ini dengan isi backup?\n\nProduk: ${data.products.length}\nKategori: ${data.categories.length}\nPesanan lokal: ${data.orders.length}\n\nData lama akan diganti jika impor berhasil. Kredensial admin tidak akan diubah.`;
  if(!window.confirm(message))return;
  if(!applyImportData(data)){notify('Impor gagal. Data sebelumnya dicoba dipulihkan.','error');return;}
  $('#import-file').value='';notify('Impor data berhasil.');renderAll();navigateAdmin('dashboard');
});

function renderAll() {
  renderStats();
  if(activeAdminView==='products')renderProductsTable();
  if(activeAdminView==='categories')renderCategoriesTable();
  if(activeAdminView==='orders')renderOrdersTable();
  if(activeAdminView==='settings')fillSettingsForm();
}
window.addEventListener('storage', e=>{if(!e.key||Object.values(KEYS).includes(e.key))renderAll();});

const existingSession=sessionStorage.getItem('zen_store_admin_session');
const savedAuth=safeRead(KEYS.adminAuth,null);
if(existingSession && savedAuth && existingSession===savedAuth.username) showDashboard(existingSession);
else showAuth();

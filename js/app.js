import { KEYS, DEFAULT_SETTINGS, readProducts, readCategories, readSettings, readCart, readWishlist, readOrders, safeRead, safeWrite, escapeHTML, formatMoney, formatDate, safeImageURL, notify } from './storage.js';
import { addToCart, setCartQuantity, removeFromCart, getCartDetails } from './cart.js';
import { getWishlist, toggleWishlist, removeWishlist } from './wishlist.js';
import { getTheme, applyTheme, toggleTheme } from './theme.js';
import { createLocalOrder } from './checkout.js';

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
const SPRITE = './assets/icons/sprite.svg#';
const currentState = { view: 'home', query: '', categoryId: '', min: '', max: '', stock: 'all', discount: 'all', sort: 'newest' };
const icon = (name, size = '') => `<svg class="${size ? `icon ${size}` : 'icon'}" aria-hidden="true"><use href="${SPRITE}${name}"></use></svg>`;

function emptyState(title, description, actionLabel = 'Jelajahi katalog', action = 'catalog', compact = false) {
  return `<div class="empty-state ${compact ? 'compact' : ''}"><div class="empty-art"><img src="./assets/images/catalog-empty.svg" alt="" loading="lazy"></div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${actionLabel ? `<button class="button button-primary" data-go="${escapeHTML(action)}">${escapeHTML(actionLabel)} ${icon('arrow-right')}</button>` : ''}</div>`;
}
function safeProductImage(product, className = '') {
  const source = safeImageURL(product.image || '');
  return source ? `<img class="${className}" src="${escapeHTML(source)}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.hidden=true;this.parentElement.classList.add('image-fallback')">` : `<span class="product-placeholder">${icon('package', 'icon-lg')}</span>`;
}
function imageMarkup(product) {
  const source = safeImageURL(product.image || '');
  return source ? `<img src="${escapeHTML(source)}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.hidden=true">` : `<span class="product-placeholder">${icon('package', 'icon-lg')}</span>`;
}
function effectivePrice(product) {
  const discount = Number(product.discountPrice);
  return Number.isFinite(discount) && discount > 0 && discount < Number(product.price) ? discount : Number(product.price);
}
function displayPrice(product) {
  const actual = effectivePrice(product);
  const old = Number(product.price);
  return `${formatMoney(actual)}${actual < old ? ` <span class="old-price">${formatMoney(old)}</span>` : ''}`;
}
function publishedProducts() { return readProducts().filter(p => p.published === true); }
function categoryListMarkup(category, index = 0) {
  const themes = ['tone-blue', 'tone-violet', 'tone-peach', 'tone-mint', 'tone-pink', 'tone-cyan'];
  const n = ['grid', 'layers', 'sparkles', 'tag', 'package', 'star'][index % 6];
  const count = publishedProducts().filter(p => p.categoryId === category.id).length;
  return `<button type="button" class="category-tile ${themes[index % themes.length]}" data-category-pick="${escapeHTML(category.id)}"><span class="category-tile-icon">${icon(n)}</span><span class="category-tile-info"><strong>${escapeHTML(category.name)}</strong><small>${count} produk</small></span>${icon('arrow-up-right', 'icon-sm')}</button>`;
}
function productCard(product) {
  const cat = readCategories().find(c => c.id === product.categoryId)?.name || 'Tanpa kategori';
  const wished = getWishlist().includes(product.id);
  const available = Number(product.stock) > 0;
  const discount = effectivePrice(product) < Number(product.price);
  return `<article class="product-card" data-product-card="${escapeHTML(product.id)}"><div class="product-image" data-open-product="${escapeHTML(product.id)}" role="button" tabindex="0" aria-label="Lihat detail ${escapeHTML(product.name)}">${imageMarkup(product)}${discount ? '<span class="product-flag">Harga diskon</span>' : ''}</div><button type="button" class="wishlist-toggle ${wished ? 'is-active' : ''}" data-wishlist="${escapeHTML(product.id)}" aria-label="${wished ? 'Hapus dari' : 'Simpan ke'} wishlist" aria-pressed="${wished}">${icon('heart')}</button><div class="product-info"><span class="product-category">${escapeHTML(cat)}</span><h3><button class="product-title-button" data-open-product="${escapeHTML(product.id)}">${escapeHTML(product.name)}</button></h3><p class="product-description">${escapeHTML(product.description || 'Deskripsi produk belum diisi.')}</p><div class="product-price">${displayPrice(product)}</div><div class="product-meta"><span class="${available ? 'stock-available' : 'stock-empty'}">${available ? `Stok ${Number(product.stock)}` : 'Stok habis'}</span><span>${product.variants?.length ? `${product.variants.length} varian` : 'Produk katalog'}</span></div><div class="product-actions"><button class="button button-light" data-open-product="${escapeHTML(product.id)}">Detail</button><button class="button button-primary" data-add-cart="${escapeHTML(product.id)}" ${available ? '' : 'disabled'}>${icon('bag')} Tambah</button></div></div></article>`;
}
function renderProductGrid(containerId, products, opts = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = products.length ? products.map(productCard).join('') : emptyState(opts.title || 'Belum Ada Produk', opts.description || 'Produk akan tampil di sini setelah pengelola menambah katalog. Belum ada produk palsu yang ditambahkan.', opts.actionLabel === undefined ? 'Jelajahi katalog' : opts.actionLabel, opts.action || 'catalog', opts.compact ?? true);
}
function filterProducts() {
  let products = publishedProducts();
  const query = currentState.query.trim().toLocaleLowerCase('id-ID');
  if (query) products = products.filter(p => `${p.name} ${p.description || ''} ${readCategories().find(c => c.id === p.categoryId)?.name || ''}`.toLocaleLowerCase('id-ID').includes(query));
  if (currentState.categoryId) products = products.filter(p => p.categoryId === currentState.categoryId);
  if (currentState.min !== '' && Number.isFinite(Number(currentState.min))) products = products.filter(p => effectivePrice(p) >= Number(currentState.min));
  if (currentState.max !== '' && Number.isFinite(Number(currentState.max))) products = products.filter(p => effectivePrice(p) <= Number(currentState.max));
  if (currentState.stock === 'available') products = products.filter(p => Number(p.stock) > 0);
  if (currentState.stock === 'out') products = products.filter(p => Number(p.stock) <= 0);
  if (currentState.discount === 'discount') products = products.filter(p => effectivePrice(p) < Number(p.price));
  const dateValue = p => new Date(p.createdAt || 0).getTime() || 0;
  if (currentState.sort === 'newest') products.sort((a,b) => dateValue(b) - dateValue(a));
  if (currentState.sort === 'price-low') products.sort((a,b) => effectivePrice(a) - effectivePrice(b));
  if (currentState.sort === 'price-high') products.sort((a,b) => effectivePrice(b) - effectivePrice(a));
  if (currentState.sort === 'name') products.sort((a,b) => a.name.localeCompare(b.name, 'id'));
  return products;
}
function populateCategoryFilters() {
  const select = $('#filter-category');
  if (!select) return;
  const chosen = select.value;
  select.innerHTML = '<option value="">Semua kategori</option>' + readCategories().map(c => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)}</option>`).join('');
  if (readCategories().some(c => c.id === chosen)) select.value = chosen;
}
function renderCatalog() {
  populateCategoryFilters();
  if ($('#catalog-search')) $('#catalog-search').value = currentState.query;
  if ($('#filter-category')) $('#filter-category').value = currentState.categoryId;
  if ($('#filter-min')) $('#filter-min').value = currentState.min;
  if ($('#filter-max')) $('#filter-max').value = currentState.max;
  if ($('#filter-stock')) $('#filter-stock').value = currentState.stock;
  if ($('#filter-discount')) $('#filter-discount').value = currentState.discount;
  if ($('#filter-sort')) $('#filter-sort').value = currentState.sort;
  const products = filterProducts();
  $('#catalog-result-count').textContent = `${products.length} produk ditemukan`;
  $('#catalog-grid').innerHTML = products.length ? products.map(productCard).join('') : emptyState(currentState.query || currentState.categoryId ? 'Tidak Ada Hasil yang Cocok' : 'Belum Ada Produk', currentState.query || currentState.categoryId ? 'Coba ubah kata pencarian atau reset filter untuk melihat hasil lain.' : 'Katalog ini akan terisi setelah admin menambahkan produk melalui dashboard.', currentState.query || currentState.categoryId ? 'Reset filter' : 'Kembali ke beranda', currentState.query || currentState.categoryId ? 'reset-filters' : 'home', false);
}
function renderCategories() {
  const categories = readCategories();
  const settings = readSettings();
  const featuredIds = new Set(settings.featuredCategoryIds || []);
  const featured = categories.filter(category => featuredIds.has(category.id));
  $('#home-category-tiles').innerHTML = featured.length
    ? featured.map(categoryListMarkup).join('')
    : categories.length
      ? emptyState('Kategori Unggulan Belum Dipilih', 'Pengelola dapat memilih kategori unggulan melalui pengaturan admin. Semua kategori tetap tersedia di halaman kategori.', 'Lihat semua kategori', 'categories', true)
      : emptyState('Belum Ada Kategori', 'Kategori akan muncul setelah pengelola toko menambahkannya di dashboard admin. Tidak ada kategori contoh yang dibuat otomatis.', 'Lihat katalog', 'catalog', true);
  $('#all-category-tiles').innerHTML = categories.length
    ? categories.map(categoryListMarkup).join('')
    : emptyState('Belum Ada Kategori', 'Kategori akan muncul setelah pengelola toko menambahkannya di dashboard admin. Tidak ada kategori contoh yang dibuat otomatis.', 'Lihat katalog', 'catalog', false);
}
function renderHome() {
  const settings = readSettings();
  const title = $('.hero-content h1'); const paragraph = $('.hero-content > p');
  const aboutDescription = $('#view-about .page-intro p');
  if (aboutDescription && settings.description && settings.description !== DEFAULT_SETTINGS.description) aboutDescription.textContent = settings.description;
  if (title && settings.bannerTitle && settings.bannerTitle !== DEFAULT_SETTINGS.bannerTitle) title.textContent = settings.bannerTitle;
  if (paragraph && settings.bannerDescription && settings.bannerDescription !== DEFAULT_SETTINGS.bannerDescription) paragraph.textContent = settings.bannerDescription;
  const promo = $('.hero-content .eyebrow');
  if (promo && settings.promotionText) promo.textContent = settings.promotionText;
  renderCategories();
  const products = publishedProducts().sort((a,b) => (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0)));
  renderProductGrid('home-latest-grid', products.slice(0, 3), { title: 'Belum Ada Produk Terbaru', description: 'Produk terbaru akan muncul di bagian ini ketika tersedia di katalog.', compact: true });
  renderProductGrid('home-featured-grid', products.filter(p => p.featured).slice(0, 3), { title: 'Belum Ada Produk Pilihan', description: 'Produk yang ditandai sebagai pilihan oleh pengelola akan ditampilkan di sini.', compact: true });
}
function renderViews() {
  renderHome(); renderCatalog();
  const products = publishedProducts().sort((a,b) => (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0)));
  renderProductGrid('new-grid', products, { title: 'Belum Ada Produk Terbaru', description: 'Belum ada produk yang diterbitkan oleh pengelola.', compact: false });
  renderProductGrid('featured-grid', products.filter(p => p.featured), { title: 'Belum Ada Produk Pilihan', description: 'Pengelola belum menandai produk sebagai produk pilihan.', compact: false });
  const wishIds = new Set(getWishlist());
  renderProductGrid('wishlist-grid', products.filter(p => wishIds.has(p.id)), { title: 'Wishlist Masih Kosong', description: 'Simpan produk dari katalog menggunakan ikon hati; produk yang dihapus dari katalog tidak lagi ditampilkan.', compact: false });
  renderCart(); renderCheckout(); renderOrders(); updateCounts(); renderThemeChoices();
}
const VIEW_LABELS = { home:'Beranda', catalog:'Semua Produk', categories:'Kategori', new:'Produk Terbaru', featured:'Produk Pilihan', wishlist:'Wishlist', cart:'Keranjang', checkout:'Checkout', orders:'Riwayat Pesanan', about:'Tentang ZEN STORE', appearance:'Pengaturan Tampilan' };
function navigate(view, opts = {}) {
  if (!VIEW_LABELS[view]) view = 'home';
  currentState.view = view;
  $$('.view-section').forEach(s => { const active = s.dataset.section === view; s.classList.toggle('active', active); s.hidden = !active; });
  $$('#store-nav .nav-item').forEach(item => { const active = item.dataset.view === view; item.classList.toggle('active', active); if (active) item.setAttribute('aria-current','page'); else item.removeAttribute('aria-current'); });
  $('#current-page-label').textContent = VIEW_LABELS[view];
  if (view === 'catalog') renderCatalog();
  if (view === 'cart') renderCart();
  if (view === 'checkout') renderCheckout();
  if (view === 'orders') renderOrders();
  closeDrawer();
  if (!opts.noScroll) window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (view === 'catalog' && currentState.query) $('#catalog-search')?.focus({ preventScroll: true });
}
function updateCounts() {
  $('#nav-product-count').textContent = publishedProducts().length;
  $('#nav-wishlist-count').textContent = getWishlist().length;
  $('#nav-cart-count').textContent = getCartDetails().quantity;
}
function renderCart() {
  const cart = getCartDetails();
  if (!cart.items.length) {
    $('#cart-content').innerHTML = `<div class="cart-empty-layout">${emptyState('Keranjang Masih Kosong', 'Pilih produk yang tersedia dari katalog. Isi keranjang selalu disimpan secara lokal pada browser ini.', 'Jelajahi produk', 'catalog', false)}</div>`;
    return;
  }
  const settings = readSettings();
  const rows = cart.items.map(item => `<article class="cart-row"><div class="cart-product-image">${imageMarkup(item.product)}</div><div class="cart-product-main"><span class="product-category">${escapeHTML(readCategories().find(c=>c.id===item.product.categoryId)?.name || 'Tanpa kategori')}</span><h3>${escapeHTML(item.product.name)}</h3><p>${formatMoney(item.unitPrice)} per item · Stok ${Number(item.product.stock)}</p><div class="quantity-control"><button type="button" data-qty-dec="${escapeHTML(item.productId)}" aria-label="Kurangi jumlah">−</button><output>${item.quantity}</output><button type="button" data-qty-inc="${escapeHTML(item.productId)}" aria-label="Tambah jumlah" ${item.quantity >= Number(item.product.stock) ? 'disabled' : ''}>+</button></div></div><div class="cart-price-column"><strong>${formatMoney(item.subtotal)}</strong><button type="button" class="remove-cart" data-remove-cart="${escapeHTML(item.productId)}">Hapus</button></div></article>`).join('');
  const addCost = Math.max(0, Number(settings.additionalCost) || 0);
  $('#cart-content').innerHTML = `<div class="cart-layout"><div class="cart-lines-card"><div class="card-heading"><div><h2>Isi keranjang</h2><p>${cart.quantity} barang dari katalog aktual</p></div><button class="text-link remove-all-cart" id="clear-cart">Kosongkan</button></div>${rows}</div><aside class="cart-summary"><span class="section-kicker">RINGKASAN</span><h2>Ringkasan belanja</h2><div class="summary-line"><span>Subtotal produk</span><strong>${formatMoney(cart.total)}</strong></div>${addCost ? `<div class="summary-line"><span>Biaya tambahan konfigurasi toko</span><strong>${formatMoney(addCost)}</strong></div>` : ''}<div class="summary-line total-line"><span>Total sementara</span><strong>${formatMoney(cart.total + addCost)}</strong></div><p class="muted-small">Biaya kirim, metode pembayaran, dan biaya lain tidak diasumsikan jika belum dikonfigurasi.</p><button type="button" class="button button-primary button-wide" data-go="checkout">Lanjut ke checkout ${icon('arrow-right')}</button><button type="button" class="button button-light button-wide" data-go="catalog">Lanjut belanja</button></aside></div>`;
}
function renderCheckout() {
  const target = $('#checkout-content');
  if (!target) return;
  const cart = getCartDetails();
  if (!cart.items.length) {
    target.innerHTML = emptyState('Belum Bisa Checkout', 'Tambahkan produk yang tersedia ke keranjang sebelum mengisi checkout.', 'Buka katalog', 'catalog', false);
    return;
  }
  const settings = readSettings();
  const addCost = Math.max(0, Number(settings.additionalCost) || 0);
  target.innerHTML = `<form id="checkout-form" class="checkout-layout" novalidate><div class="checkout-form-card"><div class="card-heading"><div><span class="section-kicker">INFORMASI PEMESAN</span><h2>Detail pembeli</h2><p>Informasi ini akan masuk ke pesan WhatsApp untuk ditinjau sebelum dikirim.</p></div></div><div class="form-fields"><label class="form-field"><span>Nama lengkap <b>*</b></span><input name="name" autocomplete="name" required minlength="2" maxlength="100" placeholder="Nama pembeli"><small>Minimal 2 karakter.</small></label><label class="form-field"><span>Nomor WhatsApp pembeli <b>*</b></span><input name="phone" type="tel" autocomplete="tel" required minlength="8" maxlength="24" placeholder="Contoh: 08xxxxxxxxxx"><small>Nomor ini dicantumkan ke pesan untuk toko.</small></label><label class="form-field full"><span>Alamat / informasi pengiriman</span><textarea name="address" rows="3" maxlength="500" placeholder="Isi bila pengiriman memerlukan alamat"></textarea><small>${escapeHTML(settings.shippingInfo || 'Isi sesuai kebutuhan pengiriman. Metode dan ongkos kirim harus dikonfirmasi kepada toko.')}</small></label><label class="form-field full"><span>Catatan pesanan</span><textarea name="note" rows="3" maxlength="500" placeholder="Catatan tambahan (opsional)"></textarea></label></div><div class="notice ${settings.whatsapp ? '' : 'notice-warning'}">${icon('info')}<span>${settings.whatsapp ? 'Setelah validasi, website menyimpan catatan pesanan lokal dan membuka WhatsApp untuk kamu periksa dan kirim sendiri.' : 'Nomor WhatsApp toko belum dikonfigurasi. Checkout WhatsApp belum dapat dilanjutkan sampai pengelola mengaturnya.'}</span></div><button type="submit" class="button button-primary button-wide checkout-submit">Siapkan pesanan di WhatsApp ${icon('arrow-right')}</button></div><aside class="checkout-summary"><span class="section-kicker">RINGKASAN BELANJA</span><h2>Pesanan kamu</h2><div class="checkout-items">${cart.items.map(item=>`<div class="checkout-item"><div><strong>${escapeHTML(item.product.name)}</strong><small>${item.quantity} × ${formatMoney(item.unitPrice)}</small></div><b>${formatMoney(item.subtotal)}</b></div>`).join('')}</div><div class="summary-line"><span>Subtotal</span><strong>${formatMoney(cart.total)}</strong></div>${addCost ? `<div class="summary-line"><span>Biaya tambahan dikonfigurasi</span><strong>${formatMoney(addCost)}</strong></div>` : ''}<div class="summary-line total-line"><span>Total sementara</span><strong>${formatMoney(cart.total + addCost)}</strong></div><p class="muted-small">Harga dihitung dari data katalog aktual. Pembayaran dan pengiriman belum dikonfirmasi oleh toko.</p>${settings.paymentInstructions ? `<div class="notice">${icon('info')}<span><strong>Instruksi pembayaran dari toko:</strong> ${escapeHTML(settings.paymentInstructions)}</span></div>` : ''}</aside></form>`;
}
function renderOrders() {
  const target = $('#orders-content');
  if (!target) return;
  const orders = readOrders().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!orders.length) { target.innerHTML = emptyState('Belum Ada Riwayat Pesanan', 'Pesanan yang kamu siapkan di browser ini akan tercatat di sini. Catatan lokal ini tidak otomatis muncul di perangkat admin.', 'Jelajahi katalog', 'catalog', false); return; }
  target.innerHTML = `<div class="orders-note notice">${icon('shield-info')}<span>Riwayat di bawah hanya tersedia pada browser/perangkat ini. Untuk pesanan lintas perangkat dibutuhkan backend atau layanan sinkronisasi.</span></div><div class="orders-grid">${orders.map(order=>`<article class="order-card"><div class="order-card-header"><div><span class="section-kicker">${escapeHTML(order.id)}</span><h3>${escapeHTML(order.customer?.name || 'Pembeli')}</h3><small>${formatDate(order.createdAt)}</small></div><span class="status-badge">${escapeHTML(order.status || 'Disiapkan lokal')}</span></div><div class="order-items-summary">${(order.items||[]).map(item=>`<div><span>${escapeHTML(item.name)} × ${Number(item.quantity)||0}</span><b>${formatMoney(Number(item.subtotal)||0)}</b></div>`).join('')}</div><div class="order-card-footer"><span>Total sementara</span><strong>${formatMoney(order.total)}</strong></div><button type="button" class="button button-light button-wide" data-order-detail="${escapeHTML(order.id)}">Lihat rincian</button></article>`).join('')}</div>`;
}
function renderThemeChoices() {
  $$('[data-theme-choice]').forEach(button => {
    const selected = button.dataset.themeChoice === getTheme();
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  });
}
function openProduct(productId) {
  const product = publishedProducts().find(p => p.id === productId);
  if (!product) { notify('Produk sudah tidak tersedia di katalog.', 'warning'); renderViews(); return; }
  const dialog = $('#product-dialog');
  const cat = readCategories().find(c => c.id === product.categoryId)?.name || 'Tanpa kategori';
  const variants = Array.isArray(product.variants) && product.variants.length ? `<div class="detail-variants"><strong>Varian</strong><div>${product.variants.map(v=>`<span>${escapeHTML(v)}</span>`).join('')}</div></div>` : '';
  dialog.innerHTML = `<div class="product-dialog-inner"><button class="icon-button dialog-close" type="button" data-dialog-close aria-label="Tutup detail">${icon('close')}</button><div class="dialog-product-image">${imageMarkup(product)}</div><div class="dialog-product-info"><span class="product-category">${escapeHTML(cat)}</span><h2 id="detail-title">${escapeHTML(product.name)}</h2><div class="dialog-product-price">${displayPrice(product)}</div><p class="dialog-description">${escapeHTML(product.description || 'Deskripsi produk belum diisi oleh pengelola.')}</p><div class="detail-stock ${product.stock > 0 ? '' : 'stock-empty'}">${product.stock > 0 ? `${icon('check-circle')} Stok tersedia: ${Number(product.stock)}` : `${icon('info')} Stok sedang habis`}</div>${variants}<label class="form-field detail-quantity"><span>Jumlah</span><input id="detail-quantity" type="number" min="1" max="${Math.max(1, Number(product.stock)||1)}" value="1" ${product.stock > 0 ? '' : 'disabled'}></label><div class="dialog-actions"><button class="button button-primary" data-detail-add="${escapeHTML(product.id)}" ${product.stock > 0 ? '' : 'disabled'}>${icon('bag')} Tambah ke keranjang</button><button class="button button-light" data-wishlist="${escapeHTML(product.id)}">${icon('heart')} Wishlist</button></div><p class="detail-note">Harga dan stok mengikuti data katalog yang saat ini tersimpan di browser.</p></div></div>`;
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open','');
  dialog.querySelector('[data-dialog-close]').focus();
}
function closeProductDialog() { const dialog = $('#product-dialog'); if (dialog.open && dialog.close) dialog.close(); else dialog.removeAttribute('open'); }
function openDrawer() { $('#store-sidebar').classList.add('is-open'); $('#store-overlay').hidden = false; $('#store-overlay').classList.add('is-visible'); $('#store-menu').setAttribute('aria-expanded','true'); $('#store-close').focus(); }
function closeDrawer() { $('#store-sidebar').classList.remove('is-open'); $('#store-overlay').classList.remove('is-visible'); $('#store-overlay').hidden = true; $('#store-menu').setAttribute('aria-expanded','false'); }
function resetFilters() { Object.assign(currentState,{ query:'',categoryId:'',min:'',max:'',stock:'all',discount:'all',sort:'newest' }); if ($('#global-search')) $('#global-search').value=''; renderCatalog(); }
function handleSubmitCheckout(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const result = createLocalOrder(data);
  if (!result.ok) { notify(result.error, 'error', 'Checkout belum dapat dilanjutkan'); return; }
  notify(`Catatan lokal ${result.order.id} dibuat. WhatsApp akan terbuka untuk kamu periksa.`, 'success', 'Pesanan disiapkan');
  result.clearCart(true); renderViews(); navigate('orders');
  const popup = window.open(result.url, '_blank');
  if (popup) popup.opener = null;
  else { notify('Browser memblokir jendela WhatsApp. Buka riwayat pesanan dan izinkan jendela baru untuk mencoba lagi.', 'warning'); }
}
function showOrderDetail(orderId) {
  const order = readOrders().find(x => x.id === orderId);
  if (!order) { notify('Pesanan tidak ditemukan pada browser ini.', 'error'); return; }
  const dialog = $('#product-dialog');
  dialog.innerHTML = `<div class="product-dialog-inner order-dialog-inner"><div class="modal-heading"><div><span class="section-kicker">RINCIAN LOKAL</span><h2 id="detail-title">${escapeHTML(order.id)}</h2><p>${formatDate(order.createdAt)}</p></div><button class="icon-button" type="button" data-dialog-close aria-label="Tutup">${icon('close')}</button></div><div class="order-detail-content"><div class="order-detail-buyer"><strong>${escapeHTML(order.customer?.name || 'Pembeli')}</strong><span>${escapeHTML(order.customer?.phone || '')}</span>${order.customer?.address ? `<p>${escapeHTML(order.customer.address)}</p>`:''}</div><div class="checkout-items">${order.items.map(item=>`<div class="checkout-item"><div><strong>${escapeHTML(item.name)}</strong><small>${Number(item.quantity)} × ${formatMoney(item.price)}</small></div><b>${formatMoney(item.subtotal)}</b></div>`).join('')}</div><div class="summary-line"><span>Subtotal</span><strong>${formatMoney(order.subtotal)}</strong></div>${order.additionalCost ? `<div class="summary-line"><span>Biaya tambahan</span><strong>${formatMoney(order.additionalCost)}</strong></div>` : ''}<div class="summary-line total-line"><span>Total</span><strong>${formatMoney(order.total)}</strong></div><p class="muted-small">Status ini merupakan catatan browser; tidak menjadi konfirmasi pembayaran atau penerimaan toko.</p></div></div>`;
  if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open','');
}

$('#store-nav').addEventListener('click', e => { const nav = e.target.closest('[data-view]'); if (nav) navigate(nav.dataset.view); });
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { const view = go.dataset.go; if (view === 'reset-filters') { resetFilters(); navigate('catalog'); } else navigate(view); return; }
  const viewButton = e.target.closest('[data-view]'); if (viewButton && !viewButton.closest('#store-nav')) { navigate(viewButton.dataset.view); return; }
  const picked = e.target.closest('[data-category-pick]');
  if (picked) { currentState.categoryId = picked.dataset.categoryPick; currentState.query=''; $('#global-search').value=''; navigate('catalog'); renderCatalog(); return; }
  const open = e.target.closest('[data-open-product]');
  if (open) { openProduct(open.dataset.openProduct); return; }
  const add = e.target.closest('[data-add-cart]');
  if (add) { if (addToCart(add.dataset.addCart,1)) { updateCounts(); if (currentState.view === 'cart') renderCart(); } return; }
  const detailAdd = e.target.closest('[data-detail-add]');
  if (detailAdd) { const qty = Number($('#detail-quantity')?.value || 1); if (addToCart(detailAdd.dataset.detailAdd,qty)) { updateCounts(); closeProductDialog(); } return; }
  const wish = e.target.closest('[data-wishlist]');
  if (wish) { toggleWishlist(wish.dataset.wishlist); const dialogOpen = $('#product-dialog').open; renderViews(); if (dialogOpen) openProduct(wish.dataset.wishlist); return; }
  const dec = e.target.closest('[data-qty-dec]'); if (dec) { const row = getCartDetails().items.find(x=>x.productId===dec.dataset.qtyDec); if (row) { if (row.quantity <= 1) removeFromCart(row.productId); else setCartQuantity(row.productId,row.quantity-1); renderCart(); updateCounts(); } return; }
  const inc = e.target.closest('[data-qty-inc]'); if (inc) { const row = getCartDetails().items.find(x=>x.productId===inc.dataset.qtyInc); if (row) { setCartQuantity(row.productId,row.quantity+1); renderCart(); updateCounts(); } return; }
  const remove = e.target.closest('[data-remove-cart]'); if (remove) { removeFromCart(remove.dataset.removeCart); renderCart(); updateCounts(); return; }
  const order = e.target.closest('[data-order-detail]'); if (order) { showOrderDetail(order.dataset.orderDetail); return; }
  const close = e.target.closest('[data-dialog-close]'); if (close) { closeProductDialog(); return; }
  const themeChoice = e.target.closest('[data-theme-choice]'); if (themeChoice) { applyTheme(themeChoice.dataset.themeChoice); renderThemeChoices(); return; }
  const themeToggle = e.target.closest('[data-theme-toggle],#store-theme-toggle'); if (themeToggle) { toggleTheme(); renderThemeChoices(); return; }
});
$('#store-menu').addEventListener('click', openDrawer);
$('#store-close').addEventListener('click', closeDrawer);
$('#store-overlay').addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); if (e.key === 'Enter' && e.target.matches('[data-open-product][role=button]')) openProduct(e.target.dataset.openProduct); });
$('#global-search-form').addEventListener('submit', e => { e.preventDefault(); currentState.query = $('#global-search').value.trim(); currentState.categoryId = ''; navigate('catalog'); renderCatalog(); });
$('#global-search').addEventListener('input', () => { if (!$('#global-search').value.trim() && currentState.view !== 'catalog') return; currentState.query = $('#global-search').value; currentState.categoryId = ''; navigate('catalog',{noScroll:true}); renderCatalog(); });
$('#catalog-search').addEventListener('input', e => { currentState.query = e.target.value; $('#global-search').value = currentState.query; renderCatalog(); });
[['filter-category','categoryId'],['filter-min','min'],['filter-max','max'],['filter-stock','stock'],['filter-discount','discount'],['filter-sort','sort']].forEach(([id,key])=>document.getElementById(id).addEventListener('change',e=>{currentState[key]=e.target.value;renderCatalog();}));
$('#filter-min').addEventListener('input',e=>{currentState.min=e.target.value;renderCatalog();});
$('#filter-max').addEventListener('input',e=>{currentState.max=e.target.value;renderCatalog();});
$('#reset-filters').addEventListener('click',resetFilters);
$('#checkout-content').addEventListener('submit',e=>{if(e.target.id==='checkout-form'){e.preventDefault();if(!e.target.reportValidity()) return; handleSubmitCheckout(e.target);}});
document.addEventListener('click', e => { if (e.target.closest('#clear-cart')) { if (window.confirm('Kosongkan semua isi keranjang?')) { safeWrite(KEYS.cart,[]); renderCart(); updateCounts(); notify('Keranjang dikosongkan.'); } } });
$('#product-dialog').addEventListener('click', e => { if (e.target === $('#product-dialog')) closeProductDialog(); });
window.addEventListener('storage', e => { if (!e.key || Object.values(KEYS).includes(e.key)) renderViews(); });
window.addEventListener('pageshow', () => { renderViews(); });
$$('[data-current-year]').forEach(el => el.textContent = new Date().getFullYear());
applyTheme(getTheme());
renderViews();
navigate('home',{noScroll:true});

// State
let cart = JSON.parse(localStorage.getItem('maison_cart') || '[]');
let currentFilter = 'all';

// ─── Render Helpers ───────────────────────────────────────────

function colorSwatch(color) {
  return `<span class="swatch" style="background:${color}" title="${color}"></span>`;
}

function productCard(product) {
  return `
    <article class="product-card" data-id="${product.id}" onclick="openModal(${product.id})">
      <div class="product-card__img">
        <div class="product-card__color-block" style="background:${product.color}"></div>
        ${product.isNew ? '<span class="badge">New</span>' : ''}
      </div>
      <div class="product-card__info">
        <div class="product-card__meta">
          <p class="product-card__category">${product.category}</p>
          ${colorSwatch(product.color)}
        </div>
        <h3 class="product-card__name">${product.name}</h3>
        <div class="product-card__footer">
          <span class="product-card__price">$${product.price}</span>
          <button class="add-btn" onclick="event.stopPropagation(); quickAdd(${product.id})">
            + Add
          </button>
        </div>
      </div>
    </article>`;
}

// ─── Grids ────────────────────────────────────────────────────

function renderNewGrid() {
  const newProducts = PRODUCTS.filter(p => p.isNew);
  document.getElementById('newGrid').innerHTML = newProducts.map(productCard).join('');
}

function renderCollectionGrid(filter = 'all') {
  const filtered = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);
  document.getElementById('collectionGrid').innerHTML = filtered.map(productCard).join('');
}

// ─── Filter ───────────────────────────────────────────────────

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderCollectionGrid(currentFilter);
  });
});

// ─── Modal ────────────────────────────────────────────────────

function openModal(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;

  const sizesHtml = p.sizes.map(s =>
    `<button class="size-btn" onclick="selectSize(this)">${s}</button>`
  ).join('');

  document.getElementById('modalContent').innerHTML = `
    <div class="modal__visual" style="background:${p.color}">
      ${p.isNew ? '<span class="badge">New</span>' : ''}
    </div>
    <div class="modal__details">
      <p class="modal__category">${p.category}</p>
      <h2>${p.name}</h2>
      <p class="modal__price">$${p.price}</p>
      <p class="modal__desc">${p.description}</p>
      <div class="modal__attr">
        <p><strong>Material:</strong> ${p.material}</p>
        <p><strong>Care:</strong> ${p.care}</p>
      </div>
      <div class="modal__sizes">
        <p class="modal__size-label">Select Size</p>
        <div class="size-grid">${sizesHtml}</div>
      </div>
      <button class="btn btn--dark btn--full" onclick="addToCart(${p.id})">Add to Bag — $${p.price}</button>
    </div>`;

  document.getElementById('productModal').classList.add('open');
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('productModal').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function selectSize(btn) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', closeModal);

// ─── Cart ─────────────────────────────────────────────────────

function addToCart(id) {
  const p = PRODUCTS.find(x => x.id === id);
  const selectedSize = document.querySelector('.size-btn.active');
  const size = selectedSize ? selectedSize.textContent : p.sizes[0];

  const existing = cart.find(i => i.id === id && i.size === size);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name: p.name, price: p.price, color: p.color, size, qty: 1 });
  }

  saveCart();
  updateCartCount();
  showToast(`${p.name} added to bag`);
  closeModal();
  openCart();
}

function quickAdd(id) {
  const p = PRODUCTS.find(x => x.id === id);
  const existing = cart.find(i => i.id === id && i.size === p.sizes[0]);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name: p.name, price: p.price, color: p.color, size: p.sizes[0], qty: 1 });
  }
  saveCart();
  updateCartCount();
  showToast(`${p.name} added to bag`);
}

function removeFromCart(id, size) {
  cart = cart.filter(i => !(i.id === id && i.size === size));
  saveCart();
  updateCartCount();
  renderCart();
}

function changeQty(id, size, delta) {
  const item = cart.find(i => i.id === id && i.size === size);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id, size);
  else { saveCart(); renderCart(); }
}

function saveCart() {
  localStorage.setItem('maison_cart', JSON.stringify(cart));
}

function updateCartCount() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cartCount');
  el.textContent = total;
  el.style.display = total > 0 ? 'flex' : 'none';
}

function renderCart() {
  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');

  if (cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
    footerEl.innerHTML = '';
    return;
  }

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item__swatch" style="background:${item.color}"></div>
      <div class="cart-item__info">
        <p class="cart-item__name">${item.name}</p>
        <p class="cart-item__size">Size: ${item.size}</p>
        <div class="cart-item__qty">
          <button onclick="changeQty(${item.id},'${item.size}',-1)">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${item.id},'${item.size}',1)">+</button>
        </div>
      </div>
      <div class="cart-item__right">
        <p class="cart-item__price">$${item.price * item.qty}</p>
        <button class="remove-btn" onclick="removeFromCart(${item.id},'${item.size}')">✕</button>
      </div>
    </div>`).join('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  footerEl.innerHTML = `
    <div class="cart-subtotal">
      <span>Subtotal</span>
      <span>$${subtotal}</span>
    </div>
    <p class="cart-shipping">${subtotal >= 150 ? '✓ Free shipping included' : `Add $${150 - subtotal} more for free shipping`}</p>
    <button class="btn btn--dark btn--full" onclick="checkout()">Proceed to Checkout</button>`;
}

function openCart() {
  renderCart();
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('cartToggle').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);

function checkout() {
  window.location.href = 'checkout.html';
}

// ─── Search ───────────────────────────────────────────────────

document.getElementById('searchToggle').addEventListener('click', () => {
  document.getElementById('searchBar').classList.add('open');
  document.getElementById('searchInput').focus();
});
document.getElementById('searchClose').addEventListener('click', () => {
  document.getElementById('searchBar').classList.remove('open');
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  if (!q) { renderCollectionGrid(currentFilter); return; }
  const results = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.colorName.toLowerCase().includes(q)
  );
  const grid = document.getElementById('collectionGrid');
  if (grid) grid.innerHTML = results.map(productCard).join('') || '<p class="no-results">No results found.</p>';
  document.getElementById('collection').scrollIntoView({ behavior: 'smooth' });
});

// ─── Nav scroll ───────────────────────────────────────────────

window.addEventListener('scroll', () => {
  const nav = document.getElementById('nav');
  nav.classList.toggle('scrolled', window.scrollY > 50);
});

// ─── Mobile menu ─────────────────────────────────────────────

document.getElementById('burger').addEventListener('click', () => {
  document.getElementById('mobileMenu').classList.toggle('open');
  document.getElementById('burger').classList.toggle('open');
});

function closeMobile() {
  document.getElementById('mobileMenu').classList.remove('open');
  document.getElementById('burger').classList.remove('open');
}

// ─── Toast ────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ─── Newsletter ───────────────────────────────────────────────

function handleNewsletterSubmit(e) {
  e.preventDefault();
  showToast('Thank you for subscribing!');
  e.target.reset();
}

// ─── Init ─────────────────────────────────────────────────────

renderNewGrid();
renderCollectionGrid();
updateCartCount();

// ─── State ────────────────────────────────────────────────────
let cart = JSON.parse(localStorage.getItem('maison_cart') || '[]');
let currentStep = 1;
let shippingCost = 9;
let discount = 0;
let selectedPayMethod = 'card';

const COUPONS = {
  'MAISON10': { type: 'percent', value: 10, label: '10% off' },
  'WELCOME20': { type: 'percent', value: 20, label: '20% off' },
  'FREESHIP':  { type: 'shipping', value: 0, label: 'Free shipping' },
  'SAVE25':    { type: 'fixed', value: 25, label: '$25 off' },
};

const SHIPPING_RATES = { standard: 9, express: 24, overnight: 45 };
const SHIPPING_NAMES = {
  standard: 'Standard (5–7 days)',
  express: 'Express (2–3 days)',
  overnight: 'Overnight'
};

// ─── Init ─────────────────────────────────────────────────────
(function init() {
  if (cart.length === 0) {
    document.querySelector('.co-left').innerHTML = `
      <div style="text-align:center;padding:80px 0">
        <p style="font-family:var(--font-display);font-size:1.8rem;margin-bottom:16px">Your bag is empty</p>
        <a href="index.html" class="btn btn--dark">Shop Now</a>
      </div>`;
    return;
  }
  renderSummary();
  checkFreeShipping();
  document.getElementById('standardPrice').textContent =
    subtotal() >= 150 ? 'Free' : '$9.00';
})();

// ─── Step Navigation ──────────────────────────────────────────
function goToStep(n) {
  if (n > currentStep && !validateStep(currentStep)) return;

  document.getElementById(`step-${currentStep}`).classList.remove('active');
  document.getElementById(`step-dot-${currentStep}`)?.classList.remove('active');
  document.getElementById(`step-dot-${currentStep}`)?.classList.add('done');
  if (currentStep < 4) {
    document.getElementById(`line-${currentStep}`)?.classList.add('done');
  }

  currentStep = n;
  const el = document.getElementById(`step-${currentStep}`);
  if (el) el.classList.add('active');

  const dot = document.getElementById(`step-dot-${currentStep}`);
  if (dot) { dot.classList.remove('done'); dot.classList.add('active'); }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (n === 4) buildReview();
}

// ─── Validation ───────────────────────────────────────────────
function validateStep(step) {
  if (step === 1) {
    const email = v('email'), first = v('firstName'), last = v('lastName');
    if (!email || !email.includes('@')) { shake('email'); showErr('Please enter a valid email.'); return false; }
    if (!first) { shake('firstName'); showErr('First name is required.'); return false; }
    if (!last) { shake('lastName'); showErr('Last name is required.'); return false; }
  }
  if (step === 2) {
    const addr = v('address'), city = v('city'), zip = v('zip');
    if (!addr) { shake('address'); showErr('Address is required.'); return false; }
    if (!city) { shake('city'); showErr('City is required.'); return false; }
    if (!zip) { shake('zip'); showErr('ZIP code is required.'); return false; }
  }
  if (step === 3) {
    if (selectedPayMethod === 'card') {
      const num = v('cardNumber').replace(/\s/g,'');
      const exp = v('expiry');
      const cvv = v('cvv');
      if (num.length < 15) { shake('cardNumber'); showErr('Please enter a valid card number.'); return false; }
      if (!exp || exp.length < 5) { shake('expiry'); showErr('Please enter a valid expiry date.'); return false; }
      if (!cvv || cvv.length < 3) { shake('cvv'); showErr('Please enter a valid CVV.'); return false; }
    }
  }
  if (step === 4) {
    if (!document.getElementById('agreeTerms').checked) {
      showErr('Please agree to the Terms of Service to proceed.'); return false;
    }
  }
  return true;
}

function v(id) { return (document.getElementById(id)?.value || '').trim(); }

function shake(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('error');
  el.addEventListener('input', () => el.classList.remove('error'), { once: true });
}

function showErr(msg) {
  // reuse toast from parent or fallback
  alert(msg);
}

// ─── Shipping ─────────────────────────────────────────────────
function updateShipping(radio) {
  const isFreeShip = discount === -1;
  shippingCost = isFreeShip ? 0 : SHIPPING_RATES[radio.value];
  renderTotals();
}

function checkFreeShipping() {
  if (subtotal() >= 150) {
    shippingCost = 0;
    document.getElementById('standardPrice').textContent = 'Free';
  }
}

// ─── Payment Method ───────────────────────────────────────────
function selectPayMethod(btn, method) {
  selectedPayMethod = method;
  document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('cardForm').classList.toggle('hidden', method !== 'card');
  document.getElementById('paypalPanel').classList.toggle('hidden', method !== 'paypal');
  document.getElementById('applepayPanel').classList.toggle('hidden', method !== 'applepay');
}

// ─── Card Formatting ──────────────────────────────────────────
function formatCard(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = val.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 2) val = val.substring(0, 2) + ' / ' + val.substring(2);
  input.value = val;
}

// ─── Review ───────────────────────────────────────────────────
function buildReview() {
  const name = `${v('firstName')} ${v('lastName')}`;
  const addr = [v('address'), v('apt'), v('city'), v('state'), v('zip'), v('country')].filter(Boolean).join(', ');
  const shippingMethod = document.querySelector('input[name="shipping"]:checked')?.value || 'standard';
  const payLabel = selectedPayMethod === 'card'
    ? `Card ending in ${v('cardNumber').slice(-4) || '••••'}`
    : selectedPayMethod === 'paypal' ? 'PayPal' : 'Apple Pay';

  document.getElementById('reviewContact').textContent = `${v('email')} · ${name}`;
  document.getElementById('reviewAddress').textContent = addr || '—';
  document.getElementById('reviewShipping').textContent = SHIPPING_NAMES[shippingMethod];
  document.getElementById('reviewPayment').textContent = payLabel;

  document.getElementById('reviewItems').innerHTML = cart.map(item => {
    const prod = PRODUCTS.find(p => p.id === item.id);
    return `
      <div class="review-item">
        <div class="review-item__swatch" style="background:${item.color}"></div>
        <div class="review-item__info">
          <p class="review-item__name">${item.name}</p>
          <p class="review-item__meta">Size: ${item.size} · Qty: ${item.qty}</p>
        </div>
        <p class="review-item__price">$${item.price * item.qty}</p>
      </div>`;
  }).join('');

  document.getElementById('placeOrderTotal').textContent = `$${grandTotal()}`;
}

// ─── Place Order ──────────────────────────────────────────────
function placeOrder() {
  if (!validateStep(4)) return;

  const btn = document.getElementById('placeOrderBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Processing…';

  // Simulate payment processing
  setTimeout(() => {
    const orderNum = 'MSN-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Clear cart
    localStorage.removeItem('maison_cart');
    cart = [];

    // Show success
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    ['step-dot-1','step-dot-2','step-dot-3','step-dot-4'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('active'); el.classList.add('done'); }
    });
    ['line-1','line-2','line-3'].forEach(id => {
      document.getElementById(id)?.classList.add('done');
    });

    document.getElementById('successEmail').textContent = v('email') || 'your email';
    document.getElementById('successOrderNum').textContent = orderNum;
    document.getElementById('step-success').classList.add('active');

    // Hide sidebar totals
    document.getElementById('summaryBody').classList.remove('open');
  }, 2200);
}

// ─── Summary Sidebar ──────────────────────────────────────────
function renderSummary() {
  document.getElementById('summaryItems').innerHTML = cart.map(item => `
    <div class="summary-item">
      <div class="summary-item__swatch" style="background:${item.color}">
        <span class="summary-item__qty">${item.qty}</span>
      </div>
      <div class="summary-item__info">
        <p class="summary-item__name">${item.name}</p>
        <p class="summary-item__size">Size: ${item.size}</p>
      </div>
      <p class="summary-item__price">$${item.price * item.qty}</p>
    </div>`).join('');

  renderTotals();
}

function renderTotals() {
  const sub = subtotal();
  const ship = sub >= 150 && discount !== -1 ? 0 : (discount === -1 ? 0 : shippingCost);
  const disc = discount > 0 ? Math.round(sub * discount / 100) : 0;
  const total = sub - disc + ship;

  let rows = `
    <div class="summary-row"><span>Subtotal</span><span>$${sub}</span></div>`;

  if (disc > 0)
    rows += `<div class="summary-row discount"><span>Discount</span><span>−$${disc}</span></div>`;
  if (discount === -1)
    rows += `<div class="summary-row discount"><span>Free Shipping Applied</span><span>−$${shippingCost}</span></div>`;
  if (discount === 25)
    rows += `<div class="summary-row discount"><span>Discount</span><span>−$25</span></div>`;

  rows += `<div class="summary-row"><span>Shipping</span><span>${ship === 0 ? 'Free' : '$' + ship}</span></div>`;
  rows += `<div class="summary-row total"><span>Total</span><span>$${Math.max(0, total)}</span></div>`;

  document.getElementById('summaryTotals').innerHTML = rows;
  document.getElementById('summaryTotal').textContent = `$${Math.max(0, total)}`;
}

function subtotal() {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

function grandTotal() {
  const sub = subtotal();
  const ship = sub >= 150 ? 0 : shippingCost;
  const disc = discount > 0 ? Math.round(sub * discount / 100) : (discount === 25 ? 25 : 0);
  return Math.max(0, sub - disc + ship);
}

// ─── Coupon ───────────────────────────────────────────────────
function applyCoupon() {
  const code = document.getElementById('couponInput').value.trim().toUpperCase();
  const msgEl = document.getElementById('couponMsg');
  const coupon = COUPONS[code];

  if (!coupon) {
    msgEl.textContent = 'Invalid or expired code.';
    msgEl.className = 'coupon-msg coupon-error';
    return;
  }

  if (coupon.type === 'percent') {
    discount = coupon.value;
  } else if (coupon.type === 'shipping') {
    discount = -1; shippingCost = 0;
  } else if (coupon.type === 'fixed') {
    discount = coupon.value; // special case
  }

  msgEl.textContent = `✓ ${coupon.label} applied!`;
  msgEl.className = 'coupon-msg coupon-success';
  renderTotals();
}

// ─── Mobile Summary Toggle ────────────────────────────────────
function toggleSummary() {
  document.getElementById('summaryBody').classList.toggle('open');
}

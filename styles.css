/***********************
 * Pedidos Barritas - Frontend (GitHub Pages)
 * Backend: Apps Script Web App
 ***********************/

const API_BASE = "https://script.google.com/macros/s/AKfycbxSvyw7GSgfzLvm14aKFZIBkP8qk46sG5ptWM2-9wcwZidyj50ZQuM5-zxBNR1We1gC/exec";
const MIN_TOTAL = 40000;

// Si queres un envio fijo en el frontend (el backend igual recalcula)
const FRONT_DELIVERY_FEE = 0;

// Reemplaza por TU numero WhatsApp en formato internacional sin + ni espacios (Argentina: 54911XXXXXXXX)
const YOUR_WHATSAPP_NUMBER = "54911XXXXXXXX";

let products = []; // {sku,name,price,stock}

/************ Utils ************/
function money(n) {
  return "$" + Number(n || 0).toLocaleString("es-AR");
}

function getDeliveryType() {
  const el = document.querySelector("input[name='deliveryType']:checked");
  return el ? el.value : "RETIRO";
}

/************ UI: Productos ************/
function renderProducts() {
  const box = document.getElementById("products");
  box.innerHTML = "";

  products.forEach((p) => {
    const lowStock = p.stock <= 10;

    const card = document.createElement("div");
    card.className = "productCard";

    card.innerHTML = `
      <div class="productInfo">
        <div class="productName">${escapeHtml_(p.name)}</div>
        <div class="productMeta">
          <span>${escapeHtml_(p.sku)}</span>
          <span class="price">${money(p.price)}</span>
          <span class="${lowStock ? "stockLow" : ""}">Stock: ${p.stock}</span>
        </div>
      </div>

      <div class="stepper">
        <button class="dec" data-sku="${escapeAttr_(p.sku)}" aria-label="Disminuir">−</button>
        <input class="qty qtyBox" data-sku="${escapeAttr_(p.sku)}" type="number" min="0" max="${p.stock}" value="0" inputmode="numeric" />
        <button class="inc" data-sku="${escapeAttr_(p.sku)}" aria-label="Aumentar">+</button>
      </div>
    `;

    box.appendChild(card);
  });

  // Eventos qty manual
  document.querySelectorAll(".qty").forEach((inp) => {
    inp.addEventListener("input", updateTotals);
    inp.addEventListener("change", updateTotals);
  });

  // Eventos stepper +
  document.querySelectorAll(".inc").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sku = btn.getAttribute("data-sku");
      const inp = document.querySelector(`.qty[data-sku="${cssEscape_(sku)}"]`);
      const p = products.find((x) => x.sku === sku);
      let v = Number(inp.value || 0);
      if (p && v < p.stock) inp.value = String(v + 1);
      updateTotals();
    });
  });

  // Eventos stepper -
  document.querySelectorAll(".dec").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sku = btn.getAttribute("data-sku");
      const inp = document.querySelector(`.qty[data-sku="${cssEscape_(sku)}"]`);
      let v = Number(inp.value || 0);
      if (v > 0) inp.value = String(v - 1);
      updateTotals();
    });
  });

  updateTotals();
}

function getItemsFromUI() {
  const items = [];
  document.querySelectorAll(".qty").forEach((inp) => {
    const sku = inp.getAttribute("data-sku");
    let qty = Number(inp.value || 0);
    if (qty < 0) qty = 0;

    const p = products.find((x) => x.sku === sku);
    if (!p) return;

    // Clamp stock
    if (qty > p.stock) {
      qty = p.stock;
      inp.value = String(qty);
    }

    if (qty > 0) items.push({ sku, qty });
  });
  return items;
}

/************ UI: Entrega ************/
function toggleAddress() {
  const deliveryType = getDeliveryType();
  const box = document.getElementById("addressBox");
  const pillRetiro = document.getElementById("pillRetiro");
  const pillEnvio = document.getElementById("pillEnvio");

  if (deliveryType === "ENVIO") {
    box.classList.remove("hidden");
    if (pillEnvio) pillEnvio.classList.add("active");
    if (pillRetiro) pillRetiro.classList.remove("active");
  } else {
    box.classList.add("hidden");
    if (pillRetiro) pillRetiro.classList.add("active");
    if (pillEnvio) pillEnvio.classList.remove("active");
  }

  updateTotals();
}

/************ Totales + Validacion ************/
function updateTotals() {
  const items = getItemsFromUI();
  let subtotal = 0;

  items.forEach((it) => {
    const p = products.find((x) => x.sku === it.sku);
    subtotal += p.price * it.qty;
  });

  const deliveryType = getDeliveryType();
  const deliveryFee = deliveryType === "ENVIO" ? FRONT_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  // Pintar resumen (desktop)
  const elSubtotal = document.getElementById("subtotal");
  const elDeliveryFee = document.getElementById("deliveryFee");
  const elTotal = document.getElementById("total");

  if (elSubtotal) elSubtotal.textContent = money(subtotal);
  if (elDeliveryFee) elDeliveryFee.textContent = money(deliveryFee);
  if (elTotal) elTotal.textContent = money(total);

  // Pintar total sticky (mobile, si existe)
  const totalSticky = document.getElementById("totalSticky");
  if (totalSticky) totalSticky.textContent = money(total);

  // Validacion minimo: mostrar error (desktop + sticky)
  const err = document.getElementById("error");
  const errSticky = document.getElementById("errorSticky");

  if (total > 0 && total < MIN_TOTAL) {
    const missing = MIN_TOTAL - total;
    const msg = `El minimo es ${money(MIN_TOTAL)}. Te faltan ${money(missing)}.`;

    if (err) {
      err.textContent = msg;
      err.classList.remove("hidden");
    }
    if (errSticky) {
      errSticky.textContent = msg;
      errSticky.classList.remove("hidden");
    }
  } else {
    if (err) err.classList.add("hidden");
    if (errSticky) errSticky.classList.add("hidden");
  }

  // Habilitar/deshabilitar botones segun minimo
  const submitBtn = document.getElementById("submitBtn");
  const submitBtnSticky = document.getElementById("submitBtnSticky");

  const canSubmit = total >= MIN_TOTAL && items.length > 0;

  if (submitBtn) submitBtn.disabled = !canSubmit;
  if (submitBtnSticky) submitBtnSticky.disabled = !canSubmit;
}

/************ API ************/
async function loadProducts() {
  const url = `${API_BASE}?path=products`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Failed to load products");
  products = data.data || [];
  renderProducts();
}

async function submitOrder() {
  const name = document.getElementById("customerName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const deliveryType = getDeliveryType();
  const address = document.getElementById("address").value.trim();
  const notes = document.getElementById("notes").value.trim();

  const items = getItemsFromUI();

  const err = document.getElementById("error");
  const errSticky = document.getElementById("errorSticky");
  const success = document.getElementById("success");
  const wa = document.getElementById("waLink");

  if (success) success.classList.add("hidden");
  if (wa) wa.classList.add("hidden");

  function showErr(msg) {
    if (err) {
      err.textContent = msg;
      err.classList.remove("hidden");
    }
    if (errSticky) {
      errSticky.textContent = msg;
      errSticky.classList.remove("hidden");
    }
  }

  if (!name || !email || !phone) {
    showErr("Completa nombre, email y telefono.");
    return;
  }
  if (deliveryType === "ENVIO" && !address) {
    showErr("Para envio, la direccion es obligatoria.");
    return;
  }
  if (items.length === 0) {
    showErr("Selecciona al menos 1 producto.");
    return;
  }

  // Recalcular total para validar minimo (backend valida de nuevo)
  let subtotal = 0;
  items.forEach((it) => {
    const p = products.find((x) => x.sku === it.sku);
    subtotal += p.price * it.qty;
  });
  const deliveryFee = deliveryType === "ENVIO" ? FRONT_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  if (total < MIN_TOTAL) {
    showErr(`El minimo es ${money(MIN_TOTAL)}.`);
    return;
  }

  // Limpiar error
  if (err) err.classList.add("hidden");
  if (errSticky) errSticky.classList.add("hidden");

  const payload = {
    customer: { name, email, phone },
    delivery: { type: deliveryType, address, notes },
    items
  };

  const res = await fetch(`${API_BASE}?path=order`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!data.ok) {
    showErr(data.error || "Error al enviar pedido.");
    return;
  }

  const orderId = data.data.orderId;
  const finalTotal = data.data.total;

  if (success) {
    success.textContent = `Pedido recibido (${orderId}). Total: ${money(finalTotal)}. Te vamos a enviar el link de pago.`;
    success.classList.remove("hidden");
  }

  // WhatsApp click-to-chat (gratis)
  if (wa && YOUR_WHATSAPP_NUMBER && !YOUR_WHATSAPP_NUMBER.includes("X")) {
    const msg = encodeURIComponent(
      `Hola! Hice un pedido ${orderId}. Total ${money(finalTotal)}. Mi nombre: ${name}.`
    );
    wa.href = `https://wa.me/${YOUR_WHATSAPP_NUMBER}?text=${msg}`;
    wa.textContent = "Enviar confirmacion por WhatsApp";
    wa.classList.remove("hidden");
  }
}

/************ Init ************/
document.addEventListener("DOMContentLoaded", async () => {
  // Radio change -> toggle address + pills
  document
    .querySelectorAll("input[name='deliveryType']")
    .forEach((r) => r.addEventListener("change", toggleAddress));

  // Botones confirmar
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.addEventListener("click", submitOrder);

  const submitBtnSticky = document.getElementById("submitBtnSticky");
  if (submitBtnSticky) submitBtnSticky.addEventListener("click", submitOrder);

  // Inicializar UI
  toggleAddress();

  try {
    await loadProducts();
  } catch (e) {
    const err = document.getElementById("error");
    if (err) {
      err.textContent = "No se pudieron cargar productos. Revisa el backend (API_BASE).";
      err.classList.remove("hidden");
    }
    console.error(e);
  }
});

/************ Safe helpers ************/
function escapeHtml_(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr_(s) {
  // atributos entre comillas
  return escapeHtml_(s).replaceAll("`", "&#096;");
}
function cssEscape_(s) {
  // para usar en querySelector con data-sku
  // simple: escapa comillas y backslash
  return String(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

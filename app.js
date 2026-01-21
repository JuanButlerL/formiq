
const API_BASE = "https://script.google.com/macros/s/AKfycbzAlbzKS2JfyC1ESSW71vzL7x8cE5sb1kd5Lqb0zmUvyfbRQm2Z-S4DK0FKPFKQ4hzz/exec";
// Bloquea re-envio rapido (anti doble click)
const SUBMIT_LOCK_MS = 25 * 1000;

let products = [];
let config = {
  min_total: 40000,
  delivery_fee: 0
};

let isSubmitting = false;

function money(n){ return "$" + Number(n||0).toLocaleString("es-AR"); }

function getDeliveryType(){
  const el = document.querySelector("input[name='deliveryType']:checked");
  return el ? el.value : "RETIRO";
}

function getPayMethod(){
  const el = document.querySelector("input[name='payMethod']:checked");
  return el ? el.value : "TRANSFERENCIA";
}

function setPayPills(){
  const v = getPayMethod();
  document.getElementById("pillTransfer")?.classList.toggle("active", v === "TRANSFERENCIA");
  document.getElementById("pillCash")?.classList.toggle("active", v === "EFECTIVO");
}

function toggleDeliveryPills(){
  const t = getDeliveryType();
  document.getElementById("pillRetiro")?.classList.toggle("active", t === "RETIRO");
  document.getElementById("pillEnvio")?.classList.toggle("active", t === "ENVIO");
  updateTotals();
}

function safeInitial(name){
  return String(name || "B").trim().slice(0,1).toUpperCase() || "B";
}

function renderProducts(){
  const box = document.getElementById("products");
  box.innerHTML = "";

  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "productCard";

    const leftMedia = p.image_url
      ? `<img class="productImg" src="${p.image_url}" alt="${p.name}" loading="lazy" />`
      : `<div class="thumb" aria-label="Producto">${safeInitial(p.name)}</div>`;

    card.innerHTML = `
      <div class="productLeft">
        ${leftMedia}
        <div class="productInfo">
          <div class="productName">${p.name}</div>
          <div class="productMeta">
            <span>${p.sku}</span>
            <span class="price">${money(p.price)}</span>
          </div>
        </div>
      </div>

      <div class="stepper">
        <button class="dec" data-sku="${p.sku}" aria-label="Disminuir">−</button>
        <input class="qty qtyBox" data-sku="${p.sku}" type="number" min="0" max="999" value="0" inputmode="numeric" />
        <button class="inc" data-sku="${p.sku}" aria-label="Aumentar">+</button>
      </div>
    `;

    box.appendChild(card);
  });

  document.querySelectorAll(".qty").forEach(inp => {
    inp.addEventListener("input", updateTotals);
    inp.addEventListener("change", updateTotals);
  });

  document.querySelectorAll(".inc").forEach(btn => {
    btn.addEventListener("click", () => {
      const sku = btn.dataset.sku;
      const inp = document.querySelector(`.qty[data-sku="${sku}"]`);
      const v = Number(inp.value || 0);
      inp.value = String(v + 1);
      updateTotals();
    });
  });

  document.querySelectorAll(".dec").forEach(btn => {
    btn.addEventListener("click", () => {
      const sku = btn.dataset.sku;
      const inp = document.querySelector(`.qty[data-sku="${sku}"]`);
      const v = Number(inp.value || 0);
      if(v > 0) inp.value = String(v - 1);
      updateTotals();
    });
  });

  updateTotals();
}

function getItemsFromUI(){
  const items = [];
  document.querySelectorAll(".qty").forEach(inp => {
    const sku = inp.dataset.sku;
    let qty = Number(inp.value || 0);
    if(qty < 0) qty = 0;
    if(qty > 999) qty = 999;

    const p = products.find(x => x.sku === sku);
    if(!p) return;

    if(qty > 0) items.push({ sku, qty });
  });
  return items;
}

function showSectionsByCart(items){
  const deliverySection = document.getElementById("deliverySection");
  const paymentSection  = document.getElementById("paymentSection");
  const mobileSticky    = document.getElementById("mobileSticky");

  const hasItems = items.length > 0;

  deliverySection.classList.toggle("hidden", !hasItems);
  paymentSection.classList.toggle("hidden", !hasItems);
  mobileSticky.classList.toggle("hidden", !hasItems);
}

function updateSummaryChips(items){
  const chips = document.getElementById("summaryChips");
  if(items.length === 0){
    chips.classList.add("hidden");
    chips.innerHTML = "";
    return;
  }

  const deliveryType = getDeliveryType() === "ENVIO" ? "Entrega" : "Retiro";
  const payMethod = getPayMethod() === "EFECTIVO" ? "Efectivo" : "Transferencia";

  chips.innerHTML = `
    <span class="chip">${deliveryType}</span>
    <span class="chip">Pago: ${payMethod}</span>
  `;
  chips.classList.remove("hidden");
}

function renderCartSummary(items){
  const box = document.getElementById("cartList");
  if(!box) return;

  if(items.length === 0){
    box.className = "cartEmpty";
    box.textContent = "Tu carrito esta vacio. Elegi productos para continuar.";
    return;
  }

  let html = `<div class="cartList">`;
  items.forEach(it => {
    const p = products.find(x => x.sku === it.sku);
    const line = p.price * it.qty;
    html += `
      <div class="cartItem">
        <div><strong>${p.name}</strong> x ${it.qty}</div>
        <div><strong>${money(line)}</strong></div>
      </div>
    `;
  });
  html += `</div>`;

  box.className = "";
  box.innerHTML = html;
}

function updateMinBadge(){
  const el = document.getElementById("minBadge");
  if(!el) return;
  el.innerHTML = `Minimo de compra: <strong>${money(config.min_total || 0)}</strong>`;
}

function updateTotals(){
  const items = getItemsFromUI();
  showSectionsByCart(items);

  let subtotal = 0;
  items.forEach(it => {
    const p = products.find(x => x.sku === it.sku);
    subtotal += (p.price * it.qty);
  });

  const total = subtotal;

  document.getElementById("subtotal").textContent = money(subtotal);
  document.getElementById("total").textContent = money(total);

  const sticky = document.getElementById("totalSticky");
  if(sticky) sticky.textContent = money(total);

  renderCartSummary(items);
  updateSummaryChips(items);

  const err = document.getElementById("error");
  const errSticky = document.getElementById("errorSticky");

  const minTotal = Number(config.min_total || 0);

  if(total > 0 && total < minTotal){
    const msg = `El minimo es ${money(minTotal)}. Te faltan ${money(minTotal - total)}.`;
    err.textContent = msg; err.classList.remove("hidden");
    errSticky.textContent = msg; errSticky.classList.remove("hidden");
  }else{
    err.classList.add("hidden");
    errSticky.classList.add("hidden");
  }

  const canSubmit = total >= minTotal && items.length > 0 && !isSubmitting;
  document.getElementById("submitBtn").disabled = !canSubmit;
  document.getElementById("submitBtnSticky").disabled = !canSubmit;
}

async function loadBootstrap(){
  const res = await fetch(`${API_BASE}?path=bootstrap`);
  const json = await res.json();
  if(!json.ok) throw new Error(json.error || "bootstrap error");

  const data = json.data || {};
  config = Object.assign(config, data.config || {});
  products = (data.products || []);

  updateMinBadge();
  renderProducts();
}

function submitLocked_(){
  const last = Number(localStorage.getItem("last_submit_ts") || "0");
  return (Date.now() - last) < SUBMIT_LOCK_MS;
}

function lockSubmit_(){
  localStorage.setItem("last_submit_ts", String(Date.now()));
}

function openThankModal(orderId, total){
  const modal = document.getElementById("thankModal");
  const txt = document.getElementById("thankText");

  txt.innerHTML = `Recibimos tu pedido <strong>${orderId}</strong> por <strong>${money(total)}</strong>.<br/>En breve te contactamos para coordinar el pago y la entrega.`;
  modal.style.display = "flex";
}

function closeThankModal(){
  const modal = document.getElementById("thankModal");
  modal.style.display = "none";
}

function markPostalError_(on){
  const cp = document.getElementById("postalCode");
  if(!cp) return;
  cp.style.borderColor = on ? "rgba(176,0,32,.6)" : "";
  cp.style.boxShadow = on ? "0 0 0 4px rgba(176,0,32,.12)" : "";
}

async function submitOrder(){
  if(isSubmitting) return;

  const err = document.getElementById("error");
  const errSticky = document.getElementById("errorSticky");
  const showErr = (m) => {
    err.textContent = m; err.classList.remove("hidden");
    errSticky.textContent = m; errSticky.classList.remove("hidden");
  };

  if(submitLocked_()){
    showErr("Pedido ya enviado. Espera unos segundos.");
    return;
  }

  isSubmitting = true;
  updateTotals();

  const name = document.getElementById("customerName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();

  const items = getItemsFromUI();
  const deliveryType = getDeliveryType();
  const payMethod = getPayMethod();

  const postalCode = document.getElementById("postalCode") ? document.getElementById("postalCode").value.trim() : "";
  const notes = document.getElementById("notes").value.trim();

  // limpia errores visuales
  markPostalError_(false);

  if(!name || !email || !phone){
    isSubmitting = false; updateTotals();
    showErr("Completa nombre, email y telefono.");
    return;
  }
  if(items.length === 0){
    isSubmitting = false; updateTotals();
    showErr("Selecciona al menos 1 producto.");
    return;
  }
  if(!postalCode){
    // ACA estaba tu problema: no avisaba claramente
    isSubmitting = false; updateTotals();
    markPostalError_(true);
    showErr("El codigo postal es obligatorio.");
    // si esta visible, lo enfocamos
    document.getElementById("deliverySection")?.scrollIntoView({ behavior:"smooth", block:"start" });
    document.getElementById("postalCode")?.focus();
    return;
  }

  err.classList.add("hidden");
  errSticky.classList.add("hidden");

  const payload = {
    customer:{ name, email, phone },
    delivery:{ type: deliveryType, postal_code: postalCode, notes },
    payment:{ method: payMethod },
    items
  };

  try{
    const res = await fetch(`${API_BASE}?path=order`, {
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if(!json.ok){
      isSubmitting = false; updateTotals();
      showErr(json.error || "Error al enviar pedido.");
      return;
    }

    lockSubmit_();

    const orderId = json.data.orderId;
    const finalTotal = json.data.total;

    // Solo modal, sin redirect
    openThankModal(orderId, finalTotal);

    // deshabilita botones para evitar doble envio
    document.getElementById("submitBtn").disabled = true;
    document.getElementById("submitBtnSticky").disabled = true;

  }catch(e){
    isSubmitting = false; updateTotals();
    showErr("No se pudo enviar el pedido. Intenta de nuevo.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("input[name='deliveryType']").forEach(r => r.addEventListener("change", toggleDeliveryPills));
  document.querySelectorAll("input[name='payMethod']").forEach(r => r.addEventListener("change", () => {
    setPayPills();
    updateTotals();
  }));

  // cerrar modal
  document.getElementById("thankClose")?.addEventListener("click", () => {
    closeThankModal();
  });

  // si edita CP, limpia error visual
  document.getElementById("postalCode")?.addEventListener("input", () => markPostalError_(false));

  setPayPills();
  toggleDeliveryPills();

  document.getElementById("submitBtn").addEventListener("click", submitOrder);
  document.getElementById("submitBtnSticky").addEventListener("click", submitOrder);

  try{
    await loadBootstrap();
  }catch(e){
    const err = document.getElementById("error");
    err.textContent = "No se pudieron cargar productos/config (backend).";
    err.classList.remove("hidden");
    console.error(e);
  }
});

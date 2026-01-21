const API_BASE = "https://script.google.com/macros/s/AKfycbxSvyw7GSgfzLvm14aKFZIBkP8qk46sG5ptWM2-9wcwZidyj50ZQuM5-zxBNR1We1gC/exec"; // ej: https://script.google.com/macros/s/XXX/exec
const MIN_TOTAL = 40000;

// Ajusta si queres un envio fijo en el frontend (el backend igual recalcula)
const FRONT_DELIVERY_FEE = 0;

let products = []; // {sku,name,price,stock}

function money(n) {
  return "$" + Number(n || 0).toLocaleString("es-AR");
}

function getDeliveryType() {
  const el = document.querySelector("input[name='deliveryType']:checked");
  return el ? el.value : "RETIRO";
}

function renderProducts() {
  const box = document.getElementById("products");
  box.innerHTML = "";

  products.forEach(p => {
    const row = document.createElement("div");
    row.className = "row";
    row.style.justifyContent = "space-between";
    row.style.marginBottom = "10px";

    row.innerHTML = `
      <div style="min-width:220px">
        <div><strong>${p.name}</strong></div>
        <div style="color:#666;font-size:13px">${p.sku} · ${money(p.price)} · Stock: ${p.stock}</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center">
        <label style="margin:0">Cant.
          <input data-sku="${p.sku}" class="qty" type="number" min="0" max="${p.stock}" value="0" style="width:110px" />
        </label>
      </div>
    `;
    box.appendChild(row);
  });

  document.querySelectorAll(".qty").forEach(inp => {
    inp.addEventListener("input", updateTotals);
  });
}

function getItemsFromUI() {
  const items = [];
  document.querySelectorAll(".qty").forEach(inp => {
    const sku = inp.getAttribute("data-sku");
    let qty = Number(inp.value || 0);
    if (qty < 0) qty = 0;

    const p = products.find(x => x.sku === sku);
    if (!p) return;

    // Clamp stock
    if (qty > p.stock) qty = p.stock, inp.value = String(qty);

    if (qty > 0) items.push({ sku, qty });
  });
  return items;
}

function updateTotals() {
  const items = getItemsFromUI();
  let subtotal = 0;

  items.forEach(it => {
    const p = products.find(x => x.sku === it.sku);
    subtotal += (p.price * it.qty);
  });

  const deliveryType = getDeliveryType();
  const deliveryFee = (deliveryType === "ENVIO") ? FRONT_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  document.getElementById("subtotal").textContent = money(subtotal);
  document.getElementById("deliveryFee").textContent = money(deliveryFee);
  document.getElementById("total").textContent = money(total);

  const err = document.getElementById("error");
  if (total > 0 && total < MIN_TOTAL) {
    const missing = MIN_TOTAL - total;
    err.textContent = `El minimo es ${money(MIN_TOTAL)}. Te faltan ${money(missing)}.`;
    err.classList.remove("hidden");
  } else {
    err.classList.add("hidden");
  }
}

async function loadProducts() {
  const url = `${API_BASE}?path=products`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Failed to load products");
  products = data.data;
  renderProducts();
  updateTotals();
}

function toggleAddress() {
  const deliveryType = getDeliveryType();
  const box = document.getElementById("addressBox");
  if (deliveryType === "ENVIO") box.classList.remove("hidden");
  else box.classList.add("hidden");
  updateTotals();
}

async function submitOrder() {
  const name  = document.getElementById("customerName").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const phone = document.getElementById("customerPhone").value.trim();
  const deliveryType = getDeliveryType();
  const address = document.getElementById("address").value.trim();
  const notes = document.getElementById("notes").value.trim();

  const items = getItemsFromUI();

  const err = document.getElementById("error");
  const success = document.getElementById("success");
  const wa = document.getElementById("waLink");
  success.classList.add("hidden");
  wa.classList.add("hidden");

  if (!name || !email || !phone) {
    err.textContent = "Completa nombre, email y telefono.";
    err.classList.remove("hidden");
    return;
  }
  if (deliveryType === "ENVIO" && !address) {
    err.textContent = "Para envio, la direccion es obligatoria.";
    err.classList.remove("hidden");
    return;
  }
  if (items.length === 0) {
    err.textContent = "Selecciona al menos 1 producto.";
    err.classList.remove("hidden");
    return;
  }

  // Validacion minima en frontend (backend valida de nuevo)
  // Recalcula total rapido
  let subtotal = 0;
  items.forEach(it => {
    const p = products.find(x => x.sku === it.sku);
    subtotal += (p.price * it.qty);
  });
  const deliveryFee = (deliveryType === "ENVIO") ? FRONT_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  if (total < MIN_TOTAL) {
    err.textContent = `El minimo es ${money(MIN_TOTAL)}.`;
    err.classList.remove("hidden");
    return;
  }

  err.classList.add("hidden");

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
    err.textContent = data.error || "Error al enviar pedido.";
    err.classList.remove("hidden");
    return;
  }

  const orderId = data.data.orderId;
  const finalTotal = data.data.total;

  success.textContent = `Pedido recibido (${orderId}). Total: ${money(finalTotal)}. Te vamos a enviar el link de pago.`;
  success.classList.remove("hidden");

  // WhatsApp gratis (click-to-chat): abre mensaje prearmado para que el cliente lo envie
  // Reemplaza por TU numero en formato internacional sin + ni espacios, ej Argentina: 54911XXXXXXXX
  const yourWhatsAppNumber = "54911XXXXXXXX";
  const msg = encodeURIComponent(`Hola! Hice un pedido ${orderId}. Total ${money(finalTotal)}. Mi nombre: ${name}.`);
  wa.href = `https://wa.me/${yourWhatsAppNumber}?text=${msg}`;
  wa.textContent = "Enviar confirmacion por WhatsApp";
  wa.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("input[name='deliveryType']").forEach(r => r.addEventListener("change", toggleAddress));
  document.getElementById("submitBtn").addEventListener("click", submitOrder);

  try {
    await loadProducts();
  } catch (e) {
    const err = document.getElementById("error");
    err.textContent = "No se pudieron cargar productos. Revisa la URL del backend.";
    err.classList.remove("hidden");
    console.error(e);
  }
});

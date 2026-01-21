const API_BASE = "https://script.google.com/macros/s/AKfycbxSvyw7GSgfzLvm14aKFZIBkP8qk46sG5ptWM2-9wcwZidyj50ZQuM5-zxBNR1We1gC/exec";
const MIN_TOTAL = 40000;
const FRONT_DELIVERY_FEE = 0;

// opcional: ponelo en serio para habilitar link
const YOUR_WHATSAPP_NUMBER = "54911XXXXXXXX";

let products = [];

function money(n){ return "$" + Number(n||0).toLocaleString("es-AR"); }
function getDeliveryType(){
  const el = document.querySelector("input[name='deliveryType']:checked");
  return el ? el.value : "RETIRO";
}

function toggleAddress(){
  const t = getDeliveryType();
  const box = document.getElementById("addressBox");
  const pillRetiro = document.getElementById("pillRetiro");
  const pillEnvio = document.getElementById("pillEnvio");

  if(t === "ENVIO"){
    box.classList.remove("hidden");
    pillEnvio?.classList.add("active");
    pillRetiro?.classList.remove("active");
  }else{
    box.classList.add("hidden");
    pillRetiro?.classList.add("active");
    pillEnvio?.classList.remove("active");
  }
  updateTotals();
}

function renderProducts(){
  const box = document.getElementById("products");
  box.innerHTML = "";

  products.forEach(p => {
    const lowStock = p.stock <= 10;
    const card = document.createElement("div");
    card.className = "productCard";
    card.innerHTML = `
      <div class="productInfo">
        <div class="productName">${p.name}</div>
        <div class="productMeta">
          <span>${p.sku}</span>
          <span class="price">${money(p.price)}</span>
          <span class="${lowStock ? "stockLow":""}">Stock: ${p.stock}</span>
        </div>
      </div>
      <div class="stepper">
        <button class="dec" data-sku="${p.sku}">−</button>
        <input class="qty qtyBox" data-sku="${p.sku}" type="number" min="0" max="${p.stock}" value="0" inputmode="numeric" />
        <button class="inc" data-sku="${p.sku}">+</button>
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
      const p = products.find(x => x.sku === sku);
      const v = Number(inp.value || 0);
      if(p && v < p.stock) inp.value = String(v + 1);
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

    const p = products.find(x => x.sku === sku);
    if(!p) return;

    if(qty > p.stock){
      qty = p.stock;
      inp.value = String(qty);
    }
    if(qty > 0) items.push({ sku, qty });
  });
  return items;
}

function updateTotals(){
  const items = getItemsFromUI();
  let subtotal = 0;

  items.forEach(it => {
    const p = products.find(x => x.sku === it.sku);
    subtotal += (p.price * it.qty);
  });

  const deliveryFee = getDeliveryType() === "ENVIO" ? FRONT_DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  document.getElementById("subtotal").textContent = money(subtotal);
  document.getElementById("deliveryFee").textContent = money(deliveryFee);
  document.getElementById("total").textContent = money(total);

  const sticky = document.getElementById("totalSticky");
  if(sticky) sticky.textContent = money(total);

  const err = document.getElementById("error");
  const errSticky = document.getElementById("errorSticky");

  if(total > 0 && total < MIN_TOTAL){
    const msg = `El minimo es ${money(MIN_TOTAL)}. Te faltan ${money(MIN_TOTAL - total)}.`;
    err.textContent = msg; err.classList.remove("hidden");
    errSticky.textContent = msg; errSticky.classList.remove("hidden");
  }else{
    err.classList.add("hidden");
    errSticky.classList.add("hidden");
  }

  const canSubmit = total >= MIN_TOTAL && items.length > 0;
  document.getElementById("submitBtn").disabled = !canSubmit;
  document.getElementById("submitBtnSticky").disabled = !canSubmit;
}

async function loadProducts(){
  const res = await fetch(`${API_BASE}?path=products`);
  const data = await res.json();
  if(!data.ok) throw new Error(data.error || "No products");
  products = data.data || [];
  renderProducts();
}

async function submitOrder(){
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

  success.classList.add("hidden");
  wa.classList.add("hidden");

  const showErr = (m) => {
    err.textContent = m; err.classList.remove("hidden");
    errSticky.textContent = m; errSticky.classList.remove("hidden");
  };

  if(!name || !email || !phone) return showErr("Completa nombre, email y telefono.");
  if(deliveryType === "ENVIO" && !address) return showErr("Para envio, la direccion es obligatoria.");
  if(items.length === 0) return showErr("Selecciona al menos 1 producto.");

  err.classList.add("hidden"); errSticky.classList.add("hidden");

  const payload = { customer:{name,email,phone}, delivery:{type:deliveryType,address,notes}, items };

  const res = await fetch(`${API_BASE}?path=order`, {
    method:"POST",
    headers:{ "Content-Type":"text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if(!data.ok) return showErr(data.error || "Error al enviar pedido.");

  const orderId = data.data.orderId;
  const finalTotal = data.data.total;

  success.textContent = `Pedido recibido (${orderId}). Total: ${money(finalTotal)}. Te vamos a enviar el link de pago.`;
  success.classList.remove("hidden");

  if(YOUR_WHATSAPP_NUMBER && !YOUR_WHATSAPP_NUMBER.includes("X")){
    const msg = encodeURIComponent(`Hola! Hice un pedido ${orderId}. Total ${money(finalTotal)}. Mi nombre: ${name}.`);
    wa.href = `https://wa.me/${YOUR_WHATSAPP_NUMBER}?text=${msg}`;
    wa.classList.remove("hidden");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("input[name='deliveryType']").forEach(r => r.addEventListener("change", toggleAddress));
  document.getElementById("submitBtn").addEventListener("click", submitOrder);
  document.getElementById("submitBtnSticky").addEventListener("click", submitOrder);

  toggleAddress();

  try{
    await loadProducts();
  }catch(e){
    const err = document.getElementById("error");
    err.textContent = "No se pudieron cargar productos (backend).";
    err.classList.remove("hidden");
    console.error(e);
  }
});

function renderProducts() {
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
          <span class="${lowStock ? "stockLow" : ""}">Stock: ${p.stock}</span>
        </div>
      </div>

      <div class="stepper">
        <button class="dec" data-sku="${p.sku}" aria-label="Disminuir">−</button>
        <input class="qty qtyBox" data-sku="${p.sku}" type="number" min="0" max="${p.stock}" value="0" inputmode="numeric" />
        <button class="inc" data-sku="${p.sku}" aria-label="Aumentar">+</button>
      </div>
    `;

    box.appendChild(card);
  });

  // Eventos
  document.querySelectorAll(".qty").forEach(inp => {
    inp.addEventListener("input", updateTotals);
    inp.addEventListener("change", updateTotals);
  });

  document.querySelectorAll(".inc").forEach(btn => {
    btn.addEventListener("click", () => {
      const sku = btn.getAttribute("data-sku");
      const inp = document.querySelector(`.qty[data-sku="${sku}"]`);
      const p = products.find(x => x.sku === sku);
      let v = Number(inp.value || 0);
      if (v < p.stock) inp.value = String(v + 1);
      updateTotals();
    });
  });

  document.querySelectorAll(".dec").forEach(btn => {
    btn.addEventListener("click", () => {
      const sku = btn.getAttribute("data-sku");
      const inp = document.querySelector(`.qty[data-sku="${sku}"]`);
      let v = Number(inp.value || 0);
      if (v > 0) inp.value = String(v - 1);
      updateTotals();
    });
  });

  updateTotals();
}

const api = {
  listProducts: () => fetch('/api/products').then(r=>r.json()),
  placeOrder: payload => fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json())
};

let PRODUCTS = [];
let CART = [];

function money(n){ return Number(n).toFixed(2); }

async function load(){
  PRODUCTS = await api.listProducts();
  renderProducts();
  renderCart();
  document.getElementById('placeOrder').addEventListener('click', onPlaceOrder);
  document.getElementById('clearCart').addEventListener('click', ()=>{ CART=[]; renderCart(); });
}

function renderProducts(){
  const el = document.getElementById('products');
  el.innerHTML = '';
  PRODUCTS.forEach(p=>{
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      ${p.image?`<img src="${p.image}" class="thumb">`: `<div class="thumb"></div>`}
      <div class="title">${p.name}</div>
      <div style="color:#666;font-size:13px">${p.description || ''}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
        <div class="price">${money(p.price)} €</div>
        <button class="add-btn" data-id="${p.id}">Añadir</button>
      </div>
    `;
    el.appendChild(div);
  });
  el.querySelectorAll('.add-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-id');
      addToCart(id);
    });
  });
}

function addToCart(id){
  const prod = PRODUCTS.find(p=>p.id===id);
  if(!prod) return;
  const it = CART.find(c=>c.id===id);
  if(it) it.qty++;
  else CART.push({ id:prod.id, name:prod.name, price:prod.price, qty:1 });
  renderCart();
}

function renderCart(){
  const el = document.getElementById('cartItems');
  el.innerHTML = '';
  if(!CART.length){ el.innerHTML = '<div>Carrito vacío</div>'; return; }
  CART.forEach(item=>{
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `<div>${item.name} <small style="color:#888">x${item.qty}</small></div><div>${money(item.price*item.qty)} €</div>`;
    el.appendChild(row);
  });
  const total = CART.reduce((s,i)=>s+i.price*i.qty,0);
  const tdiv = document.createElement('div');
  tdiv.style.marginTop='8px';
  tdiv.innerHTML = `<strong>Total: ${money(total)} €</strong>`;
  el.appendChild(tdiv);
}

async function onPlaceOrder(){
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  if(!name||!phone||CART.length===0){ alert('Completa nombre, teléfono y añade productos'); return; }
  const items = CART.map(i=>({ id:i.id, name:i.name, qty:i.qty, price:i.price }));
  const res = await api.placeOrder({ customerName:name, customerPhone:phone, items });
  if(res.success){
    document.getElementById('orderMsg').innerText = 'Pedido recibido. Te contactaremos por teléfono.';
    CART = []; renderCart();
    document.getElementById('customerName').value=''; document.getElementById('customerPhone').value='';
    setTimeout(()=>document.getElementById('orderMsg').innerText='',5000);
  } else {
    alert('Error al enviar pedido');
  }
}

load();

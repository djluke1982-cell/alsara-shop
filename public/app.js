const api = {
listProducts: () => fetch('/api/products').then(r=>r.json()),
placeOrder: (payload) => fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)}).then(r=>r.json())
}


let PRODUCTS = [];
let CART = [];


function renderProducts(){
const container = document.getElementById('products');
container.innerHTML = '';
PRODUCTS.forEach(p => {
const div = document.createElement('div');
div.className = 'card';
div.innerHTML = `
${p.image?`<img src="${p.image}" alt="${p.name}">`:''}
<h3>${p.name}</h3>
<p>${p.description || ''}</p>
<p><strong>${p.price.toFixed(2)} €</strong></p>
<button data-id="${p.id}">Añadir</button>
`;
container.appendChild(div);
});
container.querySelectorAll('button').forEach(btn => {
btn.addEventListener('click', ()=>{
const id = btn.getAttribute('data-id');
const prod = PRODUCTS.find(x=>x.id===id);
addToCart(prod);
});
});
}


function addToCart(prod){
const existing = CART.find(c=>c.id===prod.id);
if(existing) existing.qty++;
else CART.push({...prod, qty:1});
renderCart();
}


function renderCart(){
const el = document.getElementById('cart');
if(!CART.length){ el.innerHTML = '<i>Carrito vacío</i>'; return }
el.innerHTML = CART.map(it=>`<div>${it.name} x${it.qty} - ${ (it.price*it.qty).toFixed(2)} €</div>`).join('');
}


async function load(){
PRODUCTS = await api.listProducts();
renderProducts();
renderCart();


document.getElementById('placeOrder').addEventListener('click', async ()=>{
const name = document.getElementById('customerName').value.trim();
const phone = document.getElementById('customerPhone').value.trim();
if(!name||!phone||CART.length===0){ alert('Completa nombre, teléfono y añade productos al carrito'); return }
const items = CART.map(i=>({ id:i.id, name:i.name, qty:i.qty, price:i.price }));
const res = await api.placeOrder({ customerName: name, customerPhone: phone, items });
if(res.success){
document.getElementById('orderMsg').innerText = 'Pedido recibido. En breve te contactaremos.';
} else alert('Error al proc
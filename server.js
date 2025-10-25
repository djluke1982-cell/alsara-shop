require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { customAlphabet } = require('nanoid');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'clave_default',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// DB (lowdb v1)
const adapter = new FileSync('db.json');
const db = low(adapter);
db.defaults({ products: [], orders: [] }).write();

// Uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nanoid = customAlphabet('1234567890abcdef', 8);
    cb(null, Date.now() + '-' + nanoid() + ext);
  }
});
const upload = multer({ storage });

// Twilio client (optional)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Auth middleware
function ensureAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'No autorizado' });
}

// --- Admin auth ---
app.post('/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Credenciales incorrectas' });
});
app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});
app.get('/admin/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// --- Products ---
app.get('/api/products', (req, res) => {
  const products = db.get('products').value();
  res.json(products);
});

app.post('/api/products', ensureAdmin, upload.single('image'), (req, res) => {
  const { name, price, description } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  const nanoid = customAlphabet('1234567890abcdef', 10);
  const product = {
    id: nanoid(),
    name,
    price: parseFloat(price) || 0,
    description: description || '',
    image: imagePath
  };
  db.get('products').push(product).write();
  res.json({ success: true, product });
});

// --- Orders ---
app.post('/api/orders', async (req, res) => {
  const { customerName, customerPhone, items } = req.body;
  if (!customerName || !customerPhone || !items || !items.length)
    return res.status(400).json({ error: 'Faltan datos del pedido' });

  const nanoid = customAlphabet('1234567890abcdef', 12);
  const order = {
    id: nanoid(),
    customerName,
    customerPhone,
    items,
    status: 'nuevo',
    createdAt: new Date().toISOString()
  };

  db.get('orders').push(order).write();

  // Notification via WhatsApp (if configured)
  const adminWhatsapp = process.env.ADMIN_WHATSAPP;
  if (twilioClient && adminWhatsapp && process.env.TWILIO_WHATSAPP_NUMBER) {
    const summary = items.map(i => `${i.name} x${i.qty}`).join(', ');
    const body = `📦 Nuevo pedido ${order.id}\n👤 ${order.customerName}\n📞 ${order.customerPhone}\n🛒 ${summary}`;
    try {
      await twilioClient.messages.create({
        body,
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: adminWhatsapp
      });
      console.log('WhatsApp enviado al administrador');
    } catch (err) {
      console.error('Error enviando WhatsApp:', err.message);
    }
  }

  res.json({ success: true, order });
});

// Get orders (admin)
app.get('/api/orders', ensureAdmin, (req, res) => {
  const orders = db.get('orders').value().sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
  res.json(orders);
});

// Update order status (admin)
app.put('/api/orders/:id/status', ensureAdmin, (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  const order = db.get('orders').find({ id }).value();
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  db.get('orders').find({ id }).assign({ status }).write();
  res.json({ success: true, id, status });
});

// Simple health
app.get('/health', (req,res)=>res.json({ ok:true }));

// Start
app.listen(PORT, () => console.log(`🚀 Servidor escuchando en puerto ${PORT}`));

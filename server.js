require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { Low, JSONFile } = require('lowdb');
const { nanoid } = require('nanoid');


const app = express();
const PORT = process.env.PORT || 3000;


// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Sessions (para el admin)
app.use(session({
secret: process.env.SESSION_SECRET || 'cambiar_esta_clave',
resave: false,
saveUninitialized: false,
cookie: { secure: false } // cambiar a true si usas HTTPS en producción
}));


// Setup lowdb (file database)
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);
async function initDB() {
await db.read();
db.data = db.data || { products: [], orders: [] };
await db.write();
}
initDB();


// Multer for image uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
destination: function (req, file, cb) {
cb(null, 'uploads/');
},
filename: function (req, file, cb) {
const ext = path.extname(file.originalname);
cb(null, Date.now() + '-' + nanoid(6) + ext);
}
});
const upload = multer({ storage });


// Twilio setup (optional)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
const twilio = require('twilio');
twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}


// --- Auth helpers ---
function ensureAdmin(req, res, next) {
if (req.session && req.session.isAdmin) return next();
});
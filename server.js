import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import compression from 'compression';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ============ MIDDLEWARE ============
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 900000,
  max: 100,
  message: 'Too many requests'
});
app.use('/api/', limiter);

// ============ DATABASE CONNECTION ============
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bakra-mandi')
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('✗ MongoDB failed:', err));

// ============ SCHEMAS ============
const livestockSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['goat', 'cow', 'sheep'], required: true },
  price: { type: Number, required: true },
  weight: String,
  age: String,
  description: String,
  seller: String,
  phone: String,
  location: String,
  image: String,
  featured: { type: Boolean, default: false },
  available: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  items: [{
    livestockId: String,
    name: String,
    price: Number,
    quantity: Number
  }],
  totalPrice: Number,
  buyerName: String,
  buyerEmail: String,
  buyerPhone: String,
  deliveryAddress: String,
  status: { type: String, enum: ['pending', 'confirmed', 'delivered'], default: 'pending' },
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  stripePaymentId: String,
  createdAt: { type: Date, default: Date.now }
});

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  message: String,
  createdAt: { type: Date, default: Date.now }
});

const Livestock = mongoose.model('Livestock', livestockSchema);
const Order = mongoose.model('Order', orderSchema);
const Contact = mongoose.model('Contact', contactSchema);

// ============ EMAIL SETUP ============
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ============ ROUTES ============

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ---- LIVESTOCK API ----
app.get('/api/livestock', async (req, res) => {
  try {
    const { type, featured } = req.query;
    let query = {};
    if (type) query.type = type;
    if (featured) query.featured = true;
    
    const livestock = await Livestock.find(query);
    res.json(livestock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/livestock/:id', async (req, res) => {
  try {
    const livestock = await Livestock.findById(req.params.id);
    if (!livestock) return res.status(404).json({ error: 'Not found' });
    res.json(livestock);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/livestock', async (req, res) => {
  try {
    const livestock = new Livestock(req.body);
    await livestock.save();
    res.status(201).json(livestock);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ---- ORDERS API ----
app.post('/api/orders', async (req, res) => {
  try {
    const { items, totalPrice, buyerName, buyerEmail, buyerPhone, deliveryAddress } = req.body;
    
    const order = new Order({
      orderNumber: `BM-${Date.now()}`,
      items,
      totalPrice,
      buyerName,
      buyerEmail,
      buyerPhone,
      deliveryAddress
    });
    
    await order.save();
    
    // Send confirmation email
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: buyerEmail,
      subject: 'Order Confirmation - Bakra Mandi',
      html: `
        <h2>Order Confirmed!</h2>
        <p>Order Number: ${order.orderNumber}</p>
        <p>Total: PKR ${totalPrice.toLocaleString()}</p>
        <p>Our team will contact you soon for delivery details.</p>
        <p>Eid Mubarak!</p>
      `
    });
    
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---- PAYMENT API ----
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'pkr'
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---- CONTACT API ----
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    
    const contact = new Contact({ name, email, phone, message });
    await contact.save();
    
    // Send email to admin
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `New Contact Message from ${name}`,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    });
    
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---- SEO ROUTES ----
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bakra-mandi.com/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bakra-mandi.com/products</loc>
    <priority>0.8</priority>
  </url>
</urlset>`);
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Sitemap: https://bakra-mandi.com/sitemap.xml`);
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ SERVER START ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     BAKRA MANDI API SERVER             ║
║     Running on port ${PORT}              ║
║     Eid Mubarak! 🌙                     ║
╚════════════════════════════════════════╝
  `);
});

export default app;

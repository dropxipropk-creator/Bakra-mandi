import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============ MIDDLEWARE ============
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files (frontend)
app.use(express.static(__dirname));

// ============ SAMPLE DATA ============
const livestock = [
    { id: 1, name: 'Premium White Goat', type: 'goat', price: 25000, weight: '45-50 kg', age: '2-3 years', seller: 'Ahmed Farm', phone: '+92 300 1111111' },
    { id: 2, name: 'Black Goat', type: 'goat', price: 22000, weight: '40-45 kg', age: '2 years', seller: 'Hassan Livestock', phone: '+92 300 2222222' },
    { id: 3, name: 'Brown Cow', type: 'cow', price: 85000, weight: '300-350 kg', age: '3-4 years', seller: 'Malik Dairy', phone: '+92 300 3333333' },
    { id: 4, name: 'White Cow', type: 'cow', price: 95000, weight: '320-380 kg', age: '3-5 years', seller: 'Premium Cattle', phone: '+92 300 4444444' },
    { id: 5, name: 'Black Sheep', type: 'sheep', price: 18000, weight: '35-40 kg', age: '2 years', seller: 'Sheep King', phone: '+92 300 5555555' },
    { id: 6, name: 'White Sheep', type: 'sheep', price: 16000, weight: '30-35 kg', age: '1.5 years', seller: 'Wool Traders', phone: '+92 300 6666666' },
    { id: 7, name: 'Premium Goat Pair', type: 'goat', price: 45000, weight: '85-95 kg', age: '2-3 years', seller: 'Twin Goats Farm', phone: '+92 300 7777777' },
    { id: 8, name: 'Desi Cow', type: 'cow', price: 75000, weight: '280-320 kg', age: '2-3 years', seller: 'Local Farmers', phone: '+92 300 8888888' },
];

let orders = [];
let contacts = [];

// ============ API ROUTES ============

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        message: 'Bakra Mandi API is running!'
    });
});

// ---- LIVESTOCK API ----
app.get('/api/livestock', (req, res) => {
    try {
        const { type } = req.query;
        let filtered = livestock;
        
        if (type && type !== 'all') {
            filtered = livestock.filter(item => item.type === type);
        }
        
        res.json({
            success: true,
            count: filtered.length,
            data: filtered
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/livestock/:id', (req, res) => {
    try {
        const item = livestock.find(l => l.id === parseInt(req.params.id));
        if (!item) {
            return res.status(404).json({ error: 'Livestock not found' });
        }
        res.json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---- ORDERS API ----
app.post('/api/orders', (req, res) => {
    try {
        const { items, totalPrice, buyerName, buyerEmail, buyerPhone, deliveryAddress } = req.body;
        
        if (!items || !buyerName || !buyerEmail) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const order = {
            id: orders.length + 1,
            orderNumber: `BM-${Date.now()}`,
            items,
            totalPrice,
            buyerName,
            buyerEmail,
            buyerPhone,
            deliveryAddress,
            status: 'pending',
            paymentStatus: 'unpaid',
            createdAt: new Date().toISOString()
        };
        
        orders.push(order);
        
        res.status(201).json({ 
            success: true, 
            message: 'Order created successfully',
            data: order 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/:id', (req, res) => {
    try {
        const order = orders.find(o => o.id === parseInt(req.params.id));
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders', (req, res) => {
    try {
        res.json({ 
            success: true, 
            count: orders.length,
            data: orders 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---- CONTACT API ----
app.post('/api/contact', (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const contact = {
            id: contacts.length + 1,
            name,
            email,
            phone,
            message,
            createdAt: new Date().toISOString()
        };
        
        contacts.push(contact);
        
        res.status(201).json({ 
            success: true, 
            message: 'Contact message received successfully',
            data: contact 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/contacts', (req, res) => {
    try {
        res.json({ 
            success: true, 
            count: contacts.length,
            data: contacts 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ---- PAYMENT API ----
app.post('/api/create-payment-intent', (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }
        
        res.json({
            success: true,
            message: 'Payment intent created',
            clientSecret: `pi_${Date.now()}`,
            amount: amount
        });
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
    <loc>https://bakra-mandi.com/#shop</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://bakra-mandi.com/#gallery</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bakra-mandi.com/#contact</loc>
    <priority>0.7</priority>
  </url>
</urlset>`);
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Sitemap: https://bakra-mandi.com/sitemap.xml`);
});

// ---- FRONTEND FALLBACK ----
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// ============ SERVER START ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     BAKRA MANDI API SERVER             ║
║     Running on port ${PORT}              ║
║     Eid Mubarak! 🌙                     ║
║     API: http://localhost:${PORT}/api    ║
║     Frontend: http://localhost:${PORT}   ║
╚════════════════════════════════════════╝
    `);
});

export default app;

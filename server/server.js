import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key_here');

// Database path - use /home for Azure persistence
const DB_PATH = process.env.WEBSITE_SITE_NAME 
  ? '/home/data/orders.db'
  : path.join(__dirname, 'orders.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

// Initialize SQL.js and database
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT,
      package_id TEXT NOT NULL,
      package_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      project_description TEXT,
      status TEXT DEFAULT 'pending',
      stripe_session_id TEXT,
      stripe_payment_intent TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      features TEXT,
      delivery_days INTEGER,
      active INTEGER DEFAULT 1
    )
  `);
  
  // Seed default packages if empty
  const result = db.exec("SELECT COUNT(*) as count FROM packages");
  const count = result[0]?.values[0]?.[0] || 0;
  
  if (count === 0) {
    db.run(`INSERT INTO packages (id, name, description, price, features, delivery_days) VALUES (?, ?, ?, ?, ?, ?)`,
      ['starter', 'Starter', 'Perfect for small businesses and personal projects', 49900,
       JSON.stringify(['Single page design', 'Mobile responsive', 'Basic SEO setup', '2 revision rounds', '5-day delivery']), 5]);
    
    db.run(`INSERT INTO packages (id, name, description, price, features, delivery_days) VALUES (?, ?, ?, ?, ?, ?)`,
      ['professional', 'Professional', 'Complete solution for growing businesses', 149900,
       JSON.stringify(['Up to 5 pages', 'Custom UI/UX design', 'Advanced animations', 'SEO optimization', 'Social media kit', '5 revision rounds', '14-day delivery']), 14]);
    
    db.run(`INSERT INTO packages (id, name, description, price, features, delivery_days) VALUES (?, ?, ?, ?, ?, ?)`,
      ['enterprise', 'Enterprise', 'Full-scale digital transformation', 399900,
       JSON.stringify(['Unlimited pages', 'Complete brand identity', 'Custom illustrations', 'Advanced interactions', 'E-commerce ready', 'Priority support', 'Unlimited revisions', '30-day delivery']), 30]);
    
    saveDatabase();
  }
  
  console.log('Database initialized');
}

// Save database to file
function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper to run queries
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function dbGet(sql, params = []) {
  const results = dbAll(sql, params);
  return results[0] || null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
  return { changes: db.getRowsModified() };
}

// Middleware
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: clientUrl,
  credentials: true
}));

// Raw body for Stripe webhooks
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// JSON body for other routes
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = process.env.WEBSITE_SITE_NAME 
    ? path.join(__dirname, 'public')
    : path.join(__dirname, '../client/dist');
  app.use(express.static(staticPath));
}

// ============ API Routes ============

// Get all packages
app.get('/api/packages', (req, res) => {
  try {
    const packages = dbAll('SELECT * FROM packages WHERE active = 1');
    const formatted = packages.map(pkg => ({
      ...pkg,
      features: JSON.parse(pkg.features),
      priceFormatted: `$${(pkg.price / 100).toLocaleString()}`
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Get single package
app.get('/api/packages/:id', (req, res) => {
  try {
    const pkg = dbGet('SELECT * FROM packages WHERE id = ?', [req.params.id]);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json({
      ...pkg,
      features: JSON.parse(pkg.features),
      priceFormatted: `$${(pkg.price / 100).toLocaleString()}`
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { packageId, customerName, customerEmail, customerPhone, projectDescription } = req.body;
    
    if (!packageId || !customerName || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const pkg = dbGet('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    const orderId = uuidv4();
    dbRun(`INSERT INTO orders (id, customer_name, customer_email, customer_phone, package_id, package_name, price, project_description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, customerName, customerEmail, customerPhone || null, packageId, pkg.name, pkg.price, projectDescription || null]);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      client_reference_id: orderId,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${pkg.name} Design Package`,
            description: pkg.description,
          },
          unit_amount: pkg.price,
        },
        quantity: 1,
      }],
      metadata: { orderId, packageId, customerName },
      success_url: `${clientUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/packages`,
    });
    
    dbRun('UPDATE orders SET stripe_session_id = ? WHERE id = ?', [session.id, orderId]);
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook
app.post('/api/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orderId = session.client_reference_id;
      if (orderId) {
        dbRun(`UPDATE orders SET status = 'paid', stripe_payment_intent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [session.payment_intent, orderId]);
        console.log(`Order ${orderId} marked as paid`);
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      console.log(`Payment failed: ${event.data.object.id}`);
      break;
    }
  }
  
  res.json({ received: true });
});

// Get order by session ID
app.get('/api/orders/session/:sessionId', (req, res) => {
  try {
    const order = dbGet('SELECT * FROM orders WHERE stripe_session_id = ?', [req.params.sessionId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get all orders (admin)
app.get('/api/orders', (req, res) => {
  try {
    const orders = dbAll('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (admin)
app.patch('/api/orders/:id', (req, res) => {
  try {
    const { status } = req.body;
    const result = dbRun('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Catch-all for SPA in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const staticPath = process.env.WEBSITE_SITE_NAME 
      ? path.join(__dirname, 'public/index.html')
      : path.join(__dirname, '../client/dist/index.html');
    res.sendFile(staticPath);
  });
}

// Start server after database init
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config();

// Simple JWT-like token handling
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = payload;
  next();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Dynamic Stripe initialization - gets key from DB or env
function getStripe() {
  const setting = db ? dbGet('SELECT value FROM settings WHERE key = ?', ['stripe_secret_key']) : null;
  const secretKey = setting?.value || process.env.STRIPE_SECRET_KEY || 'sk_test_your_key_here';
  return new Stripe(secretKey);
}

// Get publishable key for frontend
function getPublishableKey() {
  const setting = db ? dbGet('SELECT value FROM settings WHERE key = ?', ['stripe_publishable_key']) : null;
  return setting?.value || process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
}

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
  
  db.run(`
    CREATE TABLE IF NOT EXISTS donations (
      id TEXT PRIMARY KEY,
      donor_name TEXT,
      donor_email TEXT NOT NULL,
      amount INTEGER NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      stripe_session_id TEXT,
      stripe_payment_intent TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = createToken({ role: 'admin' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Verify token
app.get('/api/verify', requireAuth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

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
    
    const stripe = getStripe();
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
      // Create invoice for this payment
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: `Order for ${pkg.name} Design Package`,
          metadata: { orderId, packageId },
          footer: 'Thank you for your business!',
        },
      },
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
  const webhookSecretSetting = dbGet('SELECT value FROM settings WHERE key = ?', ['stripe_webhook_secret']);
  const webhookSecret = webhookSecretSetting?.value || process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    if (webhookSecret && sig) {
      const stripe = getStripe();
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
      const referenceId = session.client_reference_id;
      const isDonation = session.metadata?.type === 'donation';
      
      if (referenceId) {
        if (isDonation) {
          dbRun(`UPDATE donations SET status = 'completed', stripe_payment_intent = ? WHERE id = ?`,
            [session.payment_intent, referenceId]);
          console.log(`Donation ${referenceId} completed`);
        } else {
          dbRun(`UPDATE orders SET status = 'paid', stripe_payment_intent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [session.payment_intent, referenceId]);
          console.log(`Order ${referenceId} marked as paid`);
        }
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

// Get order by session ID - also verifies payment status with Stripe
app.get('/api/orders/session/:sessionId', async (req, res) => {
  try {
    const order = dbGet('SELECT * FROM orders WHERE stripe_session_id = ?', [req.params.sessionId]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // If order is still pending, check Stripe for actual payment status
    if (order.status === 'pending') {
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
        
        if (session.payment_status === 'paid') {
          dbRun(`UPDATE orders SET status = 'paid', stripe_payment_intent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [session.payment_intent, order.id]);
          order.status = 'paid';
          order.stripe_payment_intent = session.payment_intent;
        }
      } catch (stripeErr) {
        console.error('Error verifying with Stripe:', stripeErr.message);
        // Continue with current order data if Stripe check fails
      }
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get all orders (admin - protected)
app.get('/api/orders', requireAuth, (req, res) => {
  try {
    const orders = dbAll('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status (admin - protected)
app.patch('/api/orders/:id', requireAuth, (req, res) => {
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

// ============ Donation Routes ============

// Create donation checkout session
app.post('/api/create-donation-session', async (req, res) => {
  try {
    const { amount, donorName, donorEmail, message } = req.body;
    
    if (!amount || !donorEmail) {
      return res.status(400).json({ error: 'Amount and email are required' });
    }
    
    // Amount is already in cents from the frontend
    const amountInCents = Math.round(parseFloat(amount));
    
    if (amountInCents < 100) {
      return res.status(400).json({ error: 'Minimum donation is $1' });
    }
    
    if (amountInCents > 99999900) {
      return res.status(400).json({ error: 'Maximum donation is $999,999' });
    }
    
    const donationId = uuidv4();
    dbRun(`INSERT INTO donations (id, donor_name, donor_email, amount, message)
           VALUES (?, ?, ?, ?, ?)`,
      [donationId, donorName || 'Anonymous', donorEmail, amountInCents, message || null]);
    
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: donorEmail,
      client_reference_id: donationId,
      submit_type: 'donate',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Donation to Irene Design Studio',
            description: message ? `Message: ${message.substring(0, 100)}` : 'Thank you for your support!',
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      // Create receipt/invoice for donation
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: 'Donation - Thank you for your support!',
          metadata: { donationId, type: 'donation' },
          footer: 'Thank you for supporting Irene Design Studio!',
        },
      },
      metadata: { donationId, donorName: donorName || 'Anonymous', type: 'donation' },
      success_url: `${clientUrl}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/donate`,
    });
    
    dbRun('UPDATE donations SET stripe_session_id = ? WHERE id = ?', [session.id, donationId]);
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating donation session:', error);
    res.status(500).json({ error: 'Failed to create donation session' });
  }
});

// Get donation by session ID - also verifies payment status with Stripe
app.get('/api/donations/session/:sessionId', async (req, res) => {
  try {
    const donation = dbGet('SELECT * FROM donations WHERE stripe_session_id = ?', [req.params.sessionId]);
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found' });
    }
    
    // If donation is still pending, check Stripe for actual payment status
    if (donation.status === 'pending') {
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
        
        if (session.payment_status === 'paid') {
          dbRun(`UPDATE donations SET status = 'completed', stripe_payment_intent = ? WHERE id = ?`,
            [session.payment_intent, donation.id]);
          donation.status = 'completed';
          donation.stripe_payment_intent = session.payment_intent;
        }
      } catch (stripeErr) {
        console.error('Error verifying donation with Stripe:', stripeErr.message);
        // Continue with current donation data if Stripe check fails
      }
    }
    
    res.json({
      ...donation,
      amountFormatted: `$${(donation.amount / 100).toFixed(2)}`
    });
  } catch (error) {
    console.error('Error fetching donation:', error);
    res.status(500).json({ error: 'Failed to fetch donation' });
  }
});

// Get all donations (admin - protected)
app.get('/api/donations', requireAuth, (req, res) => {
  try {
    const donations = dbAll('SELECT * FROM donations ORDER BY created_at DESC');
    const formatted = donations.map(d => ({
      ...d,
      amountFormatted: `$${(d.amount / 100).toFixed(2)}`
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// ============ Settings Routes ============

// Get Stripe publishable key (public - for frontend)
app.get('/api/settings/stripe-publishable-key', (req, res) => {
  try {
    const key = getPublishableKey();
    res.json({ key: key || null });
  } catch (error) {
    console.error('Error fetching publishable key:', error);
    res.status(500).json({ error: 'Failed to fetch key' });
  }
});

// Get all settings (admin - protected)
app.get('/api/settings', requireAuth, (req, res) => {
  try {
    const settings = dbAll('SELECT * FROM settings');
    // Mask secret keys for security
    const masked = settings.map(s => ({
      ...s,
      value: s.key.includes('secret') ? (s.value ? '••••••••' + s.value.slice(-4) : '') : s.value
    }));
    res.json(masked);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings (admin - protected)
app.post('/api/settings', requireAuth, (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'Invalid settings format' });
    }
    
    for (const { key, value } of settings) {
      if (!key) continue;
      
      // Skip if value is masked (not changed)
      if (value && value.startsWith('••••••••')) continue;
      
      const existing = dbGet('SELECT * FROM settings WHERE key = ?', [key]);
      if (existing) {
        if (value === '' || value === null) {
          dbRun('DELETE FROM settings WHERE key = ?', [key]);
        } else {
          dbRun('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [value, key]);
        }
      } else if (value && value !== '') {
        dbRun('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Test Stripe connection (admin - protected)
app.post('/api/settings/test-stripe', requireAuth, async (req, res) => {
  try {
    const { secretKey } = req.body;
    
    if (!secretKey) {
      return res.status(400).json({ error: 'Secret key is required' });
    }
    
    // Test the key by making a simple API call
    const testStripe = new Stripe(secretKey);
    await testStripe.balance.retrieve();
    
    res.json({ success: true, message: 'Stripe connection successful!' });
  } catch (error) {
    console.error('Stripe test failed:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Invalid Stripe key or connection failed' 
    });
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

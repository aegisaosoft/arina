import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_your_key_here');

// Initialize SQLite Database
const db = new Database(path.join(__dirname, 'orders.db'));

// Create tables
db.exec(`
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    features TEXT,
    delivery_days INTEGER,
    active INTEGER DEFAULT 1
  );
`);

// Seed default packages if empty
const packageCount = db.prepare('SELECT COUNT(*) as count FROM packages').get();
if (packageCount.count === 0) {
  const insertPackage = db.prepare(`
    INSERT INTO packages (id, name, description, price, features, delivery_days)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertPackage.run(
    'starter',
    'Starter',
    'Perfect for small businesses and personal projects',
    49900, // $499.00 in cents
    JSON.stringify([
      'Single page design',
      'Mobile responsive',
      'Basic SEO setup',
      '2 revision rounds',
      '5-day delivery'
    ]),
    5
  );
  
  insertPackage.run(
    'professional',
    'Professional',
    'Complete solution for growing businesses',
    149900, // $1,499.00
    JSON.stringify([
      'Up to 5 pages',
      'Custom UI/UX design',
      'Advanced animations',
      'SEO optimization',
      'Social media kit',
      '5 revision rounds',
      '14-day delivery'
    ]),
    14
  );
  
  insertPackage.run(
    'enterprise',
    'Enterprise',
    'Full-scale digital transformation',
    399900, // $3,999.00
    JSON.stringify([
      'Unlimited pages',
      'Complete brand identity',
      'Custom illustrations',
      'Advanced interactions',
      'E-commerce ready',
      'Priority support',
      'Unlimited revisions',
      '30-day delivery'
    ]),
    30
  );
}

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Raw body for Stripe webhooks
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// JSON body for other routes
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// ============ API Routes ============

// Get all packages
app.get('/api/packages', (req, res) => {
  try {
    const packages = db.prepare('SELECT * FROM packages WHERE active = 1').all();
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
    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(req.params.id);
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
    
    // Validate required fields
    if (!packageId || !customerName || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get package
    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // Create order in database
    const orderId = uuidv4();
    db.prepare(`
      INSERT INTO orders (id, customer_name, customer_email, customer_phone, package_id, package_name, price, project_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orderId, customerName, customerEmail, customerPhone, packageId, pkg.name, pkg.price, projectDescription);
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      client_reference_id: orderId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pkg.name} Design Package`,
              description: pkg.description,
              images: ['https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400'],
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId,
        packageId,
        customerName,
      },
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/packages`,
    });
    
    // Update order with session ID
    db.prepare('UPDATE orders SET stripe_session_id = ? WHERE id = ?').run(session.id, orderId);
    
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
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const orderId = session.client_reference_id;
      
      if (orderId) {
        db.prepare(`
          UPDATE orders 
          SET status = 'paid', stripe_payment_intent = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(session.payment_intent, orderId);
        
        console.log(`Order ${orderId} marked as paid`);
      }
      break;
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log(`Payment failed: ${paymentIntent.id}`);
      break;
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
  
  res.json({ received: true });
});

// Get order by session ID
app.get('/api/orders/session/:sessionId', async (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE stripe_session_id = ?').get(req.params.sessionId);
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
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
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
    const result = db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);
    
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
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

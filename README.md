# Irene Design Studio

A React/Node.js application for ordering web design services with Stripe payment integration.

## Features

- 🎨 **Kandinsky-inspired animated background** - Beautiful abstract canvas animation
- 📦 **Design packages** - Starter, Professional, and Enterprise tiers
- 💳 **Stripe Checkout** - Secure payment processing
- 📊 **Admin Dashboard** - View and manage orders
- 🗃️ **SQLite Database** - Simple persistent storage
- 📱 **Fully Responsive** - Works on all devices

## Tech Stack

**Frontend:**
- React 18
- React Router 6
- Vite
- Stripe.js

**Backend:**
- Node.js / Express
- SQLite (better-sqlite3)
- Stripe API

## Quick Start

### 1. Clone and Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

**Server (`server/.env`):**
```env
# Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

**Client (`client/.env`):**
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

### 3. Run Development

```bash
# Terminal 1 - Start server
cd server
npm run dev

# Terminal 2 - Start client
cd client
npm run dev
```

Visit `http://localhost:5173`

## Stripe Setup

### Test Mode

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Get your test API keys from [Dashboard → Developers → API keys](https://dashboard.stripe.com/test/apikeys)
3. Use test card: `4242 4242 4242 4242` (any future date, any CVC)

### Webhooks (Optional for local development)

For production or testing webhooks locally:

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Run: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/packages` | List all packages |
| GET | `/api/packages/:id` | Get single package |
| POST | `/api/create-checkout-session` | Create Stripe checkout |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
| GET | `/api/orders` | List all orders (admin) |
| GET | `/api/orders/session/:sessionId` | Get order by session |
| PATCH | `/api/orders/:id` | Update order status |

## Project Structure

```
irene-design-studio/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── KandinskyCanvas.jsx
│   │   │   ├── Navigation.jsx
│   │   │   └── Navigation.css
│   │   ├── pages/
│   │   │   ├── Home.jsx / Home.css
│   │   │   ├── Packages.jsx / Packages.css
│   │   │   ├── Order.jsx / Order.css
│   │   │   ├── Success.jsx / Success.css
│   │   │   └── Admin.jsx / Admin.css
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── server.js
│   ├── orders.db (created on first run)
│   ├── .env.example
│   └── package.json
└── README.md
```

## Customization

### Packages

Edit the seed data in `server/server.js`:

```javascript
insertPackage.run(
  'custom-id',
  'Package Name',
  'Description',
  99900, // $999.00 in cents
  JSON.stringify(['Feature 1', 'Feature 2']),
  7 // delivery days
);
```

### Colors

Edit CSS variables in `client/src/styles/global.css`:

```css
:root {
  --color-primary: #0da3cd;
  --color-secondary: #ff33cc;
  --color-accent: #66ff99;
  /* ... */
}
```

## Production Deployment

### Build Client

```bash
cd client
npm run build
```

### Configure Server

```bash
# Set environment
NODE_ENV=production
CLIENT_URL=https://your-domain.com
```

The Express server will serve the built React app from `client/dist`.

## License

MIT

---

**Contact:** irene.skvorzowa@crystalprismsoftware.com

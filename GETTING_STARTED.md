# Getting Started with SaaS Tools Hub

Your complete self-hostable SaaS management platform is ready! This guide covers everything you need to get started.

## 🚀 Quick Start (5 minutes)

### 1. Start the Application
```bash
npm run dev
```
App runs at: `http://localhost:5000`

### 2. Create Your Account
Sign up with your email to get started.

### 3. Explore Features
- Add tools and track subscriptions
- View financial analytics
- Check renewal reminders
- Upload receipts

## 📚 Complete Guides

### Backend & Database
- **See:** `DEPLOYMENT.md` - Deploy to VPS with Docker
- **See:** `shared/schema.ts` - Database schema and types

### Stripe Payments (NEW!)
- **See:** `STRIPE_SETUP.md` - Complete Stripe integration guide
- **Run:** `npx tsx server/seed-products.ts` - Create subscription plans

### API Documentation
- **Base URL:** `http://localhost:5000/api`
- **Authentication:** JWT bearer token (from `/api/auth/login`)

#### Auth Routes
```
POST   /api/auth/register     - Create new account
POST   /api/auth/login        - Login (returns JWT token)
GET    /api/auth/profile      - Get current user
```

#### Tool Management
```
GET    /api/tools             - List user's tools
POST   /api/tools             - Add new tool
PATCH  /api/tools/:id         - Update tool
DELETE /api/tools/:id         - Delete tool
```

#### Subscription Management
```
GET    /api/subscriptions/:userId  - Get user subscription
POST   /api/subscriptions           - Create/update subscription
```

#### Payments & Receipts
```
POST   /api/receipts              - Upload receipt
GET    /api/receipts              - List receipts
GET    /api/admin/stats           - Admin stats
```

#### Stripe (NEW!)
```
GET    /api/stripe/products            - List products
GET    /api/stripe/products/:id/prices - Get prices
POST   /api/stripe/checkout            - Create checkout session
POST   /api/stripe/customer-portal     - Manage subscriptions
```

## 🏗️ Project Structure

```
/
├── client/src/                 # React frontend
│   ├── pages/                  # 14 pages (tools, analytics, etc.)
│   ├── components/             # Reusable UI components
│   ├── context/                # Auth, theme contexts
│   └── lib/                    # Utilities, encryption
│
├── server/                     # Express backend
│   ├── routes.ts               # Main API routes
│   ├── stripeRoutes.ts         # Stripe endpoints
│   ├── stripeClient.ts         # Stripe SDK initialization
│   ├── stripeService.ts        # Stripe business logic
│   ├── auth.ts                 # JWT, password hashing
│   ├── middleware.ts           # Auth, rate limiting, audit
│   ├── storage.ts              # Data persistence
│   ├── db.ts                   # Database connection
│   └── seed-products.ts        # Create Stripe products
│
├── shared/
│   └── schema.ts               # Database schema + validation
│
├── DEPLOYMENT.md               # VPS deployment guide
├── STRIPE_SETUP.md             # Stripe integration guide
└── docker-compose.yml          # Production stack
```

## 🛠️ Common Tasks

### Add a New Tool
```bash
curl -X POST http://localhost:5000/api/tools \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "GitHub Pro",
    "websiteUrl": "https://github.com",
    "isPaid": true,
    "billingAmount": "21.00",
    "billingCycle": "monthly",
    "nextRenewalDate": "2025-12-25T00:00:00Z"
  }'
```

### Get User's Tools
```bash
curl http://localhost:5000/api/tools \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Stripe Checkout
```bash
curl -X POST http://localhost:5000/api/stripe/checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "priceId": "price_xxxxx" }'
```

## 📊 Features Overview

### ✅ Frontend (14 Pages)
- Dashboard with analytics
- Tool management with CRUD
- Financial charts and reports
- Renewal tracking and alerts
- Low usage identification
- Receipt upload and management
- CSV import/export
- Team collaboration
- API keys management
- Integrations hub
- Admin dashboard
- Pricing tiers
- Help & documentation

### ✅ Backend
- JWT authentication with PBKDF2 hashing
- Rate limiting (100 req/min per IP)
- Audit logging for all actions
- Tool limit enforcement per plan
- Subscription management
- Stripe payment processing (ready)
- Webhook handling
- CSV import/export API
- Role-based access control

### ✅ Deployment Ready
- Docker containerization
- PostgreSQL database (schema ready)
- Redis caching configured
- Nginx reverse proxy setup
- SSL/TLS certificates (Let's Encrypt)
- Backup and restore scripts
- Environment-based configuration

## 🔄 Development Workflow

### Make Changes to Frontend
```bash
# Edit files in client/src/
# Changes auto-refresh via HMR (Hot Module Replacement)
# Just save and refresh browser
```

### Make Changes to Backend
```bash
# Edit files in server/
# Workflow automatically restarts
# Refresh browser to see changes
```

### Add Dependencies
```bash
npm install package-name
# Workflow auto-restarts
```

### Run Database Migrations
```bash
npx drizzle-kit push:pg
# Or manually with:
psql $DATABASE_URL -f migrations.sql
```

## 🚀 Deploy to VPS

When ready to go live:

1. **Follow:** `DEPLOYMENT.md` guide (step-by-step)
2. **Set up:** PostgreSQL database on VPS
3. **Configure:** Environment variables (.env)
4. **Run:** `docker-compose up -d`
5. **Access:** Via your domain with SSL

Takes ~20 minutes. No additional dependencies needed!

## 🔒 Security Features

- ✅ JWT authentication (7-day expiry)
- ✅ Password hashing (PBKDF2, 100k iterations)
- ✅ Rate limiting (prevent brute force)
- ✅ Audit logging (track all actions)
- ✅ Input validation (Zod schemas)
- ✅ Client-side encryption (credentials storage)
- ✅ HTTPS ready (Nginx SSL config provided)
- ✅ Secure credential management (Stripe integration)

## 📈 Next Steps

### Immediate (Today)
- [ ] Create your account and add some tools
- [ ] View analytics charts
- [ ] Try uploading receipts

### Short Term (This Week)
- [ ] Set up Stripe products: `npx tsx server/seed-products.ts`
- [ ] Update pricing page with real prices
- [ ] Test checkout flow with Stripe test cards
- [ ] Customize styling (edit `client/src/index.css`)

### Medium Term (Next Week)
- [ ] Connect to production PostgreSQL database
- [ ] Deploy to VPS (follow `DEPLOYMENT.md`)
- [ ] Configure custom domain
- [ ] Set up email notifications

### Long Term (Ongoing)
- [ ] Add more SaaS tool categories
- [ ] Implement team collaboration
- [ ] Build browser extension
- [ ] Add third-party integrations (Slack, Zapier)
- [ ] Implement advanced analytics

## ❓ Troubleshooting

### White screen?
- Check browser console (F12) for errors
- Check server logs: `npm run dev`
- Clear browser cache

### Database connection error?
- Ensure DATABASE_URL environment variable is set
- Check PostgreSQL is running
- Run: `psql $DATABASE_URL -c "SELECT 1"`

### Stripe endpoints not working?
- Run: `npx tsx server/seed-products.ts`
- Check Replit Stripe connection is configured
- Verify JWT token is valid

### Port 5000 already in use?
- Kill existing process: `lsof -ti:5000 | xargs kill`
- Or use different port: `PORT=3000 npm run dev`

## 📞 Support Resources

- **Stripe:** https://docs.stripe.com
- **Drizzle ORM:** https://orm.drizzle.team
- **Express:** https://expressjs.com
- **React:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com

## 🎉 You're All Set!

Your SaaS Tools Hub is ready to:
- ✅ Track subscriptions
- ✅ Manage spending
- ✅ Process payments
- ✅ Deploy anywhere

**Start with:** `npm run dev`

Happy building! 🚀

# Dreamlane BD - Supershop Management System

A lightweight POS + Inventory Management System with QR code scanning, product management, stock tracking, and sales transaction recording.

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL (TiDB Cloud compatible)
- **Image Storage:** Cloudinary
- **QR Code:** qrcode (generation), html5-qrcode (scanning)
- **Auth:** JWT + bcrypt

## Setup

### 1. Clone and install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your MySQL and Cloudinary credentials.

### 3. Run MySQL

Option A: Docker (local dev)

```bash
cd database
docker compose up -d
```

Option B: Existing MySQL server

```sql
CREATE DATABASE dreamlane_bd;
```

Tables are created automatically when the server starts.

### 4. Start the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The app will be available at `http://localhost:3000`

For the Render deployment, set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to your production database values. TiDB Cloud commonly uses port `4000` with `DB_SSL=true`; do not leave `DB_PORT` unset because the backend defaults to `3306`.

### 5. Keep the Render service awake

The repository includes a scheduled GitHub Actions workflow at `.github/workflows/keep-alive.yml` that pings the public health endpoint every 10 minutes. To enable it:

1. Open the repository's **Settings > Secrets and variables > Actions**.
2. Add a repository secret named `APP_URL` containing the deployed URL, for example `https://dreamlane-bd.onrender.com`.
3. Run **Actions > Keep Dreamlane BD Awake > Run workflow** once to verify the setup.

### 6. Default login credentials

- **Email:** admin@dreamlane.com
- **Password:** admin123

## Features

- Admin authentication (JWT)
- Product CRUD with image upload (Cloudinary)
- Automatic QR code generation per product
- Mobile camera QR scanner (html5-qrcode)
- Sell / Add Stock via QR scan
- Transaction history logging
- Dashboard with stats (total products, daily sales, low stock alerts)
- Search and filter products
- Dark / Light mode toggle
- Fully responsive (mobile + desktop)
- Concurrent scan safety (DB transactions with row locking)

## Project Structure

```
Dreamlane BD Project/
  backend/
    config/        - Database and Cloudinary config
    middleware/    - Auth and upload middleware
    routes/        - API route handlers
    server.js      - Express entry point
  database/
    docker-compose.yml - Local MySQL container
    init/           - Init scripts
  frontend/
    css/           - Stylesheets
    js/            - JavaScript modules
    *.html         - Page templates
```

## API Endpoints

| Method | Endpoint                | Description              |
|--------|-------------------------|--------------------------|
| POST   | /api/auth/login         | Admin login              |
| GET    | /api/auth/me            | Current user info        |
| GET    | /api/products           | List products            |
| GET    | /api/products/categories| Get categories           |
| GET    | /api/products/:id       | Get single product       |
| POST   | /api/products           | Create product           |
| PUT    | /api/products/:id       | Update product           |
| DELETE | /api/products/:id       | Delete product           |
| POST   | /api/scan               | Scan action (sell/add)   |
| GET    | /api/transactions       | Transaction history      |
| GET    | /api/transactions/dashboard | Dashboard stats      |

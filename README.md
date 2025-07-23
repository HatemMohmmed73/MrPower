# MR Power System

A Node.js/Express web application for vehicle repair and maintenance business management. Features include customer management, invoicing, stock management, and reporting.

---

## Features
- Customer management
- Invoice creation and PDF export
- Stock/parts management
- User authentication and permissions
- Reporting dashboard

---

## Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/mrpower.git
cd mrpower
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file (or set environment variables in your shell):
```
SESSION_SECRET=your_secret_key
NODE_ENV=development
```

### 4. Database Setup
- **Development:** Uses SQLite by default (see `config/config.js`).
- **Production/Render:** Uses PostgreSQL (see below).

#### Run Migrations and Seeders
```bash
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
```

### 5. Start the App
```bash
npm start
```
Visit [http://localhost:3000](http://localhost:3000)

---

## Deploying to Render

### 1. Push Your Code to GitHub

### 2. Create a PostgreSQL Database on Render
- Go to Render dashboard → **New +** → **PostgreSQL**
- Copy the **Internal Database URL**

### 3. Set Up Your Web Service
- Create a new **Web Service** on Render, connect your repo
- Set the following environment variables:
  - `SESSION_SECRET` (your secret)
  - `DATABASE_URL` (paste the PostgreSQL connection string)
  - `NODE_ENV=production`
- Build Command: `npm install`
- Start Command: `npm start`

### 4. Configure Sequelize for Production
In `config/config.js`, ensure you have:
```js
production: {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
}
```

### 5. Install PostgreSQL Driver
```bash
npm install pg
```

### 6. Run Migrations/Seeders on Render
- Use the Render Shell tab, or run locally with `DATABASE_URL` set to your Render DB:
```bash
npx sequelize-cli db:migrate --env production
npx sequelize-cli db:seed:all --env production
```

---

## Default Users (from seeders)
- **Nawaf**: Full access (admin)
- **Nimil**: Can add customers/invoices, but cannot edit/delete customers
- **Ahmed**: Can do everything except delete invoices

---

## Security Notes
- All protected pages are set to `no-store` to prevent browser caching after logout.
- Permissions are enforced both in the backend and UI.

---

## License
MIT 
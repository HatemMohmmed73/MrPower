# MR Power System

MR Power System is a Node.js/Express web application designed for vehicle repair and maintenance business management. It provides an all-in-one solution for managing customers, invoices, stock/parts, and business reporting. The app is suitable for garages, workshops, and service centers looking to digitize their workflow.

---

## Features
- Customer management (add, view, billing history)
- Invoice creation, PDF export, and print
- Stock/parts management (add, edit, track quantity and prices)
- User authentication and role-based permissions
- Reporting dashboard for business insights
- **Docker support** for easy deployment and local development

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
- **Production:** Recommended to use PostgreSQL (see Docker instructions below).

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

## Running with Docker

This project includes a `Dockerfile` and `docker-compose.yml` for easy setup with Docker.

### 1. Build and Start the App
```bash
docker-compose up --build
```
- This will build the Node.js app and a PostgreSQL database container.
- The app will be available at [http://localhost:3000](http://localhost:3000)

### 2. Database Configuration
- The default `docker-compose.yml` sets up a PostgreSQL database service named `db`.
- The app will connect to this database automatically using the environment variables defined in `docker-compose.yml`.
- You can change the database credentials in `docker-compose.yml` as needed.

### 3. Running Migrations and Seeders in Docker
To run migrations and seeders inside the app container:
```bash
docker-compose exec app npx sequelize-cli db:migrate

docker-compose exec app npx sequelize-cli db:seed:all
```

### 4. Stopping the App
```bash
docker-compose down
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
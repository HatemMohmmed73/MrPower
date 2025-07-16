#!/bin/bash
set -e

# Run migrations
npx sequelize-cli db:migrate

# Run seeders
npx sequelize-cli db:seed:all

# Start the app
exec node src/app.js 
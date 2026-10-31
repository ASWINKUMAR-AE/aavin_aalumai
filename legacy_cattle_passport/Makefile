# ==============================================================================
# Aavin Smart Cattle Passport — Full Stack Makefile
# Milk Safety Twin Platform (Expo Mobile App + Express TypeScript + MySQL XAMPP)
# ==============================================================================

.PHONY: help setup install env db-init db-reset dev start backend expo web test clean

# Default target
help:
	@echo ========================================================================
	@echo   🐄 AAVIN SMART CATTLE PASSPORT — MAKEFILE COMMANDS
	@echo ========================================================================
	@echo   make setup      - All-in-one setup (create .env + install dependencies)
	@echo   make install    - Install root and backend npm dependencies
	@echo   make env        - Create backend/.env from .env.example if missing
	@echo   make db-init    - Initialize MySQL database (XAMPP: aavin_milkflow)
	@echo   make db-reset   - Drop and re-initialize database with fresh seed data
	@echo   make dev        - Run full system (Backend + Expo Mobile + QR Portal)
	@echo   make start      - Alias for 'make dev'
	@echo   make backend    - Run Node.js Express backend only (port 4000)
	@echo   make expo       - Run Expo mobile bundler only (port 8081)
	@echo   make web        - Run Expo web preview
	@echo   make test       - Run backend automated test suite
	@echo   make clean      - Clean build artifacts and temporary files
	@echo ========================================================================

# Setup environment variables
env:
	@node -e "const fs=require('fs'); if(!fs.existsSync('backend/.env')){fs.copyFileSync('backend/.env.example','backend/.env'); console.log('✅ Created backend/.env from template');} else {console.log('ℹ️ backend/.env already exists');}"

# Install all dependencies
install:
	@echo "📦 Installing root dependencies..."
	npm install
	@echo "📦 Installing backend dependencies..."
	cd backend && npm install

# All-in-one setup
setup: env install
	@echo "✨ Setup complete. Please make sure XAMPP MySQL is running, then run 'make db-init'!"

# Initialize database (schema + seed) via XAMPP MySQL
db-init:
	@node scripts/init-db.js

# Reset database (drop + re-import)
db-reset:
	@node scripts/init-db.js --reset

# Run full project concurrently
dev:
	npm start

start: dev

# Run backend only
backend:
	npm run backend

# Run expo only
expo:
	npm run expo

# Run expo web
web:
	npm run web

# Run tests
test:
	npm --prefix backend test

# Clean caches and build directories
clean:
	@node -e "const fs=require('fs'); ['backend/dist', '.expo'].forEach(d => { if(fs.existsSync(d)) { fs.rmSync(d, {recursive: true, force: true}); console.log('Cleaned ' + d); } });"

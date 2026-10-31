# 🐄 Aavin Smart Cattle Passport — XAMPP & Full-Stack Startup Guide

This guide walks you step-by-step through setting up **XAMPP (Apache + MySQL)**, initializing the database, configuring environment variables, and running the full project (Backend + Expo Mobile App + Web Portal).

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Step 1: Start XAMPP Services](#step-1-start-xampp-services)
3. [Step 2: Initialize Database in MySQL](#step-2-initialize-database-in-mysql)
   - [Option A: Via phpMyAdmin (Recommended for GUI)](#option-a-via-phpmyadmin-browser-gui)
   - [Option B: Via Command Line (Fastest)](#option-b-via-command-line-cli)
   - [Option C: Automatic Migration via Backend](#option-c-automatic-initialization-backend)
4. [Step 3: Backend Environment Setup (.env)](#step-3-backend-environment-setup-env)
5. [Step 4: Install Dependencies](#step-4-install-dependencies)
6. [Step 5: Start the Project](#step-5-start-the-project)
7. [Step 6: Quick Commands via Makefile & Batch](#step-6-quick-commands-via-makefile--batch)
8. [Step 7: Testing & Verification](#step-7-testing--verification)
9. [Step 8: Troubleshooting Common XAMPP Issues](#step-8-troubleshooting-common-xampp-issues)

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your system:
- **XAMPP**: Download and install from [apachefriends.org](https://www.apachefriends.org/) (includes Apache, MySQL, phpMyAdmin).
- **Node.js**: Version 18.x or 20.x+ ([nodejs.org](https://nodejs.org/)).
- **Git**: Installed and available in terminal.
- **Expo Go App (Optional for Mobile)**: Install **Expo Go** from Google Play Store (Android) or App Store (iOS).

---

## Step 1: Start XAMPP Services

1. Open the **XAMPP Control Panel** (Run as Administrator if on Windows).
2. Click the **Start** button next to **Apache**.
   - Status should turn green and show port `80, 443`.
3. Click the **Start** button next to **MySQL**.
   - Status should turn green and show port `3306`.

> 💡 **Check**: Open your browser and navigate to `http://localhost/phpmyadmin/`. If phpMyAdmin opens, your database server is running properly!

---

## Step 2: Initialize Database in MySQL

The database name used by the application is `aavin_milkflow`. You need to run `schema.sql` (creates tables) and `seed.sql` (loads demo data and accounts).

Choose **one** of the methods below:

### Option A: Via phpMyAdmin (Browser GUI)
1. Open `http://localhost/phpmyadmin/` in your browser.
2. Click on the **Import** tab in the top navigation bar.
3. Click **Choose File** and select:
   ```
   d:\aavin_project_cow\database\schema.sql
   ```
4. Scroll down and click **Import** (or **Go**).
   - This creates the `aavin_milkflow` database and all 40 relational tables.
5. In the left sidebar of phpMyAdmin, click on the newly created **`aavin_milkflow`** database.
6. Click on the **Import** tab again.
7. Click **Choose File** and select:
   ```
   d:\aavin_project_cow\database\seed.sql
   ```
8. Click **Import** (or **Go**).
   - This populates demo users, cattle passports, treatments, milk entries, and AI settings.

---

### Option B: Via Command Line (CLI)

If you have XAMPP installed at default path (`C:\xampp`), open your terminal in the project directory (`d:\aavin_project_cow`) and run:

**Windows PowerShell:**
```powershell
# 1. Import Schema (creates database and all tables)
Get-Content database\schema.sql | C:\xampp\mysql\bin\mysql.exe -u root

# 2. Import Seed Data (populates demo users and records)
Get-Content database\seed.sql | C:\xampp\mysql\bin\mysql.exe -u root aavin_milkflow
```

**Windows Command Prompt (cmd.exe):**
```cmd
C:\xampp\mysql\bin\mysql.exe -u root < database\schema.sql
C:\xampp\mysql\bin\mysql.exe -u root aavin_milkflow < database\seed.sql
```

---

### Option C: Automatic Initialization (Backend)

The backend features an automatic database migration runner (`backend/src/config/autoMigrate.ts`).
As long as **MySQL is running in XAMPP**, when you start the backend, it will detect if `aavin_milkflow` is missing or empty and automatically execute `schema.sql` and `seed.sql` for you!

---

## Step 3: Backend Environment Setup (.env)

The backend requires a `.env` file located in `backend/.env`.

1. If `backend/.env` does not already exist, copy from the example template:
   ```bash
   cp backend/.env.example backend/.env
   ```
   *(On Windows PowerShell: `Copy-Item backend\.env.example backend\.env`)*

2. Verify the MySQL configuration inside `backend/.env`:
   ```env
   # MySQL Database (XAMPP Default)
   DATABASE_HOST=127.0.0.1
   DATABASE_PORT=3306
   DATABASE_NAME=aavin_milkflow
   DATABASE_USER=root
   DATABASE_PASSWORD=
   ```
   > 📌 *Note: In default XAMPP installations, the user is `root` and the password is empty (leave blank).*

---

## Step 4: Install Dependencies

Open terminal at the root directory of the project:

```bash
# 1. Install root dependencies (Expo, React Native, concurrently, etc.)
npm install

# 2. Install backend dependencies (Express, TypeScript, mysql2, etc.)
cd backend
npm install
cd ..
```

---

## Step 5: Start the Project

### 🚀 Unified Run (Backend + Mobile App + Web QR Portal)

Run this single command from the project root:

```bash
npm start
```
*(or `npm run dev`)*

### What happens automatically:
1. **Backend Server** starts on `http://localhost:4000`.
2. **Web QR Portal** is hosted at `http://localhost:4000/qr-portal` and opens automatically in your browser.
3. **Expo Metro Bundler** starts on `http://localhost:8081`.
4. An ASCII QR code is printed directly inside your terminal for scanning with the **Expo Go** app.

---

## Step 6: Quick Commands via Makefile & Batch

We have included a `Makefile` and Windows batch helpers for easy management.

### Using `make` (if you have Make / Git Bash installed):
```bash
make help        # View all available make targets
make setup       # Install all dependencies and copy .env
make db-init     # Initialize database via XAMPP MySQL CLI
make db-reset    # Reset database schema and demo seed data
make dev         # Run both backend and mobile concurrently
make backend     # Run backend only
make expo        # Run mobile expo app only
make test        # Run backend test suite
```

### Using Windows NPM Scripts:
```bash
npm start         # Run backend + expo together
npm run backend   # Run backend only
npm run expo      # Run expo only
npm run web       # Run Expo web preview
```

---

## Step 7: Testing & Verification

### 1. Verify Backend API Health
Open your browser or run:
```bash
curl http://localhost:4000/health
```
Expected response:
```json
{"status":"healthy","database":"connected","timestamp":"..."}
```

### 2. Verify Digital QR Portal
Navigate to:
```
http://localhost:4000/qr-portal
```
You can view demo cow passports, test QR code generation, and test scanner endpoints.

### 3. Demo Login Accounts (Password for all: `Password@123`)

| Role | Username | Phone | Access Level |
| :--- | :--- | :--- | :--- |
| **Aavin Admin** | `admin_aavin` | `9842000001` | Full administrative control, AI configuration, audit reviews |
| **Farmer (Owner 1)** | `farmer_murugan` | `9842000002` | Registered cows, milk supply history, payment ledger |
| **Farmer (Owner 2)** | `farmer_selvi` | `9842000003` | Cow passports, health alerts, AI dairy assistant |
| **Veterinary Doctor** | `vet_anand` | `9842000004` | Treatment logs, medicine withdrawal quarantine locks |
| **Collection Centre** | `operator_kannan` | `9842000005` | Milk quality testing (fat, SNF), safety clearance, receipts |
| **Transport Vendor** | `vendor_kumar` | `9842000006` | Chilled milk tanker logistics & dispatch records |

---

## Step 8: Troubleshooting Common XAMPP Issues

### ⚠️ Issue 1: MySQL Port 3306 Conflict (Already in use)
- **Cause**: An existing MySQL/MariaDB service or another local database instance is running.
- **Fix**:
  1. Open Windows **Services** (`services.msc`).
  2. Locate any standalone `MySQL` or `MariaDB` service and click **Stop**.
  3. Or change the MySQL port in XAMPP:
     - In XAMPP Control Panel, click **Config** next to MySQL &rarr; `my.ini`.
     - Change `port=3306` to `port=3307`.
     - Update `DATABASE_PORT=3307` in `backend/.env`.

### ⚠️ Issue 2: Apache Port 80 / 443 Conflict
- **Cause**: Port 80 is occupied by IIS, Skype, or World Wide Web Publishing Service.
- **Fix**:
  - In XAMPP Control Panel &rarr; Apache &rarr; **Config** &rarr; `httpd.conf` &rarr; Change `Listen 80` to `Listen 8080`.
  - Access phpMyAdmin at `http://localhost:8080/phpmyadmin/`.

### ⚠️ Issue 3: phpMyAdmin Max Upload Size Exceeded
- **Cause**: Default phpMyAdmin upload limit is 2MB, whereas database files can be larger.
- **Fix**:
  - In XAMPP &rarr; Apache &rarr; **Config** &rarr; `php.ini`.
  - Search and adjust:
    ```ini
    upload_max_filesize = 64M
    post_max_size = 64M
    max_execution_time = 300
    ```
  - Restart Apache in XAMPP.

### ⚠️ Issue 4: Access Denied for user 'root'@'localhost'
- **Cause**: A password was set for root in MySQL.
- **Fix**:
  - Open `backend/.env` and update `DATABASE_PASSWORD=your_password`.

### ⚠️ Issue 5: Phone Cannot Connect to Backend API via Expo Go
- **Cause**: Phone and PC must be on the **same local Wi-Fi network**.
- **Fix**:
  1. Ensure your PC's firewall allows Node.js on port 4000.
  2. On the mobile login screen, tap **⚙️ Server Settings** and enter:
     `http://<YOUR_PC_LAN_IP>:4000/api/v1` (e.g., `http://192.168.1.105:4000/api/v1`).
  3. Tap **Test Connection** to confirm connectivity.

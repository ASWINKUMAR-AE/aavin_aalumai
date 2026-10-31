# Aavin Smart Cattle Passport - Database Setup Guide

## Quick Setup via XAMPP & phpMyAdmin

1. **Start MySQL Service:**
   - Open **XAMPP Control Panel**.
   - Click **Start** on **Apache** and **MySQL**.

2. **Open phpMyAdmin:**
   - Navigate to `http://localhost/phpmyadmin/` in your browser.

3. **Import Schema:**
   - Click on the **Import** tab (or **SQL** tab).
   - Choose `database/schema.sql` (or paste its content).
   - Click **Go** to create the `aavin_milkflow` database and all 40 relational tables with foreign keys and indexes.

4. **Import Seed Data:**
   - Select the newly created database `aavin_milkflow` in the left sidebar.
   - Click on the **Import** tab.
   - Choose `database/seed.sql` (or paste its content).
   - Click **Go** to populate the system with demo roles, users, cattle passports, treatments, active withdrawal rules, collections, and AI settings.

## Demo Accounts (Password for all: `Password@123`)

| Role | Username | Phone | Full Name | Primary Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Aavin Admin** | `admin_aavin` | `9842000001` | Dr. S. Sundaram | Operations, AI Settings, Audit, Review |
| **Farmer (Owner 1)** | `farmer_murugan` | `9842000002` | K. Murugesan | Melur Rural, Cows 1001 & 1002 (Under Treatment) |
| **Farmer (Owner 2)** | `farmer_selvi` | `9842000003` | M. Selvi | Navinipatti, Cows 1003 & 1004 |
| **Veterinary Doctor** | `vet_anand` | `9842000004` | Dr. R. Anand BVSc | Clinical records, treatments, withdrawal periods |
| **Collection Centre** | `operator_kannan` | `9842000005` | P. Kannan | Melur CC, milk intake, analyzer readings, receipts |
| **Transport Vendor** | `vendor_kumar` | `9842000006` | V. Kumar | Tanker Logistics to Madurai Dairy Plant |

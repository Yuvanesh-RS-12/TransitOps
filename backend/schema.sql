-- TransitOps Database Schema
-- Apply with: psql -d transitops -f backend/schema.sql
-- Matches backend/server.js exactly (raw SQL, no ORM)

DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS fuel_logs CASCADE;
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password TEXT NOT NULL, -- bcrypt hash
  role VARCHAR(30) NOT NULL CHECK (role IN ('FLEET_MANAGER','DRIVER','SAFETY_OFFICER','FINANCIAL_ANALYST'))
);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  registration_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL,
  max_load_capacity NUMERIC(10,2) NOT NULL,
  odometer NUMERIC(12,2) NOT NULL DEFAULT 0,
  acquisition_cost NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','ON_TRIP','IN_SHOP','RETIRED')),
  region VARCHAR(100) NOT NULL DEFAULT 'Default'
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_region ON vehicles(region);

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TABLE drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  license_number VARCHAR(50) UNIQUE NOT NULL,
  license_category VARCHAR(20) NOT NULL,
  license_expiry DATE NOT NULL,
  contact_number VARCHAR(30) NOT NULL,
  safety_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','ON_TRIP','OFF_DUTY','SUSPENDED'))
);

CREATE INDEX idx_drivers_status ON drivers(status);

-- ============================================================
-- TRIPS
-- ============================================================
CREATE TABLE trips (
  id SERIAL PRIMARY KEY,
  source VARCHAR(150) NOT NULL,
  destination VARCHAR(150) NOT NULL,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  cargo_weight NUMERIC(10,2) NOT NULL,
  planned_distance NUMERIC(10,2) NOT NULL,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_odometer NUMERIC(12,2),
  fuel_consumed NUMERIC(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','DISPATCHED','COMPLETED','CANCELLED')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);

-- ============================================================
-- MAINTENANCE
-- ============================================================
CREATE TABLE maintenance (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP
);

CREATE INDEX idx_maintenance_vehicle_id ON maintenance(vehicle_id);
CREATE INDEX idx_maintenance_is_active ON maintenance(is_active);

-- ============================================================
-- FUEL LOGS
-- ============================================================
CREATE TABLE fuel_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  liters NUMERIC(10,2) NOT NULL,
  cost NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_fuel_logs_vehicle_id ON fuel_logs(vehicle_id);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE INDEX idx_expenses_vehicle_id ON expenses(vehicle_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- 4 users, one per role, all password = "password123"
-- bcrypt hash generated with bcryptjs (10 rounds)
INSERT INTO users (name, email, password, role) VALUES
('Fleet Manager', 'manager@transitops.com', '$2b$10$UohsGAm2Qt4poQosBjQTM.U2iOl64M4B1tPvgti41vQNf5YHg91pO', 'FLEET_MANAGER'),
('Sam Driver', 'driver@transitops.com', '$2b$10$UohsGAm2Qt4poQosBjQTM.U2iOl64M4B1tPvgti41vQNf5YHg91pO', 'DRIVER'),
('Safety Officer', 'safety@transitops.com', '$2b$10$UohsGAm2Qt4poQosBjQTM.U2iOl64M4B1tPvgti41vQNf5YHg91pO', 'SAFETY_OFFICER'),
('Financial Analyst', 'finance@transitops.com', '$2b$10$UohsGAm2Qt4poQosBjQTM.U2iOl64M4B1tPvgti41vQNf5YHg91pO', 'FINANCIAL_ANALYST');

-- 4 vehicles
INSERT INTO vehicles (registration_no, name, type, max_load_capacity, odometer, acquisition_cost, status, region) VALUES
('TN-01-AB-1234', 'Tata Ace Gold', 'Mini Truck', 750, 15200, 650000, 'AVAILABLE', 'Chennai'),
('TN-02-CD-5678', 'Ashok Leyland Dost', 'Light Truck', 1250, 42300, 950000, 'AVAILABLE', 'Chennai'),
('TN-03-EF-9012', 'Mahindra Bolero Pickup', 'Pickup', 1000, 68900, 780000, 'IN_SHOP', 'Coimbatore'),
('TN-04-GH-3456', 'Eicher Pro 2049', 'Medium Truck', 2500, 5400, 1650000, 'AVAILABLE', 'Madurai');

-- 4 drivers
INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score, status) VALUES
('Ravi Kumar', 'DL-TN-2019-001122', 'LMV-TR', '2027-06-30', '+91-9840012345', 92, 'AVAILABLE'),
('Suresh Babu', 'DL-TN-2020-003344', 'HMV', '2026-11-15', '+91-9840023456', 85, 'AVAILABLE'),
('Anitha Raj', 'DL-TN-2018-005566', 'LMV-TR', '2025-01-10', '+91-9840034567', 78, 'AVAILABLE'),
('Manoj Prasad', 'DL-TN-2021-007788', 'HMV', '2028-03-22', '+91-9840045678', 65, 'SUSPENDED');

-- 2 trips (1 completed, 1 draft) -- driver_id 2 is ON_TRIP to match vehicle 2 (dispatched trip removed per "1 completed, 1 draft" spec)
INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue, final_odometer, fuel_consumed, status, created_at, dispatched_at, completed_at) VALUES
('Chennai', 'Bengaluru', 1, 1, 600, 350, 18000, 15550, 42.5, 'COMPLETED', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),
('Chennai', 'Trichy', 4, 3, 1800, 320, 21000, NULL, NULL, 'DRAFT', NOW() - INTERVAL '1 day', NULL, NULL);

-- 1 active maintenance record (matches vehicle 3, IN_SHOP)
INSERT INTO maintenance (vehicle_id, description, cost, is_active, created_at, closed_at) VALUES
(3, 'Brake pad replacement and engine oil change', 12500, true, NOW() - INTERVAL '2 days', NULL);

-- 2 fuel logs
INSERT INTO fuel_logs (vehicle_id, liters, cost, date) VALUES
(1, 45.5, 4550, CURRENT_DATE - INTERVAL '4 days'),
(2, 60.0, 6100, CURRENT_DATE - INTERVAL '2 days');

-- 2 expenses
INSERT INTO expenses (vehicle_id, type, amount, date) VALUES
(1, 'Toll', 850, CURRENT_DATE - INTERVAL '4 days'),
(2, 'Parking', 300, CURRENT_DATE - INTERVAL '2 days');

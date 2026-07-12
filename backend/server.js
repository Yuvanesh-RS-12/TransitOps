// TransitOps Backend — single-file Express API (hackathon build)
// Sections: SETUP -> AUTH -> VEHICLES -> DRIVERS -> TRIPS -> MAINTENANCE -> FUEL/EXPENSES -> DASHBOARD/REPORTS

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// ---------- AUTH MIDDLEWARE ----------
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ============================================================
// AUTH
// ============================================================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4)
       RETURNING id, name, email, role`,
      [name, email, hash, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

// ============================================================
// VEHICLES
// ============================================================
app.get('/api/vehicles', requireAuth, async (req, res) => {
  const { status, type, region } = req.query;
  const conditions = [];
  const values = [];
  if (status) { values.push(status); conditions.push(`status = $${values.length}`); }
  if (type) { values.push(type); conditions.push(`type = $${values.length}`); }
  if (region) { values.push(region); conditions.push(`region = $${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT id, registration_no AS "registrationNo", name, type,
            max_load_capacity AS "maxLoadCapacity", odometer,
            acquisition_cost AS "acquisitionCost", status, region
     FROM vehicles ${where} ORDER BY id`, values
  );
  res.json(result.rows);
});

app.post('/api/vehicles', requireAuth, async (req, res) => {
  const { registrationNo, name, type, maxLoadCapacity, odometer, acquisitionCost, region } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO vehicles (registration_no, name, type, max_load_capacity, odometer, acquisition_cost, region)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [registrationNo, name, type, maxLoadCapacity, odometer || 0, acquisitionCost, region || 'Default']
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Registration number already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vehicles/:id', requireAuth, async (req, res) => {
  const { name, type, maxLoadCapacity, odometer, acquisitionCost, status, region } = req.body;
  await pool.query(
    `UPDATE vehicles SET name=$1, type=$2, max_load_capacity=$3, odometer=$4,
     acquisition_cost=$5, status=$6, region=$7 WHERE id=$8`,
    [name, type, maxLoadCapacity, odometer, acquisitionCost, status, region, req.params.id]
  );
  res.json({ success: true });
});

app.delete('/api/vehicles/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM vehicles WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ============================================================
// DRIVERS
// ============================================================
app.get('/api/drivers', requireAuth, async (req, res) => {
  const { status } = req.query;
  const where = status ? 'WHERE status = $1' : '';
  const values = status ? [status] : [];
  const result = await pool.query(
    `SELECT id, name, license_number AS "licenseNumber", license_category AS "licenseCategory",
            license_expiry AS "licenseExpiry", contact_number AS "contactNumber",
            safety_score AS "safetyScore", status
     FROM drivers ${where} ORDER BY id`, values
  );
  res.json(result.rows);
});

app.post('/api/drivers', requireAuth, async (req, res) => {
  const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO drivers (name, license_number, license_category, license_expiry, contact_number, safety_score)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore || 100]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'License number already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/drivers/:id', requireAuth, async (req, res) => {
  const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore, status } = req.body;
  await pool.query(
    `UPDATE drivers SET name=$1, license_number=$2, license_category=$3, license_expiry=$4,
     contact_number=$5, safety_score=$6, status=$7 WHERE id=$8`,
    [name, licenseNumber, licenseCategory, licenseExpiry, contactNumber, safetyScore, status, req.params.id]
  );
  res.json({ success: true });
});

app.delete('/api/drivers/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM drivers WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ============================================================
// TRIPS  (core business logic: validations + status transitions)
// ============================================================
app.get('/api/trips', requireAuth, async (req, res) => {
  const result = await pool.query(`
    SELECT t.id, t.source, t.destination, t.cargo_weight AS "cargoWeight",
           t.planned_distance AS "plannedDistance", t.revenue,
           t.final_odometer AS "finalOdometer", t.fuel_consumed AS "fuelConsumed",
           t.status, t.created_at AS "createdAt",
           v.id AS "vehicleId", v.registration_no AS "vehicleReg",
           d.id AS "driverId", d.name AS "driverName"
    FROM trips t
    JOIN vehicles v ON v.id = t.vehicle_id
    JOIN drivers d ON d.id = t.driver_id
    ORDER BY t.id DESC
  `);
  res.json(result.rows);
});

app.post('/api/trips', requireAuth, async (req, res) => {
  const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue } = req.body;
  try {
    const vRes = await pool.query('SELECT * FROM vehicles WHERE id=$1', [vehicleId]);
    const dRes = await pool.query('SELECT * FROM drivers WHERE id=$1', [driverId]);
    const vehicle = vRes.rows[0];
    const driver = dRes.rows[0];

    if (!vehicle || !driver) return res.status(404).json({ error: 'Vehicle or driver not found' });
    if (vehicle.status !== 'AVAILABLE') return res.status(400).json({ error: 'Vehicle is not available' });
    if (driver.status !== 'AVAILABLE') return res.status(400).json({ error: 'Driver is not available' });
    if (driver.status === 'SUSPENDED' || new Date(driver.license_expiry) < new Date())
      return res.status(400).json({ error: 'Driver license expired or suspended' });
    if (Number(cargoWeight) > Number(vehicle.max_load_capacity))
      return res.status(400).json({ error: `Cargo weight exceeds vehicle capacity (${vehicle.max_load_capacity}kg)` });

    const result = await pool.query(
      `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, revenue)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue || 0]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/trips/:id/dispatch', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tRes = await client.query('SELECT * FROM trips WHERE id=$1', [req.params.id]);
    const trip = tRes.rows[0];
    if (!trip) throw new Error('Trip not found');
    if (trip.status !== 'DRAFT') throw new Error('Only draft trips can be dispatched');

    await client.query('UPDATE trips SET status=$1, dispatched_at=NOW() WHERE id=$2', ['DISPATCHED', trip.id]);
    await client.query('UPDATE vehicles SET status=$1 WHERE id=$2', ['ON_TRIP', trip.vehicle_id]);
    await client.query('UPDATE drivers SET status=$1 WHERE id=$2', ['ON_TRIP', trip.driver_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/trips/:id/complete', requireAuth, async (req, res) => {
  const { finalOdometer, fuelConsumed } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tRes = await client.query('SELECT * FROM trips WHERE id=$1', [req.params.id]);
    const trip = tRes.rows[0];
    if (!trip) throw new Error('Trip not found');
    if (trip.status !== 'DISPATCHED') throw new Error('Only dispatched trips can be completed');

    await client.query(
      'UPDATE trips SET status=$1, final_odometer=$2, fuel_consumed=$3, completed_at=NOW() WHERE id=$4',
      ['COMPLETED', finalOdometer, fuelConsumed, trip.id]
    );
    await client.query('UPDATE vehicles SET status=$1, odometer=$2 WHERE id=$3', ['AVAILABLE', finalOdometer, trip.vehicle_id]);
    await client.query('UPDATE drivers SET status=$1 WHERE id=$2', ['AVAILABLE', trip.driver_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/trips/:id/cancel', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tRes = await client.query('SELECT * FROM trips WHERE id=$1', [req.params.id]);
    const trip = tRes.rows[0];
    if (!trip) throw new Error('Trip not found');
    if (trip.status !== 'DISPATCHED') throw new Error('Only dispatched trips can be cancelled');

    await client.query('UPDATE trips SET status=$1 WHERE id=$2', ['CANCELLED', trip.id]);
    await client.query('UPDATE vehicles SET status=$1 WHERE id=$2', ['AVAILABLE', trip.vehicle_id]);
    await client.query('UPDATE drivers SET status=$1 WHERE id=$2', ['AVAILABLE', trip.driver_id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// MAINTENANCE
// ============================================================
app.get('/api/maintenance', requireAuth, async (req, res) => {
  const result = await pool.query(`
    SELECT m.id, m.description, m.cost, m.is_active AS "isActive",
           m.created_at AS "createdAt", m.closed_at AS "closedAt",
           v.id AS "vehicleId", v.registration_no AS "vehicleReg"
    FROM maintenance m JOIN vehicles v ON v.id = m.vehicle_id
    ORDER BY m.id DESC
  `);
  res.json(result.rows);
});

app.post('/api/maintenance', requireAuth, async (req, res) => {
  const { vehicleId, description, cost } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO maintenance (vehicle_id, description, cost) VALUES ($1,$2,$3) RETURNING id',
      [vehicleId, description, cost]
    );
    await client.query('UPDATE vehicles SET status=$1 WHERE id=$2', ['IN_SHOP', vehicleId]);
    await client.query('COMMIT');
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/maintenance/:id/close', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const mRes = await client.query('SELECT * FROM maintenance WHERE id=$1', [req.params.id]);
    const record = mRes.rows[0];
    if (!record) throw new Error('Maintenance record not found');

    await client.query('UPDATE maintenance SET is_active=false, closed_at=NOW() WHERE id=$1', [record.id]);
    const vRes = await client.query('SELECT status FROM vehicles WHERE id=$1', [record.vehicle_id]);
    if (vRes.rows[0].status !== 'RETIRED') {
      await client.query('UPDATE vehicles SET status=$1 WHERE id=$2', ['AVAILABLE', record.vehicle_id]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================
// FUEL LOGS & EXPENSES
// ============================================================
app.get('/api/fuel-logs', requireAuth, async (req, res) => {
  const result = await pool.query(`
    SELECT f.id, f.liters, f.cost, f.date, v.id AS "vehicleId", v.registration_no AS "vehicleReg"
    FROM fuel_logs f JOIN vehicles v ON v.id = f.vehicle_id ORDER BY f.date DESC
  `);
  res.json(result.rows);
});

app.post('/api/fuel-logs', requireAuth, async (req, res) => {
  const { vehicleId, liters, cost, date } = req.body;
  const result = await pool.query(
    'INSERT INTO fuel_logs (vehicle_id, liters, cost, date) VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE)) RETURNING id',
    [vehicleId, liters, cost, date || null]
  );
  res.status(201).json({ id: result.rows[0].id });
});

app.get('/api/expenses', requireAuth, async (req, res) => {
  const result = await pool.query(`
    SELECT e.id, e.type, e.amount, e.date, v.id AS "vehicleId", v.registration_no AS "vehicleReg"
    FROM expenses e JOIN vehicles v ON v.id = e.vehicle_id ORDER BY e.date DESC
  `);
  res.json(result.rows);
});

app.post('/api/expenses', requireAuth, async (req, res) => {
  const { vehicleId, type, amount, date } = req.body;
  const result = await pool.query(
    'INSERT INTO expenses (vehicle_id, type, amount, date) VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE)) RETURNING id',
    [vehicleId, type, amount, date || null]
  );
  res.status(201).json({ id: result.rows[0].id });
});

// ============================================================
// DASHBOARD & REPORTS
// ============================================================
app.get('/api/dashboard/kpis', requireAuth, async (req, res) => {
  const [vehicles, trips, drivers] = await Promise.all([
    pool.query('SELECT status, COUNT(*) FROM vehicles GROUP BY status'),
    pool.query('SELECT status, COUNT(*) FROM trips GROUP BY status'),
    pool.query('SELECT status, COUNT(*) FROM drivers GROUP BY status'),
  ]);
  const vCounts = Object.fromEntries(vehicles.rows.map(r => [r.status, Number(r.count)]));
  const tCounts = Object.fromEntries(trips.rows.map(r => [r.status, Number(r.count)]));
  const dCounts = Object.fromEntries(drivers.rows.map(r => [r.status, Number(r.count)]));
  const totalVehicles = Object.values(vCounts).reduce((a, b) => a + b, 0);
  const activeVehicles = totalVehicles - (vCounts.RETIRED || 0);
  const utilization = activeVehicles > 0 ? (((vCounts.ON_TRIP || 0) / activeVehicles) * 100).toFixed(1) : 0;

  res.json({
    activeVehicles,
    availableVehicles: vCounts.AVAILABLE || 0,
    vehiclesInMaintenance: vCounts.IN_SHOP || 0,
    activeTrips: tCounts.DISPATCHED || 0,
    pendingTrips: tCounts.DRAFT || 0,
    driversOnDuty: dCounts.ON_TRIP || 0,
    fleetUtilization: Number(utilization),
  });
});

app.get('/api/reports/summary', requireAuth, async (req, res) => {
  const result = await pool.query(`
    SELECT v.id, v.registration_no AS "registrationNo", v.acquisition_cost AS "acquisitionCost",
      COALESCE((SELECT SUM(fuel_consumed) FROM trips WHERE vehicle_id = v.id AND status='COMPLETED'), 0) AS "totalFuel",
      COALESCE((SELECT SUM(final_odometer - (SELECT MIN(odometer) FROM vehicles WHERE id = v.id)) FROM trips WHERE vehicle_id = v.id AND status='COMPLETED'), 0) AS "totalDistance",
      COALESCE((SELECT SUM(cost) FROM fuel_logs WHERE vehicle_id = v.id), 0) AS "fuelCost",
      COALESCE((SELECT SUM(cost) FROM maintenance WHERE vehicle_id = v.id), 0) AS "maintenanceCost",
      COALESCE((SELECT SUM(revenue) FROM trips WHERE vehicle_id = v.id AND status='COMPLETED'), 0) AS "revenue"
    FROM vehicles v ORDER BY v.id
  `);
  const rows = result.rows.map(r => {
    const fuelCost = Number(r.fuelCost);
    const maintenanceCost = Number(r.maintenanceCost);
    const operationalCost = fuelCost + maintenanceCost;
    const totalFuel = Number(r.totalFuel);
    const totalDistance = Number(r.totalDistance);
    const acquisitionCost = Number(r.acquisitionCost);
    const revenue = Number(r.revenue);
    return {
      registrationNo: r.registrationNo,
      fuelEfficiency: totalFuel > 0 ? Number((totalDistance / totalFuel).toFixed(2)) : 0,
      operationalCost: Number(operationalCost.toFixed(2)),
      roi: acquisitionCost > 0 ? Number((((revenue - operationalCost) / acquisitionCost) * 100).toFixed(2)) : 0,
      revenue,
    };
  });
  res.json(rows);
});

app.get('/api/reports/export/csv', requireAuth, async (req, res) => {
  const result = await pool.query(`
    SELECT v.registration_no AS "registrationNo", v.status,
      COALESCE((SELECT SUM(cost) FROM fuel_logs WHERE vehicle_id = v.id), 0) AS "fuelCost",
      COALESCE((SELECT SUM(cost) FROM maintenance WHERE vehicle_id = v.id), 0) AS "maintenanceCost"
    FROM vehicles v ORDER BY v.id
  `);
  const header = 'Registration No,Status,Fuel Cost,Maintenance Cost,Total Cost\n';
  const csv = result.rows.map(r =>
    `${r.registrationNo},${r.status},${r.fuelCost},${r.maintenanceCost},${Number(r.fuelCost) + Number(r.maintenanceCost)}`
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=transitops_report.csv');
  res.send(header + csv);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`TransitOps API running on port ${PORT}`));

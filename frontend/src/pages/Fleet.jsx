import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Wrench, ShieldCheck, AlertTriangle, CalendarClock } from 'lucide-react';
import { Tabs, Table, Modal, FormInput, Button, StatusBadge, ConfirmModal, useToast } from '../components.jsx';
import {
  getVehicles, createVehicle, updateVehicle, deleteVehicle,
  getDrivers, createDriver, updateDriver, deleteDriver,
  getMaintenance,
} from '../api.js';

const VEHICLE_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ON_TRIP', label: 'On Trip' },
  { value: 'IN_SHOP', label: 'In Shop' },
  { value: 'RETIRED', label: 'Retired' },
];

const DRIVER_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ON_TRIP', label: 'On Trip' },
  { value: 'OFF_DUTY', label: 'Off Duty' },
  { value: 'SUSPENDED', label: 'Suspended' },
];

const emptyVehicle = { registrationNo: '', name: '', type: '', maxLoadCapacity: '', odometer: '', acquisitionCost: '', status: 'AVAILABLE', region: '' };
const emptyDriver = { name: '', licenseNumber: '', licenseCategory: '', licenseExpiry: '', contactNumber: '', safetyScore: '100', status: 'AVAILABLE' };

const MAINTENANCE_ODOMETER_THRESHOLD = 40000;
const MAINTENANCE_STALE_DAYS = 180;

function computeVehicleHealth(vehicle, maintenanceRecords) {
  const vehicleRecords = maintenanceRecords.filter((m) => m.vehicleId === vehicle.id);
  const lastRecord = vehicleRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  const daysSinceLastService = lastRecord
    ? (Date.now() - new Date(lastRecord.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  const maintenanceDue =
    vehicle.status !== 'RETIRED' &&
    Number(vehicle.odometer) >= MAINTENANCE_ODOMETER_THRESHOLD &&
    daysSinceLastService > MAINTENANCE_STALE_DAYS;

  const baseScore = { AVAILABLE: 100, ON_TRIP: 90, IN_SHOP: 50, RETIRED: 0 }[vehicle.status] ?? 70;
  const score = Math.max(0, baseScore - (maintenanceDue ? 30 : 0));

  let tier = 'Excellent';
  let toneClass = 'text-green-700 bg-green-50 ring-green-200';
  if (score < 50) { tier = 'Needs Attention'; toneClass = 'text-red-700 bg-red-50 ring-red-200'; }
  else if (score < 80) { tier = 'Good'; toneClass = 'text-amber-700 bg-amber-50 ring-amber-200'; }

  return { score, tier, toneClass, maintenanceDue };
}

function driverLicenseAlert(driver) {
  const now = new Date();
  const expiry = new Date(driver.licenseExpiry);
  const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilExpiry < 0) return { label: 'Expired', toneClass: 'text-red-600' };
  if (daysUntilExpiry <= 30) return { label: 'Expiring soon', toneClass: 'text-amber-600' };
  return null;
}

export default function Fleet() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('Vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [driversLoading, setDriversLoading] = useState(true);
  const [error, setError] = useState('');

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [deleteVehicleTarget, setDeleteVehicleTarget] = useState(null);

  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverForm, setDriverForm] = useState(emptyDriver);
  const [editingDriverId, setEditingDriverId] = useState(null);
  const [savingDriver, setSavingDriver] = useState(false);
  const [deleteDriverTarget, setDeleteDriverTarget] = useState(null);

  const loadVehicles = () => {
    setVehiclesLoading(true);
    return Promise.all([getVehicles(), getMaintenance()])
      .then(([v, m]) => { setVehicles(v); setMaintenanceRecords(m); })
      .finally(() => setVehiclesLoading(false));
  };
  const loadDrivers = () => {
    setDriversLoading(true);
    return getDrivers().then(setDrivers).finally(() => setDriversLoading(false));
  };

  useEffect(() => {
    if (tab === 'Vehicles') loadVehicles();
    if (tab === 'Drivers') loadDrivers();
  }, [tab]);

  // ===== VEHICLE HANDLERS =====
  const openAddVehicle = () => {
    setVehicleForm(emptyVehicle);
    setEditingVehicleId(null);
    setError('');
    setVehicleModalOpen(true);
  };

  const openEditVehicle = (v) => {
    setVehicleForm({
      registrationNo: v.registrationNo, name: v.name, type: v.type,
      maxLoadCapacity: v.maxLoadCapacity, odometer: v.odometer,
      acquisitionCost: v.acquisitionCost, status: v.status, region: v.region || '',
    });
    setEditingVehicleId(v.id);
    setError('');
    setVehicleModalOpen(true);
  };

  const submitVehicle = async (e) => {
    e.preventDefault();
    setError('');
    setSavingVehicle(true);
    try {
      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, vehicleForm);
        showToast('success', 'Vehicle updated successfully');
      } else {
        await createVehicle(vehicleForm);
        showToast('success', 'Vehicle added successfully');
      }
      setVehicleModalOpen(false);
      loadVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save vehicle');
    } finally {
      setSavingVehicle(false);
    }
  };

  const confirmRemoveVehicle = async () => {
    try {
      await deleteVehicle(deleteVehicleTarget.id);
      showToast('success', `${deleteVehicleTarget.registrationNo} deleted`);
      loadVehicles();
    } catch {
      showToast('error', 'Failed to delete vehicle');
    }
  };

  // ===== DRIVER HANDLERS =====
  const openAddDriver = () => {
    setDriverForm(emptyDriver);
    setEditingDriverId(null);
    setError('');
    setDriverModalOpen(true);
  };

  const openEditDriver = (d) => {
    setDriverForm({
      name: d.name, licenseNumber: d.licenseNumber, licenseCategory: d.licenseCategory,
      licenseExpiry: d.licenseExpiry?.split('T')[0] || '', contactNumber: d.contactNumber,
      safetyScore: d.safetyScore, status: d.status,
    });
    setEditingDriverId(d.id);
    setError('');
    setDriverModalOpen(true);
  };

  const submitDriver = async (e) => {
    e.preventDefault();
    setError('');
    setSavingDriver(true);
    try {
      if (editingDriverId) {
        await updateDriver(editingDriverId, driverForm);
        showToast('success', 'Driver updated successfully');
      } else {
        await createDriver(driverForm);
        showToast('success', 'Driver added successfully');
      }
      setDriverModalOpen(false);
      loadDrivers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save driver');
    } finally {
      setSavingDriver(false);
    }
  };

  const confirmRemoveDriver = async () => {
    try {
      await deleteDriver(deleteDriverTarget.id);
      showToast('success', `${deleteDriverTarget.name} deleted`);
      loadDrivers();
    } catch {
      showToast('error', 'Failed to delete driver');
    }
  };

  // ===== COLUMNS =====
  const vehicleColumns = useMemo(() => [
    { key: 'registrationNo', label: 'Registration No' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'maxLoadCapacity', label: 'Max Load (kg)', numeric: true },
    { key: 'odometer', label: 'Odometer', numeric: true },
    { key: 'region', label: 'Region' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'health', label: 'Fleet Health',
      render: (r) => {
        const health = computeVehicleHealth(r, maintenanceRecords);
        return (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${health.toneClass}`}>
              {health.tier} · {health.score}
            </span>
            {health.maintenanceDue && (
              <span title="Maintenance due soon" className="text-amber-500">
                <Wrench size={14} />
              </span>
            )}
          </div>
        );
      },
    },
  ], [maintenanceRecords]);

  const driverColumns = [
    { key: 'name', label: 'Name' },
    { key: 'licenseNumber', label: 'License No' },
    { key: 'licenseCategory', label: 'Category' },
    {
      key: 'licenseExpiry', label: 'Expiry',
      render: (r) => {
        const alert = driverLicenseAlert(r);
        return (
          <div className="flex items-center gap-1.5">
            <span>{new Date(r.licenseExpiry).toLocaleDateString()}</span>
            {alert && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${alert.toneClass}`}>
                <CalendarClock size={12} /> {alert.label}
              </span>
            )}
          </div>
        );
      },
    },
    { key: 'contactNumber', label: 'Contact' },
    { key: 'safetyScore', label: 'Safety Score', numeric: true },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fleet</h1>
          <p className="text-sm text-gray-400 mt-1">Manage vehicles and drivers across your fleet</p>
        </div>
        {tab === 'Vehicles' && (
          <Button onClick={openAddVehicle} className="flex items-center gap-2">
            <Plus size={14} /> Add Vehicle
          </Button>
        )}
        {tab === 'Drivers' && (
          <Button onClick={openAddDriver} className="flex items-center gap-2">
            <Plus size={14} /> Add Driver
          </Button>
        )}
      </div>

      <div className="mt-5">
        <Tabs tabs={['Vehicles', 'Drivers']} active={tab} onChange={setTab} />
      </div>

      {tab === 'Vehicles' && (
        <Table
          columns={vehicleColumns}
          data={vehicles}
          loading={vehiclesLoading}
          searchable
          searchKeys={['registrationNo', 'name', 'type', 'region']}
          emptyTitle="No vehicles yet"
          emptyMessage="Add your first vehicle to start building your fleet."
          actions={(v) => (
            <div className="flex gap-1">
              <button onClick={() => openEditVehicle(v)} className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg p-1.5 transition-colors">
                <Pencil size={15} />
              </button>
              <button onClick={() => setDeleteVehicleTarget(v)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          )}
        />
      )}

      {tab === 'Drivers' && (
        <Table
          columns={driverColumns}
          data={drivers}
          loading={driversLoading}
          searchable
          searchKeys={['name', 'licenseNumber', 'licenseCategory']}
          emptyTitle="No drivers yet"
          emptyMessage="Add your first driver to assign them to trips."
          actions={(d) => (
            <div className="flex gap-1">
              <button onClick={() => openEditDriver(d)} className="text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg p-1.5 transition-colors">
                <Pencil size={15} />
              </button>
              <button onClick={() => setDeleteDriverTarget(d)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1.5 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          )}
        />
      )}

      {/* VEHICLE MODAL */}
      <Modal open={vehicleModalOpen} onClose={() => setVehicleModalOpen(false)} title={editingVehicleId ? 'Edit Vehicle' : 'Add Vehicle'}>
        <form onSubmit={submitVehicle}>
          <FormInput label="Registration Number" value={vehicleForm.registrationNo} required
            onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNo: e.target.value })} />
          <FormInput label="Name / Model" value={vehicleForm.name} required
            onChange={(e) => setVehicleForm({ ...vehicleForm, name: e.target.value })} />
          <FormInput label="Type" value={vehicleForm.type} required
            onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })} />
          <FormInput label="Max Load Capacity (kg)" type="number" step="0.01" value={vehicleForm.maxLoadCapacity} required
            onChange={(e) => setVehicleForm({ ...vehicleForm, maxLoadCapacity: e.target.value })} />
          <FormInput label="Odometer" type="number" step="0.01" value={vehicleForm.odometer}
            onChange={(e) => setVehicleForm({ ...vehicleForm, odometer: e.target.value })} />
          <FormInput label="Acquisition Cost" type="number" step="0.01" value={vehicleForm.acquisitionCost} required
            onChange={(e) => setVehicleForm({ ...vehicleForm, acquisitionCost: e.target.value })} />
          <FormInput label="Region" value={vehicleForm.region}
            onChange={(e) => setVehicleForm({ ...vehicleForm, region: e.target.value })} />
          {editingVehicleId && (
            <FormInput label="Status" type="select" options={VEHICLE_STATUS_OPTIONS} value={vehicleForm.status}
              onChange={(e) => setVehicleForm({ ...vehicleForm, status: e.target.value })} />
          )}
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <Button type="submit" loading={savingVehicle} className="w-full mt-2 justify-center">
            {editingVehicleId ? 'Save Changes' : 'Add Vehicle'}
          </Button>
        </form>
      </Modal>

      {/* DRIVER MODAL */}
      <Modal open={driverModalOpen} onClose={() => setDriverModalOpen(false)} title={editingDriverId ? 'Edit Driver' : 'Add Driver'}>
        <form onSubmit={submitDriver}>
          <FormInput label="Name" value={driverForm.name} required
            onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })} />
          <FormInput label="License Number" value={driverForm.licenseNumber} required
            onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })} />
          <FormInput label="License Category" value={driverForm.licenseCategory} required
            onChange={(e) => setDriverForm({ ...driverForm, licenseCategory: e.target.value })} />
          <FormInput label="License Expiry" type="date" value={driverForm.licenseExpiry} required
            onChange={(e) => setDriverForm({ ...driverForm, licenseExpiry: e.target.value })} />
          <FormInput label="Contact Number" value={driverForm.contactNumber} required
            onChange={(e) => setDriverForm({ ...driverForm, contactNumber: e.target.value })} />
          <FormInput label="Safety Score" type="number" step="0.01" value={driverForm.safetyScore}
            onChange={(e) => setDriverForm({ ...driverForm, safetyScore: e.target.value })} />
          {editingDriverId && (
            <FormInput label="Status" type="select" options={DRIVER_STATUS_OPTIONS} value={driverForm.status}
              onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })} />
          )}
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <Button type="submit" loading={savingDriver} className="w-full mt-2 justify-center">
            {editingDriverId ? 'Save Changes' : 'Add Driver'}
          </Button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteVehicleTarget}
        onClose={() => setDeleteVehicleTarget(null)}
        onConfirm={confirmRemoveVehicle}
        title="Delete this vehicle?"
        message={deleteVehicleTarget ? `${deleteVehicleTarget.registrationNo} — ${deleteVehicleTarget.name} will be permanently removed.` : ''}
        confirmLabel="Delete"
      />

      <ConfirmModal
        open={!!deleteDriverTarget}
        onClose={() => setDeleteDriverTarget(null)}
        onConfirm={confirmRemoveDriver}
        title="Delete this driver?"
        message={deleteDriverTarget ? `${deleteDriverTarget.name} will be permanently removed.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}
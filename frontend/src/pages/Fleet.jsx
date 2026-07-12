import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Tabs, Table, Modal, FormInput, Button, StatusBadge } from '../components.jsx';
import {
  getVehicles, createVehicle, updateVehicle, deleteVehicle,
  getDrivers, createDriver, updateDriver, deleteDriver,
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

export default function Fleet() {
  const [tab, setTab] = useState('Vehicles');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState('');

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [editingVehicleId, setEditingVehicleId] = useState(null);

  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverForm, setDriverForm] = useState(emptyDriver);
  const [editingDriverId, setEditingDriverId] = useState(null);

  const loadVehicles = () => getVehicles().then(setVehicles);
  const loadDrivers = () => getDrivers().then(setDrivers);

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
    try {
      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, vehicleForm);
      } else {
        await createVehicle(vehicleForm);
      }
      setVehicleModalOpen(false);
      loadVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save vehicle');
    }
  };

  const removeVehicle = async (id) => {
    if (!window.confirm('Delete this vehicle? This cannot be undone.')) return;
    await deleteVehicle(id);
    loadVehicles();
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
    try {
      if (editingDriverId) {
        await updateDriver(editingDriverId, driverForm);
      } else {
        await createDriver(driverForm);
      }
      setDriverModalOpen(false);
      loadDrivers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save driver');
    }
  };

  const removeDriver = async (id) => {
    if (!window.confirm('Delete this driver? This cannot be undone.')) return;
    await deleteDriver(id);
    loadDrivers();
  };

  // ===== COLUMNS =====
  const vehicleColumns = [
    { key: 'registrationNo', label: 'Registration No' },
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'maxLoadCapacity', label: 'Max Load (kg)' },
    { key: 'odometer', label: 'Odometer' },
    { key: 'region', label: 'Region' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const driverColumns = [
    { key: 'name', label: 'Name' },
    { key: 'licenseNumber', label: 'License No' },
    { key: 'licenseCategory', label: 'Category' },
    { key: 'licenseExpiry', label: 'Expiry', render: (r) => new Date(r.licenseExpiry).toLocaleDateString() },
    { key: 'contactNumber', label: 'Contact' },
    { key: 'safetyScore', label: 'Safety Score' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Fleet</h1>
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

      <Tabs tabs={['Vehicles', 'Drivers']} active={tab} onChange={setTab} />

      {tab === 'Vehicles' && (
        <Table
          columns={vehicleColumns}
          data={vehicles}
          actions={(v) => (
            <div className="flex gap-2">
              <button onClick={() => openEditVehicle(v)} className="text-gray-400 hover:text-primary-600">
                <Pencil size={16} />
              </button>
              <button onClick={() => removeVehicle(v.id)} className="text-gray-400 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        />
      )}

      {tab === 'Drivers' && (
        <Table
          columns={driverColumns}
          data={drivers}
          actions={(d) => (
            <div className="flex gap-2">
              <button onClick={() => openEditDriver(d)} className="text-gray-400 hover:text-primary-600">
                <Pencil size={16} />
              </button>
              <button onClick={() => removeDriver(d.id)} className="text-gray-400 hover:text-red-600">
                <Trash2 size={16} />
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
          <Button type="submit" className="w-full mt-2">{editingVehicleId ? 'Save Changes' : 'Add Vehicle'}</Button>
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
          <Button type="submit" className="w-full mt-2">{editingDriverId ? 'Save Changes' : 'Add Driver'}</Button>
        </form>
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Tabs, Table, Modal, FormInput, Button, StatusBadge } from '../components.jsx';
import {
  getMaintenance, createMaintenance, closeMaintenance,
  getFuelLogs, createFuelLog,
  getExpenses, createExpense,
  getVehicles,
} from '../api.js';

const emptyMaintenanceForm = { vehicleId: '', description: '', cost: '' };
const emptyFuelForm = { vehicleId: '', liters: '', cost: '', date: '' };
const emptyExpenseForm = { vehicleId: '', type: '', amount: '', date: '' };

export default function Operations() {
  const [tab, setTab] = useState('Maintenance');
  const [error, setError] = useState('');

  // ===== MAINTENANCE STATE =====
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenanceForm);
  const [maintenanceVehicles, setMaintenanceVehicles] = useState([]);
  const [actionError, setActionError] = useState({});

  // ===== FUEL STATE =====
  const [fuelLogs, setFuelLogs] = useState([]);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState(emptyFuelForm);
  const [allVehicles, setAllVehicles] = useState([]);

  // ===== EXPENSE STATE =====
  const [expenses, setExpenses] = useState([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);

  const loadMaintenance = () => getMaintenance().then(setMaintenanceRecords);
  const loadFuelLogs = () => getFuelLogs().then(setFuelLogs);
  const loadExpenses = () => getExpenses().then(setExpenses);
  const loadAllVehicles = () => getVehicles().then(setAllVehicles);

  useEffect(() => {
    if (tab === 'Maintenance') loadMaintenance();
    if (tab === 'Fuel') { loadFuelLogs(); loadAllVehicles(); }
    if (tab === 'Expenses') { loadExpenses(); loadAllVehicles(); }
  }, [tab]);

  // ===== MAINTENANCE HANDLERS =====
  const openMaintenanceModal = async () => {
    setError('');
    setMaintenanceForm(emptyMaintenanceForm);
    const vehicles = await getVehicles({ status: 'AVAILABLE' });
    setMaintenanceVehicles(vehicles);
    setMaintenanceModalOpen(true);
  };

  const submitMaintenance = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createMaintenance({
        vehicleId: Number(maintenanceForm.vehicleId),
        description: maintenanceForm.description,
        cost: Number(maintenanceForm.cost),
      });
      setMaintenanceModalOpen(false);
      loadMaintenance();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create maintenance record');
    }
  };

  const handleCloseMaintenance = async (id) => {
    setActionError((prev) => { const next = { ...prev }; delete next[id]; return next; });
    try {
      await closeMaintenance(id);
      loadMaintenance();
    } catch (err) {
      setActionError((prev) => ({ ...prev, [id]: err.response?.data?.error || 'Failed to close record' }));
    }
  };

  // ===== FUEL HANDLERS =====
  const openFuelModal = () => {
    setError('');
    setFuelForm(emptyFuelForm);
    setFuelModalOpen(true);
  };

  const submitFuel = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createFuelLog({
        vehicleId: Number(fuelForm.vehicleId),
        liters: Number(fuelForm.liters),
        cost: Number(fuelForm.cost),
        date: fuelForm.date || undefined,
      });
      setFuelModalOpen(false);
      loadFuelLogs();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add fuel log');
    }
  };

  // ===== EXPENSE HANDLERS =====
  const openExpenseModal = () => {
    setError('');
    setExpenseForm(emptyExpenseForm);
    setExpenseModalOpen(true);
  };

  const submitExpense = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createExpense({
        vehicleId: Number(expenseForm.vehicleId),
        type: expenseForm.type,
        amount: Number(expenseForm.amount),
        date: expenseForm.date || undefined,
      });
      setExpenseModalOpen(false);
      loadExpenses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense');
    }
  };

  // ===== OPTIONS =====
  const maintenanceVehicleOptions = maintenanceVehicles.map((v) => ({
    value: String(v.id), label: `${v.registrationNo} — ${v.name}`,
  }));
  const allVehicleOptions = allVehicles.map((v) => ({
    value: String(v.id), label: `${v.registrationNo} — ${v.name}`,
  }));

  // ===== COLUMNS =====
  const maintenanceColumns = [
    { key: 'vehicleReg', label: 'Vehicle' },
    { key: 'description', label: 'Description' },
    { key: 'cost', label: 'Cost (₹)' },
    { key: 'createdAt', label: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.isActive ? 'IN_SHOP' : 'AVAILABLE'} /> },
  ];

  const fuelColumns = [
    { key: 'vehicleReg', label: 'Vehicle' },
    { key: 'liters', label: 'Liters' },
    { key: 'cost', label: 'Cost (₹)' },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
  ];

  const expenseColumns = [
    { key: 'vehicleReg', label: 'Vehicle' },
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Amount (₹)' },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Operations</h1>
        {tab === 'Maintenance' && (
          <Button onClick={openMaintenanceModal} className="flex items-center gap-2">
            <Plus size={14} /> New Maintenance Record
          </Button>
        )}
        {tab === 'Fuel' && (
          <Button onClick={openFuelModal} className="flex items-center gap-2">
            <Plus size={14} /> Add Fuel Log
          </Button>
        )}
        {tab === 'Expenses' && (
          <Button onClick={openExpenseModal} className="flex items-center gap-2">
            <Plus size={14} /> Add Expense
          </Button>
        )}
      </div>

      <Tabs tabs={['Maintenance', 'Fuel', 'Expenses']} active={tab} onChange={setTab} />

      {tab === 'Maintenance' && (
        <Table
          columns={maintenanceColumns}
          data={maintenanceRecords}
          actions={(m) => (
            <div className="flex flex-col gap-1 items-start">
              {m.isActive ? (
                <Button variant="success" onClick={() => handleCloseMaintenance(m.id)}>Close</Button>
              ) : (
                <span className="text-xs text-gray-400">Closed</span>
              )}
              {actionError[m.id] && <p className="text-red-600 text-xs">{actionError[m.id]}</p>}
            </div>
          )}
        />
      )}

      {tab === 'Fuel' && <Table columns={fuelColumns} data={fuelLogs} />}

      {tab === 'Expenses' && <Table columns={expenseColumns} data={expenses} />}

      {/* MAINTENANCE MODAL */}
      <Modal open={maintenanceModalOpen} onClose={() => setMaintenanceModalOpen(false)} title="New Maintenance Record">
        <form onSubmit={submitMaintenance}>
          <FormInput label="Vehicle" type="select" options={maintenanceVehicleOptions} value={maintenanceForm.vehicleId} required
            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicleId: e.target.value })} />
          {maintenanceVehicleOptions.length === 0 && (
            <p className="text-xs text-amber-600 -mt-3 mb-4">No available vehicles right now.</p>
          )}
          <FormInput label="Description" value={maintenanceForm.description} required
            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })} />
          <FormInput label="Cost (₹)" type="number" step="0.01" value={maintenanceForm.cost} required
            onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} />
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <p className="text-xs text-gray-400 mb-3">Creating this record will set the vehicle status to "In Shop".</p>
          <Button type="submit" className="w-full mt-2">Create Record</Button>
        </form>
      </Modal>

      {/* FUEL MODAL */}
      <Modal open={fuelModalOpen} onClose={() => setFuelModalOpen(false)} title="Add Fuel Log">
        <form onSubmit={submitFuel}>
          <FormInput label="Vehicle" type="select" options={allVehicleOptions} value={fuelForm.vehicleId} required
            onChange={(e) => setFuelForm({ ...fuelForm, vehicleId: e.target.value })} />
          <FormInput label="Liters" type="number" step="0.01" value={fuelForm.liters} required
            onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} />
          <FormInput label="Cost (₹)" type="number" step="0.01" value={fuelForm.cost} required
            onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} />
          <FormInput label="Date" type="date" value={fuelForm.date}
            onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} />
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <Button type="submit" className="w-full mt-2">Add Fuel Log</Button>
        </form>
      </Modal>

      {/* EXPENSE MODAL */}
      <Modal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} title="Add Expense">
        <form onSubmit={submitExpense}>
          <FormInput label="Vehicle" type="select" options={allVehicleOptions} value={expenseForm.vehicleId} required
            onChange={(e) => setExpenseForm({ ...expenseForm, vehicleId: e.target.value })} />
          <FormInput label="Type" value={expenseForm.type} required
            onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })} />
          <FormInput label="Amount (₹)" type="number" step="0.01" value={expenseForm.amount} required
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
          <FormInput label="Date" type="date" value={expenseForm.date}
            onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <Button type="submit" className="w-full mt-2">Add Expense</Button>
        </form>
      </Modal>
    </div>
  );
}

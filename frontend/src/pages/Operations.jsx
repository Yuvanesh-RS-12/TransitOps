import { useState, useEffect } from 'react';
import { Plus, Wrench, AlertTriangle } from 'lucide-react';
import { Tabs, Table, Modal, FormInput, Button, StatusBadge, useToast, formatNumber } from '../components.jsx';
import {
  getMaintenance, createMaintenance, closeMaintenance,
  getFuelLogs, createFuelLog,
  getExpenses, createExpense,
  getVehicles,
} from '../api.js';

const emptyMaintenanceForm = { vehicleId: '', description: '', cost: '' };
const emptyFuelForm = { vehicleId: '', liters: '', cost: '', date: '' };
const emptyExpenseForm = { vehicleId: '', type: '', amount: '', date: '' };

const MAINTENANCE_ODOMETER_THRESHOLD = 40000;
const MAINTENANCE_STALE_DAYS = 180;

// Same heuristic used in Fleet.jsx's Predictive Maintenance flag — kept consistent across modules.
function isMaintenanceDue(vehicle, maintenanceRecords) {
  const vehicleRecords = maintenanceRecords.filter((m) => m.vehicleId === vehicle.id);
  const lastRecord = vehicleRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const daysSinceLastService = lastRecord
    ? (Date.now() - new Date(lastRecord.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;
  return (
    vehicle.status !== 'RETIRED' &&
    Number(vehicle.odometer) >= MAINTENANCE_ODOMETER_THRESHOLD &&
    daysSinceLastService > MAINTENANCE_STALE_DAYS
  );
}

export default function Operations() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('Maintenance');
  const [error, setError] = useState('');

  // ===== MAINTENANCE STATE =====
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenanceForm);
  const [maintenanceVehicles, setMaintenanceVehicles] = useState([]);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [closingId, setClosingId] = useState(null);
  const [actionError, setActionError] = useState({});

  // Vehicles with odometer/status data, used to compute maintenance-due flags on the Maintenance tab
  const [dueCheckVehicles, setDueCheckVehicles] = useState([]);

  // ===== FUEL STATE =====
  const [fuelLogs, setFuelLogs] = useState([]);
  const [fuelLoading, setFuelLoading] = useState(true);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [fuelForm, setFuelForm] = useState(emptyFuelForm);
  const [savingFuel, setSavingFuel] = useState(false);
  const [allVehicles, setAllVehicles] = useState([]);

  // ===== EXPENSE STATE =====
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [savingExpense, setSavingExpense] = useState(false);

  const loadMaintenance = () => {
    setMaintenanceLoading(true);
    return Promise.all([getMaintenance(), getVehicles()])
      .then(([records, vehicles]) => {
        setMaintenanceRecords(records);
        setDueCheckVehicles(vehicles);
      })
      .finally(() => setMaintenanceLoading(false));
  };
  const loadFuelLogs = () => {
    setFuelLoading(true);
    return getFuelLogs().then(setFuelLogs).finally(() => setFuelLoading(false));
  };
  const loadExpenses = () => {
    setExpensesLoading(true);
    return getExpenses().then(setExpenses).finally(() => setExpensesLoading(false));
  };
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
    setSavingMaintenance(true);
    try {
      await createMaintenance({
        vehicleId: Number(maintenanceForm.vehicleId),
        description: maintenanceForm.description,
        cost: Number(maintenanceForm.cost),
      });
      setMaintenanceModalOpen(false);
      showToast('success', 'Maintenance record created — vehicle set to In Shop');
      loadMaintenance();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create maintenance record');
    } finally {
      setSavingMaintenance(false);
    }
  };

  const handleCloseMaintenance = async (id) => {
    setActionError((prev) => { const next = { ...prev }; delete next[id]; return next; });
    setClosingId(id);
    try {
      await closeMaintenance(id);
      showToast('success', 'Maintenance record closed — vehicle restored to Available');
      loadMaintenance();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to close record';
      setActionError((prev) => ({ ...prev, [id]: message }));
      showToast('error', message);
    } finally {
      setClosingId(null);
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
    setSavingFuel(true);
    try {
      await createFuelLog({
        vehicleId: Number(fuelForm.vehicleId),
        liters: Number(fuelForm.liters),
        cost: Number(fuelForm.cost),
        date: fuelForm.date || undefined,
      });
      setFuelModalOpen(false);
      showToast('success', 'Fuel log added');
      loadFuelLogs();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add fuel log');
    } finally {
      setSavingFuel(false);
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
    setSavingExpense(true);
    try {
      await createExpense({
        vehicleId: Number(expenseForm.vehicleId),
        type: expenseForm.type,
        amount: Number(expenseForm.amount),
        date: expenseForm.date || undefined,
      });
      setExpenseModalOpen(false);
      showToast('success', 'Expense added');
      loadExpenses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add expense');
    } finally {
      setSavingExpense(false);
    }
  };

  // ===== OPTIONS =====
  const maintenanceVehicleOptions = maintenanceVehicles.map((v) => ({
    value: String(v.id), label: `${v.registrationNo} — ${v.name}`,
  }));
  const allVehicleOptions = allVehicles.map((v) => ({
    value: String(v.id), label: `${v.registrationNo} — ${v.name}`,
  }));

  // ===== MAINTENANCE-DUE VEHICLES (no open record, flagged by odometer + staleness heuristic) =====
  const vehiclesWithOpenRecord = new Set(
    maintenanceRecords.filter((m) => m.isActive).map((m) => m.vehicleId)
  );
  const dueVehicles = dueCheckVehicles.filter(
    (v) => !vehiclesWithOpenRecord.has(v.id) && isMaintenanceDue(v, maintenanceRecords)
  );

  // ===== COLUMNS =====
  const maintenanceColumns = [
    { key: 'vehicleReg', label: 'Vehicle' },
    { key: 'description', label: 'Description' },
    { key: 'cost', label: 'Cost (₹)', render: (r) => formatNumber(r.cost, 2) },
    { key: 'createdAt', label: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.isActive ? 'IN_SHOP' : 'AVAILABLE'} /> },
  ];

  const fuelColumns = [
    { key: 'vehicleReg', label: 'Vehicle' },
    { key: 'liters', label: 'Liters', render: (r) => formatNumber(r.liters, 2) },
    { key: 'cost', label: 'Cost (₹)', render: (r) => formatNumber(r.cost, 2) },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString() },
  ];

  const expenseColumns = [
    { key: 'vehicleReg', label: 'Vehicle' },
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Amount (₹)', render: (r) => formatNumber(r.amount, 2) },
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
        <div>
          {!maintenanceLoading && dueVehicles.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {dueVehicles.length} vehicle{dueVehicles.length > 1 ? 's are' : ' is'} due for maintenance
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {dueVehicles.map((v) => v.registrationNo).join(', ')} — high odometer reading with no service logged in over {MAINTENANCE_STALE_DAYS} days.
                </p>
              </div>
            </div>
          )}

          <Table
            columns={maintenanceColumns}
            data={maintenanceRecords}
            loading={maintenanceLoading}
            searchable
            searchKeys={['vehicleReg', 'description']}
            emptyTitle="No maintenance records found"
            emptyMessage="Create a record to get started."
            actions={(m) => (
              <div className="flex flex-col gap-1 items-start">
                {m.isActive ? (
                  <Button variant="success" onClick={() => handleCloseMaintenance(m.id)} loading={closingId === m.id}>
                    Close
                  </Button>
                ) : (
                  <span className="text-xs text-gray-400">Closed</span>
                )}
                {actionError[m.id] && <p className="text-red-600 text-xs">{actionError[m.id]}</p>}
              </div>
            )}
          />
        </div>
      )}

      {tab === 'Fuel' && (
        <Table
          columns={fuelColumns}
          data={fuelLogs}
          loading={fuelLoading}
          searchable
          searchKeys={['vehicleReg']}
          emptyTitle="No fuel logs found"
          emptyMessage="Add a fuel log to get started."
        />
      )}

      {tab === 'Expenses' && (
        <Table
          columns={expenseColumns}
          data={expenses}
          loading={expensesLoading}
          searchable
          searchKeys={['vehicleReg', 'type']}
          emptyTitle="No expenses found"
          emptyMessage="Add an expense to get started."
        />
      )}

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
          <Button type="submit" loading={savingMaintenance} className="w-full mt-2 justify-center">Create Record</Button>
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
          <Button type="submit" loading={savingFuel} className="w-full mt-2 justify-center">Add Fuel Log</Button>
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
          <Button type="submit" loading={savingExpense} className="w-full mt-2 justify-center">Add Expense</Button>
        </form>
      </Modal>
    </div>
  );
}
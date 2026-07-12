import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Table, Modal, FormInput, Button, StatusBadge, ConfirmModal, useToast, formatNumber } from '../components.jsx';
import {
  getTrips, createTrip, dispatchTrip, completeTrip, cancelTrip,
  getVehicles, getDrivers,
} from '../api.js';

const emptyTripForm = {
  source: '', destination: '', vehicleId: '', driverId: '',
  cargoWeight: '', plannedDistance: '', revenue: '',
};

const emptyCompleteForm = { finalOdometer: '', fuelConsumed: '' };

export default function Trips() {
  const { showToast } = useToast();

  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [error, setError] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tripForm, setTripForm] = useState(emptyTripForm);
  const [savingTrip, setSavingTrip] = useState(false);

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState(emptyCompleteForm);
  const [completingTripId, setCompletingTripId] = useState(null);
  const [savingComplete, setSavingComplete] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [dispatchingId, setDispatchingId] = useState(null);

  const [actionError, setActionError] = useState({});

  const loadTrips = () => {
    setTripsLoading(true);
    return getTrips().then(setTrips).finally(() => setTripsLoading(false));
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const openCreateModal = async () => {
    setError('');
    setTripForm(emptyTripForm);
    const [vehicles, drivers] = await Promise.all([
      getVehicles({ status: 'AVAILABLE' }),
      getDrivers({ status: 'AVAILABLE' }),
    ]);
    setAvailableVehicles(vehicles);
    setAvailableDrivers(drivers);
    setCreateModalOpen(true);
  };

  const submitTrip = async (e) => {
    e.preventDefault();
    setError('');
    setSavingTrip(true);
    try {
      await createTrip({
        ...tripForm,
        vehicleId: Number(tripForm.vehicleId),
        driverId: Number(tripForm.driverId),
        cargoWeight: Number(tripForm.cargoWeight),
        plannedDistance: Number(tripForm.plannedDistance),
        revenue: tripForm.revenue ? Number(tripForm.revenue) : 0,
      });
      setCreateModalOpen(false);
      showToast('success', 'Trip created successfully');
      loadTrips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create trip');
    } finally {
      setSavingTrip(false);
    }
  };

  const clearActionError = (tripId) => {
    setActionError((prev) => {
      const next = { ...prev };
      delete next[tripId];
      return next;
    });
  };

  const handleDispatch = async (tripId) => {
    clearActionError(tripId);
    setDispatchingId(tripId);
    try {
      await dispatchTrip(tripId);
      showToast('success', 'Trip dispatched');
      loadTrips();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to dispatch trip';
      setActionError((prev) => ({ ...prev, [tripId]: message }));
      showToast('error', message);
    } finally {
      setDispatchingId(null);
    }
  };

  const confirmCancelTrip = async () => {
    const tripId = cancelTarget.id;
    clearActionError(tripId);
    try {
      await cancelTrip(tripId);
      showToast('success', 'Trip cancelled — vehicle and driver restored to Available');
      loadTrips();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to cancel trip';
      setActionError((prev) => ({ ...prev, [tripId]: message }));
      showToast('error', message);
    }
  };

  const openCompleteModal = (tripId) => {
    setCompleteForm(emptyCompleteForm);
    setCompletingTripId(tripId);
    clearActionError(tripId);
    setCompleteModalOpen(true);
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    setSavingComplete(true);
    try {
      await completeTrip(completingTripId, {
        finalOdometer: Number(completeForm.finalOdometer),
        fuelConsumed: Number(completeForm.fuelConsumed),
      });
      setCompleteModalOpen(false);
      showToast('success', 'Trip completed successfully');
      loadTrips();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to complete trip';
      setActionError((prev) => ({ ...prev, [completingTripId]: message }));
      showToast('error', message);
      setCompleteModalOpen(false);
    } finally {
      setSavingComplete(false);
    }
  };

  const vehicleOptions = availableVehicles.map((v) => ({
    value: String(v.id), label: `${v.registrationNo} — ${v.name} (max ${formatNumber(v.maxLoadCapacity)}kg)`,
  }));
  const driverOptions = availableDrivers.map((d) => ({
    value: String(d.id), label: `${d.name} — ${d.licenseNumber}`,
  }));

  const columns = [
    { key: 'source', label: 'Source' },
    { key: 'destination', label: 'Destination' },
    { key: 'vehicleReg', label: 'Vehicle' },
    { key: 'driverName', label: 'Driver' },
    { key: 'cargoWeight', label: 'Cargo (kg)', render: (r) => formatNumber(r.cargoWeight) },
    { key: 'plannedDistance', label: 'Distance (km)', render: (r) => formatNumber(r.plannedDistance) },
    { key: 'revenue', label: 'Revenue', render: (r) => `₹${formatNumber(r.revenue, 2)}` },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Trips</h1>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus size={14} /> Create Trip
        </Button>
      </div>

      <Table
        columns={columns}
        data={trips}
        loading={tripsLoading}
        searchable
        searchKeys={['source', 'destination', 'vehicleReg', 'driverName', 'status']}
        emptyTitle="No trips found"
        emptyMessage="Create a trip to get started."
        actions={(t) => (
          <div className="flex flex-col gap-1.5 items-start min-w-[140px]">
            <div className="flex gap-2">
              {t.status === 'DRAFT' && (
                <Button variant="primary" onClick={() => handleDispatch(t.id)} loading={dispatchingId === t.id}>
                  Dispatch
                </Button>
              )}
              {t.status === 'DISPATCHED' && (
                <>
                  <Button variant="success" onClick={() => openCompleteModal(t.id)}>Complete</Button>
                  <Button variant="danger" onClick={() => setCancelTarget(t)}>Cancel</Button>
                </>
              )}
              {(t.status === 'COMPLETED' || t.status === 'CANCELLED') && (
                <span className="text-xs text-gray-400">No actions</span>
              )}
            </div>
            {actionError[t.id] && (
              <p className="text-red-600 text-xs">{actionError[t.id]}</p>
            )}
          </div>
        )}
      />

      {/* CREATE TRIP MODAL */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Trip">
        <form onSubmit={submitTrip}>
          <FormInput label="Source" value={tripForm.source} required
            onChange={(e) => setTripForm({ ...tripForm, source: e.target.value })} />
          <FormInput label="Destination" value={tripForm.destination} required
            onChange={(e) => setTripForm({ ...tripForm, destination: e.target.value })} />
          <FormInput label="Vehicle" type="select" options={vehicleOptions} value={tripForm.vehicleId} required
            onChange={(e) => setTripForm({ ...tripForm, vehicleId: e.target.value })} />
          {vehicleOptions.length === 0 && (
            <p className="text-xs text-amber-600 -mt-3 mb-4">No available vehicles right now.</p>
          )}
          <FormInput label="Driver" type="select" options={driverOptions} value={tripForm.driverId} required
            onChange={(e) => setTripForm({ ...tripForm, driverId: e.target.value })} />
          {driverOptions.length === 0 && (
            <p className="text-xs text-amber-600 -mt-3 mb-4">No available drivers right now.</p>
          )}
          <FormInput label="Cargo Weight (kg)" type="number" step="0.01" value={tripForm.cargoWeight} required
            onChange={(e) => setTripForm({ ...tripForm, cargoWeight: e.target.value })} />
          <FormInput label="Planned Distance (km)" type="number" step="0.01" value={tripForm.plannedDistance} required
            onChange={(e) => setTripForm({ ...tripForm, plannedDistance: e.target.value })} />
          <FormInput label="Revenue (₹)" type="number" step="0.01" value={tripForm.revenue}
            onChange={(e) => setTripForm({ ...tripForm, revenue: e.target.value })} />

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <Button type="submit" loading={savingTrip} className="w-full mt-2 justify-center">Create Trip</Button>
        </form>
      </Modal>

      {/* COMPLETE TRIP MODAL */}
      <Modal open={completeModalOpen} onClose={() => setCompleteModalOpen(false)} title="Complete Trip">
        <form onSubmit={submitComplete}>
          <FormInput label="Final Odometer" type="number" step="0.01" value={completeForm.finalOdometer} required
            onChange={(e) => setCompleteForm({ ...completeForm, finalOdometer: e.target.value })} />
          <FormInput label="Fuel Consumed (L)" type="number" step="0.01" value={completeForm.fuelConsumed} required
            onChange={(e) => setCompleteForm({ ...completeForm, fuelConsumed: e.target.value })} />
          <Button type="submit" loading={savingComplete} className="w-full mt-2 justify-center">Complete Trip</Button>
        </form>
      </Modal>

      {/* CANCEL TRIP CONFIRM MODAL */}
      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={confirmCancelTrip}
        title="Cancel this trip?"
        message={cancelTarget ? `${cancelTarget.source} → ${cancelTarget.destination} will be cancelled. Vehicle and driver will be restored to Available.` : ''}
        confirmLabel="Cancel Trip"
      />
    </div>
  );
}
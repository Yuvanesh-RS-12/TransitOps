import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Tabs, KpiCard, Table, Button } from '../components.jsx';
import { getDashboardKpis, getReportsSummary, downloadCsvReport } from '../api.js';

export default function Analytics() {
  const [tab, setTab] = useState('Dashboard');
  const [kpis, setKpis] = useState(null);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (tab === 'Dashboard') getDashboardKpis().then(setKpis);
    if (tab === 'Reports') getReportsSummary().then(setReports);
  }, [tab]);

  const reportColumns = [
    { key: 'registrationNo', label: 'Vehicle' },
    { key: 'fuelEfficiency', label: 'Fuel Efficiency (km/L)' },
    { key: 'operationalCost', label: 'Operational Cost (₹)' },
    { key: 'revenue', label: 'Revenue (₹)' },
    { key: 'roi', label: 'ROI (%)' },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Analytics</h1>
      <Tabs tabs={['Dashboard', 'Reports']} active={tab} onChange={setTab} />

      {tab === 'Dashboard' && kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Active Vehicles" value={kpis.activeVehicles} />
          <KpiCard label="Available Vehicles" value={kpis.availableVehicles} />
          <KpiCard label="In Maintenance" value={kpis.vehiclesInMaintenance} />
          <KpiCard label="Active Trips" value={kpis.activeTrips} />
          <KpiCard label="Pending Trips" value={kpis.pendingTrips} />
          <KpiCard label="Drivers On Duty" value={kpis.driversOnDuty} />
          <KpiCard label="Fleet Utilization" value={kpis.fleetUtilization} suffix="%" />
        </div>
      )}

      {tab === 'Reports' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button variant="secondary" onClick={downloadCsvReport} className="flex items-center gap-2">
              <Download size={14} /> Export CSV
            </Button>
          </div>
          <Table columns={reportColumns} data={reports} />
        </div>
      )}
    </div>
  );
}

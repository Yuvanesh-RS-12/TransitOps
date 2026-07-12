import { useState, useEffect } from 'react';
import {
  Download, Truck, CheckCircle2, Wrench, Route, Clock, Users, Gauge,
  Sparkles, AlertTriangle, TrendingDown, ShieldAlert, CalendarClock, Info,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Tabs, KpiCard, Table, Button, Skeleton, useToast } from '../components.jsx';
import { getDashboardKpis, getReportsSummary, downloadCsvReport, getVehicles, getDrivers } from '../api.js';

const STATUS_CHART_COLORS = {
  AVAILABLE: '#22c55e',
  ON_TRIP: '#3b82f6',
  IN_SHOP: '#f59e0b',
  RETIRED: '#9ca3af',
};

function buildInsights(vehicles, drivers, reports) {
  const insights = [];

  // Licenses expiring within 30 days
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = drivers.filter((d) => {
    const exp = new Date(d.licenseExpiry);
    return exp >= now && exp <= in30Days;
  });
  if (expiringSoon.length > 0) {
    insights.push({
      icon: CalendarClock,
      tone: 'amber',
      title: `${expiringSoon.length} driver license${expiringSoon.length > 1 ? 's' : ''} expiring within 30 days`,
      detail: expiringSoon.map((d) => d.name).join(', '),
    });
  }

  // Already expired licenses
  const expired = drivers.filter((d) => new Date(d.licenseExpiry) < now && d.status !== 'SUSPENDED');
  if (expired.length > 0) {
    insights.push({
      icon: ShieldAlert,
      tone: 'red',
      title: `${expired.length} driver${expired.length > 1 ? 's have' : ' has'} an expired license`,
      detail: expired.map((d) => d.name).join(', '),
    });
  }

  // Suspended drivers
  const suspended = drivers.filter((d) => d.status === 'SUSPENDED');
  if (suspended.length > 0) {
    insights.push({
      icon: ShieldAlert,
      tone: 'red',
      title: `${suspended.length} driver${suspended.length > 1 ? 's are' : ' is'} currently suspended`,
      detail: suspended.map((d) => d.name).join(', '),
    });
  }

  // Vehicles in maintenance
  const inShop = vehicles.filter((v) => v.status === 'IN_SHOP');
  if (inShop.length > 0) {
    insights.push({
      icon: Wrench,
      tone: 'amber',
      title: `${inShop.length} vehicle${inShop.length > 1 ? 's are' : ' is'} currently in the shop`,
      detail: inShop.map((v) => v.registrationNo).join(', '),
    });
  }

  // Negative ROI vehicles
  const negativeRoi = reports.filter((r) => r.roi < 0);
  if (negativeRoi.length > 0) {
    insights.push({
      icon: TrendingDown,
      tone: 'red',
      title: `${negativeRoi.length} vehicle${negativeRoi.length > 1 ? 's have' : ' has'} negative ROI`,
      detail: negativeRoi.map((r) => `${r.registrationNo} (${r.roi}%)`).join(', '),
    });
  }

  // Low fleet utilization commentary
  const activeVehicles = vehicles.filter((v) => v.status !== 'RETIRED');
  const onTrip = vehicles.filter((v) => v.status === 'ON_TRIP');
  const utilization = activeVehicles.length > 0 ? (onTrip.length / activeVehicles.length) * 100 : 0;
  if (utilization === 0 && activeVehicles.length > 0) {
    insights.push({
      icon: Gauge,
      tone: 'primary',
      title: 'Fleet utilization is currently 0%',
      detail: 'No vehicles are on active trips right now — consider dispatching pending trips.',
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: CheckCircle2,
      tone: 'green',
      title: 'No issues detected',
      detail: 'All vehicles and drivers are in good standing.',
    });
  }

  return insights;
}

const INSIGHT_TONE_STYLES = {
  red: { bg: 'bg-red-50', icon: 'text-red-500', border: 'border-red-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-500', border: 'border-amber-100' },
  primary: { bg: 'bg-primary-50', icon: 'text-primary-600', border: 'border-primary-100' },
  green: { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-100' },
};

export default function Analytics() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('Dashboard');

  const [kpis, setKpis] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (tab === 'Dashboard') {
      setDashboardLoading(true);
      Promise.all([getDashboardKpis(), getVehicles(), getDrivers(), getReportsSummary()])
        .then(([k, v, d, r]) => {
          setKpis(k);
          setVehicles(v);
          setDrivers(d);
          setReports(r);
        })
        .finally(() => setDashboardLoading(false));
    }
    if (tab === 'Reports') {
      setReportsLoading(true);
      getReportsSummary().then(setReports).finally(() => setReportsLoading(false));
    }
  }, [tab]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCsvReport();
      showToast('success', 'Report exported successfully');
    } catch {
      showToast('error', 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const reportColumns = [
    { key: 'registrationNo', label: 'Vehicle' },
    { key: 'fuelEfficiency', label: 'Fuel Efficiency (km/L)', numeric: true },
    { key: 'operationalCost', label: 'Operational Cost (₹)', numeric: true },
    { key: 'revenue', label: 'Revenue (₹)', numeric: true },
    {
      key: 'roi', label: 'ROI (%)', numeric: true,
      render: (r) => <span className={r.roi < 0 ? 'text-red-600 font-medium' : 'text-green-700 font-medium'}>{r.roi}%</span>,
    },
  ];

  const statusChartData = Object.entries(
    vehicles.reduce((acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ name: status.replace('_', ' '), value: count, status }));

  const costChartData = reports.map((r) => ({ name: r.registrationNo, cost: r.operationalCost }));

  const insights = (vehicles.length || drivers.length) ? buildInsights(vehicles, drivers, reports) : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Analytics</h1>
      <p className="text-sm text-gray-400 mb-5">Real-time fleet performance and operational insights</p>
      <Tabs tabs={['Dashboard', 'Reports']} active={tab} onChange={setTab} />

      {tab === 'Dashboard' && (
        dashboardLoading ? (
          <Skeleton rows={4} cols={4} />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Active Vehicles" value={kpis.activeVehicles} icon={Truck} tone="primary" />
              <KpiCard label="Available Vehicles" value={kpis.availableVehicles} icon={CheckCircle2} tone="green" />
              <KpiCard label="In Maintenance" value={kpis.vehiclesInMaintenance} icon={Wrench} tone="amber" />
              <KpiCard label="Active Trips" value={kpis.activeTrips} icon={Route} tone="primary" />
              <KpiCard label="Pending Trips" value={kpis.pendingTrips} icon={Clock} tone="amber" />
              <KpiCard label="Drivers On Duty" value={kpis.driversOnDuty} icon={Users} tone="primary" />
              <KpiCard label="Fleet Utilization" value={kpis.fleetUtilization} suffix="%" icon={Gauge} tone="green" />
            </div>

            {/* AI FLEET INSIGHTS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <h2 className="text-base font-semibold text-gray-800">AI Fleet Insights</h2>
              </div>
              <div className="space-y-2">
                {insights.map((insight, i) => {
                  const style = INSIGHT_TONE_STYLES[insight.tone] || INSIGHT_TONE_STYLES.primary;
                  const Icon = insight.icon;
                  return (
                    <div key={i} className={`flex items-start gap-3 rounded-lg border ${style.border} ${style.bg} px-4 py-3`}>
                      <Icon size={16} className={`shrink-0 mt-0.5 ${style.icon}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{insight.title}</p>
                        {insight.detail && <p className="text-xs text-gray-500 mt-0.5">{insight.detail}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Vehicle Status Distribution</h3>
                {statusChartData.length === 0 ? (
                  <p className="text-sm text-gray-400 py-12 text-center">No vehicle data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                        {statusChartData.map((entry, i) => (
                          <Cell key={i} fill={STATUS_CHART_COLORS[entry.status] || '#9ca3af'} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Operational Cost by Vehicle (₹)</h3>
                {costChartData.length === 0 ? (
                  <p className="text-sm text-gray-400 py-12 text-center">No cost data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={costChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {tab === 'Reports' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button variant="secondary" onClick={handleExport} loading={exporting} className="flex items-center gap-2">
              <Download size={14} /> Export CSV
            </Button>
          </div>
          <Table columns={reportColumns} data={reports} loading={reportsLoading} searchable searchKeys={['registrationNo']} />
        </div>
      )}
    </div>
  );
}
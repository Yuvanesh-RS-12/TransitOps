// TransitOps API client — single Axios instance + all endpoint calls, grouped by module
import axios from 'axios';

const client = axios.create({ baseURL: 'http://localhost:5000/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ===== AUTH =====
export const login = (email, password) => client.post('/auth/login', { email, password }).then(r => r.data);
export const register = (data) => client.post('/auth/register', data).then(r => r.data);
export const getMe = () => client.get('/auth/me').then(r => r.data);

// ===== VEHICLES =====
export const getVehicles = (params) => client.get('/vehicles', { params }).then(r => r.data);
export const createVehicle = (data) => client.post('/vehicles', data).then(r => r.data);
export const updateVehicle = (id, data) => client.put(`/vehicles/${id}`, data).then(r => r.data);
export const deleteVehicle = (id) => client.delete(`/vehicles/${id}`).then(r => r.data);

// ===== DRIVERS =====
export const getDrivers = (params) => client.get('/drivers', { params }).then(r => r.data);
export const createDriver = (data) => client.post('/drivers', data).then(r => r.data);
export const updateDriver = (id, data) => client.put(`/drivers/${id}`, data).then(r => r.data);
export const deleteDriver = (id) => client.delete(`/drivers/${id}`).then(r => r.data);

// ===== TRIPS =====
export const getTrips = () => client.get('/trips').then(r => r.data);
export const createTrip = (data) => client.post('/trips', data).then(r => r.data);
export const dispatchTrip = (id) => client.put(`/trips/${id}/dispatch`).then(r => r.data);
export const completeTrip = (id, data) => client.put(`/trips/${id}/complete`, data).then(r => r.data);
export const cancelTrip = (id) => client.put(`/trips/${id}/cancel`).then(r => r.data);

// ===== MAINTENANCE =====
export const getMaintenance = () => client.get('/maintenance').then(r => r.data);
export const createMaintenance = (data) => client.post('/maintenance', data).then(r => r.data);
export const closeMaintenance = (id) => client.put(`/maintenance/${id}/close`).then(r => r.data);

// ===== FUEL & EXPENSES =====
export const getFuelLogs = () => client.get('/fuel-logs').then(r => r.data);
export const createFuelLog = (data) => client.post('/fuel-logs', data).then(r => r.data);
export const getExpenses = () => client.get('/expenses').then(r => r.data);
export const createExpense = (data) => client.post('/expenses', data).then(r => r.data);

// ===== DASHBOARD & REPORTS =====
export const getDashboardKpis = () => client.get('/dashboard/kpis').then(r => r.data);
export const getReportsSummary = () => client.get('/reports/summary').then(r => r.data);

export const downloadCsvReport = async () => {
  const res = await client.get('/reports/export/csv', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'transitops_report.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export default client;

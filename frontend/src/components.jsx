// TransitOps shared UI components — Table, Modal, FormInput, StatusBadge, KpiCard, Tabs, Button,
// Toast system, Skeleton, EmptyState, ConfirmModal, SearchBar, AppShell (Navbar+Sidebar)
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Route, Wrench, LogOut, Menu, Search,
  CheckCircle2, XCircle, AlertTriangle, Info, Inbox, X, Loader2,
} from 'lucide-react';
import { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ===== TOAST SYSTEM =====
const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: { icon: CheckCircle2, className: 'bg-white border-green-200 text-green-800', iconClass: 'text-green-500' },
  error: { icon: XCircle, className: 'bg-white border-red-200 text-red-800', iconClass: 'text-red-500' },
  warning: { icon: AlertTriangle, className: 'bg-white border-amber-200 text-amber-800', iconClass: 'text-amber-500' },
  info: { icon: Info, className: 'bg-white border-blue-200 text-blue-800', iconClass: 'text-blue-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => {
          const style = TOAST_STYLES[t.type] || TOAST_STYLES.info;
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 border rounded-xl shadow-lg px-4 py-3 animate-[toastIn_0.2s_ease-out] ${style.className}`}
            >
              <Icon size={18} className={`shrink-0 mt-0.5 ${style.iconClass}`} />
              <p className="text-sm font-medium flex-1">{t.message}</p>
              <button onClick={() => dismissToast(t.id)} className="text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ===== SKELETON =====
export function Skeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 h-11" />
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-6 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + (c * 15) % 90}px` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== EMPTY STATE =====
export function EmptyState({ title = 'No records found', message, actionLabel, onAction, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-gray-50 rounded-full p-4 mb-4">
        <Icon size={28} className="text-gray-300" />
      </div>
      <p className="text-gray-600 font-medium">{title}</p>
      {message && <p className="text-gray-400 text-sm mt-1 max-w-xs">{message}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4">{actionLabel}</Button>
      )}
    </div>
  );
}

// ===== SEARCH BAR =====
export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-64 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
      />
    </div>
  );
}

// ===== CONFIRM MODAL =====
export function ConfirmModal({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Confirm', danger = true }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[90] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-[modalIn_0.15s_ease-out]">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${danger ? 'bg-red-50' : 'bg-primary-50'}`}>
          <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-primary-600'} />
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
        {message && <p className="text-sm text-gray-500 mb-5">{message}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </div>
      </div>
      <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

// ===== TABLE =====
export function Table({ columns, data, actions, searchable = false, searchKeys, loading = false, emptyTitle, emptyMessage }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return data;
    const q = query.toLowerCase();
    const keys = searchKeys || columns.map((c) => c.key);
    return data.filter((row) => keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)));
  }, [data, query, searchable, searchKeys, columns]);

  if (loading) return <Skeleton cols={columns.length} />;

  return (
    <div>
      {searchable && (
        <div className="mb-3">
          <SearchBar value={query} onChange={setQuery} placeholder="Search..." />
        </div>
      )}
      <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50/80 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`text-left px-4 py-3 font-semibold text-gray-700 font-semiboldg-wide ${col.numeric ? 'text-right' : ''}`}>
                  {col.label}
                </th>
              ))}
              {actions && <th className="text-left px-4 py-3 font-semibold text-gray-700 font-semiboldng-wide">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="p-0">
                  <EmptyState title={emptyTitle || (query ? 'No matching records' : 'No records found')} message={emptyMessage} />
                </td>
              </tr>
            )}
            {filtered.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-gray-50/70 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 text-gray-700 ${col.numeric ? 'text-right tabular-nums' : ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
                {actions && <td className="px-4 py-3.5">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== MODAL =====
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-[modalIn_0.18s_ease-out]">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
      <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.97) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
    </div>
  );
}

// ===== FORM INPUT =====
export function FormInput({ label, type = 'text', value, onChange, required, options, step, hint }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {type === 'select' ? (
        <select
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          value={value} onChange={onChange} required={required}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          step={step}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
          value={value} onChange={onChange} required={required}
        />
      )}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ===== STATUS BADGE =====
const STATUS_COLORS = {
  AVAILABLE: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  ON_TRIP: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  IN_SHOP: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  RETIRED: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  OFF_DUTY: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  SUSPENDED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  DRAFT: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  DISPATCHED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  COMPLETED: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  CANCELLED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

const STATUS_DOT = {
  AVAILABLE: 'bg-green-500', ON_TRIP: 'bg-blue-500', IN_SHOP: 'bg-amber-500',
  RETIRED: 'bg-gray-400', OFF_DUTY: 'bg-gray-400', SUSPENDED: 'bg-red-500',
  DRAFT: 'bg-gray-400', DISPATCHED: 'bg-blue-500', COMPLETED: 'bg-green-500', CANCELLED: 'bg-red-500',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-gray-400'}`} />
      {status?.replace('_', ' ')}
    </span>
  );
}

// ===== KPI CARD =====
export function KpiCard({ label, value, suffix = '', icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1.5">{value}{suffix}</p>
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tones[tone] || tones.primary}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

// ===== TABS =====
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            active === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ===== BUTTON =====
export function Button({ children, onClick, variant = 'primary', type = 'button', className = '', loading = false, disabled = false }) {
  const variants = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm hover:shadow',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow',
    success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5 ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ===== NAVBAR + SIDEBAR (used together as app shell layout) =====
const NAV_ITEMS = [
  { to: '/', label: 'Analytics', icon: LayoutDashboard },
  { to: '/fleet', label: 'Fleet', icon: Truck },
  { to: '/trips', label: 'Trips', icon: Route },
  { to: '/operations', label: 'Operations', icon: Wrench },
];

export function AppShell({ user, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-white border-r border-gray-100 transition-all duration-200 flex flex-col shadow-sm z-10`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-100 h-[57px]">
          {sidebarOpen && (
            <span className="font-bold bg-gradient-to-r from-primary-600 to-indigo-500 bg-clip-text text-transparent text-lg">
              TransitOps
            </span>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg p-1 transition-colors">
            <Menu size={20} />
          </button>
        </div>
        <nav className="flex-1 p-2.5 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon size={18} />
              {sidebarOpen && label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => { onLogout(); navigate('/login'); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
          >
            <LogOut size={18} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-3 flex justify-between items-center h-[57px]">
          <div />
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-indigo-500 text-white text-xs font-semibold flex items-center justify-center">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {user?.name} <span className="text-gray-400">· {user?.role?.replace('_', ' ')}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
export function formatNumber(value, decimals = 0) {
  const num = Number(value);

  if (Number.isNaN(num)) return "-";

  return num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
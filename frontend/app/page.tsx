'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { loginUser, registerUser } from '../services/auth';
import { getProducts, createProduct, getBom, setBom } from '../features/product/services';
import { getInventory, adjustInventory, getStockLedger } from '../features/inventory/services';
import { getPurchaseOrders, createPurchaseOrder, confirmPurchaseOrder, receivePurchaseOrder } from '../features/purchase/services';
import { getManufacturingOrders, createManufacturingOrder, startManufacturingOrder, completeManufacturingOrder } from '../features/manufacturing/services';
import { runProcurement } from '../features/procurement/services';
import { getAuditLogs } from '../features/audit/services';
import { getDashboardStats } from '../features/dashboard/services';
import type { Product, BoMItem } from '../features/product/types';
import type { InventoryItem, StockLedgerEntry } from '../features/inventory/types';
import type { PurchaseOrder } from '../features/purchase/types';
import type { ManufacturingOrder } from '../features/manufacturing/types';
import type { AuditLog } from '../features/audit/types';
import type { ProcurementResult } from '../features/procurement/services';
import type { DashboardStats } from '../features/dashboard/types';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, Factory, Zap, ScrollText,
  LogOut, Plus, ChevronRight, RefreshCw, Check, Truck, Play, CheckCircle2,
  TrendingUp, DollarSign, Activity, AlertCircle, Search, X, Settings2, User,
  ArrowUpDown
} from 'lucide-react';

// ─── Tabs ───
type TabKey = 'dashboard' | 'products' | 'inventory' | 'purchases' | 'manufacturing' | 'procurement' | 'audit';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'products', label: 'Products & BoM', icon: <Package size={18} /> },
  { key: 'inventory', label: 'Inventory', icon: <Warehouse size={18} /> },
  { key: 'purchases', label: 'Purchases', icon: <ShoppingCart size={18} /> },
  { key: 'manufacturing', label: 'Manufacturing', icon: <Factory size={18} /> },
  { key: 'procurement', label: 'Procurement', icon: <Zap size={18} /> },
  { key: 'audit', label: 'Audit Trail', icon: <ScrollText size={18} /> },
];

// ─── Helpers ───
function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const cls = colorMap[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function LedgerTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    PURCHASE: 'bg-blue-50 text-blue-700',
    SALE: 'bg-purple-50 text-purple-700',
    MANUFACTURE_CONSUME: 'bg-orange-50 text-orange-700',
    MANUFACTURE_PRODUCE: 'bg-emerald-50 text-emerald-700',
    ADJUSTMENT: 'bg-gray-100 text-gray-700',
  };
  const cls = colorMap[type] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] ${className}`}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '' }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  const sizeMap = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  const variantMap = {
    primary: 'bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-400 shadow-sm',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400',
    ghost: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizeMap[size]} ${variantMap[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Input({ label, ...props }: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-500">{label}</label>}
      <input
        {...props}
        className={`w-full px-3 py-2 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition placeholder:text-gray-400 ${props.className || ''}`}
      />
    </div>
  );
}

function Select({ label, children, ...props }: { label?: string; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-500">{label}</label>}
      <select
        {...props}
        className={`w-full px-3 py-2 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition ${props.className || ''}`}
      >
        {children}
      </select>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-3 rounded-full bg-sky-50 text-sky-500 mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{description}</p>
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const color = type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-fade-in flex items-center gap-2 ${color}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-70 cursor-pointer"><X size={14} /></button>
    </div>
  );
}

// ─── Auth Screen ───
function AuthScreen({ onLogin }: { onLogin: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const res = await loginUser(email, password);
        setAuth(res.user, res.accessToken);
        onLogin();
      } else {
        await registerUser({ name, email, password, companyName });
        setRegistered(true);
        setIsLogin(true);
        setName('');
        setCompanyName('');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-600 text-white shadow-lg mb-4">
            <Factory size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mini ERP</h1>
          <p className="text-sm text-gray-500 mt-1">Supply & Manufacturing Dashboard</p>
        </div>

        <Card className="p-6">
          {/* Toggle Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition cursor-pointer ${isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); setRegistered(false); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition cursor-pointer ${!isLogin ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Register
            </button>
          </div>

          {registered && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">Company registered! You can now sign in.</div>}
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {!isLogin && <Input label="Full Name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />}
            <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            {!isLogin && <Input label="Company Name" placeholder="Acme Industries" value={companyName} onChange={e => setCompanyName(e.target.value)} required />}
            <Btn disabled={loading} className="w-full mt-2">
              {loading ? <RefreshCw size={14} className="animate-spin-slow" /> : null}
              {isLogin ? 'Sign In' : 'Create Account'}
            </Btn>
          </form>
        </Card>
      </div>
    </div>
  );
}

// ─── Dashboard Tab ───
function DashboardTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([getDashboardStats(), getAuditLogs()]);
      setStats(s);
      setLogs(l.slice(0, 8));
    } catch {
      /* swallow */
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  const kpiCards = stats
    ? [
        { label: 'Sales Revenue', value: `$${stats.salesTotal.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'from-sky-500 to-blue-600' },
        { label: 'Inventory Value', value: `$${stats.inventoryValue.toLocaleString()}`, icon: <TrendingUp size={20} />, color: 'from-emerald-500 to-teal-600' },
        { label: 'Active MOs', value: stats.manufacturingActiveCount.toString(), icon: <Activity size={20} />, color: 'from-amber-500 to-orange-600' },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Overview</h2>
        <Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /> Refresh</Btn>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-24"><RefreshCw size={20} className="animate-spin-slow text-sky-500" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kpiCards.map((k) => (
              <div key={k.label} className="relative overflow-hidden rounded-xl bg-white border border-gray-100 shadow-sm p-5 group hover:shadow-md transition-shadow">
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[3rem] bg-gradient-to-br ${k.color} opacity-10 group-hover:opacity-15 transition-opacity`} />
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${k.color} text-white mb-3`}>
                  {k.icon}
                </div>
                <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                <p className="text-xs text-gray-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <Card>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Recent Activity</h3>
            </div>
            {logs.length === 0 ? (
              <EmptyState icon={<ScrollText size={20} />} title="No activity yet" description="Actions will appear here as you use the system." />
            ) : (
              <div className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition">
                    <div>
                      <p className="text-sm text-gray-800 font-medium">{log.action} <span className="text-gray-400">on</span> {log.entityType}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{log.entityId.slice(0, 8)}…</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Products Tab ───
function ProductsTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [bomProductId, setBomProductId] = useState<string | null>(null);
  const [bomItems, setBomItems] = useState<BoMItem[]>([]);
  const [bomLoading, setBomLoading] = useState(false);
  // Form state
  const [fName, setFName] = useState('');
  const [fSales, setFSales] = useState('');
  const [fCost, setFCost] = useState('');
  const [fType, setFType] = useState<'purchase' | 'manufacture'>('purchase');
  const [fDemand, setFDemand] = useState(false);
  const [saving, setSaving] = useState(false);
  // BoM set form
  const [newBomCompId, setNewBomCompId] = useState('');
  const [newBomQty, setNewBomQty] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setProducts(await getProducts()); } catch { /* swallow */ }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProduct({
        name: fName,
        salesPrice: fSales ? parseFloat(fSales) : null,
        costPrice: fCost ? parseFloat(fCost) : null,
        procurementType: fType,
        procureOnDemand: fDemand,
      });
      toast('Product created', 'success');
      setShowForm(false);
      setFName(''); setFSales(''); setFCost('');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
    setSaving(false);
  };

  const openBom = async (productId: string) => {
    setBomProductId(productId);
    setBomLoading(true);
    try {
      const bom = await getBom(productId);
      setBomItems(bom?.items || []);
    } catch {
      setBomItems([]);
    }
    setBomLoading(false);
  };

  const handleSetBom = async () => {
    if (!bomProductId || !newBomCompId || !newBomQty) return;
    const existing = bomItems.map(i => ({ componentId: i.componentId, quantity: i.quantity }));
    existing.push({ componentId: newBomCompId, quantity: parseInt(newBomQty) });
    try {
      const bom = await setBom(bomProductId, existing);
      setBomItems(bom.items || []);
      setNewBomCompId('');
      setNewBomQty('');
      toast('BoM updated', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Products & Bill of Materials</h2>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /></Btn>
          <Btn size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Add Product</Btn>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-5 animate-fade-in">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <Input label="Product Name" placeholder="e.g. Oak Table" value={fName} onChange={e => setFName(e.target.value)} required />
            <Input label="Sales Price" type="number" step="0.01" placeholder="0.00" value={fSales} onChange={e => setFSales(e.target.value)} />
            <Input label="Cost Price" type="number" step="0.01" placeholder="0.00" value={fCost} onChange={e => setFCost(e.target.value)} />
            <Select label="Procurement" value={fType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFType(e.target.value as 'purchase' | 'manufacture')}>
              <option value="purchase">Purchase</option>
              <option value="manufacture">Manufacture</option>
            </Select>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={fDemand} onChange={e => setFDemand(e.target.checked)} className="rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                MTO
              </label>
              <Btn disabled={saving}>{saving ? <RefreshCw size={12} className="animate-spin-slow" /> : <Check size={12} />} Save</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Product List */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin-slow text-sky-500" /></div>
      ) : products.length === 0 ? (
        <Card><EmptyState icon={<Package size={20} />} title="No products" description="Create your first product to get started." /></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Sales Price</th>
                  <th className="px-5 py-3">Cost Price</th>
                  <th className="px-5 py-3">Strategy</th>
                  <th className="px-5 py-3">MTO</th>
                  <th className="px-5 py-3">On Hand</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-sky-50/30 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-5 py-3 text-gray-600">{p.salesPrice != null ? `$${p.salesPrice}` : '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{p.costPrice != null ? `$${p.costPrice}` : '—'}</td>
                    <td className="px-5 py-3"><StatusBadge status={p.procurementType} /></td>
                    <td className="px-5 py-3">{p.procureOnDemand ? <span className="text-sky-600 font-medium text-xs">Yes</span> : <span className="text-gray-400 text-xs">No</span>}</td>
                    <td className="px-5 py-3 text-gray-600">{p.inventory?.onHandQty ?? 0}</td>
                    <td className="px-5 py-3">
                      <Btn variant="ghost" size="sm" onClick={() => openBom(p.id)}>
                        <Settings2 size={13} /> BoM
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* BoM Modal */}
      {bomProductId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setBomProductId(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Bill of Materials</h3>
              <button onClick={() => setBomProductId(null)} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {bomLoading ? (
                <div className="flex justify-center py-8"><RefreshCw size={18} className="animate-spin-slow text-sky-500" /></div>
              ) : bomItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No BoM items configured.</p>
              ) : (
                <div className="space-y-2">
                  {bomItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{item.component.name}</span>
                      <span className="text-sm text-gray-500">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">Add Component</p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select label="Component" value={newBomCompId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewBomCompId(e.target.value)}>
                      <option value="">Select…</option>
                      {products.filter(p => p.id !== bomProductId).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>
                  </div>
                  <Input label="Qty" type="number" min="1" value={newBomQty} onChange={e => setNewBomQty(e.target.value)} className="!w-20" />
                  <Btn size="sm" onClick={handleSetBom}><Plus size={12} /></Btn>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inventory Tab ───
function InventoryTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjProductId, setAdjProductId] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const [adjRef, setAdjRef] = useState('');
  const [saving, setSaving] = useState(false);
  const [showLedger, setShowLedger] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, led] = await Promise.all([getInventory(), getStockLedger()]);
      setItems(inv);
      setLedger(led);
    } catch { /* swallow */ }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adjustInventory({
        productId: adjProductId,
        changeQty: parseInt(adjQty),
        reference: adjRef || undefined,
      });
      toast('Inventory adjusted', 'success');
      setShowAdjust(false);
      setAdjProductId(''); setAdjQty(''); setAdjRef('');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Inventory & Stock Ledger</h2>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /></Btn>
          <Btn variant="secondary" size="sm" onClick={() => setShowLedger(!showLedger)}>
            <ArrowUpDown size={14} /> {showLedger ? 'Stock Levels' : 'Ledger'}
          </Btn>
          <Btn size="sm" onClick={() => setShowAdjust(!showAdjust)}><Plus size={14} /> Adjust</Btn>
        </div>
      </div>

      {showAdjust && (
        <Card className="p-5 animate-fade-in">
          <form onSubmit={handleAdjust} className="flex gap-3 items-end flex-wrap">
            <Input label="Product ID" placeholder="uuid" value={adjProductId} onChange={e => setAdjProductId(e.target.value)} required />
            <Input label="Change Qty" type="number" placeholder="+10 or -5" value={adjQty} onChange={e => setAdjQty(e.target.value)} required />
            <Input label="Reference" placeholder="(optional)" value={adjRef} onChange={e => setAdjRef(e.target.value)} />
            <Btn disabled={saving}>{saving ? <RefreshCw size={12} className="animate-spin-slow" /> : <Check size={12} />} Apply</Btn>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin-slow text-sky-500" /></div>
      ) : !showLedger ? (
        /* Stock Levels */
        items.length === 0 ? (
          <Card><EmptyState icon={<Warehouse size={20} />} title="No inventory" description="Stock will appear as you receive purchases or adjust inventory." /></Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">On Hand</th>
                    <th className="px-5 py-3">Reserved</th>
                    <th className="px-5 py-3">Free</th>
                    <th className="px-5 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(i => (
                    <tr key={i.productId} className="hover:bg-sky-50/30 transition">
                      <td className="px-5 py-3 font-medium text-gray-800">{i.productName}</td>
                      <td className="px-5 py-3 text-gray-700">{i.onHandQty}</td>
                      <td className="px-5 py-3 text-amber-600">{i.reservedQty}</td>
                      <td className="px-5 py-3 text-emerald-600 font-medium">{i.freeQty}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(i.updatedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        /* Stock Ledger */
        ledger.length === 0 ? (
          <Card><EmptyState icon={<ScrollText size={20} />} title="No ledger entries" description="Entries appear from purchases, manufacturing, and adjustments." /></Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Change</th>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ledger.map(e => (
                    <tr key={e.id} className="hover:bg-sky-50/30 transition">
                      <td className="px-5 py-3 font-medium text-gray-800">{e.product?.name || '—'}</td>
                      <td className="px-5 py-3"><LedgerTypeBadge type={e.type} /></td>
                      <td className={`px-5 py-3 font-medium ${e.changeQty >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{e.changeQty >= 0 ? '+' : ''}{e.changeQty}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs font-mono">{e.referenceId ? e.referenceId.slice(0, 8) + '…' : '—'}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}
    </div>
  );
}

// ─── Purchases Tab ───
function PurchasesTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendor, setVendor] = useState('');
  const [poProductId, setPoProductId] = useState('');
  const [poQty, setPoQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setOrders(await getPurchaseOrders()); } catch {}
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createPurchaseOrder({ vendorName: vendor, items: [{ productId: poProductId, quantity: parseInt(poQty) }] });
      toast('Purchase Order created', 'success');
      setShowForm(false);
      setVendor(''); setPoProductId(''); setPoQty('');
      refresh();
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed', 'error'); }
    setSaving(false);
  };

  const handleAction = async (id: string, action: 'confirm' | 'receive') => {
    setActing(id);
    try {
      if (action === 'confirm') await confirmPurchaseOrder(id);
      else await receivePurchaseOrder(id);
      toast(`PO ${action}ed`, 'success');
      refresh();
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed', 'error'); }
    setActing(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Purchase Orders</h2>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /></Btn>
          <Btn size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> New PO</Btn>
        </div>
      </div>

      {showForm && (
        <Card className="p-5 animate-fade-in">
          <form onSubmit={handleCreate} className="flex gap-3 items-end flex-wrap">
            <Input label="Vendor Name" placeholder="Supplier Inc." value={vendor} onChange={e => setVendor(e.target.value)} required />
            <Input label="Product ID" placeholder="uuid" value={poProductId} onChange={e => setPoProductId(e.target.value)} required />
            <Input label="Quantity" type="number" min="1" placeholder="10" value={poQty} onChange={e => setPoQty(e.target.value)} required />
            <Btn disabled={saving}>{saving ? <RefreshCw size={12} className="animate-spin-slow" /> : <Check size={12} />} Create</Btn>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin-slow text-sky-500" /></div>
      ) : orders.length === 0 ? (
        <Card><EmptyState icon={<ShoppingCart size={20} />} title="No purchase orders" description="Create a PO to start the procurement cycle." /></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3">PO Number</th>
                  <th className="px-5 py-3">Vendor</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-sky-50/30 transition">
                    <td className="px-5 py-3 font-mono text-sm text-gray-800">{o.poNumber}</td>
                    <td className="px-5 py-3 text-gray-700">{o.vendorName}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-gray-500">{o.items?.length || 0} item(s)</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {o.status === 'draft' && (
                          <Btn variant="secondary" size="sm" onClick={() => handleAction(o.id, 'confirm')} disabled={acting === o.id}>
                            <ChevronRight size={12} /> Confirm
                          </Btn>
                        )}
                        {o.status === 'confirmed' && (
                          <Btn size="sm" onClick={() => handleAction(o.id, 'receive')} disabled={acting === o.id}>
                            <Truck size={12} /> Receive
                          </Btn>
                        )}
                        {o.status === 'received' && (
                          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1"><CheckCircle2 size={12} /> Done</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Manufacturing Tab ───
function ManufacturingTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [moProductId, setMoProductId] = useState('');
  const [moQty, setMoQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setOrders(await getManufacturingOrders()); } catch {}
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createManufacturingOrder({ productId: moProductId, qtyToProduce: parseInt(moQty) });
      toast('Manufacturing Order created', 'success');
      setShowForm(false);
      setMoProductId(''); setMoQty('');
      refresh();
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed', 'error'); }
    setSaving(false);
  };

  const handleAction = async (id: string, action: 'start' | 'complete') => {
    setActing(id);
    try {
      if (action === 'start') await startManufacturingOrder(id);
      else await completeManufacturingOrder(id);
      toast(`MO ${action}ed`, 'success');
      refresh();
    } catch (err: unknown) { toast(err instanceof Error ? err.message : 'Failed', 'error'); }
    setActing(null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Manufacturing Orders</h2>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /></Btn>
          <Btn size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> New MO</Btn>
        </div>
      </div>

      {showForm && (
        <Card className="p-5 animate-fade-in">
          <form onSubmit={handleCreate} className="flex gap-3 items-end flex-wrap">
            <Input label="Product ID" placeholder="uuid of finished good" value={moProductId} onChange={e => setMoProductId(e.target.value)} required />
            <Input label="Qty to Produce" type="number" min="1" placeholder="5" value={moQty} onChange={e => setMoQty(e.target.value)} required />
            <Btn disabled={saving}>{saving ? <RefreshCw size={12} className="animate-spin-slow" /> : <Check size={12} />} Create</Btn>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin-slow text-sky-500" /></div>
      ) : orders.length === 0 ? (
        <Card><EmptyState icon={<Factory size={20} />} title="No manufacturing orders" description="Create an MO for a product with a Bill of Materials." /></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3">MO Number</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Qty</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-sky-50/30 transition">
                    <td className="px-5 py-3 font-mono text-sm text-gray-800">{o.moNumber}</td>
                    <td className="px-5 py-3 text-gray-700">{o.product?.name || o.productId.slice(0, 8) + '…'}</td>
                    <td className="px-5 py-3 text-gray-600">{o.qtyToProduce}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {(o.status === 'draft' || o.status === 'confirmed') && (
                          <Btn variant="secondary" size="sm" onClick={() => handleAction(o.id, 'start')} disabled={acting === o.id}>
                            <Play size={12} /> Start
                          </Btn>
                        )}
                        {o.status === 'in_progress' && (
                          <Btn size="sm" onClick={() => handleAction(o.id, 'complete')} disabled={acting === o.id}>
                            <CheckCircle2 size={12} /> Complete
                          </Btn>
                        )}
                        {o.status === 'done' && (
                          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1"><CheckCircle2 size={12} /> Done</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Procurement Tab ───
function ProcurementTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ProcurementResult | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await runProcurement();
      setResult(res);
      toast('Procurement runner completed', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
    setRunning(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Procurement Runner</h2>
      </div>

      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg mx-auto">
            <Zap size={28} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">MTO/MTS Procurement Automation</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Scans undelivered Sales Orders and determines if Purchase Orders or Manufacturing Orders need to be created based on product procurement strategy and current stock levels.
            </p>
          </div>
          <Btn onClick={handleRun} disabled={running} className="mx-auto">
            {running ? <RefreshCw size={14} className="animate-spin-slow" /> : <Zap size={14} />}
            {running ? 'Running…' : 'Run Procurement'}
          </Btn>
        </div>
      </Card>

      {result && (
        <Card className="p-5 animate-fade-in">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Result</h4>
          <p className="text-sm text-gray-600 mb-3">{result.message}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-1">Purchase Orders Created</p>
              <p className="text-xl font-bold text-blue-700">{result.createdPurchaseOrders?.length || 0}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-600 font-medium mb-1">Manufacturing Orders Created</p>
              <p className="text-xl font-bold text-amber-700">{result.createdManufacturingOrders?.length || 0}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Audit Tab ───
function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await getAuditLogs(filterType ? { entityType: filterType } : undefined));
    } catch {}
    setLoading(false);
  }, [filterType]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Audit Trail</h2>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by entity type…"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 w-52"
            />
          </div>
          <Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /></Btn>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin-slow text-sky-500" /></div>
      ) : logs.length === 0 ? (
        <Card><EmptyState icon={<ScrollText size={20} />} title="No audit logs" description="System actions will be recorded here." /></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity Type</th>
                  <th className="px-5 py-3">Entity ID</th>
                  <th className="px-5 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-sky-50/30 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">{log.action}</td>
                    <td className="px-5 py-3"><StatusBadge status={log.entityType.toLowerCase()} /></td>
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">{log.entityId.slice(0, 12)}…</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ───
export default function Home() {
  const { user, token, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [toastData, setToastData] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setHydrated(true); }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToastData({ message, type });
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <RefreshCw size={24} className="animate-spin-slow text-sky-500" />
      </div>
    );
  }

  if (!token) {
    return (
      <>
        <AuthScreen onLogin={() => {}} />
        {toastData && <Toast message={toastData.message} type={toastData.type} onClose={() => setToastData(null)} />}
      </>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'products': return <ProductsTab toast={showToast} />;
      case 'inventory': return <InventoryTab toast={showToast} />;
      case 'purchases': return <PurchasesTab toast={showToast} />;
      case 'manufacturing': return <ManufacturingTab toast={showToast} />;
      case 'procurement': return <ProcurementTab toast={showToast} />;
      case 'audit': return <AuditTab />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <Factory size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Mini ERP</p>
              <p className="text-[10px] text-gray-400">Supply & Manufacturing</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-sky-50 text-sky-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className={activeTab === tab.key ? 'text-sky-600' : 'text-gray-400'}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Profile */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {user?.name?.[0]?.toUpperCase() || <User size={14} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.roles?.join(', ') || 'Authenticated'}</p>
            </div>
            <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer" title="Log out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {renderTab()}
        </div>
      </main>

      {/* Toast */}
      {toastData && <Toast message={toastData.message} type={toastData.type} onClose={() => setToastData(null)} />}
    </div>
  );
}

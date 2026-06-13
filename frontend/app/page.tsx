'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTokenRefresh } from '../hooks/useTokenRefresh';
import { useAuthStore } from '../store/authStore';
import {
  loginUser,
  registerUser,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getRoles,
  updateRolePermissions,
  ManagedUser,
  ManagedRole
} from '../services/auth';
import { getProducts, createProduct, getBom, setBom } from '../features/product/services';
import { getInventory, adjustInventory, getStockLedger } from '../features/inventory/services';
import { getPurchaseOrders, createPurchaseOrder, confirmPurchaseOrder, receivePurchaseOrder } from '../features/purchase/services';
import { getManufacturingOrders, createManufacturingOrder, startManufacturingOrder, completeManufacturingOrder } from '../features/manufacturing/services';
import { runProcurement } from '../features/procurement/services';
import { getAuditLogs } from '../features/audit/services';
import { getDashboardStats } from '../features/dashboard/services';
import { getSalesOrders, createSalesOrder, confirmSalesOrder, deliverSalesOrder, checkSalesOrderProcurement } from '../features/sales/services';
import type { Product, BoMItem } from '../features/product/types';
import type { InventoryItem, StockLedgerEntry } from '../features/inventory/types';
import type { PurchaseOrder } from '../features/purchase/types';
import type { ManufacturingOrder } from '../features/manufacturing/types';
import type { AuditLog } from '../features/audit/types';
import type { ProcurementResult } from '../features/procurement/services';
import type { DashboardStats } from '../features/dashboard/types';
import type { SalesOrder } from '../features/sales/types';
import DashboardOverview from '../features/dashboard/components/DashboardOverview';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, Factory, Zap, ScrollText,
  LogOut, Plus, ChevronRight, RefreshCw, Check, Truck, Play, CheckCircle2,
  TrendingUp, DollarSign, Activity, AlertCircle, Search, X, Settings2, User,
  ArrowUpDown, ShoppingBag, Users
} from 'lucide-react';

// ─── Tabs ───
type TabKey = 'dashboard' | 'products' | 'bom' | 'inventory' | 'purchases' | 'sales' | 'manufacturing' | 'procurement' | 'users' | 'audit';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'products', label: 'Products', icon: <Package size={18} /> },
  { key: 'bom', label: 'Bill of Materials', icon: <Settings2 size={18} /> },
  { key: 'inventory', label: 'Inventory', icon: <Warehouse size={18} /> },
  { key: 'purchases', label: 'Purchases', icon: <ShoppingCart size={18} /> },
  { key: 'sales', label: 'Sales Orders', icon: <ShoppingBag size={18} /> },
  { key: 'manufacturing', label: 'Manufacturing', icon: <Factory size={18} /> },
  { key: 'procurement', label: 'Procurement', icon: <Zap size={18} /> },
  { key: 'users', label: 'Users & Permissions', icon: <Users size={18} />, adminOnly: true },
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

function Btn({ children, onClick, variant = 'primary', size = 'md', disabled = false, type, className = '' }: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
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
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizeMap[size]} ${variantMap[variant]} ${className}`}>
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
        setAuth(res.user, res.accessToken, res.refreshToken);
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
  return <DashboardOverview />;
}

// ─── Products Tab ───
function ProductsTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  // Form state
  const [fName, setFName] = useState('');
  const [fSales, setFSales] = useState('');
  const [fCost, setFCost] = useState('');
  const [fType, setFType] = useState<'purchase' | 'manufacture'>('purchase');
  const [fDemand, setFDemand] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Products</h2>
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

// ─── Bill of Materials Tab ───
function BomTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [bomProductId, setBomProductId] = useState<string | null>(null);
  const [bomItems, setBomItems] = useState<BoMItem[]>([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [newBomCompId, setNewBomCompId] = useState('');
  const [newBomQty, setNewBomQty] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setProducts(await getProducts()); } catch { /* swallow */ }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

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
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  const handleClearBom = async (productId: string) => {
    if (!confirm('Are you sure you want to clear this BoM?')) return;
    try {
      await setBom(productId, []);
      toast('BoM cleared', 'success');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
  };

  return (
    <>
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Bills of Materials (BoM)</h2>
          <Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /></Btn>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin-slow text-sky-500" /></div>
        ) : products.filter(p => p.procurementType === 'manufacture').length === 0 ? (
          <Card><EmptyState icon={<Settings2 size={20} />} title="No manufactured products" description="Only products with the 'Manufacture' strategy can have a Bill of Materials." /></Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                    <th className="px-5 py-3">Finished Product</th>
                    <th className="px-5 py-3">Strategy</th>
                    <th className="px-5 py-3">Components / Ingredients</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.filter(p => p.procurementType === 'manufacture').map((p) => (
                    <tr key={p.id} className="hover:bg-sky-50/30 transition">
                      <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={p.procurementType} />
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {p.bom && p.bom.items && p.bom.items.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.bom.items.map((item, idx) => (
                              <span key={item.id || idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-100">
                                {item.component?.name || 'Unknown'} (×{item.quantity})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No components configured</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Btn variant="secondary" size="sm" onClick={() => openBom(p.id)}>
                            <Settings2 size={13} /> Manage BoM
                          </Btn>
                          {p.bom && p.bom.items && p.bom.items.length > 0 && (
                            <Btn variant="ghost" size="sm" onClick={() => handleClearBom(p.id)} className="text-red-500 hover:text-red-700">
                              Clear
                            </Btn>
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

      {/* BoM Modal */}
      {bomProductId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setBomProductId(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Configure Bill of Materials</h3>
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
    </>
  );
}

// ─── Inventory Tab ───
function InventoryTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
      const [inv, led, prodList] = await Promise.all([getInventory(), getStockLedger(), getProducts()]);
      setItems(inv);
      setLedger(led);
      setProducts(prodList);
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
            <div className="flex-1 min-w-[200px]">
              <Select label="Product" value={adjProductId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdjProductId(e.target.value)} required>
                <option value="">Select product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendor, setVendor] = useState('');
  const [poProductId, setPoProductId] = useState('');
  const [poQty, setPoQty] = useState('');
  const [draftItems, setDraftItems] = useState<{ productId: string; name: string; quantity: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [poList, prodList] = await Promise.all([getPurchaseOrders(), getProducts()]);
      setOrders(poList);
      setProducts(prodList);
    } catch {}
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  const handleAddDraftItem = () => {
    if (!poProductId || !poQty) return;
    const prod = products.find(p => p.id === poProductId);
    if (!prod) return;

    const existingIndex = draftItems.findIndex(i => i.productId === poProductId);
    if (existingIndex > -1) {
      setDraftItems(prev => {
        const updated = [...prev];
        updated[existingIndex].quantity += parseInt(poQty);
        return updated;
      });
    } else {
      setDraftItems(prev => [
        ...prev,
        { productId: poProductId, name: prod.name, quantity: parseInt(poQty) }
      ]);
    }
    setPoProductId('');
    setPoQty('');
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftItems.length === 0) {
      toast('Please add at least one item to the purchase order', 'error');
      return;
    }
    setSaving(true);
    try {
      await createPurchaseOrder({
        vendorName: vendor,
        items: draftItems.map(item => ({ productId: item.productId, quantity: item.quantity }))
      });
      toast('Purchase Order created', 'success');
      setShowForm(false);
      setVendor('');
      setDraftItems([]);
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
        <Card className="p-5 animate-fade-in space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Vendor Name"
                placeholder="Supplier Inc."
                value={vendor}
                onChange={e => setVendor(e.target.value)}
                required
              />
            </div>

            {/* Add Item Panel */}
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
              <p className="text-xs font-semibold text-gray-500">Order Items</p>
              
              <div className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Select
                    label="Product"
                    value={poProductId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPoProductId(e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-28">
                  <Input
                    label="Quantity"
                    type="number"
                    min="1"
                    placeholder="10"
                    value={poQty}
                    onChange={e => setPoQty(e.target.value)}
                  />
                </div>
                <Btn type="button" variant="secondary" onClick={handleAddDraftItem}>
                  <Plus size={14} /> Add
                </Btn>
              </div>

              {/* Draft Items List */}
              {draftItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  {draftItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100 text-sm">
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">Qty: {item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(index)}
                          className="text-red-500 hover:text-red-700 transition cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Btn type="button" variant="secondary" onClick={() => { setShowForm(false); setDraftItems([]); }}>Cancel</Btn>
              <Btn type="submit" disabled={saving || draftItems.length === 0}>
                {saving ? <RefreshCw size={14} className="animate-spin-slow" /> : <Check size={14} />} Create Purchase Order
              </Btn>
            </div>
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [moProductId, setMoProductId] = useState('');
  const [moQty, setMoQty] = useState('');
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [moList, prodList] = await Promise.all([getManufacturingOrders(), getProducts()]);
      setOrders(moList);
      setProducts(prodList);
    } catch {}
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createManufacturingOrder({ productId: moProductId, quantity: parseInt(moQty) });
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
            <div className="flex-1 min-w-[200px]">
              <Select label="Product" value={moProductId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMoProductId(e.target.value)} required>
                <option value="">Select product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
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
                    <td className="px-5 py-3 text-gray-700">{o.quantity}</td>
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

// ─── Sales Tab ───
function SalesTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [customer, setCustomer] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [draftItems, setDraftItems] = useState<{ productId: string; name: string; quantity: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const [replenishmentRequirements, setReplenishmentRequirements] = useState<{
    productId: string;
    productName: string;
    shortageQty: number;
    recommendedQty: number;
    vendorName: string;
    orderQty: string;
  }[] | null>(null);

  const { user } = useAuthStore();
  const canConfirm = user?.roles?.some(r => r === 'SALES' || r === 'OWNER' || r === 'ADMIN');
  const canDeliver = user?.roles?.some(r => r === 'INVENTORY' || r === 'OWNER' || r === 'ADMIN');

  const handleAction = async (id: string, action: 'confirm' | 'deliver') => {
    setActing(id);
    try {
      if (action === 'confirm') {
        await confirmSalesOrder(id);
        toast('Sales Order confirmed', 'success');
      } else if (action === 'deliver') {
        await deliverSalesOrder(id);
        toast('Sales Order delivered', 'success');
      }
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : `Failed to ${action} sales order`, 'error');
    }
    setActing(null);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [o, p, pos] = await Promise.all([getSalesOrders(), getProducts(), getPurchaseOrders()]);
      setOrders(o);
      setProducts(p);
      setPurchaseOrders(pos);
    } catch { /* swallow */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAddDraftItem = () => {
    if (!selectedProductId || !quantity) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    setDraftItems(prev => [
      ...prev,
      { productId: selectedProductId, name: prod.name, quantity: parseFloat(quantity) }
    ]);
    setSelectedProductId('');
    setQuantity('');
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftItems.length === 0) {
      toast('Please add at least one item to the sales order', 'error');
      return;
    }
    setSaving(true);
    try {
      const itemsPayload = draftItems.map(item => ({ productId: item.productId, quantity: item.quantity }));
      const checkResult = await checkSalesOrderProcurement({ items: itemsPayload });

      if (checkResult.available) {
        await createSalesOrder({
          customerName: customer,
          items: itemsPayload
        });
        toast('Order placed successfully', 'success');
        setShowForm(false);
        setCustomer('');
        setDraftItems([]);
        refresh();
      } else {
        setReplenishmentRequirements(
          checkResult.purchaseRequirements.map(req => ({
            productId: req.productId,
            productName: req.productName,
            shortageQty: req.shortageQty,
            recommendedQty: req.recommendedQty,
            vendorName: '',
            orderQty: String(req.recommendedQty),
          }))
        );
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to create sales order', 'error');
    }
    setSaving(false);
  };

  const handleConfirmReplenishment = async () => {
    if (!replenishmentRequirements) return;

    for (const req of replenishmentRequirements) {
      if (!req.vendorName.trim()) {
        toast(`Please specify a vendor for ${req.productName}`, 'error');
        return;
      }
      const qty = parseFloat(req.orderQty);
      if (isNaN(qty) || qty <= 0) {
        toast(`Please specify a valid quantity for ${req.productName}`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const itemsPayload = draftItems.map(item => ({ productId: item.productId, quantity: item.quantity }));

      const poGroups: { [vendor: string]: { productId: string; quantity: number }[] } = {};
      for (const req of replenishmentRequirements) {
        const vendor = req.vendorName.trim();
        if (!poGroups[vendor]) {
          poGroups[vendor] = [];
        }
        poGroups[vendor].push({
          productId: req.productId,
          quantity: parseFloat(req.orderQty),
        });
      }

      const purchaseOrdersPayload = Object.entries(poGroups).map(([vendorName, items]) => ({
        vendorName,
        items,
      }));

      await createSalesOrder({
        customerName: customer,
        items: itemsPayload,
        procurement: {
          purchaseOrders: purchaseOrdersPayload,
        },
      });

      toast('Order and replenishment POs placed', 'success');
      setReplenishmentRequirements(null);
      setShowForm(false);
      setCustomer('');
      setDraftItems([]);
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to process replenishment', 'error');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Sales Orders</h2>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /></Btn>
          <Btn size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> New Sales Order</Btn>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-5 animate-fade-in space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Customer Name"
                placeholder="e.g. Grand Furniture Mart"
                value={customer}
                onChange={e => setCustomer(e.target.value)}
                required
              />
            </div>

            {/* Add Item Panel */}
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
              <p className="text-xs font-semibold text-gray-500">Order Items</p>
              
              <div className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Select
                    label="Product"
                    value={selectedProductId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Price: ${p.salesPrice ?? 'N/A'})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-28">
                  <Input
                    label="Quantity"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </div>
                <Btn type="button" variant="secondary" onClick={handleAddDraftItem}>
                  <Plus size={14} /> Add
                </Btn>
              </div>

              {/* Draft Items List */}
              {draftItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  {draftItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100 text-sm">
                      <span className="font-medium text-gray-800">{item.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500">Qty: {item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(index)}
                          className="text-red-500 hover:text-red-700 transition cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Btn type="button" variant="secondary" onClick={() => { setShowForm(false); setDraftItems([]); }}>Cancel</Btn>
              <Btn type="submit" disabled={saving || draftItems.length === 0}>
                {saving ? <RefreshCw size={14} className="animate-spin-slow" /> : <Check size={14} />} Create Draft Order
              </Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin-slow text-sky-500" /></div>
      ) : orders.length === 0 ? (
        <Card><EmptyState icon={<ShoppingCart size={20} />} title="No sales orders" description="Create a sales order to get started." /></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-sky-50/30 transition">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{o.id.slice(0, 8)}…</td>
                    <td className="px-5 py-3 font-medium text-gray-800">{o.customerName}</td>
                    <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-5 py-3 text-gray-600">
                      <div className="flex flex-col gap-0.5">
                        {o.items?.map((item, idx) => (
                          <span key={item.id || idx} className="text-xs text-gray-500">
                            • {item.product?.name || 'Unknown Product'} (×{item.quantity})
                          </span>
                        )) || 'No items'}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {o.status === 'draft' && (
                          canConfirm ? (
                            <Btn variant="secondary" size="sm" onClick={() => handleAction(o.id, 'confirm')} disabled={acting === o.id}>
                              Confirm
                            </Btn>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Awaiting Confirmation</span>
                          )
                        )}
                        {o.status === 'confirmed' && (
                          canDeliver ? (
                            <Btn variant="secondary" size="sm" onClick={() => handleAction(o.id, 'deliver')} disabled={acting === o.id}>
                              Deliver
                            </Btn>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Awaiting Delivery</span>
                          )
                        )}
                        {o.status === 'delivered' && (
                          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 size={12} /> Delivered
                          </span>
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

      {/* Replenishment Modal */}
      {replenishmentRequirements && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setReplenishmentRequirements(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-sky-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-500" />
                <h3 className="font-semibold text-gray-900">Procurement Replenishment</h3>
              </div>
              <button onClick={() => setReplenishmentRequirements(null)} className="p-1 hover:bg-gray-200/50 rounded-lg cursor-pointer"><X size={16} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 font-medium">
                The following items have insufficient stock. Specify vendor and quantity to auto-create Purchase Orders:
              </p>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {replenishmentRequirements.map((req, idx) => (
                  <div key={req.productId} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">{req.productName}</span>
                      <span className="text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
                        Shortage: {req.shortageQty}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Vendor Name</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="e.g. Acme Vendor"
                          list="vendor-suggestions"
                          value={req.vendorName}
                          onChange={e => {
                            const newReqs = [...replenishmentRequirements];
                            newReqs[idx].vendorName = e.target.value;
                            setReplenishmentRequirements(newReqs);
                          }}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Order Quantity</label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          value={req.orderQty}
                          onChange={e => {
                            const newReqs = [...replenishmentRequirements];
                            newReqs[idx].orderQty = e.target.value;
                            setReplenishmentRequirements(newReqs);
                          }}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <datalist id="vendor-suggestions">
                {Array.from(new Set(purchaseOrders.map(po => po.vendorName).filter(Boolean))).map(vendor => (
                  <option key={vendor} value={vendor} />
                ))}
              </datalist>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Btn variant="ghost" size="sm" onClick={() => setReplenishmentRequirements(null)}>Cancel</Btn>
                <Btn size="sm" onClick={handleConfirmReplenishment} disabled={saving}>
                  {saving ? <RefreshCw size={12} className="animate-spin-slow" /> : 'Confirm & Create'}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users & Permissions Tab ───
function UsersTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User Form State
  const [showUserForm, setShowUserForm] = useState(false);
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRoles, setURoles] = useState<string[]>([]);
  const [savingUser, setSavingUser] = useState(false);

  // Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Role Mappings State
  const [selectedRoleName, setSelectedRoleName] = useState<string>('SALES');
  const [savingRole, setSavingRole] = useState(false);

  // List of all possible modules and actions
  const ALL_MODULES = ['PRODUCT', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY', 'AUDIT'];
  const ALL_ACTIONS = ['READ', 'CREATE', 'UPDATE', 'DELETE'];

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([getUsers(), getRoles()]);
      setUsers(u);
      setRoles(r);
    } catch { /* swallow */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uRoles.length === 0) {
      toast('Please assign at least one role to the user', 'error');
      return;
    }
    setSavingUser(true);
    try {
      if (editingUserId) {
        await updateUser(editingUserId, { name: uName, email: uEmail, roles: uRoles });
        toast('User updated successfully', 'success');
      } else {
        await addUser({ name: uName, email: uEmail, password: uPassword, roles: uRoles });
        toast('User created successfully', 'success');
      }
      setShowUserForm(false);
      setEditingUserId(null);
      setUName(''); setUEmail(''); setUPassword(''); setURoles([]);
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save user', 'error');
    }
    setSavingUser(false);
  };

  const handleEditClick = (user: ManagedUser) => {
    setEditingUserId(user.id);
    setUName(user.name);
    setUEmail(user.email);
    setUPassword(''); // leave empty
    setURoles(user.roles);
    setShowUserForm(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await deleteUser(id);
      toast('User deleted successfully', 'success');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
    }
  };

  const toggleRoleCheckbox = (role: string) => {
    setURoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  // Roles & Permissions state
  const selectedRole = roles.find(r => r.role === selectedRoleName);
  const isPermissionChecked = (module: string, action: string) => {
    if (!selectedRole) return false;
    return selectedRole.permissions.some(p => p.module === module && p.action === action);
  };

  const handleTogglePermission = async (module: string, action: string) => {
    if (!selectedRole) return;
    const isChecked = isPermissionChecked(module, action);
    let newPerms = [...selectedRole.permissions];
    if (isChecked) {
      newPerms = newPerms.filter(p => !(p.module === module && p.action === action));
    } else {
      newPerms.push({ module, action });
    }

    // Update locally first for fast response
    setRoles(prev => prev.map(r => r.role === selectedRoleName ? { ...r, permissions: newPerms } : r));
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSavingRole(true);
    try {
      await updateRolePermissions(selectedRoleName, selectedRole.permissions);
      toast('Permissions updated successfully', 'success');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update permissions', 'error');
    }
    setSavingRole(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Users & Permissions</h2>
        <Btn variant="ghost" size="sm" onClick={refresh}><RefreshCw size={14} /></Btn>
      </div>

      {/* Sub-tabs toggle */}
      <div className="flex border-b border-gray-100 mb-4">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${activeSubTab === 'users' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Users List
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition cursor-pointer ${activeSubTab === 'roles' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Role Permissions
        </button>
      </div>

      {activeSubTab === 'users' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Btn size="sm" onClick={() => {
              setEditingUserId(null);
              setUName(''); setUEmail(''); setUPassword(''); setURoles([]);
              setShowUserForm(!showUserForm);
            }}>
              <Plus size={14} /> Add User
            </Btn>
          </div>

          {showUserForm && (
            <Card className="p-5 animate-fade-in">
              <form onSubmit={handleAddUser} className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-800">{editingUserId ? 'Edit User' : 'Create User'}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input label="Name" value={uName} onChange={e => setUName(e.target.value)} required />
                  <Input label="Email" type="email" value={uEmail} onChange={e => setUEmail(e.target.value)} required />
                  {!editingUserId && <Input label="Password" type="password" value={uPassword} onChange={e => setUPassword(e.target.value)} required />}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500">Assign Roles</label>
                  <div className="flex gap-4 flex-wrap">
                    {['OWNER', 'ADMIN', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'].map(r => (
                      <label key={r} className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={uRoles.includes(r)}
                          onChange={() => toggleRoleCheckbox(r)}
                          className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Btn type="button" variant="secondary" onClick={() => setShowUserForm(false)}>Cancel</Btn>
                  <Btn type="submit" disabled={savingUser}>
                    {savingUser ? <RefreshCw size={14} className="animate-spin-slow" /> : <Check size={14} />} Save User
                  </Btn>
                </div>
              </form>
            </Card>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin-slow text-sky-500" /></div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email</th>
                      <th className="px-5 py-3">Roles</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-sky-50/30 transition">
                        <td className="px-5 py-3 font-medium text-gray-800">{u.name}</td>
                        <td className="px-5 py-3 text-gray-600">{u.email}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {u.roles.map(r => (
                              <span key={r} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700">
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <Btn variant="ghost" size="sm" onClick={() => handleEditClick(u)}>Edit</Btn>
                            <Btn variant="danger" size="sm" onClick={() => handleDeleteUser(u.id)}>Delete</Btn>
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
      ) : (
        /* Roles and Permissions Tab */
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-64">
              <Select
                label="Role to Configure"
                value={selectedRoleName}
                onChange={e => setSelectedRoleName(e.target.value)}
              >
                {['OWNER', 'ADMIN', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </div>
            <Btn size="sm" className="mt-5" onClick={handleSavePermissions} disabled={savingRole}>
              {savingRole ? <RefreshCw size={14} className="animate-spin-slow" /> : <Check size={14} />} Save Role Permissions
            </Btn>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin-slow text-sky-500" /></div>
          ) : (
            <Card className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {ALL_MODULES.map(module => (
                  <div key={module} className="border border-gray-100 rounded-xl p-4 bg-gray-50/30 space-y-2">
                    <p className="text-sm font-semibold text-gray-800 border-b border-gray-100 pb-1.5">{module}</p>
                    <div className="flex flex-col gap-1.5 pt-1">
                      {ALL_ACTIONS.map(action => {
                        const checked = isPermissionChecked(module, action);
                        const disabled = selectedRoleName === 'OWNER' || selectedRoleName === 'ADMIN';
                        return (
                          <label key={action} className={`flex items-center gap-2 text-xs font-medium cursor-pointer ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600'}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => handleTogglePermission(module, action)}
                              className="rounded border-gray-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                            />
                            {action}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {(selectedRoleName === 'OWNER' || selectedRoleName === 'ADMIN') && (
                <p className="text-xs text-amber-600 font-medium mt-4 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                  Note: OWNER and ADMIN roles are pre-configured with full permissions across all modules and cannot be edited.
                </p>
              )}
            </Card>
          )}
        </div>
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

  // Proactively refresh the access token 5 min before it expires
  useTokenRefresh();

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
      case 'bom': return <BomTab toast={showToast} />;
      case 'inventory': return <InventoryTab toast={showToast} />;
      case 'purchases': return <PurchasesTab toast={showToast} />;
      case 'sales': return <SalesTab toast={showToast} />;
      case 'manufacturing': return <ManufacturingTab toast={showToast} />;
      case 'procurement': return <ProcurementTab toast={showToast} />;
      case 'users': return <UsersTab toast={showToast} />;
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
          {TABS.filter(tab => !tab.adminOnly || user?.roles?.some(r => r === 'OWNER' || r === 'ADMIN')).map(tab => (
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

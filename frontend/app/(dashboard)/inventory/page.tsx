'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getInventory, adjustInventory, getStockLedger } from '../../../features/inventory/services';
import { getProducts } from '../../../features/product/services';
import type { InventoryItem, StockLedgerEntry } from '../../../features/inventory/types';
import type { Product } from '../../../features/product/types';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState, StatusBadge, LedgerTypeBadge, AccessDenied } from '../../../components/ui';
import {
  Warehouse, RefreshCw, ArrowUpDown, Plus, Package, CheckCircle2,
  AlertCircle, Search, X, Check, ScrollText
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { hasFieldPermission, hasModuleViewPermission } from '../../../utils/permissions';

export default function InventoryPage() {
  const { user, overrides } = useAuthStore();
  const toast = useToast();

  if (!hasModuleViewPermission(user?.roles, 'inventory', overrides)) {
    return <AccessDenied module="Inventory" />;
  }

  const canAdjust = hasFieldPermission(user?.roles, 'inventory', 'Adjust Inventory', 'create', overrides);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, led, prodList] = await Promise.all([getInventory(), getStockLedger(), getProducts()]);
      setItems(inv);
      setLedger(led);
      setProducts(prodList);
      setLastSyncTime(new Date());
    } catch {
      /* swallow */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      setAdjProductId('');
      setAdjQty('');
      setAdjRef('');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
    setSaving(false);
  };

  // Computed stats
  const totalOnHand = items.reduce((sum, i) => sum + i.onHandQty, 0);
  const totalReserved = items.reduce((sum, i) => sum + i.reservedQty, 0);
  const totalFree = items.reduce((sum, i) => sum + i.freeQty, 0);
  const outOfStock = items.filter((i) => i.onHandQty === 0).length;

  // Search filter
  const filteredItems = items.filter((i) =>
    i.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredLedger = ledger.filter((e) =>
    (e.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate initials from product name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate a consistent color based on product name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-emerald-100 text-emerald-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-cyan-100 text-cyan-700',
      'bg-indigo-100 text-indigo-700',
      'bg-teal-100 text-teal-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Generate a consistent placeholder image based on product name
  const getProductPlaceholder = (name: string) => {
    const placeholders = [
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&auto=format&fit=crop&q=60', // brown wooden table/lamp
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&auto=format&fit=crop&q=60', // orange desk / chair
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&auto=format&fit=crop&q=60', // modern home workspace
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400&auto=format&fit=crop&q=60', // bedroom furniture
      'https://images.unsplash.com/photo-1581428982868-e410dd047a90?w=400&auto=format&fit=crop&q=60', // modern wood/interior
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=60', // abstract light background
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&auto=format&fit=crop&q=60', // desk setup
      'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=400&auto=format&fit=crop&q=60', // wood panels
      'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400&auto=format&fit=crop&q=60', // metal/steel structure
      'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=400&auto=format&fit=crop&q=60', // box with screws/bolts
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=60', // silicon chip
      'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=400&auto=format&fit=crop&q=60', // computer components
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return placeholders[Math.abs(hash) % placeholders.length];
  };

  // Generate SKU from product ID
  // const getSku = (productId: string, index: number) => {
  //   return `SKU-${(1000 + index).toString()}`;
  // };

  // Format sync time
  const formatSyncTime = () => {
    if (!lastSyncTime) return '';
    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin}m ago`;
  };

  // Stat cards config
  const statCards = [
    {
      label: 'TOTAL ON HAND',
      value: totalOnHand,
      sub: 'Across all SKUs',
      icon: <Package size={18} />,
      iconBg: 'bg-blue-50 text-blue-500',
      borderColor: 'border-blue-100',
    },
    {
      label: 'RESERVED',
      value: totalReserved,
      sub: 'Allocated to orders',
      icon: (
        <svg
          xmlns="http://www.w3.org/2056/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      iconBg: 'bg-violet-50 text-violet-500',
      borderColor: 'border-violet-100',
    },
    {
      label: 'FREE TO PROMISE',
      value: totalFree,
      sub: 'Available for new sales',
      icon: <CheckCircle2 size={18} />,
      iconBg: 'bg-emerald-50 text-emerald-500',
      borderColor: 'border-emerald-100',
    },
    {
      label: 'OUT OF STOCK',
      value: outOfStock,
      sub: 'SKUs at zero',
      icon: <AlertCircle size={18} />,
      iconBg: 'bg-red-50 text-red-500',
      borderColor: 'border-red-100',
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100">
            <Warehouse size={22} className="text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Inventory & Stock Ledger</h2>
            <p className="text-xs text-gray-400 mt-0.5">Live view of on-hand, reserved, and free-to-promise stock.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => {
              if (items.length === 0) return;
              const headers = ['Product', 'On Hand', 'Reserved', 'Free', 'Updated'];
              const rows = items.map((i) => [
                i.productName,
                i.onHandQty,
                i.reservedQty,
                i.freeQty,
                new Date(i.updatedAt).toLocaleString(),
              ]);
              const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'inventory.csv';
              a.click();
              URL.revokeObjectURL(url);
              toast('Inventory exported', 'success');
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </Btn>
          <Btn variant="secondary" size="sm" onClick={() => setShowLedger(!showLedger)}>
            <ArrowUpDown size={14} /> {showLedger ? 'Stock Levels' : 'Ledger'}
          </Btn>
          <Btn size="sm" onClick={() => setShowAdjust(!showAdjust)} disabled={!canAdjust}>
            <Plus size={14} /> Adjust
          </Btn>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, idx) => (
          <div
            key={card.label}
            className={`relative overflow-hidden bg-white rounded-xl border ${card.borderColor} p-4 hover:shadow-md transition-all duration-300 group`}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">{card.label}</p>
              <div className={`p-1.5 rounded-lg ${card.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{card.sub}</p>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      {/* ── Search & Sync Row ── */}
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition placeholder:text-gray-400 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Synced {formatSyncTime()} · {items.length} of {items.length} items
        </div>
      </div>

      {/* ── Adjust Form ── */}
      {showAdjust && (
        <Card className="p-5 animate-fade-in border-sky-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Plus size={16} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Stock Adjustment</h3>
          </div>
          <form onSubmit={handleAdjust} className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Select
                label="Product"
                value={adjProductId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAdjProductId(e.target.value)}
                required
                disabled={!canAdjust}
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <Input
              label="Change Qty"
              type="number"
              placeholder="+10 or -5"
              value={adjQty}
              onChange={(e) => setAdjQty(e.target.value)}
              required
              disabled={!canAdjust}
            />
            <Input
              label="Reference"
              placeholder="(optional)"
              value={adjRef}
              onChange={(e) => setAdjRef(e.target.value)}
              disabled={!canAdjust}
            />
            <Btn disabled={saving || !canAdjust}>
              {saving ? <RefreshCw size={12} className="animate-spin-slow" /> : <Check size={12} />} Apply
            </Btn>
          </form>
        </Card>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw size={24} className="animate-spin-slow text-sky-500" />
          <p className="text-sm text-gray-400">Loading inventory data…</p>
        </div>
      ) : !showLedger ? (
        /* ── Stock Levels Table ── */
        filteredItems.length === 0 && items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Warehouse size={20} />}
              title="No inventory"
              description="Stock will appear as you receive purchases or adjust inventory."
            />
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card>
            <EmptyState icon={<Search size={20} />} title="No results" description={`No products match "${searchQuery}"`} />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50/80 to-gray-50/40 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5 text-center">On Hand</th>
                    <th className="px-5 py-3.5 text-center">Reserved</th>
                    <th className="px-5 py-3.5 text-center">Free</th>
                    <th className="px-5 py-3.5 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.map((i, idx) => {
                    // const initials = getInitials(i.productName);
                    // const avatarColor = getAvatarColor(i.productName);
                    // const sku = getSku(i.productId, idx);
                    const isOutOfStock = i.onHandQty === 0;
                    const isLow = i.onHandQty > 0 && i.onHandQty <= 2;

                    return (
                      <tr
                        key={i.productId}
                        className="hover:bg-sky-50/30 transition-colors duration-150 group"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-55 transition-transform duration-200 group-hover:scale-105">
                              <img
                                src={i.productImageUrl || getProductPlaceholder(i.productName)}
                                alt={i.productName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 leading-tight">{i.productName}</p>
                              {/* <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{sku}</p> */}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${isOutOfStock ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'
                                }`}
                            />
                            <span
                              className={`font-semibold tabular-nums ${isOutOfStock ? 'text-red-600' : 'text-gray-800'}`}
                            >
                              {i.onHandQty}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span className="font-medium text-gray-500 tabular-nums">{i.reservedQty}</span>
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`font-semibold tabular-nums ${i.freeQty > 0 ? 'text-emerald-600' : 'text-red-500'
                              }`}
                          >
                            {i.freeQty}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <span className="text-xs text-gray-400 tabular-nums">
                            {new Date(i.updatedAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'numeric',
                              year: 'numeric',
                            })}
                            ,{' '}
                            {new Date(i.updatedAt)
                              .toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true,
                              })
                              .toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        /* ── Stock Ledger Table ── */
        filteredLedger.length === 0 && ledger.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ScrollText size={20} />}
              title="No ledger entries"
              description="Entries appear from purchases, manufacturing, and adjustments."
            />
          </Card>
        ) : filteredLedger.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Search size={20} />}
              title="No results"
              description={`No ledger entries match "${searchQuery}"`}
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50/80 to-gray-50/40 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5 text-center">Change</th>
                    <th className="px-5 py-3.5">Reference</th>
                    <th className="px-5 py-3.5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLedger.map((e, idx) => {
                    const productName = e.product?.name || '—';
                    // const initials = productName !== '—' ? getInitials(productName) : '—';
                    // const avatarColor = productName !== '—' ? getAvatarColor(productName) : 'bg-gray-100 text-gray-400';

                    return (
                      <tr
                        key={e.id}
                        className="hover:bg-sky-50/30 transition-colors duration-150 group"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-55 transition-transform duration-200 group-hover:scale-105">
                              {productName !== '—' ? (
                                <img
                                  src={e.product?.imageUrl || getProductPlaceholder(productName)}
                                  alt={productName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">—</div>
                              )}
                            </div>
                            <span className="font-medium text-gray-800">{productName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <LedgerTypeBadge type={e.type} />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold tabular-nums ${e.changeQty >= 0 ? 'text-emerald-600' : 'text-red-500'
                              }`}
                          >
                            {e.changeQty >= 0 ? '+' : ''}
                            {e.changeQty}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs font-mono">
                          {e.referenceId ? e.referenceId.slice(0, 8) + '…' : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right text-xs text-gray-400 tabular-nums">
                          {new Date(e.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'numeric',
                            year: 'numeric',
                          })}
                          ,{' '}
                          {new Date(e.createdAt)
                            .toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true,
                            })
                            .toLowerCase()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}
    </div>
  );
}

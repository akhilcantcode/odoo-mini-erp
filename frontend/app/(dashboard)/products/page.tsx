'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getProducts, createProduct } from '../../../features/product/services';
import type { Product } from '../../../features/product/types';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState, StatusBadge } from '../../../components/ui';
import {
  RefreshCw, Plus, Check, Package, Search, X,
  DollarSign, Layers, TrendingUp, ShoppingCart, LayoutGrid, List
} from 'lucide-react';

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showSearchBar, setShowSearchBar] = useState(true);

  // Form state
  const [fName, setFName] = useState('');
  const [fSales, setFSales] = useState('');
  const [fCost, setFCost] = useState('');
  const [fType, setFType] = useState<'purchase' | 'manufacture'>('purchase');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await getProducts());
      setLastSyncTime(new Date());
    } catch {
      /* swallow */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProduct({
        name: fName,
        salesPrice: fSales ? parseFloat(fSales) : null,
        costPrice: fCost ? parseFloat(fCost) : null,
        procurementType: fType,
        procureOnDemand: false,
      });
      toast('Product created', 'success');
      setShowForm(false);
      setFName('');
      setFSales('');
      setFCost('');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
    setSaving(false);
  };

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

  // Computed stats
  const totalProducts = products.length;
  const purchaseProducts = products.filter((p) => p.procurementType === 'purchase').length;
  const manufactureProducts = products.filter((p) => p.procurementType === 'manufacture').length;
  const avgSalesPrice = products.length > 0
    ? (products.reduce((sum, p) => sum + (p.salesPrice || 0), 0) / products.length).toFixed(2)
    : '0.00';

  // Search filter
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderProductKanbanCard = (p: Product) => {
    const initials = getInitials(p.name);
    const avatarColor = getAvatarColor(p.name);
    const onHand = p.inventory?.onHandQty ?? 0;
    const isOutOfStock = onHand === 0;
    const isLow = onHand > 0 && onHand <= 2;

    return (
      <div
        key={p.id}
        className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200 flex flex-col justify-between min-h-[180px] group"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${avatarColor} flex-shrink-0`}>
              {initials}
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm block leading-tight">
                {p.name}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                {p.procurementType === 'manufacture' ? 'Manufactured' : 'Purchased'} Item
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-medium">Sales Price</span>
              <span className="font-semibold text-sm text-gray-800 tabular-nums">
                {p.salesPrice != null ? (
                  <span className="inline-flex items-center gap-0.5">
                    <DollarSign size={12} className="text-gray-400" />
                    {p.salesPrice.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block uppercase font-medium">Cost Price</span>
              <span className="font-medium text-sm text-gray-500 tabular-nums">
                {p.costPrice != null ? (
                  <span className="inline-flex items-center gap-0.5">
                    <DollarSign size={12} className="text-gray-400" />
                    {p.costPrice.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isOutOfStock ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
            />
            <span className="text-xs text-gray-500">
              Stock: <span className={`font-semibold tabular-nums ${isOutOfStock ? 'text-red-600' : 'text-gray-800'}`}>{onHand}</span>
            </span>
          </div>
          <StatusBadge status={p.procurementType} />
        </div>
      </div>
    );
  };

  // Stat cards config
  const statCards = [
    {
      label: 'TOTAL PRODUCTS',
      value: totalProducts,
      sub: 'Active catalog items',
      icon: <Package size={18} />,
      iconBg: 'bg-blue-50 text-blue-500',
      borderColor: 'border-blue-100',
    },
    {
      label: 'PURCHASED',
      value: purchaseProducts,
      sub: 'Buy-to-stock items',
      icon: <ShoppingCart size={18} />,
      iconBg: 'bg-violet-50 text-violet-500',
      borderColor: 'border-violet-100',
    },
    {
      label: 'MANUFACTURED',
      value: manufactureProducts,
      sub: 'Make-to-stock items',
      icon: <Layers size={18} />,
      iconBg: 'bg-emerald-50 text-emerald-500',
      borderColor: 'border-emerald-100',
    },
    {
      label: 'AVG. SALES PRICE',
      value: `$${avgSalesPrice}`,
      sub: 'Across all products',
      icon: <TrendingUp size={18} />,
      iconBg: 'bg-amber-50 text-amber-500',
      borderColor: 'border-amber-100',
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100">
            <Package size={22} className="text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Products</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage your product catalog, pricing, and procurement strategies.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={14} />
          </Btn>
          <Btn variant={showSearchBar ? "primary" : "secondary"} size="sm" onClick={() => setShowSearchBar(!showSearchBar)} title="Toggle search bar">
            <Search size={14} />
          </Btn>
          <Btn variant="secondary" size="sm" onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')} title={viewMode === 'list' ? 'Switch to Kanban' : 'Switch to List'}>
            {viewMode === 'list' ? <LayoutGrid size={14} /> : <List size={14} />}
            <span className="ml-1 hidden sm:inline">{viewMode === 'list' ? 'Kanban' : 'List'}</span>
          </Btn>
          <Btn
            variant="secondary"
            size="sm"
            onClick={() => {
              if (products.length === 0) return;
              const headers = ['Name', 'Sales Price', 'Cost Price', 'Procurement', 'On Hand'];
              const rows = products.map((p) => [
                p.name,
                p.salesPrice ?? '',
                p.costPrice ?? '',
                p.procurementType,
                p.inventory?.onHandQty ?? 0,
              ]);
              const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'products.csv';
              a.click();
              URL.revokeObjectURL(url);
              toast('Products exported', 'success');
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
          <Btn size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Add Product
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
      {showSearchBar && (
        <div className="flex items-center justify-between animate-fade-in bg-gray-50/50 p-3 rounded-xl border border-gray-100">
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
            Synced {formatSyncTime()} · {filteredProducts.length} of {products.length} products
          </div>
        </div>
      )}

      {/* ── Create Form ── */}
      {showForm && (
        <Card className="p-5 animate-fade-in border-sky-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Plus size={16} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">New Product</h3>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <Input
              label="Product Name"
              placeholder="e.g. Oak Table"
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              required
            />
            <Input
              label="Sales Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={fSales}
              onChange={(e) => setFSales(e.target.value)}
            />
            <Input
              label="Cost Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={fCost}
              onChange={(e) => setFCost(e.target.value)}
            />
            <Select
              label="Procurement"
              value={fType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFType(e.target.value as 'purchase' | 'manufacture')}
            >
              <option value="purchase">Purchase</option>
              <option value="manufacture">Manufacture</option>
            </Select>
            <div className="flex items-end gap-2">
              <Btn type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Btn>
              <Btn disabled={saving}>
                {saving ? <RefreshCw size={12} className="animate-spin-slow" /> : <Check size={12} />} Save
              </Btn>
            </div>
          </form>
        </Card>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw size={24} className="animate-spin-slow text-sky-500" />
          <p className="text-sm text-gray-400">Loading products…</p>
        </div>
      ) : products.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package size={20} />}
            title="No products"
            description="Create your first product to get started."
          />
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <EmptyState icon={<Search size={20} />} title="No results" description={`No products match "${searchQuery}"`} />
        </Card>
      ) : viewMode === 'list' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50/80 to-gray-50/40 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5 text-right">Sales Price</th>
                  <th className="px-5 py-3.5 text-right">Cost Price</th>
                  <th className="px-5 py-3.5 text-center">Strategy</th>
                  <th className="px-5 py-3.5 text-center">On Hand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((p, idx) => {
                  const initials = getInitials(p.name);
                  const avatarColor = getAvatarColor(p.name);
                  const onHand = p.inventory?.onHandQty ?? 0;
                  const isOutOfStock = onHand === 0;
                  const isLow = onHand > 0 && onHand <= 2;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-sky-50/30 transition-colors duration-150 group"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${avatarColor} transition-transform duration-200 group-hover:scale-105 flex-shrink-0`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">{p.name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{p.procurementType === 'manufacture' ? 'Manufactured' : 'Purchased'} item</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="font-semibold text-gray-800 tabular-nums">
                          {p.salesPrice != null ? (
                            <span className="inline-flex items-center gap-0.5">
                              <DollarSign size={12} className="text-gray-400" />
                              {p.salesPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <span className="font-medium text-gray-500 tabular-nums">
                          {p.costPrice != null ? (
                            <span className="inline-flex items-center gap-0.5">
                              <DollarSign size={12} className="text-gray-400" />
                              {p.costPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <StatusBadge status={p.procurementType} />
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isOutOfStock ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                          />
                          <span
                            className={`font-semibold tabular-nums ${
                              isOutOfStock ? 'text-red-600' : 'text-gray-800'
                            }`}
                          >
                            {onHand}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in w-full">
          {filteredProducts.map((p) => renderProductKanbanCard(p))}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getProducts, createProduct, deleteProduct, importProducts } from '../../../features/product/services';
import type { Product } from '../../../features/product/types';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState, StatusBadge, AccessDenied } from '../../../components/ui';
import {
  RefreshCw, Plus, Check, Package, Search, X, Trash2,
  DollarSign, Layers, TrendingUp, ShoppingCart, LayoutGrid, List
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { hasFieldPermission, hasModuleViewPermission } from '../../../utils/permissions';

export default function ProductsPage() {
  const { user, overrides } = useAuthStore();
  const toast = useToast();
  const canCreate = hasFieldPermission(user?.roles, 'product', 'Product', 'create', overrides);
  const canDelete = hasFieldPermission(user?.roles, 'product', 'Product', 'delete', overrides);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showSearchBar, setShowSearchBar] = useState(true);

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{
    name: string;
    salesPrice: number | null;
    costPrice: number | null;
    procurementType: 'purchase' | 'manufacture';
    procureOnDemand: boolean;
    imageUrl: string | null;
    errors: string[];
  }[]>([]);
  const [importing, setImporting] = useState(false);

  // Form state
  const [fName, setFName] = useState('');
  const [fSales, setFSales] = useState('');
  const [fCost, setFCost] = useState('');
  const [fType, setFType] = useState<'purchase' | 'manufacture'>('purchase');
  const [fImage, setFImage] = useState('');
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

  const parseCSV = (text: string) => {
    const lines: string[][] = [];
    let row: string[] = [''];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push('');
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    return lines;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const parsedLines = parseCSV(text);
      if (parsedLines.length < 2) {
        toast('CSV file is empty or has no header/data rows', 'error');
        return;
      }

      const headers = parsedLines[0].map(h => h.trim().toLowerCase());
      
      const nameIdx = headers.indexOf('name');
      const salesIdx = headers.indexOf('sales price');
      const costIdx = headers.indexOf('cost price');
      const procurementIdx = headers.indexOf('procurement');
      const demandIdx = headers.indexOf('procure on demand');
      const imageIdx = headers.findIndex(h => h === 'image url' || h === 'image');

      if (nameIdx === -1 || procurementIdx === -1) {
        toast('CSV must contain at least "Name" and "Procurement" columns', 'error');
        return;
      }

      const items: typeof csvPreview = [];

      for (let i = 1; i < parsedLines.length; i++) {
        const row = parsedLines[i];
        if (row.length === 1 && row[0] === '') continue; // Skip empty rows

        const errors: string[] = [];
        
        const rawName = row[nameIdx]?.trim() || '';
        const rawSales = salesIdx !== -1 ? row[salesIdx]?.trim() : '';
        const rawCost = costIdx !== -1 ? row[costIdx]?.trim() : '';
        const rawProcurement = row[procurementIdx]?.trim().toLowerCase() || '';
        const rawDemand = demandIdx !== -1 ? row[demandIdx]?.trim().toLowerCase() : '';
        const rawImage = imageIdx !== -1 ? row[imageIdx]?.trim() : '';

        if (!rawName) {
          errors.push('Name is required');
        }

        let salesPrice: number | null = null;
        if (rawSales) {
          const val = parseFloat(rawSales);
          if (isNaN(val) || val < 0) {
            errors.push('Sales Price must be a non-negative number');
          } else {
            salesPrice = val;
          }
        }

        let costPrice: number | null = null;
        if (rawCost) {
          const val = parseFloat(rawCost);
          if (isNaN(val) || val < 0) {
            errors.push('Cost Price must be a non-negative number');
          } else {
            costPrice = val;
          }
        }

        let procurementType: 'purchase' | 'manufacture' = 'purchase';
        if (rawProcurement === 'purchase' || rawProcurement === 'buy') {
          procurementType = 'purchase';
        } else if (rawProcurement === 'manufacture' || rawProcurement === 'make') {
          procurementType = 'manufacture';
        } else {
          errors.push('Procurement must be "purchase" or "manufacture"');
        }

        let procureOnDemand = false;
        if (rawDemand === 'true' || rawDemand === 'yes' || rawDemand === '1') {
          procureOnDemand = true;
        }

        items.push({
          name: rawName,
          salesPrice,
          costPrice,
          procurementType,
          procureOnDemand,
          imageUrl: rawImage || null,
          errors
        });
      }

      setCsvPreview(items);
    };

    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (csvPreview.length === 0) return;
    const hasErrors = csvPreview.some(item => item.errors.length > 0);
    if (hasErrors) {
      toast('Please fix CSV errors before importing', 'error');
      return;
    }

    setImporting(true);
    try {
      const payload = csvPreview.map(item => ({
        name: item.name,
        salesPrice: item.salesPrice,
        costPrice: item.costPrice,
        procurementType: item.procurementType,
        procureOnDemand: item.procureOnDemand,
        imageUrl: item.imageUrl
      }));

      await importProducts(payload);
      toast(`Successfully imported ${payload.length} products!`, 'success');
      setShowImportModal(false);
      setCsvPreview([]);
      refresh();
    } catch (err: any) {
      toast(err.message || 'Failed to import products', 'error');
    }
    setImporting(false);
  };

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
        imageUrl: fImage || null,
      });
      toast('Product created', 'success');
      setShowForm(false);
      setFName('');
      setFSales('');
      setFCost('');
      setFImage('');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
    setSaving(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This will also clear its inventory, stock ledgers, and bill of materials (if any).')) return;
    try {
      await deleteProduct(id);
      toast('Product deleted successfully', 'success');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete product', 'error');
    }
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
        className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200 flex flex-col justify-between min-h-[280px] group overflow-hidden"
      >
        <div className="h-28 w-full overflow-hidden border-b border-gray-100 relative bg-gray-50 flex-shrink-0">
          <img
            src={p.imageUrl || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&auto=format&fit=crop&q=60"}
            alt={p.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              {!p.imageUrl && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${avatarColor} flex-shrink-0`}>
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <span className="font-bold text-gray-900 text-sm block leading-tight truncate" title={p.name}>
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
            <div className="flex items-center gap-2">
              <StatusBadge status={p.procurementType} />
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProduct(p.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                  title="Delete Product"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
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

  if (!hasModuleViewPermission(user?.roles, 'product', overrides)) {
    return <AccessDenied module="Products" />;
  }

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
          {canCreate && (
            <div className="flex gap-2">
              <Btn variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
                Import CSV
              </Btn>
              <Btn size="sm" onClick={() => setShowForm(!showForm)}>
                <Plus size={14} /> Add Product
              </Btn>
            </div>
          )}
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
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <Input
              label="Product Name"
              placeholder="e.g. Oak Table"
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              required
              disabled={!hasFieldPermission(user?.roles, 'product', 'Product', 'create', overrides)}
            />
            <Input
              label="Sales Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={fSales}
              onChange={(e) => setFSales(e.target.value)}
              disabled={!hasFieldPermission(user?.roles, 'product', 'Sales Price', 'create', overrides)}
            />
            <Input
              label="Cost Price"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={fCost}
              onChange={(e) => setFCost(e.target.value)}
              disabled={!hasFieldPermission(user?.roles, 'product', 'Cost Price', 'create', overrides)}
            />
            <Input
              label="Image URL"
              placeholder="https://images.unsplash.com/..."
              value={fImage}
              onChange={(e) => setFImage(e.target.value)}
              disabled={!hasFieldPermission(user?.roles, 'product', 'Product', 'create', overrides)}
            />
            <Select
              label="Procurement"
              value={fType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFType(e.target.value as 'purchase' | 'manufacture')}
              disabled={!hasFieldPermission(user?.roles, 'product', 'Procurement Method', 'create', overrides)}
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
                  <th className="px-5 py-3.5 text-right">Actions</th>
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
                          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-55 transition-transform duration-200 group-hover:scale-105">
                            <img
                              src={p.imageUrl || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=80&auto=format&fit=crop&q=60"}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
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
                      <td className="px-5 py-3.5 text-right">
                        {canDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(p.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
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
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-md font-bold text-gray-900">Import Products from CSV</h3>
                <p className="text-xs text-gray-400 mt-0.5">Upload a CSV file containing your product catalog.</p>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setCsvPreview([]);
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Instructions */}
              <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-xl text-xs text-sky-800 space-y-2">
                <p className="font-semibold">CSV Column Requirements:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Name</strong> (required): Product name.</li>
                  <li><strong>Procurement</strong> (required): Must be either <code>purchase</code> or <code>manufacture</code>.</li>
                  <li><strong>Sales Price</strong> (optional): Non-negative float.</li>
                  <li><strong>Cost Price</strong> (optional): Non-negative float.</li>
                  <li><strong>Procure on Demand</strong> (optional): <code>true</code> or <code>false</code>.</li>
                  <li><strong>Image URL</strong> (optional): Link to product image.</li>
                </ul>
                <p className="text-[10px] text-sky-600 pt-1">Example: <code>Name,Procurement,Sales Price,Cost Price,Procure on Demand,Image URL</code></p>
              </div>

              {/* File Select */}
              <div className="border-2 border-dashed border-gray-200 hover:border-sky-300 rounded-xl p-6 transition flex flex-col items-center justify-center bg-gray-50/20 relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="text-center space-y-1 pointer-events-none">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-sky-50 text-sky-600 mb-2">
                    <Plus size={20} />
                  </div>
                  <p className="text-xs font-semibold text-gray-700">Choose CSV File</p>
                  <p className="text-[10px] text-gray-400">Click to browse your computer (.csv)</p>
                </div>
              </div>

              {/* Preview Table */}
              {csvPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Parsed Products Preview ({csvPreview.length} rows)</h4>
                    {csvPreview.some(p => p.errors.length > 0) && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold border border-red-100">
                        Contains errors
                      </span>
                    )}
                  </div>
                  <div className="border border-gray-100 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Procurement</th>
                          <th className="px-4 py-2 text-right">Sales Price</th>
                          <th className="px-4 py-2 text-right">Cost Price</th>
                          <th className="px-4 py-2 text-center">On Demand</th>
                          <th className="px-4 py-2 text-center">Image</th>
                          <th className="px-4 py-2">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {csvPreview.map((item, idx) => (
                          <tr key={idx} className={`hover:bg-gray-50/40 ${item.errors.length > 0 ? 'bg-red-50/20' : ''}`}>
                            <td className="px-4 py-2.5 font-medium text-gray-800">{item.name || <span className="text-red-500 italic">Empty</span>}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${item.procurementType === 'manufacture' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                {item.procurementType}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono">${item.salesPrice !== null ? item.salesPrice.toFixed(2) : '-'}</td>
                            <td className="px-4 py-2.5 text-right font-mono">${item.costPrice !== null ? item.costPrice.toFixed(2) : '-'}</td>
                            <td className="px-4 py-2.5 text-center">{item.procureOnDemand ? 'Yes' : 'No'}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded border border-gray-150 overflow-hidden bg-gray-50 mx-auto">
                                <img
                                  src={item.imageUrl || "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=80&auto=format&fit=crop&q=60"}
                                  alt="preview"
                                  className="w-full h-full object-cover"
                                />
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {item.errors.length > 0 ? (
                                <span className="text-red-500 text-[10px] font-medium leading-none block">{item.errors.join(', ')}</span>
                              ) : (
                                <span className="text-emerald-500 text-[10px] font-medium block">✓ Valid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
              <Btn variant="secondary" size="sm" onClick={() => {
                setShowImportModal(false);
                setCsvPreview([]);
              }}>
                Cancel
              </Btn>
              <Btn
                size="sm"
                onClick={handleConfirmImport}
                disabled={csvPreview.length === 0 || csvPreview.some(p => p.errors.length > 0) || importing}
              >
                {importing ? <RefreshCw size={13} className="animate-spin-slow mr-1.5 inline" /> : null}
                Confirm Import
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getProducts, getBom, setBom } from '../../../features/product/services';
import type { Product, BoMItem } from '../../../features/product/types';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState, StatusBadge } from '../../../components/ui';
import {
  Settings2, RefreshCw, X, Plus, Trash2, ArrowLeft, Save, ScrollText, Search, Cpu, Layers, Activity
} from 'lucide-react';

export default function BomPage() {
  const toast = useToast();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [isEditing, setIsEditing] = useState(false);
  const [bomLoading, setBomLoading] = useState(false);

  // Form states for selected BoM
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [bomSequenceId, setBomSequenceId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1.0');
  const [reference, setReference] = useState<string>('');
  
  // Dynamic items / components list in state
  const [items, setItems] = useState<{ componentId: string; quantity: string }[]>([]);

  // Dynamic operations / work orders list in state
  const [operations, setOperations] = useState<{
    operationName: string;
    workCenterName: string;
    plannedDuration: string;
  }[]>([]);

  const [activeTab, setActiveTab] = useState<'components' | 'workOrders'>('components');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const prods = await getProducts();
      setProducts(prods);
    } catch {
      /* swallow */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openBomDetail = async (productId: string) => {
    setSelectedProductId(productId);
    setBomLoading(true);
    setIsEditing(true);
    setActiveTab('components');
    try {
      const bom = await getBom(productId);
      if (bom) {
        setBomSequenceId(bom.id);
        setQuantity(bom.quantity?.toString() || '1.0');
        setReference(bom.reference || '');
        setItems(
          bom.items?.map((item) => ({
            componentId: item.componentId,
            quantity: item.quantity.toString(),
          })) || []
        );
        setOperations(
          bom.operations?.map((op) => ({
            operationName: op.operationName,
            workCenterName: op.workCenterName,
            plannedDuration: op.plannedDuration.toString(),
          })) || []
        );
      } else {
        // No existing BoM, initialize fields
        setBomSequenceId('');
        setQuantity('1.0');
        setReference('');
        setItems([]);
        setOperations([]);
      }
    } catch {
      setBomSequenceId('');
      setQuantity('1.0');
      setReference('');
      setItems([]);
      setOperations([]);
    }
    setBomLoading(false);
  };

  const handleNewBom = () => {
    setSelectedProductId('');
    setBomSequenceId('');
    setQuantity('1.0');
    setReference('');
    setItems([]);
    setOperations([]);
    setIsEditing(true);
    setActiveTab('components');
  };

  const addComponentRow = () => {
    setItems([...items, { componentId: '', quantity: '1' }]);
  };

  const removeComponentRow = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const updateComponentRow = (index: number, field: 'componentId' | 'quantity', value: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const addOperationRow = () => {
    setOperations([
      ...operations,
      { operationName: '', workCenterName: '', plannedDuration: '60.00' },
    ]);
  };

  const removeOperationRow = (index: number) => {
    setOperations(operations.filter((_, idx) => idx !== index));
  };

  const updateOperationRow = (
    index: number,
    field: 'operationName' | 'workCenterName' | 'plannedDuration',
    value: string
  ) => {
    const next = [...operations];
    next[index] = { ...next[index], [field]: value };
    setOperations(next);
  };

  const handleSave = async () => {
    if (!selectedProductId) {
      toast('Please select a finished product', 'error');
      return;
    }

    if (reference.length > 8) {
      toast('Reference cannot exceed 8 characters', 'error');
      return;
    }

    // Filter out invalid items
    const validItems = items
      .filter((i) => i.componentId !== '' && parseFloat(i.quantity) > 0)
      .map((i) => ({
        componentId: i.componentId,
        quantity: parseFloat(i.quantity),
      }));

    // Filter out invalid operations
    const validOps = operations
      .filter((op) => op.operationName.trim() !== '' && op.workCenterName.trim() !== '')
      .map((op) => ({
        operationName: op.operationName.trim(),
        workCenterName: op.workCenterName.trim(),
        plannedDuration: parseFloat(op.plannedDuration) || 0,
      }));

    setSaving(true);
    try {
      await setBom(selectedProductId, {
        quantity: parseFloat(quantity) || 1.0,
        reference: reference || null,
        items: validItems,
        operations: validOps,
      });

      toast('Bill of Materials saved successfully', 'success');
      setIsEditing(false);
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to save BoM', 'error');
    }
    setSaving(false);
  };

  const handleClearBom = async (productId: string) => {
    if (!confirm('Are you sure you want to clear this Bill of Materials?')) return;
    try {
      await setBom(productId, {
        quantity: 1.0,
        reference: null,
        items: [],
        operations: [],
      });
      toast('BoM cleared', 'success');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to clear BoM', 'error');
    }
  };

  // List of manufactured products
  const manufacturedProducts = products.filter((p) => p.procurementType === 'manufacture');

  // Filter manufactured products for "New" dropdown (exclude ones that already have a BoM, except current edited one)
  const availableFinishedProducts = manufacturedProducts.filter(
    (p) => !p.bom || !p.bom.items || p.bom.items.length === 0 || p.id === selectedProductId
  );

  if (isEditing) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Detail view header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Btn variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
              <ArrowLeft size={14} className="mr-1 inline" /> Back
            </Btn>
            <Btn variant="primary" size="sm" onClick={handleSave} disabled={saving || bomLoading}>
              {saving ? <RefreshCw size={14} className="animate-spin-slow mr-1 inline" /> : <Save size={14} className="mr-1 inline" />}
              Save
            </Btn>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/audit?type=BoM')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-500 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 transition cursor-pointer"
              title="Open audit logs filtered by BoM"
            >
              <ScrollText size={14} /> Logs
            </button>
          </div>
        </div>

        {bomLoading ? (
          <div className="flex justify-center py-20">
            <RefreshCw size={24} className="animate-spin-slow text-sky-500" />
          </div>
        ) : (
          <Card className="p-6 border border-gray-200 shadow-sm relative overflow-hidden">
            {/* Odoo style reference box */}
            <div className="flex justify-between items-start mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-2 bg-gray-50/50 text-md font-mono font-bold text-gray-800">
                {bomSequenceId || 'NEW TEMPLATE'}
              </div>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                {/* Finished Product Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                    Finished product
                  </label>
                  {bomSequenceId ? (
                    // Edit mode: product is locked
                    <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg font-medium text-gray-800">
                      {products.find((p) => p.id === selectedProductId)?.name || 'Unknown Product'}
                    </div>
                  ) : (
                    // New mode: dropdown
                    <Select
                      value={selectedProductId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setSelectedProductId(e.target.value)
                      }
                      required
                    >
                      <option value="">Select manufactured product...</option>
                      {availableFinishedProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                {/* Quantity */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="Quantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 text-gray-400 font-semibold px-3 py-2.5 rounded-lg text-xs self-end mb-0.5">
                    Units
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Reference */}
                <div>
                  <Input
                    label="Reference"
                    placeholder="e.g. WOOD-01"
                    value={reference}
                    onChange={(e) => setReference(e.target.value.slice(0, 8))}
                    maxLength={8}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Max 8 characters ({reference.length}/8)
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="mt-8 border-b border-gray-100 flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('components')}
                className={`pb-2 text-sm font-semibold border-b-2 transition uppercase tracking-wider cursor-pointer ${
                  activeTab === 'components'
                    ? 'border-sky-500 text-sky-700'
                    : 'border-transparent text-gray-400'
                }`}
              >
                Components
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('workOrders')}
                className={`pb-2 text-sm font-semibold border-b-2 transition uppercase tracking-wider cursor-pointer ${
                  activeTab === 'workOrders'
                    ? 'border-sky-500 text-sky-700'
                    : 'border-transparent text-gray-400'
                }`}
              >
                Work Orders
              </button>
            </div>

            {/* Tab content */}
            <div className="mt-4">
              {activeTab === 'components' ? (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                          <th className="px-5 py-3">Components</th>
                          <th className="px-5 py-3 text-center">To Consume</th>
                          <th className="px-5 py-3 text-center">Units</th>
                          <th className="px-5 py-3 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-xs italic">
                              No components added. Click "+ Add a product" below.
                            </td>
                          </tr>
                        ) : (
                          items.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/30 transition">
                              <td className="px-5 py-2">
                                <Select
                                  value={row.componentId}
                                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    updateComponentRow(idx, 'componentId', e.target.value)
                                  }
                                >
                                  <option value="">Select component...</option>
                                  {products
                                    .filter((p) => p.id !== selectedProductId)
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name}
                                      </option>
                                    ))}
                                </Select>
                              </td>
                              <td className="px-5 py-2 text-center w-32">
                                <Input
                                  type="number"
                                  min="0.001"
                                  step="any"
                                  value={row.quantity}
                                  onChange={(e) => updateComponentRow(idx, 'quantity', e.target.value)}
                                  className="text-center"
                                />
                              </td>
                              <td className="px-5 py-2 text-center text-gray-400 text-xs font-semibold">
                                Units
                              </td>
                              <td className="px-5 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeComponentRow(idx)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                  <X size={15} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={addComponentRow}
                    className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-800 text-xs font-semibold mt-2 px-2 py-1 hover:bg-sky-50 rounded-lg transition"
                  >
                    <Plus size={14} /> Add a product
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                          <th className="px-5 py-3">Operations</th>
                          <th className="px-5 py-3">Work Center</th>
                          <th className="px-5 py-3 text-center">Expected Duration (Mins)</th>
                          <th className="px-5 py-3 text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {operations.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-xs italic">
                              No operations added. Click "+ Add a line" below.
                            </td>
                          </tr>
                        ) : (
                          operations.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/30 transition">
                              <td className="px-5 py-2">
                                <Input
                                  placeholder="e.g. Assembly"
                                  value={row.operationName}
                                  onChange={(e) =>
                                    updateOperationRow(idx, 'operationName', e.target.value)
                                  }
                                />
                              </td>
                              <td className="px-5 py-2">
                                <Input
                                  placeholder="e.g. Work Station 1"
                                  value={row.workCenterName}
                                  onChange={(e) =>
                                    updateOperationRow(idx, 'workCenterName', e.target.value)
                                  }
                                />
                              </td>
                              <td className="px-5 py-2 text-center w-36">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.plannedDuration}
                                  onChange={(e) =>
                                    updateOperationRow(idx, 'plannedDuration', e.target.value)
                                  }
                                  className="text-center font-mono"
                                />
                              </td>
                              <td className="px-5 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeOperationRow(idx)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                  <X size={15} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={addOperationRow}
                    className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-800 text-xs font-semibold mt-2 px-2 py-1 hover:bg-sky-50 rounded-lg transition"
                  >
                    <Plus size={14} /> Add a line
                  </button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Helper methods
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  // Computed stats
  const totalTemplates = manufacturedProducts.filter((p) => p.bom && p.bom.items && p.bom.items.length > 0).length;
  const totalManufactured = manufacturedProducts.length;
  const activeSteps = manufacturedProducts.reduce((sum, p) => sum + (p.bom?.operations?.length || 0), 0);
  const componentsConfigured = manufacturedProducts.reduce((sum, p) => sum + (p.bom?.items?.length || 0), 0);

  const statCards = [
    {
      label: 'TOTAL TEMPLATES',
      value: totalTemplates,
      sub: 'Configured BoM recipes',
      icon: <Layers size={18} />,
      iconBg: 'bg-blue-50 text-blue-500',
      borderColor: 'border-blue-100',
    },
    {
      label: 'MANUFACTURED PRODUCTS',
      value: totalManufactured,
      sub: 'Strategy set to Manufacture',
      icon: <Cpu size={18} />,
      iconBg: 'bg-violet-50 text-violet-500',
      borderColor: 'border-violet-100',
    },
    {
      label: 'ACTIVE BOM STEPS',
      value: activeSteps,
      sub: 'Operations across all BoMs',
      icon: <Activity size={18} />,
      iconBg: 'bg-amber-50 text-amber-500',
      borderColor: 'border-amber-100',
    },
    {
      label: 'COMPONENTS CONFIGURED',
      value: componentsConfigured,
      sub: 'Raw material lines',
      icon: <Settings2 size={18} />,
      iconBg: 'bg-emerald-50 text-emerald-500',
      borderColor: 'border-emerald-100',
    },
  ];

  // Search filter
  const filteredProducts = manufacturedProducts.filter((p) => {
    const query = searchQuery.toLowerCase();
    const bomId = p.bom?.id || '';
    const bomRef = p.bom?.reference || '';
    return (
      p.name.toLowerCase().includes(query) ||
      bomId.toLowerCase().includes(query) ||
      bomRef.toLowerCase().includes(query) ||
      p.bom?.items?.some((item) => (item.component?.name || '').toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100">
            <Settings2 size={22} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Bills of Materials (BoM)</h2>
            <p className="text-xs text-gray-400 mt-0.5">Define multi-level manufacturing product recipes and shop steps.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={14} />
          </Btn>
          <Btn size="sm" onClick={handleNewBom}>
            <Plus size={14} /> New BoM
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

      {/* ── Search Row ── */}
      <div className="flex items-center justify-between">
        <div className="relative w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search product, BoM ID, or component..."
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
          Synced just now · {filteredProducts.length} of {manufacturedProducts.length} templates
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={20} className="animate-spin-slow text-sky-500" />
        </div>
      ) : filteredProducts.length === 0 && manufacturedProducts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Settings2 size={20} />}
            title="No manufactured products"
            description="Only products with the 'Manufacture' strategy can have a Bill of Materials."
          />
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search size={20} />}
            title="No results found"
            description={`No BoM templates match "${searchQuery}"`}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50/80 to-gray-50/40 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-5 py-3.5">Finished Product</th>
                  <th className="px-5 py-3.5">Quantity</th>
                  <th className="px-5 py-3.5">Components</th>
                  <th className="px-5 py-3.5">Operations</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredProducts.map((p) => {
                  const hasBom = p.bom && p.bom.items && p.bom.items.length > 0;
                  const initials = getInitials(p.name);
                  const avatarColor = getAvatarColor(p.name);
                  return (
                    <tr key={p.id} className="hover:bg-sky-50/30 transition-colors duration-150 group">
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-sky-600">
                        {p.bom ? (
                          <button
                            onClick={() => openBomDetail(p.id)}
                            className="hover:underline font-bold text-sky-700 cursor-pointer"
                          >
                            {p.bom.id}
                          </button>
                        ) : (
                          <span className="text-gray-300 italic">Not set</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${avatarColor} transition-transform duration-200 group-hover:scale-105 flex-shrink-0`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">{p.name}</p>
                            {p.bom?.reference && (
                              <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                Ref: {p.bom.reference}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 font-medium">
                        {p.bom ? `${p.bom.quantity || '1.0'} Units` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {hasBom ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {p.bom?.items?.map((item, idx) => (
                              <span
                                key={item.id || idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-50 text-gray-700 border border-gray-100"
                              >
                                {item.component?.name || 'Unknown'} (×{item.quantity})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No components configured</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">
                        {p.bom?.operations && p.bom.operations.length > 0 ? (
                          <span className="bg-sky-50 text-sky-700 font-semibold px-2 py-0.5 rounded-full">
                            {p.bom.operations.length} Steps
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <Btn variant="secondary" size="sm" onClick={() => openBomDetail(p.id)}>
                            <Settings2 size={13} className="inline mr-0.5" /> Manage BoM
                          </Btn>
                          {p.bom && (
                            <Btn
                              variant="ghost"
                              size="sm"
                              onClick={() => handleClearBom(p.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Clear
                            </Btn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getProducts, getBom, setBom } from '../../../features/product/services';
import type { Product, BoMItem } from '../../../features/product/types';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState, StatusBadge } from '../../../components/ui';
import {
  Settings2, RefreshCw, X, Plus, Trash2, ArrowLeft, Save, ScrollText
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Bills of Materials (BoM)</h2>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={14} />
          </Btn>
          <Btn size="sm" onClick={handleNewBom}>
            <Plus size={14} /> New BoM
          </Btn>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={20} className="animate-spin-slow text-sky-500" />
        </div>
      ) : manufacturedProducts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Settings2 size={20} />}
            title="No manufactured products"
            description="Only products with the 'Manufacture' strategy can have a Bill of Materials."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Finished Product</th>
                  <th className="px-5 py-3">Quantity</th>
                  <th className="px-5 py-3">Components</th>
                  <th className="px-5 py-3">Operations</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {manufacturedProducts.map((p) => {
                  const hasBom = p.bom && p.bom.items && p.bom.items.length > 0;
                  return (
                    <tr key={p.id} className="hover:bg-sky-50/30 transition">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-sky-600">
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
                      <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {p.bom ? `${p.bom.quantity || '1.0'} Units` : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {hasBom ? (
                          <div className="flex flex-wrap gap-1">
                            {p.bom?.items?.map((item, idx) => (
                              <span
                                key={item.id || idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-100"
                              >
                                {item.component?.name || 'Unknown'} (×{item.quantity})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No components configured</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">
                        {p.bom?.operations && p.bom.operations.length > 0 ? (
                          <span className="bg-sky-50 text-sky-700 font-semibold px-2 py-0.5 rounded-full">
                            {p.bom.operations.length} Steps
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Btn variant="secondary" size="sm" onClick={() => openBomDetail(p.id)}>
                            <Settings2 size={13} /> Manage BoM
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

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../store/authStore';
import {
  getManufacturingOrders,
  getManufacturingOrder,
  createManufacturingOrder,
  startManufacturingOrder,
  completeManufacturingOrder,
  confirmManufacturingOrder,
  cancelManufacturingOrder,
  toggleWorkOrder
} from '../../../features/manufacturing/services';
import { getProducts } from '../../../features/product/services';
import { getUsers, ManagedUser } from '../../../services/auth';
import { getAuditLogs } from '../../../features/audit/services';
import type { ManufacturingOrder } from '../../../features/manufacturing/types';
import type { Product } from '../../../features/product/types';
import type { AuditLog } from '../../../features/audit/types';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState, StatusBadge } from '../../../components/ui';
import {
  Factory, RefreshCw, Plus, Check, Play, CheckCircle2, X
} from 'lucide-react';

export default function ManufacturingPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [moProductId, setMoProductId] = useState('');
  const [moQty, setMoQty] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  // Detail view state
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [orderLogs, setOrderLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'components' | 'workOrders'>('components');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [moList, prodList, uList] = await Promise.all([
        getManufacturingOrders(),
        getProducts(),
        getUsers()
      ]);
      setOrders(moList);
      setProducts(prodList);
      setUsersList(uList);
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
      await createManufacturingOrder({
        productId: moProductId,
        quantity: parseInt(moQty),
        scheduleDate: scheduleDate || undefined,
        assigneeId: assigneeId || undefined
      });
      toast('Manufacturing Order created', 'success');
      setShowForm(false);
      setMoProductId('');
      setMoQty('');
      setScheduleDate('');
      setAssigneeId('');
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
    setSaving(false);
  };

  const handleAction = async (id: string, action: 'confirm' | 'start' | 'complete' | 'cancel') => {
    setActing(id);
    try {
      let updated: ManufacturingOrder;
      if (action === 'confirm') {
        updated = await confirmManufacturingOrder(id);
        toast('Manufacturing Order confirmed', 'success');
      } else if (action === 'start') {
        updated = await startManufacturingOrder(id);
        toast('Manufacturing Order started (components consumed)', 'success');
      } else if (action === 'complete') {
        updated = await completeManufacturingOrder(id);
        toast('Manufacturing Order completed (goods produced)', 'success');
      } else {
        updated = await cancelManufacturingOrder(id);
        toast('Manufacturing Order cancelled', 'success');
      }

      // Update selectedOrder if it matches
      if (selectedOrder && selectedOrder.id === id) {
        setSelectedOrder(updated);
        // Refresh logs if showing
        if (showLogs) {
          await fetchOrderLogs(id);
        }
      }
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
    setActing(null);
  };

  const fetchOrderLogs = async (orderId: string) => {
    setLoadingLogs(true);
    try {
      const logs = await getAuditLogs({ entityId: orderId });
      setOrderLogs(logs);
    } catch (err) {
      console.error('Failed to fetch MO logs', err);
    }
    setLoadingLogs(false);
  };

  const toggleLogs = async () => {
    if (!selectedOrder) return;
    const nextShowLogs = !showLogs;
    setShowLogs(nextShowLogs);
    if (nextShowLogs) {
      await fetchOrderLogs(selectedOrder.id);
    }
  };

  const handleToggleWorkOrder = async (workOrderId: string) => {
    if (!selectedOrder) return;
    try {
      await toggleWorkOrder(selectedOrder.id, workOrderId);
      toast('Work order status updated', 'success');
      // Fetch latest MO to update detail view
      const updatedMo = await getManufacturingOrder(selectedOrder.id);
      setSelectedOrder(updatedMo);
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to update work order', 'error');
    }
  };

  if (selectedOrder) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Mockup Button Bar */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => {
                setSelectedOrder(null);
                setShowLogs(false);
                setOrderLogs([]);
              }}
            >
              Back
            </Btn>
            {selectedOrder.status === 'draft' && (
              <Btn
                variant="primary"
                size="sm"
                onClick={() => handleAction(selectedOrder.id, 'confirm')}
                disabled={acting === selectedOrder.id}
              >
                Confirm
              </Btn>
            )}
            {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'draft') && (
              <Btn
                variant="primary"
                size="sm"
                onClick={() => handleAction(selectedOrder.id, 'start')}
                disabled={acting === selectedOrder.id}
              >
                Start
              </Btn>
            )}
            {selectedOrder.status === 'in_progress' && (
              <Btn
                variant="primary"
                size="sm"
                onClick={() => handleAction(selectedOrder.id, 'complete')}
                disabled={acting === selectedOrder.id}
              >
                Produce
              </Btn>
            )}
            {(selectedOrder.status === 'draft' ||
              selectedOrder.status === 'confirmed' ||
              selectedOrder.status === 'in_progress') && (
              <Btn
                variant="danger"
                size="sm"
                onClick={() => handleAction(selectedOrder.id, 'cancel')}
                disabled={acting === selectedOrder.id}
              >
                Cancel
              </Btn>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Btn variant={showLogs ? 'primary' : 'secondary'} size="sm" onClick={toggleLogs}>
              Logs
            </Btn>
          </div>
        </div>

        {/* Mockup Form card */}
        <Card className="p-6 relative overflow-hidden border border-gray-200 shadow-sm">
          {/* Header Info */}
          <div className="flex justify-between items-start mb-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg px-4 py-2 bg-gray-50/50 text-md font-mono font-bold text-gray-800">
              {selectedOrder.id}
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 block uppercase tracking-wider font-semibold">Status</span>
              <StatusBadge status={selectedOrder.status} />
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 font-semibold text-gray-500">Finished product</span>
                <span className="text-gray-800 font-medium">{selectedOrder.product?.name || 'Unknown'}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 font-semibold text-gray-500">Quantity</span>
                <span className="text-gray-800 font-medium">
                  {selectedOrder.quantity} <span className="text-xs text-gray-400 ml-1">pcs</span>
                </span>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 font-semibold text-gray-500">Bill of Material</span>
                <span className="text-sky-700 font-medium font-mono text-xs">
                  {selectedOrder.bomId || `BOM-${selectedOrder.id.split('-')[1] || '0001'}`}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 font-semibold text-gray-500">Schedule Date</span>
                <span className="text-gray-800">
                  {selectedOrder.scheduleDate ? new Date(selectedOrder.scheduleDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 font-semibold text-gray-500">Assignee</span>
                <span className="text-gray-800 font-medium text-sky-700">
                  {selectedOrder.assignee?.name || 'Unassigned'}
                  {selectedOrder.assignee?.email && ` (${selectedOrder.assignee.email})`}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="mt-8 border-b border-gray-100 flex gap-4">
            <button
              onClick={() => setActiveSubTab('components')}
              className={`pb-2 text-sm font-semibold border-b-2 transition uppercase tracking-wider cursor-pointer ${
                activeSubTab === 'components' ? 'border-sky-500 text-sky-700' : 'border-transparent text-gray-400'
              }`}
            >
              Components
            </button>
            <button
              onClick={() => setActiveSubTab('workOrders')}
              className={`pb-2 text-sm font-semibold border-b-2 transition uppercase tracking-wider cursor-pointer ${
                activeSubTab === 'workOrders' ? 'border-sky-500 text-sky-700' : 'border-transparent text-gray-400'
              }`}
            >
              Work Orders
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeSubTab === 'components' ? (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      <th className="px-5 py-3">Components</th>
                      <th className="px-5 py-3 text-center">Availability</th>
                      <th className="px-5 py-3 text-center">To Consume</th>
                      <th className="px-5 py-3 text-center">Units</th>
                      <th className="px-5 py-3 text-center">Consumed</th>
                      <th className="px-5 py-3 text-center">Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {selectedOrder.items?.map((item, idx) => {
                      const onHand = item.product?.inventory?.onHandQty ?? 0;
                      const isAvailable = onHand >= item.toConsumeQty;
                      const availabilityText = isAvailable ? 'Available' : `Shortage (Have ${onHand})`;

                      return (
                        <tr key={item.id || idx} className="hover:bg-gray-50/50 transition">
                          <td className="px-5 py-3.5 font-medium text-gray-900">{item.product?.name || 'Unknown'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {availabilityText}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center text-gray-700 font-semibold">{item.toConsumeQty}</td>
                          <td className="px-5 py-3.5 text-center text-gray-400">pcs</td>
                          <td className="px-5 py-3.5 text-center text-gray-700 font-semibold">{item.consumedQty}</td>
                          <td className="px-5 py-3.5 text-center text-gray-400">pcs</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      <th className="px-5 py-3">Operations</th>
                      <th className="px-5 py-3">Work Center</th>
                      <th className="px-5 py-3 text-center">Duration (Mins)</th>
                      <th className="px-5 py-3 text-center">Real Duration</th>
                      <th className="px-5 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {selectedOrder.workOrders?.map((wo) => {
                      const canToggle = selectedOrder.status === 'confirmed' || selectedOrder.status === 'in_progress';
                      return (
                        <tr key={wo.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-5 py-3.5 font-medium text-gray-900">{wo.operationName}</td>
                          <td className="px-5 py-3.5 text-gray-700 font-medium">{wo.workCenterName}</td>
                          <td className="px-5 py-3.5 text-center text-gray-500 font-mono font-semibold">
                            {wo.plannedDuration.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-center text-gray-900 font-mono font-semibold">
                            {wo.realDuration === 0 ? '00:00' : `${Math.floor(wo.realDuration)}:00`}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {canToggle ? (
                              <button
                                onClick={() => handleToggleWorkOrder(wo.id)}
                                className={`px-3 py-1 rounded text-xs font-semibold border transition cursor-pointer ${
                                  wo.status === 'finished'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : wo.status === 'in_progress'
                                    ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {wo.status === 'finished' ? 'Finished' : wo.status === 'in_progress' ? 'Pause' : 'Start'}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 font-medium italic capitalize">{wo.status}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Logs Panel */}
        {showLogs && (
          <Card className="p-5 animate-fade-in space-y-3 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Document Logs / Audit Trail</h3>
              <Btn variant="ghost" size="sm" onClick={() => fetchOrderLogs(selectedOrder.id)} disabled={loadingLogs}>
                <RefreshCw size={12} className={loadingLogs ? 'animate-spin-slow' : ''} />
              </Btn>
            </div>
            {loadingLogs ? (
              <div className="flex justify-center py-6">
                <RefreshCw size={16} className="animate-spin-slow text-sky-500" />
              </div>
            ) : orderLogs.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2 text-center">No logs recorded for this document.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {orderLogs.map((log) => (
                  <div
                    key={log.id}
                    className="text-xs flex items-center justify-between bg-gray-50/50 p-2.5 rounded-lg border border-gray-100"
                  >
                    <div>
                      <span className="font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded mr-2 uppercase text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-gray-600">
                        {log.entityType} ID <span className="font-mono text-gray-400">{log.entityId}</span>
                      </span>
                    </div>
                    <span className="text-gray-400 text-[10px]">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Manufacturing Orders</h2>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={14} />
          </Btn>
          <Btn size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> New MO
          </Btn>
        </div>
      </div>

      {showForm && (
        <Card className="p-5 animate-fade-in">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Select
                label="Product"
                value={moProductId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMoProductId(e.target.value)}
                required
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Qty to Produce"
                type="number"
                min="1"
                placeholder="5"
                value={moQty}
                onChange={(e) => setMoQty(e.target.value)}
                required
              />
              <Input label="Schedule Date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
              <Select
                label="Assignee"
                value={assigneeId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssigneeId(e.target.value)}
              >
                <option value="">Select assignee...</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Btn
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setMoProductId('');
                  setMoQty('');
                  setScheduleDate('');
                  setAssigneeId('');
                }}
              >
                Cancel
              </Btn>
              <Btn type="submit" disabled={saving}>
                {saving ? <RefreshCw size={14} className="animate-spin-slow" /> : <Check size={14} />} Create Order
              </Btn>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={20} className="animate-spin-slow text-sky-500" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Factory size={20} />}
            title="No manufacturing orders"
            description="Create an MO for a product with a Bill of Materials."
          />
        </Card>
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
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-sky-50/30 transition">
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setSelectedOrder(o)}
                        className="font-mono text-xs text-sky-600 hover:text-sky-800 hover:underline font-semibold cursor-pointer"
                      >
                        {o.id}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{o.product?.name || o.productId.slice(0, 8) + '…'}</td>
                    <td className="px-5 py-3 text-gray-700">{o.quantity}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {o.status === 'draft' && (
                          <Btn
                            variant="secondary"
                            size="sm"
                            onClick={() => handleAction(o.id, 'confirm')}
                            disabled={acting === o.id}
                          >
                            Confirm
                          </Btn>
                        )}
                        {(o.status === 'draft' || o.status === 'confirmed') && (
                          <Btn
                            variant="secondary"
                            size="sm"
                            onClick={() => handleAction(o.id, 'start')}
                            disabled={acting === o.id}
                          >
                            <Play size={12} /> Start
                          </Btn>
                        )}
                        {o.status === 'in_progress' && (
                          <Btn size="sm" onClick={() => handleAction(o.id, 'complete')} disabled={acting === o.id}>
                            <CheckCircle2 size={12} /> Complete
                          </Btn>
                        )}
                        {(o.status === 'completed' || o.status === 'done') && (
                          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 size={12} /> Done
                          </span>
                        )}
                        {o.status === 'cancelled' && (
                          <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                            <X size={12} /> Cancelled
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
    </div>
  );
}

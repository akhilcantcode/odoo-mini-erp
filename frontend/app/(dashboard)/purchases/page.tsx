'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../store/authStore';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrder
} from '../../../features/purchase/services';
import { getProducts } from '../../../features/product/services';
import { getUsers, ManagedUser } from '../../../services/auth';
import { getAuditLogs } from '../../../features/audit/services';
import type { PurchaseOrder } from '../../../features/purchase/types';
import type { Product } from '../../../features/product/types';
import type { AuditLog } from '../../../features/audit/types';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState, StatusBadge } from '../../../components/ui';
import {
  ShoppingCart, RefreshCw, Plus, Check, X, ChevronRight, Truck, CheckCircle2
} from 'lucide-react';

export default function PurchasesPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendor, setVendor] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [responsiblePersonId, setResponsiblePersonId] = useState('');
  const [poProductId, setPoProductId] = useState('');
  const [poQty, setPoQty] = useState('');
  const [draftItems, setDraftItems] = useState<{ productId: string; name: string; quantity: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  // Detail view state
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [orderLogs, setOrderLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [poList, prodList, uList] = await Promise.all([
        getPurchaseOrders(),
        getProducts(),
        getUsers()
      ]);
      setOrders(poList);
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

  const handleAddDraftItem = () => {
    if (!poProductId || !poQty) return;
    const prod = products.find((p) => p.id === poProductId);
    if (!prod) return;

    const existingIndex = draftItems.findIndex((i) => i.productId === poProductId);
    if (existingIndex > -1) {
      setDraftItems((prev) => {
        const updated = [...prev];
        updated[existingIndex].quantity += parseInt(poQty);
        return updated;
      });
    } else {
      setDraftItems((prev) => [
        ...prev,
        { productId: poProductId, name: prod.name, quantity: parseInt(poQty) }
      ]);
    }
    setPoProductId('');
    setPoQty('');
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
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
        vendorAddress: vendorAddress || undefined,
        responsiblePersonId: responsiblePersonId || undefined,
        items: draftItems.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      });
      toast('Purchase Order created', 'success');
      setShowForm(false);
      setVendor('');
      setVendorAddress('');
      setResponsiblePersonId('');
      setDraftItems([]);
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error');
    }
    setSaving(false);
  };

  const handleAction = async (id: string, action: 'confirm' | 'receive') => {
    setActing(id);
    try {
      let updated: PurchaseOrder;
      if (action === 'confirm') {
        updated = await confirmPurchaseOrder(id);
        toast('Purchase Order confirmed', 'success');
      } else {
        updated = await receivePurchaseOrder(id);
        toast('Purchase Order received (done)', 'success');
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
      console.error('Failed to fetch PO logs', err);
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

  if (selectedOrder) {
    const totalAmount =
      selectedOrder.items?.reduce((sum, item) => {
        const price = item.product?.costPrice || 0;
        return sum + item.quantity * price;
      }, 0) || 0;

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
            {selectedOrder.status === 'confirmed' && (
              <Btn
                variant="primary"
                size="sm"
                onClick={() => handleAction(selectedOrder.id, 'receive')}
                disabled={acting === selectedOrder.id}
              >
                Received
              </Btn>
            )}
            {(selectedOrder.status === 'draft' || selectedOrder.status === 'confirmed') && (
              <Btn variant="danger" size="sm" disabled={true}>
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
                <span className="w-32 font-semibold text-gray-500">Vendor</span>
                <span className="text-gray-800 font-medium">{selectedOrder.vendorName}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 font-semibold text-gray-500">Vendor Address</span>
                <span className="text-gray-800">{selectedOrder.vendorAddress || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 font-semibold text-gray-500">Creation Date</span>
                <span className="text-gray-800">{new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 font-semibold text-gray-500">Responsible Person</span>
                <span className="text-gray-800 font-medium text-sky-700">
                  {selectedOrder.responsiblePerson?.name || 'Unassigned'}
                  {selectedOrder.responsiblePerson?.email && ` (${selectedOrder.responsiblePerson.email})`}
                </span>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="mt-8">
            <h3 className="text-sm font-bold text-gray-700 mb-3 block uppercase tracking-wider">Products</h3>
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3">Products</th>
                    <th className="px-5 py-3 text-center">Ordered Quantity</th>
                    <th className="px-5 py-3 text-center">Recieved Quantity</th>
                    <th className="px-5 py-3 text-center">Units</th>
                    <th className="px-5 py-3 text-right">Cost Unit Price</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {selectedOrder.items?.map((item, idx) => {
                    const price = item.product?.costPrice || 0;
                    const total = item.quantity * price;
                    const receivedQty = selectedOrder.status === 'received' ? item.quantity : 0;
                    return (
                      <tr key={item.id || idx} className="hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3.5 font-medium text-gray-900">
                          {item.product?.name || 'Unknown Product'}
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-600 font-semibold">{item.quantity}</td>
                        <td className="px-5 py-3.5 text-center text-gray-600 font-semibold">{receivedQty}</td>
                        <td className="px-5 py-3.5 text-center text-gray-400">pcs</td>
                        <td className="px-5 py-3.5 text-right text-gray-600 font-mono">${price.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-right text-gray-900 font-semibold font-mono">
                          ${total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Order Total */}
            <div className="flex justify-end mt-4">
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-4 py-2 text-sm font-semibold">
                <span className="text-gray-500">Total:</span>
                <span className="text-gray-900 text-base font-bold font-mono">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
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
        <h2 className="text-lg font-semibold text-gray-900">Purchase Orders</h2>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={14} />
          </Btn>
          <Btn size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> New PO
          </Btn>
        </div>
      </div>

      {showForm && (
        <Card className="p-5 animate-fade-in space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Vendor Name"
                placeholder="Supplier Inc."
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                required
              />
              <Input
                label="Vendor Address"
                placeholder="123 Supplier Rd, Suite A"
                value={vendorAddress}
                onChange={(e) => setVendorAddress(e.target.value)}
              />
              <Select
                label="Responsible Person"
                value={responsiblePersonId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setResponsiblePersonId(e.target.value)}
              >
                <option value="">Select responsible person…</option>
                {usersList
                  .sort((a, b) => {
                    const aIsPurchase = a.roles.includes('PURCHASE');
                    const bIsPurchase = b.roles.includes('PURCHASE');
                    if (aIsPurchase && !bIsPurchase) return -1;
                    if (!aIsPurchase && bIsPurchase) return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.roles.join(', ')})
                    </option>
                  ))}
              </Select>
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
                    {products.map((p) => (
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
                    onChange={(e) => setPoQty(e.target.value)}
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
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100 text-sm"
                    >
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
              <Btn
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setDraftItems([]);
                  setVendor('');
                  setVendorAddress('');
                  setResponsiblePersonId('');
                }}
              >
                Cancel
              </Btn>
              <Btn type="submit" disabled={saving || draftItems.length === 0}>
                {saving ? <RefreshCw size={14} className="animate-spin-slow" /> : <Check size={14} />} Create Purchase Order
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
            icon={<ShoppingCart size={20} />}
            title="No purchase orders"
            description="Create a PO to start the procurement cycle."
          />
        </Card>
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
                    <td className="px-5 py-3 text-gray-700">{o.vendorName}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-500">{o.items?.length || 0} item(s)</td>
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
                            <ChevronRight size={12} /> Confirm
                          </Btn>
                        )}
                        {o.status === 'confirmed' && (
                          <Btn size="sm" onClick={() => handleAction(o.id, 'receive')} disabled={acting === o.id}>
                            <Truck size={12} /> Receive
                          </Btn>
                        )}
                        {o.status === 'received' && (
                          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                            <CheckCircle2 size={12} /> Done
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

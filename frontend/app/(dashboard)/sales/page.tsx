'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../store/authStore';
import {
  getSalesOrders,
  createSalesOrder,
  confirmSalesOrder,
  deliverSalesOrder,
  checkSalesOrderProcurement
} from '../../../features/sales/services';
import { getProducts } from '../../../features/product/services';
import { getPurchaseOrders } from '../../../features/purchase/services';
import { getUsers, ManagedUser } from '../../../services/auth';
import { getAuditLogs } from '../../../features/audit/services';
import type { SalesOrder } from '../../../features/sales/types';
import type { Product } from '../../../features/product/types';
import type { AuditLog } from '../../../features/audit/types';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState, StatusBadge } from '../../../components/ui';
import {
  ShoppingCart, RefreshCw, Plus, Check, X, CheckCircle2,
  AlertCircle, ShoppingBag
} from 'lucide-react';

export default function SalesPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [customer, setCustomer] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [responsiblePersonId, setResponsiblePersonId] = useState('');

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

  // Detail view state
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [orderLogs, setOrderLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const { user } = useAuthStore();
  const canConfirm = user?.roles?.some((r) => r === 'SALES' || r === 'OWNER' || r === 'ADMIN');
  const canDeliver = user?.roles?.some((r) => r === 'INVENTORY' || r === 'OWNER' || r === 'ADMIN');

  const handleAction = async (id: string, action: 'confirm' | 'deliver') => {
    setActing(id);
    try {
      let updated: SalesOrder;
      if (action === 'confirm') {
        updated = await confirmSalesOrder(id);
        toast('Sales Order confirmed', 'success');
      } else {
        updated = await deliverSalesOrder(id);
        toast('Sales Order delivered (received)', 'success');
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
      toast(err instanceof Error ? err.message : `Failed to ${action} sales order`, 'error');
    }
    setActing(null);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [o, p, pos, u] = await Promise.all([
        getSalesOrders(),
        getProducts(),
        getPurchaseOrders(),
        getUsers()
      ]);
      setOrders(o);
      setProducts(p);
      setPurchaseOrders(pos);
      setUsersList(u);
    } catch {
      /* swallow */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAddDraftItem = () => {
    if (!selectedProductId || !quantity) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setDraftItems((prev) => [
      ...prev,
      { productId: selectedProductId, name: prod.name, quantity: parseFloat(quantity) }
    ]);
    setSelectedProductId('');
    setQuantity('');
  };

  const handleRemoveDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftItems.length === 0) {
      toast('Please add at least one item to the sales order', 'error');
      return;
    }
    setSaving(true);
    try {
      const itemsPayload = draftItems.map((item) => ({ productId: item.productId, quantity: item.quantity }));
      const checkResult = await checkSalesOrderProcurement({
        customerName: customer,
        items: itemsPayload
      });

      if (checkResult.available) {
        await createSalesOrder({
          customerName: customer,
          customerAddress: customerAddress || undefined,
          responsiblePersonId: responsiblePersonId || undefined,
          items: itemsPayload
        });
        toast('Order placed successfully', 'success');
        setShowForm(false);
        setCustomer('');
        setCustomerAddress('');
        setResponsiblePersonId('');
        setDraftItems([]);
        refresh();
      } else {
        setReplenishmentRequirements(
          checkResult.purchaseRequirements.map((req) => ({
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
      const itemsPayload = draftItems.map((item) => ({ productId: item.productId, quantity: item.quantity }));

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
        customerAddress: customerAddress || undefined,
        responsiblePersonId: responsiblePersonId || undefined,
        items: itemsPayload,
        procurement: {
          purchaseOrders: purchaseOrdersPayload,
        },
      });

      toast('Order and replenishment POs placed', 'success');
      setReplenishmentRequirements(null);
      setShowForm(false);
      setCustomer('');
      setCustomerAddress('');
      setResponsiblePersonId('');
      setDraftItems([]);
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to process replenishment', 'error');
    }
    setSaving(false);
  };

  const fetchOrderLogs = async (orderId: string) => {
    setLoadingLogs(true);
    try {
      const logs = await getAuditLogs({ entityId: orderId });
      setOrderLogs(logs);
    } catch (err) {
      console.error('Failed to fetch order logs', err);
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
        const price = item.product?.salesPrice || 0;
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
                onClick={() => handleAction(selectedOrder.id, 'deliver')}
                disabled={acting === selectedOrder.id}
              >
                Received (Deliver)
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
                <span className="w-32 font-semibold text-gray-500">Customer</span>
                <span className="text-gray-800 font-medium">{selectedOrder.customerName}</span>
              </div>
              <div className="flex border-b border-gray-100 pb-2">
                <span className="w-32 font-semibold text-gray-500">Customer Address</span>
                <span className="text-gray-800">{selectedOrder.customerAddress || 'N/A'}</span>
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
                    <th className="px-5 py-3 text-center">Delivered Quantity</th>
                    <th className="px-5 py-3 text-center">Units</th>
                    <th className="px-5 py-3 text-right">Unit Price</th>
                    <th className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {selectedOrder.items?.map((item, idx) => {
                    const price = item.product?.salesPrice || 0;
                    const total = item.quantity * price;
                    const deliveredQty = selectedOrder.status === 'delivered' ? item.quantity : 0;
                    return (
                      <tr key={item.id || idx} className="hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3.5 font-medium text-gray-900">
                          {item.product?.name || 'Unknown Product'}
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-600 font-semibold">{item.quantity}</td>
                        <td className="px-5 py-3.5 text-center text-gray-600 font-semibold">{deliveredQty}</td>
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
        <h2 className="text-lg font-semibold text-gray-900">Sales Orders</h2>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={14} />
          </Btn>
          <Btn size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> New Sales Order
          </Btn>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-5 animate-fade-in space-y-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Customer Name"
                placeholder="e.g. Grand Furniture Mart"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                required
              />
              <Input
                label="Customer Address (Vendor Address)"
                placeholder="e.g. 123 Business Rd, Suite 100"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
              <Select
                label="Responsible Person"
                value={responsiblePersonId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setResponsiblePersonId(e.target.value)}
              >
                <option value="">Select responsible person…</option>
                {usersList
                  .sort((a, b) => {
                    const aIsSales = a.roles.includes('SALES');
                    const bIsSales = b.roles.includes('SALES');
                    if (aIsSales && !bIsSales) return -1;
                    if (!aIsSales && bIsSales) return 1;
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
                    value={selectedProductId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => (
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
                    onChange={(e) => setQuantity(e.target.value)}
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
                  setCustomer('');
                  setCustomerAddress('');
                  setResponsiblePersonId('');
                }}
              >
                Cancel
              </Btn>
              <Btn type="submit" disabled={saving || draftItems.length === 0}>
                {saving ? <RefreshCw size={14} className="animate-spin-slow" /> : <Check size={14} />} Create Draft Order
              </Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={20} className="animate-spin-slow text-sky-500" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShoppingCart size={20} />}
            title="No sales orders"
            description="Create a sales order to get started."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Responsible Person</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3 text-right">Actions</th>
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
                    <td className="px-5 py-3 font-medium text-gray-800">{o.customerName}</td>
                    <td className="px-5 py-3 text-gray-600 text-xs font-medium">
                      {o.responsiblePerson?.name || 'Unassigned'}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
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
                        {o.status === 'draft' &&
                          (canConfirm ? (
                            <Btn
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAction(o.id, 'confirm')}
                              disabled={acting === o.id}
                            >
                              Confirm
                            </Btn>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Awaiting Confirmation</span>
                          ))}
                        {o.status === 'confirmed' &&
                          (canDeliver ? (
                            <Btn
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAction(o.id, 'deliver')}
                              disabled={acting === o.id}
                            >
                              Deliver
                            </Btn>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Awaiting Delivery</span>
                          ))}
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setReplenishmentRequirements(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg mx-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-sky-50/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-500" />
                <h3 className="font-semibold text-gray-900">Procurement Replenishment</h3>
              </div>
              <button
                onClick={() => setReplenishmentRequirements(null)}
                className="p-1 hover:bg-gray-200/50 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
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
                          onChange={(e) => {
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
                          onChange={(e) => {
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
                {Array.from(new Set(purchaseOrders.map((po) => po.vendorName).filter(Boolean))).map((vendor) => (
                  <option key={vendor} value={vendor} />
                ))}
              </datalist>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Btn variant="ghost" size="sm" onClick={() => setReplenishmentRequirements(null)}>
                  Cancel
                </Btn>
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

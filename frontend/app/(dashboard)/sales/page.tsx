'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../../store/authStore';
import {
  getSalesOrders,
  createSalesOrder,
  confirmSalesOrder,
  deliverSalesOrder,
  checkSalesOrderProcurement,
  deleteSalesOrder
} from '../../../features/sales/services';
import { getProducts } from '../../../features/product/services';
import { getPurchaseOrders } from '../../../features/purchase/services';
import { getUsers, ManagedUser } from '../../../services/auth';
import { getAuditLogs } from '../../../features/audit/services';
import type { SalesOrder } from '../../../features/sales/types';
import type { Product } from '../../../features/product/types';
import type { AuditLog } from '../../../features/audit/types';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState, StatusBadge, AccessDenied } from '../../../components/ui';
import {
  ShoppingCart, RefreshCw, Plus, Check, X, CheckCircle2, Trash2,
  AlertCircle, ShoppingBag, Search, Clock, TrendingUp, LayoutGrid, List
} from 'lucide-react';
import { hasFieldPermission, hasModuleViewPermission } from '../../../utils/permissions';


export default function SalesPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showSearchBar, setShowSearchBar] = useState(true);

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
  const [procurementSummary, setProcurementSummary] = useState<{
    orderId: string;
    mos: { id: string; productName: string; quantity: number }[];
    pos: { id: string; vendorName: string; itemsCount: number }[];
  } | null>(null);

  const { user, overrides } = useAuthStore();
  const canConfirm = hasFieldPermission(user?.roles, 'sales', 'Status', 'edit', overrides) || user?.roles?.some((r) => r === 'OWNER' || r === 'ADMIN');
  const canDeliver = user?.roles?.some((r) => r === 'INVENTORY' || r === 'INVENTORY_MANAGER' || r === 'OWNER' || r === 'ADMIN');
  const canCreate = hasFieldPermission(user?.roles, 'sales', 'Customer', 'create', overrides);
  const canDelete = user?.roles?.some((r) => r === 'OWNER' || r === 'ADMIN');

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

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sales order?')) return;
    try {
      await deleteSalesOrder(id);
      toast('Sales Order deleted successfully', 'success');
      setSelectedOrder(null);
      setShowLogs(false);
      setOrderLogs([]);
      refresh();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to delete sales order', 'error');
    }
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
        const result = await createSalesOrder({
          customerName: customer,
          customerAddress: customerAddress || undefined,
          responsiblePersonId: responsiblePersonId || undefined,
          items: itemsPayload
        });
        
        if (result.procuredMOs?.length > 0) {
          setProcurementSummary({
            orderId: result.order.id,
            mos: result.procuredMOs,
            pos: [],
          });
        } else {
          toast('Order placed successfully', 'success');
        }
        
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

      const result = await createSalesOrder({
        customerName: customer,
        customerAddress: customerAddress || undefined,
        responsiblePersonId: responsiblePersonId || undefined,
        items: itemsPayload,
        procurement: {
          purchaseOrders: purchaseOrdersPayload,
        },
      });

      if (result.procuredMOs?.length > 0 || result.procuredPOs?.length > 0) {
        setProcurementSummary({
          orderId: result.order.id,
          mos: result.procuredMOs,
          pos: result.procuredPOs,
        });
      } else {
        toast('Order and replenishment POs placed', 'success');
      }
      
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
      const logsRes = await getAuditLogs({ entityId: orderId });
      setOrderLogs(logsRes.data);
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
            {canDelete && (
              <Btn
                variant="danger"
                size="sm"
                onClick={() => handleDeleteOrder(selectedOrder.id)}
              >
                Delete
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
  const totalOrders = orders.length;
  const draftOrders = orders.filter((o) => o.status === 'draft').length;
  const confirmedOrders = orders.filter((o) => o.status === 'confirmed').length;
  const totalDeliveredRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => {
      const orderTotal = o.items?.reduce((s, item) => {
        const price = item.product?.salesPrice || 0;
        return s + item.quantity * price;
      }, 0) || 0;
      return sum + orderTotal;
    }, 0);

  const statCards = [
    {
      label: 'TOTAL SALES ORDERS',
      value: totalOrders,
      sub: 'All registered orders',
      icon: <ShoppingCart size={18} />,
      iconBg: 'bg-blue-50 text-blue-500',
      borderColor: 'border-blue-100',
    },
    {
      label: 'DRAFT ORDERS',
      value: draftOrders,
      sub: 'Awaiting confirmation',
      icon: <Clock size={18} />,
      iconBg: 'bg-amber-50 text-amber-500',
      borderColor: 'border-amber-100',
    },
    {
      label: 'CONFIRMED',
      value: confirmedOrders,
      sub: 'Ready for delivery',
      icon: <CheckCircle2 size={18} />,
      iconBg: 'bg-violet-50 text-violet-500',
      borderColor: 'border-violet-100',
    },
    {
      label: 'DELIVERED REVENUE',
      value: `$${totalDeliveredRevenue.toFixed(2)}`,
      sub: 'Completed sales value',
      icon: <TrendingUp size={18} />,
      iconBg: 'bg-emerald-50 text-emerald-500',
      borderColor: 'border-emerald-100',
    },
  ];

  // Search filter
  const filteredOrders = orders.filter((o) => {
    const query = searchQuery.toLowerCase();
    return (
      o.customerName.toLowerCase().includes(query) ||
      o.id.toLowerCase().includes(query) ||
      (o.responsiblePerson?.name || '').toLowerCase().includes(query) ||
      o.items?.some((item) => (item.product?.name || '').toLowerCase().includes(query))
    );
  });

  const renderSalesKanbanCard = (o: SalesOrder) => {
    const initials = getInitials(o.customerName);
    const avatarColor = getAvatarColor(o.customerName);
    const totalAmount = o.items?.reduce((sum, item) => {
      const price = item.product?.salesPrice || 0;
      return sum + item.quantity * price;
    }, 0) || 0;

    return (
      <div
        key={o.id}
        className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200 flex flex-col justify-between min-h-[220px] cursor-pointer group"
        onClick={() => setSelectedOrder(o)}
      >
        <div className="space-y-3">
          <div className="flex justify-between items-start gap-2">
            <span className="font-mono text-xs font-bold text-sky-600 group-hover:underline">
              {o.id.slice(0, 13)}...
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-mono">
                {new Date(o.createdAt).toLocaleDateString()}
              </span>
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOrder(o.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded transition cursor-pointer"
                  title="Delete Sales Order"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${avatarColor} flex-shrink-0`}>
              {initials}
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm block leading-tight">
                {o.customerName}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                Responsible: {o.responsiblePerson?.name || 'Unassigned'}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1 mt-2 border-t border-gray-100 pt-3">
            {o.items?.map((item, idx) => (
              <div key={item.id || idx} className="truncate">
                • {item.product?.name} (×{item.quantity})
              </div>
            )) || 'No items'}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="text-sm font-bold font-mono text-gray-900">${totalAmount.toFixed(2)}</span>
            <StatusBadge status={o.status} />
          </div>

          {/* Quick Actions */}
          {o.status === 'draft' && canConfirm && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(o.id, 'confirm');
              }}
              disabled={acting === o.id}
              className="w-full py-2 text-center bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 font-bold rounded-lg text-xs transition"
            >
              Confirm Order
            </button>
          )}
          {o.status === 'confirmed' && canDeliver && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(o.id, 'deliver');
              }}
              disabled={acting === o.id}
              className="w-full py-2 text-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-bold rounded-lg text-xs transition"
            >
              Deliver Items
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!hasModuleViewPermission(user?.roles, 'sales', overrides)) {
    return <AccessDenied module="Sales Orders" />;
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100">
            <ShoppingCart size={22} className="text-sky-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Sales Orders</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage customer orders, MTO flows, and shipment delivery.</p>
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
          {canCreate && (
            <Btn size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus size={14} /> New Sales Order
            </Btn>
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

      {/* ── Search Row (Collapsible) ── */}
      {showSearchBar && (
        <div className="flex items-center justify-between animate-fade-in bg-gray-50/50 p-3 rounded-xl border border-gray-100">
          <div className="relative w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reference or contacts..."
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
            Synced just now · {filteredOrders.length} of {orders.length} orders
          </div>
        </div>
      )}

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
                disabled={!hasFieldPermission(user?.roles, 'sales', 'Customer', 'create', overrides)}
              />
              <Input
                label="Customer Address (Vendor Address)"
                placeholder="e.g. 123 Business Rd, Suite 100"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                disabled={!hasFieldPermission(user?.roles, 'sales', 'Customer Address', 'create', overrides)}
              />
              <Select
                label="Responsible Person"
                value={responsiblePersonId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setResponsiblePersonId(e.target.value)}
                disabled={!hasFieldPermission(user?.roles, 'sales', 'Sales Person', 'create', overrides)}
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
                    disabled={!hasFieldPermission(user?.roles, 'sales', 'Product', 'create', overrides)}
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
                    disabled={!hasFieldPermission(user?.roles, 'sales', 'Ordered Quantity', 'create', overrides)}
                  />
                </div>
                <Btn type="button" variant="secondary" onClick={handleAddDraftItem} disabled={!hasFieldPermission(user?.roles, 'sales', 'Product', 'create', overrides)}>
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
      ) : filteredOrders.length === 0 && orders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShoppingCart size={20} />}
            title="No sales orders"
            description="Create a sales order to get started."
          />
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search size={20} />}
            title="No results found"
            description={`No sales orders match "${searchQuery}"`}
          />
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50/80 to-gray-50/40 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Responsible Person</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((o) => {
                  const initials = getInitials(o.customerName);
                  const avatarColor = getAvatarColor(o.customerName);
                  return (
                    <tr key={o.id} className="hover:bg-sky-50/30 transition-colors duration-150 group">
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="font-mono text-xs text-sky-600 hover:text-sky-800 hover:underline font-bold cursor-pointer"
                        >
                          {o.id.slice(0, 13)}...
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${avatarColor} transition-transform duration-200 group-hover:scale-105 flex-shrink-0`}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">{o.customerName}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              Created {new Date(o.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-gray-600 font-medium text-xs">
                          {o.responsiblePerson?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        <div className="flex flex-col gap-0.5">
                          {o.items?.map((item, idx) => (
                            <span key={item.id || idx} className="text-xs text-gray-500">
                              • {item.product?.name || 'Unknown Product'} (×{item.quantity})
                            </span>
                          )) || 'No items'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
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
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrder(o.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded transition cursor-pointer ml-1"
                              title="Delete Sales Order"
                            >
                              <Trash2 size={14} />
                            </button>
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
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in w-full">
          {filteredOrders.map((o) => renderSalesKanbanCard(o))}
        </div>
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

      {/* Procurement Summary Modal */}
      {procurementSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setProcurementSummary(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-lg mx-4 overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-50 bg-gradient-to-r from-emerald-50/50 to-sky-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Order & Procurement Placed</h3>
                  <p className="text-xs text-gray-400 font-medium">Successfully processed items and documents</p>
                </div>
              </div>
              <button
                onClick={() => setProcurementSummary(null)}
                className="p-1.5 hover:bg-gray-200/50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <p className="text-xs text-gray-500 font-medium">
                The procurement engine automatically ran the check and created the following documents:
              </p>

              <div className="space-y-4">
                {/* Sales Order Item */}
                <div className="flex gap-4 items-start p-4 bg-sky-50/40 rounded-2xl border border-sky-100/50">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600 mt-0.5">
                    <ShoppingCart size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-gray-900">Sales Order Created</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-100/50 px-2 py-0.5 rounded-full">
                        {procurementSummary.orderId}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">Draft Sales Order created successfully.</p>
                  </div>
                </div>

                {/* Manufacturing Orders (MOs) */}
                {procurementSummary.mos && procurementSummary.mos.length > 0 && (
                  <div className="flex gap-4 items-start p-4 bg-amber-50/30 rounded-2xl border border-amber-100/50">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 mt-0.5">
                      <RefreshCw size={16} className="animate-spin-slow" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-semibold text-gray-900">Auto-Created Manufacturing Orders</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5 mb-2">
                        Shortage of manufactured goods triggered MOs:
                      </p>
                      <div className="space-y-1.5">
                        {procurementSummary.mos.map((mo) => (
                          <div key={mo.id} className="flex justify-between items-center text-[11px] bg-white border border-amber-100/40 px-2.5 py-1 rounded-lg">
                            <span className="font-semibold text-gray-700">{mo.id} ({mo.productName})</span>
                            <span className="text-gray-400">Qty: {mo.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Purchase Orders (POs) */}
                {procurementSummary.pos && procurementSummary.pos.length > 0 && (
                  <div className="flex gap-4 items-start p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5">
                      <ShoppingBag size={16} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-semibold text-gray-900">Created Purchase Orders</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5 mb-2">
                        Replenishment orders created for materials:
                      </p>
                      <div className="space-y-1.5">
                        {procurementSummary.pos.map((po) => (
                          <div key={po.id} className="flex justify-between items-center text-[11px] bg-white border border-emerald-100/40 px-2.5 py-1 rounded-lg">
                            <span className="font-semibold text-gray-700">{po.id} ({po.vendorName})</span>
                            <span className="text-gray-400">{po.itemsCount} items</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-50">
                <Btn size="sm" onClick={() => setProcurementSummary(null)}>
                  Got it
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

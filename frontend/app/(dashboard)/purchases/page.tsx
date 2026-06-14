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
  ShoppingCart, RefreshCw, Plus, Check, X, ChevronRight, Truck, CheckCircle2, Search, Clock, TrendingDown, ShoppingBag, LayoutGrid, List
} from 'lucide-react';

export default function PurchasesPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [vendor, setVendor] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [responsiblePersonId, setResponsiblePersonId] = useState('');
  const [poProductId, setPoProductId] = useState('');
  const [poQty, setPoQty] = useState('');
  const [draftItems, setDraftItems] = useState<{ productId: string; name: string; quantity: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      const logsRes = await getAuditLogs({ entityId: orderId });
      setOrderLogs(logsRes.data);
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
  const totalReceivedSpend = orders
    .filter((o) => o.status === 'received')
    .reduce((sum, o) => {
      const orderTotal = o.items?.reduce((s, item) => {
        const price = item.product?.costPrice || 0;
        return s + item.quantity * price;
      }, 0) || 0;
      return sum + orderTotal;
    }, 0);

  const statCards = [
    {
      label: 'TOTAL PURCHASE ORDERS',
      value: totalOrders,
      sub: 'All procurement cycles',
      icon: <ShoppingBag size={18} />,
      iconBg: 'bg-blue-50 text-blue-500',
      borderColor: 'border-blue-100',
    },
    {
      label: 'DRAFT POs',
      value: draftOrders,
      sub: 'Awaiting supplier check',
      icon: <Clock size={18} />,
      iconBg: 'bg-amber-50 text-amber-500',
      borderColor: 'border-amber-100',
    },
    {
      label: 'CONFIRMED POs',
      value: confirmedOrders,
      sub: 'Pending shipment arrival',
      icon: <Truck size={18} />,
      iconBg: 'bg-violet-50 text-violet-500',
      borderColor: 'border-violet-100',
    },
    {
      label: 'RECEIVED SPEND',
      value: `$${totalReceivedSpend.toFixed(2)}`,
      sub: 'Done procurement value',
      icon: <TrendingDown size={18} />,
      iconBg: 'bg-rose-50 text-rose-500',
      borderColor: 'border-rose-100',
    },
  ];

  // Search filter
  const filteredOrders = orders.filter((o) => {
    const query = searchQuery.toLowerCase();
    return (
      o.vendorName.toLowerCase().includes(query) ||
      o.id.toLowerCase().includes(query) ||
      (o.responsiblePerson?.name || '').toLowerCase().includes(query) ||
      o.items?.some((item) => (item.product?.name || '').toLowerCase().includes(query))
    );
  });

  const renderPurchaseKanbanCard = (o: PurchaseOrder) => {
    const initials = getInitials(o.vendorName);
    const avatarColor = getAvatarColor(o.vendorName);
    const totalAmount = o.items?.reduce((sum, item) => {
      const price = item.product?.costPrice || 0;
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
            <span className="text-xs text-gray-400 font-mono">
              {new Date(o.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${avatarColor} flex-shrink-0`}>
              {initials}
            </div>
            <div>
              <span className="font-bold text-gray-900 text-sm block leading-tight">
                {o.vendorName}
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
          {o.status === 'draft' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(o.id, 'confirm');
              }}
              disabled={acting === o.id}
              className="w-full py-2 text-center bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 font-bold rounded-lg text-xs transition"
            >
              Confirm PO
            </button>
          )}
          {o.status === 'confirmed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(o.id, 'receive');
              }}
              disabled={acting === o.id}
              className="w-full py-2 text-center bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-bold rounded-lg text-xs transition"
            >
              Receive Items
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100">
            <ShoppingBag size={22} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Purchase Orders</h2>
            <p className="text-xs text-gray-400 mt-0.5">Manage vendor replenishments, PO status, and stock intake.</p>
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
          <Btn size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> New PO
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

      {/* ── Search Row (Collapsible) ── */}
      {showSearchBar && (
        <div className="flex items-center justify-between animate-fade-in bg-gray-50/50 p-3 rounded-xl border border-gray-100">
          <div className="relative w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor, PO ID, or products..."
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
      ) : filteredOrders.length === 0 && orders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShoppingCart size={20} />}
            title="No purchase orders"
            description="Create a PO to start the procurement cycle."
          />
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search size={20} />}
            title="No results found"
            description={`No purchase orders match "${searchQuery}"`}
          />
        </Card>
      ) : viewMode === 'list' ? (
        /* List View */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50/80 to-gray-50/40 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3.5">PO Number</th>
                  <th className="px-5 py-3.5">Vendor</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Items</th>
                  <th className="px-5 py-3.5 font-semibold">Created</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((o) => {
                  const initials = getInitials(o.vendorName);
                  const avatarColor = getAvatarColor(o.vendorName);
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
                            <p className="font-semibold text-gray-900 leading-tight">{o.vendorName}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              Created {new Date(o.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
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
                          )) || '0 items'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs tabular-nums">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1 justify-end">
                          {o.status === 'draft' && (
                            <Btn
                              variant="secondary"
                              size="sm"
                              onClick={() => handleAction(o.id, 'confirm')}
                              disabled={acting === o.id}
                            >
                              <ChevronRight size={12} className="inline mr-0.5" /> Confirm
                            </Btn>
                          )}
                          {o.status === 'confirmed' && (
                            <Btn size="sm" onClick={() => handleAction(o.id, 'receive')} disabled={acting === o.id}>
                              <Truck size={12} className="inline mr-0.5" /> Receive
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in w-full">
          {filteredOrders.map((o) => renderPurchaseKanbanCard(o))}
        </div>
      )}
    </div>
  );
}

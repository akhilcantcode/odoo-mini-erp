'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Activity, 
  Package, 
  ShoppingCart, 
  Truck, 
  Cpu, 
  Database, 
  Layers, 
  FileText, 
  RefreshCw, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Search, 
  TrendingUp, 
  Settings, 
  Users, 
  Play, 
  Check, 
  Info, 
  ExternalLink,
  ChevronRight,
  ArrowRight,
  DollarSign,
  Briefcase,
  X,
  PlusCircle,
  HelpCircle,
  Award,
  Zap,
  ShieldCheck
} from 'lucide-react';

// Service imports
import { getProducts } from '../features/product/services';
import { getInventory } from '../features/inventory/services';
import { getSalesOrders } from '../features/sales/services';
import { getManufacturingOrders } from '../features/manufacturing/services';
import { getPurchaseOrders } from '../features/purchase/services';
import { getDashboardStats } from '../features/dashboard/services';
import { getAuditLogs } from '../features/audit/services';
import { fetchApi } from '../services/api';
import { mockDb } from '../services/mockDb';

export default function Home() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'purchases' | 'manufacturing' | 'inventory' | 'audit' | 'faq'>('dashboard');
  
  // Modals state
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isNewSalesOpen, setIsNewSalesOpen] = useState(false);
  const [isNewMoOpen, setIsNewMoOpen] = useState(false);
  const [isNewPoOpen, setIsNewPoOpen] = useState(false);
  
  // Toast notifications state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({ name: '', sku: '', salesPrice: '', costPrice: '', procurementType: 'purchase' as 'purchase' | 'manufacture', procureOnDemand: false });
  const [salesForm, setSalesForm] = useState({ customerName: '', productId: '', quantity: 1 });
  const [moForm, setMoForm] = useState({ productId: '', quantity: 1 });
  const [poForm, setPoForm] = useState({ vendorName: '', productId: '', quantity: 10 });
  
  // Pricing billing cycle toggle (monthly vs annual)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // Trigger toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Queries using standard feature services (intercepted by api.ts mock Db)
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: getDashboardStats });
  const { data: products, isLoading: productsLoading } = useQuery({ queryKey: ['products'], queryFn: getProducts });
  const { data: inventory, isLoading: inventoryLoading } = useQuery({ queryKey: ['inventory'], queryFn: getInventory });
  const { data: salesOrders, isLoading: salesLoading } = useQuery({ queryKey: ['sales'], queryFn: getSalesOrders });
  const { data: manufacturingOrders, isLoading: moLoading } = useQuery({ queryKey: ['manufacturing'], queryFn: getManufacturingOrders });
  const { data: purchaseOrders, isLoading: purchaseLoading } = useQuery({ queryKey: ['purchases'], queryFn: getPurchaseOrders });
  const { data: auditLogs, isLoading: auditLoading } = useQuery({ queryKey: ['audit'], queryFn: getAuditLogs });

  // Invalidate all query helpers
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['manufacturing'] });
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
    queryClient.invalidateQueries({ queryKey: ['audit'] });
  };

  // MUTATIONS (interact with api.ts routes via fetchApi)
  
  // Create Product
  const createProductMutation = useMutation({
    mutationFn: (data: typeof productForm) => fetchApi('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        sku: data.sku,
        salesPrice: data.salesPrice ? parseFloat(data.salesPrice) : null,
        costPrice: data.costPrice ? parseFloat(data.costPrice) : null,
        procurementType: data.procurementType,
        procureOnDemand: data.procureOnDemand
      })
    }),
    onSuccess: (res) => {
      invalidateAll();
      showToast(`Product ${res.sku} created successfully!`, 'success');
      setIsNewProductOpen(false);
      setProductForm({ name: '', sku: '', salesPrice: '', costPrice: '', procurementType: 'purchase', procureOnDemand: false });
    },
    onError: (err: any) => showToast(err.message || 'Failed to create product', 'error')
  });

  // Create Sales Order
  const createSalesOrderMutation = useMutation({
    mutationFn: (data: typeof salesForm) => fetchApi('/sales', {
      method: 'POST',
      body: JSON.stringify({
        customerName: data.customerName,
        items: [{ productId: data.productId, quantity: Number(data.quantity) }]
      })
    }),
    onSuccess: (res) => {
      invalidateAll();
      showToast(`Draft Sales Order created!`, 'success');
      setIsNewSalesOpen(false);
      setSalesForm({ customerName: '', productId: '', quantity: 1 });
    },
    onError: (err: any) => showToast(err.message || 'Failed to create sales order', 'error')
  });

  // Confirm Sales Order
  const confirmSalesOrderMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/sales/${id}/confirm`, { method: 'POST' }),
    onSuccess: () => {
      invalidateAll();
      showToast('Sales order confirmed! Stock reserved.', 'success');
    },
    onError: (err: any) => showToast(err.message || 'Failed to confirm sales order', 'error')
  });

  // Ship Sales Order
  const shipSalesOrderMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/sales/${id}/deliver`, { method: 'POST' }),
    onSuccess: () => {
      invalidateAll();
      showToast('Sales order delivered! Inventory deducted & ledger updated.', 'success');
    },
    onError: (err: any) => showToast(err.message || 'Failed to ship sales order', 'error')
  });

  // Run Procurement (MTO)
  const runProcurementMutation = useMutation({
    mutationFn: () => fetchApi('/procurement/run', { method: 'POST' }),
    onSuccess: (res: any) => {
      invalidateAll();
      showToast(`Procurement Run Complete! Generated ${res.purchaseOrdersCreated} POs and ${res.manufacturingOrdersCreated} MOs to cover shortages.`, 'info');
    },
    onError: (err: any) => showToast(err.message || 'Failed to run procurement', 'error')
  });

  // Create Purchase Order
  const createPOMutation = useMutation({
    mutationFn: (data: typeof poForm) => fetchApi('/purchase', {
      method: 'POST',
      body: JSON.stringify({
        vendorName: data.vendorName,
        items: [{ productId: data.productId, quantity: Number(data.quantity) }]
      })
    }),
    onSuccess: () => {
      invalidateAll();
      showToast('Purchase Order generated & confirmed!', 'success');
      setIsNewPoOpen(false);
      setPoForm({ vendorName: '', productId: '', quantity: 10 });
    },
    onError: (err: any) => showToast(err.message || 'Failed to generate PO', 'error')
  });

  // Receive Purchase Order
  const receivePOMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/purchase/${id}/receive`, { method: 'POST' }),
    onSuccess: () => {
      invalidateAll();
      showToast('Supplier shipment received! Stock updated.', 'success');
    },
    onError: (err: any) => showToast(err.message || 'Failed to receive goods', 'error')
  });

  // Create Manufacturing Order
  const createMOMutation = useMutation({
    mutationFn: (data: typeof moForm) => fetchApi('/manufacturing', {
      method: 'POST',
      body: JSON.stringify({
        productId: data.productId,
        quantity: Number(data.quantity)
      })
    }),
    onSuccess: () => {
      invalidateAll();
      showToast('Manufacturing Order created in Draft!', 'success');
      setIsNewMoOpen(false);
      setMoForm({ productId: '', quantity: 1 });
    },
    onError: (err: any) => showToast(err.message || 'Failed to create MO', 'error')
  });

  // Start MO (Consumes raw components)
  const startMOMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/manufacturing/${id}/start`, { method: 'POST' }),
    onSuccess: () => {
      invalidateAll();
      showToast('Manufacturing started! Raw materials consumed from stock.', 'success');
    },
    onError: (err: any) => showToast(err.message || 'Material shortage: check components on hand!', 'error')
  });

  // Complete MO (Adds finished goods)
  const completeMOMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/manufacturing/${id}/complete`, { method: 'POST' }),
    onSuccess: () => {
      invalidateAll();
      showToast('Manufacturing completed! Finished goods added to stock.', 'success');
    },
    onError: (err: any) => showToast(err.message || 'Failed to complete production', 'error')
  });

  // Reset Mock Database
  const handleResetDb = () => {
    mockDb.resetDb();
    invalidateAll();
    showToast('Sandbox Database reset to defaults!', 'info');
  };

  // Check if any inventory item has a reservation shortfall (reserved > onHand)
  const hasInventoryShortfall = useMemo(() => {
    if (!inventory) return false;
    return inventory.some(item => item.available < 0);
  }, [inventory]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      
      {/* Dynamic Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : toast.type === 'error' 
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' 
              : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
        }`}>
          {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5" />}
          {toast.type === 'info' && <Info className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full glass-panel shadow-sm border-b transition-all">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 animate-pulse-slow">
              O
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-950 to-slate-800 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                OdooMini
              </span>
              <span className="text-xs block font-bold text-blue-500 tracking-widest uppercase">
                ERP Core
              </span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Features</a>
            <a href="#sandbox" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Interactive Sandbox</a>
            <a href="#pricing" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">FAQ</a>
          </nav>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleResetDb} 
              className="px-3.5 py-1.5 rounded-lg border text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white dark:border-slate-800 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Demo
            </button>
            <a 
              href="#sandbox" 
              className="hidden sm:inline-flex px-4.5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold shadow-md shadow-blue-500/10 transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              Launch Sandbox
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow"></div>
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-indigo-500/10 dark:bg-indigo-600/5 rounded-full blur-[90px] pointer-events-none animate-pulse-slow"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/30 mb-8 animate-float">
            <Zap className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span className="text-xs font-bold tracking-wide text-blue-600 dark:text-blue-400 uppercase">Live ERP Interactive Console Sandbox Mode Available</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-black tracking-tight leading-[1.08] max-w-4xl mx-auto mb-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Manufacturing &amp; Inventory. <br />
            <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">Demand to Delivery</span>, Simulated.
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            A production-grade, inventory-first mini ERP system. Log every event, reserve inventory, automate components procurement, and run bill-of-materials checklists. Try it live inside the sandbox below.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4.5 mb-16">
            <a 
              href="#sandbox" 
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Try Interactive Sandbox
            </a>
            <a 
              href="#features" 
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700 bg-white/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 font-semibold transition-all hover:bg-slate-100 dark:hover:bg-slate-900 flex items-center justify-center gap-2 cursor-pointer"
            >
              Explore Features
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
          
          {/* Logo cloud */}
          <div className="border-t border-b border-slate-200/50 dark:border-slate-800/40 py-8 max-w-5xl mx-auto">
            <p className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-5">Trusted by Modern furniture manufacturing companies</p>
            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-65 grayscale hover:grayscale-0 transition-all">
              <span className="font-bold text-lg text-slate-500 dark:text-slate-400 tracking-tight flex items-center gap-1.5"><Briefcase className="w-5 h-5 text-blue-500" /> TIMBERLAND</span>
              <span className="font-bold text-lg text-slate-500 dark:text-slate-400 tracking-tight flex items-center gap-1.5"><Award className="w-5 h-5 text-indigo-500" /> ACME DESIGN</span>
              <span className="font-bold text-lg text-slate-500 dark:text-slate-400 tracking-tight flex items-center gap-1.5"><Activity className="w-5 h-5 text-cyan-500" /> GLOBEX INC</span>
              <span className="font-bold text-lg text-slate-500 dark:text-slate-400 tracking-tight flex items-center gap-1.5"><Layers className="w-5 h-5 text-purple-500" /> ARIA CREATIVE</span>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE SANDBOX SECTION */}
      <section id="sandbox" className="py-16 md:py-24 bg-slate-100/50 dark:bg-slate-900/20 border-t border-b border-slate-200/40 dark:border-slate-900/80 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 bg-gradient-to-b from-slate-950 to-slate-800 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
              Live Interactive ERP Sandbox
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Create orders, manage inventory items, start manufacturing lines, and review the ledger logs. This console is fully simulated in the client using Next.js, state caches, and localStorage.
            </p>
          </div>

          {/* ERP Mockup Browser Frame */}
          <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-950 overflow-hidden flex flex-col min-h-[640px] transition-all">
            
            {/* Browser Header Bar */}
            <div className="h-12 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-4 flex items-center justify-between">
              {/* Window Buttons */}
              <div className="flex items-center gap-2 w-1/4">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500/80 block cursor-pointer" onClick={handleResetDb} title="Reset Sandbox"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500/80 block"></span>
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/80 block"></span>
              </div>
              
              {/* URL Address Bar */}
              <div className="w-1/2 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg h-7 px-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/30">
                <span className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-slate-400 select-none">https://</span>
                  app.odoocraft.io/{activeTab}
                </span>
                <button onClick={invalidateAll} className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors" title="Force Refetch">
                  <RefreshCw className="w-3 h-3 animate-spin-hover" />
                </button>
              </div>
              
              {/* Reset database pill */}
              <div className="w-1/4 flex justify-end">
                <button 
                  onClick={handleResetDb}
                  className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  Reset Database
                </button>
              </div>
            </div>

            {/* ERP Application Layout */}
            <div className="flex-1 flex flex-col md:flex-row">
              
              {/* Mockup Sidebar */}
              <aside className="w-full md:w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-6 px-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                      O
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Odoo Mini</span>
                      <span className="text-[10px] block text-slate-400 dark:text-slate-500 font-semibold tracking-wide">SANDBOX WORKSPACE</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button 
                      onClick={() => setActiveTab('dashboard')} 
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        activeTab === 'dashboard' 
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Activity className="w-4.5 h-4.5" />
                      Dashboard Stats
                    </button>

                    <button 
                      onClick={() => setActiveTab('inventory')} 
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        activeTab === 'inventory' 
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Package className="w-4.5 h-4.5" />
                      Inventory Levels
                      {hasInventoryShortfall && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 ml-auto animate-pulse" title="Shortfalls Detected!"></span>
                      )}
                    </button>

                    <button 
                      onClick={() => setActiveTab('sales')} 
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        activeTab === 'sales' 
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <ShoppingCart className="w-4.5 h-4.5" />
                      Sales Orders
                    </button>

                    <button 
                      onClick={() => setActiveTab('manufacturing')} 
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        activeTab === 'manufacturing' 
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Cpu className="w-4.5 h-4.5" />
                      Manufacturing
                    </button>

                    <button 
                      onClick={() => setActiveTab('purchases')} 
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        activeTab === 'purchases' 
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Truck className="w-4.5 h-4.5" />
                      Purchase Orders
                    </button>

                    <button 
                      onClick={() => setActiveTab('audit')} 
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        activeTab === 'audit' 
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <FileText className="w-4.5 h-4.5" />
                      Audit Trail
                    </button>
                    
                    <button 
                      onClick={() => setActiveTab('faq')} 
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        activeTab === 'faq' 
                          ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <HelpCircle className="w-4.5 h-4.5" />
                      Workspace Help
                    </button>
                  </div>
                </div>

                {/* Sidebar Bottom */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800/60 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                    AD
                  </div>
                  <div className="overflow-hidden truncate w-full">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Admin Account</span>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate">manufacturing@odoomini.io</span>
                  </div>
                </div>
              </aside>

              {/* Mockup Main Panel */}
              <main className="flex-1 p-6 overflow-y-auto max-h-[580px] bg-white dark:bg-slate-950">
                
                {/* 1. DASHBOARD TAB */}
                {activeTab === 'dashboard' && (
                  <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">Enterprise Overview</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Furniture Production, Inventory Reservations, &amp; Orders Sales Stats</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { invalidateAll(); showToast('Overview metrics re-calculated.', 'info'); }}
                          className="p-1.5 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                          title="Refresh Stats"
                        >
                          <RefreshCw className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    {statsLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 animate-pulse">
                        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                        <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-3 opacity-10 text-blue-500 group-hover:scale-110 transition-transform">
                            <DollarSign className="w-16 h-16" />
                          </div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Total Sales Revenue</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-slate-800 dark:text-white">${stats?.salesTotal?.toLocaleString()}</span>
                            <span className="text-[10px] text-emerald-500 font-bold tracking-wider flex items-center bg-emerald-500/10 px-1 py-0.5 rounded">↑ 12.4%</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2">Calculated from delivered Sales Orders only</p>
                        </div>

                        <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-3 opacity-10 text-indigo-500 group-hover:scale-110 transition-transform">
                            <Package className="w-16 h-16" />
                          </div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Inventory Valuation</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-slate-800 dark:text-white">${stats?.inventoryValue?.toLocaleString()}</span>
                            <span className="text-[10px] text-indigo-500 font-bold tracking-wider flex items-center bg-indigo-500/10 px-1 py-0.5 rounded">Ledger Log</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2">Valued at product costPrice of on-hand qty</p>
                        </div>

                        <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-3 opacity-10 text-amber-500 group-hover:scale-110 transition-transform">
                            <Cpu className="w-16 h-16" />
                          </div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Active Mfg Orders</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-slate-800 dark:text-white">{stats?.manufacturingActiveCount} MOs</span>
                            {stats?.manufacturingActiveCount && stats.manufacturingActiveCount > 0 ? (
                              <span className="text-[10px] text-amber-500 font-bold tracking-wider flex items-center bg-amber-500/10 px-1 py-0.5 rounded animate-pulse">Running</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold tracking-wider flex items-center bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">Idle</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2">Active production routes (Draft &amp; In-Progress)</p>
                        </div>
                      </div>
                    )}

                    {/* Chart & Activity Rows */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* SVG Bar Chart */}
                      <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 lg:col-span-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Stock Value vs Target Cap</span>
                        <div className="h-44 w-full flex items-end justify-between px-4 pb-2 border-b border-slate-200 dark:border-slate-800 relative">
                          {/* Grid Lines */}
                          <div className="absolute left-0 right-0 top-1/4 border-t border-slate-100 dark:border-slate-900 border-dashed"></div>
                          <div className="absolute left-0 right-0 top-2/4 border-t border-slate-100 dark:border-slate-900 border-dashed"></div>
                          <div className="absolute left-0 right-0 top-3/4 border-t border-slate-100 dark:border-slate-900 border-dashed"></div>

                          {/* Bars */}
                          <div className="flex flex-col items-center gap-2 w-12 z-10">
                            <div className="w-full bg-blue-500/80 rounded-t-md transition-all hover:bg-blue-600" style={{ height: '70px' }}></div>
                            <span className="text-[9px] text-slate-400 font-bold">Wood</span>
                          </div>
                          <div className="flex flex-col items-center gap-2 w-12 z-10">
                            <div className="w-full bg-indigo-500/80 rounded-t-md transition-all hover:bg-indigo-600" style={{ height: '110px' }}></div>
                            <span className="text-[9px] text-slate-400 font-bold">Screws</span>
                          </div>
                          <div className="flex flex-col items-center gap-2 w-12 z-10">
                            <div className="w-full bg-purple-500/80 rounded-t-md transition-all hover:bg-purple-600" style={{ height: '45px' }}></div>
                            <span className="text-[9px] text-slate-400 font-bold">Fabric</span>
                          </div>
                          <div className="flex flex-col items-center gap-2 w-12 z-10">
                            <div className="w-full bg-emerald-500/80 rounded-t-md transition-all hover:bg-emerald-600" style={{ height: '90px' }}></div>
                            <span className="text-[9px] text-slate-400 font-bold">Chairs</span>
                          </div>
                          <div className="flex flex-col items-center gap-2 w-12 z-10">
                            <div className="w-full bg-amber-500/80 rounded-t-md transition-all hover:bg-amber-600" style={{ height: '35px' }}></div>
                            <span className="text-[9px] text-slate-400 font-bold">Desks</span>
                          </div>
                        </div>
                      </div>

                      {/* Small activity list */}
                      <div className="p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-4">Recent Audit Actions</span>
                        <div className="space-y-3.5 flex-1 overflow-y-auto max-h-44 pr-1">
                          {auditLogs?.slice(0, 4).map((log: any) => (
                            <div key={log.id} className="flex gap-3 text-xs border-b border-slate-100 dark:border-slate-900 pb-2.5 last:border-0 last:pb-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 block shrink-0"></span>
                              <div className="overflow-hidden truncate">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{log.action} — {log.entityType}</span>
                                <span className="text-[10px] text-slate-400 block">{new Date(log.createdAt).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. SALES ORDERS TAB */}
                {activeTab === 'sales' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">Demand Management</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Draft sales, reserve furniture inventory items, &amp; ship deliveries.</p>
                      </div>
                      <button 
                        onClick={() => setIsNewSalesOpen(true)}
                        className="px-3.5 py-1.8 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Create Sales Order
                      </button>
                    </div>

                    {/* Sales List */}
                    {salesLoading ? (
                      <div className="space-y-3 animate-pulse">
                        {[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>)}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {salesOrders?.map((so: any) => {
                          const totalValue = so.items.reduce((acc: number, item: any) => acc + ((item.product?.salesPrice || 0) * item.quantity), 0);
                          return (
                            <div key={so.id} className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/20 dark:bg-slate-900/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-blue-500 uppercase">SO-#{so.id.substring(3, 7).toUpperCase()}</span>
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">— {so.customerName}</span>
                                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                    so.status === 'delivered' 
                                      ? 'bg-emerald-500/10 text-emerald-500' 
                                      : so.status === 'confirmed' 
                                        ? 'bg-blue-500/10 text-blue-500' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  }`}>
                                    {so.status}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {so.items.map((item: any, idx: number) => (
                                    <span key={item.id}>{idx > 0 && ', '}{item.product?.name} (Qty: {item.quantity})</span>
                                  ))}
                                </div>
                                <div className="text-[10px] text-slate-400">{new Date(so.createdAt).toLocaleDateString()}</div>
                              </div>

                              <div className="flex items-center justify-between md:justify-end gap-5">
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block font-semibold">Total Price</span>
                                  <span className="text-sm font-black text-slate-800 dark:text-white">${totalValue.toLocaleString()}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {so.status === 'draft' && (
                                    <button
                                      onClick={() => confirmSalesOrderMutation.mutate(so.id)}
                                      disabled={confirmSalesOrderMutation.isPending}
                                      className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer"
                                    >
                                      {confirmSalesOrderMutation.isPending ? 'Confirming...' : 'Confirm Order'}
                                    </button>
                                  )}
                                  
                                  {so.status === 'confirmed' && (
                                    <button
                                      onClick={() => shipSalesOrderMutation.mutate(so.id)}
                                      disabled={shipSalesOrderMutation.isPending}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer"
                                    >
                                      {shipSalesOrderMutation.isPending ? 'Shipping...' : 'Ship Delivery'}
                                    </button>
                                  )}
                                  
                                  {so.status === 'delivered' && (
                                    <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                                      <CheckCircle className="w-4 h-4" /> Shipped
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. PURCHASES TAB */}
                {activeTab === 'purchases' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">Supply &amp; Vendors</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Order raw components from supplier vendors &amp; receive incoming shipments.</p>
                      </div>
                      <button 
                        onClick={() => setIsNewPoOpen(true)}
                        className="px-3.5 py-1.8 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Create Purchase Order
                      </button>
                    </div>

                    {/* PO List */}
                    {purchaseLoading ? (
                      <div className="space-y-3 animate-pulse">
                        {[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>)}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {purchaseOrders?.map((po: any) => {
                          const totalCost = po.items.reduce((acc: number, item: any) => acc + ((item.product?.costPrice || 0) * item.quantity), 0);
                          return (
                            <div key={po.id} className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/20 dark:bg-slate-900/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-indigo-500 uppercase">PO-#{po.id.substring(3, 7).toUpperCase()}</span>
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">— {po.vendorName}</span>
                                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                    po.status === 'received' 
                                      ? 'bg-emerald-500/10 text-emerald-500' 
                                      : 'bg-amber-500/10 text-amber-500'
                                  }`}>
                                    {po.status}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  {po.items.map((item: any, idx: number) => (
                                    <span key={item.id}>{idx > 0 && ', '}{item.product?.name} (Qty: {item.quantity})</span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between md:justify-end gap-5">
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block font-semibold">Cost Valuation</span>
                                  <span className="text-sm font-black text-slate-800 dark:text-white">${totalCost.toLocaleString()}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {po.status === 'confirmed' ? (
                                    <button
                                      onClick={() => receivePOMutation.mutate(po.id)}
                                      disabled={receivePOMutation.isPending}
                                      className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer"
                                    >
                                      {receivePOMutation.isPending ? 'Receiving...' : 'Receive Shipment'}
                                    </button>
                                  ) : (
                                    <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                                      <CheckCircle className="w-4 h-4" /> Received
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. MANUFACTURING TAB */}
                {activeTab === 'manufacturing' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">Manufacturing Console</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Process furniture Bill of Materials (BoM), start raw consumptions, &amp; finalize assembly.</p>
                      </div>
                      <button 
                        onClick={() => setIsNewMoOpen(true)}
                        className="px-3.5 py-1.8 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Create Mfg Order
                      </button>
                    </div>

                    {/* MO List */}
                    {moLoading ? (
                      <div className="space-y-3 animate-pulse">
                        {[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-900 rounded-xl"></div>)}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {manufacturingOrders?.map((mo: any) => (
                          <div key={mo.id} className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/20 dark:bg-slate-900/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-amber-500 uppercase">MO-#{mo.id.substring(3, 7).toUpperCase()}</span>
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">— {mo.productName}</span>
                                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                  mo.status === 'completed' 
                                    ? 'bg-emerald-500/10 text-emerald-500' 
                                    : mo.status === 'in_progress' 
                                      ? 'bg-amber-500/10 text-amber-500' 
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}>
                                  {mo.status}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                Target Qty: <span className="font-semibold">{mo.quantity} Units</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {mo.status === 'draft' && (
                                <button
                                  onClick={() => startMOMutation.mutate(mo.id)}
                                  disabled={startMOMutation.isPending}
                                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer"
                                >
                                  {startMOMutation.isPending ? 'Starting...' : 'Consume & Start'}
                                </button>
                              )}
                              
                              {mo.status === 'in_progress' && (
                                <button
                                  onClick={() => completeMOMutation.mutate(mo.id)}
                                  disabled={completeMOMutation.isPending}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold transition-all cursor-pointer"
                                >
                                  {completeMOMutation.isPending ? 'Completing...' : 'Finish Production'}
                                </button>
                              )}
                              
                              {mo.status === 'completed' && (
                                <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" /> Production Finished
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. INVENTORY GRID TAB */}
                {activeTab === 'inventory' && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">Stock Ledger</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">On hand counts, customer reservations, &amp; real-time free quantities.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setIsNewProductOpen(true)}
                          className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New Product
                        </button>
                        
                        <button 
                          onClick={() => runProcurementMutation.mutate()}
                          disabled={runProcurementMutation.isPending}
                          className="px-3.5 py-1.8 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${runProcurementMutation.isPending ? 'animate-spin' : ''}`} />
                          {runProcurementMutation.isPending ? 'Running Engine...' : 'Run Procurement Engine (MTO)'}
                        </button>
                      </div>
                    </div>

                    {/* Shortfall Alert */}
                    {hasInventoryShortfall && (
                      <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3 mb-6">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          <div>
                            <span className="font-bold">Inventory Shortfall Alert:</span> Some confirmed Sales Orders exceed On Hand stock. Click &quot;Run Procurement Engine&quot; to automatically launch component POs and finished MOs.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Inventory Table */}
                    {inventoryLoading ? (
                      <div className="space-y-3 animate-pulse">
                        <div className="h-10 bg-slate-100 dark:bg-slate-900 rounded-lg"></div>
                        {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-900 rounded-lg"></div>)}
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/5">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="p-3">Product Name</th>
                              <th className="p-3">SKU</th>
                              <th className="p-3">Type</th>
                              <th className="p-3 text-right">On Hand</th>
                              <th className="p-3 text-right">Reserved</th>
                              <th className="p-3 text-right">Available (Free)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {inventory?.map((item: any) => {
                              return (
                                <tr key={item.productId} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors">
                                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{item.product?.name}</td>
                                  <td className="p-3 font-mono text-slate-500">{item.product?.sku}</td>
                                  <td className="p-3">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      item.product?.procurementType === 'manufacture' 
                                        ? 'bg-blue-500/10 text-blue-500' 
                                        : 'bg-indigo-500/10 text-indigo-500'
                                    }`}>
                                      {item.product?.procurementType}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right font-semibold">{item.onHand}</td>
                                  <td className="p-3 text-right text-slate-400">{item.reserved}</td>
                                  <td className={`p-3 text-right font-bold ${
                                    item.available < 0 
                                      ? 'text-rose-500' 
                                      : item.available === 0 
                                        ? 'text-slate-400' 
                                        : 'text-emerald-500'
                                  }`}>
                                    {item.available}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. AUDIT TRAIL TAB */}
                {activeTab === 'audit' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight">Audit Trail Ledger</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Automated event registry logs for inventory reservations, production, &amp; shipments.</p>
                      </div>
                    </div>

                    {/* Audit Logs list */}
                    {auditLoading ? (
                      <div className="space-y-3 animate-pulse">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-900 rounded-lg"></div>)}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {auditLogs?.map((log: any) => (
                          <div key={log.id} className="p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/10 dark:bg-slate-900/5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                            <div className="flex items-start gap-3">
                              <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 block shrink-0"></span>
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{log.action}</span>
                                <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2">Entity: {log.entityType} ({log.entityId})</span>
                                <div className="text-[10px] text-slate-400 mt-1 max-w-lg truncate">
                                  {log.newValue ? `Payload: ${JSON.stringify(log.newValue)}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-slate-400 font-semibold block">{new Date(log.createdAt).toLocaleDateString()}</span>
                              <span className="text-[9px] text-slate-400 block">{new Date(log.createdAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. HELP TAB */}
                {activeTab === 'faq' && (
                  <div>
                    <h3 className="text-xl font-bold tracking-tight mb-4">Workspace &amp; Sandbox Guide</h3>
                    <div className="space-y-5 text-sm text-slate-600 dark:text-slate-400">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white block mb-1">What is this mini ERP?</span>
                        <p className="text-xs leading-relaxed">It is a demand-to-delivery automation flow specifically modeled for a furniture manufacturer. All steps are logged to show stock movements, reservation status, and material checks.</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white block mb-1">How do I run the full cycle?</span>
                        <ol className="list-decimal list-inside text-xs space-y-2 mt-1">
                          <li>Go to the <strong className="text-blue-500">Sales Orders</strong> tab and click &quot;Create Sales Order&quot; to request 5 chairs.</li>
                          <li>Click &quot;Confirm Order&quot;. This reserves stock and creates an inventory shortfall.</li>
                          <li>Navigate to <strong className="text-blue-500">Inventory Levels</strong>. You will see an alert. Click &quot;Run Procurement Engine&quot;.</li>
                          <li>The engine detects the shortage and drafts a Manufacturing Order for the finished chairs, plus Purchase Orders for any raw component shortfalls.</li>
                          <li>Go to <strong className="text-blue-500">Purchase Orders</strong> and receive components. Go to <strong className="text-blue-500">Manufacturing</strong>, consume materials, and finish assembly.</li>
                          <li>Ship the sales order from the sales dashboard! Total sales revenue will update immediately.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

              </main>

            </div>

          </div>
        </div>
      </section>

      {/* FEATURES HIGHLIGHT SECTION */}
      <section id="features" className="py-20 md:py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest block mb-3">Enterprise Suite Capabilities</span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-b from-slate-950 to-slate-800 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
              Engineered for Real Production
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              Say goodbye to stock mismatches and delayed orders. Odoo Mini ERP streamlines furniture manufacturing using inventory-first ledger audits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900/10 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Inventory-First Design</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Every material issue, purchasing receipt, and sales delivery generates a cryptographically indexed ledger entry. Zero sync issues.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900/10 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-6">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Automated MTO Engine</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Make-To-Order algorithms scan confirm orders, calculate BoM shortfalls, and trigger draft POs/MOs in one single click.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900/10 hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-6">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Bill of Materials Explosion</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                Define furniture component recipes. Run availability checks prior to launch, preventing half-finished items from blocking assembly lines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="py-20 md:py-28 bg-slate-100/50 dark:bg-slate-900/20 border-t border-b border-slate-200/40 dark:border-slate-900/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest block mb-3">Transparent Plans</span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-b from-slate-950 to-slate-800 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
              Flexible Pricing For Scale
            </h2>
            
            {/* Billing Cycle Toggle */}
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl mt-4">
              <button 
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === 'yearly' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Yearly <span className="text-[10px] text-blue-500 font-extrabold ml-1 bg-blue-500/10 px-1 py-0.5 rounded">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Standard Tier */}
            <div className="p-8 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-950 hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase block mb-1">Standard</span>
                <span className="text-sm font-semibold text-slate-400 block mb-4">Small workshop setups</span>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-black">${billingCycle === 'yearly' ? '29' : '39'}</span>
                  <span className="text-xs text-slate-400 ml-1">/month</span>
                </div>
                <ul className="space-y-3.5 text-xs text-slate-500 dark:text-slate-400 mb-8">
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500" /> Up to 5 Manufacturing Lines</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500" /> Real-time Stock Reservations</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500" /> Standard BOM Configurator</li>
                  <li className="flex items-center gap-2.5 text-slate-300 dark:text-slate-700"><X className="w-4 h-4" /> Automated Procurement MTO</li>
                </ul>
              </div>
              <a href="#sandbox" className="w-full text-center py-3 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-xs font-bold transition-all">
                Try Standard features
              </a>
            </div>

            {/* Growth Tier */}
            <div className="p-8 rounded-2xl border-2 border-blue-500 bg-white dark:bg-slate-950 hover:shadow-xl transition-all flex flex-col justify-between relative">
              <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 rounded-full bg-blue-500 text-white font-extrabold text-[9px] uppercase tracking-wider">
                Popular
              </div>
              <div>
                <span className="text-xs font-bold tracking-wider text-blue-500 uppercase block mb-1">Growth Enterprise</span>
                <span className="text-sm font-semibold text-slate-400 block mb-4">Multiple factories routing</span>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-black">${billingCycle === 'yearly' ? '79' : '99'}</span>
                  <span className="text-xs text-slate-400 ml-1">/month</span>
                </div>
                <ul className="space-y-3.5 text-xs text-slate-500 dark:text-slate-400 mb-8">
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-500 font-bold" /> Unlimited Manufacturing Lines</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-500 font-bold" /> Real-time Stock Reservations</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-500 font-bold" /> Complex Multi-level BOM</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-500 font-bold" /> Automated MTO Engine</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-blue-500 font-bold" /> Priority Email Support</li>
                </ul>
              </div>
              <a href="#sandbox" className="w-full text-center py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/10">
                Launch Growth Sandbox
              </a>
            </div>

            {/* Enterprise Tier */}
            <div className="p-8 rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-950 hover:shadow-xl transition-all flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase block mb-1">Corporate</span>
                <span className="text-sm font-semibold text-slate-400 block mb-4">Tailored enterprise ERP setup</span>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-black">Custom</span>
                </div>
                <ul className="space-y-3.5 text-xs text-slate-500 dark:text-slate-400 mb-8">
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500" /> Custom Third-Party Integrations</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500" /> Dedicated Account Manager</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500" /> Custom Database Sharding</li>
                  <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-emerald-500" /> 24/7 Phone Support &amp; SLA</li>
                </ul>
              </div>
              <a href="#sandbox" className="w-full text-center py-3 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-xs font-bold transition-all">
                Contact Enterprise Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="py-20 md:py-28 max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
          <p className="text-slate-500 dark:text-slate-400">Clear up any confusion regarding our Demand-to-Delivery ERP flow.</p>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900/10">
            <h3 className="font-bold mb-2">What does &quot;inventory-first&quot; design mean?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Every operation—be it confirming a sales order, starting production, or completing a purchasing shipment—does not just update a simple quantity column. Instead, it triggers stock movement events in a Stock Ledger. Available quantities are calculated dynamically by subtracting reserved quantities from physical stock on hand.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900/10">
            <h3 className="font-bold mb-2">How does the Make-to-Order (MTO) engine work?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              When a sales order is confirmed, the system reserves the corresponding finished product items. If there is a shortfall, the MTO engine calculates exactly how many units need to be manufactured. It then checks the Bill of Materials (BoM) for that product and launches manufacturing orders for the finished goods, plus purchase orders for any raw materials that are also short on stock.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              O
            </div>
            <span className="font-extrabold text-white">OdooMini ERP</span>
          </div>
          
          <div className="flex items-center gap-6 text-xs font-semibold">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#sandbox" className="hover:text-white transition-colors">Sandbox</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          
          <p className="text-[10px] text-slate-500">
            &copy; {new Date().getFullYear()} OdooMini Core. Designed for demand-to-delivery workflows. All rights reserved.
          </p>
        </div>
      </footer>


      {/* ============================================================== */}
      {/* OVERLAY MODALS FOR THE INTERACTIVE DEMO SANDBOX */}
      {/* ============================================================== */}

      {/* MODAL 1: CREATE PRODUCT */}
      {isNewProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-float">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sm">Add New Catalog Product</h4>
              <button onClick={() => setIsNewProductOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createProductMutation.mutate(productForm); }} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Product Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Oak Office Table"
                  value={productForm.name} 
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">SKU Code</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. TABLE-OAK"
                    value={productForm.sku} 
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Procurement Type</label>
                  <select 
                    value={productForm.procurementType} 
                    onChange={(e) => setProductForm({ ...productForm, procurementType: e.target.value as 'purchase' | 'manufacture' })}
                    className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="purchase">Purchase</option>
                    <option value="manufacture">Manufacture</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sales Price ($)</label>
                  <input 
                    type="number" 
                    placeholder="sales price"
                    value={productForm.salesPrice} 
                    onChange={(e) => setProductForm({ ...productForm, salesPrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cost Price ($)</label>
                  <input 
                    type="number" 
                    required
                    placeholder="cost price"
                    value={productForm.costPrice} 
                    onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="procureOnDemand"
                  checked={productForm.procureOnDemand}
                  onChange={(e) => setProductForm({ ...productForm, procureOnDemand: e.target.checked })}
                  className="rounded dark:bg-slate-900 dark:border-slate-800 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="procureOnDemand" className="text-xs text-slate-500 select-none">Procure on demand (Make-To-Order)</label>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsNewProductOpen(false)}
                  className="px-3.5 py-2 rounded-lg border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createProductMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {createProductMutation.isPending ? 'Saving...' : 'Add Catalog Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE SALES ORDER */}
      {isNewSalesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sm">Draft Sales Order (Demand)</h4>
              <button onClick={() => setIsNewSalesOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createSalesOrderMutation.mutate(salesForm); }} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. WestEnd Office Supplies"
                  value={salesForm.customerName} 
                  onChange={(e) => setSalesForm({ ...salesForm, customerName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Product to Sell</label>
                  <select 
                    required
                    value={salesForm.productId} 
                    onChange={(e) => setSalesForm({ ...salesForm, productId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a product...</option>
                    {products?.filter((p: any) => p.salesPrice !== null).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} (${p.salesPrice})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={salesForm.quantity} 
                    onChange={(e) => setSalesForm({ ...salesForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsNewSalesOpen(false)}
                  className="px-3.5 py-2 rounded-lg border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createSalesOrderMutation.isPending || !salesForm.productId}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {createSalesOrderMutation.isPending ? 'Drafting...' : 'Save Draft Sales Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE MANUFACTURING ORDER */}
      {isNewMoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sm">Create Manufacturing Order (Production)</h4>
              <button onClick={() => setIsNewMoOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMOMutation.mutate(moForm); }} className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Product to Produce</label>
                  <select 
                    required
                    value={moForm.productId} 
                    onChange={(e) => setMoForm({ ...moForm, productId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select product...</option>
                    {products?.filter((p: any) => p.procurementType === 'manufacture').map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={moForm.quantity} 
                    onChange={(e) => setMoForm({ ...moForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsNewMoOpen(false)}
                  className="px-3.5 py-2 rounded-lg border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createMOMutation.isPending || !moForm.productId}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {createMOMutation.isPending ? 'Creating...' : 'Create Draft MO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE PURCHASE ORDER */}
      {isNewPoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sm">Draft Purchase Order (Procurement)</h4>
              <button onClick={() => setIsNewPoOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createPOMutation.mutate(poForm); }} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vendor Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. TimberLand Co"
                  value={poForm.vendorName} 
                  onChange={(e) => setPoForm({ ...poForm, vendorName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Component to Buy</label>
                  <select 
                    required
                    value={poForm.productId} 
                    onChange={(e) => setPoForm({ ...poForm, productId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select component...</option>
                    {products?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={poForm.quantity} 
                    onChange={(e) => setPoForm({ ...poForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-slate-900 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsNewPoOpen(false)}
                  className="px-3.5 py-2 rounded-lg border text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createPOMutation.isPending || !poForm.productId}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md disabled:opacity-50"
                >
                  {createPOMutation.isPending ? 'Generating...' : 'Confirm PO Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

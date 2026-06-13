'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getProducts, createProduct } from '../../../features/product/services';
import type { Product } from '../../../features/product/types';
import { useToast } from '../layout';
import { Btn, Card, Input, Select, EmptyState, StatusBadge } from '../../../components/ui';
import { RefreshCw, Plus, Check, Package } from 'lucide-react';

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
        procureOnDemand: false, // Defaulting MTO to false as commented out in original code
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Products</h2>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw size={14} />
          </Btn>
          <Btn size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Add Product
          </Btn>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-5 animate-fade-in">
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
              <Btn disabled={saving}>
                {saving ? <RefreshCw size={12} className="animate-spin-slow" /> : <Check size={12} />} Save
              </Btn>
            </div>
          </form>
        </Card>
      )}

      {/* Product List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={20} className="animate-spin-slow text-sky-500" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package size={20} />}
            title="No products"
            description="Create your first product to get started."
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-left text-xs text-gray-500 font-medium">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Sales Price</th>
                  <th className="px-5 py-3">Cost Price</th>
                  <th className="px-5 py-3">Strategy</th>
                  <th className="px-5 py-3">On Hand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-sky-50/30 transition">
                    <td className="px-5 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-5 py-3 text-gray-600">{p.salesPrice != null ? `$${p.salesPrice}` : '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{p.costPrice != null ? `$${p.costPrice}` : '—'}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.procurementType} />
                    </td>
                    <td className="px-5 py-3 text-gray-600">{p.inventory?.onHandQty ?? 0}</td>
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

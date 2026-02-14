
import React, { useState, useRef } from 'react';
import { AppData, Product, Currency } from '../types';
import { Plus, Search, Edit2, Trash2, Camera, Download, Package, Upload, X as LucideX, Printer, FileSpreadsheet } from 'lucide-react';
import { compressImage, generateId, formatCurrency } from '../lib/utils';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const Products: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', sku: '', barcode: '', costPrice: 0, sellPrice: 0, stock: 0, category: '', image: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const rate = data.settings.exchangeRate;

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await compressImage(file);
      setFormData({ ...formData, image: base64 });
    }
  };

  const saveProduct = () => {
    if (!formData.name || formData.sellPrice === undefined) return;

    if (editingProduct) {
      setData(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === editingProduct.id ? { ...p, ...formData as Product } : p)
      }));
      addLog('Edit Product', `Updated product: ${formData.name}`);
    } else {
      const newProduct: Product = {
        id: generateId(),
        name: formData.name || '',
        sku: formData.sku || '',
        barcode: formData.barcode || '',
        costPrice: formData.costPrice || 0,
        sellPrice: formData.sellPrice || 0,
        stock: formData.stock || 0,
        category: formData.category || 'General',
        image: formData.image || ''
      };
      setData(prev => ({ ...prev, products: [...prev.products, newProduct] }));
      addLog('Add Product', `Created product: ${formData.name}`);
    }
    closeModal();
  };

  const deleteProduct = (id: string, name: string) => {
    if (confirm(`Permanently delete ${name}? This action cannot be undone.`)) {
      setData(prev => {
        const newProducts = prev.products.filter(item => item.id !== id);
        const newLog = {
          id: generateId(),
          action: 'Delete Product',
          details: `Permanently removed: ${name}`,
          timestamp: Date.now(),
          user: prev.settings.currentUser.name
        };
        return {
          ...prev,
          products: newProducts,
          auditLogs: [newLog, ...prev.auditLogs]
        };
      });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({ name: '', sku: '', barcode: '', costPrice: 0, sellPrice: 0, stock: 0, category: '', image: '' });
  };

  const filteredProducts = data.products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.toLowerCase().includes(search.toLowerCase())
  );

  const getStockBadgeClass = (stock: number) => {
    if (stock < 5) return 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-200';
    if (stock < 10) return 'bg-amber-100 text-amber-700 font-black';
    return 'bg-emerald-100 text-emerald-700 font-black';
  };

  const exportToExcelCSV = () => {
    const headers = ['Name', 'SKU', 'Barcode', 'Cost Price', 'Sell Price', 'Stock', 'Category'];
    const rows = data.products.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.sku || '').replace(/"/g, '""')}"`,
      `"${(p.barcode || '').replace(/"/g, '""')}"`,
      p.costPrice,
      p.sellPrice,
      p.stock,
      `"${(p.category || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog('Export Products', 'Exported product catalog for Excel');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      const newProducts: Product[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV splitter that respects quotes
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
        
        if (parts.length >= 2) {
          newProducts.push({
            id: generateId(),
            name: parts[0],
            sku: parts[1] || '',
            barcode: parts[2] || '',
            costPrice: parseFloat(parts[3]) || 0,
            sellPrice: parseFloat(parts[4]) || 0,
            stock: parseInt(parts[5]) || 0,
            category: parts[6] || 'General',
            image: ''
          });
        }
      }

      if (newProducts.length > 0) {
        if (confirm(`Import ${newProducts.length} products? Existing products with different IDs will not be overwritten.`)) {
          setData(prev => ({ ...prev, products: [...prev.products, ...newProducts] }));
          addLog('Import Products', `Imported ${newProducts.length} products from Excel/CSV`);
          alert(`Successfully imported ${newProducts.length} products.`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-6">
      <div className="hidden print:block mb-8 border-b-4 border-slate-900 pb-4">
        <h1 className="text-4xl font-black uppercase tracking-tighter">{data.settings.businessName}</h1>
        <p className="text-sm font-bold text-slate-500">FULL PRODUCT CATALOG • {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 no-print">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search products..." 
            className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-bold"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="bg-white border rounded-2xl p-1 flex gap-1 shadow-sm">
            <button onClick={exportToExcelCSV} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-2 px-3">
              <FileSpreadsheet size={18} />
              <span className="text-[10px] font-black uppercase hidden lg:inline">Export Products</span>
            </button>
            <button onClick={() => importInputRef.current?.click()} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-2 px-3">
              <Upload size={18} />
              <span className="text-[10px] font-black uppercase hidden lg:inline">Import CSV</span>
              <input type="file" ref={importInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
            </button>
            <button onClick={() => window.print()} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2 px-3">
              <Printer size={18} />
              <span className="text-[10px] font-black uppercase hidden lg:inline">Print Catalog</span>
            </button>
          </div>

          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg whitespace-nowrap">
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b print:bg-white print:border-b-2 print:border-slate-900">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-900">Product</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-900">SKU / Barcode</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-900">Price Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-slate-900 text-center">Quantity</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group print:hover:bg-transparent">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden border no-print">
                        {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="text-slate-300" size={20} />}
                      </div>
                      <p className="font-bold text-slate-900 print:text-sm">{p.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700 print:text-xs">{p.sku || '-'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{p.barcode || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] text-slate-400 font-bold no-print">COST: {formatCurrency(p.costPrice, currency, rate)}</p>
                    <p className="text-sm font-black text-blue-600 print:text-slate-900">SELL: {formatCurrency(p.sellPrice, currency, rate)}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight print:bg-transparent print:text-slate-900 print:p-0 ${getStockBadgeClass(p.stock)}`}>
                      {p.stock} units
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right no-print">
                    <div className="flex justify-end gap-2 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingProduct(p); setFormData(p); setShowModal(true); }} 
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteProduct(p.id, p.name); }} 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-8 py-6 border-b flex items-center justify-between bg-slate-50">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingProduct ? 'Update Item' : 'Create New Product'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                <LucideX size={24} />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">
              <div className="md:col-span-2 flex flex-col items-center gap-4 py-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 relative group">
                {formData.image ? (
                  <div className="relative">
                    <img src={formData.image} alt="Preview" className="w-32 h-32 object-cover rounded-3xl" />
                    <button onClick={() => setFormData({...formData, image: ''})} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full"><LucideX size={14} /></button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Camera className="text-slate-300 mb-2" size={40} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Upload Photograph</p>
                  </div>
                )}
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImage} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Product Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">SKU / Barcode</label>
                <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Cost Price ({currency})</label>
                <input type="number" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Sell Price ({currency}) *</label>
                <input type="number" value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: parseFloat(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Initial Stock</label>
                <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold appearance-none">
                  <option value="General">General</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Grocery">Grocery</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Home">Home</option>
                </select>
              </div>

              <div className="md:col-span-2 pt-6 flex gap-3">
                <button onClick={closeModal} className="flex-1 font-bold text-slate-400">Cancel</button>
                <button onClick={saveProduct} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;

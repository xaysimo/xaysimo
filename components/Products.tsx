
import React, { useState, useRef } from 'react';
import { AppData, Product, Currency } from '../types';
import { Plus, Search, Edit2, Trash2, Camera, Download, Package, Upload, X as LucideX, Printer, FileSpreadsheet, Tag, CheckCircle2 } from 'lucide-react';
import { compressImage, generateId, formatCurrency } from '../lib/utils';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const Products: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const [showModal, setShowModal] = useState(false);
  const [showBarcodePrint, setShowBarcodePrint] = useState(false);
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
      setData(prev => ({
        ...prev,
        products: prev.products.filter(item => item.id !== id)
      }));
      addLog('Delete Product', `Permanently removed: ${name}`);
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
    link.href = url;
    link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog('Export Products', 'Exported product catalog to Excel/CSV');
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'SKU', 'Barcode', 'Cost Price', 'Sell Price', 'Stock', 'Category'];
    const sample = ['Example Product', 'SKU123', '12345678', '10.50', '25.00', '100', 'Electronics'];
    const csvContent = "\uFEFF" + [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_import_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) return alert("Empty or invalid CSV file.");

      const headers = lines[0].toLowerCase().split(',').map(h => h.replace(/^"|"$/g, '').trim());
      
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const skuIdx = headers.findIndex(h => h.includes('sku'));
      const barcodeIdx = headers.findIndex(h => h.includes('barcode'));
      const costIdx = headers.findIndex(h => h.includes('cost'));
      const sellIdx = headers.findIndex(h => h.includes('sell') || h.includes('price'));
      const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty'));
      const categoryIdx = headers.findIndex(h => h.includes('category'));

      if (nameIdx === -1) return alert("Required column 'Name' not found.");

      const newProducts: Product[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.replace(/^"|"$/g, '').trim());
        newProducts.push({
          id: generateId(),
          name: parts[nameIdx] || 'Imported Item',
          sku: skuIdx !== -1 ? parts[skuIdx] : '',
          barcode: barcodeIdx !== -1 ? parts[barcodeIdx] : '',
          costPrice: costIdx !== -1 ? parseFloat(parts[costIdx]) || 0 : 0,
          sellPrice: sellIdx !== -1 ? parseFloat(parts[sellIdx]) || 0 : 0,
          stock: stockIdx !== -1 ? parseInt(parts[stockIdx]) || 0 : 0,
          category: categoryIdx !== -1 ? parts[categoryIdx] : 'General',
          image: ''
        });
      }

      setData(prev => ({ ...prev, products: [...prev.products, ...newProducts] }));
      addLog('Import Products', `Imported ${newProducts.length} items from CSV`);
      alert(`Imported ${newProducts.length} products successfully.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="p-6">
      {/* Print Catalog Layout */}
      <div className="hidden print:block">
         <div className="text-center border-b-4 border-slate-900 pb-6 mb-8">
            <h1 className="text-4xl font-black uppercase tracking-tighter">{data.settings.businessName}</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">Official Inventory Report • {new Date().toLocaleDateString()}</p>
         </div>
         <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-900">
                <th className="py-2 text-xs font-black uppercase">Product Name</th>
                <th className="py-2 text-xs font-black uppercase">SKU / Barcode</th>
                <th className="py-2 text-xs font-black uppercase">Category</th>
                <th className="py-2 text-xs font-black uppercase text-right">Selling Price</th>
                <th className="py-2 text-xs font-black uppercase text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProducts.map(p => (
                <tr key={p.id}>
                  <td className="py-3 font-bold">{p.name}</td>
                  <td className="py-3 text-xs text-slate-600">{p.sku} {p.barcode ? `(${p.barcode})` : ''}</td>
                  <td className="py-3 text-xs">{p.category}</td>
                  <td className="py-3 text-right font-black">{formatCurrency(p.sellPrice, currency, rate)}</td>
                  <td className="py-3 text-right font-bold">{p.stock}</td>
                </tr>
              ))}
            </tbody>
         </table>
      </div>

      {/* Main UI */}
      <div className="no-print space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, SKU or barcode..." 
              className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="bg-white border rounded-2xl p-1 flex gap-1 shadow-sm">
              <button onClick={exportToExcelCSV} className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-2 px-4" title="Export Excel">
                <FileSpreadsheet size={18} />
                <span className="text-[10px] font-black uppercase">Export</span>
              </button>
              <button onClick={() => importInputRef.current?.click()} className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-2 px-4" title="Import CSV">
                <Upload size={18} />
                <span className="text-[10px] font-black uppercase">Import</span>
                <input type="file" ref={importInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
              </button>
              <button onClick={downloadTemplate} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all" title="Download Template">
                <Download size={18} />
              </button>
            </div>

            <button onClick={() => window.print()} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl text-sm font-black hover:bg-slate-200 transition-all shadow-sm flex items-center gap-2">
              <Printer size={18} /> Print Catalog
            </button>

            <button onClick={() => setShowModal(true)} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2">
              <Plus size={20} /> Add Product
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stock</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden border">
                        {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <Package className="text-slate-300" size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-black uppercase">{p.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-700">{p.sku || '-'}</p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{p.barcode || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] text-slate-400 font-bold">COST: {formatCurrency(p.costPrice, currency, rate)}</p>
                    <p className="text-sm font-black text-blue-600">SELL: {formatCurrency(p.sellPrice, currency, rate)}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${p.stock < 10 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {p.stock} units
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingProduct(p); setFormData(p); setShowModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => deleteProduct(p.id, p.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center justify-center opacity-30">
               <Package size={48} className="mb-2" />
               <p className="text-xs font-black uppercase tracking-widest">Empty Catalog</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="px-8 py-6 border-b flex items-center justify-between bg-slate-50">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingProduct ? 'Edit Product' : 'Add New Item'}</h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                <LucideX size={24} />
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
              <div className="md:col-span-2 flex flex-col items-center gap-4 py-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 relative group">
                {formData.image ? (
                  <div className="relative">
                    <img src={formData.image} alt="Preview" className="w-32 h-32 object-cover rounded-3xl" />
                    <button onClick={() => setFormData({...formData, image: ''})} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full"><LucideX size={14} /></button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Camera className="text-slate-300 mb-2" size={40} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Product Photo</p>
                  </div>
                )}
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImage} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">SKU Code</label>
                <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Cost Price ({currency})</label>
                <input type="number" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Sell Price ({currency})</label>
                <input type="number" value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: parseFloat(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold text-blue-600" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Current Stock</label>
                <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Barcode / EAN</label>
                <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold" />
              </div>

              <div className="md:col-span-2 pt-6 flex gap-3">
                <button onClick={closeModal} className="flex-1 font-bold text-slate-400">Cancel</button>
                <button onClick={saveProduct} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">
                  {editingProduct ? 'Save Changes' : 'Create Product'}
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

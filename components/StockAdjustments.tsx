
import React, { useState, useMemo } from 'react';
import { AppData, Currency, StockAdjustment } from '../types';
import { RefreshCcw, Search, AlertCircle, Package, History, Calculator, Trash2 } from 'lucide-react';
import { formatCurrency, generateId } from '../lib/utils';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const StockAdjustments: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [type, setType] = useState<StockAdjustment['type']>('DAMAGE');

  const rate = data.settings.exchangeRate;

  const filteredProducts = data.products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProduct = data.products.find(p => p.id === selectedProductId);
  const lossValue = selectedProduct ? (selectedProduct.costPrice * quantity) : 0;

  const handleAdjust = () => {
    if (!selectedProduct || quantity <= 0) return alert("Please select a product and quantity.");

    const adjustment: StockAdjustment = {
      id: generateId(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      type,
      quantity,
      timestamp: Date.now(),
      reason
    };

    // Accounting mapping
    const lossAccountName = type === 'DAMAGE' ? 'Loss - Damaged Items' : 
                            type === 'LOST' ? 'Loss - Lost Items' : 
                            type === 'EXPIRED' ? 'Loss - Expired Items' : 
                            'Inventory Asset'; // Fallback

    setData(prev => {
      // 1. Update Product Stock
      const newProducts = prev.products.map(p => 
        p.id === selectedProduct.id ? { ...p, stock: Math.max(0, p.stock - quantity) } : p
      );

      // 2. Update Accounts
      const newAccounts = prev.accounts.map(acc => {
        // Deduct from Inventory Asset
        if (acc.name === 'Inventory Asset') {
          return { ...acc, balance: Math.max(0, acc.balance - lossValue) };
        }
        // Add to specific Loss Account
        if (acc.name === lossAccountName) {
          return { ...acc, balance: acc.balance + lossValue };
        }
        return acc;
      });

      return {
        ...prev,
        products: newProducts,
        accounts: newAccounts,
        stockAdjustments: [adjustment, ...prev.stockAdjustments]
      };
    });

    addLog('Stock Adjustment', `Adjusted ${selectedProduct.name} (-${quantity}) due to ${type}. Loss value: ${formatCurrency(lossValue, currency, rate)} recorded in ${lossAccountName}`);
    
    // Reset
    setSelectedProductId('');
    setSearch('');
    setQuantity(0);
    setReason('');
    alert("Stock adjusted and financial loss recorded.");
  };

  const handleDeleteAdjustment = (adj: StockAdjustment) => {
    if (!confirm(`Reverse this adjustment for ${adj.productName}? This will put ${adj.quantity} units back into stock.`)) return;

    setData(prev => {
      // Revert Product Stock
      const newProducts = prev.products.map(p => 
        p.id === adj.productId ? { ...p, stock: p.stock + adj.quantity } : p
      );

      // Revert Accounts
      const p = prev.products.find(prod => prod.id === adj.productId);
      const val = p ? p.costPrice * adj.quantity : 0;
      const lossAccountName = adj.type === 'DAMAGE' ? 'Loss - Damaged Items' : 
                              adj.type === 'LOST' ? 'Loss - Lost Items' : 
                              adj.type === 'EXPIRED' ? 'Loss - Expired Items' : 
                              'Inventory Asset';

      const newAccounts = prev.accounts.map(acc => {
        if (acc.name === 'Inventory Asset') return { ...acc, balance: acc.balance + val };
        if (acc.name === lossAccountName) return { ...acc, balance: Math.max(0, acc.balance - val) };
        return acc;
      });

      return {
        ...prev,
        products: newProducts,
        accounts: newAccounts,
        stockAdjustments: prev.stockAdjustments.filter(a => a.id !== adj.id)
      };
    });

    addLog('Adjustment Reverted', `Adjustment for ${adj.productName} was deleted. Stock restored.`);
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-8 rounded-[40px] border shadow-sm space-y-6">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <RefreshCcw size={20} className="text-blue-600" /> New Adjustment
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Search Product</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none font-bold text-sm"
                  placeholder="Type name or SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && !selectedProductId && filteredProducts.length > 0 && (
                  <div className="absolute top-full mt-2 left-0 w-full bg-white border rounded-2xl shadow-xl z-10 max-h-48 overflow-y-auto">
                    {filteredProducts.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => { setSelectedProductId(p.id); setSearch(p.name); }}
                        className="w-full p-4 text-left hover:bg-slate-50 border-b last:border-0 flex justify-between items-center"
                      >
                        <span className="font-bold text-sm">{p.name}</span>
                        <span className="text-[10px] font-black text-slate-400">STOCK: {p.stock}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quantity Lost</label>
                <input 
                  type="number" 
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl outline-none font-bold"
                  value={quantity || ''}
                  onChange={e => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Type of Loss</label>
                <select 
                  className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl outline-none font-bold"
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                >
                  <option value="DAMAGE">Damaged Item</option>
                  <option value="LOST">Lost Item</option>
                  <option value="EXPIRED">Expired Item</option>
                  <option value="RETURN_TO_VENDOR">Return to Vendor</option>
                </select>
              </div>
            </div>

            {selectedProduct && (
               <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col items-center animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Estimated Financial Loss</p>
                  <h4 className="text-2xl font-black text-rose-700">{formatCurrency(lossValue, currency, rate)}</h4>
                  <p className="text-[8px] font-bold text-rose-400 uppercase mt-1">Deducted from Inventory Asset</p>
               </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reason/Note</label>
              <textarea 
                className="w-full px-5 py-3 bg-slate-50 border-none rounded-2xl outline-none font-bold h-24 resize-none"
                placeholder="Write specific details..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            <button 
              onClick={handleAdjust}
              disabled={!selectedProductId || quantity <= 0}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-900/10 hover:bg-red-700 transition-all disabled:opacity-50"
            >
              Confirm Adjustment
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-[40px] border shadow-sm overflow-hidden">
          <div className="p-8 border-b flex items-center gap-3">
            <History size={20} className="text-slate-400" />
            <h3 className="text-xl font-black text-slate-800">Adjustment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Product</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.stockAdjustments.map(adj => (
                  <tr key={adj.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-slate-500">{new Date(adj.timestamp).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{adj.productName}</td>
                    <td className="px-6 py-4 text-center font-black text-red-600">-{adj.quantity}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-black uppercase">
                        {adj.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         onClick={() => handleDeleteAdjustment(adj)}
                         className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                         title="Delete Adjustment & Revert Stock"
                       >
                         <Trash2 size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.stockAdjustments.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
              <Package size={48} className="text-slate-100 mb-2" />
              <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">No adjustments recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockAdjustments;

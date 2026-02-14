
import React, { useState, useMemo } from 'react';
import { AppData, Currency, Product, StockAdjustment, Account } from '../types';
import { PackagePlus, Search, ArrowUpRight, Truck, Calculator, History, CheckCircle2, Wallet, AlertCircle, ShoppingBag, Landmark, Smartphone, Banknote } from 'lucide-react';
import { formatCurrency, generateId } from '../lib/utils';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const Purchases: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [supplierName, setSupplierName] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const rate = data.settings.exchangeRate;

  const filteredProducts = useMemo(() => {
    if (!searchProduct) return [];
    const term = searchProduct.toLowerCase();
    return data.products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term) || 
      p.barcode.toLowerCase().includes(term)
    );
  }, [data.products, searchProduct]);

  const totalPurchaseCost = quantity * unitCost;
  const selectedAccount = data.accounts.find(a => a.id === selectedAccountId);
  const hasInsufficientFunds = selectedAccount ? selectedAccount.balance < totalPurchaseCost : false;

  const handleStockIn = () => {
    if (!selectedProduct || quantity <= 0) return alert("Please select a product and enter a valid quantity.");
    if (!selectedAccountId) return alert("Please select a payment account to deduct the cost from.");
    if (hasInsufficientFunds) return alert("Insufficient funds in the selected account to complete this purchase.");
    
    setIsProcessing(true);

    const oldStock = selectedProduct.stock;
    const newStock = oldStock + quantity;
    
    const adjustment: StockAdjustment = {
      id: generateId(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      type: 'STOCK_IN',
      quantity: quantity,
      timestamp: Date.now(),
      reason: `Purchased from ${supplierName || 'General Supplier'}. Source: ${selectedAccount?.name}.`,
    };

    setData(prev => ({
      ...prev,
      products: prev.products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, stock: newStock, costPrice: unitCost > 0 ? unitCost : p.costPrice } 
          : p
      ),
      accounts: prev.accounts.map(a => 
        a.id === selectedAccountId 
          ? { ...a, balance: a.balance - totalPurchaseCost } 
          : a
      ),
      stockAdjustments: [adjustment, ...prev.stockAdjustments]
    }));

    addLog('Inventory Purchase', `Bought ${selectedProduct.name}: +${quantity} from ${supplierName || 'Unknown'}. Deducted ${formatCurrency(totalPurchaseCost, currency, rate)} from ${selectedAccount?.name}`);
    
    // Reset form
    setIsProcessing(false);
    setSelectedProduct(null);
    setSearchProduct('');
    setQuantity(0);
    setUnitCost(0);
    setSupplierName('');
    setSelectedAccountId('');
    alert("Purchase successful! Stock and balances updated.");
  };

  const recentStockIn = useMemo(() => {
    return data.stockAdjustments.filter(a => a.type === 'STOCK_IN').slice(0, 10);
  }, [data.stockAdjustments]);

  const getAccountIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('bank')) return <Landmark size={14} className="text-blue-500" />;
    if (n.includes('cash')) return <Banknote size={14} className="text-emerald-500" />;
    if (n.includes('mobile')) return <Smartphone size={14} className="text-purple-500" />;
    return <Wallet size={14} className="text-slate-400" />;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 pb-20">
      <div className="lg:col-span-3 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Inventory Purchases</h1>
            <p className="text-slate-500 font-medium">Replenish stock and record business expenses</p>
          </div>
          <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <ShoppingBag size={28} />
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border shadow-sm space-y-10">
          {/* Product Selector */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">1. Choose Product to Buy</label>
            {selectedProduct ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-100 p-6 rounded-3xl animate-in fade-in slide-in-from-left-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-2xl border flex items-center justify-center overflow-hidden">
                    {selectedProduct.image ? <img src={selectedProduct.image} className="w-full h-full object-cover" /> : <PackagePlus className="text-blue-600" size={24} />}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">{selectedProduct.name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Current Stock: <span className="text-blue-600">{selectedProduct.stock} units</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedProduct(null); setSearchProduct(''); }}
                  className="px-4 py-2 text-xs font-black text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  CHANGE PRODUCT
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search by name, SKU or barcode..."
                  className="w-full pl-12 pr-4 py-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-lg"
                  value={searchProduct}
                  onChange={e => setSearchProduct(e.target.value)}
                />
                {filteredProducts.length > 0 && (
                  <div className="absolute top-full mt-4 left-0 w-full bg-white border rounded-[32px] shadow-2xl z-20 max-h-72 overflow-y-auto p-2">
                    {filteredProducts.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setUnitCost(p.costPrice); }}
                        className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 rounded-2xl transition-colors"
                      >
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-100 rounded-xl border flex items-center justify-center overflow-hidden">
                              {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <PackagePlus className="text-slate-300" size={18} />}
                           </div>
                           <div>
                              <p className="font-black text-slate-800">{p.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.sku}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-black text-blue-600">{p.stock} units</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">2. Quantity Added</label>
              <input 
                type="number" 
                className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-100 outline-none font-black text-2xl text-blue-600"
                placeholder="0"
                value={quantity || ''}
                onChange={e => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">3. Purchase Price (Unit Cost)</label>
              <input 
                type="number" 
                className="w-full px-8 py-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-100 outline-none font-black text-2xl text-slate-700"
                placeholder="0.00"
                value={unitCost || ''}
                onChange={e => setUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">4. Supplier Name</label>
                <div className="relative">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input 
                        type="text" 
                        className="w-full pl-12 pr-4 py-5 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-blue-100 outline-none font-bold"
                        placeholder="Who is the vendor?"
                        value={supplierName}
                        onChange={e => setSupplierName(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">5. Pay from Account (All Accounts)</label>
              <select 
                className={`w-full px-6 py-5 rounded-3xl focus:ring-4 outline-none font-bold text-lg appearance-none transition-all ${hasInsufficientFunds ? 'bg-red-50 border-red-200 focus:ring-red-100 text-red-700' : 'bg-slate-50 border-none focus:ring-blue-100 text-slate-700'}`}
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
              >
                <option value="">Choose Funding Account...</option>
                {data.accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, currency, rate)})</option>
                ))}
              </select>
            </div>
          </div>

          {selectedProduct && selectedAccount && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[32px] border border-slate-100 animate-in zoom-in duration-300">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Inventory Impact</p>
                      <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-600">New Stock Level:</span>
                          <span className="text-xl font-black text-blue-600">{selectedProduct.stock + (quantity || 0)} units</span>
                      </div>
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Financial Impact</p>
                      <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-600">Total Purchase:</span>
                          <span className="text-xl font-black text-red-600">-{formatCurrency(totalPurchaseCost, currency, rate)}</span>
                      </div>
                      {hasInsufficientFunds && (
                        <p className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 mt-1">
                            <AlertCircle size={10} /> Insufficient Balance in {selectedAccount.name}
                        </p>
                      )}
                  </div>
              </div>
          )}

          <div className="pt-6">
            <button 
              onClick={handleStockIn}
              disabled={isProcessing || !selectedProduct || quantity <= 0 || !selectedAccountId || hasInsufficientFunds}
              className="w-full py-6 bg-blue-600 text-white rounded-[32px] font-black text-xl shadow-xl shadow-blue-900/20 hover:bg-blue-700 hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} />
                Submit Purchase
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1 space-y-8">
        <div className="bg-white p-8 rounded-[40px] border shadow-sm">
           <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6">
              <Landmark size={20} className="text-blue-500" />
              Treasury Overview
           </h3>
           <div className="space-y-3">
             {data.accounts.map(acc => (
               <div key={acc.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center group hover:bg-white transition-all">
                 <div className="flex items-center gap-3">
                   {getAccountIcon(acc.name)}
                   <span className="text-xs font-black text-slate-700">{acc.name}</span>
                 </div>
                 <span className="text-sm font-black text-slate-900">{formatCurrency(acc.balance, currency, rate)}</span>
               </div>
             ))}
           </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border shadow-sm h-full flex flex-col">
           <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6">
              <History size={20} className="text-slate-400" />
              Purchase Logs
           </h3>
           <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px] pr-2">
              {recentStockIn.map(log => (
                <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-blue-100 transition-all group">
                   <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-black text-slate-900 truncate max-w-[140px]">{log.productName}</p>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">+{log.quantity}</span>
                   </div>
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter line-clamp-2">{log.reason}</p>
                   <p className="text-[8px] text-slate-300 mt-2">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Purchases;


import React, { useState, useMemo, useEffect } from 'react';
import { AppData, Product, Currency, PaymentMethod, Transaction, CartItem, Customer, Account } from '../types';
import { Search, ShoppingCart, Trash2, Plus, Minus, User, Camera, Phone, CheckCircle2, UserPlus, CreditCard, Wallet, Banknote, Calculator, Printer, X, AlertTriangle, Landmark, Smartphone } from 'lucide-react';
import { formatCurrency, generateId, compressImage } from '../lib/utils';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const POS: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [taxPercent, setTaxPercent] = useState(data.settings.taxRate);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', photo: '' });
  
  // Account routing
  const [incomeAccountId, setIncomeAccountId] = useState<string>('');

  const rate = data.settings.exchangeRate;

  // Auto-select account based on payment method
  useEffect(() => {
    if (showCheckout) {
      let defaultAccount: Account | undefined;
      if (paymentMethod === PaymentMethod.CASH) {
        defaultAccount = data.accounts.find(a => a.name.toLowerCase().includes('cash'));
      } else if (paymentMethod === PaymentMethod.BANK) {
        defaultAccount = data.accounts.find(a => a.name.toLowerCase().includes('bank'));
      } else if (paymentMethod === PaymentMethod.MOBILE_MONEY) {
        defaultAccount = data.accounts.find(a => a.name.toLowerCase().includes('mobile'));
      }
      if (defaultAccount) setIncomeAccountId(defaultAccount.id);
    }
  }, [showCheckout, paymentMethod, data.accounts]);

  // Partial payment inputs
  const [partialCash, setPartialCash] = useState(0);
  const [partialBank, setPartialBank] = useState(0);
  const [partialMobile, setPartialMobile] = useState(0);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase();
    return data.products.filter(p => 
      p.stock > 0 && (
        p.name.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
      )
    );
  }, [data.products, search]);

  const filteredCustomers = useMemo(() => {
    if (!searchCustomer) return [];
    return data.customers.filter(c => 
      c.phone.includes(searchCustomer) || 
      c.name.toLowerCase().includes(searchCustomer.toLowerCase())
    );
  }, [data.customers, searchCustomer]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        const p = data.products.find(prod => prod.id === id);
        if (p && newQty > p.stock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
  const tax = subtotal * (taxPercent / 100);
  const total = subtotal + tax;

  const processSale = () => {
    if (cart.length === 0) return;
    if (!incomeAccountId && paymentMethod !== PaymentMethod.DEBT) {
      return alert("Please select a deposit account for this transaction.");
    }
    if ((paymentMethod === PaymentMethod.DEBT || paymentMethod === PaymentMethod.PARTIAL) && !selectedCustomer) {
      return alert("Debt or Partial payment requires a selected customer profile.");
    }

    const transactionId = generateId();
    let finalDebt = 0;
    let depositAmount = total;
    let details = undefined;

    if (paymentMethod === PaymentMethod.DEBT) {
      finalDebt = total;
      depositAmount = 0;
    } else if (paymentMethod === PaymentMethod.PARTIAL) {
      const received = (partialCash + partialBank + partialMobile);
      finalDebt = total - received;
      depositAmount = received;
      details = { cash: partialCash, bank: partialBank, mobile: partialMobile, debt: finalDebt };
    }

    const transaction: Transaction = {
      id: transactionId,
      items: [...cart],
      subtotal,
      tax,
      total,
      currency,
      exchangeRate: rate,
      paymentMethod,
      accountId: incomeAccountId, // Track account for reversal
      paymentDetails: details,
      customerId: selectedCustomer?.id,
      timestamp: Date.now(),
      type: 'SALE'
    };

    setData(prev => ({
      ...prev,
      transactions: [...prev.transactions, transaction],
      products: prev.products.map(p => {
        const ci = cart.find(item => item.id === p.id);
        return ci ? { ...p, stock: p.stock - ci.quantity } : p;
      }),
      // Accounting: Add money to selected account
      accounts: depositAmount > 0 ? prev.accounts.map(a => 
        a.id === incomeAccountId ? { ...a, balance: a.balance + depositAmount } : a
      ) : prev.accounts,
      customers: prev.customers.map(c => {
        if (c.id === selectedCustomer?.id) {
          return {
            ...c,
            debtBalance: c.debtBalance + finalDebt,
            loyaltyPoints: c.loyaltyPoints + Math.floor(total),
            history: [...c.history, transactionId]
          };
        }
        return c;
      })
    }));

    const accountName = data.accounts.find(a => a.id === incomeAccountId)?.name || 'N/A';
    addLog('POS Transaction', `Sale #${transactionId.slice(-5)} processed. Income: ${formatCurrency(depositAmount, currency, rate)} to ${accountName}`);
    
    setLastTransaction(transaction);
    setCart([]);
    setShowCheckout(false);
    setShowReceipt(true);
    setSelectedCustomer(null);
    setSearchCustomer('');
    setPartialCash(0);
    setPartialBank(0);
    setPartialMobile(0);
  };

  const printReceipt = () => {
    window.print();
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setLastTransaction(null);
  };

  const createCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) return alert("Missing name/phone");
    const existing = data.customers.find(c => c.phone === newCustomer.phone);
    if (existing) {
      setSelectedCustomer(existing);
    } else {
      const cust: Customer = {
        id: newCustomer.phone,
        name: newCustomer.name,
        phone: newCustomer.phone,
        photo: newCustomer.photo,
        debtBalance: 0,
        loyaltyPoints: 0,
        history: []
      };
      setData(prev => ({ ...prev, customers: [...prev.customers, cust] }));
      setSelectedCustomer(cust);
    }
    setIsAddingCustomer(false);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-4 bg-white shadow-sm border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="bg-white px-6 rounded-2xl border shadow-sm flex items-center gap-4">
             <Calculator size={20} className="text-slate-400" />
             <div className="flex flex-col">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
               <div className="text-sm font-bold text-slate-900">{formatCurrency(total, currency, rate)}</div>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-2">
          {filteredProducts.map(p => (
            <button 
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white p-4 rounded-2xl border border-transparent hover:border-blue-500 hover:shadow-xl transition-all text-left flex flex-col gap-3 group active:scale-95"
            >
              <div className="aspect-square rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center border relative">
                {p.image ? (
                  <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                    <ShoppingCart size={24} />
                  </div>
                )}
                {p.stock < 10 && (
                  <div className={`absolute top-2 right-2 px-2 py-1 flex items-center gap-1 text-white text-[8px] font-black rounded-lg shadow-sm ${p.stock < 5 ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'}`}>
                    {p.stock < 5 ? <AlertTriangle size={8} /> : null}
                    {p.stock < 5 ? 'CRITICAL' : 'LOW STOCK'}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-800 line-clamp-1 text-sm">{p.name}</p>
                <div className="flex justify-between items-center">
                  <span className="text-blue-600 font-black text-sm">{formatCurrency(p.sellPrice, currency, rate)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-black ${p.stock < 5 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>{p.stock} units</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="w-[420px] bg-white border-l shadow-2xl flex flex-col no-print overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <ShoppingCart size={20} className="text-blue-600" /> Cart Contents
          </h3>
          <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-full">{cart.length}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-lg border bg-slate-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <ShoppingCart size={20} className="text-slate-200" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                <p className="text-xs font-black text-blue-600">{formatCurrency(item.sellPrice, currency, rate)}</p>
              </div>
              <div className="flex items-center bg-slate-100 rounded-xl p-1">
                <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 hover:bg-white rounded-lg transition-colors"><Minus size={14}/></button>
                <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 hover:bg-white rounded-lg transition-colors"><Plus size={14}/></button>
              </div>
              <button onClick={() => updateQuantity(item.id, -item.quantity)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-40 flex flex-col items-center justify-center text-slate-300 opacity-40">
              <ShoppingCart size={40} className="mb-2" />
              <p className="text-xs font-black uppercase">Cart is empty</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Customer Attribution</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-blue-600 text-white p-4 rounded-2xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden border-2 border-blue-400">
                    {selectedCustomer.photo ? <img src={selectedCustomer.photo} className="w-full h-full object-cover" /> : <User size={20} />}
                  </div>
                  <div>
                    <p className="text-sm font-black">{selectedCustomer.name}</p>
                    <p className="text-[10px] opacity-75">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-blue-700 rounded-full"><Plus className="rotate-45" size={16} /></button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Find customer..."
                  className="w-full pl-10 pr-12 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                  value={searchCustomer}
                  onChange={e => setSearchCustomer(e.target.value)}
                />
                <button onClick={() => setIsAddingCustomer(true)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-200 text-blue-700 rounded-lg"><UserPlus size={16} /></button>
                {filteredCustomers.length > 0 && (
                  <div className="absolute bottom-full mb-2 left-0 w-full bg-white border rounded-2xl shadow-2xl overflow-hidden z-20 max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button key={c.id} onClick={() => {setSelectedCustomer(c); setSearchCustomer('');}} className="w-full p-4 text-left flex items-center gap-3 hover:bg-slate-50 border-b">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                          {c.photo ? <img src={c.photo} className="w-full h-full object-cover" /> : <User size={18} className="text-slate-300" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-bold">Subtotal</span>
              <span className="font-black text-slate-900">{formatCurrency(subtotal, currency, rate)}</span>
            </div>
            <div className="flex justify-between text-2xl font-black text-slate-900 pt-2">
              <span>Total</span>
              <span>{formatCurrency(total, currency, rate)}</span>
            </div>
          </div>

          <button 
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)}
            className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-900/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            Go to Payment
          </button>
        </div>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md no-print">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 bg-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Checkout</h3>
                <p className="opacity-75 font-medium text-sm">Select method and destination account</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-widest opacity-60">Amount Due</p>
                <h2 className="text-4xl font-black">{formatCurrency(total, currency, rate)}</h2>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { id: PaymentMethod.CASH, icon: Banknote, label: 'Cash' },
                  { id: PaymentMethod.BANK, icon: CreditCard, label: 'Bank' },
                  { id: PaymentMethod.MOBILE_MONEY, icon: Smartphone, label: 'Mobile' },
                  { id: PaymentMethod.DEBT, icon: Wallet, label: 'Debt' },
                  { id: PaymentMethod.PARTIAL, icon: Calculator, label: 'Partial' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${paymentMethod === method.id ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg' : 'border-slate-100 hover:border-slate-300 text-slate-500'}`}
                  >
                    <method.icon size={20} />
                    <span className="text-[10px] font-black uppercase">{method.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                {paymentMethod !== PaymentMethod.DEBT && (
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                        <Landmark size={12} /> Deposit Income To Account (All Accounts)
                      </label>
                      <select 
                        className="w-full px-6 py-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        value={incomeAccountId}
                        onChange={e => setIncomeAccountId(e.target.value)}
                      >
                        <option value="">Choose Account...</option>
                        {data.accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, currency, rate)})</option>
                        ))}
                      </select>
                   </div>
                )}

                {paymentMethod === PaymentMethod.PARTIAL && (
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 grid grid-cols-3 gap-4 col-span-2">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Cash Portion</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-white border-none rounded-xl font-bold"
                        value={partialCash}
                        onChange={e => setPartialCash(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Bank Portion</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-white border-none rounded-xl font-bold"
                        value={partialBank}
                        onChange={e => setPartialBank(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Mobile Portion</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-white border-none rounded-xl font-bold"
                        value={partialMobile}
                        onChange={e => setPartialMobile(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                 <button onClick={() => setShowCheckout(false)} className="flex-1 py-5 font-black text-slate-400 hover:text-slate-600">Back</button>
                 <button onClick={processSale} className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black text-xl shadow-xl shadow-blue-900/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95">
                    Confirm & Complete
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md no-print">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
             <div className="p-8 border-b flex items-center justify-between bg-slate-50">
                <h3 className="text-xl font-black text-slate-800">Invoice Complete</h3>
                <button onClick={closeReceipt} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
             </div>
             <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                   <CheckCircle2 size={32} />
                </div>
                <h2 className="text-3xl font-black">{formatCurrency(lastTransaction.total, currency, rate)}</h2>
                <p className="text-slate-500 font-medium">Transaction #INV-{lastTransaction.id.slice(-5).toUpperCase()}</p>
                <div className="pt-6 flex gap-3">
                   <button onClick={closeReceipt} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl">Close</button>
                   <button onClick={printReceipt} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2">
                      <Printer size={18} /> Print
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {isAddingCustomer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md no-print">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden p-8 space-y-6 animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Quick Register</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Full Name</label>
                  <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                  <input type="tel" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsAddingCustomer(false)} className="flex-1 py-4 font-bold text-slate-400">Cancel</button>
                <button onClick={createCustomer} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">Save</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default POS;

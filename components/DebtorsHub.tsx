
import React, { useState, useMemo } from 'react';
import { AppData, Currency, Customer, PaymentMethod, Transaction } from '../types';
import { formatCurrency, generateId } from '../lib/utils';
import { Users, Phone, Wallet, X, CheckCircle2, Banknote, CreditCard, Landmark, Smartphone } from 'lucide-react';

interface Props {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  addLog: (action: string, details: string) => void;
  currency: Currency;
}

const DebtorsHub: React.FC<Props> = ({ data, setData, addLog, currency }) => {
  const rate = data.settings.exchangeRate;
  const [selectedForPayment, setSelectedForPayment] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const debtors = useMemo(() => {
    return data.customers.filter(c => c.debtBalance > 0);
  }, [data.customers]);

  const handleReceivePayment = () => {
    if (!selectedForPayment) return;
    if (!targetAccountId) return alert("Please select an account to deposit this payment into.");
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return alert("Please enter a valid amount");
    if (amount > selectedForPayment.debtBalance) return alert("Payment amount cannot exceed balance");

    setIsProcessing(true);

    const txId = generateId();
    const newTransaction: Transaction = {
      id: txId,
      items: [],
      subtotal: amount,
      tax: 0,
      total: amount,
      currency: currency,
      exchangeRate: rate,
      paymentMethod: paymentMethod,
      customerId: selectedForPayment.id,
      timestamp: Date.now(),
      type: 'DEBT_PAYMENT'
    };

    const targetAccount = data.accounts.find(a => a.id === targetAccountId);

    setData(prev => ({
      ...prev,
      transactions: [...prev.transactions, newTransaction],
      customers: prev.customers.map(c => 
        c.id === selectedForPayment.id 
          ? { 
              ...c, 
              debtBalance: Math.max(0, c.debtBalance - amount),
              history: [...c.history, txId]
            } 
          : c
      ),
      accounts: prev.accounts.map(a => 
        a.id === targetAccountId ? { ...a, balance: a.balance + amount } : a
      )
    }));

    addLog('Debt Payment', `Received ${formatCurrency(amount, currency, rate)} from ${selectedForPayment.name} via ${paymentMethod}. Deposited to ${targetAccount?.name}`);
    
    // Cleanup
    setIsProcessing(false);
    setSelectedForPayment(null);
    setPaymentAmount('');
    setTargetAccountId('');
    alert("Payment recorded and account balance updated successfully!");
  };

  return (
    <div className="p-6 relative min-h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Debtors Hub</h1>
          <p className="text-slate-500 font-medium text-sm">Monitor and collect outstanding customer balances</p>
        </div>
        <div className="bg-amber-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-amber-900/20 flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none">Total Receivables</span>
          <span className="text-xl font-black">{formatCurrency(debtors.reduce((acc, d) => acc + d.debtBalance, 0), currency, rate)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debtors.map(debtor => (
          <div key={debtor.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300">
            <div className="p-6 flex items-center gap-4 bg-slate-50 border-b">
              <div className="w-16 h-16 rounded-2xl bg-white border overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                {debtor.photo ? (
                  <img src={debtor.photo} className="w-full h-full object-cover" />
                ) : (
                  <Users className="text-slate-200" size={32} />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-800 tracking-tight leading-tight">{debtor.name}</h3>
                <p className="flex items-center gap-1 text-xs text-slate-500 font-bold mt-1">
                  <Phone size={10} />
                  {debtor.phone}
                </p>
              </div>
            </div>
            
            <div className="p-6 flex-1 space-y-4">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 group-hover:bg-amber-100 transition-colors">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Unpaid Balance</p>
                <h4 className="text-3xl font-black text-amber-700">{formatCurrency(debtor.debtBalance, currency, rate)}</h4>
              </div>
              
              <button 
                onClick={() => {
                  setSelectedForPayment(debtor);
                  setPaymentAmount(debtor.debtBalance.toString());
                  // Set default account based on typical usage
                  const defaultAcc = data.accounts.find(a => a.name.toLowerCase().includes('cash'))?.id || '';
                  setTargetAccountId(defaultAcc);
                }}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <Wallet size={18} />
                Receive Payment
              </button>
            </div>
          </div>
        ))}

        {debtors.length === 0 && (
          <div className="col-span-full py-32 text-center flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 opacity-60">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <p className="text-slate-500 font-black text-xl uppercase tracking-widest">No Debtors Found</p>
            <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">All accounts are currently cleared. High fives all around!</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedForPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Receive Payment</h3>
                <p className="opacity-75 font-medium text-xs">Clearing debt for {selectedForPayment.name}</p>
              </div>
              <button onClick={() => setSelectedForPayment(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-3xl border text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Owed</p>
                <h4 className="text-3xl font-black text-slate-800">{formatCurrency(selectedForPayment.debtBalance, currency, rate)}</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Payment Amount ({currency})</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      max={selectedForPayment.debtBalance}
                      className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-black text-xl text-blue-600 focus:ring-2 focus:ring-blue-500"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                    />
                    <button 
                      onClick={() => setPaymentAmount(selectedForPayment.debtBalance.toString())}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                    >
                      PAY FULL
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Deposit To Account</label>
                  <select 
                    className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl outline-none font-bold text-slate-700"
                    value={targetAccountId}
                    onChange={e => setTargetAccountId(e.target.value)}
                  >
                    <option value="">Choose Account...</option>
                    {data.accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance, currency, rate)})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: PaymentMethod.CASH, icon: Banknote, label: 'Cash' },
                      { id: PaymentMethod.BANK, icon: Landmark, label: 'Bank' },
                      { id: PaymentMethod.MOBILE_MONEY, icon: Smartphone, label: 'Mobile' }
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${paymentMethod === method.id ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                      >
                        <method.icon size={18} />
                        <span className="text-[8px] font-black uppercase">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setSelectedForPayment(null)}
                  className="flex-1 py-4 font-black text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReceivePayment}
                  disabled={isProcessing}
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-900/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtorsHub;

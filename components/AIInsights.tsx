import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppData } from '../types';
import { BrainCircuit, Send, Sparkles, Loader2 } from 'lucide-react';

interface Props {
  data: AppData;
}

const AIInsights: React.FC<Props> = ({ data }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getAIAnalysis = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stats = {
        totalProducts: data.products.length,
        totalSales: data.transactions.length,
        totalRevenue: data.transactions.reduce((a, b) => a + b.total, 0),
        debtors: data.customers.filter(c => c.debtBalance > 0).length,
        totalDebt: data.customers.reduce((a, b) => a + b.debtBalance, 0),
        inventoryCostValue: data.products.reduce((a, b) => a + (b.costPrice * b.stock), 0),
        expensesTotal: data.expenses.reduce((a, b) => a + b.amount, 0)
      };

      const systemInstruction = `
        You are an Expert Business Intelligence Assistant for an ERP/POS system.
        Analyze sales, debt, inventory, and expenses to provide actionable growth strategies.
        Keep responses concise, professional, and data-driven.
        Use Markdown formatting for clarity (bold, lists).
      `;

      const prompt = `
        BUSINESS DATA FOR ANALYSIS:
        - Total Products in Catalog: ${stats.totalProducts}
        - Total Transactions Recorded: ${stats.totalSales}
        - Gross Revenue: ${stats.totalRevenue} USD
        - Inventory Asset Value (at cost): ${stats.inventoryCostValue} USD
        - Cumulative Operating Expenses: ${stats.expensesTotal} USD
        - Estimated Profit Margin (vs COGS/Expenses): ${stats.totalRevenue - (stats.inventoryCostValue * 0.2) - stats.expensesTotal} USD
        - Outstanding Receivables: ${stats.totalDebt} USD from ${stats.debtors} active debtors.

        USER REQUEST: "${query}"
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      // Correctly access .text property from GenerateContentResponse
      setResponse(result.text || "I was unable to process your request at this time.");
    } catch (err) {
      console.error('AI Insight Error:', err);
      setResponse("There was an error communicating with the intelligence engine. Please ensure you have a valid network connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-12 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 bg-blue-600 text-white rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-blue-900/20 ring-4 ring-blue-50">
          <BrainCircuit size={48} />
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">AI Intelligence Hub</h1>
        <p className="text-slate-500 font-medium max-w-lg mx-auto leading-relaxed">
          Your personal data analyst. Ask about your financial health, inventory risks, or growth opportunities.
        </p>
      </div>

      <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-slate-100 space-y-10">
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Ask about your business... (e.g., 'How can I improve my profit margin?')"
            className="w-full pl-8 pr-36 py-7 bg-slate-50 border-none rounded-[32px] focus:ring-4 focus:ring-blue-100 outline-none text-xl font-bold placeholder:text-slate-300 transition-all"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && getAIAnalysis()}
          />
          <button 
            onClick={getAIAnalysis}
            disabled={loading || !query.trim()}
            className="absolute right-4 top-1/2 -translate-y-1/2 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            Analyze
          </button>
        </div>

        {response && (
          <div className="bg-blue-50/30 p-10 rounded-[40px] border border-blue-100/50 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center gap-3 text-blue-600 mb-6 font-black uppercase tracking-widest text-xs">
              <Sparkles size={18} />
              Intelligent Insight
            </div>
            <div className="prose prose-slate max-w-none">
              <div className="text-slate-700 leading-relaxed font-medium text-lg whitespace-pre-wrap">
                {response}
              </div>
            </div>
          </div>
        )}

        {!response && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button 
              onClick={() => {setQuery("Provide a summary of my current business health based on the stats provided.");}} 
              className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 text-left hover:bg-white hover:border-blue-200 hover:shadow-xl transition-all group"
            >
              <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors">Business Health Audit</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">Instant executive summary of your current KPIs</p>
            </button>
            <button 
              onClick={() => {setQuery("Analyze my current debtors and suggest a collection strategy.");}} 
              className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 text-left hover:bg-white hover:border-blue-200 hover:shadow-xl transition-all group"
            >
              <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors">Debt Risk Analysis</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">Evaluate receivables and risk of defaults</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;
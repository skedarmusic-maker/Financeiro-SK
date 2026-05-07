"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

interface Transaction {
  id: string;
  amount: number;
  type: "in" | "out";
  category: string;
  description: string;
  created_at: string;
}

interface CategoryTotal {
  name: string;
  total: number;
  percent: number;
  transactions: Transaction[];
}

interface MonthData {
  label: string;
  month: number;
  year: number;
  income: number;
  expense: number;
  incomeHeight: string;
  expenseHeight: string;
}

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryTotal[]>([]);
  const [monthlyFlow, setMonthlyFlow] = useState<MonthData[]>([]);
  const [stats, setStats] = useState({ income: 0, expense: 0, result: 0 });
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [detailedCategory, setDetailedCategory] = useState<CategoryTotal | null>(null);

  const router = useRouter();

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const shortMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !transactions) {
      setLoading(false);
      return;
    }

    setAllTransactions(transactions);
    calculateData(transactions, selectedMonth, selectedYear);
    setLoading(false);
  };

  const calculateData = (transactions: Transaction[], month: number, year: number) => {
    // --- FILTRAR POR MÊS/ANO SELECIONADO ---
    const filteredTxs = transactions.filter(tx => {
      const d = new Date(tx.created_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    // --- STATS MACRO ---
    const totalIncome = filteredTxs.filter(tx => tx.type === 'in').reduce((acc, tx) => acc + tx.amount, 0);
    const totalExpense = filteredTxs.filter(tx => tx.type === 'out').reduce((acc, tx) => acc + tx.amount, 0);
    
    setStats({
      income: totalIncome,
      expense: totalExpense,
      result: totalIncome - totalExpense
    });

    // --- CATEGORIAS ---
    const categoryMap: Record<string, { total: number, txs: Transaction[] }> = {};
    let allExpenses = 0;

    filteredTxs.filter(tx => tx.type === 'out').forEach(tx => {
      if (!categoryMap[tx.category]) categoryMap[tx.category] = { total: 0, txs: [] };
      categoryMap[tx.category].total += tx.amount;
      categoryMap[tx.category].txs.push(tx);
      allExpenses += tx.amount;
    });

    const breakdown = Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        total: data.total,
        transactions: data.txs,
        percent: allExpenses > 0 ? (data.total / allExpenses) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
    
    setCategoryBreakdown(breakdown);

    // --- FLUXO MENSAL (Últimos 12 meses do histórico) ---
    const flowMap: Record<string, { in: number, out: number, month: number, year: number }> = {};
    
    transactions.forEach(tx => {
      const d = new Date(tx.created_at);
      const key = `${d.getMonth()}-${d.getFullYear()}`;
      if (!flowMap[key]) flowMap[key] = { in: 0, out: 0, month: d.getMonth(), year: d.getFullYear() };
      if (tx.type === 'in') flowMap[key].in += tx.amount;
      else flowMap[key].out += tx.amount;
    });

    const sortedFlowKeys = Object.keys(flowMap).sort((a, b) => {
        const [m1, y1] = a.split('-').map(Number);
        const [m2, y2] = b.split('-').map(Number);
        return y1 !== y2 ? y1 - y2 : m1 - m2;
    });

    const lastMonths = sortedFlowKeys.slice(-6);
    const maxVal = Math.max(...sortedFlowKeys.map(k => Math.max(flowMap[k].in, flowMap[k].out)), 1000);

    setMonthlyFlow(lastMonths.map(key => ({
      label: `${shortMonths[flowMap[key].month]}`,
      month: flowMap[key].month,
      year: flowMap[key].year,
      income: flowMap[key].in,
      expense: flowMap[key].out,
      incomeHeight: `${(flowMap[key].in / maxVal) * 100}%`,
      expenseHeight: `${(flowMap[key].out / maxVal) * 100}%`
    })));
  };

  useEffect(() => {
    setHasMounted(true);
    fetchData();
  }, []);

  useEffect(() => {
    if (allTransactions.length > 0) {
      calculateData(allTransactions, selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear]);

  if (!hasMounted) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 px-6 py-12 md:px-12 lg:px-24">
        
        {/* Cabeçalho e Filtros */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter md:text-5xl uppercase">Relatórios</h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">Visão Macro e Detalhamento</p>
          </div>
          
          <div className="flex gap-2">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-surface border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest outline-none focus:border-primary sharp-border cursor-pointer"
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-surface border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest outline-none focus:border-primary sharp-border cursor-pointer"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface p-8 sharp-border border border-border group hover:border-primary transition-colors">
                <p className="font-mono text-[9px] uppercase text-muted tracking-widest mb-2">Receitas no Mês</p>
                <p className="text-3xl font-black text-primary">R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-surface p-8 sharp-border border border-border group hover:border-white transition-colors">
                <p className="font-mono text-[9px] uppercase text-muted tracking-widest mb-2">Despesas no Mês</p>
                <p className="text-3xl font-black text-white">R$ {stats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className={`p-8 sharp-border border transition-all ${stats.result >= 0 ? 'bg-primary/10 border-primary/20 hover:bg-primary/20' : 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'}`}>
                <p className="font-mono text-[9px] uppercase text-muted tracking-widest mb-2">Resultado Líquido</p>
                <p className={`text-3xl font-black ${stats.result >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {stats.result >= 0 ? '+' : ''} R$ {stats.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
            </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Fluxo de Caixa */}
          <div className="col-span-12 lg:col-span-8 bg-surface p-6 md:p-10 sharp-border min-h-[450px] flex flex-col relative overflow-hidden group">
            <h3 className="font-mono text-[10px] uppercase text-muted tracking-widest mb-8">Fluxo Histórico (6 meses)</h3>
            
            <div className="flex-1 w-full border-b border-l border-border relative flex items-end justify-between px-2 md:px-8 pt-10">
               {monthlyFlow.map((bar, i) => (
                   <div 
                    key={i} 
                    onClick={() => { setSelectedMonth(bar.month); setSelectedYear(bar.year); }}
                    className={`flex flex-col items-center w-[14%] h-full justify-end group/bar cursor-pointer transition-all ${selectedMonth === bar.month && selectedYear === bar.year ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                   >
                      <div className="flex items-end gap-1 w-full h-full justify-center">
                        <div className="w-1/3 bg-primary sharp-border" style={{ height: bar.incomeHeight }}></div>
                        <div className="w-1/3 bg-white sharp-border" style={{ height: bar.expenseHeight }}></div>
                      </div>
                      <span className={`mt-4 font-mono text-[10px] uppercase ${selectedMonth === bar.month && selectedYear === bar.year ? 'text-primary font-bold' : 'text-muted'}`}>
                        {bar.label}
                      </span>
                   </div>
               ))}
            </div>
          </div>

          {/* Categorias com Drill-down */}
          <div className="col-span-12 lg:col-span-4 bg-surface p-6 md:p-10 sharp-border flex flex-col">
             <h3 className="font-mono text-[10px] uppercase text-muted tracking-widest mb-8">Onde está indo o dinheiro?</h3>
             
             <div className="flex flex-col gap-6 flex-1">
               {loading ? (
                 <p className="font-mono text-[10px] uppercase text-muted">Analisando...</p>
               ) : categoryBreakdown.length === 0 ? (
                 <p className="font-mono text-[10px] uppercase text-muted text-center py-10 border border-dashed border-border">Nenhuma despesa este mês.</p>
               ) : (
                 categoryBreakdown.map((item, i) => (
                   <div 
                    key={i} 
                    onClick={() => setDetailedCategory(item)}
                    className="group cursor-pointer p-4 -m-4 hover:bg-background transition-colors sharp-border"
                   >
                     <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest mb-3">
                       <span className="group-hover:text-primary transition-colors flex items-center gap-2">
                        {item.name} <span className="text-[8px] text-muted opacity-0 group-hover:opacity-100">[ ver tudo ]</span>
                       </span>
                       <span className="font-bold text-foreground">R$ {item.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                     </div>
                     <div className="w-full h-1 bg-background sharp-border overflow-hidden">
                       <div 
                        className={`h-full transition-all duration-1000 ease-out ${i === 0 ? 'bg-primary' : 'bg-muted group-hover:bg-white'}`} 
                        style={{ width: `${item.percent}%` }}
                       ></div>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      </main>

      {/* MODAL DE DETALHAMENTO (Drill-down) */}
      {detailedCategory && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-background/90 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-surface border-2 border-primary p-8 sharp-border max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-primary">{detailedCategory.name}</h2>
                        <p className="font-mono text-[10px] uppercase text-muted tracking-[0.2em]">Detalhamento de gastos no mês</p>
                    </div>
                    <button 
                        onClick={() => setDetailedCategory(null)}
                        className="font-mono text-[10px] uppercase text-muted hover:text-white"
                    > [ Fechar ] </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <table className="w-full text-left font-mono text-xs uppercase tracking-tight">
                        <thead className="text-muted border-b border-border">
                            <tr>
                                <th className="py-4 font-normal">Data</th>
                                <th className="py-4 font-normal">Descrição</th>
                                <th className="py-4 font-normal text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {detailedCategory.transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-background/50 transition-colors">
                                    <td className="py-4 text-muted">{new Date(tx.created_at).toLocaleDateString('pt-BR')}</td>
                                    <td className="py-4 font-bold">{tx.description}</td>
                                    <td className="py-4 text-right font-black">R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
                    <p className="font-mono text-[10px] uppercase text-muted">Total da Categoria</p>
                    <p className="text-2xl font-black">R$ {detailedCategory.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>
        </div>,
        document.body
      )}
    </div>
  );
}

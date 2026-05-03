"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Transaction {
  amount: number;
  type: "in" | "out";
  category: string;
  created_at: string;
}

interface CategoryTotal {
  name: string;
  total: number;
  percent: number;
}

interface MonthData {
  label: string;
  income: number;
  expense: number;
  incomeHeight: string;
  expenseHeight: string;
}

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryTotal[]>([]);
  const [monthlyFlow, setMonthlyFlow] = useState<MonthData[]>([]);
  const [stats, setStats] = useState({ income: 0, expense: 0, result: 0 });
  const router = useRouter();

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

    // --- CÁLCULO STATS MACRO (Últimos 30 dias) ---
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const recentTxs = transactions.filter(tx => new Date(tx.created_at) >= thirtyDaysAgo);
    const totalIncome = recentTxs.filter(tx => tx.type === 'in').reduce((acc, tx) => acc + tx.amount, 0);
    const totalExpense = recentTxs.filter(tx => tx.type === 'out').reduce((acc, tx) => acc + tx.amount, 0);
    
    setStats({
      income: totalIncome,
      expense: totalExpense,
      result: totalIncome - totalExpense
    });

    // --- CÁLCULO CATEGORIAS (Total Histórico) ---
    const categoryMap: Record<string, number> = {};
    let allExpenses = 0;

    transactions.filter(tx => tx.type === 'out').forEach(tx => {
      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
      allExpenses += tx.amount;
    });

    const breakdown = Object.entries(categoryMap)
      .map(([name, total]) => ({
        name,
        total,
        percent: allExpenses > 0 ? (total / allExpenses) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);
    
    setCategoryBreakdown(breakdown);

    // --- CÁLCULO FLUXO MENSAL (Últimos 6 meses) ---
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const flow: Record<string, { in: number, out: number }> = {};
    
    transactions.forEach(tx => {
      const d = new Date(tx.created_at);
      const key = `${months[d.getMonth()]}`;
      if (!flow[key]) flow[key] = { in: 0, out: 0 };
      if (tx.type === 'in') flow[key].in += tx.amount;
      else flow[key].out += tx.amount;
    });

    const last6MonthsKeys = Object.keys(flow).slice(-6);
    const maxVal = Math.max(...Object.values(flow).map(v => Math.max(v.in, v.out)), 1000);

    setMonthlyFlow(last6MonthsKeys.map(key => ({
      label: key,
      income: flow[key].in,
      expense: flow[key].out,
      incomeHeight: `${(flow[key].in / maxVal) * 100}%`,
      expenseHeight: `${(flow[key].out / maxVal) * 100}%`
    })));

    setLoading(false);
  };

  useEffect(() => {
    setHasMounted(true);
    fetchData();
  }, []);

  if (!hasMounted) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 px-6 py-12 md:px-12 lg:px-24">
        
        {/* Cabeçalho e Stats Macro */}
        <div className="mb-12 grid gap-8 lg:grid-cols-12 items-end">
          <div className="lg:col-span-4">
            <h1 className="text-4xl font-black tracking-tighter md:text-5xl uppercase">Relatórios</h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">Visão Macro e Fluxo de Caixa</p>
          </div>
          
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface p-6 sharp-border border border-border">
                <p className="font-mono text-[9px] uppercase text-muted tracking-widest mb-1">Receitas (30d)</p>
                <p className="text-2xl font-black text-primary">R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-surface p-6 sharp-border border border-border">
                <p className="font-mono text-[9px] uppercase text-muted tracking-widest mb-1">Despesas (30d)</p>
                <p className="text-2xl font-black text-white">R$ {stats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className={`p-6 sharp-border border ${stats.result >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <p className="font-mono text-[9px] uppercase text-muted tracking-widest mb-1">Resultado Líquido</p>
                <p className={`text-2xl font-black ${stats.result >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {stats.result >= 0 ? '+' : ''} R$ {stats.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* Fluxo de Caixa (Entradas vs Saídas) */}
          <div className="col-span-12 lg:col-span-8 bg-surface p-6 md:p-10 sharp-border min-h-[450px] flex flex-col relative overflow-hidden group">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
              <div>
                <h3 className="font-mono text-[10px] uppercase text-muted tracking-widest mb-2">Fluxo de Caixa Mensal</h3>
                <div className="flex gap-4 font-mono text-[9px] uppercase">
                    <span className="flex items-center gap-1 text-primary"><div className="w-2 h-2 bg-primary"></div> Entradas</span>
                    <span className="flex items-center gap-1 text-muted"><div className="w-2 h-2 bg-white"></div> Saídas</span>
                </div>
              </div>
            </div>
            
            {/* Chart Area */}
            <div className="flex-1 w-full border-b border-l border-border relative flex items-end justify-between px-2 md:px-8 pt-10">
               <div className="absolute top-1/4 left-0 w-full border-t border-border/30 border-dashed"></div>
               <div className="absolute top-2/4 left-0 w-full border-t border-border/30 border-dashed"></div>
               <div className="absolute top-3/4 left-0 w-full border-t border-border/30 border-dashed"></div>

               {loading ? (
                 <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase text-muted">Carregando fluxo...</div>
               ) : monthlyFlow.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase text-muted">Dados insuficientes</div>
               ) : (
                 monthlyFlow.map((bar, i) => (
                   <div key={i} className="flex flex-col items-center w-[14%] h-full justify-end group/bar">
                      <div className="flex items-end gap-1 w-full h-full justify-center">
                        {/* Barra de Entrada */}
                        <div 
                            className="w-1/3 bg-primary transition-all duration-700 ease-out sharp-border hover:brightness-110" 
                            style={{ height: bar.incomeHeight }}
                            title={`Entrada: R$ ${bar.income}`}
                        ></div>
                        {/* Barra de Saída */}
                        <div 
                            className="w-1/3 bg-white transition-all duration-700 ease-out sharp-border hover:brightness-90" 
                            style={{ height: bar.expenseHeight }}
                            title={`Saída: R$ ${bar.expense}`}
                        ></div>
                      </div>
                      <span className="mt-4 font-mono text-[10px] text-muted uppercase">{bar.label}</span>
                   </div>
                 ))
               )}
            </div>
          </div>

          {/* Onde está indo o dinheiro (Categorias) */}
          <div className="col-span-12 lg:col-span-4 bg-surface p-6 md:p-10 sharp-border flex flex-col">
             <h3 className="font-mono text-[10px] uppercase text-muted tracking-widest mb-8">Onde está indo o dinheiro?</h3>
             
             <div className="flex flex-col gap-8 flex-1">
               {loading ? (
                 <p className="font-mono text-[10px] uppercase text-muted">Analisando categorias...</p>
               ) : categoryBreakdown.length === 0 ? (
                 <p className="font-mono text-[10px] uppercase text-muted">Nenhuma despesa para analisar.</p>
               ) : (
                 categoryBreakdown.slice(0, 5).map((item, i) => (
                   <div key={i} className="group cursor-default">
                     <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest mb-3">
                       <span className="group-hover:text-primary transition-colors">{item.name}</span>
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

             <div className="mt-8 pt-8 border-t border-border bg-background p-6 sharp-border">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted mb-4 italic">
                  "O controle financeiro não é sobre quanto você ganha, mas sobre quanto você mantém."
                </p>
                {stats.result < 0 && (
                    <div className="bg-red-500/20 border border-red-500/50 p-4 sharp-border">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">⚠️ ALERTA DE FLUXO</p>
                        <p className="text-xs mt-1">Seus gastos superaram suas receitas nos últimos 30 dias.</p>
                    </div>
                )}
             </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImportDialog } from "@/components/ImportDialog";

interface Transaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: "in" | "out";
  created_at: string;
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialBalance, setInitialBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth");
      return;
    }

    // Busca Perfil (Saldo Inicial)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("initial_balance")
      .maybeSingle(); // maybeSingle é melhor que single() para evitar erro se não houver registro
    
    if (profile) {
      setInitialBalance(profile.initial_balance);
    } else if (profileError) {
      console.warn("Perfil não encontrado ou erro:", profileError);
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar dados:", error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    setHasMounted(true);
    fetchData();
  }, []);

  // Cálculos
  const totalBalance = initialBalance + transactions.reduce((acc, tx) => {
    return tx.type === "in" ? acc + tx.amount : acc - tx.amount;
  }, 0);

  const monthlyIncome = transactions
    .filter(tx => tx.type === "in")
    .reduce((acc, tx) => acc + tx.amount, 0);

  const monthlyExpense = transactions
    .filter(tx => tx.type === "out")
    .reduce((acc, tx) => acc + tx.amount, 0);

  const recentTransactions = transactions.slice(0, 4);

  if (!hasMounted) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <Header />

      <main className="flex-1 px-6 py-12 md:px-12 lg:px-24">
        
        {/* HERO BALANCE */}
        <section className="mb-16 flex flex-col items-start gap-2">
          <p className="font-mono text-sm uppercase tracking-widest text-muted">
            Saldo Disponível
          </p>
          <h1 className="text-5xl font-black tracking-tighter md:text-7xl lg:text-8xl">
            {loading ? "R$ ---" : (
              <>
                R$ {Math.abs(totalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                <span className={totalBalance < 0 ? "text-red-500" : "text-primary"}>
                  {totalBalance < 0 ? " (Devedor)" : ""}
                </span>
              </>
            )}
          </h1>
          <div className="mt-4 flex items-center gap-6 font-mono text-xs uppercase tracking-wide">
            <span className="flex items-center gap-1 text-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Conectado ao Supabase
            </span>
            <button 
              onClick={async () => {
                const newValue = prompt("Digite o saldo inicial da sua conta (ex: 19.84):", initialBalance.toString());
                if (newValue !== null) {
                  const num = parseFloat(newValue.replace(",", "."));
                  if (!isNaN(num)) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from("profiles").upsert({ id: user.id, initial_balance: num });
                      setInitialBalance(num);
                    }
                  }
                }
              }}
              className="text-muted hover:text-foreground transition-colors"
            >
              [ Ajustar Saldo Inicial ]
            </button>
          </div>
        </section>

        {/* BENTO GRID */}
        <div className="grid gap-6 md:grid-cols-12 lg:gap-8">
          
          <div className="col-span-12 flex flex-col justify-between bg-surface p-6 sharp-border md:col-span-4 transition-colors hover:bg-surface-hover">
            <div>
              <p className="font-mono text-xs uppercase text-muted mb-4">Receitas Totais</p>
              <p className="text-3xl font-bold tracking-tight">
                R$ {monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="mt-8 h-1 w-full bg-border">
              <div className="h-full w-full bg-primary"></div>
            </div>
          </div>

          <div className="col-span-12 flex flex-col justify-between bg-surface p-6 sharp-border md:col-span-4 transition-colors hover:bg-surface-hover">
            <div>
              <p className="font-mono text-xs uppercase text-muted mb-4">Despesas Totais</p>
              <p className="text-3xl font-bold tracking-tight">
                R$ {monthlyExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="mt-8 h-1 w-full bg-border">
              <div className="h-full w-[25%] bg-white"></div>
            </div>
          </div>

          <div className="col-span-12 flex flex-col justify-between bg-primary p-6 sharp-border md:col-span-4 text-primary-foreground transition-transform hover:-translate-y-1">
            <div>
              <p className="font-mono text-xs uppercase font-bold mb-4">Meta de Economia</p>
              <p className="text-3xl font-black tracking-tight">R$ 5.000,00</p>
            </div>
            <p className="mt-8 text-sm font-medium">Configure suas metas na aba de Caixinhas para acompanhar o progresso real.</p>
          </div>

          {/* TRANSACTIONS LIST */}
          <div className="col-span-12 mt-8 md:col-span-8">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Últimos Lançamentos</h2>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsImportOpen(true)}
                  className="font-mono text-[10px] uppercase text-muted hover:text-primary transition-colors"
                >
                  [ Importar Extrato ]
                </button>
                <Link href="/lancamentos" className="font-mono text-xs uppercase text-primary hover:underline">Ver todos</Link>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              {loading ? (
                <p className="font-mono text-xs uppercase text-muted">Carregando...</p>
              ) : recentTransactions.length === 0 ? (
                <p className="font-mono text-xs uppercase text-muted py-10 border border-dashed border-border text-center">Nenhuma transação cadastrada ainda.</p>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="group flex items-center justify-between border-b border-border pb-4 transition-colors hover:border-muted">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center sharp-border ${tx.type === 'in' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface text-muted'}`}>
                        {tx.type === 'in' ? '+' : '-'}
                      </div>
                      <div>
                        <p className="font-bold">{tx.description}</p>
                        <p className="font-mono text-[10px] uppercase text-muted">
                          {tx.category} • {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <p className={`font-mono font-bold ${tx.type === 'in' ? 'text-primary' : 'text-foreground'}`}>
                      {tx.type === 'in' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      <ImportDialog 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onSuccess={fetchData} 
      />
    </div>
  );
}

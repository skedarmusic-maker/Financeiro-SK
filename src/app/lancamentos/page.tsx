"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabase";
import { ImportDialog } from "@/components/ImportDialog";
import { TransactionDialog } from "@/components/NewTransactionDialog";

interface Transaction {
  id: string;
  description: string;
  category: string;
  amount: number;
  type: "in" | "out";
  created_at: string;
}

export default function LancamentosPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [search, setSearch] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar transações:", error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    setHasMounted(true);
    fetchTransactions();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evita abrir o modal de edição
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;

    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir.");
    } else {
      setTransactions(transactions.filter((t) => t.id !== id));
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(search.toLowerCase()) || 
                         tx.category.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || tx.type === filter;
    return matchesSearch && matchesFilter;
  });

  if (!hasMounted) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 px-6 py-12 md:px-12 lg:px-24">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter md:text-5xl">Lançamentos</h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">Histórico completo de transações</p>
          </div>
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
            <button 
              onClick={() => setIsImportOpen(true)}
              className="border border-border hover:border-primary text-muted hover:text-primary px-4 py-3 sm:py-2 text-[10px] font-bold uppercase tracking-widest transition-all sharp-border"
            >
              Importar Extrato
            </button>
            <input 
              type="text" 
              placeholder="Buscar lançamento..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-surface border border-border px-4 py-3 sm:py-2 text-sm font-medium outline-none focus:border-primary transition-colors sharp-border"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setFilter("all")}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider sharp-border transition-all active:scale-95 ${filter === 'all' ? 'bg-foreground text-background' : 'bg-surface text-muted border border-border'}`}
              >Tudo</button>
              <button 
                onClick={() => setFilter("in")}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider sharp-border transition-all active:scale-95 ${filter === 'in' ? 'bg-primary text-black' : 'bg-surface text-muted border border-border'}`}
              >Entradas</button>
              <button 
                onClick={() => setFilter("out")}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider sharp-border transition-all active:scale-95 ${filter === 'out' ? 'bg-white text-black' : 'bg-surface text-muted border border-border'}`}
              >Saídas</button>
            </div>
          </div>
        </div>

        <div className="flex flex-col border-t border-border">
          <div className="hidden md:grid grid-cols-12 gap-4 py-6 border-b border-border font-mono text-[10px] uppercase tracking-widest text-muted">
            <div className="col-span-5 pl-4">Descrição</div>
            <div className="col-span-3">Categoria</div>
            <div className="col-span-2">Data</div>
            <div className="col-span-2 text-right pr-4">Valor</div>
          </div>

          <div className="flex flex-col min-h-[300px]">
            {loading ? (
              <div className="flex flex-1 items-center justify-center py-20 font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Carregando dados...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-20 font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Nenhum lançamento encontrado.
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div 
                  key={tx.id} 
                  onClick={() => setEditingTransaction(tx)}
                  className="group grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-5 md:py-6 border-b border-border transition-colors hover:bg-surface-hover/50 px-2 md:px-4 relative cursor-pointer"
                >
                  <div className="col-span-1 md:col-span-5 flex items-center gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center sharp-border transition-colors ${tx.type === 'in' ? 'bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary/20' : 'bg-surface border border-border text-muted group-hover:border-foreground'}`}>
                      <span className="font-mono font-bold">{tx.type === 'in' ? '+' : '-'}</span>
                    </div>
                    <div>
                      <p className="font-bold text-base md:text-lg leading-tight">{tx.description}</p>
                      <button 
                        onClick={(e) => handleDelete(e, tx.id)}
                        className="md:hidden mt-1 text-[10px] font-mono text-red-500 uppercase tracking-widest hover:underline"
                      >Excluir</button>
                    </div>
                  </div>
                  <div className="hidden md:flex col-span-3">
                    <span className="font-mono text-[10px] uppercase px-2 py-1 bg-surface border border-border sharp-border text-muted">
                      {tx.category}
                    </span>
                  </div>
                  <div className="hidden md:block col-span-2 font-mono text-[10px] text-muted uppercase tracking-wider">
                    {new Date(tx.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="col-span-1 md:col-span-2 flex justify-between md:justify-end items-center mt-2 md:mt-0">
                    <div className="md:hidden flex gap-2">
                       <span className="font-mono text-[10px] uppercase text-muted bg-surface px-2 py-1 border border-border">{tx.category}</span>
                       <span className="font-mono text-[10px] uppercase text-muted py-1">{new Date(tx.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className={`font-mono text-lg font-black tracking-tight ${tx.type === 'in' ? 'text-primary' : 'text-foreground'}`}>
                        {tx.type === 'in' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <button 
                        onClick={(e) => handleDelete(e, tx.id)}
                        className="hidden md:block text-[9px] font-mono text-muted uppercase tracking-widest hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >Excluir Lançamento</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <ImportDialog 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onSuccess={fetchTransactions} 
      />

      <TransactionDialog 
        isOpen={!!editingTransaction}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSuccess={fetchTransactions}
      />
    </div>
  );
}

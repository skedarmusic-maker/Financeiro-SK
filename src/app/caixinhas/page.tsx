"use client";

import { Header } from "@/components/Header";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { NewPocketDialog } from "@/components/NewPocketDialog";

interface Pocket {
  id: string;
  title: string;
  icon: string;
  goal_amount: number;
  current_amount: number;
}

export default function CaixinhasPage() {
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [editingPocket, setEditingPocket] = useState<Pocket | null>(null);

  const fetchPockets = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("pockets")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erro ao buscar caixinhas:", error);
    } else {
      setPockets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    setHasMounted(true);
    fetchPockets();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Excluir esta caixinha? O saldo nela será perdido.")) return;
    const { error } = await supabase.from("pockets").delete().eq("id", id);
    if (error) alert("Erro ao excluir.");
    else fetchPockets();
  };

  const handleEdit = (pocket: Pocket) => {
    setEditingPocket(pocket);
    setIsNewOpen(true);
  };

  const handleTransaction = async (e: React.MouseEvent, pocket: Pocket, isDeposit: boolean) => {
    e.stopPropagation();
    
    const actionName = isDeposit ? "Guardar" : "Resgatar";
    const amountStr = prompt(`Qual valor você deseja ${actionName}?`);
    if (!amountStr) return;

    const amount = parseFloat(amountStr.replace(/\./g, "").replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      alert("Valor inválido.");
      return;
    }

    if (!isDeposit && amount > pocket.current_amount) {
      alert("Saldo insuficiente na caixinha para resgate.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Atualizar saldo da caixinha
    const newAmount = isDeposit ? pocket.current_amount + amount : pocket.current_amount - amount;
    const { error: pocketError } = await supabase
      .from("pockets")
      .update({ current_amount: newAmount })
      .eq("id", pocket.id);

    if (pocketError) {
      alert(`Erro ao ${actionName.toLowerCase()}: ` + pocketError.message);
      return;
    }

    // 2. Criar transação no fluxo de caixa
    await supabase.from("transactions").insert([{
      user_id: user.id,
      description: `${isDeposit ? 'Guardado em' : 'Resgate de'}: ${pocket.title}`,
      amount: amount,
      type: isDeposit ? 'out' : 'in', // Guardar é saída do saldo, resgatar é entrada
      category: 'Metas'
    }]);

    fetchPockets();
  };

  const handleCreateDefaults = async () => {
    // ... logic remains
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const defaults = [
      { title: "Reserva de Emergência", icon: "🛡", goal_amount: 10000, current_amount: 0, user_id: user.id },
      { title: "Viagem dos Sonhos", icon: "✈", goal_amount: 5000, current_amount: 0, user_id: user.id },
      { title: "Aposentadoria", icon: "🌳", goal_amount: 50000, current_amount: 0, user_id: user.id },
    ];

    const { error } = await supabase.from("pockets").insert(defaults);
    if (error) alert("Erro ao criar modelos.");
    else fetchPockets();
  };

  if (!hasMounted) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 px-6 py-12 md:px-12 lg:px-24">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter md:text-5xl">Caixinhas</h1>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">Objetivos e Metas de Longo Prazo</p>
          </div>
          <div className="flex gap-4">
            {pockets.length === 0 && !loading && (
              <button 
                onClick={handleCreateDefaults}
                className="border border-border hover:border-primary text-muted hover:text-primary px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all sharp-border"
              >
                Criar Modelos Padrão
              </button>
            )}
            <button 
              onClick={() => { setEditingPocket(null); setIsNewOpen(true); }}
              className="bg-foreground text-background px-6 py-3 text-xs font-black uppercase tracking-widest sharp-border hover:bg-[#e0e0e0] active:scale-95 transition-all"
            >
              + Nova Caixinha
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-20 flex justify-center">
               <p className="font-mono text-xs uppercase tracking-widest text-muted">Carregando objetivos...</p>
            </div>
          ) : pockets.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center border-2 border-dashed border-border p-10 sharp-border bg-surface/30">
               <p className="font-mono text-xs uppercase tracking-widest text-muted mb-4">Você ainda não tem metas.</p>
               <button onClick={handleCreateDefaults} className="text-primary font-bold text-xs uppercase underline">Criar metas sugeridas</button>
            </div>
          ) : (
            pockets.map((pocket) => {
              const progress = Math.min((pocket.current_amount / pocket.goal_amount) * 100, 100);
              
              return (
                <div 
                  key={pocket.id} 
                  onClick={() => handleEdit(pocket)}
                  className="bg-surface p-8 sharp-border border border-border group hover:border-primary transition-all relative overflow-hidden cursor-pointer"
                >
                  <button 
                    onClick={(e) => handleDelete(e, pocket.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[9px] uppercase text-red-500 hover:font-bold p-2"
                  >
                    [ Excluir ]
                  </button>

                  <div className="flex justify-between items-start mb-6">
                    <div className="h-12 w-12 bg-background flex items-center justify-center text-2xl sharp-border border border-border group-hover:border-primary transition-colors">
                      {pocket.icon}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] uppercase text-muted tracking-widest mb-1">Meta</p>
                      <p className="font-black text-xl">R$ {pocket.goal_amount.toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  <h3 className="text-xl font-black mb-1 uppercase tracking-tight">{pocket.title}</h3>
                  <div className="flex justify-between items-end mb-4">
                    <p className="font-mono text-[10px] uppercase text-muted tracking-widest">Saldo Atual</p>
                    <p className="font-bold text-primary">R$ {pocket.current_amount.toLocaleString('pt-BR')}</p>
                  </div>

                  <div className="w-full h-3 bg-background border border-border sharp-border overflow-hidden mb-6">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => handleTransaction(e, pocket, true)} 
                      className="flex-1 bg-foreground text-background py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors sharp-border"
                    >
                      Guardar
                    </button>
                    <button 
                      onClick={(e) => handleTransaction(e, pocket, false)} 
                      className="flex-1 border border-border text-muted py-3 text-[10px] font-bold uppercase tracking-widest hover:border-foreground hover:text-foreground transition-colors sharp-border"
                    >
                      Resgatar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <NewPocketDialog 
        isOpen={isNewOpen} 
        onClose={() => setIsNewOpen(false)} 
        onSuccess={fetchPockets} 
        pocket={editingPocket}
      />
    </div>
  );
}

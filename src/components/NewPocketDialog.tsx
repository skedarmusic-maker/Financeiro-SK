"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";

interface NewPocketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewPocketDialog({ isOpen, onClose, onSuccess }: NewPocketDialogProps) {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [icon, setIcon] = useState("💰");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleSave = async () => {
    if (!title || !goal) return;
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("pockets").insert([{
      title,
      goal_amount: parseFloat(goal.replace(/\./g, "").replace(",", ".")),
      icon,
      user_id: user.id,
      current_amount: 0
    }]);

    if (error) {
      alert("Erro ao criar caixinha: " + error.message);
    } else {
      onSuccess();
      onClose();
      setTitle("");
      setGoal("");
    }
    setIsSubmitting(false);
  };

  if (!hasMounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface p-8 sharp-border border-2 border-primary relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground">
          [ fechar ]
        </button>

        <h2 className="text-3xl font-black tracking-tighter uppercase mb-8">Nova Caixinha</h2>

        <div className="flex flex-col gap-6">
          <div>
            <label className="block font-mono text-[10px] uppercase text-muted mb-2 tracking-widest">Nome do Objetivo</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Viagem, Carro Novo..."
              className="w-full bg-background border border-border p-4 text-sm outline-none focus:border-primary sharp-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase text-muted mb-2 tracking-widest">Meta (R$)</label>
              <input 
                type="text" 
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="0,00"
                className="w-full bg-background border border-border p-4 text-sm outline-none focus:border-primary sharp-border"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-muted mb-2 tracking-widest">Ícone (Emoji)</label>
              <input 
                type="text" 
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full bg-background border border-border p-4 text-center text-xl outline-none focus:border-primary sharp-border"
              />
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSubmitting || !title || !goal}
            className="w-full bg-primary text-black font-black py-5 text-xs uppercase tracking-[0.3em] sharp-border hover:bg-[#b3e600] transition-all disabled:opacity-50"
          >
            {isSubmitting ? "CRIANDO..." : "CRIAR OBJETIVO"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

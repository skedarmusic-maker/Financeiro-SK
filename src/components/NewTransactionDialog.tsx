"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const EXPENSE_CATEGORIES = [
  { label: "Alimentação", emoji: "🍽" },
  { label: "Transporte", emoji: "🚗" },
  { label: "Moradia", emoji: "🏠" },
  { label: "Assinaturas", emoji: "📱" },
  { label: "Saúde", emoji: "💊" },
  { label: "Lazer", emoji: "🎯" },
  { label: "Educação", emoji: "📚" },
  { label: "Outros", emoji: "📦" },
];

const INCOME_CATEGORIES = [
  { label: "Salário", emoji: "💰" },
  { label: "Rendimentos", emoji: "📈" },
  { label: "Vendas", emoji: "🛍" },
  { label: "Freelance", emoji: "💻" },
  { label: "Cashback", emoji: "🔄" },
  { label: "Presente", emoji: "🎁" },
  { label: "Outros", emoji: "✨" },
];

interface Transaction {
  id?: string;
  description: string;
  amount: number;
  type: "in" | "out";
  category: string;
}

interface TransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: Transaction | null;
}

export function TransactionDialog({ isOpen, onClose, onSuccess, transaction }: TransactionDialogProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [type, setType] = useState<"out" | "in">("out");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (transaction) {
        setType(transaction.type);
        setDescription(transaction.description);
        setSelectedCategory(transaction.category);
        setAmount(transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } else {
        setType("out");
        setDescription("");
        setSelectedCategory(null);
        setAmount("");
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen, transaction]);

  const handleConfirm = async () => {
    if (!amount || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const numericAmount = parseFloat(amount.replace(/\./g, "").replace(",", "."));
      const payload = {
        description: description || (type === "in" ? "Receita" : "Gasto"),
        amount: numericAmount,
        type,
        category: selectedCategory || "Outros",
        user_id: user.id,
      };

      let error;
      if (transaction?.id) {
        const { error: err } = await supabase.from("transactions").update(payload).eq("id", transaction.id);
        error = err;
      } else {
        const { error: err } = await supabase.from("transactions").insert([payload]);
        error = err;
      }

      if (error) {
        alert("Erro ao salvar: " + error.message);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasMounted || !isOpen) return null;

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.98)', zIndex: 99999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      padding: '40px 20px', overflowY: 'auto'
    }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: -1 }} onClick={onClose} />

      <div style={{
        backgroundColor: '#111111', border: `2px solid ${type === 'in' ? '#CCFF00' : '#333333'}`,
        width: '100%', maxWidth: '500px', padding: '32px', display: 'flex', flexDirection: 'column',
        gap: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.8)', borderRadius: '0px'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#000', padding: '4px', border: '1px solid #222' }}>
            <button 
              onClick={() => setType('out')}
              style={{ 
                padding: '10px 20px', fontSize: '10px', fontWeight: '900', border: 'none', cursor: 'pointer',
                backgroundColor: type === 'out' ? '#f0f0f0' : 'transparent',
                color: type === 'out' ? '#000' : '#888',
              }}
            > DESPESA </button>
            <button 
              onClick={() => setType('in')}
              style={{ 
                padding: '10px 20px', fontSize: '10px', fontWeight: '900', border: 'none', cursor: 'pointer',
                backgroundColor: type === 'in' ? '#CCFF00' : 'transparent',
                color: type === 'in' ? '#000' : '#888',
              }}
            > RECEITA </button>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
            [X] FECHAR
          </button>
        </div>

        <div style={{ backgroundColor: '#050505', padding: '24px', border: '1px solid #222' }}>
          <label style={{ display: 'block', color: '#666', fontSize: '10px', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '2px' }}>
            VALOR DO LANÇAMENTO
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '24px', fontWeight: '900', color: type === 'in' ? '#CCFF00' : '#444' }}>R$</span>
            <input 
              ref={inputRef}
              type="text" inputMode="numeric" value={amount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                if (!raw) { setAmount(""); return; }
                const formatted = (parseInt(raw, 10) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                setAmount(formatted);
              }}
              placeholder="0,00"
              style={{ width: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: '56px', fontWeight: '900', color: type === 'in' ? '#CCFF00' : '#f0f0f0' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#666', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px' }}>DESCRIÇÃO</label>
          <input 
            type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Almoço, Salário..."
            style={{ width: '100%', backgroundColor: '#050505', border: '1px solid #222', padding: '16px', color: '#f0f0f0', outline: 'none', fontSize: '14px', fontWeight: '500' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', color: '#666', fontSize: '10px', fontWeight: 'bold', marginBottom: '12px' }}>CATEGORIA</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {(type === 'out' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.label)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 4px',
                  backgroundColor: selectedCategory === cat.label ? (type === 'in' ? '#CCFF00' : '#f0f0f0') : '#050505',
                  color: selectedCategory === cat.label ? '#000' : '#666',
                  border: `1px solid ${selectedCategory === cat.label ? 'transparent' : '#222'}`,
                  cursor: 'pointer', transition: 'all 0.1s'
                }}
              >
                <span style={{ fontSize: '20px' }}>{cat.emoji}</span>
                <span style={{ fontSize: '8px', fontWeight: '900', textTransform: 'uppercase' }}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!amount || isSubmitting}
          style={{
            width: '100%', padding: '24px', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px',
            backgroundColor: type === 'in' ? '#CCFF00' : '#f0f0f0', color: '#000', border: 'none', cursor: 'pointer', opacity: (amount && !isSubmitting) ? 1 : 0.3
          }}
        >
          {isSubmitting ? 'SALVANDO...' : transaction ? 'ATUALIZAR' : 'CONFIRMAR'}
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function NewTransactionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[#CCFF00] text-black font-black px-6 py-2 text-xs uppercase tracking-widest hover:bg-[#b3e600] active:scale-95 transition-all"
        style={{ borderRadius: 0, border: 'none', cursor: 'pointer' }}
      >
        + NOVA TRANSAÇÃO
      </button>

      <TransactionDialog 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onSuccess={() => {
            window.location.reload(); 
        }} 
      />
    </>
  );
}

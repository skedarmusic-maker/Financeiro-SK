"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Verifique seu e-mail para confirmar o cadastro!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <div className="w-full max-w-[400px] bg-surface p-10 sharp-border relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>

        <div className="mb-10 text-center">
          <div className="inline-block h-12 w-12 bg-primary sharp-border mb-4"></div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Fin.01</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted mt-2">
            {isSignUp ? "Criar nova conta" : "Acesse seu cockpit"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-6">
          <div>
            <label className="block font-mono text-[10px] uppercase font-bold text-muted mb-2 tracking-widest">E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-border p-4 outline-none focus:border-primary transition-colors sharp-border font-medium"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase font-bold text-muted mb-2 tracking-widest">Senha</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-border p-4 outline-none focus:border-primary transition-colors sharp-border font-medium"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="font-mono text-[10px] uppercase text-red-500 bg-red-500/10 p-3 sharp-border border border-red-500/20">
              {error}
            </p>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-black font-black py-5 text-xs uppercase tracking-[0.3em] sharp-border hover:bg-[#b3e600] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "PROCESSANDO..." : (isSignUp ? "CADASTRAR" : "ENTRAR")}
          </button>
        </form>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-8 font-mono text-[10px] uppercase text-muted hover:text-foreground transition-colors"
        >
          {isSignUp ? "Já tem uma conta? Faça login" : "Não tem conta? Crie agora"}
        </button>
      </div>
    </div>
  );
}

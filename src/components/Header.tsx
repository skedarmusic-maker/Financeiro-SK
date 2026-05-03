"use client";

import Link from "next/link";
import { NewTransactionDialog } from "./NewTransactionDialog";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    }
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
      if (!session) router.push("/auth");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (!hasMounted) return null;

  const navLinks = [
    { href: "/", label: "Cockpit", icon: "🏠" },
    { href: "/lancamentos", label: "Lançamentos", icon: "📑" },
    { href: "/caixinhas", label: "Caixinhas", icon: "💰" },
    { href: "/relatorios", label: "Relatórios", icon: "📊" },
  ];

  return (
    <>
      {/* HEADER DESKTOP & MOBILE TOP */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary sharp-border"></div>
            <span className="font-mono text-sm font-bold uppercase tracking-wider text-foreground">
              Fin.01
            </span>
          </Link>
          
          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted">
            {navLinks.map(link => (
              <Link 
                key={link.href} 
                href={link.href} 
                className={`transition-colors hover:text-foreground ${pathname === link.href ? 'text-primary' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="hidden lg:block font-mono text-[9px] uppercase text-muted tracking-widest bg-surface px-3 py-1 border border-border">
              {userEmail}
            </span>
          )}
          
          {/* Botão Nova Transação (Escondido no Mobile, pois usaremos o flutuante) */}
          <div className="hidden md:block">
            <NewTransactionDialog />
          </div>

          <button 
            onClick={handleLogout}
            className="font-mono text-[10px] font-bold uppercase text-muted hover:text-red-500 transition-colors"
          >
            [ Sair ]
          </button>
        </div>
      </header>
      
      {/* MOBILE BOTTOM NAVIGATION (Apenas Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] flex md:hidden items-center justify-around bg-surface border-t border-border px-2 py-3 backdrop-blur-lg safe-area-bottom">
        {navLinks.map(link => (
          <Link 
            key={link.href} 
            href={link.href} 
            className="flex flex-col items-center gap-1 min-w-[60px]"
          >
            <span className={`text-xl transition-all ${pathname === link.href ? 'scale-110' : 'grayscale opacity-50'}`}>
              {link.icon}
            </span>
            <span className={`font-mono text-[8px] uppercase font-bold tracking-tighter ${pathname === link.href ? 'text-primary' : 'text-muted'}`}>
              {link.label}
            </span>
          </Link>
        ))}
        
        {/* Botão de Transação no Mobile (Centralizado ou no final) */}
        <div className="flex flex-col items-center">
            <NewTransactionDialog mobile />
        </div>
      </nav>

      {/* Padding extra no final das páginas mobile para não tampar conteúdo pela nav bar */}
      <div className="h-20 md:hidden" />
    </>
  );
}

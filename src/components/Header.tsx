"use client";

import Link from "next/link";
import { NewTransactionDialog } from "./NewTransactionDialog";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Header() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
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

  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary sharp-border"></div>
            <span className="font-mono text-sm font-bold uppercase tracking-wider text-foreground">
              Fin.01
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-muted">
            <Link href="/" className="transition-colors hover:text-foreground">Cockpit</Link>
            <Link href="/lancamentos" className="transition-colors hover:text-foreground">Lançamentos</Link>
            <Link href="/caixinhas" className="transition-colors hover:text-foreground">Caixinhas</Link>
            <Link href="/relatorios" className="transition-colors hover:text-foreground">Relatórios</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="hidden lg:block font-mono text-[9px] uppercase text-muted tracking-widest bg-surface px-3 py-1 border border-border">
              {userEmail}
            </span>
          )}
          <button 
            onClick={handleLogout}
            className="font-mono text-[10px] font-bold uppercase text-muted hover:text-red-500 transition-colors"
          >
            [ Sair ]
          </button>
        </div>
      </header>
      
      <NewTransactionDialog />
    </>
  );
}

"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORY_MAP: Record<string, string> = {
  "MERCADO": "Alimentação",
  "SUPER": "Alimentação",
  "IFOOD": "Alimentação",
  "RESTAURANTE": "Alimentação",
  "POSTO": "Transporte",
  "UBER": "Transporte",
  "GASOLINA": "Transporte",
  "ACADEMIA": "Saúde",
  "FARMACIA": "Saúde",
  "DRUGA": "Saúde",
  "NETFLIX": "Assinaturas",
  "SPOTIFY": "Assinaturas",
  "ALUGUEL": "Moradia",
  "LUZ": "Moradia",
  "AGUA": "Moradia",
  "INTERNET": "Moradia",
  "SHOPPING": "Lazer",
  "CINEMA": "Lazer",
  "PIX": "Transferência",
  "SALARIO": "Salário",
  "RENDIMENTO": "Investimentos",
};

export function ImportDialog({ isOpen, onClose, onSuccess }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const transactionsToInsert: any[] = [];
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("Erro: Usuário não autenticado.");
        setIsProcessing(false);
        return;
      }

      // --- LÓGICA OFX (Money 2000) ---
      if (file.name.toLowerCase().endsWith(".ofx") || text.includes("<OFX>")) {
        // Regex simples para capturar blocos de transação <STMTTRN>
        const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
        let match;

        while ((match = trnRegex.exec(text)) !== null) {
          const block = match[1];
          const description = block.match(/<NAME>(.*)/)?.[1]?.trim() || "Sem descrição";
          const amountStr = block.match(/<TRNAMT>(.*)/)?.[1]?.trim() || "0";
          
          let amount = parseFloat(amountStr);
          if (isNaN(amount)) continue;

          const type = amount > 0 ? "in" : "out";
          const absAmount = Math.abs(amount);

          let category = "Outros";
          const upperDesc = description.toUpperCase();
          for (const [key, val] of Object.entries(CATEGORY_MAP)) {
            if (upperDesc.includes(key)) {
              category = val;
              break;
            }
          }

          transactionsToInsert.push({
            user_id: user.id,
            description,
            amount: absAmount,
            type,
            category,
            created_at: new Date().toISOString(),
          });
        }
      } 
      // --- LÓGICA CSV ---
      else {
        const lines = text.split("\n");
        const firstLine = lines[0];
        const separator = firstLine.includes(";") ? ";" : ",";

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const columns = line.split(separator).map(col => col.replace(/"/g, ""));
          let description = columns[1];
          let amountStr = columns[2];

          if (!description || !amountStr) continue;

          let amount = parseFloat(amountStr.replace(/[R$\s.]/g, "").replace(",", "."));
          if (isNaN(amount)) continue;

          const type = amount > 0 ? "in" : "out";
          const absAmount = Math.abs(amount);

          let category = "Outros";
          const upperDesc = description.toUpperCase();
          for (const [key, val] of Object.entries(CATEGORY_MAP)) {
            if (upperDesc.includes(key)) {
              category = val;
              break;
            }
          }

          transactionsToInsert.push({
            user_id: user.id,
            description,
            amount: absAmount,
            type,
            category,
            created_at: new Date().toISOString(),
          });
        }
      }

      if (transactionsToInsert.length > 0) {
        const { error } = await supabase.from("transactions").insert(transactionsToInsert);
        if (error) {
          alert("Erro ao importar dados: " + error.message);
        } else {
          alert(`${transactionsToInsert.length} lançamentos importados com sucesso!`);
          onSuccess();
          onClose();
        }
      } else {
        alert("Nenhum lançamento válido encontrado no arquivo.");
      }
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/90 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface p-8 sharp-border border-2 border-primary relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-foreground">
          [ fechar ]
        </button>

        <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">Importar Extrato</h2>
        <p className="font-mono text-[10px] uppercase text-muted mb-8 tracking-widest">
          Suporta arquivos .CSV do Santander e Banco do Brasil
        </p>

        <div className="flex flex-col gap-6">
          <div className="border-2 border-dashed border-border p-10 text-center hover:border-primary transition-colors cursor-pointer relative group">
            <input 
              type="file" 
              accept=".csv,.ofx"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <p className="font-mono text-[10px] uppercase font-bold group-hover:text-primary transition-colors">
              {file ? file.name : "Clique ou arraste o arquivo .CSV ou .OFX"}
            </p>
          </div>

          <div className="bg-background/50 p-4 sharp-border border border-border">
            <p className="font-mono text-[9px] uppercase text-muted leading-relaxed">
              Dica: O arquivo deve conter colunas de Data, Descrição e Valor (CSV) ou ser um extrato Money/OFX.
            </p>
          </div>

          <button 
            onClick={processFile}
            disabled={!file || isProcessing}
            className="w-full bg-primary text-black font-black py-5 text-xs uppercase tracking-[0.3em] sharp-border hover:bg-[#b3e600] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isProcessing ? "PROCESSANDO..." : "INICIAR IMPORTAÇÃO"}
          </button>
        </div>
      </div>
    </div>
  );
}

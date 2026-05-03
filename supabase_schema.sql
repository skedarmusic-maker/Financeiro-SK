-- TABELA DE TRANSAÇÕES
DROP TABLE IF EXISTS public.transactions;
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    type TEXT CHECK (type IN ('in', 'out')) NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TABELA DE CAIXINHAS (METAS)
DROP TABLE IF EXISTS public.pockets;
CREATE TABLE public.pockets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    icon TEXT NOT NULL,
    goal_amount NUMERIC(15, 2) NOT NULL,
    current_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TABELA DE PERFIS (CONFIGURAÇÕES)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    initial_balance NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ATIVAR RLS (SEGURANÇA POR USUÁRIO)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: O USUÁRIO SÓ PODE VER/EDITAR O QUE É DELE
CREATE POLICY "Users can manage their own transactions" 
ON public.transactions FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own pockets" 
ON public.pockets FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own profile" 
ON public.profiles FOR ALL 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

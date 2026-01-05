# Configuração do Supabase

## 1. Criar arquivo .env.local

Crie um arquivo `.env.local` na raiz do projeto com o seguinte conteúdo:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
OPENAI_API_KEY=sua_chave_da_openai
```

Você pode encontrar essas informações:

**Supabase:**
- Acesse https://supabase.com
- Vá em Settings > API
- Copie a "Project URL" e a "anon public" key

**OpenAI:**
- Acesse https://platform.openai.com/api-keys
- Crie uma nova API key
- Copie a chave e adicione ao arquivo .env.local como `OPENAI_API_KEY`

## 2. Criar a tabela 'calculos' no Supabase

No SQL Editor do Supabase, execute o seguinte SQL:

```sql
CREATE TABLE calculos (
  id BIGSERIAL PRIMARY KEY,
  nome_prato TEXT NOT NULL,
  preco_venda DECIMAL(10, 2) NOT NULL,
  custo_ingredientes DECIMAL(10, 2) NOT NULL,
  taxa_marketplace DECIMAL(5, 2) NOT NULL,
  taxa_marketplace_valor DECIMAL(10, 2) NOT NULL,
  lucro_liquido DECIMAL(10, 2) NOT NULL,
  margem_lucro DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índice para melhorar performance nas consultas
CREATE INDEX idx_calculos_created_at ON calculos(created_at DESC);

-- Habilitar Row Level Security (RLS) se necessário
ALTER TABLE calculos ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir inserção e leitura (ajuste conforme sua necessidade)
CREATE POLICY "Permitir inserção e leitura para todos" ON calculos
  FOR ALL USING (true) WITH CHECK (true);
```

## 3. Estrutura da tabela

A tabela `calculos` possui os seguintes campos:

- `id`: ID único do cálculo (auto-incremento)
- `nome_prato`: Nome do prato
- `preco_venda`: Preço de venda em R$
- `custo_ingredientes`: Custo dos ingredientes (CMV) em R$
- `taxa_marketplace`: Taxa do marketplace em porcentagem
- `taxa_marketplace_valor`: Valor da taxa do marketplace em R$
- `lucro_liquido`: Lucro líquido calculado em R$
- `margem_lucro`: Margem de lucro em porcentagem
- `created_at`: Data e hora da criação do registro

## 4. Como funciona

O sistema salva automaticamente os cálculos no Supabase quando:
- Todos os campos do formulário estão preenchidos
- Os valores são válidos (preço > 0, custos >= 0)
- Após 1 segundo de inatividade (debounce para evitar múltiplos salvamentos)

O histórico na sidebar é carregado automaticamente do Supabase quando a página é carregada e atualizado após cada novo cálculo salvo.

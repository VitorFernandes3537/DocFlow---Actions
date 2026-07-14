# DocFlow Actions — Setup do zero (banco novo + deploy)

As migrations do banco **já estão versionadas** neste repositório:

- `supabase/migrations/001_init.sql` — tabelas (`documents`, `extracted_items`, `item_status`, `raw_extractions`), índices e RLS por `auth.uid()`
- `supabase/migrations/002_storage.sql` — bucket privado `documents` com pastas por usuário
- `supabase/seed.sql` — dados de exemplo (opcional; rode após o 1º login)

## 1. Criar o projeto no Supabase
1. https://supabase.com → New project.
2. **Project Settings → API**: copie `Project URL` e a `anon public` key.

## 2. Criar schema + storage
No **SQL Editor**, rode nesta ordem:
1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_storage.sql`
3. Confira em **Storage** o bucket **`documents`** (privado).

## 3. Ativar login com Google (Supabase Auth)  ← pegadinha nº 1
O app usa **Supabase Auth com Google** (`app/auth/callback/route.ts`).
1. Google Cloud Console → APIs & Services → **OAuth consent screen** + **Credentials → OAuth client ID (Web)**.
   - Authorized redirect URI: `https://SEU-PROJETO.supabase.co/auth/v1/callback`
2. Supabase → **Authentication → Providers → Google**: cole o **Client ID** e **Client Secret** → Enable.
3. Supabase → **Authentication → URL Configuration**:
   - **Site URL**: a URL do deploy (ex.: `https://docflow.vercel.app`) — em dev, `http://localhost:3000`.
   - **Redirect URLs**: adicione `http://localhost:3000/**` e a URL de produção `/**`.

## 4. Variáveis de ambiente
Copie `.env.example` → `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
OPENAI_API_KEY=sk-...              # ← pegadinha nº 2 (necessária para a extração por IA)
OPENAI_MODEL=gpt-4.1-mini
OPENAI_MAX_INPUT_CHARS=180000
NEXT_PUBLIC_TEST_DOCS_DRIVE_URL=   # opcional (link de PDFs de teste)
```

## 5. Rodar local
```bash
npm install
npm run dev
```
Login com Google → `/document/new` → colar texto de um edital ou subir PDF → a IA extrai
checklist, timeline e documentos exigidos.

## 6. (Opcional) Seed
Após o 1º login, rode `supabase/seed.sql` no SQL Editor para já ter um documento de exemplo.

## 7. Deploy na Vercel
1. Importe o repositório na Vercel.
2. **Settings → Environment Variables**: adicione as variáveis do passo 4.
3. Após o deploy, volte ao passo 3.3 e ponha a **URL de produção** em Site URL / Redirect URLs.

## Checklist de "no ar e funcional"
- [ ] 001 + 002 rodados; bucket `documents` existe
- [ ] Google provider habilitado + redirect URIs corretas
- [ ] `OPENAI_API_KEY` válida com crédito
- [ ] Deploy Vercel com env vars; Site URL/Redirect URLs = produção
- [ ] Teste real: login → colar edital → extração aparece

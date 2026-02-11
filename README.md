# DocFlow Actions (MVP Feira)

MVP em Next.js + Supabase + OpenAI para transformar edital em plano executavel com evidencia.

## Requisitos
- Node.js 20+
- Projeto Supabase com Auth Google e bucket `documents`
- OpenAI API key

## Setup local
1. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (opcional)
2. Instale dependencias:
   - `npm install`
3. Rode as migrations no SQL Editor do Supabase:
   - `supabase/migrations/001_init.sql`
   - `supabase/migrations/002_storage.sql`
4. Rode o projeto:
   - `npm run dev`

## Fluxo MVP
1. Login Google em `/login`.
2. Criar documento em `/document/new`.
3. Fazer upload de PDF nativo ou colar texto fallback.
4. (Opcional) informar `base_date` para prazos relativos.
5. Gerar plano e abrir `/document/[id]`.
6. Exportar CSV/ICS.

## Regras chave implementadas
- Todo item exige `evidence_snippet` (minimo 20 chars).
- Termos condicionais geram `conditional=true` e `dependencies`.
- Datas relativas sem `base_date` viram `confidence='uncertain'`.
- Resposta do LLM valida schema Zod e retry 1x se JSON invalido.

## SSOT
Documentacao oficial em `ContextoIA/`.

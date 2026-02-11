# DocFlow Actions

Plataforma web para transformar editais e regulamentos em plano executavel, com checklist acionavel, timeline de prazos e exportacao ICS com rastreabilidade por evidencia textual.

## 1) Visao Geral

O DocFlow Actions resolve um problema recorrente de operacao documental: ler documentos longos, identificar obrigacoes e manter controle de prazos sem perder contexto da fonte.

O sistema recebe um PDF nativo ou texto colado, extrai itens estruturados com IA, normaliza regras temporais (incluindo datas relativas), salva no Supabase com RLS e oferece uma experiencia de execucao no frontend.

## 2) Principais Funcionalidades

- Autenticacao com Google (Supabase Auth).
- Upload de PDF para bucket privado no Supabase Storage.
- Fallback por texto colado quando o PDF nao possui texto util.
- Extracao estruturada via OpenAI com validacao por schema (Zod).
- Checklist por documento com status por item (`pending`/`done`) por usuario.
- Timeline executavel com resolucao de datas relativas.
- Visao de documentos exigidos agrupados por relacao.
- Exportacao de calendario em formato ICS.
- Persistencia de payload bruto de extracao para auditoria/debug.

## 3) Arquitetura Tecnica

### Camadas

- Frontend: Next.js (App Router), React 19, componentes em `components/`.
- Backend web: Route Handlers em `app/api/*`.
- IA: OpenAI Chat Completions com resposta em JSON.
- Dados e Auth: Supabase Postgres + RLS + Storage + OAuth Google.
- Validacao: Zod para input de API e payload retornado pelo modelo.

### Fluxo principal (alto nivel)

1. Usuario autentica no Google.
2. Usuario cria documento em `/document/new`.
3. Frontend envia `FormData` para `POST /api/extract`.
4. API faz upload do arquivo (quando houver), extrai texto de PDF, aplica fallback e chama OpenAI.
5. Resultado e validado, normalizado e persistido (`documents`, `extracted_items`, `raw_extractions`).
6. Usuario executa itens no painel, atualiza status e exporta ICS.

## 4) Stack e Dependencias

- Next.js `^15.1.6`
- React `^19.0.0`
- TypeScript `^5.8.2`
- Supabase SSR `^0.5.2`
- Supabase JS `^2.56.0`
- OpenAI SDK `^5.20.3`
- Zod `^3.25.76`
- pdfjs-dist `^4.10.38`
- lucide-react `^0.563.0`

## 5) Estrutura de Pastas

```text
app/
  api/
    extract/route.ts              # Extracao + persistencia
    export/route.ts               # Exportacao ICS
    items/[itemId]/status/route.ts# Atualiza status do item
  auth/callback/route.ts          # Troca code OAuth por sessao
  dashboard/page.tsx              # Lista documentos do usuario
  document/
    new/page.tsx                  # Formulario de novo documento
    [id]/page.tsx                 # Painel com checklist/evidencias
    [id]/timeline/page.tsx        # Timeline executavel
    [id]/required-docs/page.tsx   # Timelines de docs exigidos
components/                       # UI e componentes de dominio
lib/
  env.ts                          # Validacao de variaveis de ambiente
  prompts.ts                      # Prompt de extracao
  types.ts                        # Schemas e tipos da extracao
  relative-dates.ts               # Motor de datas relativas
  executable-events.ts            # Eventos executaveis para timeline/ICS
  utils.ts                        # Normalizacao e utilitarios
  supabase/                       # Clients browser/server/middleware
supabase/migrations/
  001_init.sql                    # Schema, indices, RLS, policies
  002_storage.sql                 # Bucket e policies de storage
docs/
  regras-negocio/                 # Regras de negocio do MVP
  runbooks/                       # Runbooks de teste
```

## 6) Rotas da Aplicacao

### Rotas de pagina

- `/` redireciona para `/dashboard` ou `/login`.
- `/login` login com Google.
- `/dashboard` listagem de documentos do usuario.
- `/document/new` criacao e processamento de novo documento.
- `/document/[id]` painel de execucao (checklist + evidencia).
- `/document/[id]/timeline` timeline executavel de prazos.
- `/document/[id]/required-docs` documentos exigidos por grupo.

### APIs

- `POST /api/extract`
  - Entrada: `multipart/form-data` (`title`, `file`, `pasted_text`, `base_date`).
  - Saida: `documentId`, `itemsCount`, `hasRelativeWithoutBase`, `inputStats`.
- `POST /api/items/[itemId]/status`
  - Entrada JSON: `{ "status": "pending" | "done" }`.
  - Saida: `{ "ok": true }`.
- `GET /api/export?documentId=<uuid>&format=ics`
  - Saida: arquivo `.ics` para download.

## 7) Modelo de Dados (Supabase)

### Tabelas principais

- `documents`
  - Documento raiz por usuario (`user_id`, `title`, `source_type`, `storage_path`, `base_date`).
- `extracted_items`
  - Itens extraidos por documento (`type`, `due_date`, `due_date_raw`, `conditional`, `dependencies`, `evidence_*`, `confidence`).
- `item_status`
  - Status por usuario e por item (`unique(item_id, user_id)`).
- `raw_extractions`
  - Payload bruto e metadados de extracao por documento.

### Relacionamentos

- `documents (1) -> (N) extracted_items`
- `extracted_items (1) -> (N) item_status`
- `documents (1) -> (1) raw_extractions`

### Seguranca

- RLS habilitado em todas as tabelas de dominio.
- Policies garantem isolamento por `auth.uid()`.
- Storage privado com prefixo por usuario (`<user_id>/...`).

## 8) Regras de Negocio Implementadas

### Extracao e validacao

- O modelo deve retornar apenas JSON no schema esperado.
- Cada item precisa conter `evidence_snippet` (minimo 20 caracteres).
- Tipo do item: `task | deadline | required_doc | warning`.
- Em caso de JSON invalido, a API faz retry antes de falhar.

### Condicionais e dependencias

- Linguagem condicional (ex.: `caso`, `se`, `desde que`, `conforme`) ativa `conditional=true`.
- Itens condicionais sem dependencia explicita recebem dependencia padrao.

### Datas relativas

- Datas absolutas sao preservadas.
- Datas em texto (`dd/mm/yyyy` ou `yyyy-mm-dd`) sao normalizadas.
- Expressoes relativas suportadas: `apos`, `antes`, `ate X dias apos`, `dias uteis`, `horas`.
- Resolucao prioriza ancora no proprio documento.
- `base_date` entra apenas como fallback quando necessario.
- Sem ancora resolvivel: `due_date = null` e `confidence = uncertain`.

### Exportacao ICS

- Reprocessa eventos executaveis antes de exportar.
- Exporta apenas itens com `due_date` resolvida.
- Para janelas `ate X dias apos ...`, gera evento de inicio e de vencimento.
- Calendario e all-day (`VALUE=DATE`) nesta versao.

## 9) Variaveis de Ambiente

Arquivo de referencia: `.env.example`.

| Variavel | Obrigatoria | Descricao |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Chave anon publica do Supabase |
| `OPENAI_API_KEY` | Sim | Chave da API da OpenAI |
| `OPENAI_MODEL` | Nao | Modelo de extracao (default: `gpt-4.1-mini`) |
| `OPENAI_MAX_INPUT_CHARS` | Nao | Limite de caracteres enviados ao modelo (default: `180000`) |
| `NEXT_PUBLIC_TEST_DOCS_DRIVE_URL` | Nao | Link de pasta publica com PDFs de teste |

Observacoes:

- `OPENAI_MAX_INPUT_CHARS` e validado entre `10000` e `500000`.
- `.env.local` deve permanecer fora do Git.

## 10) Setup Local

### Pre-requisitos

- Node.js 20+
- Projeto Supabase ativo
- OAuth Google configurado no Supabase Auth
- Chave OpenAI valida

### Passo a passo

1. Instale dependencias:

```bash
npm install
```

2. Copie ambiente (Linux/macOS):

```bash
cp .env.example .env.local
```

2.1 Copie ambiente (Windows PowerShell):

```powershell
Copy-Item .env.example .env.local
```

3. Preencha `.env.local` com os valores reais.

4. Execute migrations no SQL Editor do Supabase (nesta ordem):

- `supabase/migrations/001_init.sql`
- `supabase/migrations/002_storage.sql`

5. Configure Redirect URLs de Auth no Supabase:

- Local: `http://localhost:3000/auth/callback`
- Producao (Vercel): `https://SEU-DOMINIO.vercel.app/auth/callback`

6. Rode a aplicacao:

```bash
npm run dev
```

7. Acesse `http://localhost:3000`.

## 11) Scripts Disponiveis

- `npm run dev` inicia ambiente de desenvolvimento.
- `npm run build` gera build de producao.
- `npm run start` inicia app em modo producao.
- `npm run typecheck` executa checagem de tipos sem emit.

## 12) Deploy

### 12.1 Publicar no GitHub

```bash
git add .
git commit -m "docs: atualiza README completo"
git branch -M main
git remote add origin <URL_DO_REPOSITORIO>
git push -u origin main
```

### 12.2 Publicar na Vercel

1. Importar repositorio no painel da Vercel.
2. Framework detectado: Next.js.
3. Configurar variaveis de ambiente na Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_MAX_INPUT_CHARS`
- `NEXT_PUBLIC_TEST_DOCS_DRIVE_URL` (opcional)

4. Deploy inicial.
5. Atualizar Redirect URL no Supabase para o dominio final da Vercel.
6. Fazer redeploy se necessario.

## 13) Qualidade, Observabilidade e Troubleshooting

### Checks recomendados antes de deploy

```bash
npm run typecheck
npm run build
```

### Problemas comuns

- `Nao autenticado` nas APIs:
  - Sessao nao estabelecida ou callback OAuth nao configurado.
- `PDF sem texto util`:
  - PDF escaneado ou com baixa extraibilidade; usar `pasted_text`.
- `LLM retornou JSON invalido apos retry`:
  - Resposta do modelo fora de schema; revisar prompt/modelo e limite de entrada.
- Itens sem prazo no ICS:
  - `due_date` nao resolvida (ver `due_date_raw`, `confidence`, dependencias).

## 14) Documentacao Complementar

- Regras de negocio: `docs/regras-negocio/README.md`
- Resolucao de datas relativas: `docs/regras-negocio/01-resolucao-datas-relativas.md`
- Exportacao ICS: `docs/regras-negocio/02-exportacao-ics.md`
- Data base fallback: `docs/regras-negocio/03-data-base-fallback.md`
- Cenarios e limitacoes do MVP: `docs/regras-negocio/04-cenarios-mvp-e-limitacoes.md`
- Runbook de fontes de teste: `docs/runbooks/01-fontes-curadas-editais-e-documentos-teste.md`

## 15) Estado Atual do MVP

Coberto nesta versao:

- Extracao estruturada com rastreabilidade.
- Normalizacao de prazos relativos com fallback de data base.
- Checklist operacional com status por usuario.
- Exportacao ICS orientada a execucao.

Limitacoes conhecidas:

- `dias uteis` considera apenas segunda a sexta (sem feriados oficiais).
- Eventos ICS sem horario especifico e sem `VALARM`.
- Expressoes juridicas muito abertas podem permanecer `uncertain`.

---

Se voce estiver em fase de deploy, este README cobre o baseline operacional para GitHub + Vercel + Supabase com o comportamento atual do projeto.


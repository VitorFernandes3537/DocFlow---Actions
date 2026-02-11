# 01 - Fontes curadas de editais e documentos para teste

Data de validacao dos links: 11/02/2026.

Objetivo: ter uma lista curta e confiavel de fontes reais para testar o DocFlow com casos de datas absolutas, datas relativas, retificacoes e volume alto de documentos.

## Lista curada (links prontos)

| Fonte | Link | Melhor uso no DocFlow | Tipo de caso |
|---|---|---|---|
| PNCP - Consulta de editais | https://pncp.gov.br/app/editais | Coletar grande volume de editais reais de orgaos diferentes | Escala, datas absolutas, anexos |
| PNCP - Dados abertos | https://www.gov.br/pncp/pt-br/acesso-a-informacao/dados-abertos | Buscar massa de dados para testes recorrentes e automacao | Escala e regressao |
| PNCP - Swagger/API | https://pncp.gov.br/api/pncp/swagger-ui/index.html?configUrl=/pncp-api/v3/api-docs/swagger-config | Integrar coleta automatica de documentos para suite de testes | API, automacao |
| Portal de Compras Publicas - Processos | https://www.portaldecompraspublicas.com.br/processos/ | Encontrar processos com anexos de edital para simulacao de uso real | Edital + anexos |
| SUSEP - Licitacoes 2025 | https://www.gov.br/susep/pt-br/acesso-a-informacao/licitacoes-e-contratos/avisos-de-editais/licitacoes-2025 | Testar cronogramas oficiais com comunicados e anexos | Datas absolutas e atualizacoes |
| CAPES - Central de editais | https://www.gov.br/capes/pt-br/centrais-de-conteudo/editais | Testar editais academicos e anexos com cronogramas | Datas absolutas |
| CAPES - Editais (avaliacao) | https://www.gov.br/capes/pt-br/acesso-a-informacao/acoes-e-programas/avaliacao/sobre-a-avaliacao/editais | Casos com retificacao e multiplas publicacoes por edital | Retificacao e historico |
| IFSP - Processo seletivo simplificado | https://spo.ifsp.edu.br/menu/71-menu-principal-trabalhe-conosco/201-processo-seletivo-simplificado | Casos com edital + cronograma + recursos na mesma pagina | Fluxo de etapas |
| IFSP - Editais institucionais 2025 | https://spo.ifsp.edu.br/menu-institucional/78-menu-institucional-documentos-institucionais/4080-documentos-institucionais-editais-2025 | Navegar por varios editais e formatos de publicacao | Cobertura ampla |
| IFSP - Exemplo direto em PDF | https://www.ifsp.edu.br/images/2025/ps2026/edital_linguagem_simples_OK.pdf | Upload direto de PDF sem passar por pagina intermediaria | Smoke test rapido |
| IFPB - Portal do estudante (edital com retificacoes) | https://estudante.ifpb.edu.br/editais/%28381/EDITAL/view | Edital com cadeia de atualizacoes (retificacao, errata, 2a errata) | Retificacao multipla |
| IFPB - Retificacao de cronograma | https://www.ifpb.edu.br/prpipg/editais/ano-2025/edital-no-40-2025-prpipg/retificacao-do-cronograma-retificado/view | Validar mudanca de prazo e impacto em eventos exportados | Retificacao de prazo |
| IFB - Retificacao de edital (monitoria) | https://ifb.edu.br/samambaia/42013-processo-seletivo-para-o-programa-monitoria-de-2025-retificacao-do-edital | Caso simples de retificacao com anexo PDF | Retificacao simples |
| Prefeitura de Sao Mateus/ES - Edital PDF | https://saomateus.es.gov.br/uploads/documento/arquivo/17303/EDITAL_N___001_2025_-_SEME.pdf | Caso com linguagem de prazo relativa no texto juridico | Datas relativas |

## Kit sugerido para demonstracao ao usuario (MVP)

1. PDF direto e simples: `https://www.ifsp.edu.br/images/2025/ps2026/edital_linguagem_simples_OK.pdf`
2. Caso com retificacao multipla: `https://estudante.ifpb.edu.br/editais/%28381/EDITAL/view`
3. Caso de prazo relativo: `https://saomateus.es.gov.br/uploads/documento/arquivo/17303/EDITAL_N___001_2025_-_SEME.pdf`
4. Caso de volume alto: `https://pncp.gov.br/app/editais`

## Criterios de curadoria usados

1. Fonte oficial (governo federal, estadual, municipal ou instituicao publica).
2. Acesso publico sem autenticacao obrigatoria para consulta inicial.
3. Presenca de edital e/ou anexos de cronograma.
4. Utilidade pratica para testar o core do produto (extracao de prazo, datas relativas e ICS).

## Observacoes operacionais

1. Algumas paginas usam listagens dinamicas; nesse caso, capturar o PDF anexado e testar upload direto no DocFlow.
2. Em retificacoes, testar sempre o edital original e o documento de retificacao para validar consistencia de eventos.
3. Revalidar links trimestralmente para manter o runbook atualizado.

## Pacote de demonstracao da feira (5 PDFs)

Arquivos escolhidos para demo publica:

1. `Edital do PROCESSO SELETIVO SIMPLIFICADO PARA PROFESSOR SUBSTITUTO SP.pdf`
2. `PROCESSO SELETIVO PARA O MESTRADO PROFISSIONAL EM TECNOLOGIA PARAIBA.pdf`
3. `edital_IFSP_linguagem_simples_OK.pdf`
4. `PNCP Contracao futura de empresas para coleta de lixo hospitalar - EDITAL-PE.048.2025.pdf`
5. `Edital de Chamamento Publico - SEMAS.pdf`

Medicao feita com o mesmo parser do backend (`/api/extract`):

| Arquivo | totalInputChars | truncaria com 10000 |
|---|---:|---|
| Professor Substituto SP | 52073 | Sim |
| Mestrado Profissional PB | 23439 | Sim |
| IFSP linguagem simples | 31224 | Sim |
| PNCP lixo hospitalar | 166598 | Sim |
| Chamamento Publico SEMAS | 114192 | Sim |

### Recomendacao de OPENAI_MAX_INPUT_CHARS para esse pacote

1. Minimo teorico sem margem: `166598` (na pratica, arriscado).
2. Margem 10%: `183258`.
3. Margem 15%: `191588`.
4. Margem 20%: `199918`.

Valor recomendado para demo e MVP atual: `200000`.

## Habilitar botao "Documentos de teste" no formulario

Defina no ambiente:

```env
NEXT_PUBLIC_TEST_DOCS_DRIVE_URL=https://drive.google.com/drive/folders/SEU_FOLDER_ID
```

Regras:

1. A pasta deve estar como `Qualquer pessoa com o link` e permissao `Leitor`.
2. O botao aparece no upload de PDF apenas quando a variavel estiver preenchida.
3. Depois de alterar `.env.local`, reinicie o servidor `npm run dev`.


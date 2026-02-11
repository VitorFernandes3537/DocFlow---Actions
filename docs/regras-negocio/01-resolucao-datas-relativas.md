# 01 - Resolucao de Datas Relativas

## Escopo

Motor implementado em `lib/relative-dates.ts`, integrado na extracao via `lib/utils.ts` e `app/api/extract/route.ts`.

## Regra geral

Para cada item:

1. Se ja vier `due_date` valida, manter.
2. Se `due_date_raw` tiver data explicita (`dd/mm/aaaa` ou `aaaa-mm-dd`), converter para `due_date`.
3. Se o texto tiver prazo relativo, tentar resolver por referencia textual.
4. Se nao resolver, marcar como relativo nao resolvido.

## Padroes relativos suportados no MVP

### Apos

- `X dias apos ...`
- `X dias uteis apos ...`
- `X dias corridos apos ...`
- `X horas apos ...`
- variantes com `a partir de`, `depois de`, `contados da/do/de`

### Janela "ate"

- `ate X dias apos ...`
- `ate X dias uteis apos ...`
- `ate X horas apos ...`

Essa regra e classificada internamente como `window_after`.

### Antes

- `X dias antes de ...`
- `X dias uteis antes de ...`
- `X horas antes de ...`

## Ordem de resolucao de ancora

Para o trecho de referencia (ancora):

1. Se a ancora tiver data explicita, usar essa data.
2. Se nao tiver, buscar item candidato com `due_date` ja conhecida.
   - matching por tokens normalizados;
   - bonus quando frase da ancora aparece quase inteira no candidato.
3. Se a ancora for generica (ex.: publicacao do edital) e houver `base_date`, usar `base_date`.
4. Se nada funcionar, manter sem `due_date`.

## Resolucao em cadeia

O motor roda em passes iterativos (ate `N` passes, onde `N = numero de itens`):

- item A pode depender de B;
- item B pode depender de C;
- quando C resolve, B pode resolver no proximo passe;
- depois A resolve.

## Regras de calculo

- `days`: dias corridos;
- `business_days`: ignora sabado e domingo;
- `hours`: soma horas e normaliza para data (dia) no resultado.

## Saidas adicionais internas

O motor anexa metadados de resolucao:

- `relative_rule`: `after | before | window_after | null`
- `relative_anchor_text`
- `relative_window_start_date` (quando `window_after`)
- `relative_source`: `explicit_date | anchor_item | base_date | unresolved | none`

## Comportamento de incerteza

Se um item continuar relativo e sem resolucao:

- `due_date` fica `null`;
- `confidence` vira `uncertain`;
- dependencias recebem nota de referencia temporal nao resolvida.

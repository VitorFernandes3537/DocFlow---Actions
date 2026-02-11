# 03 - Data Base como Fallback

## Principio

`base_date` nao e mais tratada como fonte primaria para todo prazo relativo.

Nova regra:

- primeiro tentar resolver pelo proprio documento;
- usar `base_date` apenas quando a referencia temporal nao tiver data explicita.

## O que isso resolve

- reduz dependencia de leitura manual do usuario;
- evita erro de usar uma unica data global para cenarios com multiplos marcos.

## Quando `base_date` ainda ajuda

- ancora generica sem data no texto:
  - "apos publicacao deste edital"
  - "contados da divulgacao"

Nesses casos, `base_date` serve como data de referencia de fallback.

## UX atual

No formulario de novo documento, o campo foi atualizado para refletir fallback:

- texto orienta que e opcional;
- foco em casos sem data de referencia explicita.

Arquivo: `components/new-document-form.tsx`

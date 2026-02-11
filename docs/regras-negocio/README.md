# Regras de Negocio - Datas Relativas e ICS (MVP)

Este diretorio documenta as regras de negocio implementadas no DocFlow para:

- resolucao automatica de datas relativas;
- uso de `data base` como fallback;
- exportacao ICS com eventos de prazo.

## Arquivos

1. `01-resolucao-datas-relativas.md`
2. `02-exportacao-ics.md`
3. `03-data-base-fallback.md`
4. `04-cenarios-mvp-e-limitacoes.md`

## Objetivo do conjunto

Garantir previsibilidade do core do produto:

- o usuario nao precisa ler o edital inteiro para calcular prazo relativo;
- o sistema resolve automaticamente quando ha referencia temporal no proprio texto;
- o ICS inclui o maximo de eventos possivel apos resolucao.
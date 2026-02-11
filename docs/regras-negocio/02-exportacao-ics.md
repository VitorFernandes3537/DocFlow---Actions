# 02 - Exportacao ICS

## Escopo

Implementado em `app/api/export/route.ts`.

## Regra de inclusao de eventos

Antes de gerar ICS, os itens passam novamente pelo resolvedor de datas relativas:

- isso cobre documentos antigos ou itens ainda nao resolvidos na extracao inicial;
- itens sem `due_date` continuam fora do ICS.

## Evento padrao (fim/prazo)

Para cada item com `due_date`:

- gera `VEVENT` com `DTSTART;VALUE=DATE` na data calculada;
- `SUMMARY` usa titulo normalizado;
- `DESCRIPTION` inclui descricao util e evidencia quando disponivel.

## Evento adicional de inicio de prazo

Para regras com janela (`ate X dias apos ...`):

- se houver `relative_window_start_date`, gera evento extra;
- evento extra representa o inicio do prazo;
- evento original representa o encerramento (vencimento).

### Exemplo de comportamento

Texto: `podera fazer Y em ate 7 dias apos a ratificacao de X`

Resultado no ICS:

1. Evento "Inicio do prazo: Y" na data da ratificacao de X.
2. Evento de vencimento de Y em `ratificacao + 7 dias`.

## UID dos eventos

- Evento principal: `<item-id>@docflow-actions`
- Evento de inicio: `<item-id>-start@docflow-actions`

## Observacoes MVP

- exportacao atual usa eventos all-day (`VALUE=DATE`);
- nao ha alarmes ICS (`VALARM`) nesta versao;
- a semantica "inicio do prazo" e implementada como evento separado.

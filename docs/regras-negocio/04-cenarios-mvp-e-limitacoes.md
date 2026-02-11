# 04 - Cenarios MVP e Limitacoes

## Cenarios cobertos no MVP

1. Prazo absoluto direto.
   - Ex.: `inscricoes ate 12/03/2026`

2. Prazo relativo com ancora explicita em outro item.
   - Ex.: `recurso em 2 dias uteis apos resultado preliminar`
   - Se resultado preliminar tiver data, recurso resolve automaticamente.

3. Janela de prazo com "ate X dias apos ...".
   - Calcula fim do prazo;
   - registra inicio da janela para ICS.

4. Cadeia de dependencias temporais.
   - Ex.: A depende de B, B depende de C.

## Regra de incerteza

Se nao houver ancora resolvivel:

- item fica sem `due_date`;
- `confidence='uncertain'`;
- sistema preserva rastreabilidade em dependencias.

## Limitacoes conhecidas (MVP)

1. Nao interpreta calendarios especiais (feriados regionais/nacionais).
   - `dias uteis` considera apenas segunda a sexta.

2. Nao resolve linguagem temporal muito aberta.
   - Ex.: "logo apos homologacao", sem marco identificavel.

3. Nao gera horario especifico no ICS.
   - eventos sao all-day.

4. Nao cria `VALARM` no arquivo ICS nesta fase.
   - lembrete de inicio de prazo e feito via evento adicional.

## Evolucoes recomendadas (pos-MVP)

1. Cadastro de marcos temporais faltantes por item (prompt interativo guiado).
2. Suporte a feriados e calendario util oficial.
3. Alarmes ICS (`VALARM`) configuraveis.
4. Melhor parse de expressoes juridicas complexas e anexos de retificacao.
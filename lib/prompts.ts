export function buildExtractionPrompt(docText: string, baseDate: string | null) {
  return `Voce vai analisar um documento (edital/regulamento).
Sua tarefa e produzir um plano executavel com rastreabilidade.

REGRAS:
- Retorne SOMENTE JSON no schema definido.
- Para cada item extraido, inclua evidence_snippet (trecho literal) e evidence_ref (se souber).
- Identifique tarefas, prazos, documentos exigidos e avisos.
- IMPORTANTE PARA required_doc:
  - Cada item required_doc deve representar EXATAMENTE 1 documento exigido.
  - Nao agrupe listas inteiras em um unico item.
  - Se o texto trouxer 10 documentos para inscricao, retorne 10 itens required_doc.
  - No campo description, informe de forma curta a relacao/grupo (ex.: "Documentos para inscricao" ou "Documentos para matricula").
- Marque conditional=true quando houver excecoes/condicionais ('exceto', 'salvo', 'conforme anexo', 'retificado', 'desde que', etc.) e explique em dependencies.
- Datas:
  - Se data absoluta, preencha due_date.
  - Se data relativa, preencha due_date_raw com a frase literal do prazo relativo.
  - Primeiro tente resolver a data relativa usando referencias do proprio texto (ex.: resultado preliminar em data absoluta, retificacao publicada em data absoluta, convocacao com data).
  - Quando conseguir resolver pela propria referencia textual, preencha due_date calculada mesmo sem BASE_DATE.
  - Use BASE_DATE apenas como fallback quando a referencia temporal nao tiver data explicita no texto.
  - Em dependencies, inclua de forma curta qual evento foi usado como referencia temporal (ex.: "referencia: publicacao do resultado preliminar").
- Se algo estiver ambiguo, nao invente: marque confidence='uncertain'.

SCHEMA:
{
  "document_summary": {
    "title": "string",
    "purpose": "string",
    "target_audience": "string"
  },
  "base_date_needed": true,
  "items": [
    {
      "id": "string",
      "type": "task | deadline | required_doc | warning",
      "title": "string",
      "description": "string",
      "due_date": "YYYY-MM-DD | null",
      "due_date_raw": "string | null",
      "conditional": true,
      "dependencies": ["string"],
      "evidence_snippet": "string",
      "evidence_ref": "string | null",
      "confidence": "high | medium | low | uncertain"
    }
  ]
}

BASE_DATE (se fornecida): ${baseDate ?? "n/a"}

TEXTO DO DOCUMENTO:
${docText}`;
}

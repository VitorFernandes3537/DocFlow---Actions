-- DocFlow Actions — Seed OPCIONAL de demonstração
-- Os dados são por-usuário (RLS via auth.uid()). Portanto:
--   1) Faça login com Google no app AO MENOS UMA VEZ (cria a linha em auth.users).
--   2) Rode este arquivo no Supabase Studio → SQL Editor (o SQL Editor ignora RLS).
-- Ele cria um documento de exemplo + itens para o usuário mais recente de auth.users.
--
-- Observação: para o portfólio, o mais impressionante é usar o app "de verdade"
-- (colar um edital e ver a IA extrair). Este seed é só um atalho para já ter dados na tela.

do $$
declare
  v_user uuid;
  v_doc  uuid;
begin
  select id into v_user from auth.users order by created_at desc limit 1;

  if v_user is null then
    raise notice 'Nenhum usuário em auth.users. Faça login com Google primeiro e rode de novo.';
    return;
  end if;

  insert into public.documents (user_id, title, source_type, base_date)
  values (v_user, 'Edital de Demonstração — Jovem Tech', 'pasted', current_date)
  returning id into v_doc;

  insert into public.extracted_items
    (document_id, type, title, description, due_date, due_date_raw,
     conditional, dependencies, evidence_snippet, evidence_ref, confidence)
  values
    (v_doc, 'deadline', 'Prazo final de inscrição',
       'Enviar o formulário de inscrição dentro do prazo.', current_date + 4, 'até 17/07',
       false, '[]'::jsonb, 'As inscrições encerram em 17/07.', 'Cronograma', 'high'),
    (v_doc, 'required_doc', 'Currículo do Responsável Técnico',
       'Anexo IV preenchido e assinado.', null, null,
       false, '["Anexo IV"]'::jsonb, 'Deverá anexar o currículo do responsável técnico.', 'Anexo IV', 'high'),
    (v_doc, 'task', 'Preparar Plano de Aula',
       'Elaborar o plano com metodologia PBL.', current_date + 10, 'na aula prática',
       true, '[]'::jsonb, 'O Plano de Aula deverá conter os elementos mínimos.', 'Art. 36', 'medium'),
    (v_doc, 'warning', 'Nota mínima no Plano de Aula',
       'Eliminação caso a nota seja inferior a 15 pontos.', null, null,
       false, '[]'::jsonb, 'Será eliminada a participante com nota inferior a 15.', 'Art. 38', 'high');

  insert into public.raw_extractions (document_id, payload)
  values (v_doc, jsonb_build_object('seed', true, 'items', 4))
  on conflict (document_id) do nothing;

  raise notice 'Seed OK — usuário %, documento %', v_user, v_doc;
end $$;

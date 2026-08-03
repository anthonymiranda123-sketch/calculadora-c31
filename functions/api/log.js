// Log de uso do chat — Cloudflare Pages Function.
//
// A versao Vercel guardava as conversas num array em memoria, que zerava a cada
// cold start: na pratica nunca persistiu nada. Aqui o endpoint responde 200 para
// o front nao quebrar (ele chama sem await e ignora erro), e registra no log do
// Worker, que fica visivel em `wrangler pages deployment tail`.
//
// Para virar analise de verdade, o destino natural e uma tabela no Supabase do
// Controle de Closers, junto com o resto da telemetria do C31 — nao um KV novo
// so para isso.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request }) {
  try {
    const { type, feedback, tags } = await request.json();
    console.log('[chat-log]', JSON.stringify({ type, feedback, tags }));
  } catch {
    // corpo invalido nao e motivo para estourar erro no front
  }
  return json({ ok: true });
}

export const onRequestGet = () =>
  json({ ok: true, persistido: false, motivo: 'log de uso ainda nao tem armazenamento' });

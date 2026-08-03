// Chat IA Closer — Cloudflare Pages Function.
//
// Mesmo comportamento da versao Vercel (api/chat.js), na runtime do Workers:
// aqui nao existe req/res do Node, e sim Request/Response da Web API.
// O prompt vem de shared/prompt-closer.js — fonte unica das duas.

import { SYSTEM_PROMPT, ASSISTENTE_ADDON } from '../../shared/prompt-closer.js';
import { tokenValido } from '../../shared/auth-supabase.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }) {
  // Só o time logado (login do Rep Control)
  if (!(await tokenValido(request.headers.get('authorization')))) {
    return json({ error: 'Faça login pra usar o chat.' }, 401);
  }

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    // Sem chave configurada o chat nao responde. A mensagem sai em portugues
    // porque quem le e o closer na call, nao quem mantem o projeto.
    return json({ error: 'O chat esta temporariamente indisponivel. A calculadora segue funcionando normalmente.' }, 503);
  }

  try {
    const { messages, papel } = await request.json();

    const systemContent = papel === 'assistente'
      ? SYSTEM_PROMPT + ASSISTENTE_ADDON
      : SYSTEM_PROMPT;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemContent },
          ...(messages || []).map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!response.ok) {
      return json({ error: await response.text() }, response.status);
    }

    const data = await response.json();
    return json({ content: data.choices[0].message.content });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

// Sem handler generico de proposito: com onRequest exportado, ele passaria a
// atender tambem o POST e engoliria o handler acima. Metodo nao tratado ja
// recebe 405 do proprio Pages.

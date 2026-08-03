// Vercel Serverless Function — Chat IA Closer (RAG Anthony Miranda)
//
// O prompt mora em shared/prompt-closer.js, compartilhado com a versao
// Cloudflare Pages (functions/api/chat.js). Editar sempre la.

import { SYSTEM_PROMPT, ASSISTENTE_ADDON } from '../shared/prompt-closer.js';
import { tokenValido } from '../shared/auth-supabase.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Só o time logado (login do Rep Control) — endpoint aberto gastava a chave
  if (!(await tokenValido(req.headers.authorization))) {
    return res.status(401).json({ error: 'Faça login pra usar o chat.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { messages, papel } = req.body;

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
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    return res.status(200).json({
      content: data.choices[0].message.content
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Vercel Serverless — Log conversations for analytics
import { tokenValido } from '../shared/auth-supabase.js';
// Stores in Vercel KV or returns aggregated insights

// In-memory store (resets on cold start — for MVP)
// TODO: Replace with Vercel KV or Supabase for persistence
let conversationLog = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Só o time logado (login do Rep Control)
  if (!(await tokenValido(req.headers.authorization))) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // POST — log a conversation
  if (req.method === 'POST') {
    const { type, content, feedback, tags } = req.body;
    conversationLog.push({
      type, // "chat", "whatsapp", "call"
      content,
      feedback, // "worked", "didnt_work", null
      tags, // ["DOR:sair_aluguel", "OBJECAO:vou_pensar"]
      timestamp: new Date().toISOString(),
    });
    return res.status(200).json({ ok: true, total: conversationLog.length });
  }

  // GET — return analytics
  if (req.method === 'GET') {
    const tagCounts = {};
    const dorCounts = {};
    const objCounts = {};
    let worked = 0, didnt = 0;

    for (const entry of conversationLog) {
      if (entry.feedback === "worked") worked++;
      if (entry.feedback === "didnt_work") didnt++;
      if (entry.tags) {
        for (const tag of entry.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          if (tag.startsWith("DOR:")) dorCounts[tag] = (dorCounts[tag] || 0) + 1;
          if (tag.startsWith("OBJECAO:")) objCounts[tag] = (objCounts[tag] || 0) + 1;
        }
      }
    }

    return res.status(200).json({
      total: conversationLog.length,
      feedback: { worked, didnt_work: didnt },
      top_dores: Object.entries(dorCounts).sort((a,b) => b[1]-a[1]).slice(0,10),
      top_objecoes: Object.entries(objCounts).sort((a,b) => b[1]-a[1]).slice(0,10),
      all_tags: Object.entries(tagCounts).sort((a,b) => b[1]-a[1]).slice(0,20),
      recent: conversationLog.slice(-5),
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

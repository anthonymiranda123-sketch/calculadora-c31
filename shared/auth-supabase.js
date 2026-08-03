// Acesso restrito ao time — mesmo login do Rep Control (Supabase dedicado).
// Fonte única das duas runtimes (api/ Vercel e functions/ Cloudflare).
// A anon key é pública por design (RLS protege os dados); validar o JWT
// aqui impede que qualquer um descubra o endpoint e gaste a chave OpenAI.

export const SUPA_URL = 'https://qzyqewkadeyrdiuqamlp.supabase.co';
export const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6eXFld2thZGV5cmRpdXFhbWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjIwNjgsImV4cCI6MjEwMDkzODA2OH0.1OE6z1LMRuINVb3B1Hk0SCdq4nhSRyiAk3jYsJhaWQ0';

/** true se o Bearer token é uma sessão viva do Rep Control. */
export async function tokenValido(authorizationHeader) {
  const jwt = String(authorizationHeader ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return false;
  const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers: { apikey: SUPA_ANON, Authorization: `Bearer ${jwt}` },
  });
  return r.ok;
}

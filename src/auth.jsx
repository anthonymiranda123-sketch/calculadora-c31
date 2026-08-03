// Portão de acesso — mesmo login do Rep Control (vendedores, representantes,
// gestão). Quem não está na plataforma não entra; bloqueou lá, perdeu aqui.
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { COR, GRADIENTE } from "./tema";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://qzyqewkadeyrdiuqamlp.supabase.co";
const SUPA_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6eXFld2thZGV5cmRpdXFhbWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjIwNjgsImV4cCI6MjEwMDkzODA2OH0.1OE6z1LMRuINVb3B1Hk0SCdq4nhSRyiAk3jYsJhaWQ0";

// eslint-disable-next-line react-refresh/only-export-components
export const supabase = createClient(SUPA_URL, SUPA_ANON, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "c31-auth" },
});

/** Token da sessão pras chamadas de API (chat/log). */
// eslint-disable-next-line react-refresh/only-export-components
export async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

const estilos = {
  pagina: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0c0c0f", padding: 24, fontFamily: "system-ui, -apple-system, sans-serif",
  },
  card: {
    width: "100%", maxWidth: 380, background: "#141418", border: "1px solid #26262c",
    borderRadius: 16, padding: 28, boxSizing: "border-box",
  },
  kicker: {
    margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
    textTransform: "uppercase", color: COR.primaria, fontFamily: "monospace",
  },
  titulo: { margin: "6px 0 4px", fontSize: 22, fontWeight: 800, color: "#f4f4f5", textTransform: "uppercase" },
  sub: { margin: "0 0 20px", fontSize: 13, color: "#9a9aa3", lineHeight: 1.5 },
  label: {
    display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
    textTransform: "uppercase", color: "#9a9aa3", marginBottom: 6, fontFamily: "monospace",
  },
  input: {
    width: "100%", height: 44, boxSizing: "border-box", padding: "0 14px",
    background: "#0f0f13", border: "1px solid #2c2c33", borderRadius: 10,
    color: "#f4f4f5", fontSize: 14, outline: "none", marginBottom: 14,
  },
  botao: {
    width: "100%", height: 46, border: 0, borderRadius: 10, cursor: "pointer",
    background: GRADIENTE, color: "#fff", fontSize: 13, fontWeight: 800,
    letterSpacing: "0.12em", textTransform: "uppercase",
  },
  erro: {
    margin: "0 0 14px", padding: "10px 12px", borderRadius: 8, fontSize: 12.5,
    background: "rgba(216,60,49,0.12)", border: "1px solid rgba(216,60,49,0.4)", color: "#f0a9a4",
  },
  rodape: { margin: "18px 0 0", fontSize: 12, color: "#6d6d76", textAlign: "center" },
  sair: {
    position: "fixed", right: 10, bottom: 10, zIndex: 60, padding: "4px 10px",
    background: "rgba(20,20,24,0.85)", border: "1px solid #2c2c33", borderRadius: 999,
    color: "#8a8a93", fontSize: 10, fontFamily: "monospace", letterSpacing: "0.1em",
    textTransform: "uppercase", cursor: "pointer",
  },
};

export function AuthGate({ children }) {
  const [sessao, setSessao] = useState(undefined); // undefined = carregando
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => setSessao(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const entrar = async (e) => {
    e.preventDefault();
    setErro("");
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) {
      setErro(
        /invalid/i.test(error.message)
          ? "E-mail ou senha incorretos. É o mesmo login do Rep Control."
          : /banned|not allowed/i.test(error.message)
            ? "Acesso bloqueado. Fale com seu gestor."
            : error.message,
      );
    }
  };

  if (sessao === undefined) return <div style={estilos.pagina} />;

  if (!sessao) {
    return (
      <div style={estilos.pagina}>
        <form style={estilos.card} onSubmit={entrar}>
          <p style={estilos.kicker}>Acesso do time</p>
          <h1 style={estilos.titulo}>Calculadora C31</h1>
          <p style={estilos.sub}>Entre com o seu login do Rep Control — o mesmo e-mail e senha da plataforma.</p>
          {erro && <p style={estilos.erro}>{erro}</p>}
          <label style={estilos.label}>E-mail</label>
          <input style={estilos.input} type="email" autoComplete="username" value={email}
            onChange={(e) => setEmail(e.target.value)} placeholder="voce@..." />
          <label style={estilos.label}>Senha</label>
          <input style={estilos.input} type="password" autoComplete="current-password" value={senha}
            onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
          <button style={{ ...estilos.botao, opacity: entrando ? 0.6 : 1 }} disabled={entrando} type="submit">
            {entrando ? "Entrando…" : "Entrar"}
          </button>
          <p style={estilos.rodape}>Sem acesso? Fale com seu gestor.</p>
        </form>
      </div>
    );
  }

  return (
    <>
      {children}
      <button style={estilos.sair} onClick={() => void supabase.auth.signOut()} title={sessao.user?.email ?? ""}>
        sair
      </button>
    </>
  );
}

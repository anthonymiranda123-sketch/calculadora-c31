// ═══════════════════════════════════════════════════════════
// MOTOR DE CONTEMPLAÇÃO — dados reais
//
// Substitui o Monte Carlo sintético (que sorteava o lance dos concorrentes
// uniformemente entre 15% e 70% e por isso dava "100% em 1 mês" pra qualquer
// lance alto). Aqui o sorteio é bootstrap sobre o histórico real de MENOR
// LANCE vencedor por assembleia — mesmo motor da skill lances-consorcio.
//
// Regra: o cliente contempla no primeiro mês em que o lance dele for >= o
// menor lance vencedor daquela assembleia. Sorteio comum entra como chance
// mensal separada (contemplações/mês ÷ cotas ativas).
// ═══════════════════════════════════════════════════════════
import DADOS from "./data/grupos.json";
import { COR } from "./tema";

export const META_DADOS = DADOS.meta;
export const GRUPOS = DADOS.grupos;

// Teto de exibição: nunca prometer 100% de contemplação (sorteio/lance é aleatório).
export const PROB_MAX_EXIBIDA = 0.99;

export function monteCarloReal({ menores, lancePct, contempMes, partic, horizonte = 60, sims = 1000 }) {
  const base = (menores || []).filter(m => m > 0);
  if (base.length === 0) return null;

  const lance = lancePct / 100;
  // chance de sorteio comum por mês (independe do lance)
  const pSorteio = contempMes && partic ? Math.min(contempMes / partic, 0.05) : 0;

  const distribuicao = new Array(horizonte + 1).fill(0);
  const meses = [];

  for (let s = 0; s < sims; s++) {
    for (let m = 1; m <= horizonte; m++) {
      const menorDoMes = base[Math.floor(Math.random() * base.length)];
      const ganhouLance = lance > 0 && lance >= menorDoMes;
      const ganhouSorteio = pSorteio > 0 && Math.random() < pSorteio;
      if (ganhouLance || ganhouSorteio) {
        distribuicao[m]++;
        meses.push(m);
        break;
      }
    }
  }

  const probabilidade = meses.length / sims;
  meses.sort((a, b) => a - b);
  const q = p => (meses.length ? meses[Math.min(meses.length - 1, Math.floor(p * meses.length))] : horizonte);

  let mesModa = 1, maxDist = 0;
  for (let i = 1; i <= horizonte; i++) {
    if (distribuicao[i] > maxDist) { maxDist = distribuicao[i]; mesModa = i; }
  }

  return {
    probabilidade,
    mesMedio: meses.length ? Math.round(meses.reduce((a, b) => a + b, 0) / meses.length) : horizonte,
    mesModa,
    p10: q(0.10), p50: q(0.50), p90: q(0.90),
    distribuicao,
    contemplacoesTotal: meses.length,
    numSimulacoes: sims,
    base: "real",
    amostras: base.length,
  };
}

// Lance certo do grupo = maior dos menores da janela (~99% de contemplação).
export function lanceCerto(grupo) {
  return grupo.lanceCerto ?? null;
}

// Confiabilidade: menos de 4 meses de histórico = amostra fraca.
export function confiavel(grupo) {
  return (grupo.meses || 0) >= (META_DADOS.min_meses_confiavel || 4);
}

export function classificaStatus(prob, temHistorico) {
  if (!temHistorico) return { status: "SEM HISTÓRICO", cor: "#6B7280" };
  if (prob >= 0.95) return { status: "CÓDIGO 31", cor: COR.primaria };
  if (prob >= 0.80) return { status: "ALTA CHANCE", cor: COR.clara };
  if (prob >= 0.50) return { status: "CHANCE MÉDIA", cor: COR.ambar };
  if (prob >= 0.25) return { status: "CHANCE BAIXA", cor: COR.ambarEsc };
  return { status: "MUITO BAIXA", cor: COR.erro };
}

// Exibição com teto — "≥99%" em vez de "100.0%".
export function probTexto(prob) {
  if (prob >= PROB_MAX_EXIBIDA) return "≥99%";
  return `${(prob * 100).toFixed(1)}%`;
}

// Pool agregado de menores lances de um tipo/administradora — usado quando o
// cliente ainda não escolheu grupo (visão geral da categoria).
export function poolCategoria(grupos, tipo, adm) {
  const sel = grupos.filter(g => g.tipo === tipo && (!adm || g.adm === adm) && (g.menores || []).length);
  if (!sel.length) return null;
  const menores = sel.flatMap(g => g.menores);
  const comPartic = sel.filter(g => g.partic && g.contemp != null);
  return {
    menores,
    adm: adm || sel[0].adm,
    tipo,
    grupos: sel.length,
    contempMes: comPartic.length ? comPartic.reduce((a, g) => a + g.contemp, 0) / comPartic.length : null,
    partic: comPartic.length ? comPartic.reduce((a, g) => a + g.partic, 0) / comPartic.length : null,
    lanceCertoMin: Math.min(...sel.map(g => g.lanceCerto ?? 999)),
    lanceMedio: menores.reduce((a, b) => a + b, 0) / menores.length * 100,
  };
}

// Grupos candidatos pro cliente: mesmo tipo, com histórico, melhor lance certo primeiro.
export function gruposDoTipo(grupos, tipo, adm) {
  return grupos
    .filter(g => g.tipo === tipo && (!adm || g.adm === adm))
    .filter(g => (g.menores || []).length > 0)
    .sort((a, b) => (a.lanceCerto ?? 999) - (b.lanceCerto ?? 999));
}

import { useState, useMemo, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

// ═══════════════════════════════════════════════════════════
// PRESETS POR CATEGORIA
// ═══════════════════════════════════════════════════════════
const PRESETS = {
  imovel_cnp: { label:"Imóvel CNP Caixa", taxa:0.25, prazo:178, embutidoMax:0.50, participantes:3660, creditoRef:154175, contemp:10, lanceMedio:69.80, parcelaRef:1083 },
  imovel_san: { label:"Imóvel Santander", taxa:0.25, prazo:168, embutidoMax:0.30, participantes:3200, creditoRef:250000, contemp:15, lanceMedio:35, parcelaRef:1860 },
  veiculo_cnp: { label:"Veículo CNP Caixa", taxa:0.205, prazo:80, embutidoMax:0.30, participantes:800, creditoRef:60000, contemp:5, lanceMedio:15.5, parcelaRef:963 },
  veiculo_san: { label:"Veículo Santander", taxa:0.215, prazo:70, embutidoMax:0.30, participantes:1000, creditoRef:100000, contemp:8, lanceMedio:29, parcelaRef:1025 },
  servico: { label:"Serviço/Reforma", taxa:0.25, prazo:100, embutidoMax:0.30, participantes:1200, creditoRef:80000, contemp:8, lanceMedio:25, parcelaRef:800 },
  pesado: { label:"Pesado/Agro", taxa:0.22, prazo:120, embutidoMax:0.30, participantes:1500, creditoRef:200000, contemp:10, lanceMedio:22, parcelaRef:1200 },
};

const SEG = 0.00043 + 0.00055225;

// ═══════════════════════════════════════════════════════════
// GRUPOS REAIS (extraídos das planilhas CNP e Santander)
// ═══════════════════════════════════════════════════════════
const GRUPOS_REAIS = [
  // CNP CAIXA - IMÓVEL (Sheet Grupos + Planilha2)
  { id:"_1043", adm:"CNP Caixa", cor:"#005CA9", tipo:"imovel", taxa:20, fr:5, prazo:178, venc:"Dia 10", vagas:6339, total:9999, partic:3660, parcela:1082.77, lanceMedio:69.80, contemp:10, lancesFixos:539, pctFixos:14.73, pctContempFixo:0.19, creditos:[77087,88100,99112,110125,121137,132150,143162,154175], embutidoMax:50 },
  { id:"_1042", adm:"CNP Caixa", cor:"#005CA9", tipo:"imovel", taxa:20, fr:5, prazo:162, venc:"Dia 10", vagas:7343, total:9999, partic:2656, parcela:1443.39, lanceMedio:69.35, contemp:16, lancesFixos:438, pctFixos:16.49, pctContempFixo:0.23, creditos:[187039,199508,211977,224447,236916,249385,261855,274324,286793,299262,311732], embutidoMax:50 },
  { id:"_1041", adm:"CNP Caixa", cor:"#005CA9", tipo:"imovel", taxa:20, fr:5, prazo:160, venc:"Dia 10", partic:1242, parcela:963.99, lanceMedio:69.17, contemp:9, lancesFixos:162, pctFixos:13.04, creditos:[111046,115126,123384], embutidoMax:50 },
  { id:"_1040", adm:"CNP Caixa", cor:"#005CA9", tipo:"imovel", taxa:20, fr:5, prazo:158, venc:"Dia 10", partic:1515, parcela:978.99, lanceMedio:70.22, contemp:11, lancesFixos:142, pctFixos:9.37, creditos:[110125,123751,127917], embutidoMax:50 },
  { id:"_1036", adm:"CNP Caixa", cor:"#005CA9", tipo:"imovel", taxa:20, fr:5, prazo:148, venc:"Dia 10", partic:2524, parcela:1086.96, lanceMedio:70.82, contemp:22, lancesFixos:254, pctFixos:10.06, creditos:[128695,180173], embutidoMax:50 },
  { id:"_1035", adm:"CNP Caixa", cor:"#005CA9", tipo:"imovel", taxa:20, fr:5, prazo:146, venc:"Dia 10", partic:1293, parcela:1095.23, lanceMedio:69.65, contemp:10, lancesFixos:130, pctFixos:10.05, creditos:[127917,140709], embutidoMax:50 },
  // CNP CAIXA - VEÍCULO (extraído das simulações reais)
  { id:"709", adm:"CNP Caixa", cor:"#005CA9", tipo:"veiculo", taxa:17, fr:3.5, prazo:57, venc:"Dia 10", partic:800, parcela:null, lanceMedio:35, contemp:6, creditos:[30000,50000,80000,100000,120000], embutidoMax:10 },
  { id:"700", adm:"CNP Caixa", cor:"#005CA9", tipo:"veiculo", taxa:17, fr:3.5, prazo:55, venc:"Dia 10", partic:600, parcela:null, lanceMedio:15.5, contemp:5, creditos:[34300,60300,80000,100000,120000], embutidoMax:30 },
  { id:"672", adm:"CNP Caixa", cor:"#005CA9", tipo:"veiculo", taxa:17, fr:3.5, prazo:50, venc:"Dia 10", partic:500, parcela:null, lanceMedio:12, contemp:4, creditos:[30000,50000,80000,100000], embutidoMax:30 },
  // SANTANDER - IMÓVEL (Sheet Tabela + 10MM)
  { id:"3066", adm:"Santander", cor:"#EC0000", tipo:"imovel", taxa:18, fr:3.5, prazo:179, venc:"Dia 15", partic:3000, parcela:null, lanceMedio:29, contemp:12, creditos:[130000,140000,150000,160000,170000,180000,190000,200000,210000,220000,230000,240000,250000], embutidoMax:0 },
  { id:"3065", adm:"Santander", cor:"#EC0000", tipo:"imovel", taxa:20, fr:5, prazo:168, venc:"Dia 15", partic:3200, parcela:1860, lanceMedio:35, contemp:15, creditos:[250000,300000,400000,500000,600000], embutidoMax:15 },
  { id:"3063", adm:"Santander", cor:"#EC0000", tipo:"imovel", taxa:20, fr:5, prazo:166, venc:"Dia 15", partic:3000, parcela:1883, lanceMedio:35, contemp:14, creditos:[250000,300000,400000,500000,600000], embutidoMax:15 },
  { id:"3061", adm:"Santander", cor:"#EC0000", tipo:"imovel", taxa:20, fr:5, prazo:164, venc:"Dia 15", partic:2900, parcela:null, lanceMedio:40, contemp:13, creditos:[250000,300000,400000,500000,600000], embutidoMax:20 },
  { id:"3052", adm:"Santander", cor:"#EC0000", tipo:"imovel", taxa:20, fr:5, prazo:149, venc:"Dia 15", partic:2800, parcela:null, lanceMedio:35, contemp:14, creditos:[130000,200000,250000,300000,350000,400000], embutidoMax:15 },
  { id:"3060", adm:"Santander", cor:"#EC0000", tipo:"imovel", taxa:20, fr:5, prazo:157, venc:"Dia 15", partic:2800, parcela:null, lanceMedio:35, contemp:12, creditos:[300000,350000,400000,500000,600000], embutidoMax:20 },
  { id:"3064", adm:"Santander", cor:"#EC0000", tipo:"imovel", taxa:20, fr:5, prazo:168, venc:"Dia 15", partic:3200, parcela:null, lanceMedio:35, contemp:15, creditos:[300000,400000,500000,600000], embutidoMax:20 },
  // SANTANDER - VEÍCULO / CURTO
  { id:"5011", adm:"Santander", cor:"#EC0000", tipo:"veiculo", taxa:18, fr:3.5, prazo:38, venc:"Dia 10", partic:600, parcela:3197, lanceMedio:29, contemp:5, creditos:[100000,150000,200000,250000,300000], embutidoMax:0 },
  { id:"627", adm:"Santander", cor:"#EC0000", tipo:"veiculo", taxa:17, fr:3.5, prazo:70, venc:"Dia 15", partic:1000, parcela:null, lanceMedio:18, contemp:8, creditos:[130000,150000,180000,200000,250000], embutidoMax:30 },
];

// ═══════════════════════════════════════════════════════════
// PARSERS DE PLANILHAS (CNP, Santander, Lances)
// ═══════════════════════════════════════════════════════════

function parseCNP(workbook) {
  const grupos = [];
  // Sheet "Grupos" = dados completos por grupo
  const wsGrupos = workbook.Sheets["Grupos"];
  if (wsGrupos) {
    const rows = XLSX.utils.sheet_to_json(wsGrupos, { defval: null });
    // Agrupar por grupo (cada grupo tem múltiplas linhas = múltiplos créditos)
    const map = {};
    for (const r of rows) {
      const id = String(r["Grupo"] || "").trim();
      if (!id || id === "Total Geral") continue;
      if (!map[id]) {
        map[id] = {
          id, adm: "CNP Caixa", cor: "#005CA9",
          tipo: "imovel", // default, ajustado abaixo se veículo
          taxa: Number(r["Taxa"]) || 20,
          fr: 5,
          prazo: Number(r["Prazo"]) || 0,
          venc: r["Vencto da\n Assembleia"] ? "Dia " + new Date(r["Vencto da\n Assembleia"]).getDate() : (r["Vencimento"] || "Dia 10"),
          vagas: Number(r["Vagas"]) || null,
          partic: Number(r["Participantes"]) || Number(r["Particp."]) || null,
          parcela: Number(r["Parcela"]) || null,
          lanceMedio: Number(r["Lance Médio"]) || null,
          contemp: Number(r["Média\nContemplados"]) || Number(r["Média Contemplados"]) || null,
          lancesFixos: Number(r["Média Lances\nFixos Ofertados"]) || Number(r["Média Lances Fixos Ofertados"]) || null,
          pctFixos: null,
          creditos: [],
          embutidoMax: 50,
        };
        const pf = Number(r["% Lances\nFixos Ofertados"]) || Number(r["% Lances Fixos Ofertados"]) || null;
        if (pf) map[id].pctFixos = +(pf * 100).toFixed(2);
      }
      const valor = Number(r["Valor"]) || Number(r["Crédito"]) || null;
      if (valor && !map[id].creditos.includes(Math.round(valor))) {
        map[id].creditos.push(Math.round(valor));
      }
    }
    for (const g of Object.values(map)) {
      if (g.creditos.length === 0) continue;
      g.creditos.sort((a, b) => a - b);
      // Detectar tipo veículo pelo prazo curto ou ID de grupo de veículo (< 1000 com prazo < 80)
      if (g.prazo <= 80) g.tipo = "veiculo";
      if (g.lanceMedio) g.lanceMedio = +g.lanceMedio.toFixed(2);
      grupos.push(g);
    }
  }

  // Sheet "Planilha2" = dados resumidos por grupo (fallback se "Grupos" não existe)
  if (grupos.length === 0) {
    const ws2 = workbook.Sheets["Planilha2"];
    if (ws2) {
      const rows = XLSX.utils.sheet_to_json(ws2, { defval: null, header: 1 });
      // Encontrar header row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.some(c => String(c).includes("Grupo"))) {
          // Próximas linhas são dados
          for (let j = i + 1; j < rows.length; j++) {
            const r = rows[j];
            if (!r || !r[4]) break; // coluna Grupo vazia = fim
            const id = String(r[4]).trim();
            if (!id) continue;
            grupos.push({
              id, adm: "CNP Caixa", cor: "#005CA9", tipo: "imovel",
              taxa: 20, fr: 5,
              prazo: Number(r[7]) || 0,
              venc: r[8] || "Dia 10",
              partic: Number(r[11]) || null,
              parcela: Number(r[6]) || null,
              lanceMedio: Number(r[13]) ? +(Number(r[13]) * 100).toFixed(2) : null,
              contemp: Number(r[9]) || null,
              lancesFixos: Number(r[10]) || null,
              pctFixos: r[12] ? +(Number(r[12]) * 100).toFixed(2) : null,
              creditos: [Math.round(Number(r[5]) || 0)].filter(Boolean),
              embutidoMax: 50,
            });
          }
          break;
        }
      }
    }
  }
  return grupos;
}

function parseSantander(workbook) {
  const grupos = [];
  const wsTabela = workbook.Sheets["Tabela"];
  if (!wsTabela) return grupos;

  const raw = XLSX.utils.sheet_to_json(wsTabela, { defval: null, header: 1 });

  // Linha 1 tem os prazos: GRUPO | PRAZO_RESTANTE
  const prazoMap = {};
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (r && r[0] && r[1] && !isNaN(Number(r[0])) && !isNaN(Number(r[1]))) {
      prazoMap[String(r[0])] = Number(r[1]);
    } else {
      break;
    }
  }

  // Colunas 3+ têm blocos de (GRUPO, INCC, DE, PARA) — créditos por grupo
  const creditMap = {};
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    // Cada bloco de 4 colunas (offset 3, 8, 13...) tem: GRUPO, INCC, DE, PARA
    for (let col = 3; col < r.length; col += 5) {
      const grupoId = r[col] != null ? String(r[col]).trim() : null;
      const de = Number(r[col + 2]);
      const para = Number(r[col + 3]);
      if (grupoId && !isNaN(de) && de > 0) {
        if (!creditMap[grupoId]) creditMap[grupoId] = { creditos: new Set(), incc: Number(r[col + 1]) || 0 };
        // Usar o valor "PARA" (com INCC) como crédito real
        creditMap[grupoId].creditos.add(Math.round(para || de));
      }
    }
  }

  // Montar grupos
  for (const [id, data] of Object.entries(creditMap)) {
    const prazo = prazoMap[id] || 168;
    const creditos = [...data.creditos].sort((a, b) => a - b);
    if (creditos.length === 0) continue;
    const isVeiculo = prazo <= 80 || id.startsWith("5") || id.startsWith("6");
    grupos.push({
      id, adm: "Santander", cor: "#EC0000",
      tipo: isVeiculo ? "veiculo" : "imovel",
      taxa: 20, fr: 5,
      prazo,
      venc: "Dia 15",
      partic: null,
      parcela: null,
      lanceMedio: null,
      contemp: null,
      creditos,
      embutidoMax: isVeiculo ? 0 : 15,
    });
  }
  return grupos;
}

function parseLances(workbook, gruposExistentes) {
  const updates = {};
  // Sheet LANCES: GRUPO, MAIOR_LANCE, MEDIO_LANCE, MENOR_LANCE, QTDE_CONTMP
  const wsLances = workbook.Sheets["LANCES"];
  if (wsLances) {
    const rows = XLSX.utils.sheet_to_json(wsLances, { defval: null });
    // Agrupar por grupo — pegar a média dos últimos meses
    const lancePorGrupo = {};
    for (const r of rows) {
      const gid = String(r["GRUPO"] || "").trim();
      if (!gid) continue;
      if (!lancePorGrupo[gid]) lancePorGrupo[gid] = { lances: [], contemps: [] };
      if (r["MEDIO_LANCE"]) lancePorGrupo[gid].lances.push(Number(r["MEDIO_LANCE"]));
      if (r["QTDE_CONTMP"]) lancePorGrupo[gid].contemps.push(Number(r["QTDE_CONTMP"]));
    }
    for (const [gid, data] of Object.entries(lancePorGrupo)) {
      if (!updates[gid]) updates[gid] = {};
      if (data.lances.length > 0) {
        const avg = data.lances.reduce((a, b) => a + b, 0) / data.lances.length;
        updates[gid].lanceMedio = +(avg * 100).toFixed(2);
      }
      if (data.contemps.length > 0) {
        const avg = data.contemps.reduce((a, b) => a + b, 0) / data.contemps.length;
        updates[gid].contempLance = Math.round(avg);
      }
    }
  }

  // Sheet SORTEIOS: GRUPO, QTDE_CONTMP
  const wsSorteios = workbook.Sheets["SORTEIOS"];
  if (wsSorteios) {
    const rows = XLSX.utils.sheet_to_json(wsSorteios, { defval: null });
    const sorteioPorGrupo = {};
    for (const r of rows) {
      const gid = String(r["GRUPO"] || "").trim();
      if (!gid) continue;
      if (!sorteioPorGrupo[gid]) sorteioPorGrupo[gid] = [];
      if (r["QTDE_CONTMP"]) sorteioPorGrupo[gid].push(Number(r["QTDE_CONTMP"]));
    }
    for (const [gid, arr] of Object.entries(sorteioPorGrupo)) {
      if (!updates[gid]) updates[gid] = {};
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      updates[gid].contempSorteio = Math.round(avg);
    }
  }

  // Aplicar updates nos grupos existentes
  const updated = gruposExistentes.map(g => {
    const u = updates[g.id];
    if (!u) return g;
    const novo = { ...g };
    if (u.lanceMedio != null) novo.lanceMedio = u.lanceMedio;
    if (u.contempSorteio != null && u.contempLance != null) {
      novo.contemp = u.contempSorteio + u.contempLance;
    } else if (u.contempSorteio != null) {
      novo.contemp = u.contempSorteio + (u.contempLance || 0);
    }
    return novo;
  });

  return { updated, totalUpdates: Object.keys(updates).length };
}

// Parser para "LANCES CNP" — formato com sheets CNP-Imóvel, CNP-Automóvel, CNP-Pesados
function parseLancesCNP(workbook) {
  const grupos = [];
  const tipoMap = { "CNP-Imóvel": "imovel", "CNP-Automóvel": "veiculo", "CNP-Pesados": "pesado" };

  for (const [sheetName, tipo] of Object.entries(tipoMap)) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const raw = XLSX.utils.sheet_to_json(ws, { defval: null, header: 1 });
    if (raw.length < 3) continue;

    // Row 0 = dates, Row 1 = headers, Row 2+ = data
    const headers = raw[1];

    for (let i = 2; i < raw.length; i++) {
      const r = raw[i];
      if (!r || !r[0]) continue;
      const grupoId = String(r[0]).replace("*", "").trim();
      if (!grupoId || isNaN(Number(grupoId))) continue;

      const partic = Number(r[1]) || null;
      const venc = r[2] ? `Dia ${r[2]}` : "Dia 10";
      const taxaAdm = Number(r[4]) || 0;
      const fr = Number(r[5]) || 0;
      const creditoMenor = Number(r[6]) || 0;
      const creditoMaior = Number(r[7]) || 0;
      const prazo = Number(r[10]) || 0;
      const assemRealiz = Number(r[11]) || 0;

      // Build créditos: menor e maior, mais intermediários se houver
      const creditos = [];
      if (creditoMenor > 0) creditos.push(Math.round(creditoMenor));
      if (creditoMaior > 0 && creditoMaior !== creditoMenor) creditos.push(Math.round(creditoMaior));
      // Check for additional credit columns in the wide area (some sheets have them)
      // For now, also check if there are multiple credit entries per group in the Crédito column area

      if (creditos.length === 0) continue;
      creditos.sort((a, b) => a - b);

      // Extract lance data from repeating monthly blocks (col 13+)
      // Each block: QT Sorteio, QT L. Fixo/Lance, QT L. Livre/Ofertantes, Max, Min
      const sorteios = [];
      const lancesMax = [];
      const lancesMin = [];
      let col = 13;
      while (col < r.length - 2) {
        const qtSort = Number(r[col]);
        if (!isNaN(qtSort) && qtSort > 0) sorteios.push(qtSort);
        // Max lance: could be col+4 or col+3 depending on block format
        // Find "Max" value — it's a percentage
        for (let offset = 1; offset <= 5 && col + offset < r.length; offset++) {
          const val = r[col + offset];
          if (val != null) {
            const num = typeof val === "string" ? parseFloat(val.replace("%", "")) / 100 : Number(val);
            if (num > 0 && num < 1) {
              lancesMax.push(num);
              break;
            }
          }
        }
        col += 6; // Skip to next block
      }

      const contemp = sorteios.length > 0
        ? Math.round(sorteios.reduce((a, b) => a + b, 0) / sorteios.length)
        : null;
      const lanceMedio = lancesMax.length > 0
        ? +(lancesMax.reduce((a, b) => a + b, 0) / lancesMax.length * 100).toFixed(2)
        : null;

      const embutidoMax = tipo === "veiculo" ? 30 : tipo === "pesado" ? 30 : 50;

      grupos.push({
        id: grupoId,
        adm: "CNP Caixa",
        cor: "#005CA9",
        tipo,
        taxa: +(taxaAdm * 100).toFixed(1),
        fr: +(fr * 100).toFixed(1),
        prazo,
        venc,
        partic,
        parcela: null,
        lanceMedio,
        contemp,
        creditos,
        embutidoMax,
      });
    }
  }
  return grupos;
}

function mergeGrupos(base, novos) {
  const map = new Map(base.map(g => [g.id, g]));
  let added = 0, updated = 0;
  for (const g of novos) {
    if (map.has(g.id)) {
      // Merge: atualizar campos não-null do novo
      const existing = map.get(g.id);
      const merged = { ...existing };
      for (const [k, v] of Object.entries(g)) {
        if (v != null && k !== "creditos") merged[k] = v;
      }
      // Merge créditos
      const creditSet = new Set([...existing.creditos, ...g.creditos]);
      merged.creditos = [...creditSet].sort((a, b) => a - b);
      map.set(g.id, merged);
      updated++;
    } else {
      map.set(g.id, g);
      added++;
    }
  }
  return { grupos: [...map.values()], added, updated };
}

// ═══════════════════════════════════════════════════════════
// SIMULAÇÃO MONTE CARLO - CÓDIGO 31
// ═══════════════════════════════════════════════════════════
//
// Simula um grupo de consórcio real:
// - N participantes pagando parcela todo mês
// - Saldo acumula: N × parcela
// - Contemplações por sorteio: saldo ÷ crédito (arredonda pra baixo)
// - Contemplações por lance: quem ofertou lance, o maior ganha
// - Roda 1000 simulações, conta em quantas o cliente contemplou
// - Retorna: probabilidade e mês médio de contemplação
//
function monteCarlo(params) {
  const {
    participantes,   // total de pessoas no grupo
    parcelaMensal,   // parcela que cada um paga
    creditoGrupo,    // crédito médio do grupo (prêmio)
    lancePctCliente, // lance total do cliente (embutido + bolso) em %
    prazo,           // prazo total do grupo em meses
    numSimulacoes = 1000,
    maxMeses = 60,   // simular até 60 meses
  } = params;

  let contemplacoesTotal = 0;
  let somaMeses = 0;
  const distribuicao = new Array(maxMeses + 1).fill(0);

  for (let sim = 0; sim < numSimulacoes; sim++) {
    let contemplou = false;
    let saldoAcumulado = 0;
    // Participantes ativos diminuem conforme são contemplados
    let participantesAtivos = participantes;

    for (let mes = 1; mes <= maxMeses && !contemplou; mes++) {
      // 1. Arrecadação mensal: todos os ativos pagam
      saldoAcumulado += participantesAtivos * parcelaMensal;

      // 2. Contemplações por SORTEIO: saldo permite quantas cartas?
      const contempSorteio = Math.floor(saldoAcumulado / creditoGrupo);
      
      if (contempSorteio > 0) {
        saldoAcumulado -= contempSorteio * creditoGrupo;
        participantesAtivos = Math.max(1, participantesAtivos - contempSorteio);
        
        // Chance do cliente ser sorteado
        // Cada contemplação por sorteio é aleatória entre os ativos
        for (let s = 0; s < contempSorteio && !contemplou; s++) {
          if (Math.random() < 1 / participantesAtivos) {
            contemplou = true;
            somaMeses += mes;
            distribuicao[mes]++;
          }
        }
      }

      // 3. Contemplações por LANCE
      // Simula: ~10-15% dos participantes dão lance a cada mês
      // O lance do cliente compete contra lances aleatórios
      if (!contemplou && lancePctCliente > 0) {
        // % de participantes que dão lance neste mês
        const pctLancistas = 0.10 + Math.random() * 0.08; // 10-18%
        const numLancistas = Math.floor(participantesAtivos * pctLancistas);
        
        if (numLancistas > 0) {
          // Gera lances aleatórios dos outros participantes
          // Distribuição: maioria dá lances entre 20-70% do crédito
          let clienteGanhou = true;
          for (let l = 0; l < numLancistas; l++) {
            // Lance aleatório com distribuição realista
            const lanceOutro = (0.15 + Math.random() * 0.55) * 100; // 15% a 70%
            if (lanceOutro > lancePctCliente) {
              clienteGanhou = false;
              break;
            }
          }
          
          // Mesmo se o lance é alto, precisa ter saldo no grupo
          if (clienteGanhou && saldoAcumulado >= creditoGrupo * 0.3) {
            contemplou = true;
            somaMeses += mes;
            distribuicao[mes]++;
          }
        }
      }

      // 4. Lance fidelidade (após 12 meses pagando, ganha bônus de ~20-30%)
      if (!contemplou && mes >= 12 && lancePctCliente === 0) {
        const lanceFidelidade = 20 + Math.random() * 10; // 20-30%
        const pctLancistas = 0.10 + Math.random() * 0.08;
        const numLancistas = Math.floor(participantesAtivos * pctLancistas);
        
        let ganhou = true;
        for (let l = 0; l < numLancistas; l++) {
          const lanceOutro = (0.15 + Math.random() * 0.55) * 100;
          if (lanceOutro > lanceFidelidade) {
            ganhou = false;
            break;
          }
        }
        
        if (ganhou && saldoAcumulado >= creditoGrupo * 0.3) {
          contemplou = true;
          somaMeses += mes;
          distribuicao[mes]++;
        }
      }
    }

    if (contemplou) contemplacoesTotal++;
  }

  const probabilidade = contemplacoesTotal / numSimulacoes;
  const mesMedio = contemplacoesTotal > 0 ? Math.round(somaMeses / contemplacoesTotal) : maxMeses;

  // Achar o mês com maior concentração
  let mesModa = 1;
  let maxDist = 0;
  for (let i = 1; i <= maxMeses; i++) {
    if (distribuicao[i] > maxDist) { maxDist = distribuicao[i]; mesModa = i; }
  }

  return {
    probabilidade,
    mesMedio,
    mesModa,
    distribuicao,
    contemplacoesTotal,
    numSimulacoes,
  };
}

// ═══════════════════════════════════════════════════════════
// MOTOR DE CÁLCULO (FÓRMULA ANTHONY)
// ═══════════════════════════════════════════════════════════
function calcular(credito, taxa, prazo, embutidoPct, bolsoPct, preset) {
  const saldoDev = credito * (1 + taxa);
  const lanceEmb = credito * embutidoPct;
  const lanceBolso = credito * bolsoPct;
  const lanceTotal = lanceEmb + lanceBolso;
  const lanceTotalPct = (embutidoPct + bolsoPct) * 100;
  const novoSaldo = saldoDev - lanceEmb - lanceBolso;
  const credLib = credito - lanceEmb;
  const credEmp = credLib - lanceBolso;
  const juros = novoSaldo - credEmp;
  const taxaEf = credEmp > 0 ? juros / credEmp : 0;
  const taxaAM = taxaEf / prazo;
  const taxaAA = taxaAM * 12;
  const parcela = novoSaldo / prazo;
  const parcelaMeia = saldoDev / prazo * 0.5;

  // Monte Carlo
  const parcelaGrupo = preset ? preset.parcelaRef : parcela;
  const participantes = preset ? preset.participantes : 3000;
  const creditoGrupo = preset ? preset.creditoRef : credito;

  const mc = monteCarlo({
    participantes,
    parcelaMensal: parcelaGrupo,
    creditoGrupo,
    lancePctCliente: lanceTotalPct,
    prazo,
    numSimulacoes: 1000,
    maxMeses: 60,
  });

  // Monte Carlo sem lance (fidelidade)
  const mcFid = monteCarlo({
    participantes,
    parcelaMensal: parcelaGrupo,
    creditoGrupo,
    lancePctCliente: 0,
    prazo,
    numSimulacoes: 1000,
    maxMeses: 60,
  });

  // Status baseado na simulação
  let status, statusCor;
  if (mc.probabilidade >= 0.95) { status = "CÓDIGO 31"; statusCor = "#D4781E"; }
  else if (mc.probabilidade >= 0.80) { status = "ALTA CHANCE"; statusCor = "#E8943A"; }
  else if (mc.probabilidade >= 0.50) { status = "CHANCE MÉDIA"; statusCor = "#D4781E"; }
  else if (mc.probabilidade >= 0.25) { status = "CHANCE BAIXA"; statusCor = "#F59E0B"; }
  else { status = "MUITO BAIXA"; statusCor = "#EF4444"; }

  // Financiamento comparativo
  const txFinAa = 0.115;
  const txFinAm = Math.pow(1 + txFinAa, 1/12) - 1;
  const parcFin = credEmp > 0 ? credEmp * (txFinAm * Math.pow(1+txFinAm,prazo)) / (Math.pow(1+txFinAm,prazo)-1) : 0;
  const jurosFin = parcFin * prazo - credEmp;

  return {
    credito, taxa, prazo, embutidoPct, bolsoPct,
    saldoDev, lanceEmb, lanceBolso, lanceTotal, lanceTotalPct,
    novoSaldo, credLib, credEmp, juros,
    taxaEf, taxaAM, taxaAA,
    parcela, parcelaMeia,
    mc, mcFid,
    status, statusCor,
    parcFin, jurosFin, txFinAa,
  };
}

const f = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(v);
const f2 = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const pc = v => `${(v*100).toFixed(2)}%`;
const pc1 = v => `${(v*100).toFixed(1)}%`;

// ═══════════════════════════════════════════════════════════
const Field = ({label, sub, value, onChange, min, max, step, suffix, cor, placeholder}) => {
  const isText = typeof value === "string" && !suffix;
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>
        {label} {sub && <span style={{ fontWeight:400, color:"#4B5563" }}>({sub})</span>}
      </label>
      <div style={{ display:"flex" }}>
        <input type={isText ? "text" : "number"} value={value} onChange={e=>onChange(isText ? e.target.value : Number(e.target.value))} min={min} max={max} step={step} placeholder={placeholder}
          style={{ flex:1, padding:"10px 12px", borderRadius:suffix?"8px 0 0 8px":"8px", border:`1px solid ${cor||"rgba(255,255,255,0.08)"}`, background:`${(cor||"#fff")}08`, color:"#fff", fontSize: isText ? 14 : 16, fontWeight:700, fontFamily: isText ? "inherit" : "'JetBrains Mono',monospace", outline:"none", boxSizing:"border-box" }}/>
        {suffix && <div style={{ padding:"10px 12px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderLeft:"none", borderRadius:"0 8px 8px 0", fontSize:12, color:"#6B7280", fontWeight:600 }}>{suffix}</div>}
      </div>
    </div>
  );
};

const MiniBar = ({pct, color}) => (
  <div style={{ height:6, background:"rgba(255,255,255,0.04)", borderRadius:3, overflow:"hidden", marginTop:4 }}>
    <div style={{ height:"100%", width:`${Math.min(pct*100,100)}%`, background:`linear-gradient(90deg,${color}88,${color})`, borderRadius:3 }}/>
  </div>
);

// Histograma de distribuição Monte Carlo
const Histograma = ({dist, maxMeses=60}) => {
  const max = Math.max(...dist.slice(1, maxMeses+1), 1);
  const bars = [];
  for (let i = 1; i <= Math.min(maxMeses, 48); i++) {
    bars.push({ mes: i, val: dist[i] || 0 });
  }
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:1, height:50, marginTop:8 }}>
      {bars.map(b => (
        <div key={b.mes} style={{ flex:1, minWidth:2, display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ width:"100%", height: b.val > 0 ? Math.max(2, (b.val/max)*48) : 0, background: b.mes <= 12 ? "#D4781E" : b.mes <= 24 ? "#E8943A" : "#F5B06B", borderRadius:"2px 2px 0 0", transition:"height 0.3s" }}/>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
export default function App() {
  const [modo, setModo] = useState(null);
  const [preset, setPreset] = useState("imovel_cnp");
  const [credito, setCredito] = useState(400000);
  const [taxa, setTaxa] = useState(25);
  const [prazo, setPrazo] = useState(180);
  const [embutido, setEmbutido] = useState(50);
  const [bolso, setBolso] = useState(20);
  const [creditoSmart, setCreditoSmart] = useState(400000);
  const [calculado, setCalculado] = useState(false);
  // Closer mode
  const [closerStep, setCloserStep] = useState(0);
  const [closerData, setCloserData] = useState({
    nomeCliente: "", porqueComprar: "", oQueComprar: "imovel", quantoCusta: 300000,
    praQuando: "6", quantoEntrada: 0, quantoPorMes: 2000, renda: 8000,
    pagaAluguel: 0, decideSozinho: "sim", tipoAdm: "imovel_cnp",
  });
  const [gruposImportados, setGruposImportados] = useState([]);
  const [importLog, setImportLog] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef(null);

  // Grupos ativos = base + importados
  const GRUPOS_ATIVOS = useMemo(() => {
    if (gruposImportados.length === 0) return GRUPOS_REAIS;
    const { grupos } = mergeGrupos(GRUPOS_REAIS, gruposImportados);
    return grupos;
  }, [gruposImportados]);

  const handleImport = useCallback(async (file) => {
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const sheets = wb.SheetNames;
      const nome = file.name.toLowerCase();
      let log = [];

      // Detectar "LANCES CNP" (sheets: CNP-Imóvel, CNP-Automóvel, CNP-Pesados)
      const isLancesCNP = sheets.some(s => s.startsWith("CNP-"));

      if (isLancesCNP) {
        const novos = parseLancesCNP(wb);
        if (novos.length > 0) {
          setGruposImportados(prev => {
            const { grupos, added, updated } = mergeGrupos(prev, novos);
            log.push(`Lances CNP: ${novos.length} grupos extraídos (${added} novos, ${updated} atualizados) — Sheets: ${sheets.filter(s => s.startsWith("CNP-")).join(", ")}`);
            setImportLog(prev => [...prev, ...log]);
            return grupos;
          });
        } else {
          log.push(`Lances CNP: nenhum grupo encontrado. Sheets: ${sheets.join(", ")}`);
          setImportLog(prev => [...prev, ...log]);
        }
      } else if (nome.includes("cnp") || nome.includes("caixa")) {
        const novos = parseCNP(wb);
        if (novos.length > 0) {
          setGruposImportados(prev => {
            const { grupos, added, updated } = mergeGrupos(prev, novos);
            log.push(`CNP Caixa: ${novos.length} grupos extraídos (${added} novos, ${updated} atualizados)`);
            setImportLog(prev => [...prev, ...log]);
            return grupos;
          });
        } else {
          log.push(`CNP Caixa: nenhum grupo encontrado. Sheets: ${sheets.join(", ")}`);
          setImportLog(prev => [...prev, ...log]);
        }
      } else if (nome.includes("santander")) {
        const novos = parseSantander(wb);
        if (novos.length > 0) {
          setGruposImportados(prev => {
            const { grupos, added, updated } = mergeGrupos(prev, novos);
            log.push(`Santander: ${novos.length} grupos extraídos (${added} novos, ${updated} atualizados)`);
            setImportLog(prev => [...prev, ...log]);
            return grupos;
          });
        } else {
          log.push(`Santander: nenhum grupo encontrado. Sheets: ${sheets.join(", ")}`);
          setImportLog(prev => [...prev, ...log]);
        }
      } else if (nome.includes("lance") || nome.includes("tabela")) {
        // Planilha de lances atualiza dados nos grupos existentes
        setGruposImportados(prev => {
          const base = prev.length > 0 ? mergeGrupos(GRUPOS_REAIS, prev).grupos : [...GRUPOS_REAIS];
          const { updated, totalUpdates } = parseLances(wb, base);
          // Extrair apenas os que mudaram vs GRUPOS_REAIS
          const changed = updated.filter(g => {
            const orig = GRUPOS_REAIS.find(o => o.id === g.id);
            return !orig || JSON.stringify(orig) !== JSON.stringify(g);
          });
          log.push(`Lances: ${totalUpdates} grupos com dados de lance/sorteio atualizados`);
          setImportLog(prev => [...prev, ...log]);
          return changed;
        });
      } else {
        // Tentar detectar automaticamente
        if (sheets.some(s => s.startsWith("CNP-"))) {
          const novos = parseLancesCNP(wb);
          setGruposImportados(prev => {
            const { grupos, added, updated } = mergeGrupos(prev, novos);
            log.push(`Auto-detectado Lances CNP: ${novos.length} grupos (${added} novos, ${updated} atualizados)`);
            setImportLog(prev => [...prev, ...log]);
            return grupos;
          });
        } else if (sheets.includes("Grupos") || sheets.includes("Planilha2")) {
          const novos = parseCNP(wb);
          setGruposImportados(prev => {
            const { grupos, added, updated } = mergeGrupos(prev, novos);
            log.push(`Auto-detectado CNP: ${novos.length} grupos (${added} novos, ${updated} atualizados)`);
            setImportLog(prev => [...prev, ...log]);
            return grupos;
          });
        } else if (sheets.includes("Tabela")) {
          const novos = parseSantander(wb);
          setGruposImportados(prev => {
            const { grupos, added, updated } = mergeGrupos(prev, novos);
            log.push(`Auto-detectado Santander: ${novos.length} grupos (${added} novos, ${updated} atualizados)`);
            setImportLog(prev => [...prev, ...log]);
            return grupos;
          });
        } else if (sheets.includes("LANCES") || sheets.includes("SORTEIOS")) {
          setGruposImportados(prev => {
            const base = prev.length > 0 ? mergeGrupos(GRUPOS_REAIS, prev).grupos : [...GRUPOS_REAIS];
            const { updated, totalUpdates } = parseLances(wb, base);
            const changed = updated.filter(g => {
              const orig = GRUPOS_REAIS.find(o => o.id === g.id);
              return !orig || JSON.stringify(orig) !== JSON.stringify(g);
            });
            log.push(`Auto-detectado Lances: ${totalUpdates} grupos atualizados`);
            setImportLog(prev => [...prev, ...log]);
            return changed;
          });
        } else {
          log.push(`Formato não reconhecido. Sheets: ${sheets.join(", ")}. Renomeie com "CNP", "Santander" ou "Lance" no nome.`);
          setImportLog(prev => [...prev, ...log]);
        }
      }
    } catch (err) {
      setImportLog(prev => [...prev, `ERRO: ${err.message}`]);
    }
  }, []);

  const p = PRESETS[preset];

  const resultado = useMemo(() => {
    if (modo === "manual" && calculado) {
      return calcular(credito, taxa/100, prazo, embutido/100, bolso/100, null);
    }
    return null;
  }, [modo, calculado, credito, taxa, prazo, embutido, bolso]);

  // Closer mode strategies
  const closerEstrategias = useMemo(() => {
    if (modo !== "closer" || closerStep < 4) return [];
    const pKey = closerData.tipoAdm;
    const pr = PRESETS[pKey];
    if (!pr) return [];
    const c = closerData.quantoCusta;
    const entrada = closerData.quantoEntrada;
    const bolsoPct = c > 0 ? entrada / (c / (1 - pr.embutidoMax)) : 0;
    return [
      { nome:"Só Embutido", sub:"Zero do bolso", tag:"SEM ENTRADA",
        ...calcular(c/(1-pr.embutidoMax), pr.taxa, pr.prazo, pr.embutidoMax, 0, pr) },
      ...(entrada > 0 ? [{ nome:"Embutido + Entrada", sub:`${f(entrada)} do bolso`, tag:"COM ENTRADA",
        ...calcular(c/(1-pr.embutidoMax), pr.taxa, pr.prazo, pr.embutidoMax, bolsoPct, pr) }] : []),
      { nome:"Parcela ½ + Fidelidade", sub:"Sem lance, parcela reduzida", tag:"ZERO CUSTO",
        ...calcular(c, pr.taxa, pr.prazo, 0, 0, pr) },
    ];
  }, [modo, closerStep, closerData]);

  const estrategias = useMemo(() => {
    if (modo === "smart" && calculado && p) {
      const c = creditoSmart;
      return [
        { nome:"🎯 Só Embutido", desc:"Dobra carta. Zero do bolso.", tag:"SEM ENTRADA", tagCor:"#D4781E",
          ...calcular(c/(1-p.embutidoMax), p.taxa, p.prazo, p.embutidoMax, 0, p) },
        { nome:"💰 Embutido + 20%", desc:"Entrada de 20% do bolso.", tag:"COM ENTRADA", tagCor:"#D4781E",
          ...calcular(c/(1-p.embutidoMax), p.taxa, p.prazo, p.embutidoMax, 0.20, p) },
        { nome:"⏳ Parcela ½ + Fidelidade", desc:"Carta exata. Sem lance.", tag:"ZERO CUSTO", tagCor:"#8B5CF6",
          ...calcular(c, p.taxa, p.prazo, 0, 0, p) },
      ];
    }
    return [];
  }, [modo, calculado, creditoSmart, preset, p]);

  const card = (a, bCor) => ({
    background: a ? "linear-gradient(135deg,#1A1008,#231710)" : "rgba(255,255,255,0.015)",
    border: bCor ? `1.5px solid ${bCor}33` : a ? "1.5px solid rgba(212,120,30,0.25)" : "1px solid rgba(255,255,255,0.04)",
    borderRadius:12, padding:16, marginBottom:10,
  });

  const ResultBlock = ({r, title}) => (
    <div>
      {/* TAXA EFETIVA */}
      <div style={{ background:"linear-gradient(135deg,#1A1008,#2A1C10)", borderRadius:14, padding:20, marginBottom:14, border:"1px solid rgba(212,120,30,0.2)" }}>
        <div style={{ textAlign:"center", marginBottom:14 }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>Custo Efetivo Real</div>
          <div style={{ fontSize:40, fontWeight:900, color:"#D4781E", fontFamily:"'JetBrains Mono',monospace", lineHeight:1.1 }}>{pc(r.taxaAA)} <span style={{ fontSize:14, color:"rgba(212,120,30,0.5)" }}>a.a.</span></div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{pc(r.taxaAM)} a.m. • Juros simples sobre {f(r.credEmp)}</div>
        </div>
        <div style={{ display:"flex", justifyContent:"space-around", flexWrap:"wrap", gap:8 }}>
          {[["Emprestado",f(r.credEmp),"#D4781E"],["Juros",f(r.juros),"#EF4444"],["Parcela",f2(r.parcela)+"/mês","#fff"]].map(([k,v,c],i)=>(
            <div key={i} style={{ textAlign:"center" }}><div style={{ fontSize:8, color:"rgba(255,255,255,0.3)" }}>{k}</div><div style={{ fontSize:16, fontWeight:800, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{v}</div></div>
          ))}
        </div>
      </div>

      {/* MONTE CARLO - CÓDIGO 31 */}
      <div style={{...card(false, r.statusCor)}}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>SIMULAÇÃO CÓDIGO 31</div>
            <div style={{ fontSize:9, color:"#4B5563" }}>Monte Carlo • {r.mc.numSimulacoes} simulações • {Math.round(r.mc.contemplacoesTotal/r.mc.numSimulacoes*100)}% contemplaram</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:24, fontWeight:900, color:r.statusCor, fontFamily:"'JetBrains Mono',monospace" }}>{pc1(r.mc.probabilidade)}</div>
            <div style={{ fontSize:9, color:"#6B7280" }}>em ~{r.mc.mesMedio} meses</div>
          </div>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <span style={{ fontSize:12, fontWeight:800, color:r.statusCor }}>{r.status}</span>
          <span style={{ fontSize:10, color:"#6B7280" }}>Lance ofertado: {r.lanceTotalPct.toFixed(1)}%</span>
        </div>
        <MiniBar pct={r.mc.probabilidade} color={r.statusCor} />

        {/* Histograma */}
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:9, color:"#4B5563", marginBottom:2 }}>Distribuição de contemplação por mês:</div>
          <Histograma dist={r.mc.distribuicao} />
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, color:"#374151", marginTop:2 }}>
            <span>mês 1</span><span>12</span><span>24</span><span>36</span><span>48</span>
          </div>
        </div>

        {/* Fidelidade */}
        {r.bolsoPct === 0 && r.embutidoPct === 0 && (
          <div style={{ marginTop:10, background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.12)", borderRadius:8, padding:10 }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#8B5CF6", marginBottom:4 }}>⏳ COM LANCE FIDELIDADE (após 12 meses)</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#C9CDD4" }}>Probabilidade: {pc1(r.mcFid.probabilidade)} em ~{r.mcFid.mesMedio} meses</span>
              <span style={{ fontSize:11, color:"#8B5CF6", fontWeight:700 }}>Meia parcela: {f2(r.parcelaMeia)}/mês</span>
            </div>
            <MiniBar pct={r.mcFid.probabilidade} color="#8B5CF6" />
          </div>
        )}
      </div>

      {/* GRUPOS REAIS — HIPÓTESES COMPLETAS */}
      {(() => {
        const creditoBusca = r.credito;
        const gruposCompativeis = GRUPOS_ATIVOS.filter(g => {
          const min = Math.min(...g.creditos);
          const max = Math.max(...g.creditos);
          return creditoBusca >= min * 0.7 && creditoBusca <= max * 1.4;
        });
        if (gruposCompativeis.length === 0) return null;
        const hipoteses = gruposCompativeis.map(g => {
          const credMaisProx = g.creditos.reduce((prev, curr) => Math.abs(curr - creditoBusca) < Math.abs(prev - creditoBusca) ? curr : prev);
          const taxaGrupo = (g.taxa + g.fr) / 100;
          const parcelaGrupo = g.parcela || (credMaisProx * (1 + taxaGrupo) / g.prazo);
          const saldoDev = credMaisProx * (1 + taxaGrupo);
          const lanceEmb = credMaisProx * (g.embutidoMax / 100);
          const lanceBolso = credMaisProx * r.bolsoPct;
          const novoSaldo = saldoDev - lanceEmb - lanceBolso;
          const credLib = credMaisProx - lanceEmb;
          const credEmp = Math.max(0, credLib - lanceBolso);
          const juros = novoSaldo - credEmp;
          const taxaEf = credEmp > 0 ? juros / credEmp : 0;
          const taxaAM = taxaEf / g.prazo;
          const taxaAA = taxaAM * 12;
          const parcela = novoSaldo / g.prazo;
          const lanceTotalPct = (g.embutidoMax / 100 + r.bolsoPct) * 100;
          const mc = monteCarlo({ participantes: g.partic || 2000, parcelaMensal: parcelaGrupo, creditoGrupo: credMaisProx, lancePctCliente: lanceTotalPct, prazo: g.prazo, numSimulacoes: 500, maxMeses: 48 });
          let status, statusCor;
          if (mc.probabilidade >= 0.95) { status = "CÓDIGO 31"; statusCor = "#D4781E"; }
          else if (mc.probabilidade >= 0.80) { status = "ALTA CHANCE"; statusCor = "#E8943A"; }
          else if (mc.probabilidade >= 0.50) { status = "CHANCE MÉDIA"; statusCor = "#D4781E"; }
          else if (mc.probabilidade >= 0.25) { status = "CHANCE BAIXA"; statusCor = "#F59E0B"; }
          else { status = "MUITO BAIXA"; statusCor = "#EF4444"; }
          return { g, credMaisProx, parcelaGrupo, saldoDev, lanceEmb, lanceBolso, novoSaldo, credLib, credEmp, juros, taxaEf, taxaAM, taxaAA, parcela, lanceTotalPct, mc, status, statusCor };
        }).sort((a,b) => b.mc.probabilidade - a.mc.probabilidade || a.taxaAA - b.taxaAA);
        return (
          <div style={card(false)}>
            <div style={{ fontSize:10, fontWeight:700, color:"#6B7280", marginBottom:4, letterSpacing:0.5 }}>HIPÓTESES POR GRUPO REAL</div>
            <div style={{ fontSize:9, color:"#4B5563", marginBottom:12 }}>Cada grupo simulado com Monte Carlo • Fórmula de custo efetivo aplicada</div>
            {hipoteses.map((h, hi) => (
              <details key={hi} style={{ marginBottom:8 }}>
                <summary style={{ background: hi === 0 ? "linear-gradient(135deg,rgba(212,120,30,0.06),rgba(212,120,30,0.02))" : "rgba(255,255,255,0.02)", border: hi === 0 ? `1.5px solid ${h.statusCor}33` : "1px solid rgba(255,255,255,0.04)", borderLeft: `3px solid ${h.g.cor}`, borderRadius: 10, padding: 12, cursor:"pointer", listStyle:"none", position:"relative" }}>
                  {hi === 0 && <div style={{ position:"absolute", top:-7, right:110, background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:7, fontWeight:800, padding:"2px 8px", borderRadius:3 }}>MELHOR OPÇÃO</div>}
                  <div style={{ position:"absolute", top:-7, right:12, background:h.statusCor, color:"#fff", fontSize:7, fontWeight:800, padding:"2px 8px", borderRadius:3 }}>{h.status} {pc1(h.mc.probabilidade)}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:h.g.cor }}/>
                    <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{h.g.adm}</span>
                    <span style={{ fontSize:12, fontWeight:800, color:h.g.cor }}>Grupo {h.g.id}</span>
                    <span style={{ fontSize:9, color:"#4B5563", marginLeft:"auto" }}>{h.g.prazo}m • {h.g.taxa}%+{h.g.fr}% • Emb {h.g.embutidoMax}%</span>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                    {[["CARTA",f(h.credMaisProx),"#fff"],["DISPONÍVEL",f(h.credLib),"#D4781E"],["EMPRESTADO",f(h.credEmp),"#D4781E"],["PARCELA",f2(h.parcela),"#fff"],["TAXA EF.",pc(h.taxaAA)+" a.a.","#D4781E"],["CONTEMP.",`~${h.mc.mesMedio}m`,h.statusCor]].map(([k,v,c],i) => (
                      <div key={i} style={{ minWidth:70 }}><div style={{ fontSize:7, color:"#4B5563" }}>{k}</div><div style={{ fontSize:12, fontWeight:800, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{v}</div></div>
                    ))}
                  </div>
                  <MiniBar pct={h.mc.probabilidade} color={h.statusCor} />
                  <div style={{ fontSize:8, color:"#4B5563", marginTop:6 }}>{h.g.partic?.toLocaleString("pt-BR")||"—"} participantes • {h.g.contemp} contemp/mês • Lance médio: {h.g.lanceMedio}% • ▸ Clique para detalhes</div>
                </summary>
                <div style={{ padding:"8px 4px", marginTop:-4 }}>
                  <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)", borderRadius:8, padding:12, marginBottom:8 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"#6B7280", marginBottom:6 }}>DADOS GRUPO {h.g.id}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                      {[["Prazo",`${h.g.prazo}m`],["Taxa",`${h.g.taxa}%`],["FR",`${h.g.fr}%`],["Venc.",h.g.venc],["Partic.",h.g.partic?.toLocaleString("pt-BR")||"—"],["Contemp/m",h.g.contemp],["Lance méd.",`${h.g.lanceMedio}%`],["Fixos",h.g.lancesFixos||"—"],["Emb. máx",`${h.g.embutidoMax}%`],["% Fixos",h.g.pctFixos?`${h.g.pctFixos}%`:"—"],["Sort/mês",h.g.partic?pc1(h.g.contemp/h.g.partic):"—"],["Vagas",h.g.vagas?.toLocaleString("pt-BR")||"—"]].map(([k,v],i)=>(
                        <div key={i}><div style={{ fontSize:7, color:"#4B5563" }}>{k}</div><div style={{ fontSize:10, fontWeight:700, color:"#D1D5DB" }}>{v}</div></div>
                      ))}
                    </div>
                    <div style={{ marginTop:6 }}><div style={{ fontSize:7, color:"#4B5563", marginBottom:3 }}>Créditos no grupo:</div><div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>{h.g.creditos.map((c,ci)=>(<span key={ci} style={{ fontSize:8, fontWeight:600, padding:"2px 5px", borderRadius:3, background:c===h.credMaisProx?`${h.g.cor}20`:"rgba(255,255,255,0.03)", color:c===h.credMaisProx?h.g.cor:"#6B7280", border:c===h.credMaisProx?`1px solid ${h.g.cor}44`:"1px solid rgba(255,255,255,0.03)", fontFamily:"'JetBrains Mono',monospace" }}>{f(c)}</span>))}</div></div>
                  </div>
                  <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)", borderRadius:8, padding:12, marginBottom:8 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"#D4781E", marginBottom:6 }}>CONTA NESTE GRUPO</div>
                    {[["Crédito (carta)",f(h.credMaisProx),"#fff"],["Saldo devedor",f(h.saldoDev),"#fff"],["Lance embutido",`${f(h.lanceEmb)} (${h.g.embutidoMax}%)`,"#8B5CF6"],["Lance bolso",`${f(h.lanceBolso)} (${pc1(r.bolsoPct)})`,"#F59E0B"],["Lance total",`${h.lanceTotalPct.toFixed(1)}%`,"#fff"],["Novo saldo",f(h.novoSaldo),"#fff"],["Crédito liberado",f(h.credLib),"#D4781E"],["Crédito emprestado",f(h.credEmp),"#D4781E"],["Juros",f(h.juros),"#EF4444"],["Taxa efetiva",`${pc(h.taxaAA)} a.a. (${pc(h.taxaAM)} a.m.)`,"#D4781E"],["Parcela",f2(h.parcela),"#fff"]].map(([k,v,c],i)=>(
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid rgba(255,255,255,0.02)" }}><span style={{ fontSize:9, color:"#6B7280" }}>{k}</span><span style={{ fontSize:10, fontWeight:700, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{v}</span></div>
                    ))}
                  </div>
                  <div style={{ background:`${h.statusCor}08`, border:`1px solid ${h.statusCor}22`, borderRadius:8, padding:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                      <div><div style={{ fontSize:9, fontWeight:700, color:"#6B7280" }}>MONTE CARLO — GRUPO {h.g.id}</div><div style={{ fontSize:8, color:"#4B5563" }}>{h.mc.numSimulacoes} sim. • {h.g.partic?.toLocaleString("pt-BR")} partic. • parcela {f2(h.parcelaGrupo)}</div></div>
                      <div style={{ textAlign:"right" }}><div style={{ fontSize:20, fontWeight:900, color:h.statusCor, fontFamily:"'JetBrains Mono',monospace" }}>{pc1(h.mc.probabilidade)}</div><div style={{ fontSize:8, color:"#6B7280" }}>~{h.mc.mesMedio}m</div></div>
                    </div>
                    <MiniBar pct={h.mc.probabilidade} color={h.statusCor} />
                    <Histograma dist={h.mc.distribuicao} maxMeses={48} />
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:7, color:"#374151", marginTop:2 }}><span>1</span><span>12</span><span>24</span><span>36</span><span>48</span></div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        );
      })()}

      {/* PASSO A PASSO */}
      <div style={card(false)}>
        <div style={{ fontSize:10, fontWeight:700, color:"#6B7280", marginBottom:8, letterSpacing:0.5 }}>PASSO A PASSO</div>
        {[
          ["1","Crédito + Taxa = Saldo Dev", `${f(r.credito)} + ${pc1(r.taxa)}`, f(r.saldoDev),"#fff"],
          ["2","- Emb - Bolso = Novo Saldo", `- ${f(r.lanceEmb)} - ${f(r.lanceBolso)}`, f(r.novoSaldo),"#fff"],
          ["3","Crédito - Emb = Liberado", `${f(r.credito)} - ${f(r.lanceEmb)}`, f(r.credLib),"#D4781E"],
          ["4","Liberado - Bolso = Emprestado", `${f(r.credLib)} - ${f(r.lanceBolso)}`, f(r.credEmp),"#D4781E"],
          ["5","Novo Saldo - Emp = Juros", `${f(r.novoSaldo)} - ${f(r.credEmp)}`, f(r.juros),"#EF4444"],
          ["6","Juros ÷ Emp = Taxa Ef.", `${f(r.juros)} ÷ ${f(r.credEmp)}`, pc(r.taxaEf),"#D4781E"],
          ["7",`÷ ${r.prazo}m × 12 = % a.a.`, `${pc(r.taxaEf)} ÷ ${r.prazo} × 12`, pc(r.taxaAA),"#D4781E"],
        ].map((s,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
            <div style={{ width:18, height:18, borderRadius:"50%", background:"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:700, color:"#6B7280", flexShrink:0 }}>{s[0]}</div>
            <div style={{ flex:1 }}><div style={{ fontSize:9, color:"#6B7280" }}>{s[1]}</div><div style={{ fontSize:8, color:"#4B5563" }}>{s[2]}</div></div>
            <div style={{ fontSize:13, fontWeight:800, color:s[4], fontFamily:"'JetBrains Mono',monospace" }}>{s[3]}</div>
          </div>
        ))}
      </div>

      {/* VS FINANCIAMENTO */}
      {r.credEmp > 0 && (
        <div style={card(false)}>
          <div style={{ fontSize:10, fontWeight:700, color:"#6B7280", marginBottom:8 }}>VS FINANCIAMENTO ({pc1(r.txFinAa)} a.a. sobre {f(r.credEmp)})</div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1, background:"rgba(212,120,30,0.05)", borderRadius:8, padding:10 }}>
              <div style={{ fontSize:8, fontWeight:700, color:"#D4781E", marginBottom:4 }}>✓ CONSÓRCIO</div>
              <div style={{ fontSize:8, color:"#6B7280" }}>Juros</div>
              <div style={{ fontSize:16, fontWeight:800, color:"#D4781E", fontFamily:"'JetBrains Mono',monospace" }}>{f(r.juros)}</div>
              <div style={{ fontSize:8, color:"#6B7280", marginTop:4 }}>Taxa</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#D4781E" }}>{pc(r.taxaAA)} a.a.</div>
            </div>
            <div style={{ flex:1, background:"rgba(239,68,68,0.04)", borderRadius:8, padding:10 }}>
              <div style={{ fontSize:8, fontWeight:700, color:"#EF4444", marginBottom:4 }}>✗ FINANCIAMENTO</div>
              <div style={{ fontSize:8, color:"#6B7280" }}>Juros</div>
              <div style={{ fontSize:16, fontWeight:800, color:"#EF4444", fontFamily:"'JetBrains Mono',monospace" }}>{f(r.jurosFin)}</div>
              <div style={{ fontSize:8, color:"#6B7280", marginTop:4 }}>Taxa</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#EF4444" }}>{pc(r.txFinAa)} a.a.</div>
            </div>
          </div>
          {r.jurosFin > r.juros && (
            <div style={{ textAlign:"center", marginTop:8, padding:8, background:"rgba(212,120,30,0.06)", borderRadius:6 }}>
              <div style={{ fontSize:8, color:"rgba(255,255,255,0.3)" }}>ECONOMIA</div>
              <div style={{ fontSize:22, fontWeight:900, color:"#D4781E", fontFamily:"'JetBrains Mono',monospace" }}>{f(r.jurosFin - r.juros)}</div>
            </div>
          )}
        </div>
      )}

      {/* DADOS */}
      <div style={card(false)}>
        <div style={{ fontSize:10, fontWeight:700, color:"#6B7280", marginBottom:6 }}>DADOS COMPLETOS</div>
        {[["Crédito bruto",f(r.credito)],["Taxa",pc1(r.taxa)],["Saldo devedor",f(r.saldoDev)],
          ["Lance embutido",`${f(r.lanceEmb)} (${pc1(r.embutidoPct)})`],["Lance bolso",`${f(r.lanceBolso)} (${pc1(r.bolsoPct)})`],
          ["Lance total",`${f(r.lanceTotal)} (${r.lanceTotalPct.toFixed(1)}%)`],
          ["Crédito liberado",f(r.credLib)],["Crédito emprestado",f(r.credEmp)],
          ["Novo saldo devedor",f(r.novoSaldo)],["Juros",f(r.juros)],
          ["Parcela",f2(r.parcela)],["Prazo",`${r.prazo} meses`],
        ].map(([k,v],i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid rgba(255,255,255,0.02)" }}>
            <span style={{ fontSize:9, color:"#6B7280" }}>{k}</span>
            <span style={{ fontSize:10, fontWeight:700, color:"#E5E7EB", fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#0A0A0A", fontFamily:"'DM Sans',system-ui,sans-serif", color:"#C9CDD4" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap" rel="stylesheet"/>

      <div style={{ background:"linear-gradient(160deg,#1A1008,#120C06 70%,#0A0A0A)", padding:"14px 16px", borderBottom:"1px solid rgba(212,120,30,0.1)" }}>
        <div style={{ maxWidth:860, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <img src="/gm-icon.png" alt="Grupo Mirandas" style={{ height:36, borderRadius:6, opacity:0.9 }}/>
            <div style={{ width:1, height:28, background:"rgba(255,255,255,0.08)" }}/>
            <img src="/logo-branco.png" alt="Código 31" style={{ height:24 }}/>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {gruposImportados.length > 0 && <span style={{ fontSize:8, color:"#D4781E", fontWeight:700, background:"rgba(212,120,30,0.1)", padding:"2px 6px", borderRadius:4 }}>{GRUPOS_ATIVOS.length} grupos</span>}
            <button onClick={()=>setShowImport(v=>!v)} style={{ padding:"4px 10px", borderRadius:5, border:`1px solid ${showImport?"rgba(212,120,30,0.3)":"rgba(255,255,255,0.06)"}`, background:showImport?"rgba(212,120,30,0.08)":"transparent", color:showImport?"#D4781E":"#6B7280", fontSize:9, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>Importar Planilhas</button>
            {modo && <button onClick={()=>{setModo(null);setCalculado(false);}} style={{ padding:"4px 10px", borderRadius:5, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#6B7280", fontSize:9, cursor:"pointer", fontFamily:"inherit" }}>← Início</button>}
          </div>
        </div>
      </div>

      {/* PAINEL DE IMPORTAÇÃO */}
      {showImport && (
        <div style={{ maxWidth:860, margin:"0 auto", padding:"0 16px" }}>
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#fff", marginBottom:10 }}>Importar Planilhas</div>
            <div style={{ fontSize:10, color:"#6B7280", marginBottom:12, lineHeight:1.6 }}>
              Suba planilhas .xlsx para atualizar os dados dos grupos. O sistema detecta automaticamente o tipo:<br/>
              <span style={{ color:"#005CA9", fontWeight:600 }}>CNP Caixa</span> (nome com "CNP" ou "Caixa") • <span style={{ color:"#EC0000", fontWeight:600 }}>Santander</span> (nome com "Santander") • <span style={{ color:"#D4781E", fontWeight:600 }}>Lances/Sorteios</span> (nome com "Lance" ou "Tabela")
            </div>

            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(212,120,30,0.5)"; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; for (const f of e.dataTransfer.files) { if (f.name.endsWith(".xlsx") || f.name.endsWith(".xls")) handleImport(f); } }}
              onClick={() => fileRef.current?.click()}
              style={{ border:"2px dashed rgba(255,255,255,0.08)", borderRadius:10, padding:24, textAlign:"center", cursor:"pointer", transition:"border-color 0.2s" }}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls" multiple style={{ display:"none" }} onChange={e => { for (const f of e.target.files) handleImport(f); e.target.value = ""; }} />
              <div style={{ fontSize:24, marginBottom:6 }}>+</div>
              <div style={{ fontSize:11, color:"#6B7280", fontWeight:600 }}>Arraste planilhas aqui ou clique para selecionar</div>
              <div style={{ fontSize:9, color:"#4B5563", marginTop:4 }}>.xlsx (SIMULADOR CNP Caixa, SIMULADOR SANTANDER, Tabela Lances)</div>
            </div>

            {/* Log de imports */}
            {importLog.length > 0 && (
              <div style={{ marginTop:12, maxHeight:120, overflowY:"auto" }}>
                {importLog.map((log, i) => (
                  <div key={i} style={{ fontSize:9, color: log.startsWith("ERRO") ? "#EF4444" : "#D4781E", padding:"3px 0", borderBottom:"1px solid rgba(255,255,255,0.02)", fontFamily:"'JetBrains Mono',monospace" }}>
                    {log}
                  </div>
                ))}
              </div>
            )}

            {/* Status */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
              <div style={{ fontSize:9, color:"#4B5563" }}>
                Base: {GRUPOS_REAIS.length} grupos | Importados: {gruposImportados.length} | Total ativo: {GRUPOS_ATIVOS.length}
              </div>
              {gruposImportados.length > 0 && (
                <button onClick={() => { setGruposImportados([]); setImportLog(prev => [...prev, "Dados importados limpos. Voltou para base original."]); }} style={{ padding:"3px 8px", borderRadius:4, border:"1px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.05)", color:"#EF4444", fontSize:8, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
                  Limpar importados
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth:860, margin:"0 auto", padding:"16px" }}>

        {/* ESCOLHA */}
        {!modo && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, color:"#fff", marginBottom:4, textAlign:"center" }}>Como quer calcular?</h2>
            <p style={{ fontSize:12, color:"#6B7280", textAlign:"center", marginBottom:20 }}>Simulação Código 31 com Monte Carlo</p>
            {/* MODO CLOSER — destaque */}
            <div onClick={()=>{setModo("closer");setCloserStep(1);}} style={{ ...card(false,"#D4781E"), cursor:"pointer", padding:20, marginBottom:16, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, right:0, background:"linear-gradient(135deg,#D4781E,#A85A15)", padding:"4px 14px", borderRadius:"0 0 0 10px", fontSize:8, fontWeight:800, color:"#fff", letterSpacing:1 }}>MÉTODO ANTHONY</div>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ fontSize:40 }}>🎯</div>
                <div>
                  <div style={{ fontSize:18, fontWeight:900, color:"#fff", marginBottom:2 }}>Modo Closer</div>
                  <div style={{ fontSize:11, color:"#9CA3AF", lineHeight:1.5 }}>Guia passo a passo do framework de 5 etapas. Levanta perfil, monta oferta irrecusável e fecha.</div>
                  <div style={{ display:"flex", gap:8, marginTop:8 }}>
                    {["Abordagem","Perfil","Oferta","Valorização","Fechamento"].map((s,i)=>(
                      <span key={i} style={{ fontSize:7, fontWeight:700, color:"#D4781E", background:"rgba(212,120,30,0.1)", padding:"2px 6px", borderRadius:3, letterSpacing:0.5 }}>{i+1}. {s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display:"flex", gap:12 }}>
              {[["manual","🔧","Manual","Preenche tudo: crédito, taxa, prazo, lances","#D4781E"],["smart","⚡","Inteligente","Só crédito + tipo. Sistema calcula 3 estratégias.","#D4781E"]].map(([k,ico,tit,desc,cor])=>(
                <div key={k} onClick={()=>setModo(k)} style={{ flex:1, ...card(false,cor), cursor:"pointer", textAlign:"center", padding:24 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>{ico}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginBottom:4 }}>{tit}</div>
                  <div style={{ fontSize:11, color:"#6B7280", lineHeight:1.5 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MANUAL */}
        {modo==="manual" && !calculado && (
          <div>
            <h2 style={{ fontSize:18, fontWeight:800, color:"#fff", marginBottom:14 }}>🔧 Modo Manual</h2>
            <Field label="Crédito bruto" sub="carta" value={credito} onChange={setCredito} min={10000} max={5000000} step={10000} cor="#D4781E" suffix="R$"/>
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1 }}><Field label="Taxa" sub="admin+FR" value={taxa} onChange={setTaxa} min={5} max={40} step={0.5} suffix="%" cor="#D4781E"/></div>
              <div style={{ flex:1 }}><Field label="Prazo" value={prazo} onChange={setPrazo} min={20} max={240} step={1} suffix="meses"/></div>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1 }}><Field label="Lance embutido" value={embutido} onChange={setEmbutido} min={0} max={60} step={5} suffix="%" cor="#8B5CF6"/></div>
              <div style={{ flex:1 }}><Field label="Lance bolso" value={bolso} onChange={setBolso} min={0} max={50} step={1} suffix="%" cor="#F59E0B"/></div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:10, padding:12, marginBottom:12, display:"flex", justifyContent:"space-around" }}>
              <div style={{ textAlign:"center" }}><div style={{ fontSize:7, color:"#4B5563" }}>LIBERADO</div><div style={{ fontSize:14, fontWeight:800, color:"#D4781E", fontFamily:"'JetBrains Mono',monospace" }}>{f(credito*(1-embutido/100))}</div></div>
              <div style={{ textAlign:"center" }}><div style={{ fontSize:7, color:"#4B5563" }}>EMPRESTADO</div><div style={{ fontSize:14, fontWeight:800, color:"#D4781E", fontFamily:"'JetBrains Mono',monospace" }}>{f(Math.max(0,credito*(1-embutido/100)-credito*bolso/100))}</div></div>
              <div style={{ textAlign:"center" }}><div style={{ fontSize:7, color:"#4B5563" }}>LANCE TOTAL</div><div style={{ fontSize:14, fontWeight:800, color:"#8B5CF6", fontFamily:"'JetBrains Mono',monospace" }}>{embutido+bolso}%</div></div>
            </div>
            <button onClick={()=>setCalculado(true)} style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Calcular com Monte Carlo →
            </button>
          </div>
        )}

        {modo==="manual" && calculado && resultado && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h2 style={{ fontSize:18, fontWeight:800, color:"#fff" }}>🔧 Resultado</h2>
              <button onClick={()=>setCalculado(false)} style={{ padding:"4px 10px", borderRadius:5, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#6B7280", fontSize:9, cursor:"pointer", fontFamily:"inherit" }}>← Editar</button>
            </div>
            <ResultBlock r={resultado} />
            <button onClick={()=>window.print()} style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginTop:8 }}>Imprimir / PDF</button>
          </div>
        )}

        {/* SMART */}
        {modo==="smart" && !calculado && (
          <div>
            <h2 style={{ fontSize:18, fontWeight:800, color:"#fff", marginBottom:14 }}>⚡ Modo Inteligente</h2>
            <div style={{ fontSize:10, fontWeight:700, color:"#6B7280", marginBottom:8 }}>TIPO / ADMINISTRADORA</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
              {Object.entries(PRESETS).map(([k,v])=>(
                <button key={k} onClick={()=>setPreset(k)} style={{ padding:"8px 14px", borderRadius:7, border:preset===k?"1.5px solid #D4781E":"1px solid rgba(255,255,255,0.05)", background:preset===k?"rgba(212,120,30,0.08)":"transparent", color:preset===k?"#D4781E":"#6B7280", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{v.label}</button>
              ))}
            </div>
            <Field label="Crédito desejado" sub="no bolso" value={creditoSmart} onChange={setCreditoSmart} min={30000} max={2000000} step={10000} cor="#D4781E" suffix="R$"/>
            <input type="range" min={30000} max={1500000} step={10000} value={creditoSmart} onChange={e=>setCreditoSmart(Number(e.target.value))} style={{ width:"100%", accentColor:"#D4781E", marginTop:-8, marginBottom:12 }}/>
            <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:8, padding:10, marginBottom:12, fontSize:10, color:"#4B5563" }}>
              {p.label} • Taxa: {pc1(p.taxa)} • Prazo: {p.prazo}m • Embutido: {pc1(p.embutidoMax)} • {p.participantes} participantes • {p.contemp} contemp/mês
            </div>
            <button onClick={()=>setCalculado(true)} style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Simular 3 Estratégias (Monte Carlo) →
            </button>
          </div>
        )}

        {modo==="smart" && calculado && estrategias.length > 0 && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h2 style={{ fontSize:18, fontWeight:800, color:"#fff" }}>⚡ 3 Estratégias</h2>
              <button onClick={()=>setCalculado(false)} style={{ padding:"4px 10px", borderRadius:5, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#6B7280", fontSize:9, cursor:"pointer", fontFamily:"inherit" }}>← Editar</button>
            </div>
            <p style={{ fontSize:10, color:"#4B5563", marginBottom:12 }}>Cliente quer {f(creditoSmart)} • {p.label} • Monte Carlo {estrategias[0].mc.numSimulacoes} simulações</p>

            {estrategias.map((e,i)=>(
              <details key={i} style={{ marginBottom:10 }}>
                <summary style={{ ...card(i===1, e.tagCor), cursor:"pointer", listStyle:"none", position:"relative" }}>
                  <div style={{ position:"absolute", top:-8, right:12, background:e.statusCor, color:"#fff", fontSize:7, fontWeight:800, padding:"3px 8px", borderRadius:4 }}>{e.status} {pc1(e.mc.probabilidade)}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:4 }}>{e.nome}</div>
                  <div style={{ fontSize:10, color:"#6B7280", marginBottom:8 }}>{e.desc}</div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {[["CARTA",f(e.credito),"#fff"],["DISPONÍVEL",f(e.credLib),"#D4781E"],["EMPRESTADO",f(e.credEmp),"#D4781E"],["TAXA",pc(e.taxaAA)+" a.a.","#D4781E"],["PARCELA",f2(e.parcela),"#fff"],["CONTEMP.",`~${e.mc.mesMedio}m`,e.statusCor]].map(([k,v,c],j)=>(
                      <div key={j}><div style={{ fontSize:7, color:"#4B5563" }}>{k}</div><div style={{ fontSize:13, fontWeight:800, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{v}</div></div>
                    ))}
                  </div>
                  <div style={{ marginTop:6, fontSize:9, color:"#6B7280" }}>▸ Clique para detalhes + simulação Monte Carlo</div>
                </summary>
                <div style={{ padding:"0 4px", marginTop:-4 }}><ResultBlock r={e} /></div>
              </details>
            ))}
            <button onClick={()=>window.print()} style={{ width:"100%", padding:"12px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginTop:8 }}>Imprimir / PDF</button>
          </div>
        )}
        {/* ═══════ MODO CLOSER ═══════ */}
        {modo==="closer" && (()=>{
          const steps = [
            { n:1, t:"Abordagem", ico:"👋" },
            { n:2, t:"Perfil", ico:"🎯" },
            { n:3, t:"Oferta", ico:"💎" },
            { n:4, t:"Valorização", ico:"🌡️" },
            { n:5, t:"Fechamento", ico:"🤝" },
          ];
          const cd = closerData;
          const setCD = (k,v) => setCloserData(prev => ({...prev, [k]:v}));
          const comprometimento = cd.renda > 0 ? ((cd.quantoPorMes + cd.pagaAluguel) / cd.renda * 100).toFixed(0) : 0;
          const comprOk = comprometimento <= 33;

          return (
            <div>
              {/* Progress bar */}
              <div style={{ display:"flex", gap:4, marginBottom:20 }}>
                {steps.map(s => (
                  <div key={s.n} onClick={()=> s.n <= closerStep && setCloserStep(s.n)} style={{ flex:1, cursor: s.n <= closerStep ? "pointer" : "default" }}>
                    <div style={{ height:3, borderRadius:2, background: s.n <= closerStep ? "#D4781E" : "rgba(255,255,255,0.06)", transition:"background 0.3s", marginBottom:4 }}/>
                    <div style={{ fontSize:8, fontWeight:700, color: s.n === closerStep ? "#D4781E" : s.n < closerStep ? "#6B7280" : "#2A2A2A", textAlign:"center", letterSpacing:0.3 }}>{s.ico} {s.t}</div>
                  </div>
                ))}
              </div>

              {/* STEP 1 — ABORDAGEM */}
              {closerStep === 1 && (
                <div>
                  <div style={{ ...card(false,"#D4781E"), padding:20 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:12 }}>1. Abordagem</div>
                    <div style={{ background:"rgba(212,120,30,0.06)", border:"1px solid rgba(212,120,30,0.12)", borderRadius:8, padding:12, marginBottom:14 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#D4781E", marginBottom:6, letterSpacing:0.5 }}>REGRAS DE OURO</div>
                      <div style={{ fontSize:11, color:"#C9CDD4", lineHeight:1.7 }}>
                        Nunca entre "seco". <strong style={{ color:"#fff" }}>Videocall com câmera</strong> &gt; Ligação &gt; WhatsApp.<br/>
                        Seja o médico: <strong style={{ color:"#fff" }}>escute primeiro</strong>, nunca abra com o produto.<br/>
                        "Brasileiros compram com confirmação de amizade" — rapport é obrigatório.
                      </div>
                    </div>

                    <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:8, padding:12, marginBottom:14 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#6B7280", marginBottom:8 }}>CHECKLIST</div>
                      {["Câmera ligada (ou justificativa)", "Quebra-gelo feito (rapport)", "Cliente sabe que você vende consórcio", "Combinado: 'Se não servir, eu mesmo vou te falar'"].map((item,i) => (
                        <div key={i} style={{ fontSize:10, color:"#9CA3AF", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.02)", display:"flex", gap:6, alignItems:"center" }}>
                          <span style={{ color:"#D4781E", fontSize:12 }}>○</span> {item}
                        </div>
                      ))}
                    </div>

                    <Field label="Nome do cliente" value={cd.nomeCliente} onChange={v=>setCD("nomeCliente",v)} cor="#D4781E"/>

                    <div style={{ background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.12)", borderRadius:8, padding:10, marginBottom:14 }}>
                      <div style={{ fontSize:9, color:"#8B5CF6", fontWeight:700 }}>FRASE DE ABERTURA</div>
                      <div style={{ fontSize:11, color:"#C9CDD4", marginTop:4, fontStyle:"italic", lineHeight:1.6 }}>
                        "Vou te explicar como funciona. Duas coisas: se não entender, me interrompe. Se achar que não é pra você, me fala. Eu não tô aqui pra te vender nada — tô aqui pra te ajudar a decidir. Pode ser que no final eu mesmo diga que consórcio não é pra você agora."
                      </div>
                    </div>

                    <button onClick={()=>setCloserStep(2)} style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Rapport feito → Levantar Perfil
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 — LEVANTAMENTO DE PERFIL */}
              {closerStep === 2 && (
                <div>
                  <div style={{ ...card(false,"#D4781E"), padding:20 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:4 }}>2. Levantamento de Perfil</div>
                    <div style={{ fontSize:10, color:"#D4781E", marginBottom:14, fontWeight:600 }}>70% da venda mora aqui. Sem atalhos.</div>

                    <div style={{ background:"rgba(212,120,30,0.06)", borderRadius:8, padding:12, marginBottom:14 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#D4781E", marginBottom:6 }}>AS 7 PERGUNTAS</div>
                      <div style={{ fontSize:10, color:"#C9CDD4", lineHeight:2 }}>
                        {["① Por que quer comprar consórcio?","② O que quer comprar?","③ Quanto custa o que quer?","④ Pra quando quer?","⑤ Quanto tem de entrada?","⑥ Quanto pode pagar por mês?","⑦ Qual a renda? Paga aluguel?"].map((q,i) => (
                          <div key={i}>{q}</div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom:6, fontSize:9, fontWeight:700, color:"#6B7280", letterSpacing:0.5 }}>RESPOSTAS DO CLIENTE</div>

                    <div style={{ marginBottom:10 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>① Por que quer comprar?</label>
                      <textarea value={cd.porqueComprar} onChange={e=>setCD("porqueComprar",e.target.value)} placeholder="Ex: sair do aluguel, investir, comprar primeiro imóvel..."
                        style={{ width:"100%", padding:10, borderRadius:8, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.02)", color:"#fff", fontSize:12, fontFamily:"inherit", minHeight:50, resize:"vertical", outline:"none", boxSizing:"border-box" }}/>
                    </div>

                    <div style={{ marginBottom:10 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>② O que quer comprar?</label>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {[["imovel","Imóvel"],["veiculo","Veículo"],["servico","Serviço/Reforma"],["pesado","Pesado/Agro"]].map(([k,v])=>(
                          <button key={k} onClick={()=>setCD("oQueComprar",k)} style={{ padding:"6px 12px", borderRadius:6, border: cd.oQueComprar===k ? "1.5px solid #D4781E" : "1px solid rgba(255,255,255,0.06)", background: cd.oQueComprar===k ? "rgba(212,120,30,0.08)" : "transparent", color: cd.oQueComprar===k ? "#D4781E" : "#6B7280", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{v}</button>
                        ))}
                      </div>
                    </div>

                    <Field label="③ Quanto custa o que quer?" value={cd.quantoCusta} onChange={v=>setCD("quantoCusta",v)} min={20000} max={5000000} step={10000} suffix="R$" cor="#D4781E"/>

                    <div style={{ marginBottom:10 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>④ Pra quando?</label>
                      <div style={{ display:"flex", gap:6 }}>
                        {[["3","3 meses"],["6","6 meses"],["12","1 ano"],["24","2+ anos"],["0","Sem pressa"]].map(([k,v])=>(
                          <button key={k} onClick={()=>setCD("praQuando",k)} style={{ flex:1, padding:"6px 4px", borderRadius:6, border: cd.praQuando===k ? "1.5px solid #D4781E" : "1px solid rgba(255,255,255,0.06)", background: cd.praQuando===k ? "rgba(212,120,30,0.08)" : "transparent", color: cd.praQuando===k ? "#D4781E" : "#6B7280", fontSize:9, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{v}</button>
                        ))}
                      </div>
                    </div>

                    <Field label="⑤ Quanto tem de entrada?" value={cd.quantoEntrada} onChange={v=>setCD("quantoEntrada",v)} min={0} max={2000000} step={5000} suffix="R$" cor="#F59E0B"/>
                    <Field label="⑥ Quanto pode pagar/mês?" value={cd.quantoPorMes} onChange={v=>setCD("quantoPorMes",v)} min={300} max={50000} step={100} suffix="R$" cor="#D4781E"/>

                    <div style={{ display:"flex", gap:10 }}>
                      <div style={{ flex:1 }}><Field label="⑦ Renda mensal" value={cd.renda} onChange={v=>setCD("renda",v)} min={1000} max={200000} step={500} suffix="R$"/></div>
                      <div style={{ flex:1 }}><Field label="Paga aluguel?" value={cd.pagaAluguel} onChange={v=>setCD("pagaAluguel",v)} min={0} max={10000} step={100} suffix="R$"/></div>
                    </div>

                    {/* Comprometimento */}
                    <div style={{ background: comprOk ? "rgba(212,120,30,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${comprOk ? "rgba(212,120,30,0.15)" : "rgba(239,68,68,0.15)"}`, borderRadius:8, padding:12, marginBottom:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:9, fontWeight:700, color:"#6B7280" }}>COMPROMETIMENTO DE RENDA</div>
                          <div style={{ fontSize:8, color:"#4B5563" }}>Parcela + Aluguel = {f(cd.quantoPorMes + cd.pagaAluguel)} / Renda {f(cd.renda)}</div>
                        </div>
                        <div style={{ fontSize:24, fontWeight:900, color: comprOk ? "#D4781E" : "#EF4444", fontFamily:"'JetBrains Mono',monospace" }}>{comprometimento}%</div>
                      </div>
                      <MiniBar pct={comprometimento/33} color={comprOk ? "#D4781E" : "#EF4444"} />
                      <div style={{ fontSize:9, color: comprOk ? "#D4781E" : "#EF4444", marginTop:4, fontWeight:600 }}>
                        {comprOk ? "Dentro do limite (≤33%)" : "ACIMA do limite. Parcela + aluguel > 1/3 da renda. Ajustar valores."}
                      </div>
                    </div>

                    <div style={{ marginBottom:10 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>Decide sozinho?</label>
                      <div style={{ display:"flex", gap:6 }}>
                        {[["sim","Sim, decide sozinho"],["nao","Precisa consultar alguém"]].map(([k,v])=>(
                          <button key={k} onClick={()=>setCD("decideSozinho",k)} style={{ flex:1, padding:"8px", borderRadius:6, border: cd.decideSozinho===k ? "1.5px solid #D4781E" : "1px solid rgba(255,255,255,0.06)", background: cd.decideSozinho===k ? "rgba(212,120,30,0.08)" : "transparent", color: cd.decideSozinho===k ? "#D4781E" : "#6B7280", fontSize:10, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{v}</button>
                        ))}
                      </div>
                      {cd.decideSozinho === "nao" && (
                        <div style={{ marginTop:6, background:"rgba(239,68,68,0.06)", borderRadius:6, padding:8, fontSize:9, color:"#F59E0B", fontWeight:600 }}>
                          Convidar a outra pessoa para a próxima call. Não apresente oferta sem o decisor presente.
                        </div>
                      )}
                    </div>

                    {/* Paráfrase */}
                    <div style={{ background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.12)", borderRadius:8, padding:12, marginBottom:14 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#8B5CF6", marginBottom:6 }}>PARAFRASEAR AGORA</div>
                      <div style={{ fontSize:11, color:"#C9CDD4", lineHeight:1.6, fontStyle:"italic" }}>
                        "{cd.nomeCliente || "Cliente"}, deixa eu ver se entendi: você quer {cd.oQueComprar === "imovel" ? "um imóvel" : cd.oQueComprar === "veiculo" ? "um veículo" : "comprar algo"} de aproximadamente {f(cd.quantoCusta)},
                        {cd.quantoEntrada > 0 ? ` tem ${f(cd.quantoEntrada)} de entrada,` : " não tem entrada,"}
                        consegue pagar até {f(cd.quantoPorMes)}/mês{cd.pagaAluguel > 0 ? ` além do aluguel de ${f(cd.pagaAluguel)}` : ""},
                        e {cd.praQuando === "0" ? "não tem pressa" : `quer pra ${cd.praQuando} meses`}. É isso?"
                      </div>
                    </div>

                    <div style={{ marginBottom:10 }}>
                      <label style={{ fontSize:10, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>Tipo / Administradora</label>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {Object.entries(PRESETS).map(([k,v])=>(
                          <button key={k} onClick={()=>setCD("tipoAdm",k)} style={{ padding:"6px 10px", borderRadius:6, border: cd.tipoAdm===k ? "1.5px solid #D4781E" : "1px solid rgba(255,255,255,0.05)", background: cd.tipoAdm===k ? "rgba(212,120,30,0.08)" : "transparent", color: cd.tipoAdm===k ? "#D4781E" : "#6B7280", fontSize:9, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{v.label}</button>
                        ))}
                      </div>
                    </div>

                    <button onClick={()=>setCloserStep(3)} style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Perfil levantado → Montar Oferta
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — OFERTA */}
              {closerStep === 3 && (
                <div>
                  <div style={{ ...card(false,"#D4781E"), padding:20 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:4 }}>3. Oferta Irrecusável</div>
                    <div style={{ fontSize:10, color:"#D4781E", marginBottom:14, fontWeight:600 }}>"Eu não quero te vender consórcio. Eu quero te entregar o bem."</div>

                    <div style={{ background:"rgba(212,120,30,0.06)", borderRadius:8, padding:12, marginBottom:14 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#D4781E", marginBottom:6 }}>REGRAS DA OFERTA</div>
                      <div style={{ fontSize:10, color:"#C9CDD4", lineHeight:1.7 }}>
                        Proibido fazer palestra de consórcio. <strong style={{ color:"#fff" }}>Conecte à dor do cliente.</strong><br/>
                        Mínimo técnico — não fale taxa a menos que perguntem.<br/>
                        O consórcio é <strong style={{ color:"#fff" }}>um meio para um fim</strong>, nunca o produto.
                      </div>
                    </div>

                    {/* Resumo do cliente */}
                    <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:8, padding:12, marginBottom:14, border:"1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#6B7280", marginBottom:6 }}>PERFIL {(cd.nomeCliente || "CLIENTE").toUpperCase()}</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                        {[["Quer",f(cd.quantoCusta)],["Entrada",cd.quantoEntrada > 0 ? f(cd.quantoEntrada) : "Zero"],["Parcela máx",f(cd.quantoPorMes)],["Renda",f(cd.renda)],["Aluguel",cd.pagaAluguel > 0 ? f(cd.pagaAluguel) : "Não"],["Prazo",cd.praQuando === "0" ? "Sem pressa" : cd.praQuando+"m"]].map(([k,v],i) => (
                          <div key={i}><div style={{ fontSize:7, color:"#4B5563" }}>{k}</div><div style={{ fontSize:12, fontWeight:800, color:"#fff", fontFamily:"'JetBrains Mono',monospace" }}>{v}</div></div>
                        ))}
                      </div>
                    </div>

                    <button onClick={()=>setCloserStep(4)} style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Gerar Simulação Monte Carlo →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 — VALORIZAÇÃO (com resultados) */}
              {closerStep === 4 && closerEstrategias.length > 0 && (
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:4 }}>4. Valorização</div>
                  <div style={{ fontSize:10, color:"#D4781E", marginBottom:14, fontWeight:600 }}>"Se eu conseguir isso pra você, seria um bom negócio?"</div>

                  <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:8, padding:10, marginBottom:14, border:"1px solid rgba(255,255,255,0.04)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontSize:10, color:"#6B7280" }}>{cd.nomeCliente || "Cliente"} quer {f(cd.quantoCusta)} • {PRESETS[cd.tipoAdm]?.label}</div>
                    <div style={{ fontSize:8, color:"#D4781E", fontWeight:700 }}>Monte Carlo rodado</div>
                  </div>

                  {closerEstrategias.map((e,i) => (
                    <details key={i} style={{ marginBottom:10 }} open={i===0}>
                      <summary style={{ ...card(i===0, e.statusCor), cursor:"pointer", listStyle:"none", position:"relative" }}>
                        {i === 0 && <div style={{ position:"absolute", top:-8, right:100, background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:7, fontWeight:800, padding:"3px 8px", borderRadius:4 }}>RECOMENDADA</div>}
                        <div style={{ position:"absolute", top:-8, right:12, background:e.statusCor, color:"#fff", fontSize:7, fontWeight:800, padding:"3px 8px", borderRadius:4 }}>{e.status} {pc1(e.mc.probabilidade)}</div>
                        <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:2 }}>{e.nome}</div>
                        <div style={{ fontSize:10, color:"#6B7280", marginBottom:8 }}>{e.sub}</div>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {[["CARTA",f(e.credito),"#fff"],["DISPONÍVEL",f(e.credLib),"#D4781E"],["PARCELA",f2(e.parcela)+"/mês","#fff"],["TAXA EF.",pc(e.taxaAA)+" a.a.","#D4781E"],["CONTEMP.",`~${e.mc.mesMedio}m`,e.statusCor]].map(([k,v,c],j)=>(
                            <div key={j}><div style={{ fontSize:7, color:"#4B5563" }}>{k}</div><div style={{ fontSize:13, fontWeight:800, color:c, fontFamily:"'JetBrains Mono',monospace" }}>{v}</div></div>
                          ))}
                        </div>
                      </summary>
                      <div style={{ padding:"0 4px", marginTop:-4 }}><ResultBlock r={e} /></div>
                    </details>
                  ))}

                  {/* Frases de valorização */}
                  <div style={{ background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.12)", borderRadius:8, padding:12, marginBottom:14 }}>
                    <div style={{ fontSize:9, fontWeight:700, color:"#8B5CF6", marginBottom:6 }}>TERMÔMETRO — FALE AGORA</div>
                    <div style={{ fontSize:11, color:"#C9CDD4", lineHeight:1.8 }}>
                      "{cd.nomeCliente || "Nome"}, com essa estratégia você consegue {f(closerEstrategias[0]?.credLib || 0)} disponíveis, pagando {f2(closerEstrategias[0]?.parcela || 0)} por mês. <strong style={{ color:"#D4781E" }}>Se eu conseguir isso pra você, seria um bom negócio?</strong>"<br/><br/>
                      Se SIM → <strong style={{ color:"#D4781E" }}>"Me passa seus dados para verificar a aprovação?"</strong>
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={()=>setCloserStep(2)} style={{ flex:1, padding:"12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)", background:"transparent", color:"#6B7280", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                      ← Voltar ao Perfil
                    </button>
                    <button onClick={()=>setCloserStep(5)} style={{ flex:2, padding:"14px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Cliente valorizou → Fechar
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5 — FECHAMENTO */}
              {closerStep === 5 && (
                <div>
                  <div style={{ ...card(false,"#D4781E"), padding:20 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"#fff", marginBottom:4 }}>5. Fechamento</div>
                    <div style={{ fontSize:10, color:"#D4781E", marginBottom:14, fontWeight:600 }}>"Técnica de fechamento é um bom levantamento de perfil com uma oferta congruente."</div>

                    <div style={{ background:"rgba(212,120,30,0.06)", borderRadius:8, padding:12, marginBottom:14 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#D4781E", marginBottom:8 }}>CHECKLIST DE FECHAMENTO</div>
                      {[
                        "Enviar ficha cadastral (dados do cliente)",
                        "Verificar aprovação / crédito",
                        "Encontrar grupo ideal",
                        "Emitir contrato",
                        "Confirmar forma de pagamento da 1ª parcela",
                        "Agendar próximo contato com DATA + HORA",
                      ].map((item,i) => (
                        <div key={i} style={{ fontSize:11, color:"#C9CDD4", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.02)", display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ color:"#D4781E", fontSize:14, fontWeight:700 }}>□</span> {item}
                        </div>
                      ))}
                    </div>

                    <div style={{ background:"rgba(255,255,255,0.02)", borderRadius:8, padding:12, marginBottom:14, border:"1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#6B7280", marginBottom:6 }}>RESUMO DA VENDA</div>
                      {[
                        ["Cliente", cd.nomeCliente || "—"],
                        ["Bem", cd.oQueComprar === "imovel" ? "Imóvel" : cd.oQueComprar === "veiculo" ? "Veículo" : cd.oQueComprar],
                        ["Crédito desejado", f(cd.quantoCusta)],
                        ["Entrada", cd.quantoEntrada > 0 ? f(cd.quantoEntrada) : "Zero"],
                        ["Parcela máx.", f(cd.quantoPorMes)],
                        ["Renda", f(cd.renda)],
                        ["Comprometimento", comprometimento + "%"],
                        ["Estratégia", closerEstrategias[0]?.nome || "—"],
                        ["Carta", closerEstrategias[0] ? f(closerEstrategias[0].credito) : "—"],
                        ["Parcela simulada", closerEstrategias[0] ? f2(closerEstrategias[0].parcela) : "—"],
                        ["Prob. contemplação", closerEstrategias[0] ? pc1(closerEstrategias[0].mc.probabilidade) : "—"],
                      ].map(([k,v],i) => (
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px solid rgba(255,255,255,0.02)" }}>
                          <span style={{ fontSize:9, color:"#6B7280" }}>{k}</span>
                          <span style={{ fontSize:10, fontWeight:700, color:"#fff", fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Objeções */}
                    <div style={{ background:"rgba(239,68,68,0.04)", border:"1px solid rgba(239,68,68,0.1)", borderRadius:8, padding:12, marginBottom:14 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:"#EF4444", marginBottom:8 }}>SE APARECER OBJEÇÃO</div>
                      {[
                        ['"Vou pensar"', '"O que especificamente você precisa pensar?" → Volta pro perfil.'],
                        ['"Preciso falar com esposa/marido"', 'Convida pra nova call. Não apresente sem o decisor.'],
                        ['"E se demorar?"', `"Mesmo contemplando no último mês, pagando ${closerEstrategias[0] ? f2(closerEstrategias[0].parcela) : "a parcela"}, você passaria fome? Não? Então qual o problema?"`],
                        ['"Consórcio é ruim"', 'Não defenda. Volte à DOR. "Você tem medo de morrer sem o primeiro imóvel?"'],
                      ].map(([obj,resp],i) => (
                        <div key={i} style={{ marginBottom:8 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:"#EF4444" }}>{obj}</div>
                          <div style={{ fontSize:10, color:"#C9CDD4", marginTop:2 }}>{resp}</div>
                        </div>
                      ))}
                      <div style={{ fontSize:9, color:"#F59E0B", fontWeight:600, marginTop:6 }}>Regra: objeção = você errou no levantamento. Volta pra trás, não empurra pra frente.</div>
                    </div>

                    <button onClick={()=>window.print()} style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#D4781E,#A85A15)", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Imprimir Resumo / PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      </div>

      <div style={{ borderTop:"1px solid rgba(255,255,255,0.04)", marginTop:30, padding:"28px 16px 20px" }}>
        <div style={{ maxWidth:860, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <img src="/gm-logo-texto.png" alt="Grupo Mirandas" style={{ height:32, opacity:0.6 }}/>
            <div style={{ width:1, height:20, background:"rgba(255,255,255,0.06)" }}/>
            <img src="/logo-branco.png" alt="Código 31" style={{ height:16, opacity:0.35 }}/>
          </div>
          <div style={{ fontSize:8, color:"#2A2A2A", letterSpacing:0.8, textAlign:"right", lineHeight:1.6 }}>
            MONTE CARLO • JUROS SIMPLES<br/>DADOS REAIS CNP CAIXA E SANTANDER • {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  );
}

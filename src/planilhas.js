// ═══════════════════════════════════════════════════════════
// PARSERS DE PLANILHAS (CNP, Santander, Lances)
//
// Módulo carregado sob demanda: a biblioteca xlsx pesa ~430 KB e só é
// necessária quando alguém abre o painel de importação. Fora daí, o closer
// não paga esse download.
// ═══════════════════════════════════════════════════════════
import * as XLSX from "xlsx";

export function lerPlanilha(data) {
  return XLSX.read(data);
}

export function parseCNP(workbook) {
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

export function parseSantander(workbook) {
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

export function parseLances(workbook, gruposExistentes) {
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
export function parseLancesCNP(workbook) {
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

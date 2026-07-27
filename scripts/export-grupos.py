#!/usr/bin/env python3
"""
Gera src/data/grupos.json a partir das planilhas reais do Drive.

Fonte: ~/Library/CloudStorage/GoogleDrive-.../Lances_Consorcio/{Santander,CNP}
Reusa a mesma logica da skill lances-consorcio (janela de 6 meses, maior dos menores).

Saida por grupo:
  id, adm, tipo, taxa, fr, prazo, partic, parcela, creditos[], embutidoMax
  menores[]     -> historico de MENOR_LANCE por assembleia (base do Monte Carlo real)
  lanceCerto    -> maior dos menores da janela (~99% de contemplacao)
  lanceMedio    -> media dos menores
  contemp       -> contemplacoes/mes na janela
  meses         -> quantos meses de historico (confiabilidade)

Uso: python3 scripts/export-grupos.py
"""
import datetime
import json
import os
import sys

import pandas as pd

DATA_ROOT = os.path.expanduser(
    "~/Library/CloudStorage/GoogleDrive-anthony@mirandas.com.br/Meu Drive/Lances_Consorcio"
)
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "grupos.json")
JANELA_MESES = 6
MIN_MESES_CONFIAVEL = 4

# Santander: faixa de numeracao -> tipo (quando o grupo nao esta no mapa APOIO)
FAIXAS_SAN = [
    (600, 2999, "veiculo"),
    (3000, 3999, "imovel"),
    (5000, 7999, "servico"),
    (8000, 8999, "veiculo"),
]
NORM_SAN = {"AUTO": "veiculo", "IMOVEL": "imovel", "MOTO": "veiculo",
            "CAMIN": "pesado", "ELETRO": "servico"}

COR = {"Santander": "#EC0000", "CNP Caixa": "#005CA9"}


def pct_para_num(v, default):
    """A planilha da CNP mistura 0.16 e '3.7%' na mesma coluna. Normaliza pra numero em %."""
    if v is None or (not isinstance(v, str) and pd.isna(v)):
        return default
    if isinstance(v, str):
        v = v.strip().replace("%", "").replace(",", ".")
        if not v:
            return default
        try:
            return round(float(v), 1)
        except ValueError:
            return default
    return round(float(v) * 100, 1) if float(v) <= 1 else round(float(v), 1)


def planilha_mais_recente(pasta):
    arqs = [f for f in os.listdir(pasta)
            if f.endswith(".xlsx") and not f.startswith("~$") and "ANALISE" not in f]
    if not arqs:
        raise SystemExit(f"Nenhuma planilha em {pasta}")
    arqs.sort()
    return os.path.join(pasta, arqs[-1])


def meses_janela(meses_disponiveis, n=JANELA_MESES):
    meses = sorted({int(m) for m in meses_disponiveis if pd.notna(m)})
    hoje = datetime.date.today()
    corrente = hoje.year * 100 + hoje.month
    completos = [m for m in meses if m < corrente]
    base = completos or meses
    return base[-n:]


def tipo_santander(grupo, mapa):
    if grupo in mapa:
        return NORM_SAN.get(mapa[grupo], "servico")
    for lo, hi, t in FAIXAS_SAN:
        if lo <= grupo <= hi:
            return t
    return "servico"


def carregar_santander():
    arq = planilha_mais_recente(os.path.join(DATA_ROOT, "Santander"))
    lances = pd.read_excel(arq, "LANCES")
    apoio = pd.read_excel(arq, "APOIO")
    prazos = pd.read_excel(arq, "Prazo grupos")

    mapa_prod = dict(zip(apoio["CD_GRUPO"], apoio["CD_PRODUTO"]))
    mapa_cotas = dict(zip(apoio["CD_GRUPO"], apoio.get("NR_MAX_COTAS_GRUPO", pd.Series(dtype=float))))
    mapa_prazo = dict(zip(prazos["CD_GRUPO"], prazos["PZ_RESTANTE"]))
    mapa_ativas = dict(zip(prazos["CD_GRUPO"], prazos.get("QT_ATV", pd.Series(dtype=float))))

    janela = meses_janela(lances["MES_CONTMP"])
    L = lances[lances["MES_CONTMP"].isin(janela)].copy()

    grupos = []
    for gid, sub in L.groupby("GRUPO"):
        menores = [round(float(v), 4) for v in sub["MENOR_LANCE"].dropna() if 0 < float(v) <= 1]
        if not menores:
            continue
        cotas = mapa_ativas.get(gid) or mapa_cotas.get(gid)
        prazo_rest = mapa_prazo.get(gid)
        contemp = float(sub["QTDE_CONTMP"].sum()) / max(sub["MES_CONTMP"].nunique(), 1)
        grupos.append({
            "id": str(int(gid)),
            "adm": "Santander",
            "cor": COR["Santander"],
            "tipo": tipo_santander(int(gid), mapa_prod),
            "taxa": 20, "fr": 5,
            "prazo": int(prazo_rest) if pd.notna(prazo_rest) and prazo_rest else None,
            "partic": int(cotas) if cotas and pd.notna(cotas) else None,
            "parcela": None,
            "creditos": [],
            "embutidoMax": 20,
            "menores": menores,
            "lanceCerto": round(max(menores) * 100, 2),
            "lanceMedio": round(sum(menores) / len(menores) * 100, 2),
            "contemp": round(contemp, 1),
            "meses": int(sub["MES_CONTMP"].nunique()),
        })
    return grupos, os.path.basename(arq), janela


def carregar_cnp():
    """CNP nao tem historico de lances por assembleia na planilha — so cadastro de grupo."""
    arq = planilha_mais_recente(os.path.join(DATA_ROOT, "CNP"))
    abas = {"CNP - IMÓVEL": ("imovel", 50), "CNP - AUTOMÓVEL": ("veiculo", 30),
            "CNP - PESADOS": ("pesado", 30)}
    grupos = []
    for aba, (tipo, embutido) in abas.items():
        df = pd.read_excel(arq, aba, header=1)
        for _, r in df.iterrows():
            gid = str(r.get("Grupo") or "").strip().replace("*", "")
            # a aba repete o cabecalho e traz linhas de total no meio dos dados
            if not gid.isdigit():
                continue
            def num(v):
                try:
                    return float(str(v).replace("%", "").replace(",", "."))
                except (TypeError, ValueError):
                    return None

            creditos = [int(v) for v in (num(r.get("Menor")), num(r.get("Maior"))) if v]
            prazo = num(r.get("Prazo"))
            partic = num(r.get("N Particip"))
            grupos.append({
                "id": gid,
                "adm": "CNP Caixa",
                "cor": COR["CNP Caixa"],
                "tipo": tipo,
                "taxa": pct_para_num(r.get("TAXA ADM"), 20),
                "fr": pct_para_num(r.get("FR"), 5),
                "prazo": int(prazo) if prazo else None,
                "partic": int(partic) if partic else None,
                "parcela": None,
                "creditos": creditos,
                "embutidoMax": embutido,
                "menores": [],
                "lanceCerto": None,
                "lanceMedio": None,
                "contemp": None,
                "meses": 0,
            })
    return grupos, os.path.basename(arq)


def main():
    san, arq_san, janela = carregar_santander()
    cnp, arq_cnp = carregar_cnp()
    grupos = san + cnp

    ji, jf = str(janela[0]), str(janela[-1])
    payload = {
        "meta": {
            "gerado_em": datetime.date.today().isoformat(),
            "fonte_santander": arq_san,
            "fonte_cnp": arq_cnp,
            "janela": f"{ji[:4]}/{ji[4:]} a {jf[:4]}/{jf[4:]}",
            "janela_meses": len(janela),
            "min_meses_confiavel": MIN_MESES_CONFIAVEL,
            "total": len(grupos),
            "com_historico": sum(1 for g in grupos if g["menores"]),
        },
        "grupos": grupos,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    kb = os.path.getsize(OUT) / 1024
    print(f"OK  {len(grupos)} grupos ({len(san)} Santander + {len(cnp)} CNP)")
    print(f"    historico real de lances: {payload['meta']['com_historico']} grupos")
    print(f"    janela {payload['meta']['janela']} | {kb:.0f} KB -> {os.path.relpath(OUT)}")


if __name__ == "__main__":
    sys.exit(main())

# Calculadora C31 — YES Consórcios

Ferramenta de call do closer: monta as 3 estratégias do Código 31 (só embutido,
embutido + entrada, parcela ½ + fidelidade), calcula o custo efetivo real e
simula a contemplação com base em **lance real de assembleia**.

**No ar:** https://calculadora-c31.vercel.app

## Como a contemplação é calculada

Cada grupo carrega o histórico dos **menores lances vencedores** das últimas 6
assembleias fechadas. A simulação sorteia um desses lances por mês; o cliente
contempla no primeiro mês em que o lance dele for maior ou igual ao sorteado.
Sorteio comum entra como chance mensal à parte (contemplações/mês ÷ cotas ativas).

É o mesmo motor da skill `lances-consorcio` — os valores batem com o ranking do
Python (validado grupo a grupo).

Números que a tela mostra:

- **Lance certo** — maior dos menores da janela. É o lance que pegou em todas as
  assembleias recentes. Esse é o número que o closer leva pra call.
- **Rápido / Provável / Demorado** — percentis 10, 50 e 90 dos meses até contemplar.
- **Probabilidade** — teto de exibição em `≥99%`. Nunca mostrar 100%: contemplação
  é por sorteio ou lance, não é garantida (e prometer isso é problema de compliance).

CNP Caixa não publica lance por assembleia. Os grupos da CNP entram com cadastro
completo (crédito, taxa, prazo), mas a simulação usa o histórico Santander da
mesma categoria como referência — e a tela diz isso na cara.

## Atualizar os dados (rito mensal)

Quando a planilha nova cair no Drive:

```
~/Library/CloudStorage/GoogleDrive-.../Lances_Consorcio/Santander/santander_AAAA-MM.xlsx
~/Library/CloudStorage/GoogleDrive-.../Lances_Consorcio/CNP/cnp_AAAA-MM.xlsx
```

Rodar:

```bash
python3 scripts/export-grupos.py   # lê o arquivo mais recente de cada pasta
npm run build
git commit -am "chore: dados de lances AAAA-MM" && git push
```

O script regenera `src/data/grupos.json` (grupos + histórico de lances + janela)
e o rodapé do site passa a mostrar a nova data automaticamente. Deploy é
automático no push da main.

## Rodar local

```bash
npm install
npm run dev
```

## Estrutura

| Arquivo | O que é |
|---|---|
| `src/App.jsx` | telas (Closer, Manual, Inteligente), fórmulas de custo efetivo, import de planilha |
| `src/motor.js` | Monte Carlo sobre lances reais, faixas P10/P50/P90, teto de exibição |
| `src/data/grupos.json` | base viva: 400+ grupos com histórico (gerado, não editar à mão) |
| `scripts/export-grupos.py` | gera o JSON a partir das planilhas do Drive |
| `api/chat.js` | chat IA closer (RAG das calls do Anthony) — Vercel Function, usa `OPENAI_API_KEY` |
| `api/log.js` | log de uso do chat |

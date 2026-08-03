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

## Deploy

O site tem hoje dois endereços, e é bom saber a diferença antes de mexer.

**Cloudflare Pages — `calculadora-c31.grupomirandas.com.br`** (recomendado)

Projeto `calculadora-c31` na conta Cloudflare do Grupo Mirandas, conectado a
**este** repositório. Todo push na `main` que toque `apps/calculadora-c31/`
publica sozinho, em ~30s. Root directory `apps/calculadora-c31`, build
`npm run build`, saída `dist`. Custo zero no plano gratuito.

As rotas `/api/chat` e `/api/log` rodam como Pages Functions (`functions/api/`).

Para ligar o chat IA, basta a variável de ambiente — não precisa tocar em código:

```
Cloudflare → Workers & Pages → calculadora-c31 → Settings → Variables
OPENAI_API_KEY = <chave>   (production, encrypted)
```

Sem ela, `/api/chat` responde 503 com aviso em português e o resto da
calculadora funciona normalmente.

**Vercel — `calculadora-c31.vercel.app`** (legado)

Projeto na conta pessoal do Anthony, ainda conectado a um repo pessoal — que foi
a origem do site até julho/2026. A Action `deploy-calculadora-c31.yml` publica
deste repo para lá, mas **um push no repo pessoal ainda sobrescreve** o que está
no ar. Enquanto essa conexão não for trocada no dashboard da Vercel, esse
endereço não é confiável como fonte de verdade. Prefira o domínio próprio.

## Estrutura

| Arquivo | O que é |
|---|---|
| `src/App.jsx` | telas (Closer, Manual, Inteligente), fórmulas de custo efetivo, import de planilha |
| `src/motor.js` | Monte Carlo sobre lances reais, faixas P10/P50/P90, teto de exibição |
| `src/data/grupos.json` | base viva: 400+ grupos com histórico (gerado, não editar à mão) |
| `scripts/export-grupos.py` | gera o JSON a partir das planilhas do Drive |
| `shared/prompt-closer.js` | prompt do closer — fonte única das duas runtimes |
| `functions/api/chat.js` | chat IA closer — Cloudflare Pages Function, usa `OPENAI_API_KEY` |
| `functions/api/log.js` | log de uso do chat (hoje sem armazenamento) |
| `api/chat.js`, `api/log.js` | mesmas rotas na Vercel (legado) |

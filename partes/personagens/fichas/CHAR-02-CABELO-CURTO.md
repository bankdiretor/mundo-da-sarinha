# FICHA CHAR-02 — CABELO CURTO SIMPLES
*Ficha visual do GPT, 18/08/2026. Construído direto da ficha (o Ivan dispensou o
prompt em texto).*

## Escopo
Cabelo curto que senta no `HairAnchor` e acompanha a curvatura da cabeça do
CHAR-01. Sem mexer no corpo, na cabeça, no rig nem nos anchors.

## Entregue
`SarinhaHairShort01.js` → `SARINHA_PERSONAGENS.createSarinhaHairShort01(ctx, opts)`
`opts`: `hairColor` · `material` · `flatShading`
Paleta da ficha exposta em `SARINHA_PERSONAGENS.HAIR_PALETTE` (6 cores).

## Números MEDIDOS
- **210 triângulos**, **1 malha** (a ficha pede geometria baixa e limpa)
- Personagem completo com cabelo: **1.583 tri** (teto 1.800) · 14 malhas
- Largura do cabelo **0,99u** — a ficha especifica 1,00u ✔
- Corpo continua **2,60**; o cabelo passa **0,09** acima da cabeça (volume, não chapéu)
- **0%** de geometria enterrada dentro do crânio
- Clipping: raios na altura dos olhos, sobrancelhas e boca atingem o ROSTO,
  nunca o cabelo ✔
- Console limpo, sem erro

## As 4 peças da ficha
A ficha desenha franja, calota, laterais e nuca como peças que encaixam. Na
implementação elas existem como **regiões de espessura de uma casca só** — a
razão está na armadilha 1. Modular no desenho, 1 draw call no render.

## ⚠️ ARMADILHAS PAGAS (4 rodadas no mesmo defeito)
1. **Peças soltas não viram cabelo.** Construí franja, nuca e costeletas como
   esferas posicionadas por cima: a franja virou uma **boina flutuando** e a
   vista lateral, um amontoado. Cabelo curto é UMA casca contínua; o que muda
   de lugar para lugar é a ESPESSURA, não a quantidade de bolas.
2. **Barra de altura constante come a sobrancelha.** Interpolando linearmente
   por `cos(ang)`, a barra caía para 0,126 na coluna dos olhos — abaixo da
   sobrancelha (0,129–0,150). Corrigido com smoothstep por ângulo: barra alta em
   todo o arco da testa (até ~17°), depois desce.
3. **Travar o Y da borda cria uma aba de viseira.** Empurrar para `y = corte`
   mantinha o raio horizontal do vértice e a borda saía reta para fora da
   cabeça. A borda precisa **descer colada ao crânio**.
4. **Anéis colapsados = faces empilhadas.** Todos os vértices abaixo da barra
   caindo na mesma altura geravam faces degeneradas e quina na têmpora. Solução:
   **remapear o parâmetro vertical** da esfera — anel de baixo na barra, anel de
   cima no alto, os do meio distribuídos.
5. **Volume máximo na ponta engrossa a franja.** Com o volume cheio em t=0, saía
   uma "asa" de 5 cm à frente da testa. Cabelo afina na ponta: curva em sino.
6. **⭐ A CAUSA REAL do bico (só o perfil numérico achou):** o cabelo usava um
   topo PRÓPRIO (`raioCabecaY + espessura + volume` = 0,369) e ganhava uma cúpula
   que o crânio não tem. Medido: **0,146 de saliência em y=0,333**, acima do topo
   da cabeça. Forma base agora é o crânio puro (0,315); espessura e volume só
   incham radialmente depois. Saliência caiu para 0,111.
   **Lição:** quando um defeito de forma resiste a 3 tentativas, pare de ajustar
   parâmetro e **imprima o perfil da geometria** contra a peça de referência.

## Como ver
`_vitrine-personagem.html?zoom=cabeca&vista=frente` · `&cabelo=0` tira ·
`&cabelo=8E6CA9` troca a cor (qualquer hex da paleta) · `&pele=5A3524`
Fotos: `fotos/personagens/char-02/`

## v1.1 — POLISH PASS (18/08)
Ordem do Ivan: tirar a cara de capacete SEM reconstruir e SEM passar de 250 tri.

**Entregue** (220 tri, 1 malha, todos os critérios passando):
- barra do cabelo **ondulada** por duas senoides de frequências diferentes na
  frente e uma mais lenta na nuca — variação de **0,069** (não é mais uma linha)
- **assimetria** medida em 0,38: o lado esquerdo desce mais que o direito
- **topo deslocado** 12 mm em X e 10 mm em Z — mata o hemisfério perfeito
- barra lateral desceu: orelha **71% visível** (alvo 40–75%)
- flat shading mantido no cabelo (a exceção de normais suaves é só do crânio)
- rotação yaw −45/0/+45: o cabelo acompanha, sem clipping

**❌ NÃO ENTREGUE: a franja em 3–5 blocos.** Três tentativas, todas medidas:
1. **Ondas na própria casca** → com 20 gomos há só ~4 vértices no arco da testa;
   as ondas viraram uma curva lisa, zero dentes. Para blocos de verdade numa
   casca uniforme seriam **~40 gomos = 500+ triângulos**, o dobro do teto.
2. **Cunhas triangulares mescladas** → viraram **dentes de serra**, pareciam coroa.
3. **Cunhas trapezoidais** → largas demais cobriam a sobrancelha; curtas e altas
   viraram **placas soltas boiando na testa**.
As coordenadas das 5 pontas ficaram no código (`C.pontas`, sem uso) caso o teto
de triângulos suba. **A conclusão medida: franja em blocos e teto de 250 tri são
incompatíveis nesta topologia.**

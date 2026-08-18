# FICHA CHAR-04 — CABELO LONGO ONDULADO
*18/08/2026. Construído a partir do estilo nº2 da folha SARINHA MINI STYLE
(não houve ficha dedicada do GPT) e da base já provada do CHAR-03.*

## Entregue
`SarinhaHairWavy01.js` → `SARINHA_PERSONAGENS.createSarinhaHairWavy01(ctx, opts)`
Mesmo encaixe e mesmas opções dos outros cabelos.

## Números MEDIDOS
- **350 triângulos**, **1 malha** · personagem completo **1.723** (teto 1.800)
- Olhos, sobrancelhas e boca livres · 0% de geometria enterrada · console limpo
- Rotação da cabeça: o cabelo acompanha

## O que faz dele o ondulado
A cortina do CHAR-03 ganhou uma **senoide no raio ao longo da altura** — duas
curvas suaves na queda. Três detalhes que evitam o efeito "vaso torneado":
1. a **amplitude cresce para baixo** (raiz quieta, pontas soltas);
2. a **fase gira com o ângulo**, então as ondas não se alinham em volta da cabeça;
3. a **barra ficou mais irregular** que a do liso (pontas desiguais).

## ⚠️ DUAS DECISÕES MEDIDAS
1. **Onde gastar o triângulo.** Com 16 gomos × 14 anéis (432 tri) o personagem ia
   a **1.805** e estourava o teto de 1.800. O corte saiu dos **gomos** (16→14),
   não dos anéis: **anel é onda, gomo é só redondeza**. 14×13 = 350 tri.
   O ondulado custa mais que o liso (304) de propósito — a onda É a peça.
2. **⛔ A cortina cobria a sobrancelha.** O arco da testa terminava em 0,42 rad,
   mas a sobrancelha vai até **~0,69 rad** (x=0,19 com z=0,23). A cortina começava
   a descer bem em cima dela. Arco da testa alargado para 0,74 rad.
   ⚠️ O CHAR-03 (liso) passa no teste com o arco antigo por pouco — se um dia a
   cabeça ou a sobrancelha mudarem, **conferir os dois**.

## ⛔ ARMADILHA PAGA: "não é o mesmo do anterior?"
O Ivan olhou a primeira versão e perguntou isso. **Estava certo.** Medi a
diferença de raio contra o liso: **máximo de 0,028 — 8% do raio da cabeça.**
Invisível.

Causa: apliquei a onda como fator percentual pequeno (`ondaRaioA = 0,085`, ou
8,5%). Num raio de ~0,33 isso dá 0,028 de deslocamento absoluto — nada.
Correção: amplitude para **0,30**, frequência menor (onda GRANDE, não ripple) e
um empurrão adicional em **Z**, para o cabelo ondular para fora em vez de só
engordar e afinar. Diferença agora: **0,072 = 20% do raio da cabeça**.

**Lição:** ao criar uma variante de uma peça existente, **medir a diferença
contra o original** antes de entregar. "Parece diferente para mim" não é medida —
a comparação numérica de perfil é. Vale para os cabelos que faltam.


## ⛔ ARMADILHA PAGA: o "V" rasgado no alto da cabeça
O Ivan mandou um close do topo: havia uma **fenda em V** deixando o fundo
aparecer. Diagnóstico por raycast em grade sobre a coroa: **furo real**, na
frente do topo.

**Causa:** a altura de cada anel era interpolada de `corte` (que varia com o
ângulo) até o topo. No cabelo longo a barra frontal fica a **0,08** do topo e a
de trás a **0,745** — os anéis comprimem de um lado e esticam do outro, e a malha
rasga na costura. **O cabelo curto não tinha o defeito** porque a barra dele quase
não varia (0,235 na frente contra 0,018 no lado).

**Correção:** a **calota** (acima da quebra) passou a ser esfera pura, igual em
todos os ângulos; só a **cortina** (abaixo) estica até a barra de cada coluna. Na
frente, onde a barra fica acima da quebra, os anéis são travados na barra e o raio
é recalculado para a altura final — sem virar aba.

⚠️ Ao corrigir, o clipping quebrou nos dois (a franja passou a cobrir a
sobrancelha) e foi preciso alargar o arco da testa de 0,42 para **0,74 rad** —
a sobrancelha vai até ~0,69 rad. **Uma correção de forma pode reabrir um defeito
já resolvido: rode o verificador inteiro, não só o critério que você mexeu.**

## Como ver
`_vitrine-personagem.html?cabelo=ondulado` · `&vista=34|lado|costas` ·
`&zoom=cabeca` · `&pele=5A3524`
(`?cabelo=longo` = liso · sem parâmetro = curto · `?cabelo=0` = careca)
Fotos: `fotos/personagens/char-04/`

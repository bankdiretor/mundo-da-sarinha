# FICHA CHAR-03 — CABELO LONGO LISO
*Ficha visual do GPT, 18/08/2026. Construído direto da ficha.*

## Entregue
`SarinhaHairLong01.js` → `SARINHA_PERSONAGENS.createSarinhaHairLong01(ctx, opts)`
`opts`: `hairColor` · `material` · `flatShading`
Mesmo encaixe do CHAR-02: `HairAnchor` + `offsetNoHairAnchor`.

## Números MEDIDOS
- **304 triângulos**, **1 malha** — a ficha pede 240–340 e 1 malha ideal ✔
- Personagem completo: **1.677** (teto 1.800)
- Cabelo com **1,154 de altura** contra 0,830 da cabeça — desce até a altura do peito ✔
- Orelha **0% visível** (cabelo longo cobre, ao contrário do curto) ✔
- Clipping: olhos, sobrancelhas e boca continuam livres ✔
- 0% de geometria enterrada no crânio · console limpo

## A diferença técnica para o cabelo curto: a QUEBRA
O cabelo longo **não é uma casca maior**. Até a altura do maxilar ele acompanha o
crânio; a partir de `yQuebra = −0,115` o raio horizontal **congela** e a malha cai
reta até a barra. É isso que produz as "laterais longas em cortina" e a
"extremidade limpa e plana" da ficha — sem isso a casca continuaria fechando para
dentro e o cabelo sairia com forma de sino colado no pescoço.
A cortina ainda **afina 7%** perto da ponta, para a barra não parecer um tubo cortado.

## Reaproveitado do CHAR-02 (as lições já pagas)
- forma base = crânio puro, espessura inflando **depois** (senão nasce um bico de perfil)
- parâmetro vertical **remapeado** entre barra e topo (senão os anéis colapsam)
- barra por ângulo com smoothstep (senão dá quina na têmpora)
- franja parando acima da sobrancelha, que termina em 0,150
- ondulação leve + assimetria de 0,012 no lado esquerdo


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


## v1.2 — REFINO CONTRA A FICHA (18/08, feito pelo próprio Claude a pedido do Ivan)
O Ivan reenviou a ficha e mandou: "o 3 tem que ser assim". Diferenças corrigidas:
- **franja baixa** cobrindo o alto da testa: corte 0,235 → **0,190**, com arco
  central de 0,015 (piso 0,175; sobrancelha termina em 0,150)
- **cortinas de verdade**: a descida começa na têmpora e termina em 1,02 rad
  (era 1,30) — de frente as laterais emolduram o rosto como na ficha
- **corpo da cortina** (+0,030 de espessura da têmpora para baixo): as laterais
  aparecem de frente
- **extremidades limpas e planas**: onda da barra 0,020 → 0,005; assimetria 0,012 → 0,005

## ⛔ BUG DO MEDIDOR descoberto neste refino
O critério "diferente dos outros" media **0,012** entre o longo v1.2 e o ondulado
— sendo os dois visivelmente diferentes. Causa: o perfil comparava buckets de
altura `toFixed(2)` e, entre malhas de topologias diferentes, **só 2 de 27
buckets coincidiam** — sobrava a diferença de bbox. Consertado com bins de 0,04
agregando o raio máximo. Com o medidor honesto: longo↔ondulado real era 0,053;
o ondulado ganhou onda 0,30 → **0,40** e `ondaZ` 0,080 (flip nas pontas) para
voltar a ≥0,07. **Lição: quando o número contradiz o olho, audite o medidor
antes de mexer na peça.**

## Como ver
`_vitrine-personagem.html?cabelo=longo` · `&vista=34|lado|costas` ·
`&zoom=cabeca` · `&pele=5A3524` · o curto continua em `?cabelo=0` (nenhum) ou
sem o parâmetro (curto).
Fotos: `fotos/personagens/char-03/`

## Nota de escopo
O CHAR-03 usa `flatShading` como o CHAR-02. A exceção de normais suaves continua
valendo **só para o crânio** do CHAR-01.

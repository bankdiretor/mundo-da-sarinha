# FICHA CHAR-00 — CORPO BASE MODULAR (Sarinha Mini Style v1.0)
*Fonte: prompt do Ivan 17/08/2026 + folha visual. Números da folha vencem o
texto onde houver conflito. Adaptações ao mundo marcadas com ⚠️ — elas VENCEM
o prompt original (ver `../CONTRATO-MINI-STYLE.md`).*

## Escopo
SÓ o corpo-base técnico neutro. SEM cabelo, roupa definitiva, acessório, rosto
definitivo, personalidade, NPC, wardrobe, UI. Corpo ÚNICO neutro (menina/menino
diferem depois via cabelo/roupa/cor).

## Medidas (folha, seção 4)
- Altura total BASE_HEIGHT = **2.60** (pivô no chão, y=0; sola do sapato TOCA y=0)
- Cabeça (placeholder): **0.85** de altura visual (32–35% do total)
- Torso: **0.70** · Pernas: **0.70** · Sapatos: **0.20**
- Cabeça: esfera low-poly r≈0.44, 12×8 segmentos ou menos, escala (1.00, 1.05, 0.94)
- Torso: cápsula/cilindro 6–8 segmentos, ~0.62 largura × 0.70 altura × 0.45 prof.
  Não pode parecer bloco rígido.
- Braço superior: comp 0.38–0.44, espessura 0.13–0.16
- Antebraço: comp 0.32–0.38, um pouco mais fino
- Mão: icosaedro/esfera low-poly r 0.13–0.16, "mitten hand", SEM dedos
- Coxa: comp 0.32–0.38, espessura 0.16–0.20 · Perna baixa: 0.30–0.36, mais fina
- Sapato: ~0.28 larg × 0.16 alt × 0.38 prof, bico avança para **+Z**,
  LEVEMENTE GRANDE (estilo brinquedo) — é o marcador visual da frente
- Pescoço: mínimo ou nenhum
- Braços discretamente afastados do torso; pernas ligeiramente afastadas

## Eixos e pivôs
+Y cima · **+Z FRENTE** · +X direita. Pivô principal (CharacterRoot) em (0,0,0),
y=0 = chão. Pivô de cada membro NA ARTICULAÇÃO (ombro, cotovelo, quadril,
joelho) — nunca girando pelo centro do cilindro.

## Hierarquia (folha, seção 2 — nomes EXATOS)
```
SarinhaCharacterBase (Group)
└─ CharacterRoot
   ├─ Pelvis
   │  ├─ Torso
   │  └─ HeadPivot ── HeadPlaceholder
   ├─ LeftShoulderPivot ── LeftUpperArm ── LeftElbowPivot ── LeftForearm ── LeftHand
   ├─ RightShoulderPivot ── (idem espelhado)
   ├─ LeftHipPivot ── LeftThigh ── LeftKneePivot ── LeftLowerLeg ── LeftFoot
   ├─ RightHipPivot ── (idem espelhado)
   └─ Anchors
```
Braços/pernas gerados por UMA função com `side: 'left'|'right'` (sem duplicar
código). Constantes centralizadas num objeto `PROPORTIONS` (sem números mágicos
espalhados).

## Anchors (Object3D invisíveis, nomes exatos; 11 da folha)
HeadAnchor (conexão cabeça/torso — onde o CHAR-01 entra) · HairAnchor (centro
superior da cabeça) · HatAnchor (topo) · LeftShoulderAnchor ·
RightShoulderAnchor · LeftHandAnchor · RightHandAnchor (centro funcional da
palma) · WaistAnchor (centro inferior do torso — saia/short/calça) ·
BackAccessoryAnchor (centro das costas, lado −Z… ATENÇÃO: costas = −Z porque a
frente é +Z) · LeftFootAnchor · RightFootAnchor

## Assinatura (⚠️ adaptada: sem ES module, padrão do projeto)
```js
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};
window.SARINHA_PERSONAGENS.createSarinhaCharacterBase = function (ctx, opts) {
  // ctx = { T, BGU }  (T = THREE r147; BGU = T.BufferGeometryUtils)
  // opts = { height=2.6, skinColor=0xD8A27E, debugColor=0xC9A7D8,
  //          shoeDebugColor=0x9D6BC1, showHeadPlaceholder=true,
  //          showDebugAnchors=false }
  // constrói na escala BASE_HEIGHT=2.6 e aplica scale.setScalar(height/2.6)
};
```
⛔ NUNCA registrar em `window.MUNDO_PARTES` (o jogo montaria o corpo sozinho no
meio da praça). Namespace é `SARINHA_PERSONAGENS`, arquivo NÃO entra no HTML do
jogo nesta etapa.

## Cores (folha, seção 5 — todas por VÉRTICE)
- Pele (cabeça, braços, mãos, pernas): `skinColor` default **#D8A27E** — parametrizável
- Torso (debug, não é roupa oficial): **#C9A7D8**
- Sapatos (debug): **#9D6BC1**
- Torso e sapatos NÃO recebem skinColor.

## ⚠️ Material (adaptação — o prompt original pede Standard/sombras; AQUI NÃO)
- ÚNICO material do corpo: `new T.MeshLambertMaterial({vertexColors:true, flatShading:true})`
  compartilhado por todas as malhas (1 material, N meshes).
- Cor por vértice com a `pinta` canônica do mundo (degradê vertical leve,
  fBase 0.08–0.12) — receita em `../CONTRATO-MINI-STYLE.md`.
- ⛔ PROIBIDO: MeshStandardMaterial, castShadow/receiveShadow, luz nova,
  textura, emissive. Sombra do personagem é disco pintado e entra na
  INTEGRAÇÃO, não neste módulo.

## Orçamento (medido, não estimado)
- Triângulos: **800–1.500** (teto do contrato mestre, item 44: "preferencialmente
  < 1.500"). ⚠️ A ficha nasceu com 1.200; o valor foi corrigido para o teto REAL
  do contrato quando 2 defeitos visuais exigiram gasto: +40 tri de anel na cabeça
  (sem eles a luz hemisférica + flatShading criava um degrau escuro cortando a
  cabeça) e +120 tri de mão em esfera (o icosaedro detail 0 virava um diamante
  pontudo — armadilha 5). Entregue: **1.224**.
- Malhas: **≤ 13** (torso, cabeça, 2×braço sup, 2×antebraço+? , 2×mão, 2×coxa,
  2×perna baixa, 2×pé/sapato — mão pode mesclar no antebraço se não custar a
  troca futura de luva/item; pé/sapato fica SEPARADO para troca de sapato)
- Segmentos 6–8 em cilindros/cápsulas; esferas com poucos segmentos.
- Referência: o boneco atual do jogador tem 6 draw calls; o CHAR-00 compra
  articulação de cotovelo/joelho com até ~13 — não passar disso.

## userData
```js
character.userData = { type:'SarinhaCharacterBase', version:'1.0', baseHeight:2.6 };
character.userData.anchors = { head, hair, hat, leftShoulder, rightShoulder,
  leftHand, rightHand, waist, back, leftFoot, rightFoot };
character.userData.rig = { headPivot, leftShoulderPivot, rightShoulderPivot,
  leftElbowPivot, rightElbowPivot, leftHipPivot, rightHipPivot,
  leftKneePivot, rightKneePivot };
```

## Critérios de aprovação (checagem AUTOMÁTICA no Node + visual na vitrine)
1. Altura total 2.60 ± 0.05; menor Y = 0.000 (sola no chão, sem flutuar nem afundar)
2. Cabeça 32–35% da altura visual
3. Frente = +Z (bico do sapato aponta +Z)
4. Silhueta fofa: criança, NÃO adulto miniaturizado (cabeça grande, pernas curtas)
5. Simetria esquerda/direita exata (|xL| = |xR| em todos os pares)
6. Todos os 11 anchors existem, com nome certo e posição coerente
7. Rig completo no userData; girar cada pivô ±0.6 rad NÃO desmonta o boneco
   (malha acompanha o pivô — pivô na articulação)
8. Merge de cada malha não-nulo; tri total no orçamento; zero pares coplanares
9. `node --check` passa; identificadores ASCII puro
10. Vitrine mostra: frontal, 3/4, lateral, traseira + modo anchors + modo silhueta

## Entregáveis
- `SarinhaCharacterBase.js` (nesta pasta)
- `_vitrine-personagem.html` (na pasta `jogo/`, padrão das vitrines existentes:
  three r147 por CDN + luz copiada da `_vitrine-teste.html`, criança de
  referência 1.40 ao lado, chão, URL params `?vista=&anchors=1&silhueta=1&pele=`)
- Relatório com os NÚMEROS medidos (tri, malhas, bbox, minY, % cabeça, anchors)

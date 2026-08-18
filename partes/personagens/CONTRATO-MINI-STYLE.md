# SARINHA MINI STYLE v1.0 — contrato OPERACIONAL
*É ESTE arquivo que vai no prompt dos agentes construtores de personagem.
O texto integral do Ivan está em `PROMPT-MESTRE-ORIGINAL.md`. Onde este arquivo
diverge do mestre, é porque o CONTRATO DO MUNDO (`../CONTRATO.md`) venceu — a
regra da casa: quando ficha/prompt conflita com peça ou regra já congelada,
o mundo existente vence.*

## O estilo em uma linha
Boneco-brinquedo low-poly, chibi, pastel, modular: cabeça grande (30–35%),
tronco 22–28%, pernas 28–34%, braços curtos, sem pescoço, sapatos maiorzinhos,
cabelo em blocos, rosto minimalista de olhos grandes. Silhueta > detalhe.
Doce, alegre, seguro para criança. Nunca: realismo, anatomia adulta, neon,
sombrio, fios de cabelo, cinco dedos.

## ⚠️ AS 4 ADAPTAÇÕES OBRIGATÓRIAS (mundo vence o mestre)

### 1. Material: Lambert, NÃO Standard
O mestre sugere `MeshStandardMaterial`. **Proibido no mundo** (contrato + 2
luzes fixas). Usar a técnica canônica das peças:
- corpo: `MeshLambertMaterial({vertexColors:true, flatShading:true})`
- o que "acende" (brilho de olho, detalhe luminoso): 2ª malha
  `MeshBasicMaterial({vertexColors:true})`
- cores SEMPRE por vértice com a `pinta` canônica (degradê vertical).
Flat shading, low-poly e paleta pastel do mestre ficam — o mundo já é assim.

### 2. Altura: construir em 2.6, instanciar na escala DO JOGO
O mestre sugere 2.4–2.8 e o próprio CHAR-00 parametriza
(`height / BASE_HEIGHT`). Então: **módulos construídos na escala-base 2.6**;
a altura de INSTÂNCIA no jogo é outra coisa e foi MEDIDA no código em 17/08:
- boneco atual do jogador: **~1,90** (topo da cabeça em y=1.90; `montarBoneco`)
- criança de referência das vitrines: **1,40**
- NPCs de `criancas.js`: ~84% do jogador
A altura de instância definitiva se decide NA INTEGRAÇÃO, medindo contra
câmera, portas e colisores — nunca chutar. Proporções do mestre (cabeça
30–35%) valem em qualquer escala.

### 3. Modularidade em TEMPO DE MONTAGEM, orçamento em tempo de render
Requisito central do mestre (peças combináveis) convive com o orçamento do
mundo assim:
- Cada módulo (corpo, cabelo, top, saia…) é um arquivo que devolve
  **geometrias + anchors + metadados**, NÃO uma malha pronta na cena.
- O **Assembler** combina os módulos escolhidos e **mescla** no personagem
  final: alvo **≤2 draw calls e ≤ ~1.800 tri por personagem completo**
  (corpo ~600–800, cabelo ~250–400, roupa ~250–400, sapatos/acessório ~100–200).
- NPCs repetidos: **InstancedMesh** (receita das casas e das crianças).
  ⛔ Armadilha 15: malha tingida por instância exige **material próprio**.
- ⚠️ Articulação p/ animação (andar, dançar): quantos sub-grupos o personagem
  pode ter sem estourar o orçamento **se decide na 1ª peça, MEDINDO como o
  boneco atual do jogador anda** no `mundo-sarinha.html` — não chutar.

### 4. Integração: namespace próprio, nunca MUNDO_PARTES
⛔ Armadilha 16: módulo registrado em `window.MUNDO_PARTES` é montado SOZINHO
no meio da praça pelo `montarPartes()`. O sistema de personagens vive em
**`window.SARINHA_PERSONAGENS`** (registro próprio: `.modulos`, `.montar()`),
em `partes/personagens/*.js`. Só o RESULTADO montado entra na cena.

## Regras herdadas do mundo que valem aqui (inegociáveis)
- Sem luz nova, sem sombra real (sombra = disco pintado), sem textura externa,
  sem GLTF/OBJ/FBX, sem CDN. Textura só via canvas (`CanvasTexture`).
- ASCII puro em identificador. `node --check` antes de entregar.
- Merge com `BGU.mergeBufferGeometries` — atributos normalizados pela `pinta`
  (senão devolve `null` EM SILÊNCIO). As 18 armadilhas da skill
  `peca-mundo-sarinha` valem TODAS para personagens.
- Medir, não supor: tri, draw calls, bbox, menor Y=0, na vitrine com a LUZ REAL.

## Convenções do sistema
- **Eixos**: +Z = frente, +Y = cima, +X = direita. ⚠️ MEDIDO em 17/08: o boneco
  atual do jogo olha para **−Z** (olhos em z=−0.26, nuca em z=+0.20). O sistema
  segue o mestre (+Z) para toda ficha futura casar; o ADAPTADOR de integração
  aplica `rotation.y = Math.PI` ao pendurar o personagem no jogo.
- **Pivô**: corpo = centro inferior (pé no y=0); cabeça = base central; cabelo =
  encaixe da cabeça; roupa = encaixe do tronco; sapato = base.
- **Anchors do corpo base**: `headAnchor`, `leftArmAnchor`, `rightArmAnchor`,
  `leftLegAnchor`, `rightLegAnchor`, `topAnchor`, `bottomAnchor`,
  `accessoryAnchor` (posições no espaço local do corpo, publicadas nos metadados).
- **Nomes**: padrão do mestre em inglês — `SarinhaHairLong01.js` /
  `createSarinhaHairLong01()` — claros, numerados, ASCII.
- **Tom de pele e cores**: parametrizáveis em toda peça (`pinta(geo, corPele)`),
  nunca um tom fixo. Paleta: lavanda, lilás, rosas, azul/verde suaves, dourado,
  creme, branco quente, roxo amigável. Reservado: `0xffd166` é a cor do
  COLETÁVEL do jogo — proibida em decoração de personagem.
- **Entrega por peça**: arquivo + função + anchors + parâmetros + demo na
  vitrine + números medidos + critérios de aprovação.

## Método de produção (skill peca-mundo-sarinha)
1 agente construtor por peça, com este contrato + a ficha da peça no prompt.
Agente monta em Node com three r147 real e MEDE antes de entregar. Inspeção na
vitrine (`_vitrine-teste.html` ou vitrine própria de personagem), vista LATERAL,
escala contra a criança de 1,40. Reprovou → 2ª rodada com o MESMO agente e
crítica específica. Fotos do aprovado (e do reprovado) em `fotos/`.

## O que já existe (evoluir, não ignorar)
- Boneco do jogador: `montarBoneco()` no `mundo-sarinha.html` (pele/cabelo/roupa
  escolhidos na montagem, salvos no aparelho) — o Mini Style v1.0 o SUBSTITUI,
  mantendo a customização salva.
- NPCs: `partes/criancas.js` (chibi 84%, 10 cores, 1 draw call via instância,
  gestos por matriz) — candidatas a migrar para o sistema novo depois que o
  corpo base existir.

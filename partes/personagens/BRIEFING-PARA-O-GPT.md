# Texto para enviar ao GPT (o que gera as fichas/prompts dos personagens)
*Copiar daqui para baixo. Atualizado 18/08/2026, depois do CHAR-00 v1.1.*

---

## CONTEXTO — leia antes de gerar o próximo prompt

O CHAR-00 (corpo base) foi construído, medido e passou por um silhouette pass
(v1.1). O sistema está vivo e funcionando. Daqui para frente, os prompts que você
gerar precisam respeitar o ambiente REAL onde o código roda, senão metade de cada
prompt é descartada na hora de implementar.

O formato das suas fichas é ótimo e deve continuar: render do resultado, vistas
frente/lado/costas/3-4, explosão das partes, paleta com hex, dimensões-chave e
diagrama de anchors. **O que não é aproveitável é a seção de código** — ela vem
com técnica que é proibida neste projeto (detalhes abaixo). Mande pseudocódigo ou
só a descrição da montagem; o código é reescrito na técnica da casa de qualquer
forma.

## AS REGRAS TÉCNICAS DO MUNDO (não são preferência, são restrição)

O jogo é um mundo three.js **r147**, 100% procedural, sem nenhum asset externo,
que precisa rodar a 60 fps em celular. Portanto:

1. **Material: `MeshLambertMaterial({vertexColors:true, flatShading:true})`.**
   ⛔ Proibidos: `MeshStandardMaterial`, `roughness`, `metalness`, `emissive`,
   `castShadow`, `receiveShadow`, shadowMap, pós-processamento.
   Cor vai **por vértice**, nunca por material separado. Sombra do personagem é
   um disco escuro pintado no chão.
2. **Duas luzes no mundo inteiro, e nenhuma peça pode criar luz.** O que "acende"
   (brilho, luzinha) é uma segunda malha com `MeshBasicMaterial`.
3. **Sem `import`/`export`.** É script de navegador clássico; o sistema de
   personagens vive em `window.SARINHA_PERSONAGENS`.
4. **Sem textura externa, sem GLTF/OBJ/FBX, sem CDN de asset.** Textura só se for
   desenhada em runtime num `<canvas>`.
5. **Identificadores em ASCII puro** (sem acento no nome de variável/função).
6. **Geometria mesclada**: cada peça vira poucas malhas via
   `mergeBufferGeometries`. Peça com muitos materiais diferentes não passa.

## FATOS MEDIDOS QUE CONTRADIZEM SUPOSIÇÕES COMUNS

Estes números vieram de medição no motor real, não de estimativa:

- **A cena é NOTURNA e roxa.** A luz é uma hemisférica lilás com chão marrom
  escuro. Uma superfície virada para baixo perde **57% de luminância**. Isso
  significa que **a cor que aparece na tela nunca vai bater com a da sua
  ilustração** — o pigmento tem teto (não existe cor acima do branco). Ao mandar
  paleta, mande a intenção ("pele média quente", "lilás pastel") e aceite que a
  referência de comparação são as peças vizinhas do mundo, não o PNG da ficha.
- **Reduções percentuais não fecham numa altura fixa.** No v1.1 você pediu cabeça
  −12%, torso −18% e pernas −15% mantendo 2.60 de altura: isso é aritmeticamente
  impossível (exigiria cabeça de ~46% do corpo). Resolvido normalizando a altura
  na saída. Ao pedir mudanças de proporção, prefira dizer **a proporção alvo**
  ("cabeça = 36% da altura") em vez de percentuais de redução encadeados.
- **Orçamento real**: o corpo base ficou em **1.160 triângulos / 12 malhas**.
  O personagem COMPLETO (corpo + cabeça + cabelo + roupa + sapato + acessório)
  tem teto de **~1.800 triângulos**, porque vão existir dezenas deles em cena ao
  mesmo tempo. Então cada peça nova de roupa/cabelo precisa caber em
  **150–400 triângulos**. Peça de 2.000 triângulos não entra.
- **Altura**: o sistema é construído numa escala base e escalado na instância.
  No jogo o personagem tem ~1,90 de altura (o mundo inteiro — portas, casas,
  castelo — foi dimensionado contra isso).

## O QUE JÁ EXISTE E TODA PEÇA NOVA PRECISA RESPEITAR

Hierarquia viva do CHAR-00 (nomes exatos, não renomear):

```
SarinhaCharacterBase > CharacterRoot > Pelvis
  ├ Torso
  ├ HeadPivot > HeadPlaceholder   (é este que o CHAR-01 substitui)
  ├ Left/RightShoulderPivot > UpperArm > ElbowPivot > Forearm (mão mesclada)
  ├ Left/RightHipPivot > Thigh > KneePivot > LowerLeg + Foot
  └ Anchors
```

**11 anchors prontos** para pendurar peças: `HeadAnchor`, `HairAnchor`,
`HatAnchor`, `Left/RightShoulderAnchor`, `Left/RightHandAnchor`, `WaistAnchor`,
`BackAccessoryAnchor`, `Left/RightFootAnchor`.
**Rig de 9 pivôs** funcionando (cabeça, 2 ombros, 2 cotovelos, 2 quadris,
2 joelhos) — já testado dobrando sem desmontar o boneco.

Orientação: **+Z é a frente**, +Y cima, +X direita, pé em Y=0.

## O QUE EU PRECISO NO PRÓXIMO PROMPT (CHAR-01 — CABEÇA E ROSTO)

Se for o CHAR-01, o que mais ajuda receber:

1. **Vistas grandes do rosto**: frente e 3/4, com os olhos, boca e bochechas bem
   legíveis — é a peça que define a alma do personagem.
2. **Forma da cabeça**: ela substitui um placeholder que hoje é uma esfera
   achatada, mais larga que alta, com a base afunilada. Diga se mantém essa massa
   ou muda, e como o cabelo vai assentar nela depois.
3. **Como os olhos são feitos**: no mundo não há textura nem decal — olho é
   **geometria** (uma calota/disco escuro sobre a face, levemente saliente para
   não brigar com a superfície) ou desenho num canvas. Diga qual das duas, e o
   tamanho/posição relativos.
4. **Expressão base**: uma só, gentil e alegre. Se quiser prever mais expressões
   depois, diga quais partes trocariam.
5. **Orçamento sugerido para a cabeça completa com rosto**: até ~450 triângulos.
6. Onde a cabeça encaixa: no `HeadAnchor`/`HeadPivot` já existente.

## FORMATO IDEAL DE PROMPT (o que funcionou)

Numerado, direto, com: escopo do que NÃO fazer · medidas com números ·
hierarquia com nomes exatos · anchors · paleta · critérios de aprovação
verificáveis. Só troque a seção de código por descrição da montagem.

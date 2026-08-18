# Sistema de personagens — Sarinha Mini Style v1.0
*Atualizado: 18/08/2026. Comece por aqui ao retomar personagens.*

## Estado
| módulo | o que é | estado |
|---|---|---|
| **CHAR-00 v1.2** | Corpo base modular (silhouette pass + cabeça 32%) | ✅ medido |
| **CHAR-01 v1.2** | Cabeça / rosto (após Face Art Pass) | ✅ medido |
| **CHAR-02 v1.1** | Cabelo curto simples (após polish) | ✅ medido |
| **CHAR-03** | Cabelo longo liso | ✅ medido |
| **CHAR-04** | Cabelo longo ondulado | ✅ **medido — aguarda veredito do Ivan** |
| **CHAR-05** | Cabelo cacheado | ✅ medido |
| **CHAR-06** | Cabelo coquinhos | ✅ medido |
| **CHAR-07** | Cabelo médio volumoso | ✅ medido |
| CHAR-08+ | Roupas (top, saia, short, calça, vestido, jaqueta) | ⬜ **próximo** |
| CHAR-14+ | Acessórios | ⬜ |
| **CHAR-20** | Character Assembler | ✅ **feito e INTEGRADO NO JOGO** |

## Como ver
```
cd ~/sarinha/mundo/jogo && node servidor.js
```
→ `http://localhost:3032/_vitrine-personagem.html`

Parâmetros: `?vista=frente|34|lado|costas|topo` · `&anchors=1` (11 marcadores
coloridos, atravessam o corpo) · `&silhueta=1` (teste de silhueta) · `&pose=1`
(dobra ombros/cotovelos/quadris/joelhos — prova do rig) · `&pele=HEX` ·
`&altura=2.6` · `&ref=0` (esconde o poste de 1,40).

Fotos de QA: `~/sarinha/mundo/fotos/personagens/` (char-00, char-01, char-02, char-03)

✅ **Os personagens ESTÃO no jogo** desde 18/08. O `montarBoneco` antigo continua
no arquivo como **reserva**: se o sistema não carregar, o jogo cai nele em vez de
ficar sem personagem. Backup do HTML: `backup-mundo-antes-personagens-*.html`.

**Como o jogo usa:** `criarPersonagem()` no `mundo-sarinha.html` chama
`SARINHA_PERSONAGENS.montarPersonagem`. A tela de montagem ganhou a fileira
**penteado**, que sai do `CATALOGO_CABELO` do Assembler — **cabelo novo aparece
lá sozinho, sem tocar no HTML**.

⚠️ O giro que casa o sistema (+Z) com a convenção do jogo (−Z) mora no
**CharacterRoot**, não no grupo raiz: o jogo escreve em `boneco.rotation.y` para
virar o personagem e apagaria o giro se ele estivesse ali.

## v1.1 — SILHOUETTE PASS (18/08)
O v1.0 foi aprovado pelo Ivan como **alpha de estrutura**, com o diagnóstico:
"tecnicamente correto, mas parece um robô low-poly". A v1.1 mexeu SÓ em
proporção e forma — arquitetura, anchors e pivôs intactos. Ordem completa em
`fichas/CHAR-00-v1.1-SILHUETA.md`.

| medida | v1.0 | v1.1 |
|---|---|---|
| cabeça (altura) | 0.903 | 0.786 (−13%) · e **não é mais esfera**: mais larga que alta, achatada em Z, base afunilada |
| cabeça (% do corpo) | 34,7% | **36,9%** — mais chibi |
| torso | 0.95 alt × 0.72 larg | **0.78 × 0.76** (−18% de altura, +6% de largura) |
| braços | 0.732 · r 0.098 | **0.644 · r 0.110** (−12% comprimento, +12% espessura) |
| mãos | r 0.135 | **r 0.115** (−15%) |
| pernas (quadril→chão) | 0.90 | **0.775** (−14%), +10% de espessura |
| sapatos | 0.32 × 0.43 × 0.198 alt | **0.35 × 0.495 × 0.182** (mais largo e fundo, mais baixo) |
| triângulos | 1.224 | **1.160** |

## CHAR-00 — números MEDIDOS (não estimados)
Verificador: monta a peça no three r147 real em Node e checa 14 critérios.
Medidas cruas em `fichas/CHAR-00-MEDIDAS.json`.

- **1.224 triângulos · 12 malhas · 14–15 draw calls**
- Altura **2.600** exata · menor Y **0.000** (sola no chão, não flutua)
- Cabeça **34,7%** da altura (alvo 32–35%)
- Simetria esquerda/direita: erro **0.000000**
- Articulação: os 9 pivôs giram sem desmontar o boneco; o pivô fica parado e a
  malha varre o arco (prova de que o pivô está NA junta, não no meio do osso)
- `height` e `skinColor` paramétricos conferidos (1,90 dá 1,90; torso e sapato
  NÃO recebem a cor de pele)
- Console do navegador: zero erro

## Decisões tomadas na construção (e por quê)
1. **Mão mesclada no antebraço** — a mão nunca se move sozinha e o `HandAnchor`
   já dá o ponto de encaixe de item. Economiza 2 malhas.
2. **Sapato como malha separada** — vai ser trocado por sapato de verdade.
3. **Anchors de cabeça sob o `HeadPivot`** (a folha os desenha num grupo solto):
   cabelo e chapéu TÊM de girar junto com a cabeça. Mesma lógica para ombro,
   mão e pé. `WaistAnchor` e `BackAccessoryAnchor` ficam no grupo `Anchors`.
4. **Orçamento: 1.224** — a ficha nasceu com teto de 1.200 (escolha minha); o
   valor foi corrigido para o teto do contrato mestre (item 44: "< 1.500")
   quando dois defeitos visuais reais exigiram gasto. Ver armadilhas 2 e 3.

## ⚠️ ARMADILHAS PAGAS NESTE MÓDULO (não repetir)
1. **Offset do quadril contado DUAS VEZES** — o `Pelvis` já mora em y=0.90;
   ombro e quadril foram criados com Y absoluto e o boneco inteiro flutuou a
   0.86 do chão, com 1,74 de altura em vez de 2,60. Filho de nó deslocado usa
   coordenada RELATIVA. Pego pelo verificador, não pelo olho.
2. **Bounding box encosta ≠ superfície encosta** — o topo da cápsula do torso e
   a base da esfera da cabeça são dois AFILAMENTOS: as bbox se tocavam (gap
   medido −0.023, "sobrepondo") e o olho via a cabeça flutuando. Volume tem de
   sobrepor: o torso subiu para 1.80 e a cabeça, mais larga, cobre o topo.
3. **Icosaedro detail 0 vira DIAMANTE** — a mão parecia um cristal pontudo
   (armadilha 5 da skill). Esfera 8×6 achatada resolveu (+120 tri).
4. **Luz hemisférica + flatShading = degrau escuro** — o chão marrom da
   `HemisphereLight` escurece a metade de baixo de qualquer esfera; com poucos
   anéis o flat shading transforma isso num degrau cortando a cabeça ao meio.
   9 anéis em vez de 7 vira degradê (+40 tri). ⛔ Não é a `pinta`: baixar o
   `fBase` de 0.08 para 0.02 não mudou nada — quem manda é a luz.
5. **Junta sem sobreposição vira salsicha** — com 0.01 de sobreposição no
   joelho, dobrar a perna abria um vão. Juntas agora sobrepõem ~0.07.
6. **Marcador de anchor sem `depthTest:false` fica invisível** — quase todo
   anchor mora dentro da geometria; na inspeção pareciam ausentes (estavam lá).
7. **"Vão" entre cabeça e torso que NÃO era vão** (v1.1) — parecia um buraco na
   emenda. Raycast (17 raios na faixa) e análise de pixel provaram: **zero furo**.
   Era a base da cabeça renderizando quase preta contra o torso claro. ⛔ A lição:
   antes de mexer na geometria por causa de um "buraco", **prove que ele existe**.
8. **Compensar pigmento contra a luz tem TETO baixo** (v1.1) — a base da cabeça
   perde **57%** de luminância pela `HemisphereLight` de chão marrom. Clarear o
   pigmento de −0,34 → −0,75 (quase branco) só recuperou **6 pontos**. Confirma a
   armadilha 13 da skill: compense e PARE. O que resolveu de verdade foi
   **geometria**: afundar a cabeça no torso esconde a calota escura.
9. **Reduções percentuais não fecham numa altura fixa** (v1.1) — encolher cabeça
   −13%, torso −18% e pernas −14% mantendo 2.60 exigiria cabeça de ~46% do corpo.
   Solução: construir na altura natural e **normalizar na saída** (`height /
   P.headTopY`). ⚠️ `headTopY` virou o botão que regula o quanto a cabeça afunda
   E a proporção: 2.19 → 36,0% · 2.13 → 36,9% · 2.08 → 37,8% (estoura o teto).

## Contratos
- `CONTRATO-MINI-STYLE.md` — o operacional (vai no prompt de todo agente)
- `PROMPT-MESTRE-ORIGINAL.md` — o texto integral do Ivan
- `fichas/CHAR-00-CORPO-BASE.md` — a ficha desta peça
- A skill `peca-mundo-sarinha` continua valendo inteira (as 18 armadilhas).

## Integração no jogo — AINDA NÃO FEITA (de propósito)
O arquivo **não** entra no `mundo-sarinha.html` enquanto o Ivan não aprovar.
Quando entrar, dois pontos medidos em 17/08:
- o boneco atual do jogador olha para **−Z**; o sistema novo olha para **+Z** →
  o adaptador aplica `rotation.y = Math.PI`;
- altura do boneco atual ≈ **1,90** → instanciar com `height: 1.90` (não 2.6,
  senão vira gigante nas portas e na câmera).


## Catálogo de cabelo — 7 opções (18/08)
Os **6 estilos da folha** do Mini Style, mais o carequinha. Todos montados pelo
Assembler e disponíveis na tela do jogo.

| estilo | arquivo | tri | personagem completo |
|---|---|---|---|
| Carequinha | — | 0 | 1.373 |
| Curto | `SarinhaHairShort01.js` | 220 | 1.593 |
| Longo liso | `SarinhaHairLong01.js` | 304 | 1.677 |
| Longo ondulado | `SarinhaHairWavy01.js` | 350 | 1.723 |
| Cacheado | `SarinhaHairCurly01.js` | — | 1.730 |
| Coquinhos | `SarinhaHairBuns01.js` | 304 | 1.677 |
| Médio volumoso | `SarinhaHairVolume01.js` | 336 | 1.709 |

Pior caso: **1.730 de 1.800** triângulos. Todos com **1 malha**, pé em y=0.

### Como nasceu um cabelo novo (método que funcionou)
Os três últimos foram construídos por **agentes em paralelo, um por cabelo**, com:
- `BRIEFING-CABELO-NOVO.md` — as 10 armadilhas já pagas, a geometria da cabeça
  com todos os números, o contrato e o orçamento;
- `_verificar-cabelo.js` — verificador automático de **11 critérios** que monta o
  personagem no three real. Dois critérios nasceram de defeitos que o **Ivan achou
  de olho**: o **furo na coroa** e a **diferença mínima contra os cabelos que já
  existem** (≥0,07), que impede entregar um estilo praticamente igual a outro.

Os três passaram em 11/11. Para acrescentar o próximo estilo, basta escrever o
arquivo, passar no verificador e registrar em `CATALOGO_CABELO` no Assembler —
ele aparece sozinho na tela do jogo e na vitrine.

# Briefing: construir um CABELO novo do Sarinha Mini Style
*Tudo que os cabelos já feitos custaram para aprender. Ler INTEIRO antes de escrever
uma linha — cada armadilha aqui custou pelo menos uma rodada de retrabalho.*

## O que já existe (leia os arquivos, é de lá que se copia a técnica)
| arquivo | estilo | tri | como é feito |
|---|---|---|---|
| `SarinhaHairShort01.js` | curto | 220 | casca contínua, barra por ângulo |
| `SarinhaHairLong01.js` | longo liso | 304 | casca + **cortina** (cai reta abaixo do maxilar) |
| `SarinhaHairWavy01.js` | longo ondulado | 350 | cortina + **onda no raio ao longo da altura** |

O seu cabelo deve seguir **exatamente a mesma estrutura**: um IIFE que registra em
`window.SARINHA_PERSONAGENS`, uma função `casca()`/`calota()` que deforma uma
`SphereGeometry`, e a `pinta` canônica. **Copie o esqueleto de um deles** — o mais
próximo do seu estilo — e mude a forma.

## A geometria da cabeça (todos os números em escala CRUA)
- raios da cabeça: **X 0.350 · Y 0.315 · Z 0.2835**, centro em y=0 local
- a frente da cabeça é achatada em **14%** (`achataFace`) — seu cabelo tem de fazer o mesmo
- **a sobrancelha vive entre y=+0.129 e +0.150 e vai até ~0.69 rad de ângulo**
- a orelha vai de y=−0.069 a +0.089, em x≈±0.325
- o peito (para cabelo longo) fica em y ≈ **−0.41**
- o `HairAnchor` mora acima do centro: use
  `offsetNoHairAnchor: -(0.315 * 1.42 - 0.315)` no userData, como os outros

## ⛔ AS ARMADILHAS JÁ PAGAS (todas medidas, nenhuma é teoria)
1. **Peças soltas não viram cabelo.** Franja/nuca/laterais como esferas separadas
   posicionadas por cima viram uma boina flutuando. Cabelo é **uma casca contínua**;
   o que muda de lugar para lugar é a **espessura**.
2. **A forma base é o CRÂNIO PURO.** Calcule x,z com os raios da cabeça e só
   **depois** infle na direção radial pela espessura. Usar um "topo próprio"
   (raio + espessura) cria uma cúpula que a cabeça não tem e nasce um **bico de
   perfil** (0.146 de saliência, medido).
3. **Nunca trave só o Y na borda.** `y = corte` mantendo o raio do vértice vira
   uma **aba de viseira**. A borda tem de descer **colada ao crânio**: recalcule o
   raio horizontal para a altura final.
4. **Remapeie o parâmetro vertical**, não colapse anéis. Se todos os vértices
   abaixo da barra caem na mesma altura, as faces empilham e dá quina.
5. **⭐ Se a barra varia MUITO com o ângulo (cabelo longo), separe calota e saia.**
   A calota (acima da quebra) tem de ser **igual em todos os ângulos**; só a saia
   estica até a barra de cada coluna. Sem isso a coroa **rasga em V** — foi o
   defeito que o Ivan viu de olho.
6. **A franja não pode cobrir a sobrancelha.** O arco da testa tem de ir até
   **0.74 rad** antes de a barra começar a descer. Testar SEMPRE.
7. **Volume máximo na ponta engrossa a barra** e vira asa. Use curva em sino:
   zero na ponta, cheio um pouco acima.
8. **Amplitude de onda precisa ser ABSOLUTA, não percentual tímido.** Uma onda de
   8% do raio deu 0.028 de deslocamento — invisível. O Ivan perguntou "não é o
   mesmo do anterior?" e estava certo. Mire **≥0.07 de diferença** contra o cabelo
   mais parecido.
9. **Uma correção de forma pode reabrir outro defeito.** Rode o verificador
   INTEIRO, não só o critério que você mexeu.
10. **`scale(-1,1,1)` para espelhar SOME com a peça** (inverte as faces).

## Contrato técnico (inegociável)
- three **r147**, script clássico de navegador, **sem import/export**
- **1 malha**, `MeshLambertMaterial({vertexColors:true, flatShading:true})`
- cor por vértice via a `pinta` canônica (copie do arquivo vizinho); `fBase`
  **negativo** clareia a base e compensa a luz noturna do mundo
- **sem luz, sem sombra real, sem textura, sem asset externo**
- identificadores **ASCII puro**, comentários curtos em português
- `node --check` tem de passar

## Orçamento
O personagem completo não pode passar de **1.800 triângulos**. O corpo+cabeça já
usam **1.373**. Logo: **seu cabelo tem no máximo ~420 tri**, e o alvo é **250–350**.
Onde gastar: **anel é forma que desce (onda, cacho, queda); gomo é só redondeza.**

## Como medir (obrigatório antes de entregar)
Existe um verificador pronto e parametrizável:
```
node C:/Users/pasto/sarinha/mundo/jogo/partes/personagens/_verificar-cabelo.js <ArquivoDoCabelo.js> <nomeDaFuncao>
```
Ele monta o personagem inteiro no three real e checa: triângulos, malhas,
clipping com olhos/sobrancelhas/boca, geometria enterrada no crânio, altura,
pé no chão, rotação da cabeça e **a diferença contra os cabelos já existentes**
(o critério que pegou o ondulado "igual ao liso").
**Só entregue com TODOS_OK: true.**

## Entrega
1. O arquivo `.js` na pasta `partes/personagens/`
2. Rodar o verificador até passar tudo
3. Relatório curto: triângulos, malhas, o que você fez para o estilo ficar
   diferente dos outros, e quais armadilhas te pegaram

⛔ **NÃO** mexa em: `SarinhaCharacterAssembler.js`, `mundo-sarinha.html`,
`_vitrine-personagem.html` nem nos outros cabelos. A integração é feita depois,
por mim, para os três não colidirem.
⛔ **NÃO** abra navegador — o verificador em Node é a sua prova.

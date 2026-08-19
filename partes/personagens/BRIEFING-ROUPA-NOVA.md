# Briefing: construir uma ROUPA do Sarinha Mini Style (CHAR-08+)
*Lido INTEIRO antes de escrever uma linha. As decisões estruturais aqui não são
sugestão — são o contrato que faz as 6 peças conviverem no mesmo corpo.*

## A DECISÃO CENTRAL: como roupa funciona neste corpo
O corpo articula nos ombros, cotovelos, quadris e joelhos. O TRONCO é estático.
Portanto:

| categoria | técnica | por quê |
|---|---|---|
| **top / vestido** | casca que SUBSTITUI o torso (declara `hideTorso:true`) | o torso de hoje já é "roupa de debug"; substituir economiza os 208 tri dele |
| **jaqueta** | camada POR CIMA do torso (`hideTorso:false`), folga ≥0.03 | jaqueta aberta mostra a blusa por baixo |
| **saia / barra de vestido** | cone estático preso na cintura | ⛔ R1 abaixo: a saia NÃO acompanha a perna — tem de ser larga |
| **short / calça** | faixa de quadril estática + **PINTURA das pernas** via `legPaint` | a perna balança ±0,62 rad; tubo estático na coxa = perna atravessando pano |

## Espaço de coordenadas: o PELVIS (origem = quadril)
Números MEDIDOS no corpo real (bbox em pelvis-space):
- **Torso**: x ±0.380 · y −0.05 a +0.73 · z ±0.238 (cápsula r 0.28 escalada [1.357, 1, 0.85], centro y +0.34)
- **Braço superior**: x −0.46 a −0.27 · y +0.226 a +0.583 · r 0.110 (ombro em ±0.365, y +0.583)
- **Coxa**: x −0.294 a −0.076 · y −0.32 a 0 · r 0.126 (quadril x ±0.185)
- **Pé/sapato**: y −0.775 a −0.593 (o chão do personagem é y = −0.775)
- **WaistAnchor**: (0, +0.02, 0) · **BackAccessoryAnchor**: (0, +0.34, −0.226)
- Frente = **+Z** (o Assembler cuida do giro do jogo)

## Assinatura e userData (obrigatórios, iguais para todos)
```js
window.SARINHA_PERSONAGENS.createSarinhaTop01 = function (ctx, opts) {
  // ctx = {T, BGU} · opts = { clothColor, accentColor, material }
  // devolve T.Group com UMA malha (name 'ClothMesh'), construida em PELVIS-SPACE
  grupo.userData = {
    type: 'SarinhaTop01',
    tipoRoupa: 'top' | 'bottom' | 'dress' | 'jacket',
    hideTorso: true|false,
    legPaint: null | { thigh: 'cloth'|'skin', lowerLeg: 'cloth'|'skin', foot: null }
  };
};
```
O Assembler pendura o grupo NO PELVIS (posição zero) — a peça já nasce no lugar.
NÃO anexe ao corpo você mesmo; NÃO gire nada.

## Costuras (para top+saia conviverem)
- Top termina em y = **−0.02** (barra reta).
- Saia/short começam em y = **+0.04** (por baixo do top: sobreposição de 0.06,
  com raio MENOR que o do top na zona de sobreposição — folga 0.012, senão z-fight).
- Vestido é peça única: não combina com top nem saia (o Assembler impede).

## ⛔ ARMADILHAS (as pagas nos cabelos valem + 4 novas de roupa)
R1. **Peça estática não acompanha membro.** Saia/vestido: a barra precisa de
    extensão em Z ≥ **0.30** na altura do fim (a coxa avança 0.19 no passo).
    Short/calça NUNCA como tubo estático: use `legPaint`.
R2. **Manga curta ou nenhuma** (comprimento ≤0.15 do ombro, raio ≥0.135) — o
    braço gira no ombro e não pode raspar.
R3. **Camadas precisam de folga ≥0.012** ou piscam (z-fight). Detalhe saliente
    (estrela no peito): ~0.015 à frente da superfície, como os olhos do CHAR-01.
R4. **Forma base = o CORPO puro, inflar depois** (mesma lição dos cabelos): a
    casca do top é a MESMA cápsula do torso com +0.015 — nunca uma forma nova.
+ merge devolve null em silêncio (use a `pinta` canônica de qualquer cabelo);
+ amplitude tímida é invisível (≥0.07 absoluto para o que precisa LER);
+ `scale(-1,1,1)` para espelhar SOME com a peça;
+ ASCII puro, sem import/export, `MeshLambertMaterial` vertexColors, sem luz/sombra.

## Orçamento
- Peça: **80–350 tri** (teto 450) · **1 malha**
- Personagem completo com cabelo + a peça: **≤ 2.000 tri** (o teto subiu de
  1.800 porque roupa entra; top/vestido devolvem os 208 do torso escondido)

## Estilo (folha mestre, painel "Looks Iniciais")
Paleta pastel do universo: lavanda #C9A7D8 · rosa #E8A7B2 · azul #9FB4D8 ·
verde #BCD6B0 · dourado #E9B44C · creme #F4EDDE. `clothColor` parametrizável
(o jogo pinta com a cor que a criança escolher); `accentColor` para detalhe.
⛔ 0xffd166 é RESERVADO (coletável do jogo) — proibido em roupa, EXCETO a
estrela do peito do Top01, que usa `accentColor` (default #F2D98A, mais claro).

## Medir até passar (obrigatório)
```
node C:/Users/pasto/sarinha/mundo/jogo/partes/personagens/_verificar-roupa.js <Arquivo.js> <funcao>
```
Só entregue com TODOS_OK: true. E lembre: o verificador NÃO julga beleza — eu
fotografo na vitrine depois e mando de volta se estiver feio. Capriche na
silhueta desde já.

## Entrega
Arquivo em `partes/personagens/` + verificador passando + relatório curto
(tri, decisões, armadilhas que pegaram). ⛔ NÃO toque em: Assembler, HTMLs,
outros cabelos/roupas, corpo, cabeça.

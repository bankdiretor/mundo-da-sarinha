/* parteCasa01 — HOUSE-01: a casinha AZUL do Mundo da Sarinha.
   Nivel 1 da colecao de casas: a mais simples que ja parece "casa" de
   feltro — caixa + piramide + porta + 1 janela acesa + chamine.

   MEDIDAS DA FICHA (pivo no centro embaixo, Y=0 e o chao, frente = +Z):
     largura 3.00 (X)  profundidade 3.00 (Z)
     parede  2.20      altura total  3.60 (ponta do telhado)
   Dai saem as contas do arquivo:
     - face da frente da parede em z = +1.50 (tudo que e porta/janela vive
       NA FRENTE desse plano, em camadas; ver "AS CAMADAS" abaixo);
     - telhado piramidal: ConeGeometry(2.60, 1.40, 4) girado 45 graus, base
       em y=2.20 e ponta em y=3.60. Com 4 lados a base e um quadrado de
       meia-diagonal 2.60, ou seja meio-lado 2.60/raiz(2) = 1.838 — sobra
       0.338 de BEIRAL alem da parede (1.50), como pede a ficha.
     - tabua do beiral: tronco de 4 lados 2.58 -> 2.72 (meio-lado 1.923),
       de y=2.14 a 2.30; e ela que faz a "aba" e esconde a junta.

   AS CAMADAS (armadilha ja paga no projeto: sem CSG nao existe furo na
   parede — se a porta ficar no mesmo z da parede ela SOME). Entao:
     parede  z=1.50 | vidro/porta 1.56-1.58 | moldura ate 1.64 | macaneta 1.69
   A moldura e a peca MAIS saliente e ela e VAZADA (Shape com holes), nunca
   uma chapa cheia — chapa cheia tapa a janela.

   COR: face vertical recebe ~55% da luz neste rig de 2 luzes, entao os hex
   da ficha subiram ~1 tom (o alvo e o RENDER bater com a arte, nao o codigo
   bater com o hex). Os originais estao anotados ao lado de cada cor.

   Custo MEDIDO (montada em node com o three r147 do CDN, nao chutada):
     2 draw calls | 256 tri no corpo + 4 no brilho = 260 tri.
   Medido tambem: merge nao devolveu null (atributos position/normal/color
   nos dois merges), bbox = 4.20 x 3.60 x 4.20 com minimo Y = 0, e raio de
   frente conferido por raycast — vindo de +Z o olho pega miolo 1.565,
   vidro 1.560, macaneta 1.750, moldura 1.640, folha 1.580, parede 1.500
   (nenhuma camada engolida pela parede). */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCasa01 = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'casa01';

  /* ---------- paleta (hex da ficha entre parenteses) ---------- */
  var PAREDE = 0x9ed0f7,          /* (0x8fc7f1) corpo da casa */
      PAREDE_CLARA = 0xb4e0ff,    /* (0xa7d9ff) quinas e chamine */
      TELHADO = 0x76a296,         /* (0x6d978d) agua do telhado */
      TELHADO_ESCURO = 0x577f9e,  /* (0x4e6f90) beiral, base e tampa */
      MOLDURA = 0xdcebfa,         /* (0xd4e6f8) molduras e peitoril */
      PORTA = 0x3c5165,           /* (0x2e3f50) folha da porta */
      DOURADO = 0xf2b94b,         /* (0xf2b94b) macaneta */
      VIDRO = 0xffe49a,           /* (0xffe49a) vidro aceso */
      VIDRO_QUENTE = 0xffb83e;    /* (0xffb83e) miolo mais quente */

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.12 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var minY = 1e9, maxY = -1e9, i, y;
    for (i = 0; i < n; i++) { y = pos.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (i = 0; i < n; i++) {
      var f = (pos.getY(i) - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.15));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  /* Moldura VAZADA: retangulo com furo retangular, extrudada de z=0 a z=prof.
     Os dois retangulos sao montados com os 4 cantos na mao de proposito —
     getPoints() em contorno reto devolveria ponto demais e estouraria o
     orcamento de triangulo por nada. */
  function molduraVazada(lFora, aFora, lDentro, aDentro, prof) {
    var forma = new T.Shape();
    var wf = lFora / 2, hf = aFora / 2;
    forma.moveTo(-wf, -hf); forma.lineTo(wf, -hf); forma.lineTo(wf, hf); forma.lineTo(-wf, hf);
    forma.closePath();
    var wd = lDentro / 2, hd = aDentro / 2;
    var furo = new T.Path();
    furo.moveTo(-wd, -hd); furo.lineTo(-wd, hd); furo.lineTo(wd, hd); furo.lineTo(wd, -hd);
    furo.closePath();
    forma.holes.push(furo);
    return new T.ExtrudeGeometry(forma, { depth: prof, bevelEnabled: false });
  }

  var corpo = [], brilho = [];

  /* ---------- medidas mestras ---------- */
  var LARG = 3.00, PROF = 3.00, ALT_PAREDE = 2.20, ALT_TOTAL = 3.60;
  var MX = LARG / 2, MZ = PROF / 2;      /* 1.50: meia largura = face da parede */
  var ALT_BASE = 0.18;                   /* embasamento (a casa "senta" nele) */
  var R_TELHADO = 2.60;                  /* meio-lado 1.838 => beiral 0.338 */
  var ALT_TELHADO = ALT_TOTAL - ALT_PAREDE;   /* 1.40 */

  /* ---------- sombra pintada (regra do cenario claro) ----------
     2.10 fica entre a parede (1.50) e a ponta do beiral (2.72 na diagonal):
     um disco do tamanho do telhado inteiro leria como mancha, nao sombra. */
  corpo.push(pinta(new T.CircleGeometry(2.10, 12).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  /* ---------- embasamento ----------
     3.30 de lado (meio-lado 1.65) para envolver as quinas (1.63) e ainda
     ficar ATRAS da moldura da porta (1.64) — senao ele tapava a soleira. */
  var base = new T.BoxGeometry(3.30, ALT_BASE, 3.30);
  base.translate(0, ALT_BASE / 2, 0);
  corpo.push(pinta(base, TELHADO_ESCURO, 0.12));

  /* ---------- parede (o volume da ficha) ---------- */
  var parede = new T.BoxGeometry(LARG, ALT_PAREDE, PROF);
  parede.translate(0, ALT_PAREDE / 2, 0);
  corpo.push(pinta(parede, PAREDE, 0.05));   /* fBase baixo: parede alta escurece rapido */

  /* ---------- quinas claras (4 pilaretes) ----------
     Quebram o borrao de parede lisa e trazem o tom claro da ficha.
     0.26 de lado centrado na quina: sobra 0.13 para fora (x/z = 1.63). */
  var QUINAS = [[-MX, -MZ], [MX, -MZ], [-MX, MZ], [MX, MZ]];
  for (var q = 0; q < QUINAS.length; q++) {
    var pil = new T.BoxGeometry(0.26, ALT_PAREDE, 0.26);
    pil.translate(QUINAS[q][0], ALT_PAREDE / 2, QUINAS[q][1]);
    corpo.push(pinta(pil, PAREDE_CLARA, 0.06));
  }

  /* ---------- tabua do beiral (a aba embaixo do telhado) ----------
     Tronco de 4 lados: 2.58 em cima (encosta na base do cone) e 2.72
     embaixo, criando a aba de 0.085 alem do plano do telhado. */
  var beiral = new T.CylinderGeometry(2.58, 2.72, 0.16, 4).rotateY(Math.PI / 4);
  beiral.translate(0, ALT_PAREDE + 0.02, 0);   /* de y=2.14 a 2.30 */
  corpo.push(pinta(beiral, TELHADO_ESCURO, 0.14));

  /* ---------- telhado piramidal de 4 aguas ----------
     rotateY(45) alinha as FACES aos eixos (sem ele os CANTOS e que ficam
     nos eixos e a agua nao encara a frente da casa). */
  var telhado = new T.ConeGeometry(R_TELHADO, ALT_TELHADO, 4).rotateY(Math.PI / 4);
  telhado.translate(0, ALT_PAREDE + ALT_TELHADO / 2, 0);   /* base 2.20, ponta 3.60 */
  corpo.push(pinta(telhado, TELHADO, 0.10));

  /* ---------- chamine ----------
     Em (-0.78, -0.62): naquele ponto a agua esta em y = 3.60 - (1.40/1.838)
     * 0.78 = 3.01, e o canto mais longe da caixa (0.98) em 2.85. Comecando
     em 2.55 ela atravessa o telhado inteiro, sem buraco na junta. */
  var CH_X = -0.78, CH_Z = -0.62, CH_Y0 = 2.55, CH_ALT = 0.79;
  var chamine = new T.BoxGeometry(0.40, CH_ALT, 0.40);
  chamine.translate(CH_X, CH_Y0 + CH_ALT / 2, CH_Z);
  corpo.push(pinta(chamine, PAREDE_CLARA, 0.12));
  var tampa = new T.BoxGeometry(0.52, 0.14, 0.52);
  tampa.translate(CH_X, CH_Y0 + CH_ALT + 0.07, CH_Z);       /* topo 3.48 < 3.60 */
  corpo.push(pinta(tampa, TELHADO_ESCURO, 0.10));

  /* ---------- PORTA (frente, +Z) ----------
     Vao 0.80 x 1.48 comecando no topo do embasamento (y=0.18): a casa senta
     no embasamento e a porta abre em cima dele, com o degrau na frente. */
  var P_LARG = 0.80, P_ALT = 1.48, P_BORDA = 0.12;
  var P_CY = ALT_BASE + P_ALT / 2 + P_BORDA;               /* 1.04 */
  /* camada 1: folha da porta, 0.08 a frente da parede (1.50 -> 1.58) */
  var folha = new T.BoxGeometry(P_LARG, P_ALT, 0.08);
  folha.translate(0, P_CY, MZ + 0.04);
  corpo.push(pinta(folha, PORTA, 0.14));
  /* camada 2: moldura vazada, mais saliente (1.50 -> 1.64) */
  var molPorta = molduraVazada(P_LARG + 2 * P_BORDA, P_ALT + 2 * P_BORDA, P_LARG, P_ALT, 0.14);
  molPorta.translate(0, P_CY, MZ);
  corpo.push(pinta(molPorta, MOLDURA, 0.10));
  /* macaneta: bolinha dourada em 1.69, na frente ate da moldura */
  var macaneta = new T.IcosahedronGeometry(0.07, 0);
  macaneta.translate(0.26, P_CY - 0.04, MZ + 0.19);
  corpo.push(pinta(macaneta, DOURADO, 0.10));
  /* degrau: mesma altura do embasamento, avanca ate z=2.00 */
  var degrau = new T.BoxGeometry(1.20, ALT_BASE, 0.40);
  degrau.translate(0, ALT_BASE / 2, MZ + 0.30);
  corpo.push(pinta(degrau, MOLDURA, 0.16));

  /* ---------- JANELA ACESA (frente, +Z) ----------
     Vao 0.58 quadrado com moldura de 0.10 (externo 0.78). Centro em x=0.95:
     de 0.56 a 1.34, ou seja entre a moldura da porta (termina em 0.52) e a
     quina clara (comeca em 1.37) — na parede de 3.00 nao cabe mais que isso.
     Topo em 1.89, alinhado com o topo da porta (1.90). */
  var J_VAO = 0.58, J_BORDA = 0.10, J_X = 0.95, J_CY = 1.50;
  var molJan = molduraVazada(J_VAO + 2 * J_BORDA, J_VAO + 2 * J_BORDA, J_VAO, J_VAO, 0.14);
  molJan.translate(J_X, J_CY, MZ);
  corpo.push(pinta(molJan, MOLDURA, 0.10));
  /* peitoril: sai 0.16 da parede, um tico mais que a moldura */
  var peitoril = new T.BoxGeometry(0.92, 0.09, 0.16);
  peitoril.translate(J_X, J_CY - J_VAO / 2 - J_BORDA - 0.045, MZ + 0.08);
  corpo.push(pinta(peitoril, MOLDURA, 0.16));
  /* vidro: 0.06 a frente da parede e 0.08 ATRAS da testa da moldura — e esse
     degrau que faz o olho ler "recuo" sem furo de verdade na parede */
  var vidro = new T.PlaneGeometry(J_VAO, J_VAO);
  vidro.translate(J_X, J_CY, MZ + 0.06);
  brilho.push(pinta(vidro, VIDRO, 0.08));
  var miolo = new T.PlaneGeometry(J_VAO * 0.52, J_VAO * 0.52);
  miolo.translate(J_X, J_CY - 0.01, MZ + 0.065);
  brilho.push(pinta(miolo, VIDRO_QUENTE, 0.06));

  /* ---------- 2 draw calls ---------- */
  var malhaCorpo = new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malhaCorpo.name = 'casa01_corpo';
  grupo.add(malhaCorpo);

  var malhaBrilho = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
  malhaBrilho.name = 'casa01_brilho';
  grupo.add(malhaBrilho);

  /* ---------- ANCHORS (onde o Composer encaixa vizinho) ----------
     Laterais e fundo ficam 0.10 fora da parede. A FRENTE fica em 2.05, na
     frente do degrau (que vai ate 2.00) — quem encostar la nao entra nele. */
  var anchors = new T.Group();
  anchors.name = 'Anchors';
  var DEF = [
    { nome: 'TopAnchor',   x: 0,          y: ALT_TOTAL, z: 0 },
    { nome: 'FrontAnchor', x: 0,          y: 0,         z: 2.05 },
    { nome: 'LeftAnchor',  x: -(MX + 0.10), y: 0,       z: 0 },
    { nome: 'RightAnchor', x: MX + 0.10,  y: 0,         z: 0 },
    { nome: 'BackAnchor',  x: 0,          y: 0,         z: -(MZ + 0.10) }
  ];
  var mapa = {};
  for (var k = 0; k < DEF.length; k++) {
    var o = new T.Object3D();
    o.name = DEF[k].nome;
    o.position.set(DEF[k].x, DEF[k].y, DEF[k].z);
    anchors.add(o);
    mapa[DEF[k].nome] = o;
  }
  grupo.add(anchors);
  grupo.userData.anchors = mapa;

  /* meia largura + 0.15 */
  ctx.COLISORES.push({ x: 0, z: 0, raio: MX + 0.15 });

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 2, tri: 260 }
  };
};

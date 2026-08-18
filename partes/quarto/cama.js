/* cama — a CAMA INFANTIL do quarto da menina (item 1 da ficha de referencia).

   Cama baixa de madeira mel, cabeceira alta (-Z) e peseira baixa (+Z),
   colchao branco-creme, colcha rosa cobrindo dois tercos (do pe ate o
   meio), dois travesseiros achatados encostados na cabeceira e a
   almofada-ESTRELA dourada apoiada na frente deles.

   Pivo: centro da base, Y = 0 e o chao.
   Volume: 1.15 (X) x 2.05 (Z) x 0.93 (topo da ponta da estrela);
   estrado em 0.45, cabeceira ate 0.86, peseira ate 0.68.

   Contrato de partes/CONTRATO.md respeitado: sem luz, sem sombra de
   engine, sem textura, sem Standard, sem acento em identificador.
   TUDO numa malha so — Lambert + cor por vertice + flatShading.
   1 draw call, 508 triangulos (medidos em three r147 no node).

   Decisoes de forma (o que faz a peca ter charme e nao ser caixa+pano):
   - cabeceira/peseira sao retangulos EXTRUDADOS com raio de quina maior
     em cima que embaixo — o topo fica macio e a base assenta nos pes;
   - o colchao, a colcha e os travesseiros tambem sao retangulos
     arredondados (nada de aresta viva em tecido);
   - a colcha e mais LARGA que o estrado e desce ate 0.42, entao ela
     cai por cima das laterais de madeira, como na arte;
   - a dobra do lencol na boca da colcha e um cilindro deitado de 8
     lados no rosa claro — e o detalhe que da leitura de "cama feita";
   - os travesseiros tem yaw e inclinacao diferentes e se sobrepoem;
   - a estrela e uma Shape de 10 pontos extrudada, deitada 0.50 rad
     para tras: encosta no travesseiro e a ponta de cima aparece acima
     da cabeceira — le como estrela de qualquer angulo. */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};
window.QUARTO_MOVEIS.cama = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'cama';

  /* ---------- paleta ----------
     Regra paga do rig de 2 luzes: face vertical recebe ~55% da luz.
     Os hex da ficha foram subidos ~1 tom nas pecas de face vertical
     grande (madeira, colcha, estrela); tecido claro ficou como veio. */
  var MADEIRA      = 0xe6b378;  /* ficha #D9A66C, +1 tom: painel e vertical */
  var MADEIRA_LAT  = 0xd9a66c;  /* ficha pura nas laterais do estrado */
  var MADEIRA_PE   = 0xc79257;  /* pes: um tom abaixo, assentam a peca */
  var COLCHAO      = 0xfff6ee;
  var COLCHA       = 0xf4809f;  /* ficha #F2789F, um tico acima */
  var COLCHA_TOPO  = 0xff9bb8;
  var TRAV_ROSA    = 0xffc2d8;
  var TRAV_CREME   = 0xfff3f0;
  var ESTRELA      = 0xffd96b;  /* ficha #FFD35A, +1 tom: a face dela e vertical */
  var CHAO_SOMBRA  = 0xf4edde;  /* creme do mundo, escurecido no uso */

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

  /* ---------- ferramentas de forma ----------
     retangulo de quinas arredondadas, raio separado em cima (rT) e
     embaixo (rB) — e o que tira a cara de caixa de toda a peca. */
  function retArred(l, h, rT, rB) {
    var hx = l / 2, hy = h / 2, s = new T.Shape();
    s.moveTo(-hx + rB, -hy);
    s.lineTo(hx - rB, -hy);
    s.quadraticCurveTo(hx, -hy, hx, -hy + rB);
    s.lineTo(hx, hy - rT);
    s.quadraticCurveTo(hx, hy, hx - rT, hy);
    s.lineTo(-hx + rT, hy);
    s.quadraticCurveTo(-hx, hy, -hx, hy - rT);
    s.lineTo(-hx, -hy + rB);
    s.quadraticCurveTo(-hx, -hy, -hx + rB, -hy);
    s.closePath();
    return s;
  }

  /* laje deitada: X = largura, Z = comprimento, Y de 0 ate alt */
  function placa(larg, comp, alt, raio, segs) {
    var g = new T.ExtrudeGeometry(retArred(larg, comp, raio, raio),
      { depth: alt, bevelEnabled: false, curveSegments: segs || 3, steps: 1 });
    g.rotateX(-Math.PI / 2);
    return g;
  }

  /* painel em pe: X = largura, Y de 0 ate alt, Z = espessura centrada */
  function painel(larg, alt, esp, rT, rB, segs) {
    var g = new T.ExtrudeGeometry(retArred(larg, alt, rT, rB),
      { depth: esp, bevelEnabled: false, curveSegments: segs || 2, steps: 1 });
    g.translate(0, alt / 2, -esp / 2);
    return g;
  }

  function bloco(sx, sy, sz, x, y, z) {
    return new T.BoxGeometry(sx, sy, sz).translate(x, y, z);
  }

  /* afina a BASE de uma peca de tecido (aplicar antes de mover/girar,
     enquanto a peca esta centrada no eixo): o bloco vira pano macio.
     eZ = false afina so em X, para o tecido nao encolher no comprimento. */
  function afina(geo, fator, eZ) {
    var pos = geo.attributes.position, n = pos.count, i, y, minY = 1e9, maxY = -1e9;
    for (i = 0; i < n; i++) { y = pos.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (i = 0; i < n; i++) {
      var s = 1 - fator * (1 - (pos.getY(i) - minY) / faixa);
      pos.setX(i, pos.getX(i) * s);
      if (eZ) pos.setZ(i, pos.getZ(i) * s);
    }
    pos.needsUpdate = true;
    return geo;
  }

  /* ---------- medidas mestras ---------- */
  var MEIO_X   = 0.575;   /* largura 1.15 */
  var MEIO_Z   = 1.025;   /* comprimento 2.05 */
  var ESTRADO  = 0.45;    /* topo do estrado */
  var ESP_PAIN = 0.09;    /* espessura de cabeceira/peseira */
  var Z_CAB    = -(MEIO_Z - ESP_PAIN / 2);   /* cabeceira em -Z */
  var Z_PES    =  (MEIO_Z - ESP_PAIN / 2);   /* peseira em +Z */
  var TOPO_COL = ESTRADO + 0.14;             /* topo do colchao = 0.59 */

  var pecas = [];

  /* ---------- sombra pintada (regra do cenario claro) ----------
     disco/retangulo escuro no chao: a engine nao faz sombra, entao ela
     e pintada. fBase 0 porque a peca e plana (sem faixa de Y). */
  pecas.push(pinta(
    new T.ShapeGeometry(retArred(1.02, 1.86, 0.26, 0.26), 3)
      .rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(CHAO_SOMBRA).lerp(CINZA, 0.34), 0.0));

  /* ---------- 4 pes (blocos curtos, recuados das bordas) ---------- */
  var PE_H = 0.17;
  var pesX = [-0.455, 0.455], pesZ = [-0.925, 0.925], ix, iz;
  for (ix = 0; ix < 2; ix++) {
    for (iz = 0; iz < 2; iz++) {
      pecas.push(pinta(bloco(0.15, PE_H, 0.16, pesX[ix], PE_H / 2, pesZ[iz]), MADEIRA_PE, 0.16));
    }
  }

  /* ---------- cabeceira (-Z, alta) e peseira (+Z, baixa) ----------
     quina de cima bem redonda, de baixo quase reta: e o perfil da arte. */
  var CAB_Y0 = 0.13, CAB_H = 0.73;   /* topo 0.86 */
  var g = painel(1.15, CAB_H, ESP_PAIN, 0.22, 0.05, 2);
  g.translate(0, CAB_Y0, Z_CAB);
  pecas.push(pinta(g, MADEIRA, 0.10));

  var PES_Y0 = 0.13, PES_H = 0.55;   /* topo 0.68 */
  g = painel(1.15, PES_H, ESP_PAIN, 0.19, 0.05, 2);
  g.translate(0, PES_Y0, Z_PES);
  pecas.push(pinta(g, MADEIRA, 0.10));

  /* ---------- laterais do estrado + tabua ----------
     as laterais sobem 0.06 acima do estrado: o colchao encaixa dentro,
     nao fica "pousado". */
  var COMP_INT = 1.88;
  pecas.push(pinta(bloco(0.06, 0.20, COMP_INT, -0.545, 0.41, 0), MADEIRA_LAT, 0.14));
  pecas.push(pinta(bloco(0.06, 0.20, COMP_INT, 0.545, 0.41, 0), MADEIRA_LAT, 0.14));
  pecas.push(pinta(bloco(1.04, 0.05, 1.86, 0, ESTRADO - 0.025, 0), MADEIRA_LAT, 0.10));

  /* ---------- colchao branco-creme ---------- */
  g = afina(placa(1.02, 1.85, 0.14, 0.09, 3), 0.05, true);
  g.translate(0, ESTRADO, 0);
  pecas.push(pinta(g, COLCHAO, 0.06));

  /* ---------- colcha rosa: dois tercos, do pe (+Z) ate o meio ----------
     mais larga que o estrado (0.595 > 0.575) e descendo ate 0.42:
     cai por cima da madeira, como na referencia. */
  var COLCHA_Z0 = -0.31, COLCHA_Z1 = 0.93;
  var COLCHA_C = COLCHA_Z1 - COLCHA_Z0, COLCHA_CZ = (COLCHA_Z0 + COLCHA_Z1) / 2;
  g = afina(placa(1.19, COLCHA_C, 0.21, 0.10, 3), 0.055, false);
  g.translate(0, 0.42, COLCHA_CZ);
  pecas.push(pinta(g, COLCHA, 0.07));

  /* topo mais claro, levemente recuado (a borda rosa forte aparece) */
  pecas.push(pinta(
    new T.ShapeGeometry(retArred(1.13, COLCHA_C - 0.06, 0.09, 0.09), 3)
      .rotateX(-Math.PI / 2).translate(0, 0.634, COLCHA_CZ),
    COLCHA_TOPO, 0.0));

  /* dobra do lencol na boca da colcha (cilindro deitado, 8 lados) */
  g = new T.CylinderGeometry(0.055, 0.055, 1.21, 8);
  g.rotateZ(Math.PI / 2);
  g.translate(0, 0.645, COLCHA_Z0 + 0.01);
  pecas.push(pinta(g, COLCHA_TOPO, 0.10));

  /* ---------- travesseiros (achatados, quase almofadas) ----------
     inclinados para tras: a borda de tras sobe e encosta na cabeceira,
     a da frente afunda no colchao. Yaw diferente em cada um + sobreposicao. */
  function travesseiro(cor, x, z, yaw) {
    var t = afina(placa(0.52, 0.30, 0.135, 0.13, 3), 0.12, true);
    t.rotateX(0.14);
    t.rotateY(yaw);
    t.translate(x, TOPO_COL - 0.012, z);
    pecas.push(pinta(t, cor, 0.09));
  }
  travesseiro(TRAV_ROSA, -0.22, -0.75, 0.14);
  travesseiro(TRAV_CREME, 0.22, -0.78, -0.11);

  /* ---------- almofada ESTRELA dourada (o charme da peca) ---------- */
  function estrelaShape(rOut, rIn, pontas) {
    var s = new T.Shape(), i, ang, r;
    for (i = 0; i < pontas * 2; i++) {
      ang = Math.PI / 2 + (i * Math.PI) / pontas;   /* comeca na ponta de cima */
      r = (i % 2 === 0) ? rOut : rIn;
      if (i === 0) s.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else s.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    s.closePath();
    return s;
  }
  var EST_D = 0.09;
  g = new T.ExtrudeGeometry(estrelaShape(0.19, 0.084, 5),
    { depth: EST_D, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -EST_D / 2);
  g.rotateZ(0.14);            /* torto de proposito, cara de almofada jogada */
  g.rotateX(-0.50);           /* deitada para tras, encostando no travesseiro */
  g.translate(-0.03, TOPO_COL + 0.155, -0.50);
  pecas.push(pinta(g, ESTRELA, 0.12));

  /* ---------- 1 draw call ---------- */
  var geo = BGU.mergeBufferGeometries(pecas);
  var malha = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'cama_malha';
  grupo.add(malha);

  return {
    grupo: grupo,
    custo: { dc: 1, tri: geo ? geo.attributes.position.count / 3 : 0 }
  };
};

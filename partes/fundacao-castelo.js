/* parteFundacaoCastelo — CASTLE-01: a FUNDACAO/plataforma do Castelo da
   Sarinha (ficha CASTLE-01 oficial do Ivan, 16/08, com vistas frontal/
   lateral/traseira/superior + diagrama de anchors + paleta).

   Prototipo de vitrine (padrao das fichas): NAO carregada no jogo — o
   lugar do castelo no mundo e decisao do Ivan. REGRA DA FICHA (secao 40):
   dimensoes principais CONGELADAS; as proximas pecas se adaptam.

   MEDIDAS-MAE (CONGELADAS):
     LARGURA 12 x PROFUNDIDADE 8 - octogono esticado, face plana p/ +Z
     alturas: base 0.72 + faixa 0.10 + terraco 0.16 (topo 0.98) +
     plataforma superior 0.34 (topo Y_TOPO=1.32, onde TUDO assenta)

   ANCHORS (Object3D nomeados + userData.anchors; ajustados na 3a rodada
   ao DIAGRAMA da ficha oficial: torres nos cantos ±4.0, principal mais
   atras z-2.0, asas mais a frente ±2.7/1.35):
     StairsAnchor (0, 0.45, 5.05) - frente do patamar
     FacadeAnchor (0, 1.32, 1.20)
     MainTowerAnchor (0, 1.32, -2.00)
     LeftTowerAnchor / RightTowerAnchor (±4.0, 1.32, -0.50)
     LeftWingAnchor / RightWingAnchor (±2.7, 1.32, 1.35)
   Debug: grupo.userData.debugAnchors(true/false).

   3a RODADA (ficha oficial com vistas):
   - base virou 16 BLOCOS trapezoidais chanfrados seguindo as 8 faces
     (2 por face, juntas escuras via cinta de fundo #5D3E7D), roxo MEDIO
     #8060A2 com tons ciclando — as vistas frontal/detalhes mostram
     pedra segmentada, nao cinta lisa;
   - LAJES agora cobrem o piso inteiro (vista superior = pavimento
     completo): placas maiores quase se tocando, o chao mais escuro
     embaixo vira o rejunte; a faixa livre na borda vira a "moldura";
   - landing SEM muretas: a ficha oficial mostra so um patamar
     meio-octogono baixo (as muretas eram da 1a imagem, sairam).
   Custo sobe para ~600 tri (a ficha simples pedia <500; o pavimento
   completo + blocos da ficha oficial justificam — segue leve).

   Da ficha IGNOREI (CONTRATO.md): MeshStandardMaterial, castShadow —
   1 malha Lambert mesclada (cor por vertice, flatShading) + debug
   escondido. Sombra = disco pintado. 1 draw call. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteFundacaoCastelo = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'CastleFoundation';

  /* ---------- paleta da ficha oficial ---------- */
  /* roxos COMPENSADOS ~1.5 tom acima da paleta: face vertical neste rig
     de 2 luzes recebe ~55% de luz — pigmento fiel renderizava escuro
     demais (mesma licao do vaso: o resultado se compara com a IMAGEM) */
  var ROXO_ESCURO = 0x8a68b0, ROXO_MEDIO = 0x9d7fc0, PISO = 0xe8d3e6,
      PISO_CLARO = 0xf0dceb, DOURADO = 0xf2b94b, JUNTA = 0x6b4a92;

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.14 : fBase);
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
  /* camada octogonal esticada: Cylinder 8 lados, face plana p/ +Z, escala X/Z */
  function camada(meiaLarg, meiaProf, rTopo, rBase, alt, y0) {
    var g = new T.CylinderGeometry(rTopo, rBase, alt, 8);
    g.rotateY(Math.PI / 8);
    g.scale(meiaLarg, 1, meiaProf);
    g.translate(0, y0 + alt / 2, 0);
    return g;
  }
  /* caixa CHANFRADA (topo mais estreito): cilindro 4 lados girado PI/4 */
  function bloco(wTopo, wBase, dTopo, dBase, alt) {
    var g = new T.CylinderGeometry(1, 1, alt, 4);
    g.rotateY(Math.PI / 4);
    var pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var f = pos.getY(i) > 0 ? 1 : 0;
      var w = (f ? wTopo : wBase) / Math.SQRT2, d = (f ? dTopo : dBase) / Math.SQRT2;
      pos.setX(i, pos.getX(i) * w);
      pos.setZ(i, pos.getZ(i) * d);
    }
    return g;
  }

  /* ---------- MEDIDAS-MAE ----------
     4a rodada (16/08, pedido do Ivan olhando o castelo montado): a base
     CRESCEU de 12x8 para 14.5x10. Motivo medido: as torres laterais
     vivem em x=±5.05 e com raio ~1.0 iam ate 6.05 — a meia-largura
     antiga era 6.0, entao o PE da torre ficava pendurado fora da borda.
     Agora meia-largura 7.25 da 1.2 de folga alem da torre.
     (o "congelamento" da ficha vale contra deriva minha, nao contra
     correcao do dono do projeto olhando o conjunto montado.) */
  var LARGURA = 14.5, PROFUNDIDADE = 10;
  var ML = LARGURA / 2, MP = PROFUNDIDADE / 2;
  var ALT_BASE = 0.72, ALT_FAIXA = 0.10, ALT_TERRACO = 0.16, ALT_SUP = 0.34;
  var Y_FAIXA = ALT_BASE, Y_TERRACO = Y_FAIXA + ALT_FAIXA;      /* 0.82 */
  var Y_SUP = Y_TERRACO + ALT_TERRACO;                          /* 0.98 */
  var Y_TOPO = Y_SUP + ALT_SUP;                                 /* 1.32 - tudo assenta aqui */
  var IN = Math.cos(Math.PI / 8);
  var Z_FRENTE = MP * IN;                                       /* 3.70 - face frontal da base */

  var corpo = [];

  /* ---------- sombra pintada (elipse acompanhando a planta) ---------- */
  corpo.push(pinta(new T.CircleGeometry(1, 20).rotateX(-Math.PI / 2)
    .scale(ML + 0.7, 1, MP + 0.7).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  /* ---------- LowerBase: 16 BLOCOS de pedra + cinta de junta escura ----------
     A ficha oficial (vistas frontal/detalhes) mostra a base como pedra
     SEGMENTADA. 2 blocos por face do octogono, com folga entre eles; a
     cinta escura atras aparece nas folgas e vira a junta. */
  corpo.push(pinta(camada(ML, MP, 0.965, 0.995, ALT_BASE, 0.02), JUNTA, 0.10));
  (function blocosBase() {
    var TONS = [0.00, 0.06, 0.02, 0.09, 0.01, 0.07, 0.04, 0.10];
    /* vertices do octogono escalado (geometria da camada: x=sin, z=cos) */
    var verts = [];
    for (var k = 0; k < 8; k++) {
      var th = k * Math.PI / 4 + Math.PI / 8;
      verts.push({ x: Math.sin(th) * ML, z: Math.cos(th) * MP });
    }
    var qual = 0;
    for (var f2 = 0; f2 < 8; f2++) {
      var A = verts[f2], B = verts[(f2 + 1) % 8];
      var fx = B.x - A.x, fz = B.z - A.z;
      var compFace = Math.hypot(fx, fz);
      var rotBloco = Math.atan2(fx, fz) + Math.PI / 2;   /* +Z local = normal p/ fora */
      for (var j = 0; j < 2; j++) {
        var t = j === 0 ? 0.26 : 0.74;
        var cx2 = A.x + fx * t, cz2 = A.z + fz * t;
        /* levemente para dentro: a face externa do bloco fecha a silhueta */
        var nl = Math.hypot(cx2, cz2);
        var recuo = 0.05 + (qual % 3) * 0.015;            /* tremida de profundidade */
        var px2 = cx2 * (1 - recuo / nl), pz2 = cz2 * (1 - recuo / nl);
        var w = compFace * 0.455;
        var g2 = bloco(w * 0.93, w, 0.40, 0.52, ALT_BASE);
        g2.rotateY(rotBloco);
        g2.translate(px2, ALT_BASE / 2, pz2);
        corpo.push(pinta(g2, new T.Color(ROXO_MEDIO).lerp(new T.Color(ROXO_ESCURO), TONS[qual % 8]), 0.05));
        qual++;
      }
    }
  })();

  /* ---------- GoldTrim ---------- */
  corpo.push(pinta(camada(ML, MP, 1.015, 1.015, ALT_FAIXA, Y_FAIXA), DOURADO, 0.10));

  /* ---------- MainTerrace: laje clara, beicinho chanfrado sobre a faixa ---------- */
  corpo.push(pinta(camada(ML, MP, 0.985, 1.035, ALT_TERRACO, Y_TERRACO), PISO, 0.08));

  /* ---------- UpperPlatform: 2o nivel 84% x 76% — topo em PISO (o chao
     escuro vira o rejunte por baixo das placas claras) ---------- */
  corpo.push(pinta(camada(ML * 0.84, MP * 0.76, 0.955, 1.0, ALT_SUP, Y_SUP), PISO, 0.06));

  /* ---------- FrontLanding: patamar meio-octogono SEM muretas ----------
     (a ficha oficial removeu as muretas da 1a imagem: e so um pad baixo
     que interrompe a base na frente; a escadaria encaixa nele depois) */
  var ALT_PAD = 0.45;
  corpo.push(pinta(camada(1.55, 1.2, 0.94, 1.0, ALT_PAD, 0).translate(0, 0, Z_FRENTE + 0.35), PISO, 0.10));

  /* ---------- LAJES: pavimento COMPLETO (vista superior da ficha) ----------
     placas grandes quase se tocando; o piso mais escuro embaixo e o
     rejunte; a faixa livre na borda vira a moldura do pavimento. */
  (function lajes() {
    var semente = 20260816;
    function rnd() {
      semente = (semente * 1664525 + 1013904223) % 4294967296;
      return semente / 4294967296;
    }
    var TONS_SUP = [0xf5e4f2, 0xefdcec, 0xf2e0ee];
    var TONS_TER = [0xf0dcea, 0xe9d3e6, 0xecd7e8];
    var qual = 0;
    function laje(x, z, r, ySup, tons) {
      var g = new T.CircleGeometry(r, 5 + (qual % 3));
      qual++;
      g.rotateZ(rnd() * Math.PI * 2);
      g.rotateX(-Math.PI / 2);
      g.scale(1, 1, 0.82 + rnd() * 0.22);
      g.rotateY(rnd() * Math.PI * 2);
      g.translate(x, ySup + 0.006, z);
      corpo.push(pinta(g, tons[qual % tons.length], 0.02));
    }
    /* plataforma superior: grade cerrada (placas ~se tocam = pavimento).
       limites derivados de ML/MP para acompanhar a base quando ela cresce */
    var RX_SUP = ML * 0.84 * 0.86, RZ_SUP = MP * 0.76 * 0.86;
    for (var z = -RZ_SUP + 0.35; z <= RZ_SUP - 0.2; z += 1.02) {
      var alterna = (Math.round(z * 10) % 2) ? 0.5 : 0;
      for (var x = -RX_SUP + 0.3 + alterna; x <= RX_SUP - 0.2; x += 1.04) {
        var jx = x + (rnd() - 0.5) * 0.22, jz = z + (rnd() - 0.5) * 0.18;
        if ((jx * jx) / (RX_SUP * RX_SUP) + (jz * jz) / (RZ_SUP * RZ_SUP) > 1) continue;
        laje(jx, jz, 0.55 + rnd() * 0.14, Y_TOPO, TONS_SUP);
      }
    }
    /* anel do terraco exposto */
    var N_ANEL = 22;
    for (var i = 0; i < N_ANEL; i++) {
      var a = (i / N_ANEL) * Math.PI * 2 + 0.1;
      var ax = Math.cos(a) * ML * 0.855, az = Math.sin(a) * MP * 0.83;
      if (az > MP * 0.62 && Math.abs(ax) < 1.9) continue;   /* zona do landing */
      laje(ax + (rnd() - 0.5) * 0.12, az + (rnd() - 0.5) * 0.1, 0.40 + rnd() * 0.1, Y_SUP, TONS_TER);
    }
    /* patamar frontal */
    laje(-0.5, 4.05, 0.4, ALT_PAD, TONS_TER);
    laje(0.55, 4.3, 0.36, ALT_PAD, TONS_TER);
    laje(0.05, 3.55, 0.32, ALT_PAD, TONS_TER);
  })();

  /* ---------- 1 draw call ---------- */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true })));

  /* ---------- ANCHORS (diagrama da ficha oficial) ---------- */
  var anchors = new T.Group();
  anchors.name = 'Anchors';
  var DEF_ANCHORS = [
    /* PE da escada, no CHAO e FORA do patamar (o patamar termina em
       Z_FRENTE+1.55=5.25; a escada externa tem 1.38 de profundidade) */
    /* PE da escada CASTLE-02 (6 degraus x 0.52 = 3.12 de profundidade):
       topo encosta na borda frontal da plataforma superior */
    { nome: 'StairsAnchor', x: 0, y: 0, z: MP * 0.76 * IN + 3.12, cor: 0xff5555 },
    { nome: 'FacadeAnchor', x: 0, y: Y_TOPO, z: 1.20, cor: 0x55ff88 },
    { nome: 'MainTowerAnchor', x: 0, y: Y_TOPO, z: -2.00, cor: 0x5588ff },
    { nome: 'LeftTowerAnchor', x: -4.0, y: Y_TOPO, z: -0.50, cor: 0xffd166 },
    { nome: 'RightTowerAnchor', x: 4.0, y: Y_TOPO, z: -0.50, cor: 0xffd166 },
    { nome: 'LeftWingAnchor', x: -2.7, y: Y_TOPO, z: 1.35, cor: 0xff9fc8 },
    { nome: 'RightWingAnchor', x: 2.7, y: Y_TOPO, z: 1.35, cor: 0xff9fc8 }
  ];
  var mapaAnchors = {};
  for (var a2 = 0; a2 < DEF_ANCHORS.length; a2++) {
    var d = DEF_ANCHORS[a2];
    var o = new T.Object3D();
    o.name = d.nome;
    o.position.set(d.x, d.y, d.z);
    anchors.add(o);
    mapaAnchors[d.nome] = o;
  }
  grupo.add(anchors);
  grupo.userData.anchors = mapaAnchors;

  /* ---------- debug dos anchors: bolinhas, escondidas ---------- */
  (function marcadores() {
    var pecas = [];
    for (var i3 = 0; i3 < DEF_ANCHORS.length; i3++) {
      var d2 = DEF_ANCHORS[i3];
      var esf = new T.SphereGeometry(0.16, 6, 4);
      esf = esf.toNonIndexed();
      esf.deleteAttribute('uv');
      var n3 = esf.attributes.position.count, a3 = new Float32Array(n3 * 3);
      var c3 = new T.Color(d2.cor);
      for (var k3 = 0; k3 < n3; k3++) { a3[k3 * 3] = c3.r; a3[k3 * 3 + 1] = c3.g; a3[k3 * 3 + 2] = c3.b; }
      esf.setAttribute('color', new T.BufferAttribute(a3, 3));
      esf.translate(d2.x, d2.y + 0.16, d2.z);
      pecas.push(esf);
    }
    var m = new T.Mesh(BGU.mergeBufferGeometries(pecas),
      new T.MeshBasicMaterial({ vertexColors: true }));
    m.name = 'AnchorMarkers';
    m.visible = false;
    grupo.add(m);
    grupo.userData.debugAnchors = function (liga) { m.visible = !!liga; };
  })();

  /* SEM colisor na plataforma: ela e ANDAVEL (o host resolve a altura por
     alturaChao, ver castelo-mundo.js). O placeholder de raio 6.2 que
     existia aqui barrava a crianca a 6m do castelo — ela nunca subiria
     a escada. Quem bloqueia sao as PAREDES (nucleo/asas/torres). */

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 1, tri: 0 }   /* medir na vitrine (marcadores escondidos nao desenham) */
  };
};

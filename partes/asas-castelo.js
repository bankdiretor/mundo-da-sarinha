/* parteAsasCastelo — CASTLE-04: as ASAS (muros de ligacao) do Castelo da
   Sarinha. Sao os dois muros baixos que ligam o NUCLEO (CASTLE-03) as
   TORRES LATERAIS — a peca que ALARGA o castelo (pedido do Ivan 16/08).

   POR QUE ELA EXISTE: medido no castelo montado, entre a borda do nucleo
   (x=2.60) e a borda da torre em ±4.0 (x=3.02) sobravam 42cm — as pecas
   quase se encostavam e o castelo lia estreito. A asa ocupa esse vao COM
   arquitetura e empurra as torres para ±5.05 (a fundacao tem meia-largura
   6.0; torre r~0.98 escala 0.85 => 5.05+0.98=6.03, encosta na borda: e a
   silhueta certa, torre no canto da plataforma).

   A peca desenha as DUAS asas simetricas (padrao de parteVasosMundo: uma
   peca, varias instancias) e EXPOE os anchors do fim de cada asa:
     LeftTowerAnchor / RightTowerAnchor (±5.05, 0, -0.50)
   Assim vale a cadeia da ficha (secao 54): CORE -> ASA -> TORRE.
   O Composer encaixa a asa no FacadeAnchor da fundacao (mesmo ponto do
   nucleo, x=0) e as torres nos anchors DELA, nao nos da fundacao.

   Altura 2.30 (bem abaixo dos 3.30 da fachada, como manda a silhueta:
   nucleo alto > asa baixa > torre alta). Ameias rosa no topo + janelinha
   arqueada acesa no meio + base trim, tudo na paleta do CASTLE-03.

   2 draw calls (corpo Lambert + vidros MeshBasic), ~430 tri. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteAsasCastelo = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'SarinhaCastleWings';

  /* paleta identica ao nucleo (compensada p/ face vertical) */
  var PAREDE = 0xfff8ee, PILAR = 0xfaeee2, BASE_TRIM = 0xeeddE2,
      ROSA = 0xe875ad, LILAS = 0xa07adc, ROXO = 0x8654c6,
      DOURADO = 0xf2b94b, VIDRO = 0xffe49a, VIDRO_QUENTE = 0xffb83e;

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.10 : fBase);
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

  var corpo = [], brilho = [];

  /* ---------- MEDIDAS ---------- */
  var X0 = 2.52;                 /* comeca colado na fachada do nucleo (larg 5.2) */
  var X_TORRE = 5.05;            /* EIXO da torre lateral (onde ela encaixa) */
  /* o muro para ANTES da torre: ela tem fundacao de raio ~1.0 (escala
     0.88) e estava ENTRANDO no muro (visto pelo Ivan no close). Deixo
     0.10 de sobreposicao so para fechar a junta, sem penetrar. */
  var X1 = X_TORRE - 0.90;       /* 4.15 - fim do muro */
  var COMP = X1 - X0;            /* 1.63 */
  var CX = (X0 + X1) / 2;
  var ALT = 2.30, PROF = 1.70, Z_CENTRO = -0.35;
  var ALT_BASE = 0.24;

  function asa(lado) {           /* lado = -1 (esquerda) ou +1 (direita) */
    var sx = lado;
    /* base trim */
    var bt = new T.BoxGeometry(COMP + 0.14, ALT_BASE, PROF + 0.14);
    bt.translate(sx * CX, ALT_BASE / 2, Z_CENTRO);
    corpo.push(pinta(bt, BASE_TRIM, 0.14));
    /* muro */
    var muro = new T.BoxGeometry(COMP, ALT - ALT_BASE, PROF);
    muro.translate(sx * CX, ALT_BASE + (ALT - ALT_BASE) / 2, Z_CENTRO);
    corpo.push(pinta(muro, PAREDE, 0.05));
    /* cinta rosa no topo (acompanha a do nucleo) */
    var cinta = new T.BoxGeometry(COMP + 0.06, 0.20, PROF + 0.08);
    cinta.translate(sx * CX, ALT - 0.04, Z_CENTRO);
    corpo.push(pinta(cinta, ROSA, 0.12));
    /* ameias rosa: 3 dentes por asa (espacados pelo comprimento real) */
    for (var d = 0; d < 3; d++) {
      var fx = X0 + COMP * (0.18 + d * 0.32);
      var dente = new T.BoxGeometry(0.42, 0.40, 0.56);
      dente.translate(sx * fx, ALT + 0.20, Z_CENTRO + 0.35);
      corpo.push(pinta(dente, ROSA, 0.10));
    }
    /* pilarzinho lilas na junta com a torre (arremate) */
    var junta = new T.BoxGeometry(0.40, ALT + 0.30, PROF * 0.75);
    junta.translate(sx * (X1 - 0.14), (ALT + 0.30) / 2, Z_CENTRO);
    corpo.push(pinta(junta, PILAR, 0.08));
    var juntaTopo = new T.BoxGeometry(0.50, 0.16, PROF * 0.85);
    juntaTopo.translate(sx * (X1 - 0.14), ALT + 0.38, Z_CENTRO);
    corpo.push(pinta(juntaTopo, LILAS, 0.10));

    /* DUAS janelinhas arqueadas acesas por asa (a arte mostra 2) */
    var jw = 0.34, jh = 0.78, BICO = jh * 0.30, zParede = Z_CENTRO + PROF / 2;
    function forma(dw, dh) {
      var s = new T.Shape();
      var w2 = jw / 2 + dw, hh = jh + dh, bico = BICO + dh * 0.6;
      s.moveTo(-w2, 0); s.lineTo(w2, 0); s.lineTo(w2, hh - bico);
      s.lineTo(0, hh); s.lineTo(-w2, hh - bico); s.closePath();
      return s;
    }
    var FRACOES = [0.30, 0.68];
    for (var jn = 0; jn < FRACOES.length; jn++) {
      var jx2 = sx * (X0 + COMP * FRACOES[jn]);
      var molde = new T.ExtrudeGeometry(forma(0.07, 0.07), { depth: 0.09, bevelEnabled: false });
      molde.translate(jx2, 0.82, zParede - 0.04);
      corpo.push(pinta(molde, DOURADO, 0.10));
      var vidro = new T.ShapeGeometry(forma(0, 0)).toNonIndexed();
      vidro.deleteAttribute('uv');
      var pos = vidro.attributes.position, n = pos.count, a = new Float32Array(n * 3);
      var cQ = new T.Color(VIDRO), cB = new T.Color(VIDRO_QUENTE);
      for (var i = 0; i < n; i++) {
        var fy = pos.getY(i) / jh;
        var c = cB.clone().lerp(cQ, 0.35 + 0.65 * (1 - Math.abs(fy - 0.42) / 0.6));
        a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
      }
      vidro.setAttribute('color', new T.BufferAttribute(a, 3));
      vidro.translate(jx2, 0.82, zParede + 0.055);
      brilho.push(vidro);
    }
  }
  asa(-1);
  asa(1);

  /* ---------- 2 draw calls ---------- */
  var mc = new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mc.name = 'WingsBody';
  grupo.add(mc);
  var mb = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
  mb.name = 'WingsGlow';
  grupo.add(mb);

  /* ---------- ANCHORS: onde as TORRES encaixam (cadeia CORE->ASA->TORRE) ---------- */
  var anchors = new T.Group();
  anchors.name = 'Anchors';
  var DEF = [
    { nome: 'LeftTowerAnchor', x: -X_TORRE, y: 0, z: -0.50, cor: 0xffd166 },
    { nome: 'RightTowerAnchor', x: X_TORRE, y: 0, z: -0.50, cor: 0xffd166 }
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

  ctx.COLISORES.push({ x: -CX, z: Z_CENTRO, raio: 1.5 });
  ctx.COLISORES.push({ x: CX, z: Z_CENTRO, raio: 1.5 });

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 2, tri: 0 }
  };
};

/* parteEscadaCastelo — CASTLE-02: ESCADARIA PRINCIPAL + TERRACO DE
   ENTRADA do Castelo da Sarinha (ficha oficial do Ivan, 16/08, com
   vistas frontal/lateral/superior + diagrama de anchors + paleta).

   Refeita da v1 improvisada. A ficha manda: largura 5.6, profundidade
   4.6, 6 degraus, muros laterais macicos em rampa, ATERRAMENTO FRONTAL
   de lajes no chao e — a assinatura — 4 PILARES COM ESTRELA dourada
   (2 no pe, 2 no topo).

   ALTURA: a ficha pede 1.6 total; os DEGRAUS aqui vencem 1.32 exatos
   porque e a altura da plataforma da fundacao (CASTLE-01, congelada —
   regra §40: as pecas se adaptam a ela). Os pilares e muros e que
   alcancam ~1.6-1.9, batendo com a silhueta da ficha.

   PIVO no pe da escada (Y=0, primeiro degrau), +Z = frente: o
   aterramento fica em +Z e os degraus sobem para -Z. Encaixa no
   StairsAnchor da fundacao.

   ANCHORS (diagrama da ficha): TopCenter (terraco da fundacao),
   LeftSide / RightSide (muros laterais), FrontLanding (caminho externo).

   Da ficha IGNOREI (CONTRATO.md): MeshStandardMaterial, castShadow —
   2 malhas: corpo Lambert mesclado + estrelas MeshBasic (brilham como
   as do resto do castelo). 2 draw calls, ~700 tri. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteEscadaCastelo = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'SarinhaCastleStairs';

  /* ---------- paleta da ficha (compensada p/ face vertical) ---------- */
  /* #E6CFEB piso / #C39AD6 degraus / #8B6FB1 muros, compensados ~1 tom
     acima (face vertical recebe ~55% da luz neste rig de 2 luzes) */
  var PISO = 0xf0dcf2, DEGRAU = 0xd4aee4, MURO_C = 0x9f83c4,
      DOURADO = 0xf2b94b, ESTRELA_OURO = 0xffd35a;

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
  function chapa(geo, cor) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var n = geo.attributes.position.count, a = new Float32Array(n * 3), c = new T.Color(cor);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  var corpo = [], brilho = [];

  /* ---------- MEDIDAS DA FICHA ---------- */
  var LARG_TOTAL = 5.6, MURO_L = 0.78;
  var LARG_DEG = LARG_TOTAL - MURO_L * 2;      /* 4.04 - o vao dos degraus */
  var N_DEG = 6, ALT_TOTAL = 1.32;             /* casa com a plataforma da fundacao */
  var H_DEG = ALT_TOTAL / N_DEG, P_DEG = 0.52;
  var PROF_DEG = N_DEG * P_DEG;                /* 3.12 */
  var X_MURO = LARG_DEG / 2 + MURO_L / 2;      /* 2.41 */

  /* ---------- 6 DEGRAUS (macicos: cada um sobe do chao ate sua altura) ---------- */
  for (var i = 0; i < N_DEG; i++) {
    var h = H_DEG * (i + 1);
    var d = new T.BoxGeometry(LARG_DEG, h, P_DEG + 0.02);
    d.translate(0, h / 2, -i * P_DEG - P_DEG / 2);
    corpo.push(pinta(d, DEGRAU, 0.06));
  }

  /* ---------- MUROS LATERAIS macicos em rampa (vista lateral da ficha) ----------
     bloco cheio + cunha inclinada por cima acompanhando os degraus */
  (function muros() {
    /* v1 girou um paralelepipedo sobre um bloco reto e a rampa VOOU (uma
       ponta enterrada, outra no ar). Aqui o muro e macico e ACOMPANHA
       cada degrau: bloco por degrau, altura = degrau + parapeito. De
       longe le como a rampa lisa da vista lateral da ficha. */
    var PARAPEITO = 0.46;
    for (var lado = -1; lado <= 1; lado += 2) {
      for (var s = 0; s < N_DEG; s++) {
        var h = H_DEG * (s + 1) + PARAPEITO;
        var b = new T.BoxGeometry(MURO_L, h, P_DEG + 0.02);
        b.translate(lado * X_MURO, h / 2, -s * P_DEG - P_DEG / 2);
        corpo.push(pinta(b, MURO_C, 0.08));
      }
    }
  })();

  /* ---------- 4 PILARES COM ESTRELA (a assinatura da ficha) ---------- */
  function pilar(x, z, alt) {
    /* fuste lilas com leve afunilamento */
    var fu = new T.CylinderGeometry(0.30 * Math.SQRT2 * 0.5, 0.36 * Math.SQRT2 * 0.5, alt, 4);
    fu.rotateY(Math.PI / 4);
    fu.translate(x, alt / 2, z);
    corpo.push(pinta(fu, MURO_C, 0.08));
    /* colar dourado */
    var col = new T.CylinderGeometry(0.40 * Math.SQRT2 * 0.5, 0.40 * Math.SQRT2 * 0.5, 0.12, 4);
    col.rotateY(Math.PI / 4);
    col.translate(x, alt + 0.06, z);
    corpo.push(pinta(col, DOURADO, 0.08));
    /* capitel piramidal dourado */
    var cap = new T.ConeGeometry(0.30 * Math.SQRT2 * 0.5, 0.30, 4);
    cap.rotateY(Math.PI / 4);
    cap.translate(x, alt + 0.27, z);
    corpo.push(pinta(cap, DOURADO, 0.06));
    /* estrelinha dourada no topo (brilha) */
    var forma = new T.Shape();
    for (var s = 0; s < 10; s++) {
      var ang = Math.PI / 2 + (s / 10) * Math.PI * 2;
      var r = (s % 2 === 0) ? 0.17 : 0.07;
      var px = Math.cos(ang) * r, py = Math.sin(ang) * r;
      if (s === 0) forma.moveTo(px, py); else forma.lineTo(px, py);
    }
    forma.closePath();
    var est = new T.ExtrudeGeometry(forma, {
      depth: 0.05, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 1
    });
    est.translate(x, alt + 0.58, z - 0.025);
    brilho.push(chapa(est, ESTRELA_OURO));
  }
  /* pilares SOBRE o muro: o de baixo na ponta da frente, o de cima no
     ultimo degrau (alturas casam com o muro em cada ponto) */
  pilar(-X_MURO, 0.16, 0.90);               /* pe, esquerda */
  pilar(X_MURO, 0.16, 0.90);                /* pe, direita */
  pilar(-X_MURO, -PROF_DEG + 0.26, 1.86);   /* topo, esquerda */
  pilar(X_MURO, -PROF_DEG + 0.26, 1.86);    /* topo, direita */

  /* ---------- ATERRAMENTO FRONTAL: piso octogonal de lajes no chao ---------- */
  var PROF_ATER = 1.48;
  (function aterramento() {
    var g = new T.CylinderGeometry(1, 1, 0.14, 8);
    g.rotateY(Math.PI / 8);
    g.scale(LARG_TOTAL * 0.46, 1, PROF_ATER * 0.92);
    g.translate(0, 0.07, PROF_ATER * 0.72);
    corpo.push(pinta(g, PISO, 0.06));
    /* lajes hexagonais por cima (a "pedra" da ficha), semente fixa */
    var semente = 20260817;
    function rnd() { semente = (semente * 1664525 + 1013904223) % 4294967296; return semente / 4294967296; }
    var TONS = [0xf6e6f6, 0xecd8ee, 0xf2e0f2];
    var LINHAS = [0.30, 0.78, 1.26];
    var qual = 0;
    for (var li = 0; li < LINHAS.length; li++) {
      var z = LINHAS[li];
      var x0 = (li % 2) ? -1.75 : -2.10;
      for (var x = x0; x <= 2.2; x += 0.72) {
        var jx = x + (rnd() - 0.5) * 0.16, jz = z + (rnd() - 0.5) * 0.14;
        if ((jx * jx) / (2.35 * 2.35) + ((jz - 1.05) * (jz - 1.05)) / (1.25 * 1.25) > 1) continue;
        var laje = new T.CircleGeometry(0.36 + rnd() * 0.08, 6);
        laje.rotateZ(rnd() * Math.PI * 2);
        laje.rotateX(-Math.PI / 2);
        laje.translate(jx, 0.148, jz);
        corpo.push(pinta(laje, TONS[qual++ % TONS.length], 0.02));
      }
    }
  })();

  /* ---------- 2 draw calls ---------- */
  var mc = new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mc.name = 'StairsBody';
  grupo.add(mc);
  var mb = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
  mb.name = 'StairsStars';
  grupo.add(mb);

  /* ---------- ANCHORS (diagrama da ficha) ---------- */
  var anchors = new T.Group();
  anchors.name = 'Anchors';
  var DEF = [
    { nome: 'TopCenter', x: 0, y: ALT_TOTAL, z: -PROF_DEG, cor: 0xffd166 },
    { nome: 'LeftSide', x: -X_MURO, y: ALT_TOTAL, z: -PROF_DEG + 0.2, cor: 0xff7ab8 },
    { nome: 'RightSide', x: X_MURO, y: ALT_TOTAL, z: -PROF_DEG + 0.2, cor: 0xff7ab8 },
    { nome: 'FrontLanding', x: 0, y: 0.15, z: PROF_ATER * 1.25, cor: 0x5cc8ff }
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

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 2, tri: 0 },
    /* profundidade dos degraus: o Composer usa p/ alinhar com a fundacao */
    profDegraus: PROF_DEG
  };
};

/* parteNucleoCastelo — CASTLE-03: o NUCLEO CENTRAL do Castelo da Sarinha
   (ficha do Ivan, 16/08): fachada creme + portal roxo com arco dourado +
   2 coracoes + frontao rosa com a ESTRELA HEROI + ameias + torre central
   octogonal atras (mais alta) + telhado roxo + estrela do topo.

   Prototipo de vitrine. NAO recria torres laterais/fundacao/escada
   (secao 59). Encaixa na fundacao pelo FacadeAnchor (CASTLE-01).

   HELPERS COMPARTILHADOS (secao 50): a janela pontiaguda, o anel de
   ameias e a estrela sao a MESMA receita de partes/torre-castelo.js —
   copiadas aqui como funcoes locais (o mundo nao tem modulos ES; cada
   parte e um arquivo classico auto-contido). Mesma geometria, mesma
   paleta: o castelo inteiro le como um so sistema visual.

   MEDIDAS (secao 5): fachada 5.2 larg x 2.6 prof x 3.30 alt;
   torre atras (z -0.55) sobe ate 7.05; telhado ate 9.05; estrela 9.55.
   Y_TOPO_FACHADA=3.30 e onde as ASAS encaixam.

   ANCHORS (secao 42): FoundationAnchor (0,0,0), StairsAnchor (frente da
   porta, +Z), LeftWingAnchor / RightWingAnchor (laterais, altura da
   fachada), BackAnchor (atras). userData.debugAnchors(true) liga bolinhas.

   Da ficha IGNOREI (CONTRATO.md): MeshStandardMaterial, emissive,
   castShadow, 40-80 meshes — aqui sao 2 malhas: corpo Lambert mesclado
   (cor por vertice, flatShading) + brilho MeshBasic (vidros das janelas,
   estrelas, coracoes). Sombra = disco pintado.
   2 draw calls, ~1.1k tri (meta da ficha <2500). */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteNucleoCastelo = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'SarinhaCastleCentralCore';

  /* ---------- paleta oficial (secao 40) ---------- */
  /* parede compensada ~1 tom acima da paleta: face vertical neste rig de
     2 luzes recebe ~55% (mesma licao dos roxos da fundacao) */
  var PAREDE = 0xfff8ee, PAREDE2 = 0xe8d2c6, PILAR = 0xfaeee2, BASE_TRIM = 0xeeddE2,
      ROSA = 0xe875ad, ROSA_CLARO = 0xf29ac1, LILAS = 0xa07adc,
      ROXO = 0x8654c6, ROXO_ESCURO = 0x6540b6, DOURADO = 0xf2b94b,
      ESTRELA_OURO = 0xffd35a, VIDRO = 0xffe49a, VIDRO_QUENTE = 0xffb83e,
      CORACAO = 0xff8fb5;

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
  function chapa(geo, cor) {   /* cor uniforme, p/ pecas do brilho */
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var n = geo.attributes.position.count, a = new Float32Array(n * 3), c = new T.Color(cor);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }
  /* octogono com FACE olhando +Z (mesma receita da torre lateral) */
  function octo(rTopo, rBase, alt, y0) {
    var g = new T.CylinderGeometry(rTopo, rBase, alt, 8);
    g.rotateY(Math.PI / 8);
    g.translate(0, y0 + alt / 2, 0);
    return g;
  }
  var IN = Math.cos(Math.PI / 8);

  var corpo = [], brilho = [];

  /* ---------- MEDIDAS ---------- */
  var LARG = 5.2, PROF = 2.6, ML = LARG / 2, MP = PROF / 2;
  var ALT_BASE = 0.26;
  var ALT_FACHADA = 3.30;              /* topo da fachada = onde as asas encaixam */
  var R_TORRE = 1.15;
  var Y_TORRE0 = 2.40, ALT_TORRE = 4.65;
  var Y_TORRE_TOPO = Y_TORRE0 + ALT_TORRE;      /* 7.05 */
  var Z_TORRE = -0.55;
  var ALT_TELHADO = 2.00;

  /* ---------- sombra pintada ---------- */
  corpo.push(pinta(new T.CircleGeometry(1, 16).rotateX(-Math.PI / 2)
    .scale(ML + 0.5, 1, MP + 0.6).translate(0, 0.012, Z_TORRE * 0.4),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  /* =========================================================================
     LOWER FACADE
     ========================================================================= */
  /* BaseTrim */
  var baseT = new T.BoxGeometry(LARG + 0.18, ALT_BASE, PROF + 0.16);
  baseT.translate(0, ALT_BASE / 2, 0);
  corpo.push(pinta(baseT, BASE_TRIM, 0.16));

  /* MainBody */
  var corpoF = new T.BoxGeometry(LARG, ALT_FACHADA - ALT_BASE, PROF);
  corpoF.translate(0, ALT_BASE + (ALT_FACHADA - ALT_BASE) / 2, 0);
  corpo.push(pinta(corpoF, PAREDE, 0.04));   /* parede alta: degrade forte escurece (licao do poste) */

  /* CornerPillars: 2 na frente, com capitel lilas (imagem: cantos lilas) */
  for (var lp = -1; lp <= 1; lp += 2) {
    var pil = new T.BoxGeometry(0.52, ALT_FACHADA - ALT_BASE - 0.35, 0.52);
    pil.translate(lp * (ML - 0.10), ALT_BASE + (ALT_FACHADA - ALT_BASE - 0.35) / 2, MP - 0.10);
    corpo.push(pinta(pil, PILAR, 0.12));
    /* capitel = mini-torre lilas do canto (na imagem sao blocos altos,
       nao um friso: eles emolduram as ameias rosa entre eles) */
    var cap = new T.BoxGeometry(0.70, 0.62, 0.70);
    cap.translate(lp * (ML - 0.12), ALT_FACHADA + 0.05, MP - 0.14);
    corpo.push(pinta(cap, LILAS, 0.10));
    var capTopo = new T.BoxGeometry(0.80, 0.16, 0.80);
    capTopo.translate(lp * (ML - 0.12), ALT_FACHADA + 0.44, MP - 0.14);
    corpo.push(pinta(capTopo, ROXO, 0.08));
  }

  /* AMEIAS da fachada (topo da parede, imagem: dentes rosa nos dois lados) */
  (function ameiasFachada() {
    var XS = [-2.05, -1.55, 1.55, 2.05];
    for (var i = 0; i < XS.length; i++) {
      var d = new T.BoxGeometry(0.40, 0.42, 0.52);
      d.translate(XS[i], ALT_FACHADA + 0.21, MP - 0.30);
      corpo.push(pinta(d, ROSA, 0.10));
    }
    /* cinta rosa por baixo dos dentes, atravessando a frente */
    var cinta = new T.BoxGeometry(LARG + 0.06, 0.22, 0.30);
    cinta.translate(0, ALT_FACHADA - 0.06, MP - 0.05);
    corpo.push(pinta(cinta, ROSA, 0.14));
  })();

  /* =========================================================================
     MAIN PORTAL (recuado 0.12 na parede frontal)
     ========================================================================= */
  var Z_PAREDE = MP;
  (function portal() {
    var PW = 1.28, PH = 2.05, ARCO = 0.62;
    function formaArco(dw, dh) {
      var s = new T.Shape();
      var w2 = PW / 2 + dw, h = PH + dh, arc = ARCO + dh * 0.5;
      s.moveTo(-w2, 0);
      s.lineTo(w2, 0);
      s.lineTo(w2, h - arc);
      s.quadraticCurveTo(w2 * 0.92, h - arc * 0.25, 0, h);
      s.quadraticCurveTo(-w2 * 0.92, h - arc * 0.25, -w2, h - arc);
      s.closePath();
      return s;
    }
    /* moldura dourada grossa e VAZADA: Shape externa com o vao como HOLE.
       (v1 usou chapa cheia na frente da porta e tapou o portal inteiro) */
    var molde = formaArco(0.22, 0.22);
    molde.holes.push(new T.Path(formaArco(0.02, 0.02).getPoints(24)));
    /* SEM CSG: o "recuo" e feito por CAMADAS na frente da parede —
       moldura mais saliente (ate +0.16) e porta atras dela (ate +0.06).
       v2 punha a porta DENTRO da parede e so aparecia o creme. */
    var mold = new T.ExtrudeGeometry(molde, { depth: 0.18, bevelEnabled: false, curveSegments: 3 });
    mold.translate(0, ALT_BASE - 0.02, Z_PAREDE - 0.02);
    corpo.push(pinta(mold, DOURADO, 0.10));
    /* vao roxo escuro no fundo (sombra do portal) */
    var vao = new T.ExtrudeGeometry(formaArco(0.02, 0.02), { depth: 0.06, bevelEnabled: false, curveSegments: 3 });
    vao.translate(0, ALT_BASE, Z_PAREDE - 0.03);
    corpo.push(pinta(vao, ROXO_ESCURO, 0.30));
    /* duas folhas de porta roxas com junta central, recuadas 0.10 da moldura */
    for (var f = -1; f <= 1; f += 2) {
      var folha = new T.ExtrudeGeometry(formaArco(-0.03, -0.03), { depth: 0.05, bevelEnabled: false, curveSegments: 3 });
      var pos = folha.attributes.position;
      for (var i = 0; i < pos.count; i++) {          /* corta na metade: meia folha */
        var x = pos.getX(i);
        if (f < 0 && x > -0.03) pos.setX(i, -0.03);
        if (f > 0 && x < 0.03) pos.setX(i, 0.03);
      }
      folha.translate(0, ALT_BASE + 0.02, Z_PAREDE + 0.01);
      corpo.push(pinta(folha, ROXO, 0.10));
      /* macaneta dourada */
      var mac = new T.SphereGeometry(0.055, 5, 4);
      mac.translate(f * 0.17, ALT_BASE + 0.95, Z_PAREDE + 0.08);
      corpo.push(pinta(mac, DOURADO, 0.06));
    }
    /* Threshold (soleira) */
    var sol = new T.BoxGeometry(PW + 0.60, 0.12, 0.34);
    sol.translate(0, 0.06, Z_PAREDE + 0.10);
    corpo.push(pinta(sol, BASE_TRIM, 0.10));
  })();

  /* =========================================================================
     HEART ORNAMENTS (secao 15-17): moldura dourada + coracao rosa que BRILHA
     ========================================================================= */
  function formaCoracao() {
    var s = new T.Shape();
    s.moveTo(0, -0.42);
    s.bezierCurveTo(0.52, 0.02, 0.34, 0.46, 0, 0.24);
    s.bezierCurveTo(-0.34, 0.46, -0.52, 0.02, 0, -0.42);
    return s;
  }
  (function coracoes() {
    for (var lado = -1; lado <= 1; lado += 2) {
      var cx = lado * 1.62, cy = 1.62;
      /* moldura: losango dourado atras */
      var mold = new T.CylinderGeometry(0.44, 0.44, 0.10, 4);
      mold.rotateX(Math.PI / 2);
      mold.translate(cx, cy, Z_PAREDE - 0.02);
      corpo.push(pinta(mold, DOURADO, 0.10));
      /* coracao rosa (brilho suave) */
      var cor = new T.ExtrudeGeometry(formaCoracao(), { depth: 0.08, bevelEnabled: false, curveSegments: 3 });
      cor.scale(0.62, 0.62, 1);
      cor.translate(cx, cy + 0.02, Z_PAREDE + 0.03);
      brilho.push(chapa(cor, CORACAO));
    }
  })();

  /* =========================================================================
     CENTRAL GABLE (frontao) + HERO STAR
     ========================================================================= */
  function formaEstrela(R1, R2) {
    var s = new T.Shape();
    for (var i = 0; i < 10; i++) {
      var ang = Math.PI / 2 + (i / 10) * Math.PI * 2;
      var r = (i % 2 === 0) ? R1 : R2;
      var x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }
  var Y_GABLE = ALT_FACHADA - 0.30;
  (function frontao() {
    /* tri central: prisma triangular apontando +Z. GW quase a fachada
       inteira (a imagem mostra o frontao dominando a frente) */
    var GW = 4.3, GH = 1.35;
    var tri = new T.Shape();
    tri.moveTo(-GW / 2, 0); tri.lineTo(GW / 2, 0); tri.lineTo(0, GH); tri.closePath();
    var g = new T.ExtrudeGeometry(tri, { depth: 0.62, bevelEnabled: false });
    g.translate(0, Y_GABLE, MP - 0.68);
    corpo.push(pinta(g, PAREDE, 0.05));
    /* telhadinho rosa: 2 rampas finas sobre as arestas */
    for (var lado = -1; lado <= 1; lado += 2) {
      var comp = Math.hypot(GW / 2, GH) + 0.14;
      var ramp = new T.BoxGeometry(comp, 0.18, 0.80);
      ramp.rotateZ(lado * -Math.atan2(GH, GW / 2));
      ramp.translate(lado * GW / 4, Y_GABLE + GH / 2 + 0.03, MP - 0.66);
      corpo.push(pinta(ramp, ROSA, 0.10));
    }
    /* HERO STAR: grande, dourada, brilha (assinatura da marca) */
    var est = new T.ExtrudeGeometry(formaEstrela(0.58, 0.24), {
      depth: 0.10, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 1
    });
    est.translate(0, Y_GABLE + 0.50, MP - 0.02);
    brilho.push(chapa(est, ESTRELA_OURO));
  })();

  /* =========================================================================
     CENTRAL TOWER (atras, mais alta) — helpers da torre lateral
     ========================================================================= */
  var torreG = [];
  torreG.push(pinta(octo(R_TORRE, R_TORRE * 1.02, ALT_TORRE, Y_TORRE0), PAREDE, 0.04));

  /* anel de ameias rosa da torre (mesma receita da torre lateral) */
  var Y_AMEIA_T = Y_TORRE0 + 1.15;
  torreG.push(pinta(octo(R_TORRE * 1.15, R_TORRE * 1.15, 0.26, Y_AMEIA_T), ROSA, 0.14));
  for (var b = 0; b < 8; b++) {
    var angB = b * Math.PI / 4;
    var bloco2 = new T.BoxGeometry(0.40, 0.40, 0.30);
    bloco2.rotateY(angB);
    bloco2.translate(Math.sin(angB) * R_TORRE * 1.02, Y_AMEIA_T + 0.26 + 0.19, Math.cos(angB) * R_TORRE * 1.02);
    torreG.push(pinta(bloco2, ROSA, 0.10));
  }

  /* faixa rosa+dourada no alto da torre + telhado + estrela */
  var Y_FAIXA_T = Y_TORRE_TOPO - 0.24;
  torreG.push(pinta(octo(R_TORRE * 1.10, R_TORRE * 1.06, 0.24, Y_FAIXA_T), DOURADO, 0.12));
  var telh = new T.ConeGeometry(R_TORRE * 1.30, ALT_TELHADO, 8);
  telh.rotateY(Math.PI / 8);
  telh.translate(0, Y_TORRE_TOPO + ALT_TELHADO / 2 - 0.02, 0);
  torreG.push(pinta(telh, ROXO, 0.16));

  for (var t = 0; t < torreG.length; t++) torreG[t].translate(0, 0, Z_TORRE);
  corpo = corpo.concat(torreG);

  /* janelas pontiagudas da torre (helper da torre lateral: inradius!) */
  function janela(ang, yBase, w, h, rCorpo, zOff) {
    var parede = rCorpo * IN;
    var BICO = h * 0.28, ESP = 0.075;
    function forma(dw, dh) {
      var s = new T.Shape();
      var w2 = w / 2 + dw, hh = h + dh, bico = BICO + dh * 0.6;
      s.moveTo(-w2, 0); s.lineTo(w2, 0); s.lineTo(w2, hh - bico);
      s.lineTo(0, hh); s.lineTo(-w2, hh - bico); s.closePath();
      return s;
    }
    var molde = new T.ExtrudeGeometry(forma(ESP, ESP), { depth: 0.10, bevelEnabled: false });
    molde.translate(0, yBase, parede - 0.05);
    molde.rotateY(ang);
    molde.translate(0, 0, zOff);
    corpo.push(pinta(molde, DOURADO, 0.10));
    var vidro = new T.ShapeGeometry(forma(0, 0));
    vidro = vidro.toNonIndexed();
    vidro.deleteAttribute('uv');
    var pos = vidro.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var cQ = new T.Color(VIDRO), cB = new T.Color(VIDRO_QUENTE);
    for (var i = 0; i < n; i++) {
      var fy = pos.getY(i) / h;
      var c = cB.clone().lerp(cQ, 0.35 + 0.65 * (1 - Math.abs(fy - 0.42) / 0.6));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    vidro.setAttribute('color', new T.BufferAttribute(a, 3));
    vidro.translate(0, yBase, parede + 0.055);
    vidro.rotateY(ang);
    vidro.translate(0, 0, zOff);
    brilho.push(vidro);
  }
  janela(0, Y_TORRE0 + 2.05, 0.62, 1.35, R_TORRE, Z_TORRE);          /* frontal grande */
  janela(Math.PI / 2, Y_TORRE0 + 2.25, 0.40, 0.95, R_TORRE, Z_TORRE);
  janela(-Math.PI / 2, Y_TORRE0 + 2.25, 0.40, 0.95, R_TORRE, Z_TORRE);

  /* TOP STAR */
  var Y_TOP_STAR = Y_TORRE_TOPO + ALT_TELHADO + 0.28;
  (function estrelaTopo() {
    var mastro = new T.CylinderGeometry(0.05, 0.06, 0.34, 6);
    mastro.translate(0, Y_TORRE_TOPO + ALT_TELHADO - 0.10, Z_TORRE);
    corpo.push(pinta(mastro, DOURADO, 0.10));
    var est = new T.ExtrudeGeometry(formaEstrela(0.30, 0.124), {
      depth: 0.06, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.045, bevelSegments: 1
    });
    est.translate(0, Y_TOP_STAR, Z_TORRE);
    brilho.push(chapa(est, ESTRELA_OURO));
  })();

  /* ---------- 2 draw calls ---------- */
  var malhaCorpo = new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malhaCorpo.name = 'CentralCoreBody';
  grupo.add(malhaCorpo);
  var malhaBrilho = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
  malhaBrilho.name = 'CentralCoreGlow';
  grupo.add(malhaBrilho);

  /* ---------- ANCHORS (secao 42) ---------- */
  var anchors = new T.Group();
  anchors.name = 'Anchors';
  var DEF_ANCHORS = [
    { nome: 'FoundationAnchor', x: 0, y: 0, z: 0, cor: 0xffffff },
    { nome: 'StairsAnchor', x: 0, y: 0, z: MP + 0.28, cor: 0xff5555 },
    { nome: 'LeftWingAnchor', x: -ML, y: ALT_FACHADA - 0.60, z: 0, cor: 0xff9fc8 },
    { nome: 'RightWingAnchor', x: ML, y: ALT_FACHADA - 0.60, z: 0, cor: 0xff9fc8 },
    { nome: 'BackAnchor', x: 0, y: 0, z: -MP - 0.20, cor: 0x5588ff }
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

  (function marcadores() {
    var pecas = [];
    for (var i3 = 0; i3 < DEF_ANCHORS.length; i3++) {
      var d2 = DEF_ANCHORS[i3];
      var esf = new T.SphereGeometry(0.14, 6, 4).toNonIndexed();
      esf.deleteAttribute('uv');
      var n3 = esf.attributes.position.count, a3 = new Float32Array(n3 * 3);
      var c3 = new T.Color(d2.cor);
      for (var k3 = 0; k3 < n3; k3++) { a3[k3 * 3] = c3.r; a3[k3 * 3 + 1] = c3.g; a3[k3 * 3 + 2] = c3.b; }
      esf.setAttribute('color', new T.BufferAttribute(a3, 3));
      esf.translate(d2.x, d2.y + 0.14, d2.z);
      pecas.push(esf);
    }
    var m = new T.Mesh(BGU.mergeBufferGeometries(pecas),
      new T.MeshBasicMaterial({ vertexColors: true }));
    m.name = 'AnchorMarkers';
    m.visible = false;
    grupo.add(m);
    grupo.userData.debugAnchors = function (liga) { m.visible = !!liga; };
  })();

  ctx.COLISORES.push({ x: 0, z: 0, raio: 2.6 });

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 2, tri: 0 }   /* medir na vitrine */
  };
};

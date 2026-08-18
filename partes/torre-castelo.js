/* parteTorreCastelo — a TORRE LATERAL do Castelo da Sarinha (ficha do
   Ivan, 16/08: fundacao + corpo octogonal creme + janelas pontiagudas
   douradas acesas + anel de ameias rosa + corpo superior + faixa dourada
   + telhado conico roxo + mastro + bandeira lilas + estrela dourada).

   Prototipo de vitrine (padrao das fichas anteriores): 1 torre na origem,
   NAO carregada no jogo — e a 1a PECA DE LEGO do castelo futuro
   (createSarinhaCastle da secao 49 vira uma peca propria quando o Ivan
   decidir onde o castelo mora). Alturas ficam em constantes nomeadas
   (ALT_*) para a composicao poder variar depois.

   Da ficha segui: modulos e ordem (secao 2), dimensoes (~7.5 + estrela),
   paleta da secao 45, pivo no chao, frente +Z (janela grande), 8 lados,
   ameias em zigue-zague, telhado 8 gomos, estrela da familia Sarinha
   (mesma receita da luminaria).
   Da ficha IGNOREI (CONTRATO.md): MeshStandardMaterial, emissive,
   castShadow, 30-60 meshes — aqui sao 2 malhas: corpo Lambert mesclado
   (cor por vertice) + brilho MeshBasic (vidro das janelas + estrela,
   "acende" sem luz nova). Sombra = disco pintado.

   GEOMETRIA QUE A FICHA NAO CONTA: janela em parede octogonal senta no
   INRADIUS (r*cos(PI/8)), nao no raio do canto — senao flutua na frente
   da face. Cilindros girados PI/8 para a FACE (nao o canto) olhar +Z. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteTorreCastelo = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'torreCastelo';

  /* ---------- paleta da ficha (secao 45) ---------- */
  var PAREDE = 0xf6e4d2, FUNDACAO = 0xe9d3c0, AMEIA = 0xe875ad, AMEIA_BASE = 0xe96fa7,
      TELHADO = 0x8654c6, DOURADO = 0xf2b94b, FAIXA = 0xf4be4e,
      VIDRO = 0xffe49a, VIDRO_QUENTE = 0xffb83e, BANDEIRA = 0xa65ed1, ESTRELA_OURO = 0xffd35a;

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
  /* octogono com FACE olhando +Z */
  function octo(rTopo, rBase, alt, y0) {
    var g = new T.CylinderGeometry(rTopo, rBase, alt, 8);
    g.rotateY(Math.PI / 8);
    g.translate(0, y0 + alt / 2, 0);
    return g;
  }
  var IN = Math.cos(Math.PI / 8);   /* fator inradius do octogono */

  var corpo = [], brilho = [];

  /* ---------- alturas (constantes nomeadas p/ composicao futura) ---------- */
  var ALT_FUNDACAO = 0.32;
  var ALT_INFERIOR = 3.2, Y_INFERIOR = ALT_FUNDACAO - 0.02;
  var R_INFERIOR = 0.95;
  var Y_ANEL = Y_INFERIOR + ALT_INFERIOR;          /* 3.50 */
  var ALT_ANEL = 0.24, ALT_AMEIA = 0.38;
  var ALT_SUPERIOR = 1.65, Y_SUPERIOR = Y_ANEL + ALT_ANEL;   /* 3.74 */
  var R_SUPERIOR = 0.82;
  var Y_FAIXA = Y_SUPERIOR + ALT_SUPERIOR;         /* 5.39 */
  var ALT_FAIXA = 0.20;
  var Y_TELHADO = Y_FAIXA + ALT_FAIXA - 0.02;      /* 5.57 */
  var ALT_TELHADO = 1.65;
  var Y_MASTRO = Y_TELHADO + ALT_TELHADO - 0.08;   /* 7.14 */
  var ALT_MASTRO = 0.95;

  /* ---------- sombra pintada ---------- */
  corpo.push(pinta(new T.CircleGeometry(1.55, 16).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  /* ---------- fundacao + corpos ---------- */
  corpo.push(pinta(octo(1.05, 1.14, ALT_FUNDACAO, 0), FUNDACAO, 0.20));
  corpo.push(pinta(octo(R_INFERIOR, R_INFERIOR, ALT_INFERIOR, Y_INFERIOR), PAREDE, 0.06));
  corpo.push(pinta(octo(R_SUPERIOR, R_SUPERIOR, ALT_SUPERIOR, Y_SUPERIOR), PAREDE, 0.05));

  /* ---------- anel de ameias rosa (zigue-zague da imagem) ---------- */
  corpo.push(pinta(octo(1.14, 1.14, ALT_ANEL, Y_ANEL), AMEIA_BASE, 0.12));
  for (var b = 0; b < 8; b++) {
    var angB = b * Math.PI / 4;                       /* em cima: nas faces */
    var bx = Math.sin(angB) * 1.0, bz = Math.cos(angB) * 1.0;
    var bloco = new T.BoxGeometry(0.35, ALT_AMEIA, 0.26);
    bloco.rotateY(angB);
    bloco.translate(bx, Y_ANEL + ALT_ANEL + ALT_AMEIA / 2 - 0.02, bz);
    corpo.push(pinta(bloco, AMEIA, 0.10));
    var angB2 = angB + Math.PI / 8;                   /* embaixo: nos vaos, pendurados */
    var bx2 = Math.sin(angB2) * 1.02, bz2 = Math.cos(angB2) * 1.02;
    var bloco2 = new T.BoxGeometry(0.30, 0.30, 0.22);
    bloco2.rotateY(angB2);
    bloco2.translate(bx2, Y_ANEL - 0.13, bz2);
    corpo.push(pinta(bloco2, AMEIA, 0.16));
  }

  /* ---------- faixa dourada + telhado + mastro ---------- */
  /* faixa e telhado mais largos que o corpo: a beira sobressai como na imagem */
  corpo.push(pinta(octo(1.08, 1.04, ALT_FAIXA, Y_FAIXA), FAIXA, 0.12));
  var cone = new T.ConeGeometry(1.24, ALT_TELHADO, 8);
  cone.rotateY(Math.PI / 8);
  cone.translate(0, Y_TELHADO + ALT_TELHADO / 2, 0);
  corpo.push(pinta(cone, TELHADO, 0.16));
  var mastro = new T.CylinderGeometry(0.055, 0.075, ALT_MASTRO, 6);
  mastro.translate(0, Y_MASTRO + ALT_MASTRO / 2, 0);
  corpo.push(pinta(mastro, DOURADO, 0.12));

  /* ---------- bandeira lilas (rabo de andorinha, com espessura p/ ler dos 2 lados) ---------- */
  (function bandeira() {
    var f = new T.Shape();
    var C = 0.85, A = 0.34, RECORTE = 0.22;
    f.moveTo(0, 0);
    f.lineTo(C, 0.03);
    f.lineTo(C - RECORTE, A / 2);
    f.lineTo(C, A - 0.03);
    f.lineTo(0, A);
    f.closePath();
    var g = new T.ExtrudeGeometry(f, { depth: 0.035, bevelEnabled: false });
    g.translate(0.05, Y_MASTRO + ALT_MASTRO - A - 0.12, -0.0175);
    corpo.push(pinta(g, BANDEIRA, 0.10));
  })();

  /* ---------- estrela (mesma receita da luminaria; BRILHA) ---------- */
  (function estrela() {
    var forma = new T.Shape();
    var R1 = 0.20, R2 = 0.082;
    for (var i = 0; i < 10; i++) {
      var ang = Math.PI / 2 + (i / 10) * Math.PI * 2;
      var r = (i % 2 === 0) ? R1 : R2;
      var x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
    }
    forma.closePath();
    var g = new T.ExtrudeGeometry(forma, {
      depth: 0.035, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.034, bevelSegments: 1
    });
    g.translate(0, 0, -0.0175);
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv');
    var n2 = g.attributes.position.count, a2 = new Float32Array(n2 * 3);
    var cE = new T.Color(ESTRELA_OURO);
    for (var k = 0; k < n2; k++) { a2[k * 3] = cE.r; a2[k * 3 + 1] = cE.g; a2[k * 3 + 2] = cE.b; }
    g.setAttribute('color', new T.BufferAttribute(a2, 3));
    g.translate(0, Y_MASTRO + ALT_MASTRO + 0.20, 0);
    brilho.push(g);
  })();

  /* ---------- janelas pontiagudas (retangulo + bico; moldura + vidro) ----------
     ang em radianos (0 = frente +Z); parede = inradius do corpo dono */
  function janela(ang, yBase, w, h, rCorpo) {
    var parede = rCorpo * IN;
    var BICO = h * 0.28, ESP = 0.07;
    function forma(dw, dh) {
      var s = new T.Shape();
      var w2 = w / 2 + dw, hh = h + dh, bico = BICO + dh * 0.6;
      s.moveTo(-w2, 0);
      s.lineTo(w2, 0);
      s.lineTo(w2, hh - bico);
      s.lineTo(0, hh);
      s.lineTo(-w2, hh - bico);
      s.closePath();
      return s;
    }
    /* moldura dourada: casca extrudada um pouco maior, saliente da parede */
    var molde = new T.ExtrudeGeometry(forma(ESP, ESP), { depth: 0.09, bevelEnabled: false });
    molde.translate(0, yBase, parede - 0.045);
    molde.rotateY(ang);
    corpo.push(pinta(molde, DOURADO, 0.10));
    /* soleira */
    var sol = new T.BoxGeometry(w + 0.26, 0.07, 0.12);
    sol.translate(0, yBase - 0.035, parede + 0.02);
    sol.rotateY(ang);
    corpo.push(pinta(sol, DOURADO, 0.14));
    /* vidro quente (Basic, nasce aceso): plano recuado dentro da moldura */
    var vidro = new T.ShapeGeometry(forma(0, 0));
    vidro = vidro.index ? vidro.toNonIndexed() : vidro;
    vidro.deleteAttribute('uv');
    var pos = vidro.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var cQ = new T.Color(VIDRO), cB = new T.Color(VIDRO_QUENTE);
    for (var i = 0; i < n; i++) {
      var fy = pos.getY(i) / h;
      var c = cB.clone().lerp(cQ, 0.35 + 0.65 * (1 - Math.abs(fy - 0.42) / 0.6));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    vidro.setAttribute('color', new T.BufferAttribute(a, 3));
    vidro.translate(0, yBase, parede + 0.052);
    vidro.rotateY(ang);
    brilho.push(vidro);
  }
  /* inferiores: frente grande + 2 laterais (secao 14) */
  janela(0, 1.15, 0.55, 1.25, R_INFERIOR);
  janela(Math.PI / 2, 1.35, 0.38, 0.95, R_INFERIOR);
  janela(-Math.PI / 2, 1.35, 0.38, 0.95, R_INFERIOR);
  /* superiores: 3 menores (secao 21) */
  janela(0, 4.15, 0.40, 0.95, R_SUPERIOR);
  janela(Math.PI / 2, 4.30, 0.30, 0.70, R_SUPERIOR);
  janela(-Math.PI / 2, 4.30, 0.30, 0.70, R_SUPERIOR);

  /* ---------- 2 draw calls ---------- */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  var malhaBrilho = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
  malhaBrilho.name = 'torre_brilho';
  grupo.add(malhaBrilho);

  ctx.COLISORES.push({ x: 0, z: 0, raio: 1.15 });

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 2, tri: 0 }   /* medir na vitrine antes de fechar */
  };
};

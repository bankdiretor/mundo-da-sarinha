/* parteLuminaria — a LUMINARIA do Universo Sarinha (ficha de referencia do
   Ivan, 15/08: estrela + topo piramidal + tampa + corpo de vidro + aro +
   conector + poste + base quadrada, paleta dourado/roxo).

   Prototipo de vitrine (padrao arvore-flor/arvore-conica): 1 instancia de
   teste na origem, NAO carregada no jogo. Quando o Ivan aprovar, a
   espalhada pelo mundo vira InstancedMesh em peca propria (e substituir os
   lampioes atuais e decisao de design a parte — eles carregam a mecanica
   de acender por estrelinha).

   A ficha veio com codigo three.js de MeshStandardMaterial + castShadow +
   emissive — NAO usado: o CONTRATO.md proibe (Lambert + cor por vertice,
   sem sombra, brilho por MeshBasic + halo aditivo). O que a ficha deu de
   util: pecas numeradas, vistas, paleta hex e dimensoes (altura 2.6-2.8,
   base 0.45, lanterna 0.65, poste 0.22).

   3 draw calls: corpo Lambert mesclado / vidro+estrela MeshBasic (brilha) /
   halo aditivo de CanvasTexture (receita do lampioes.js). */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteLuminaria = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'luminaria';

  /* ---------- paleta da ficha ---------- */
  var DOURADO_CLARO = 0xffd88a, DOURADO_ESCURO = 0xe1b44a, VIDRO = 0xffe9b5,
      ROXO_CLARO = 0xa48acf, ROXO_MEDIO = 0x7d63b8, ROXO_ESCURO = 0x5a468a,
      ESTRELA_OURO = 0xffd166;

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.16 : fBase);
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

  /* prisma quadrado com afunilamento: Cylinder de 4 lados girado 45 graus.
     larguras sao de FACE a FACE (como na ficha); raio de canto = w/2*sqrt2 */
  function prisma(wTopo, wBase, alt, y0) {
    var g = new T.CylinderGeometry(wTopo * 0.5 * Math.SQRT2, wBase * 0.5 * Math.SQRT2, alt, 4, 1);
    g.rotateY(Math.PI / 4);
    g.translate(0, y0 + alt / 2, 0);
    return g;
  }

  var corpo = [], brilho = [];

  /* ---------- sombra pintada (tapetinho, regra do cenario claro) ---------- */
  corpo.push(pinta(new T.CircleGeometry(0.42, 14).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  /* ---------- 8. base quadrada (roxo escuro, 2 degraus afunilados) ---------- */
  corpo.push(pinta(prisma(0.38, 0.45, 0.11, 0), ROXO_ESCURO, 0.22));
  corpo.push(pinta(prisma(0.26, 0.32, 0.10, 0.11), ROXO_MEDIO, 0.20));

  /* ---------- 7. poste (roxo medio, coluna quadrada 0.22, leve afunilada) ---------- */
  var POSTE_Y0 = 0.21, POSTE_ALT = 1.24;
  /* fBase baixo: a coluna e alta, degrade forte escurecia demais (v1 provou) */
  corpo.push(pinta(prisma(0.18, 0.22, POSTE_ALT, POSTE_Y0), ROXO_MEDIO, 0.09));
  /* colarinho roxo claro no topo do poste (a ficha mostra a cabeca mais clara) */
  var POSTE_TOPO = POSTE_Y0 + POSTE_ALT;
  corpo.push(pinta(prisma(0.22, 0.19, 0.10, POSTE_TOPO - 0.02), ROXO_CLARO, 0.14));

  /* ---------- 6. conector dourado (cubinho) ---------- */
  var CON_Y0 = POSTE_TOPO + 0.08, CON_ALT = 0.13;
  corpo.push(pinta(prisma(0.15, 0.13, CON_ALT, CON_Y0), DOURADO_ESCURO, 0.18));

  /* ---------- 5. aro da lanterna (colar octogonal + funil embaixo do vidro) ---------- */
  var ARO_Y0 = CON_Y0 + CON_ALT;
  var funil = new T.CylinderGeometry(0.20 * Math.SQRT2 * 0.5, 0.08, 0.12, 8);
  funil.translate(0, ARO_Y0 + 0.06, 0);
  corpo.push(pinta(funil, DOURADO_ESCURO, 0.20));
  var aro = new T.CylinderGeometry(0.24, 0.26, 0.07, 8);
  aro.translate(0, ARO_Y0 + 0.12 + 0.035, 0);
  corpo.push(pinta(aro, DOURADO_CLARO, 0.16));

  /* ---------- 4. corpo da lanterna (vidro quente, prisma afunilado p/ cima) ---------- */
  var VID_Y0 = ARO_Y0 + 0.19, VID_ALT = 0.50, VID_W_TOPO = 0.56, VID_W_BASE = 0.36;
  var vidro = prisma(VID_W_TOPO, VID_W_BASE, VID_ALT, VID_Y0);
  /* vidro pintado num degrade quente: mais claro no meio-topo (luz interna) */
  (function pintaVidro() {
    var g = vidro.index ? vidro.toNonIndexed() : vidro;
    g.deleteAttribute('uv');
    var cQuente = new T.Color(0xfff3cd), cBorda = new T.Color(VIDRO).lerp(new T.Color(0xe9a84c), 0.35);
    var pos = g.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var f = (pos.getY(i) - VID_Y0) / VID_ALT;
      /* "luz interna" da ficha: pico de calor no MEIO do vidro, nao no topo */
      var q = 1 - Math.min(1, Math.abs(f - 0.45) / 0.55);
      var c = cBorda.clone().lerp(cQuente, 0.30 + 0.70 * q);
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    vidro = g;
  })();
  brilho.push(vidro);

  /* molduras douradas do vidro: 4 barrinhas nos cantos + quadro em cima e embaixo */
  (function molduras() {
    var meiaT = VID_W_TOPO / 2, meiaB = VID_W_BASE / 2, e = 0.028;
    for (var q = 0; q < 4; q++) {
      var sx = (q & 1) ? 1 : -1, sz = (q & 2) ? 1 : -1;
      var x0 = sx * meiaB, z0 = sz * meiaB, x1 = sx * meiaT, z1 = sz * meiaT;
      var comp = Math.hypot(x1 - x0, VID_ALT, z1 - z0) + 0.03;
      var barra = new T.BoxGeometry(e, comp, e);
      var dirX = (x1 - x0) / comp, dirZ = (z1 - z0) / comp;
      barra.rotateZ(-Math.asin(dirX)); barra.rotateX(Math.asin(dirZ));
      barra.translate((x0 + x1) / 2, VID_Y0 + VID_ALT / 2, (z0 + z1) / 2);
      corpo.push(pinta(barra, DOURADO_ESCURO, 0.14));
    }
    var quadroT = prisma(VID_W_TOPO + 0.05, VID_W_TOPO + 0.05, 0.055, VID_Y0 + VID_ALT - 0.02);
    corpo.push(pinta(quadroT, DOURADO_CLARO, 0.14));
    var quadroB = prisma(VID_W_BASE + 0.045, VID_W_BASE + 0.045, 0.05, VID_Y0 - 0.025);
    corpo.push(pinta(quadroB, DOURADO_ESCURO, 0.16));
  })();

  /* ---------- 3. tampa da lanterna (piramide dourada 4 lados com beiral) ---------- */
  var TAMPA_Y0 = VID_Y0 + VID_ALT + 0.03;
  var beiral = prisma(0.50, 0.68, 0.09, TAMPA_Y0);
  corpo.push(pinta(beiral, DOURADO_ESCURO, 0.18));
  var tampa = new T.ConeGeometry(0.50 * 0.5 * Math.SQRT2, 0.24, 4);
  tampa.rotateY(Math.PI / 4);
  tampa.translate(0, TAMPA_Y0 + 0.09 + 0.12, 0);
  corpo.push(pinta(tampa, DOURADO_CLARO, 0.14));

  /* ---------- 2. topo piramidal (roxo, piramide curta) ---------- */
  var TOPO_Y0 = TAMPA_Y0 + 0.09 + 0.24 - 0.02;
  var topo = new T.ConeGeometry(0.20 * Math.SQRT2 * 0.5 * 1.4, 0.13, 4);
  topo.rotateY(Math.PI / 4);
  topo.translate(0, TOPO_Y0 + 0.065, 0);
  corpo.push(pinta(topo, ROXO_MEDIO, 0.16));

  /* ---------- 1. estrela (5 pontas, extrudada, dourada, BRILHA) ---------- */
  var EST_Y = TOPO_Y0 + 0.29;   /* pontas de baixo da estrela quase encostam na piramide (como na ficha) */
  (function estrela() {
    var forma = new T.Shape();
    var R1 = 0.16, R2 = 0.066;
    for (var i = 0; i < 10; i++) {
      var ang = Math.PI / 2 + (i / 10) * Math.PI * 2;
      var r = (i % 2 === 0) ? R1 : R2;
      var x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
    }
    forma.closePath();
    /* bevel liga: a vista "Lado" da ficha mostra a estrela com quina no meio
       (losango), nao uma placa chapada */
    var g = new T.ExtrudeGeometry(forma, {
      depth: 0.03, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.030, bevelSegments: 1
    });
    g.translate(0, 0, -0.015);
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv');
    /* dourado chapado (MeshBasic): a estrela e o simbolo do mundo, sempre acesa */
    var n2 = g.attributes.position.count, a2 = new Float32Array(n2 * 3);
    var cE = new T.Color(ESTRELA_OURO);
    for (var k = 0; k < n2; k++) { a2[k * 3] = cE.r; a2[k * 3 + 1] = cE.g; a2[k * 3 + 2] = cE.b; }
    g.setAttribute('color', new T.BufferAttribute(a2, 3));
    g.translate(0, EST_Y, 0);
    brilho.push(g);
  })();

  /* ---------- DC 1: corpo Lambert ---------- */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true })));

  /* ---------- DC 2: vidro + estrela (MeshBasic: "acende" sem luz nova) ---------- */
  var malhaBrilho = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true }));
  malhaBrilho.name = 'luminaria_brilho';
  grupo.add(malhaBrilho);

  /* ---------- DC 3: halo quente (receita do lampioes.js) ---------- */
  var VID_MEIO = VID_Y0 + VID_ALT * 0.55;
  (function halo() {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    var g2d = cv.getContext('2d');
    var grad = g2d.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0.00, 'rgba(255,240,200,0.95)');
    grad.addColorStop(0.25, 'rgba(255,209,102,0.55)');
    grad.addColorStop(0.55, 'rgba(255,193,86,0.16)');
    grad.addColorStop(1.00, 'rgba(255,176,62,0)');
    g2d.fillStyle = grad; g2d.fillRect(0, 0, 128, 128);
    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false; tex.minFilter = T.LinearFilter;
    var planos = [];
    for (var h = 0; h < 3; h++) {
      var p = new T.PlaneGeometry(2.0, 2.0);
      p.rotateY(h * Math.PI / 3);
      p.translate(0, VID_MEIO, 0);
      planos.push(p);
    }
    var m = new T.Mesh(BGU.mergeBufferGeometries(planos), new T.MeshBasicMaterial({
      map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false
    }));
    m.renderOrder = 3;
    m.name = 'luminaria_halo';
    grupo.add(m);
  })();

  ctx.COLISORES.push({ x: 0, z: 0, raio: 0.32 });

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 3, tri: 0 }   /* medir na vitrine antes de fechar */
  };
};

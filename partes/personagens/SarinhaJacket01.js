/* SarinhaJacket01 — CHAR-13: a JAQUETA ABERTA do look "Pop Musical".
   Camada POR CIMA do torso (hideTorso false): casca em gomos seguindo a capsula
   do torso com folga 0.032, varrendo 290 graus — o setor de 70 graus na FRENTE
   fica aberto e mostra a roupa de baixo.

   ⚠️ A borda da abertura expoe o interior: por isso a casca tem PAREDE INTERNA
   (0.012 mais para dentro, escurecida) e TAMPAS verticais nas duas bordas —
   sem isso as bordas somem por backface culling (familia da armadilha do
   scale(-1)). Barra e gola tambem fechadas por tampas.

   Mangas: mesmo solido de revolucao do Top01, raios +0.010 (por fora da manga
   da camiseta — R2/R3), comprimento 0.136 <= 0.15.

   Contrato do mundo: 1 malha Lambert vertexColors flatShading, sem luz/sombra/
   textura/import. PELVIS-SPACE; o Assembler pendura no Pelvis. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  var C = {
    /* capsula do torso (numeros do CHAR-00) */
    raio: 0.28, meiaAltura: 0.11, escX: 1.357, escZ: 0.85, centroY: 0.34,

    folga: 0.032,            /* por fora da camiseta (que usa 0.015) */
    espessura: 0.012,

    abertura: Math.PI * 88 / 180,     /* setor aberto na frente — 70 fazia a
                                         borda cobrir o peito e virar painel chapado */
    gomos: 12,                        /* nos 290 graus restantes */

    /* aneis de altura (pelvis-space). topo some atras da cabeca; barra em
       -0.04, um pouco abaixo da barra do top (-0.02) */
    aneisY: [0.62, 0.44, 0.20, -0.04],

    sombraInterna: 0.30
  };

  var COR_PADRAO = 0xE8A7B2;   /* rosa (Pop Musical) */
  var CINZA = null, BRANCO = null;

  /* pinta canonica do mundo (mesma dos vizinhos) */
  function pinta(T, geo, cor, fBase) {
    if (!CINZA) { CINZA = new T.Color(0x6a5a8f); BRANCO = new T.Color(0xffffff); }
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    if (fBase === undefined) fBase = 0.10;
    var cTopo = new T.Color(cor),
        cBase = (fBase < 0) ? new T.Color(cor).lerp(BRANCO, -fBase)
              : (fBase === 0) ? new T.Color(cor)
                              : new T.Color(cor).lerp(CINZA, fBase);
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

  function raioCapsula(yl) {
    var d = Math.abs(yl) - C.meiaAltura;
    if (d <= 0) return C.raio;
    return Math.sqrt(Math.max(0, C.raio * C.raio - d * d));
  }

  /* anel parcial: gomos+1 pontos do angulo inicial ao final (frente aberta).
     ang 0 = frente (+Z); a varredura vai de abertura/2 ate 2PI-abertura/2. */
  function anel(yPelvis, folga) {
    var pts = [], k, ang, r, a0 = C.abertura / 2, a1 = Math.PI * 2 - C.abertura / 2;
    var yl = yPelvis - C.centroY;
    r = raioCapsula(yl);
    for (k = 0; k <= C.gomos; k++) {
      ang = a0 + (k / C.gomos) * (a1 - a0);
      pts.push([Math.sin(ang) * (r * C.escX + folga), yPelvis,
                Math.cos(ang) * (r * C.escZ + folga)]);
    }
    return pts;
  }

  function fazQuads(T, quads) {
    var v = [], i, q;
    function t3(p, s2, r2) { v.push(p[0],p[1],p[2], s2[0],s2[1],s2[2], r2[0],r2[1],r2[2]); }
    for (i = 0; i < quads.length; i++) { q = quads[i]; t3(q[0],q[1],q[2]); t3(q[0],q[2],q[3]); }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
    g.computeVertexNormals();
    return g;
  }

  /* parede entre dois aneis parciais (sem fechar a volta — frente aberta) */
  function parede(T, cima, baixo, dentro) {
    var quads = [], k;
    for (k = 0; k < C.gomos; k++) {
      if (!dentro) quads.push([cima[k], baixo[k], baixo[k + 1], cima[k + 1]]);
      else         quads.push([cima[k], cima[k + 1], baixo[k + 1], baixo[k]]);
    }
    return fazQuads(T, quads);
  }

  /* tampa horizontal externa->interna (gola e barra) */
  function tampaH(T, fora, dentroA, paraBaixo) {
    var quads = [], k;
    for (k = 0; k < C.gomos; k++) {
      if (paraBaixo) quads.push([fora[k], dentroA[k], dentroA[k + 1], fora[k + 1]]);
      else           quads.push([fora[k], fora[k + 1], dentroA[k + 1], dentroA[k]]);
    }
    return fazQuads(T, quads);
  }

  /* tampa VERTICAL na borda da abertura (indice fixo, desce pelos aneis) */
  function tampaBorda(T, aneisFora, aneisDentro, idx, viraDireita) {
    var quads = [], j, a, b, c2, d;
    for (j = 0; j < aneisFora.length - 1; j++) {
      a = aneisFora[j][idx];  b = aneisFora[j + 1][idx];
      c2 = aneisDentro[j + 1][idx]; d = aneisDentro[j][idx];
      if (viraDireita) quads.push([a, b, c2, d]);
      else             quads.push([a, d, c2, b]);
    }
    return fazQuads(T, quads);
  }

  /* manga: mesmo solido de revolucao do Top01, raios +0.010 (fica por fora) */
  var OMBRO_X = 0.365, OMBRO_Y = 0.583, TILT = 0.10, SEG_MANGA = 7;
  var PERFIL = [[0.173, 0.443], [0.165, 0.520], [0.130, 0.600], [0.012, 0.636]];
  function manga(T, cor, lado) {
    var v = [];
    function t3(p, q, r) { v.push(p[0],p[1],p[2], q[0],q[1],q[2], r[0],r[1],r[2]); }
    var TAU = Math.PI * 2, i, j, a0, a1, s0, c0, s1, c1, rb, yb, rt, yt, A, B, Cq, D;
    for (i = 0; i < SEG_MANGA; i++) {
      a0 = i / SEG_MANGA * TAU; a1 = (i + 1) / SEG_MANGA * TAU;
      s0 = Math.sin(a0); c0 = Math.cos(a0); s1 = Math.sin(a1); c1 = Math.cos(a1);
      for (j = 0; j < PERFIL.length - 1; j++) {
        rb = PERFIL[j][0]; yb = PERFIL[j][1];
        rt = PERFIL[j + 1][0]; yt = PERFIL[j + 1][1];
        A = [rb * s0, yb, rb * c0]; B = [rb * s1, yb, rb * c1];
        Cq = [rt * s0, yt, rt * c0]; D = [rt * s1, yt, rt * c1];
        t3(A, B, Cq); t3(Cq, B, D);
      }
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
    g.translate(0, -OMBRO_Y, 0);
    g.rotateZ(lado * TILT);
    g.translate(lado * OMBRO_X, OMBRO_Y, 0);
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.14);
  }

  window.SARINHA_PERSONAGENS.createSarinhaJacket01 = function (ctx, opts) {
    var T = ctx.T, BGU = ctx.BGU || T.BufferGeometryUtils;
    opts = opts || {};
    var cor = opts.clothColor === undefined ? COR_PADRAO : opts.clothColor,
        material = opts.material || new T.MeshLambertMaterial(
                     { vertexColors: true, flatShading: opts.flatShading !== false });

    var fora = [], dentro = [], i;
    for (i = 0; i < C.aneisY.length; i++) {
      fora.push(anel(C.aneisY[i], C.folga));
      dentro.push(anel(C.aneisY[i], C.folga - C.espessura));
    }

    var corDentro = new T.Color(cor).lerp(new T.Color(0x6a5a8f), C.sombraInterna).getHex();
    var partes = [];
    for (i = 0; i < C.aneisY.length - 1; i++) {
      partes.push(pinta(T, parede(T, fora[i], fora[i + 1], false), cor, -0.14));
      partes.push(pinta(T, parede(T, dentro[i], dentro[i + 1], true), corDentro, 0.10));
    }
    var topo = 0, base = C.aneisY.length - 1;
    partes.push(pinta(T, tampaH(T, fora[topo], dentro[topo], false), cor, 0));      /* gola */
    partes.push(pinta(T, tampaH(T, fora[base], dentro[base], true), cor, 0));       /* barra */
    partes.push(pinta(T, tampaBorda(T, fora, dentro, 0, false), cor, 0));           /* borda esq */
    partes.push(pinta(T, tampaBorda(T, fora, dentro, C.gomos, true), cor, 0));      /* borda dir */
    partes.push(manga(T, cor, +1));
    partes.push(manga(T, cor, -1));

    var geo = BGU.mergeBufferGeometries(partes);
    if (!geo) throw new Error('merge da jaqueta devolveu null');

    var grupo = new T.Group();
    grupo.name = 'SarinhaJacket01';
    var malha = new T.Mesh(geo, material);
    malha.name = 'ClothMesh';
    grupo.add(malha);

    grupo.userData = {
      type: 'SarinhaJacket01',
      version: '1.0',
      clothColor: cor,
      tipoRoupa: 'jacket',
      hideTorso: false,
      legPaint: null,
      aberturaGraus: 88
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.JACKET01_MEASURES = C;
})();

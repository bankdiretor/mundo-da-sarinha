/* ===========================================================================
   parteNuvemArcoIris — zona aerea a noroeste: uma plataforma de nuvem
   flutuando no ceu (a crianca anda em cima, topo plano em y=9.0), uma
   nuvem-rosto sorridente fofa ao lado (carinha via CanvasTexture — a unica
   textura desta peca), um arco-iris largo escorregando da plataforma ate
   o chao, estrelinhas douradas penduradas por fiozinhos que balancam, e uma
   chuvinha de brilho caindo devagar da nuvem-rosto. Contrato: CONTRATO.md.

   ORCAMENTO REAL (4 draw calls — 1 a mais que o teto de 3 pedido, e o
   motivo e o mesmo do lampioes.js: o CanvasTexture da carinha PRECISA de
   material proprio com `map`, que nao pode ser mesclado com o material
   vertexColors da nuvem solida nem com o MeshBasicMaterial sem textura do
   arco-iris — sao 3 materiais logicamente diferentes + 1 InstancedMesh):
     1) solido  (Lambert, vertexColors) : plataforma + nuvem-rosto + fiozinhos
     2) arco-iris (Basic,  vertexColors) : 6 fitas concentricas
     3) carinha (Basic, map CanvasTexture, transparent) : 1 plano colado
     4) gemas   (Basic,  vertexColors, InstancedMesh)   : 14 estrelas + 20 gotas
   =========================================================================== */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteNuvemArcoIris = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'nuvemArcoIris';

  /* pseudo-aleatorio deterministico (mesmo visual toda vez que o mundo carrega) */
  function pr(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

  /* ---- pintura em degrade: topo (y alto) ate a base (y baixo) da PROPRIA peca ---- */
  function pintaGrad(geo, corTopo, corBase) {
    var cTopo = new T.Color(corTopo), cBase = new T.Color(corBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var f = (ys[k] - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, f);
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    /* Sphere/Cylinder nascem COM indice; uniformiza pra nao-indexado (armadilha do contrato) */
    return geo.index ? geo.toNonIndexed() : geo;
  }
  /* ---- pintura solida (cor unica por peca) ---- */
  function pintaUni(geo, cor) {
    var c = new T.Color(cor), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo.index ? geo.toNonIndexed() : geo;
  }
  /* achata: qualquer vertice acima de limiteY desce pra limiteY (corta um topo chato
     no meio de uma esfera fofa) e recalcula normais so dessa peca, que vira o piso) */
  function achata(geo, limiteY) {
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) { if (pos.getY(i) > limiteY) pos.setY(i, limiteY); }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  var COR_TOPO = 0xfff4f7;      /* branco-rosado */
  var COR_BARRIGA = 0xe3d6f7;   /* lilas leve */

  /* =====================================================================
     GEOGRAFIA — noroeste, centro (-34,-34), topo plano em y=9.0
     ===================================================================== */
  var PLAT_CX = -34, PLAT_CZ = -34, PLAT_Y = 9.0, PLAT_R_UTIL = 6.5;
  var FACE_CX = -46, FACE_CY = 9.5, FACE_CZ = -40;

  var pecasSolido = [];   /* tudo em Lambert+vertexColors vira 1 malha (DC1) */

  /* =====================================================================
     1) PLATAFORMA-NUVEM — 6 esferas achatadas mescladas, topo cortado
        reto em y=9.0 (onde a crianca anda), raio util ~6.5.
     ===================================================================== */
  (function plataformaNuvem() {
    var lumps = [{ dx: 0, dz: 0, r: 4.4, sy: 0.58, cy: PLAT_Y - 0.95, seg: [8, 6] }];
    for (var i = 0; i < 5; i++) {
      var ang = (i / 5) * Math.PI * 2 + (pr(i + 1) - 0.5) * 0.3;
      var rad = 3.6 + pr(i * 1.7 + 2) * 0.6;
      var r = 2.6 + pr(i * 2.3 + 3) * 0.6;
      var sy = 0.56 + pr(i * 1.3 + 4) * 0.10;
      var cy = PLAT_Y - (0.75 + pr(i * 1.9 + 5) * 0.35);
      lumps.push({ dx: Math.cos(ang) * rad, dz: Math.sin(ang) * rad, r: r, sy: sy, cy: cy, seg: [7, 5] });
    }
    lumps.forEach(function (L) {
      var g = new T.SphereGeometry(L.r, L.seg[0], L.seg[1]);
      g.scale(1, L.sy, 1);
      g.translate(PLAT_CX + L.dx, L.cy, PLAT_CZ + L.dz);
      achata(g, PLAT_Y);
      pecasSolido.push(pintaGrad(g, COR_TOPO, COR_BARRIGA));
    });
  })();
  grupo.userData.plataforma = { x: PLAT_CX, z: PLAT_CZ, y: PLAT_Y, raio: PLAT_R_UTIL };

  /* =====================================================================
     2) NUVEM-ROSTO — nuvem maior ao lado (nao em cima da plataforma),
        mesma tecnica de esferas achatadas, sem cortar o topo (nao se anda
        nela). A carinha (CanvasTexture) olha na direcao da plataforma.
     ===================================================================== */
  var faceDirX, faceDirZ;
  (function nuvemRosto() {
    var dx = PLAT_CX - FACE_CX, dz = PLAT_CZ - FACE_CZ, dl = Math.hypot(dx, dz) || 1;
    faceDirX = dx / dl; faceDirZ = dz / dl;

    var lumps = [{ dx: 0, dz: 0, r: 3.6, sy: 0.62, cy: FACE_CY, seg: [7, 5] }];
    for (var i = 0; i < 5; i++) {
      var ang = (i / 5) * Math.PI * 2 + (pr(i + 40) - 0.5) * 0.3;
      var rad = 2.5 + pr(i * 1.6 + 41) * 0.5;
      var r = 1.8 + pr(i * 2.1 + 42) * 0.5;
      var sy = 0.58 + pr(i * 1.4 + 43) * 0.12;
      var cy = FACE_CY + (pr(i * 1.8 + 44) - 0.5) * 0.6;
      lumps.push({ dx: Math.cos(ang) * rad, dz: Math.sin(ang) * rad, r: r, sy: sy, cy: cy, seg: [6, 5] });
    }
    lumps.forEach(function (L) {
      var g = new T.SphereGeometry(L.r, L.seg[0], L.seg[1]);
      g.scale(1, L.sy, 1);
      g.translate(FACE_CX + L.dx, L.cy, FACE_CZ + L.dz);
      pecasSolido.push(pintaGrad(g, COR_TOPO, COR_BARRIGA));
    });
  })();

  /* =====================================================================
     3) FIOZINHOS das estrelinhas — 8 sob a plataforma + 6 sob a nuvem-rosto.
        Guarda a posicao de repouso de cada estrela (usada pelo InstancedMesh
        de gemas mais abaixo).
     ===================================================================== */
  var estrelasBase = [];
  (function fiozinhos() {
    var N_PLAT = 8, N_FACE = 6;
    for (var i = 0; i < N_PLAT; i++) {
      var ang = (i / N_PLAT) * Math.PI * 2 + (pr(i + 60) - 0.5) * 0.4;
      var rad = 1.2 + pr(i * 1.3 + 61) * 4.4;
      var ax = PLAT_CX + Math.cos(ang) * rad, az = PLAT_CZ + Math.sin(ang) * rad;
      var ay = PLAT_Y - 1.05;
      var compr = 0.5 + pr(i * 1.7 + 62) * 0.55;
      var fio = new T.CylinderGeometry(0.018, 0.018, compr, 5, 1, true);
      fio.translate(0, -compr / 2, 0);
      fio.translate(ax, ay, az);
      pecasSolido.push(pintaUni(fio, 0xcbb9e0));
      estrelasBase.push({
        x: ax, y: ay - compr, z: az,
        fase: pr(i * 2.1 + 63) * Math.PI * 2, amp: 0.10 + pr(i * 1.1 + 64) * 0.08, vel: 0.6 + pr(i * 1.9 + 65) * 0.5
      });
    }
    for (var j = 0; j < N_FACE; j++) {
      var ang2 = (j / N_FACE) * Math.PI * 2 + (pr(j + 70) - 0.5) * 0.4;
      var rad2 = 0.8 + pr(j * 1.3 + 71) * 2.1;
      var ax2 = FACE_CX + Math.cos(ang2) * rad2, az2 = FACE_CZ + Math.sin(ang2) * rad2;
      var ay2 = FACE_CY - 1.9;
      var compr2 = 0.45 + pr(j * 1.7 + 72) * 0.5;
      var fio2 = new T.CylinderGeometry(0.018, 0.018, compr2, 5, 1, true);
      fio2.translate(0, -compr2 / 2, 0);
      fio2.translate(ax2, ay2, az2);
      pecasSolido.push(pintaUni(fio2, 0xcbb9e0));
      estrelasBase.push({
        x: ax2, y: ay2 - compr2, z: az2,
        fase: pr(j * 2.1 + 73) * Math.PI * 2, amp: 0.10 + pr(j * 1.1 + 74) * 0.08, vel: 0.6 + pr(j * 1.9 + 75) * 0.5
      });
    }
  })();
  var N_ESTRELAS = estrelasBase.length; /* 14 */

  /* ---------- DC1: junta plataforma + nuvem-rosto + fiozinhos ---------- */
  var matSolido = new T.MeshLambertMaterial({ vertexColors: true });
  var meshSolido = new T.Mesh(BGU.mergeBufferGeometries(pecasSolido), matSolido);
  grupo.add(meshSolido);

  /* =====================================================================
     4) ARCO-IRIS — faixa larga curva (bezier), 6 fitas concentricas de
        cor solida lado a lado, saindo da plataforma e descendo ao chao.
        MeshBasicMaterial: ele brilha, nao recebe luz (regra do contrato).
     ===================================================================== */
  var ARCO = { x0: PLAT_CX, z0: PLAT_CZ, y0: PLAT_Y, x1: -20, z1: -20, y1: 0 };
  grupo.userData.arcoiris = ARCO;

  (function arcoIris() {
    var P0 = { x: ARCO.x0, y: ARCO.y0, z: ARCO.z0 }, P2 = { x: ARCO.x1, y: ARCO.y1, z: ARCO.z1 };
    /* controle perto da altura de saida: a faixa sai quase na horizontal da
       plataforma e so depois curva pro chao — cara de escorregador */
    var Pc = { x: (P0.x + P2.x) / 2, y: P0.y * 0.88, z: (P0.z + P2.z) / 2 };

    function bezier(t) {
      var mt = 1 - t;
      return {
        x: mt * mt * P0.x + 2 * mt * t * Pc.x + t * t * P2.x,
        y: mt * mt * P0.y + 2 * mt * t * Pc.y + t * t * P2.y,
        z: mt * mt * P0.z + 2 * mt * t * Pc.z + t * t * P2.z
      };
    }
    var dirX = P2.x - P0.x, dirZ = P2.z - P0.z, dl = Math.hypot(dirX, dirZ) || 1;
    dirX /= dl; dirZ /= dl;
    var perpX = -dirZ, perpZ = dirX;   /* largura da faixa, horizontal, constante */

    var CORES = [0xff9b91, 0xffc48a, 0xffe08a, 0xa8dca0, 0x8fd0e8, 0xc8a0e8];
    var LARGURA = 2.6, NB = CORES.length, bandW = LARGURA / NB, NSEG = 16;

    var pos = [], col = [];
    function pt(p, u) { return { x: p.x + perpX * u, y: p.y, z: p.z + perpZ * u }; }
    function push3(p, c) { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); }

    for (var b = 0; b < NB; b++) {
      var uMin = -LARGURA / 2 + b * bandW, uMax = uMin + bandW;
      var c = new T.Color(CORES[b]);
      var prevA = null, prevB = null;
      for (var s = 0; s <= NSEG; s++) {
        var p = bezier(s / NSEG);
        var A = pt(p, uMin), Bp = pt(p, uMax);
        if (prevA) {
          push3(prevA, c); push3(prevB, c); push3(A, c);
          push3(prevB, c); push3(Bp, c); push3(A, c);
        }
        prevA = A; prevB = Bp;
      }
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    var matArco = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });
    grupo.add(new T.Mesh(geo, matArco));
  })();

  /* =====================================================================
     5) CARINHA — unica textura da peca: dois olhinhos fechados e felizes
        + duas bochechas rosa, pintados num canvas, colados na nuvem-rosto
        virados pra plataforma/praca.
     ===================================================================== */
  (function carinha() {
    var cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
    var g2 = cv.getContext('2d');
    g2.clearRect(0, 0, 128, 96);
    g2.fillStyle = '#f2a7bb';
    g2.beginPath(); g2.ellipse(30, 58, 14, 10, 0, 0, Math.PI * 2); g2.fill();
    g2.beginPath(); g2.ellipse(98, 58, 14, 10, 0, 0, Math.PI * 2); g2.fill();
    g2.strokeStyle = '#5b5170'; g2.lineWidth = 6; g2.lineCap = 'round';
    /* arco de baixo do circulo = "u" fofo, cara de olho fechado feliz */
    g2.beginPath(); g2.arc(46, 40, 12, Math.PI, Math.PI * 2); g2.stroke();
    g2.beginPath(); g2.arc(82, 40, 12, Math.PI, Math.PI * 2); g2.stroke();

    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false; tex.minFilter = T.LinearFilter;

    var plano = new T.PlaneGeometry(3.0, 2.25);
    var matRosto = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: T.DoubleSide });
    var meshRosto = new T.Mesh(plano, matRosto);

    var raioAprox = 3.9;   /* cola no "casco" da nuvem-rosto, virada pra plataforma */
    meshRosto.position.set(FACE_CX + faceDirX * raioAprox, FACE_CY + 0.15, FACE_CZ + faceDirZ * raioAprox);
    meshRosto.rotation.y = Math.atan2(faceDirX, faceDirZ);
    meshRosto.renderOrder = 2;
    grupo.add(meshRosto);
  })();

  /* =====================================================================
     6) GEMAS — 14 estrelinhas douradas (balancam no fio) + 20 gotinhas de
        brilho (caem da nuvem-rosto e reaparecem em cima), tudo num unico
        InstancedMesh (mesma geometria-diamante, cor e escala por instancia).
     ===================================================================== */
  var geoGema = (function () {
    var g = new T.OctahedronGeometry(0.16, 0);
    g.deleteAttribute('uv');
    g = g.index ? g.toNonIndexed() : g;
    var n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = 1; a[i * 3 + 1] = 1; a[i * 3 + 2] = 1; } /* branco neutro */
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  })();
  var matGema = new T.MeshBasicMaterial({ vertexColors: true });

  var N_GOTAS = 20;
  var TOTAL_INST = N_ESTRELAS + N_GOTAS;
  var instGemas = new T.InstancedMesh(geoGema, matGema, TOTAL_INST);
  instGemas.instanceMatrix.setUsage(T.DynamicDrawUsage);

  var gotasBase = [];
  (function initGotas() {
    for (var i = 0; i < N_GOTAS; i++) {
      var ang = pr(i * 3.3 + 200) * Math.PI * 2;
      var rad = 0.6 + pr(i * 1.7 + 201) * 3.0;
      var yTopo = FACE_CY + 1.6, yBase = 1.0;
      gotasBase.push({
        x: FACE_CX + Math.cos(ang) * rad, z: FACE_CZ + Math.sin(ang) * rad,
        yTopo: yTopo, yBase: yBase, y: yBase + pr(i * 2.1 + 202) * (yTopo - yBase),
        vel: 0.6 + pr(i * 1.3 + 203) * 0.9
      });
    }
  })();

  var corOuro = new T.Color(0xffd166), corGota = new T.Color(0xeaf6ff);
  (function corDasGemas() {
    for (var i = 0; i < N_ESTRELAS; i++) instGemas.setColorAt(i, corOuro);
    for (var j = 0; j < N_GOTAS; j++) instGemas.setColorAt(N_ESTRELAS + j, corGota);
    if (instGemas.instanceColor) instGemas.instanceColor.needsUpdate = true;
  })();

  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(), vec = new T.Vector3(), esc = new T.Vector3();
  function atualizaGemas(t, dt) {
    var i, j;
    for (i = 0; i < N_ESTRELAS; i++) {
      var b = estrelasBase[i];
      var balY = Math.sin(t * b.vel + b.fase) * b.amp;
      var balX = Math.sin(t * b.vel * 0.7 + b.fase) * b.amp * 0.6;
      vec.set(b.x + balX, b.y + balY, b.z);
      eul.set(0, b.fase + t * 0.15, 0); qua.setFromEuler(eul);
      esc.set(1.3, 0.6, 1.3);   /* achatada: sparkle de estrelinha */
      mtx.compose(vec, qua, esc);
      instGemas.setMatrixAt(i, mtx);
    }
    for (j = 0; j < N_GOTAS; j++) {
      var g = gotasBase[j];
      g.y -= g.vel * (dt || 0);
      if (g.y < g.yBase) g.y = g.yTopo;   /* reaparece em cima ao chegar embaixo */
      vec.set(g.x, g.y, g.z);
      qua.identity();
      esc.set(0.55, 1.7, 0.55);  /* alongada: gotinha caindo */
      mtx.compose(vec, qua, esc);
      instGemas.setMatrixAt(N_ESTRELAS + j, mtx);
    }
    instGemas.instanceMatrix.needsUpdate = true;
  }
  atualizaGemas(0, 0);
  grupo.add(instGemas);

  return {
    grupo: grupo,
    update: function (t, dt) { atualizaGemas(t, dt); },
    /* MEDIDO (THREE r147 real, geometry.index?index.count/3:position.count/3, x instancias):
       solido: plataforma 80+5*56=360, rosto 56+5*48=296, fios 14*10=140 -> 796
       arco-iris: 6 fitas * 16 seg * 2 tri = 192
       carinha: 1 plano = 2
       gemas: octaedro 8 tri * 34 instancias = 272
       total = 796+192+2+272 = 1262 */
    custo: { dc: 4, tri: 1262 }
  };
};

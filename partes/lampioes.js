/* ===========================================================================
   parteLampioes — os 6 lampioes MECANICOS da praca (circulo raio 14),
   agora com o desenho da LUMINARIA do Universo Sarinha (ficha do Ivan
   15/08: estrela + topo piramidal + tampa + vidro + aro + conector +
   poste roxo + base quadrada). O prototipo/fonte da receita geometrica
   e partes/luminaria.js (vitrine); esta copia e a versao mecanica.

   A MECANICA E A MESMA DE SEMPRE (mecanica-simbolo do mundo): nascem
   APAGADOS (vidro e estrela cinza-lavanda) e acendem um a um conforme a
   crianca acha estrelinha — acender(i) / apagar(i), com pulso e halo.

   ORCAMENTO — 4 draw calls (como a versao antiga):
     1) corpo    : InstancedMesh Lambert (base, poste, molduras, tampa...)
     2) apagado  : InstancedMesh Lambert — vidro+estrela cinza-lavanda
     3) aceso    : InstancedMesh MeshBasic — vidro quente + estrela ouro
     4) halo     : 3 planos cruzados por lampiao, CanvasTexture, aditivo

   Acender sem custo novo: em vez do truque antigo de faixas de vertice,
   cada estado e uma instancia — "sumir" = matriz com escala 0,
   "aparecer" = escala 1 (e o pulso mexe so nessa escala). As duas IMs
   que trocam de matriz em tempo real levam frustumCulled=false
   (bug pago na versao antiga: a esfera de corte fica velha).
   Sem instanceColor em NENHUMA malha — nada do bug do material
   compartilhado (ver arvores-mundo.js).
   =========================================================================== */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteLampioes = function (ctx) {
  var T = ctx.T, M = ctx.M, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'lampioes';

  var N = 6, RAIO = 14;

  /* ---------- paleta da ficha ---------- */
  var DOURADO_CLARO = 0xffd88a, DOURADO_ESCURO = 0xe1b44a, VIDRO = 0xffe9b5,
      ROXO_MEDIO = 0x7d63b8, ROXO_ESCURO = 0x5a468a, ROXO_CLARO = 0xa48acf,
      ESTRELA_OURO = 0xffd166, APAGADO = 0x9a92b8;

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
  function prisma(wTopo, wBase, alt, y0) {
    var g = new T.CylinderGeometry(wTopo * 0.5 * Math.SQRT2, wBase * 0.5 * Math.SQRT2, alt, 4, 1);
    g.rotateY(Math.PI / 4);
    g.translate(0, y0 + alt / 2, 0);
    return g;
  }

  /* =========================================================================
     RECEITA DA LUMINARIA (copiada de partes/luminaria.js — fonte da verdade)
     ========================================================================= */
  var corpo = [];

  corpo.push(pinta(new T.CircleGeometry(0.42, 14).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(M.paleta.creme).lerp(CINZA, 0.30), 0.0));
  corpo.push(pinta(prisma(0.38, 0.45, 0.11, 0), ROXO_ESCURO, 0.22));
  corpo.push(pinta(prisma(0.26, 0.32, 0.10, 0.11), ROXO_MEDIO, 0.20));

  var POSTE_Y0 = 0.21, POSTE_ALT = 1.24;
  corpo.push(pinta(prisma(0.18, 0.22, POSTE_ALT, POSTE_Y0), ROXO_MEDIO, 0.09));
  var POSTE_TOPO = POSTE_Y0 + POSTE_ALT;
  corpo.push(pinta(prisma(0.22, 0.19, 0.10, POSTE_TOPO - 0.02), ROXO_CLARO, 0.14));

  var CON_Y0 = POSTE_TOPO + 0.08, CON_ALT = 0.13;
  corpo.push(pinta(prisma(0.15, 0.13, CON_ALT, CON_Y0), DOURADO_ESCURO, 0.18));

  var ARO_Y0 = CON_Y0 + CON_ALT;
  var funil = new T.CylinderGeometry(0.20 * Math.SQRT2 * 0.5, 0.08, 0.12, 8);
  funil.translate(0, ARO_Y0 + 0.06, 0);
  corpo.push(pinta(funil, DOURADO_ESCURO, 0.20));
  var aro = new T.CylinderGeometry(0.24, 0.26, 0.07, 8);
  aro.translate(0, ARO_Y0 + 0.12 + 0.035, 0);
  corpo.push(pinta(aro, DOURADO_CLARO, 0.16));

  var VID_Y0 = ARO_Y0 + 0.19, VID_ALT = 0.50, VID_W_TOPO = 0.56, VID_W_BASE = 0.36;

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
    corpo.push(pinta(prisma(VID_W_TOPO + 0.05, VID_W_TOPO + 0.05, 0.055, VID_Y0 + VID_ALT - 0.02), DOURADO_CLARO, 0.14));
    corpo.push(pinta(prisma(VID_W_BASE + 0.045, VID_W_BASE + 0.045, 0.05, VID_Y0 - 0.025), DOURADO_ESCURO, 0.16));
  })();

  var TAMPA_Y0 = VID_Y0 + VID_ALT + 0.03;
  corpo.push(pinta(prisma(0.50, 0.68, 0.09, TAMPA_Y0), DOURADO_ESCURO, 0.18));
  var tampa = new T.ConeGeometry(0.50 * 0.5 * Math.SQRT2, 0.24, 4);
  tampa.rotateY(Math.PI / 4);
  tampa.translate(0, TAMPA_Y0 + 0.09 + 0.12, 0);
  corpo.push(pinta(tampa, DOURADO_CLARO, 0.14));

  var TOPO_Y0 = TAMPA_Y0 + 0.09 + 0.24 - 0.02;
  var topo = new T.ConeGeometry(0.20 * Math.SQRT2 * 0.5 * 1.4, 0.13, 4);
  topo.rotateY(Math.PI / 4);
  topo.translate(0, TOPO_Y0 + 0.065, 0);
  corpo.push(pinta(topo, ROXO_MEDIO, 0.16));

  var geoCorpo = BGU.mergeBufferGeometries(corpo);

  /* ---------- vidro (2 pinturas) + estrela (2 pinturas) ---------- */
  function fazVidro(quente) {
    var g = prisma(VID_W_TOPO, VID_W_BASE, VID_ALT, VID_Y0);
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv');
    var pos = g.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var cA, cB;
    if (quente) { cA = new T.Color(VIDRO).lerp(new T.Color(0xe9a84c), 0.35); cB = new T.Color(0xfff3cd); }
    else { cA = new T.Color(APAGADO).lerp(CINZA, 0.30); cB = new T.Color(0xbdb5d6); }
    for (var i = 0; i < n; i++) {
      var f = (pos.getY(i) - VID_Y0) / VID_ALT;
      var q = 1 - Math.min(1, Math.abs(f - 0.45) / 0.55);   /* luz interna no MEIO */
      var c = cA.clone().lerp(cB, 0.30 + 0.70 * q);
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  }
  var EST_Y = TOPO_Y0 + 0.29;
  function fazEstrela(cor) {
    var forma = new T.Shape();
    var R1 = 0.16, R2 = 0.066;
    for (var i = 0; i < 10; i++) {
      var ang = Math.PI / 2 + (i / 10) * Math.PI * 2;
      var r = (i % 2 === 0) ? R1 : R2;
      var x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
    }
    forma.closePath();
    var g = new T.ExtrudeGeometry(forma, {
      depth: 0.03, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.030, bevelSegments: 1
    });
    g.translate(0, 0, -0.015);
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv');
    var n2 = g.attributes.position.count, a2 = new Float32Array(n2 * 3);
    var cE = new T.Color(cor);
    for (var k = 0; k < n2; k++) { a2[k * 3] = cE.r; a2[k * 3 + 1] = cE.g; a2[k * 3 + 2] = cE.b; }
    g.setAttribute('color', new T.BufferAttribute(a2, 3));
    g.translate(0, EST_Y, 0);
    return g;
  }
  var geoApagado = BGU.mergeBufferGeometries([fazVidro(false), fazEstrela(0xaaa2c4)]);
  var geoAceso = BGU.mergeBufferGeometries([fazVidro(true), fazEstrela(ESTRELA_OURO)]);

  /* =========================================================================
     AS 6 INSTANCIAS no circulo raio 14 (mesmos lugares de sempre)
     ========================================================================= */
  var matFeltro = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var matBrilho = new T.MeshBasicMaterial({ vertexColors: true });

  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(),
      vec = new T.Vector3(), esc = new T.Vector3();
  var centros = [];

  var instCorpo = new T.InstancedMesh(geoCorpo, matFeltro, N);
  var instApagado = new T.InstancedMesh(geoApagado, matFeltro, N);
  var instAceso = new T.InstancedMesh(geoAceso, matBrilho, N);
  instApagado.instanceMatrix.setUsage(T.DynamicDrawUsage);
  instAceso.instanceMatrix.setUsage(T.DynamicDrawUsage);
  instApagado.frustumCulled = false;
  instAceso.frustumCulled = false;

  /* escreve a matriz da instancia i com escala s (0 = some) */
  function matriz(inst, i, s) {
    var ang = (i / N) * Math.PI * 2;
    eul.set(0, -ang, 0);
    qua.setFromEuler(eul);
    vec.set(Math.cos(ang) * RAIO, 0, Math.sin(ang) * RAIO);
    esc.set(s, s, s);
    mtx.compose(vec, qua, esc);
    inst.setMatrixAt(i, mtx);
  }
  var halos = [];
  var VID_MEIO = VID_Y0 + VID_ALT * 0.55;
  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2;
    var px = Math.cos(ang) * RAIO, pz = Math.sin(ang) * RAIO;
    matriz(instCorpo, i, 1);
    matriz(instApagado, i, 1);   /* nasce apagado */
    matriz(instAceso, i, 0);
    centros.push({ x: px, z: pz });
    for (var h = 0; h < 3; h++) {
      halos.push(new T.PlaneGeometry(2.4, 2.4)
        .rotateY(h * Math.PI / 3).translate(px, VID_MEIO, pz));
    }
    ctx.COLISORES.push({ x: px, z: pz, raio: 0.32 });
  }
  instCorpo.instanceMatrix.needsUpdate = true;
  instApagado.instanceMatrix.needsUpdate = true;
  instAceso.instanceMatrix.needsUpdate = true;
  grupo.add(instCorpo);
  grupo.add(instApagado);
  grupo.add(instAceso);

  /* ---------- DC 4: halos (mesma receita de sempre) ---------- */
  var geoHalo = BGU.mergeBufferGeometries(halos);
  var nvH = geoHalo.attributes.position.count;
  geoHalo.setAttribute('color', new T.BufferAttribute(new Float32Array(nvH * 3), 3));
  var VH = nvH / N;
  var atHalo = geoHalo.attributes.color;

  var cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  var g2d = cv.getContext('2d');
  var grad = g2d.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0.00, 'rgba(255,244,214,1)');
  grad.addColorStop(0.20, 'rgba(255,209,102,0.70)');
  grad.addColorStop(0.52, 'rgba(255,193,86,0.20)');
  grad.addColorStop(1.00, 'rgba(255,176,62,0)');
  g2d.fillStyle = grad; g2d.fillRect(0, 0, 128, 128);
  var texHalo = new T.CanvasTexture(cv);
  texHalo.generateMipmaps = false; texHalo.minFilter = T.LinearFilter;

  var malhaHalo = new T.Mesh(geoHalo, new T.MeshBasicMaterial({
    map: texHalo, vertexColors: true, transparent: true,
    blending: T.AdditiveBlending, depthWrite: false, fog: false
  }));
  malhaHalo.renderOrder = 3;
  malhaHalo.frustumCulled = false;
  grupo.add(malhaHalo);

  function halo(i, brilho) {
    var arr = atHalo.array, ini = i * VH * 3, fim = ini + VH * 3;
    for (var k = ini; k < fim; k += 3) { arr[k] = brilho; arr[k + 1] = brilho; arr[k + 2] = brilho; }
  }

  /* ---------- API da mecanica (assinatura identica a versao antiga) ---------- */
  grupo.userData.total = N;
  grupo.userData.aceso = [false, false, false, false, false, false];

  function acender(i) {
    i = i | 0;
    if (i < 0 || i >= N || grupo.userData.aceso[i]) return false;
    grupo.userData.aceso[i] = true;
    matriz(instApagado, i, 0); instApagado.instanceMatrix.needsUpdate = true;
    matriz(instAceso, i, 1);   instAceso.instanceMatrix.needsUpdate = true;
    halo(i, 1);                atHalo.needsUpdate = true;
    return true;
  }
  function apagar(i) {
    i = i | 0;
    if (i < 0 || i >= N || !grupo.userData.aceso[i]) return false;
    grupo.userData.aceso[i] = false;
    matriz(instApagado, i, 1); instApagado.instanceMatrix.needsUpdate = true;
    matriz(instAceso, i, 0);   instAceso.instanceMatrix.needsUpdate = true;
    halo(i, 0);                atHalo.needsUpdate = true;
    return true;
  }
  grupo.userData.acender = acender;
  grupo.userData.apagar = apagar;

  return {
    grupo: grupo,
    acender: acender,
    apagar: apagar,
    update: function (t, dt) {
      var mexeu = false;
      for (var i = 0; i < N; i++) {
        if (!grupo.userData.aceso[i]) continue;
        matriz(instAceso, i, 1 + 0.04 * Math.sin(t * 2.2 + i * 1.1));      /* pulso de 4% */
        halo(i, 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 0.9))); /* respira */
        mexeu = true;
      }
      if (mexeu) { instAceso.instanceMatrix.needsUpdate = true; atHalo.needsUpdate = true; }
    },
    custo: { dc: 4, tri: 0 }   /* medir no harness apos integrar */
  };
};

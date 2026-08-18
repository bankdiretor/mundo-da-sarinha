/* parteLuminariasMundo -- as 30 luminarias ESTATICAS (sempre acesas)
   espalhadas pelas 5 zonas, substituindo os 30 postes finos antigos do
   encanto.js (familia 1 + as cupulas da familia 4) — pedido do Ivan de
   colocar a luminaria nova da ficha (partes/luminaria.js = fonte da
   receita) no mundo, trocando o que existia.

   POSICOES: extraidas da CENA VIVA (matrizes reais do InstancedMesh do
   encanto antes de remover — medidas, nao chutadas)... e depois
   AJUSTADAS: a troca das cerejeiras deslocou o gerador deterministico
   do encanto e os 6 postes da praca estavam EXATAMENTE dentro de 6
   arvores novas (mesmas coordenadas). 23 dos 30 pontos foram girados na
   borda da propria zona ate ficar a >=1.6 de qualquer arvore, >=2.2 dos
   6 lampioes mecanicos e >=1.5 entre si, respeitando corredores e
   portais cardeais (mesmas regras do gerador original).

   Escala 0.60-0.70 (os postes antigos eram ~1.65 de altura; a luminaria
   inteira tem 3.14 — encolhida vira lampiao de rua ~2.0, mantendo os 6
   da praca, em escala 1.0, como os herois). Versao SIMPLIFICADA da
   receita para caber no orcamento: sem barrinhas de canto no vidro e
   estrela sem bevel (de longe nao le; economiza ~2.4k tri no total).

   3 draw calls: corpo Lambert / vidro+estrela MeshBasic / halos
   aditivos. Sem instanceColor (sem o bug do material compartilhado). */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteLuminariasMundo = function (ctx) {
  var T = ctx.T, M = ctx.M, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'luminariasMundo';

  var DOURADO_CLARO = 0xffd88a, DOURADO_ESCURO = 0xe1b44a, VIDRO = 0xffe9b5,
      ROXO_MEDIO = 0x7d63b8, ROXO_ESCURO = 0x5a468a, ROXO_CLARO = 0xa48acf,
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
  function prisma(wTopo, wBase, alt, y0) {
    var g = new T.CylinderGeometry(wTopo * 0.5 * Math.SQRT2, wBase * 0.5 * Math.SQRT2, alt, 4, 1);
    g.rotateY(Math.PI / 4);
    g.translate(0, y0 + alt / 2, 0);
    return g;
  }

  /* ---------- receita da luminaria (simplificada; medidas de luminaria.js) ---------- */
  var corpo = [];
  corpo.push(pinta(new T.CircleGeometry(0.42, 12).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
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
  corpo.push(pinta(prisma(VID_W_TOPO + 0.05, VID_W_TOPO + 0.05, 0.055, VID_Y0 + VID_ALT - 0.02), DOURADO_CLARO, 0.14));
  corpo.push(pinta(prisma(VID_W_BASE + 0.045, VID_W_BASE + 0.045, 0.05, VID_Y0 - 0.025), DOURADO_ESCURO, 0.16));
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

  /* vidro quente (luz interna no meio) + estrela chapada, sempre acesos */
  var brilho = [];
  (function vidroQuente() {
    var g = prisma(VID_W_TOPO, VID_W_BASE, VID_ALT, VID_Y0);
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv');
    var cA = new T.Color(VIDRO).lerp(new T.Color(0xe9a84c), 0.35), cB = new T.Color(0xfff3cd);
    var pos = g.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var f = (pos.getY(i) - VID_Y0) / VID_ALT;
      var q = 1 - Math.min(1, Math.abs(f - 0.45) / 0.55);
      var c = cA.clone().lerp(cB, 0.30 + 0.70 * q);
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    brilho.push(g);
  })();
  var EST_Y = TOPO_Y0 + 0.29;
  (function estrelaChapada() {
    var forma = new T.Shape();
    var R1 = 0.16, R2 = 0.066;
    for (var i = 0; i < 10; i++) {
      var ang = Math.PI / 2 + (i / 10) * Math.PI * 2;
      var r = (i % 2 === 0) ? R1 : R2;
      var x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0) forma.moveTo(x, y); else forma.lineTo(x, y);
    }
    forma.closePath();
    var g = new T.ExtrudeGeometry(forma, { depth: 0.07, bevelEnabled: false });
    g.translate(0, 0, -0.035);
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv');
    var n2 = g.attributes.position.count, a2 = new Float32Array(n2 * 3);
    var cE = new T.Color(ESTRELA_OURO);
    for (var k = 0; k < n2; k++) { a2[k * 3] = cE.r; a2[k * 3 + 1] = cE.g; a2[k * 3 + 2] = cE.b; }
    g.setAttribute('color', new T.BufferAttribute(a2, 3));
    g.translate(0, EST_Y, 0);
    brilho.push(g);
  })();
  var geoBrilho = BGU.mergeBufferGeometries(brilho);

  /* =========================================================================
     OS 30 PONTOS (extraidos da cena e ajustados — ver header)
     praca 0-5 · jardim 6-11 · vilinha 12-17 · parque 18-23 · festa 24-29
     ========================================================================= */
  var PONTOS = [
    /* ⛔ AS 6 DA PRACA SAIRAM (auditoria 16/08): eram luminarias SEMPRE
       ACESAS, com o mesmo desenho, a ~2,5m dos 6 lampioes MECANICOS que a
       crianca precisa acender achando estrelinha. O jogo dizia "ache a
       estrelinha para acender" com um lampiao identico ja aceso ao lado —
       matava a leitura da mecanica-simbolo do mundo. A praca agora e
       territorio exclusivo dos lampioes de lampioes.js.
       (jardim/vilinha/parque/festa seguem iguais) */
    { x: -6.26, z: -48.21, rot: 0.41, s: 0.938 }, { x: -12.46, z: -44.70, rot: 0.28, s: 1.069 },
    { x: 14.74, z: -35.04, rot: 1.23, s: 0.964 }, { x: 12.73, z: -41.41, rot: -1.27, s: 1.068 },
    { x: -15.36, z: -39.30, rot: -0.84, s: 1.135 }, { x: -14.34, z: -36.58, rot: -0.73, s: 1.077 },
    { x: 16.56, z: 39.13, rot: 0.14, s: 1.117 }, { x: 11.36, z: 29.10, rot: -0.63, s: 1.106 },
    { x: -14.69, z: 46.64, rot: 1.03, s: 0.963 }, { x: -16.04, z: 40.52, rot: 1.38, s: 1.124 },
    { x: -7.45, z: 27.56, rot: -0.83, s: 1.142 }, { x: -10.02, z: 51.44, rot: -0.71, s: 1.037 },
    { x: 39.35, z: -11.43, rot: -1.36, s: 0.925 }, { x: 45.48, z: -11.84, rot: -0.31, s: 1.041 },
    { x: 32.46, z: -8.90, rot: 0.02, s: 0.929 }, { x: 32.45, z: 8.91, rot: -0.79, s: 1.069 },
    { x: 29.66, z: -4.11, rot: -1.37, s: 0.960 }, { x: 55.06, z: -4.27, rot: -0.95, s: 1.119 },
    { x: -36.82, z: 10.43, rot: -1.03, s: 1.095 }, { x: -32.26, z: -9.47, rot: 0.65, s: 1.076 },
    { x: -40.55, z: -12.19, rot: 0.77, s: 1.001 }, { x: -54.41, z: -2.60, rot: -1.38, s: 0.905 },
    { x: -50.76, z: -8.93, rot: 0.01, s: 1.062 }, { x: -29.70, z: -5.94, rot: -0.94, s: 0.978 }
  ];
  /* escala dos postes antigos (0.90-1.14 sobre 1.65 de altura) vira
     0.60-0.70 sobre a luminaria de 3.14 -> ~1.9 a 2.2 de altura final */
  function escalaLum(s) { return 0.60 + (s - 0.9) * 0.4; }

  var matFeltro = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var matBrilho = new T.MeshBasicMaterial({ vertexColors: true });
  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(),
      vec = new T.Vector3(), esc = new T.Vector3();

  function espalhar(geo, mat) {
    var inst = new T.InstancedMesh(geo, mat, PONTOS.length);
    for (var i = 0; i < PONTOS.length; i++) {
      var p = PONTOS[i], s = escalaLum(p.s);
      eul.set(0, p.rot, 0);
      qua.setFromEuler(eul);
      vec.set(p.x, 0, p.z);
      esc.set(s, s, s);
      mtx.compose(vec, qua, esc);
      inst.setMatrixAt(i, mtx);
    }
    inst.instanceMatrix.needsUpdate = true;
    return inst;
  }
  var instCorpo = espalhar(geoCorpo, matFeltro);
  instCorpo.name = 'luminarias_corpo';
  grupo.add(instCorpo);
  var instBrilho = espalhar(geoBrilho, matBrilho);
  instBrilho.name = 'luminarias_brilho';
  grupo.add(instBrilho);

  for (var c = 0; c < PONTOS.length; c++) {
    ctx.COLISORES.push({ x: PONTOS[c].x, z: PONTOS[c].z, raio: 0.28 * escalaLum(PONTOS[c].s) });
  }

  /* ---------- halos (1 malha so, posicoes cozidas) ---------- */
  var VID_MEIO = VID_Y0 + VID_ALT * 0.55;
  (function halos() {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    var g2d = cv.getContext('2d');
    var grad = g2d.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0.00, 'rgba(255,240,200,0.85)');
    grad.addColorStop(0.25, 'rgba(255,209,102,0.45)');
    grad.addColorStop(0.55, 'rgba(255,193,86,0.13)');
    grad.addColorStop(1.00, 'rgba(255,176,62,0)');
    g2d.fillStyle = grad; g2d.fillRect(0, 0, 128, 128);
    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false; tex.minFilter = T.LinearFilter;
    var planos = [];
    for (var i = 0; i < PONTOS.length; i++) {
      var p = PONTOS[i], s = escalaLum(p.s);
      for (var h = 0; h < 3; h++) {
        planos.push(new T.PlaneGeometry(1.6 * s, 1.6 * s)
          .rotateY(h * Math.PI / 3).translate(p.x, VID_MEIO * s, p.z));
      }
    }
    var m = new T.Mesh(BGU.mergeBufferGeometries(planos), new T.MeshBasicMaterial({
      map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false,
      color: 0xd9d0c0   /* um tico mais fraco que o halo dos 6 herois da praca */
    }));
    m.renderOrder = 3;
    m.name = 'luminarias_halo';
    grupo.add(m);
  })();

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 3, tri: 0 }   /* medir no harness apos integrar */
  };
};

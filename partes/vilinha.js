/* parteVilinha — o BAIRRO DAS CASAS: uma casinha de feltro desenhada uma vez e
   repetida em 24 cores diferentes (InstancedMesh = 1 draw call para o bairro
   inteiro). Cada crianca escolhe a SUA casa; a escolhida ganha bandeirinha.
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteVilinha = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'vilinha';

  var CZ = 40;                 /* centro da Vilinha: (0, +40) — ao SUL da praca */
  var CINZA = new T.Color(0x6a5a8f);

  function pinta(geo, cor, fBase) {
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.20 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var f = (ys[k] - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.25));
      a[k*3] = c.r; a[k*3+1] = c.g; a[k*3+2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  var matV = new T.MeshLambertMaterial({ vertexColors: true });

  /* ---- chao do bairro + ruazinha em anel ---- */
  (function chao() {
    var pecas = [];
    var g = new T.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
    g.scale(15.5, 1, 12.4);
    g.translate(0, 0.006, CZ);
    var verde = new T.Color(0xbcd6b0), longe = new T.Color(0x6f7fa8);
    var pos = g.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var ex = pos.getX(i) / 13, ez = (pos.getZ(i) - CZ) / 10;
      var kk = Math.min(1, Math.hypot(ex, ez));
      var c = verde.clone().lerp(longe, Math.pow(kk, 2.6) * 0.72);
      a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    g.deleteAttribute('uv');
    pecas.push(g);
    /* corredor da praca ate o bairro */
    var cor = new T.PlaneGeometry(5.2, 11).rotateX(-Math.PI / 2);
    cor.translate(0, 0.005, 23.5);
    pecas.push(pinta(cor, 0xbcd6b0, 0.1));
    /* rua em anel (calcada de feltro claro) */
    var rua = new T.RingGeometry(7.4, 10.2, 40).rotateX(-Math.PI / 2);
    rua.translate(0, 0.014, CZ);
    pecas.push(pinta(rua, 0xf0e2cf, 0.12));
    /* pracinha de entrada */
    var ent = new T.PlaneGeometry(5.2, 6).rotateX(-Math.PI / 2);
    ent.translate(0, 0.013, CZ - 13.5);
    pecas.push(pinta(ent, 0xf0e2cf, 0.12));
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- A CASINHA (desenhada UMA vez; a cor vem por instancia) ----
     Corpo branco puro: o instanceColor multiplica, entao a cor da crianca
     aparece limpa; telhado e porta vem escurecidos por vertice. */
  var geoCasa = (function () {
    var pecas = [];
    /* corpo */
    var corpo = new T.BoxGeometry(2.2, 1.7, 2.0);
    corpo.translate(0, 0.85, 0);
    pecas.push(pinta(corpo, 0xffffff, 0.05));
    /* telhado: prisma de 4 aguas simplificado (cone de 4 lados) */
    var telha = new T.ConeGeometry(1.85, 1.15, 4);
    telha.rotateY(Math.PI / 4);
    telha.translate(0, 2.28, 0);
    pecas.push(pinta(telha, 0xffffff, 0.12));
    /* chamine */
    var cham = new T.BoxGeometry(0.34, 0.7, 0.34);
    cham.translate(0.62, 2.55, -0.45);
    pecas.push(pinta(cham, 0xfafafa, 0.12));
    /* porta (mais escura, sempre no lado -Z = virado para a rua) */
    var porta = new T.BoxGeometry(0.62, 1.05, 0.1);
    porta.translate(0, 0.53, -1.02);
    pecas.push(pinta(porta, 0x8a6a52, 0.18));
    var maca = new T.SphereGeometry(0.055, 6, 5);
    maca.translate(0.2, 0.6, -1.08);
    pecas.push(pinta(maca, 0xffd166, 0.1));
    /* duas janelinhas com luz quente */
    [-0.68, 0.68].forEach(function (x) {
      var jan = new T.BoxGeometry(0.5, 0.5, 0.08);
      jan.translate(x, 1.12, -1.01);
      pecas.push(pinta(jan, 0xffe9a8, 0.05));
    });
    /* degrau */
    var deg = new T.BoxGeometry(0.9, 0.12, 0.4);
    deg.translate(0, 0.06, -1.18);
    pecas.push(pinta(deg, 0xf2ece0, 0.08));
    return BGU.mergeBufferGeometries(pecas);
  })();

  /* ---- 24 casas em anel, todas viradas para a rua ---- */
  var CORES = [
    0xff9bb0, 0xffc6d0, 0xffd166, 0xffe9a8, 0x9fd8f2, 0xbfe6ff,
    0xa8dCa0, 0xc9ecb8, 0xd9c9ff, 0xc0aef5, 0xffb98a, 0xffd6b0,
    0xf58fa0, 0xffe3b0, 0x8fd0e8, 0xa6e0d0, 0xcfe8a0, 0xe8c8f0,
    0xffb3c6, 0xb8e0f5
  ];
  var N_CASA = CORES.length;
  var CASAS = [];
  var instCasa = new T.InstancedMesh(geoCasa, matV, N_CASA);
  (function porCasas() {
    var m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3(1,1,1);
    for (var i = 0; i < N_CASA; i++) {
      var a = (i / N_CASA) * Math.PI * 2 + 0.13;
      var r = 12.6;
      var x = Math.cos(a) * r, z = CZ + Math.sin(a) * r * 0.80;
      /* a porta (lado -Z do modelo) tem de olhar para o centro do anel */
      var olhar = Math.atan2(x - 0, z - CZ) + Math.PI;
      e.set(0, olhar + Math.PI, 0);
      q.setFromEuler(e);
      v.set(x, 0, z);
      m.compose(v, q, s);
      instCasa.setMatrixAt(i, m);
      instCasa.setColorAt(i, new T.Color(CORES[i]));
      /* ponto da porta: 1,35 para fora do centro da casa, na direcao da rua */
      var dx = (0 - x), dz = (CZ - z), dd = Math.hypot(dx, dz) || 1;
      CASAS.push({
        i: i, x: x, z: z, cor: CORES[i],
        px: x + dx/dd * 1.5, pz: z + dz/dd * 1.5     /* onde a crianca fica para entrar */
      });
      ctx.COLISORES.push({ x: x, z: z, raio: 1.45 });
    }
    instCasa.instanceMatrix.needsUpdate = true;
    if (instCasa.instanceColor) instCasa.instanceColor.needsUpdate = true;
  })();
  grupo.add(instCasa);

  /* ---- arvorezinhas e cerquinhas entre as casas (1 malha) ---- */
  (function enfeites() {
    var pecas = [];
    for (var i = 0; i < N_CASA; i++) {
      var a = ((i + 0.5) / N_CASA) * Math.PI * 2 + 0.13;
      var x = Math.cos(a) * 12.6, z = CZ + Math.sin(a) * 12.6 * 0.80;
      if (i % 2 === 0) {
        var tr = new T.CylinderGeometry(0.11, 0.15, 0.9, 6);
        tr.translate(x, 0.45, z);
        pecas.push(pinta(tr, 0xb08968, 0.18));
        var copa = new T.SphereGeometry(0.62, 8, 6);
        copa.translate(x, 1.35, z);
        pecas.push(pinta(copa, i % 4 ? 0xa8cc9c : 0xbcd6b0, 0.24));
      } else {
        for (var k = -1; k <= 1; k++) {
          var est = new T.CapsuleGeometry(0.07, 0.34, 3, 5);
          est.translate(x + k * 0.35, 0.26, z);
          pecas.push(pinta(est, 0xf0e2cf, 0.16));
        }
      }
    }
    /* placa de boas-vindas na entrada do bairro */
    var poste = new T.CylinderGeometry(0.09, 0.09, 1.6, 6);
    poste.translate(-2.9, 0.8, CZ - 13.2);
    pecas.push(pinta(poste, 0xb08968, 0.2));
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- bandeirinha dourada que marca A SUA casa ---- */
  var bandeira = (function () {
    var pecas = [];
    var mastro = new T.CylinderGeometry(0.05, 0.05, 1.5, 6);
    mastro.translate(0, 0.75, 0);
    pecas.push(pinta(mastro, 0xf0e2cf, 0.1));
    var pano = new T.BoxGeometry(0.7, 0.42, 0.05);
    pano.translate(0.37, 1.3, 0);
    pecas.push(pinta(pano, 0xffd166, 0.08));
    var m = new T.Mesh(BGU.mergeBufferGeometries(pecas), matV);
    m.visible = false;
    grupo.add(m);
    return m;
  })();

  /* ---- API para o jogo ---- */
  grupo.userData.casas = CASAS;
  grupo.userData.centro = { x: 0, z: CZ, rx: 13, rz: 10 };
  grupo.userData.marcarCasa = function (i) {
    if (i < 0 || i >= N_CASA) return false;
    var c = CASAS[i];
    var dx = (0 - c.x), dz = (CZ - c.z), dd = Math.hypot(dx, dz) || 1;
    bandeira.position.set(c.x - dx/dd * 1.2, 0, c.z - dz/dd * 1.2);
    bandeira.visible = true;
    return true;
  };
  grupo.userData.corDaCasa = function (i) { return CORES[i % N_CASA]; };

  return {
    grupo: grupo,
    custo: { dc: 4, tri: 5200 },
    update: function (t) {
      if (bandeira.visible) bandeira.rotation.y = Math.sin(t * 1.4) * 0.25;
    }
  };
};

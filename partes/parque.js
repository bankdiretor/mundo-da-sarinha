/* parteParque — o PARQUE, a leste, logo depois da estacao do trenzinho.
   A estrela e a RODA GIGANTE: vale menos como brinquedo e mais como MIRANTE —
   a crianca sobe e ve a cidade inteira pequenininha (a imagem da Revelacao).
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteParque = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'parque';

  var PX = 42, PZ = 0;              /* centro do parque */
  /* A elipse ERA 12 x 11 e o parque vivia lotado: medido por grade de
     ocupacao, o carrossel novo NAO cabia em lugar nenhum (so a 70% do
     tamanho e espremido numa fresta ao lado da roda gigante). O mundo
     cresceu para caber os brinquedos.
     ⛔ Quem mexer em RX/RZ aqui tem de mexer JUNTO em:
       - AREAS do parque em trem.js (senao o trilho volta a cortar o parque);
       - LIMITE_ILHA em trem.js e RAIO_ILHA/gramado no HTML, se a cerca
         passar de onde o trem corre ou de onde a crianca anda. */
  var RX = 17, RZ = 16;             /* elipse do parque */
  var CINZA = new T.Color(0x6a5a8f);

  function pinta(geo, cor, fBase) {
    var c0 = new T.Color(cor), c1 = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.18 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y<minY) minY=y; if (y>maxY) maxY=y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var c = c1.clone().lerp(c0, Math.min(1, ((ys[k]-minY)/faixa) * 1.3));
      a[k*3]=c.r; a[k*3+1]=c.g; a[k*3+2]=c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  var matV = new T.MeshLambertMaterial({ vertexColors: true });

  /* ---- chao do parque + caminho de entrada ---- */
  (function chao() {
    var pecas = [];
    var g = new T.CircleGeometry(1, 40).rotateX(-Math.PI/2);
    g.scale(RX, 1, RZ);
    g.translate(PX, 0.006, PZ);
    /* ⛔ O piso do parque era verde-acinzentado (0xc6dcb4) derretendo para
       azul (0x6f7fa8) com expoente 2.6 e fator 0.72. Isso funcionava na
       elipse pequena; com o parque ampliado a area derretida DOMINOU e o
       parque virou uma mancha cinza-azulada no meio do gramado — o oposto do
       "verde predominante". Agora usa o MESMO verde do mundo (0xa9d18e), um
       tom acima no miolo, e so a beirada esfria. */
    var verde = new T.Color(0xb6dc9a), longe = new T.Color(0x8fae86);
    var pos = g.attributes.position, n = pos.count, a = new Float32Array(n*3);
    for (var i = 0; i < n; i++) {
      var ex = (pos.getX(i) - PX) / RX, ez = (pos.getZ(i) - PZ) / RZ;
      var kk = Math.min(1, Math.hypot(ex, ez));
      var c = verde.clone().lerp(longe, Math.pow(kk, 5) * 0.55);
      a[i*3]=c.r; a[i*3+1]=c.g; a[i*3+2]=c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    g.deleteAttribute('uv');
    pecas.push(g);
    /* caminho da estacao ate o parque (cruza o trilho: passagem de nivel) */
    var cam = new T.PlaneGeometry(14, 4.6).rotateX(-Math.PI/2);
    cam.translate(PX - 13, 0.012, PZ);
    pecas.push(pinta(cam, 0xf0e2cf, 0.10));
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ================= RODA GIGANTE =================
     Eixo em X: a roda vive no plano YZ, entao quem chega do oeste ve de frente. */
  var RG = { x: PX + 1.5, y: 9.2, z: PZ, raio: 7.6, n: 8, giro: 0 };

  (function estrutura() {
    var pecas = [];
    /* dois pares de pernas em A */
    [-2.4, 2.4].forEach(function (dx) {
      [-1, 1].forEach(function (dz) {
        var perna = new T.CylinderGeometry(0.26, 0.34, RG.y + 0.6, 7);
        perna.rotateX(dz * 0.20);
        perna.translate(RG.x + dx, (RG.y + 0.6) / 2, RG.z + dz * 1.9);
        pecas.push(pinta(perna, 0xe8536e, 0.22));
      });
    });
    /* eixo + cubo central */
    var eixo = new T.CylinderGeometry(0.26, 0.26, 5.6, 8);
    eixo.rotateZ(Math.PI / 2);
    eixo.translate(RG.x, RG.y, RG.z);
    pecas.push(pinta(eixo, 0xd8d2e8, 0.14));
    /* base/plataforma de embarque */
    var plat = new T.BoxGeometry(5.4, 0.34, 3.4);
    plat.translate(RG.x, 0.17, RG.z - 5.4);
    pecas.push(pinta(plat, 0xf0e2cf, 0.12));
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
    ctx.COLISORES.push({ x: RG.x - 2.4, z: RG.z + 1.9, raio: 0.5 });
    ctx.COLISORES.push({ x: RG.x + 2.4, z: RG.z + 1.9, raio: 0.5 });
    ctx.COLISORES.push({ x: RG.x - 2.4, z: RG.z - 1.9, raio: 0.5 });
    ctx.COLISORES.push({ x: RG.x + 2.4, z: RG.z - 1.9, raio: 0.5 });
  })();

  /* aro + raios: uma malha que gira inteira */
  var roda = new T.Group();
  (function aro() {
    var pecas = [];
    [-1, 1].forEach(function (lado) {
      var t = new T.TorusGeometry(RG.raio, 0.16, 6, 30);
      t.rotateY(Math.PI / 2);
      t.translate(lado * 1.5, 0, 0);
      pecas.push(pinta(t, 0xffd166, 0.16));
    });
    for (var i = 0; i < RG.n; i++) {
      var a = (i / RG.n) * Math.PI * 2;
      var raio = new T.BoxGeometry(3.2, 0.1, 0.1);
      raio.rotateY(Math.PI/2);
      raio.rotateX(-a);
      /* barra do centro ate a borda, no plano YZ */
      var barra = new T.BoxGeometry(0.1, RG.raio, 0.1);
      barra.translate(0, RG.raio / 2, 0);
      barra.rotateX(a);
      pecas.push(pinta(barra, 0xf7f2e8, 0.14));
      pecas.push(pinta(raio, 0xf7f2e8, 0.14));
    }
    var m = new T.Mesh(BGU.mergeBufferGeometries(pecas), matV);
    roda.add(m);
    roda.position.set(RG.x, RG.y, RG.z);
    grupo.add(roda);
  })();

  /* cabines: sempre na vertical (penduradas), num InstancedMesh */
  var instCab = null, CORES_CAB = [0xe8a7b2, 0x9fb4d8, 0xbcd6b0, 0xe9b44c,
                                   0xd9c9ff, 0xffb98a, 0x8fd0e8, 0xf58fa0];
  (function cabines() {
    var pecas = [];
    var casco = new T.BoxGeometry(1.5, 1.0, 1.5);
    casco.translate(0, -0.7, 0);
    pecas.push(casco);
    var teto = new T.ConeGeometry(1.2, 0.55, 6);
    teto.translate(0, 0.05, 0);
    pecas.push(teto);
    var haste = new T.CylinderGeometry(0.06, 0.06, 0.5, 5);
    haste.translate(0, 0.4, 0);
    pecas.push(haste);
    pecas.forEach(function (g) { g.deleteAttribute('uv'); });
    var geo = BGU.mergeBufferGeometries(pecas);
    /* branco puro: a cor vem por instancia */
    var n = geo.attributes.position.count, a = new Float32Array(n*3);
    for (var i = 0; i < n; i++) { a[i*3]=1; a[i*3+1]=1; a[i*3+2]=1; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    instCab = new T.InstancedMesh(geo, matV, RG.n);
    instCab.instanceMatrix.setUsage(T.DynamicDrawUsage);
    for (var k = 0; k < RG.n; k++) instCab.setColorAt(k, new T.Color(CORES_CAB[k]));
    if (instCab.instanceColor) instCab.instanceColor.needsUpdate = true;
    grupo.add(instCab);
  })();

  var mtx = new T.Matrix4(), qua = new T.Quaternion(), vec = new T.Vector3(), esc = new T.Vector3(1,1,1);
  function posCabine(i, giro) {
    var a = (i / RG.n) * Math.PI * 2 + giro;
    return { x: RG.x, y: RG.y + Math.cos(a) * RG.raio, z: RG.z + Math.sin(a) * RG.raio };
  }
  function porCabines(giro) {
    for (var i = 0; i < RG.n; i++) {
      var p = posCabine(i, giro);
      mtx.compose(vec.set(p.x, p.y, p.z), qua.identity(), esc);   /* sempre na vertical */
      instCab.setMatrixAt(i, mtx);
    }
    instCab.instanceMatrix.needsUpdate = true;
  }
  porCabines(0);

  /* ---- cerca + bandeirinhas ----
     ⛔ A gangorra de tabua e o "carrossel" de 3 bolinhas moravam aqui. Foram
     removidos: viraram pecas de verdade em partes/carrossel.js, playground.js
     e parque-extras.js, plantadas por brinquedos-parque.js. */
  (function enfeites() {
    var pecas = [];
    /* cerca do parque, com abertura no caminho (oeste) */
    var NE = 30;
    for (var k = 0; k < NE; k++) {
      var ang = (k / NE) * Math.PI * 2;
      var x = PX + Math.cos(ang) * (RX - 0.4), z = PZ + Math.sin(ang) * (RZ - 0.4);
      if (Math.cos(ang) < -0.75 && Math.abs(Math.sin(ang)) < 0.28) continue;   /* entrada */
      var est = new T.CapsuleGeometry(0.09, 0.5, 3, 5);
      est.translate(x, 0.34, z);
      pecas.push(pinta(est, 0xf0e2cf, 0.14));
      ctx.COLISORES.push({ x: x, z: z, raio: 0.3 });
    }
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- API ---- */
  grupo.userData.roda = { x: RG.x, y: RG.y, z: RG.z, raio: RG.raio, n: RG.n };
  grupo.userData.embarque = { x: RG.x, z: RG.z - 5.0 };
  grupo.userData.area = { cx: PX, cz: PZ, rx: RX, rz: RZ };
  grupo.userData.posCabine = function (i, giro) { return posCabine(i, giro); };
  /* cabineBaixa(giro) -> indice da cabine que esta no ponto de embarque */
  grupo.userData.cabineBaixa = function (giro) {
    var melhor = 0, menorY = 1e9;
    for (var i = 0; i < RG.n; i++) {
      var p = posCabine(i, giro);
      if (p.y < menorY) { menorY = p.y; melhor = i; }
    }
    return melhor;
  };
  grupo.userData.girar = function (giro) {
    RG.giro = giro;
    roda.rotation.x = giro;
    porCabines(giro);
  };

  return {
    grupo: grupo,
    custo: { dc: 4, tri: 7400 },
    update: function (t, dt) { }
  };
};

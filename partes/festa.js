/* parteFesta — o PALCO DA FESTINHA, a oeste. Aqui toca "Viva, Viva Você" e a
   crianca danca na batida real; a cada acerto sobe um balao colorido.
   Confirma a regra do mundo: cada musica nova = uma regiao nova.
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteFesta = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'festa';

  /* MUDOU 17/08 (organizacao do mapa, decisao do Ivan): o Palco saiu do
     oeste (-42,0) e foi para o SUDOESTE, o setor que o mapa-mestre do GPT
     reservava para a Radio. Com isso o oeste fica livre para a Radio, que
     hoje mora DENTRO da praca (-13,-13) e rouba o quadrante noroeste dela
     — defeito apontado na auditoria dos arquitetos. */
  var FX = -40, FZ = 25, RX = 12, RZ = 11;
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

  /* ---- chao + pista de danca xadrez ---- */
  (function chao() {
    var pecas = [];
    var g = new T.CircleGeometry(1, 40).rotateX(-Math.PI/2);
    g.scale(RX, 1, RZ);
    g.translate(FX, 0.006, FZ);
    var base = new T.Color(0xe8d9f2), longe = new T.Color(0x6f7fa8);
    var pos = g.attributes.position, n = pos.count, a = new Float32Array(n*3);
    for (var i = 0; i < n; i++) {
      var ex = (pos.getX(i) - FX) / RX, ez = (pos.getZ(i) - FZ) / RZ;
      var kk = Math.min(1, Math.hypot(ex, ez));
      var c = base.clone().lerp(longe, Math.pow(kk, 2.6) * 0.7);
      a[i*3]=c.r; a[i*3+1]=c.g; a[i*3+2]=c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    g.deleteAttribute('uv');
    pecas.push(g);
    /* caminho da praca ate a festa */
    var cam = new T.PlaneGeometry(14, 4.6).rotateX(-Math.PI/2);
    cam.translate(FX + 13, 0.012, FZ);
    pecas.push(pinta(cam, 0xf0e2cf, 0.10));
    /* pista xadrez em frente ao palco */
    for (var lx = -3; lx <= 3; lx++) {
      for (var lz = -3; lz <= 3; lz++) {
        if ((lx + lz) % 2) continue;
        var q = new T.PlaneGeometry(1.5, 1.5).rotateX(-Math.PI/2);
        q.translate(FX + 2.2 + lx * 1.5, 0.015, FZ + lz * 1.5);
        pecas.push(pinta(q, (lx + lz) % 4 === 0 ? 0xffc6d0 : 0xd9c9ff, 0.10));
      }
    }
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- PALCO redondo elevado + fundo + caixas de som ---- */
  var PALCO = { x: FX - 4.5, z: FZ, raio: 4.0, alt: 0.55 };
  (function palco() {
    var pecas = [];
    var base = new T.CylinderGeometry(PALCO.raio, PALCO.raio + 0.25, PALCO.alt, 22);
    base.translate(PALCO.x, PALCO.alt/2, PALCO.z);
    pecas.push(pinta(base, 0xe8536e, 0.20));
    var tampo = new T.CylinderGeometry(PALCO.raio - 0.1, PALCO.raio - 0.1, 0.08, 22);
    tampo.translate(PALCO.x, PALCO.alt + 0.04, PALCO.z);
    pecas.push(pinta(tampo, 0xf7f2e8, 0.10));
    /* degraus na frente (lado +x, de onde a crianca chega) */
    for (var d = 0; d < 2; d++) {
      var deg = new T.BoxGeometry(2.2, 0.18, 0.6);
      deg.translate(PALCO.x + PALCO.raio + 0.3 + d * 0.6, 0.09 + (1-d) * 0.18, PALCO.z);
      pecas.push(pinta(deg, 0xf0e2cf, 0.14));
    }
    /* cortina de fundo em arco */
    for (var i = 0; i < 9; i++) {
      var a = Math.PI * 0.5 + (i / 8) * Math.PI;
      var pano = new T.BoxGeometry(0.9, 3.4, 0.16);
      pano.rotateY(-a + Math.PI/2);
      pano.translate(PALCO.x + Math.cos(a) * (PALCO.raio - 0.2), 1.7 + PALCO.alt,
                     PALCO.z + Math.sin(a) * (PALCO.raio - 0.2));
      pecas.push(pinta(pano, i % 2 ? 0xffd166 : 0xffc6d0, 0.18));
    }
    /* 2 caixas de som */
    [-1, 1].forEach(function (lado) {
      var cx = new T.BoxGeometry(1.0, 1.7, 0.9);
      cx.translate(PALCO.x + 1.0, 0.85, PALCO.z + lado * (PALCO.raio + 0.9));
      pecas.push(pinta(cx, 0x4a4258, 0.16));
      var alto = new T.CylinderGeometry(0.32, 0.32, 0.12, 10);
      alto.rotateZ(Math.PI/2);
      alto.translate(PALCO.x + 1.52, 1.05, PALCO.z + lado * (PALCO.raio + 0.9));
      pecas.push(pinta(alto, 0xd8d2e8, 0.10));
      ctx.COLISORES.push({ x: PALCO.x + 1.0, z: PALCO.z + lado * (PALCO.raio + 0.9), raio: 0.7 });
    });
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- guirlandas de bandeirinhas em volta ---- */
  (function bandeirinhas() {
    var pecas = [];
    for (var i = 0; i < 40; i++) {
      var a = (i / 40) * Math.PI * 2;
      var r = 8.6 + Math.sin(a * 3) * 0.4;
      var x = FX + Math.cos(a) * r, z = FZ + Math.sin(a) * r;
      var y = 2.9 + Math.sin(a * 5) * 0.35;
      var tri = new T.ConeGeometry(0.22, 0.5, 3);
      tri.rotateX(Math.PI);
      tri.rotateY(a);
      tri.translate(x, y, z);
      pecas.push(pinta(tri, [0xff9bb0, 0xffd166, 0x9fd8f2, 0xa8dca0][i % 4], 0.12));
    }
    /* 4 postes segurando as guirlandas */
    for (var k = 0; k < 4; k++) {
      var a2 = (k / 4) * Math.PI * 2 + 0.4;
      var px = FX + Math.cos(a2) * 8.8, pz = FZ + Math.sin(a2) * 8.8;
      var po = new T.CylinderGeometry(0.11, 0.13, 3.4, 6);
      po.translate(px, 1.7, pz);
      pecas.push(pinta(po, 0xb08968, 0.18));
      ctx.COLISORES.push({ x: px, z: pz, raio: 0.35 });
    }
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- BALOES: sobem a cada acerto da danca (InstancedMesh) ---- */
  var N_BAL = 16, instBal = null, balEstado = [];
  var CORES_BAL = [0xff6b8a, 0xffd166, 0x7fd0f2, 0x9be08a, 0xd9a7f0, 0xffa06b,
                   0xff8fb0, 0xffe08a, 0x8fd8ff, 0xb0e89a, 0xc8a0e8, 0xffb88a,
                   0xff7fa0, 0xffd97a, 0x9fd8f2, 0xa8dca0];
  (function baloes() {
    var pecas = [];
    var bal = new T.SphereGeometry(0.42, 10, 8);
    bal.scale(1, 1.22, 1);
    bal.translate(0, 0.5, 0);
    pecas.push(bal);
    var no = new T.ConeGeometry(0.1, 0.2, 5);
    no.translate(0, 0.02, 0);
    pecas.push(no);
    pecas.forEach(function (g) { g.deleteAttribute('uv'); });
    var geo = BGU.mergeBufferGeometries(pecas);
    var n = geo.attributes.position.count, a = new Float32Array(n*3);
    for (var i = 0; i < n; i++) { a[i*3]=1; a[i*3+1]=1; a[i*3+2]=1; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    instBal = new T.InstancedMesh(geo, matV, N_BAL);
    instBal.instanceMatrix.setUsage(T.DynamicDrawUsage);
    for (var k = 0; k < N_BAL; k++) {
      instBal.setColorAt(k, new T.Color(CORES_BAL[k]));
      balEstado.push({ solto: false, t0: 0, x: 0, z: 0 });
    }
    if (instBal.instanceColor) instBal.instanceColor.needsUpdate = true;
    grupo.add(instBal);
  })();

  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(),
      vec = new T.Vector3(), esc = new T.Vector3(1,1,1), zero = new T.Vector3(0,0,0);
  function porBaloes(t) {
    for (var i = 0; i < N_BAL; i++) {
      var b = balEstado[i];
      if (!b.solto) { mtx.compose(vec.set(0,-999,0), qua.identity(), zero); }
      else {
        var dt = t - b.t0;
        var y = 0.7 + dt * 1.5;
        if (y > 16) { b.solto = false; mtx.compose(vec.set(0,-999,0), qua.identity(), zero); }
        else {
          eul.set(0, 0, Math.sin(t * 1.6 + i) * 0.12);
          qua.setFromEuler(eul);
          vec.set(b.x + Math.sin(t * 0.8 + i) * 0.5, y, b.z + Math.cos(t * 0.7 + i) * 0.4);
          mtx.compose(vec, qua, esc);
        }
      }
      instBal.setMatrixAt(i, mtx);
    }
    instBal.instanceMatrix.needsUpdate = true;
  }

  /* ---- luzes do palco: aneis que pulsam na batida ---- */
  var anelPalco = new T.Mesh(
    new T.RingGeometry(2.6, 3.3, 26).rotateX(-Math.PI/2),
    new T.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.55, depthWrite: false }));
  anelPalco.position.set(PALCO.x, PALCO.alt + 0.1, PALCO.z);
  grupo.add(anelPalco);
  var pulso = 0;

  /* ---- API ---- */
  grupo.userData.palco = { x: PALCO.x, z: PALCO.z, raio: PALCO.raio, alt: PALCO.alt };
  grupo.userData.area = { cx: FX, cz: FZ, rx: RX, rz: RZ };
  grupo.userData.totalBaloes = N_BAL;
  grupo.userData.soltarBalao = function (i, t) {
    if (i < 0 || i >= N_BAL) return false;
    var b = balEstado[i % N_BAL];
    var a = (i / N_BAL) * Math.PI * 2;
    b.solto = true; b.t0 = t;
    b.x = PALCO.x + Math.cos(a) * (PALCO.raio + 1.6);
    b.z = PALCO.z + Math.sin(a) * (PALCO.raio + 1.6);
    return true;
  };
  grupo.userData.pulsarPalco = function () { pulso = 1; };

  return {
    grupo: grupo,
    custo: { dc: 5, tri: 9200 },
    update: function (t, dt) {
      porBaloes(t);
      pulso *= 0.90;
      anelPalco.scale.setScalar(1 + pulso * 0.16);
      anelPalco.material.opacity = 0.35 + pulso * 0.5;
    }
  };
};

/* parteCordeiro — o CORDEIRINHO, o amigo da crianca. Espera na praca ate ser
   adotado; depois anda junto para sempre (inclusive dentro do quartinho).
   A crianca cuida do cordeiro enquanto aprende que Deus cuida dela (Salmo 23).
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCordeiro = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'cordeiro';

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    var c0 = new T.Color(cor), c1 = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.16 : fBase);
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

  var LA = 0xfdf6ec, ESCURO = 0x4a4258, FOCINHO = 0xf3b8c2;

  /* ---- corpo de la: 5 esferas fofas + cabeca + orelhas + rabinho (1 DC) ---- */
  var corpo = new T.Group();
  (function montarCorpo() {
    var pecas = [];
    /* tufos de la do lombo */
    [[0,0.42,0,0.30],[0.20,0.46,0.06,0.24],[-0.20,0.46,0.06,0.24],
     [0.10,0.40,-0.20,0.22],[-0.10,0.40,-0.20,0.22]].forEach(function(t){
      var e = new T.SphereGeometry(t[3], 9, 7);
      e.translate(t[0], t[1], t[2]);
      pecas.push(pinta(e, LA, 0.10));
    });
    /* cabeca (frente = -Z, igual ao bonequinho) */
    var cab = new T.SphereGeometry(0.19, 10, 8);
    cab.scale(1, 1.05, 1.15);
    cab.translate(0, 0.52, -0.34);
    pecas.push(pinta(cab, ESCURO, 0.10));
    var top = new T.SphereGeometry(0.15, 9, 7);
    top.translate(0, 0.63, -0.30);
    pecas.push(pinta(top, LA, 0.08));
    var foc = new T.SphereGeometry(0.07, 8, 6);
    foc.scale(1, 0.8, 1.1);
    foc.translate(0, 0.46, -0.50);
    pecas.push(pinta(foc, FOCINHO, 0.08));
    /* olhinhos */
    [-0.085, 0.085].forEach(function(x){
      var o = new T.SphereGeometry(0.032, 7, 6);
      o.translate(x, 0.55, -0.47);
      pecas.push(pinta(o, 0x1d1a24, 0.02));
    });
    /* orelhas */
    [-1, 1].forEach(function(s){
      var or = new T.SphereGeometry(0.075, 8, 6);
      or.scale(1.5, 0.55, 0.9);
      or.rotateZ(s * 0.5);
      or.translate(s * 0.21, 0.56, -0.32);
      pecas.push(pinta(or, ESCURO, 0.12));
    });
    /* rabinho */
    var rab = new T.SphereGeometry(0.09, 8, 6);
    rab.translate(0, 0.44, 0.30);
    pecas.push(pinta(rab, LA, 0.08));
    var m = new T.Mesh(BGU.mergeBufferGeometries(pecas), matV);
    corpo.add(m);
  })();
  grupo.add(corpo);

  /* ---- 4 patinhas num UNICO InstancedMesh (4 draw calls viraram 1) ---- */
  var instPata = null, POS_PATA = [[-0.14, -0.20], [0.14, -0.20], [-0.14, 0.16], [0.14, 0.16]];
  (function montarPatas() {
    var perna = new T.CapsuleGeometry(0.055, 0.18, 3, 6);
    perna.translate(0, -0.13, 0);
    var casco = new T.SphereGeometry(0.062, 7, 6);
    casco.scale(1, 0.8, 1.15);
    casco.translate(0, -0.26, -0.01);
    var geo = BGU.mergeBufferGeometries([
      pinta(perna, ESCURO, 0.12), pinta(casco, 0x37323f, 0.10)
    ]);
    instPata = new T.InstancedMesh(geo, matV, 4);
    instPata.instanceMatrix.setUsage(T.DynamicDrawUsage);
    corpo.add(instPata);
  })();
  var mtxP = new T.Matrix4(), quaP = new T.Quaternion(), eulP = new T.Euler(),
      vecP = new T.Vector3(), escP = new T.Vector3(1, 1, 1);
  function porPatas(angs) {
    for (var i = 0; i < 4; i++) {
      eulP.set(angs[i], 0, 0);
      quaP.setFromEuler(eulP);
      vecP.set(POS_PATA[i][0], 0.30, POS_PATA[i][1]);
      instPata.setMatrixAt(i, mtxP.compose(vecP, quaP, escP));
    }
    instPata.instanceMatrix.needsUpdate = true;
  }
  porPatas([0, 0, 0, 0]);

  /* ---- coracaozinho que flutua quando ele ainda nao tem dono ---- */
  var coracao = (function () {
    var cv = document.createElement('canvas'); cv.width = cv.height = 64;
    var cx = cv.getContext('2d');
    cx.fillStyle = '#ff8fb0';
    cx.beginPath();
    cx.moveTo(32, 50);
    cx.bezierCurveTo(4, 30, 12, 8, 32, 22);
    cx.bezierCurveTo(52, 8, 60, 30, 32, 50);
    cx.fill();
    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false; tex.minFilter = T.LinearFilter;
    var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.setScalar(0.55);
    sp.position.set(0, 1.15, 0);
    grupo.add(sp);
    return sp;
  })();

  /* ---- API ---- */
  var passo = 0;
  grupo.userData.NOMES = ['Nuvem', 'Floquinho', 'Pipoca', 'Neve', 'Mel', 'Bento'];
  grupo.userData.mostrarCoracao = function (v) { coracao.visible = !!v; };
  /* animar(t, vel, olhando): vel em m/s; olhando = angulo Y para onde virar */
  grupo.userData.animar = function (t, vel, olhando) {
    var andando = vel > 0.35;
    passo += vel * 0.055;
    var amp = andando ? 0.55 : 0;
    var w = Math.sin(passo * 4);
    porPatas([w * amp, -w * amp, -w * amp, w * amp]);
    corpo.position.y = andando ? Math.abs(Math.sin(passo * 4)) * 0.045 : Math.sin(t * 1.6) * 0.012;
    corpo.rotation.z = andando ? Math.sin(passo * 2) * 0.05 : 0;
    if (coracao.visible) coracao.position.y = 1.15 + Math.sin(t * 2.2) * 0.09;
  };
  grupo.userData.pular = function () { corpo.position.y = 0.28; };

  return { grupo: grupo, custo: { dc: 5, tri: 2400 } };
};

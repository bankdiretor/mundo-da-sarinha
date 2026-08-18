/* parteFlores — as 16 flores que desabrocham na batida da musica, + arvores e cerca.
   Contrato: partes/CONTRATO.md. Sem luz nova, sem asset externo, cor por vertice. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteFlores = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'flores';

  function pinta(geo, cor) {
    var c = new T.Color(cor), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  var matV = new T.MeshLambertMaterial({ vertexColors: true });

  /* ---- posicoes: 2 arcos ao redor do coreto (0,-44), fugindo do caminho ----
     O caminho chega pelo lado +z, entao o setor de 70 a 110 graus fica livre. */
  var CORETO = { x: 0, z: -44 };
  var FLORES = [];
  (function posicionar() {
    [{ r: 5.2, n: 8, off: 0.15 }, { r: 7.1, n: 8, off: 0.55 }].forEach(function (arco) {
      var vao = 0;
      for (var i = 0; i < arco.n; i++) {
        /* 290 graus uteis (pula a entrada do caminho) */
        var a = arco.off + (i / arco.n) * (Math.PI * 2 * 0.805) + Math.PI * 0.61;
        FLORES.push({
          x: CORETO.x + Math.cos(a) * arco.r,
          z: CORETO.z + Math.sin(a) * arco.r,
          cor: [0xe8a7b2, 0xe9b44c, 0xd9c9ff, 0xf4edde][FLORES.length % 4]
        });
        vao++;
      }
    });
  })();
  var TOTAL = FLORES.length;   /* 16 */

  /* ---- caule + botao: 1 InstancedMesh (o botao some quando a flor abre) ---- */
  var geoBotao = (function () {
    var pecas = [];
    var caule = new T.CylinderGeometry(0.045, 0.06, 0.62, 5);
    caule.translate(0, 0.31, 0);
    pecas.push(pinta(caule, 0x7fae72));
    var botao = new T.SphereGeometry(0.14, 8, 6);
    botao.scale(1, 1.25, 1);
    botao.translate(0, 0.70, 0);
    pecas.push(pinta(botao, 0x9ec48c));
    return BGU.mergeBufferGeometries(pecas);
  })();
  var instBotao = new T.InstancedMesh(geoBotao, matV, TOTAL);
  instBotao.instanceMatrix.setUsage(T.DynamicDrawUsage);

  /* ---- corola aberta: 1 InstancedMesh (escala 0 ate desabrochar) ---- */
  var geoCorola = (function () {
    var pecas = [];
    for (var p = 0; p < 5; p++) {
      var ang = (p / 5) * Math.PI * 2;
      var pet = new T.SphereGeometry(0.17, 8, 6);
      pet.scale(1, 0.34, 1.5);
      pet.rotateY(-ang);
      pet.translate(Math.cos(ang) * 0.2, 0, Math.sin(ang) * 0.2);
      pet.deleteAttribute('uv');       /* sem isso o merge devolve null (armadilha do contrato) */
      pecas.push(pet);
    }
    var g = BGU.mergeBufferGeometries(pecas);
    /* petalas brancas: a cor real vem por instancia (setColorAt) */
    var n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i*3] = 1; a[i*3+1] = 1; a[i*3+2] = 1; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    var miolo = new T.SphereGeometry(0.085, 8, 6);
    miolo.deleteAttribute('uv');
    var nm = miolo.attributes.position.count, am = new Float32Array(nm * 3);
    var cm = new T.Color(0xffd166);
    for (var k = 0; k < nm; k++) { am[k*3] = cm.r; am[k*3+1] = cm.g; am[k*3+2] = cm.b; }
    miolo.setAttribute('color', new T.BufferAttribute(am, 3));
    return BGU.mergeBufferGeometries([g, miolo]);
  })();
  var instCorola = new T.InstancedMesh(geoCorola, matV, TOTAL);
  instCorola.instanceMatrix.setUsage(T.DynamicDrawUsage);

  /* estado por flor */
  var estado = [];
  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(),
      vec = new T.Vector3(), esc = new T.Vector3();
  for (var i = 0; i < TOTAL; i++) {
    estado.push({ aberta: false, t0: -1, k: 0 });
    instCorola.setColorAt(i, new T.Color(FLORES[i].cor));
  }
  if (instCorola.instanceColor) instCorola.instanceColor.needsUpdate = true;

  function matrizBotao(i, t) {
    var e = estado[i], f = FLORES[i];
    var enc = e.aberta ? Math.max(0, 1 - e.k * 1.6) : 1;   /* encolhe ao abrir */
    if (enc <= 0.001) { mtx.compose(vec.set(0, -999, 0), qua.identity(), esc.set(0,0,0)); }
    else {
      var bal = Math.sin(t * 1.5 + i) * 0.05;
      eul.set(bal, i * 0.7, bal * 0.6);
      qua.setFromEuler(eul);
      mtx.compose(vec.set(f.x, 0, f.z), qua, esc.set(enc, enc, enc));
    }
    instBotao.setMatrixAt(i, mtx);
  }
  function matrizCorola(i, t) {
    var e = estado[i], f = FLORES[i];
    if (!e.aberta) { mtx.compose(vec.set(0, -999, 0), qua.identity(), esc.set(0,0,0)); }
    else {
      /* pop com overshoot: 0 -> 1.25 -> 1.0 em ~250 ms */
      var k = Math.min(1, e.k);
      var s = k < 0.6 ? (k / 0.6) * 1.25 : 1.25 - ((k - 0.6) / 0.4) * 0.25;
      var bal = Math.sin(t * 1.7 + i * 0.8) * 0.07;
      eul.set(bal, i * 0.7, bal * 0.5);
      qua.setFromEuler(eul);
      mtx.compose(vec.set(f.x, 0.74, f.z), qua, esc.set(s, s, s));
    }
    instCorola.setMatrixAt(i, mtx);
  }
  for (var j = 0; j < TOTAL; j++) { matrizBotao(j, 0); matrizCorola(j, 0); }
  instBotao.instanceMatrix.needsUpdate = true;
  instCorola.instanceMatrix.needsUpdate = true;
  grupo.add(instBotao);
  grupo.add(instCorola);

  /* ---- cerca da borda (uma malha so) ----
     as 2 arvores de algodao que moravam aqui foram substituidas pela
     arvore-flor nova (partes/arvores-mundo.js, grupo B_JARDIM_GRANDES,
     mesmas coordenadas x:-9.5,z:-33.5 e x:10.2,z:-39.5) - pedido do
     Ivan de trocar toda arvore antiga do jogo pela nova. */
  var fixos = [];
  (function () {
    /* cerca acompanhando a elipse do jardim, com abertura no corredor */
    var NE = 34;
    for (var i = 0; i < NE; i++) {
      var a = (i / NE) * Math.PI * 2;
      var x = Math.cos(a) * 12.4, z = -38 + Math.sin(a) * 9.5;
      if (z > -29.5 && Math.abs(x) < 3.4) continue;          /* deixa a entrada livre */
      var est = new T.CapsuleGeometry(0.09, 0.5, 3, 6);
      est.translate(x, 0.34, z);
      fixos.push(pinta(est, 0xf0e2cf));
      var trav = new T.BoxGeometry(0.9, 0.07, 0.07);
      trav.rotateY(-a);
      trav.translate(x, 0.42, z);
      fixos.push(pinta(trav, 0xe6d3ba));
      ctx.COLISORES.push({ x: x, z: z, raio: 0.3 });
    }
  })();
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(fixos), matV));

  /* ---- API para o jogo ---- */
  grupo.userData.total = TOTAL;
  grupo.userData.desabrochar = function (i) {
    if (i < 0 || i >= TOTAL) return false;
    if (estado[i].aberta) return false;
    estado[i].aberta = true;
    estado[i].t0 = -1;      /* o update marca o inicio no proximo quadro */
    estado[i].k = 0;
    return true;
  };
  grupo.userData.abertas = function () {
    var n = 0;
    for (var i = 0; i < TOTAL; i++) if (estado[i].aberta) n++;
    return n;
  };

  return {
    grupo: grupo,
    custo: { dc: 3, tri: 2900 },
    update: function (t, dt) {
      var mudou = false;
      for (var i = 0; i < TOTAL; i++) {
        var e = estado[i];
        if (e.aberta && e.k < 1) {
          if (e.t0 < 0) e.t0 = t;
          e.k = Math.min(1, (t - e.t0) / 0.25);
          mudou = true;
        }
        matrizBotao(i, t);
        matrizCorola(i, t);
      }
      instBotao.instanceMatrix.needsUpdate = true;
      instCorola.instanceMatrix.needsUpdate = true;
    }
  };
};

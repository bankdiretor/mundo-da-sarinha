/* parteCaminho — chao do Jardim + trilha de pedrinhas do portal ao coreto.
   Contrato: partes/CONTRATO.md. Sem luz nova, sem asset externo, cor por vertice. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCaminho = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'caminho';

  function pinta(geo, cor) {
    var c = new T.Color(cor), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  var matV = new T.MeshLambertMaterial({ vertexColors: true });

  /* ---- 1) chao do Jardim: elipse 26x20 em (0,-38) + corredor ate a praca ----
     A borda externa e pintada puxando para a nevoa, senao aparece um recorte
     duro contra o horizonte (armadilha do cenario claro). */
  var chao = [];
  (function () {
    var verde = new T.Color(0xa8cc9c), longe = new T.Color(0x6f7fa8);
    var g = new T.CircleGeometry(1, 44).rotateX(-Math.PI / 2);
    g.scale(13, 1, 10);
    g.translate(0, 0.006, -38);
    var pos = g.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var ex = pos.getX(i) / 13, ez = (pos.getZ(i) + 38) / 10;
      var k = Math.min(1, Math.hypot(ex, ez));
      var c = verde.clone().lerp(longe, Math.pow(k, 2.6) * 0.75);
      a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    g.deleteAttribute('uv');
    chao.push(g);
    /* corredor: liga a praca ao jardim.
       ⛔ era 0xa8cc9c — a MESMA cor da grama: o caminho existia no chao e
       nao existia para o olho, e a crianca "atravessava o vazio" ate o
       jardim. Agora usa o creme 0xf0e2cf das avenidas leste/oeste, que
       ja estava aprovado no mundo. */
    var cor = new T.PlaneGeometry(5.2, 11).rotateX(-Math.PI / 2);
    cor.translate(0, 0.005, -23.5);
    chao.push(pinta(cor, 0xf0e2cf));
  })();
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(chao), matV));

  /* ---- 2) trilha de pedrinhas: serpenteia de (0,-20) ate (0,-40.5) ----
     Curva usada (a integracao pode reproduzir): x = 3*sin((z+20)/20.5 * PI*1.15) */
  function curvaX(z) { return 3 * Math.sin(((z + 20) / -20.5) * Math.PI * 1.15); }
  var N_PEDRA = 92;
  (function pedrinhas() {
    var geo = new T.SphereGeometry(1, 7, 5);
    geo.scale(1, 0.34, 1.15);
    geo.deleteAttribute('uv');
    var mat = new T.MeshLambertMaterial({});
    var inst = new T.InstancedMesh(geo, mat, N_PEDRA);
    var tons = [new T.Color(0xf4edde), new T.Color(0xf0dfe4), new T.Color(0xdcd8ea)];
    var m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3();
    for (var i = 0; i < N_PEDRA; i++) {
      var t = i / (N_PEDRA - 1);
      var z = -20 - t * 20.5;
      var x = curvaX(z);
      /* espalha um pouco para os lados: trilha de pedrinha nao e linha reta */
      var lado = ((i % 3) - 1) * 0.55 + (i % 7) * 0.06;
      var r = 0.22 + ((i * 37) % 100) / 100 * 0.2;
      e.set(0, (i * 1.7) % 3.14, 0);
      q.setFromEuler(e);
      v.set(x + lado, 0.03, z);
      s.set(r, r, r);
      m.compose(v, q, s);
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, tons[i % 3]);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    grupo.add(inst);
  })();

  /* ---- 3) canteiros de terra ladeando a trilha, com tufos de grama ---- */
  var canteiros = [];
  (function () {
    var terra = 0xc7a98b;
    /* canteirinhos DISCRETOS: a v1 tinha raio 1,5-2,0 e virou um deserto que
       comia o jardim inteiro. Aqui sao pocinhas de terra so na beira da trilha. */
    for (var i = 0; i < 10; i++) {
      var t = i / 9;
      var z = -22.5 - t * 16;
      var x = curvaX(z);
      [-1, 1].forEach(function (lado) {
        var d = new T.CircleGeometry(1, 8).rotateX(-Math.PI / 2);
        d.scale(0.52 + (i % 3) * 0.09, 1, 0.42);
        d.translate(x + lado * 1.35, 0.014, z);
        canteiros.push(pinta(d, terra));
        var tufo = new T.ConeGeometry(0.13, 0.36, 5);
        tufo.translate(x + lado * 1.35, 0.18, z + 0.1);
        canteiros.push(pinta(tufo, (i % 2) ? 0xbcd6b0 : 0xa8cc9c));
      });
    }
  })();
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(canteiros), matV));

  return {
    grupo: grupo,
    custo: { dc: 3, tri: 2600 },
    curvaX: curvaX
  };
};

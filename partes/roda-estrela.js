/* parteRodaEstrela — o CORACAO VISUAL da roda-gigante: estrela dourada grande
   e brilhante presa no eixo central, com moldura, halo de luz e sparkles soltos.
   So COBRE visualmente o eixo cinza que ja existe em parque.js (nao mexe nele).
   Contrato: partes/CONTRATO.md. NAO EDITAR parque.js — so leio as coordenadas
   publicadas la (eixo da roda-gigante: 43.5, 9.2, 0 / raio 7.6). */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteRodaEstrela = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'roda-estrela';

  /* eixo da roda-gigante (parque.js: RG.x = 42 + 1.5, RG.y = 9.2, RG.z = 0) */
  var RG = { x: 43.5, y: 9.2, z: 0 };

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    var c0 = new T.Color(cor), c1 = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.18 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var c = c1.clone().lerp(c0, Math.min(1, ((ys[k] - minY) / faixa) * 1.3));
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  /* armadilha ja paga: geometria com indice e sem indice nao mesclam sem normalizar antes */
  function normalizarIndice(geo) { return geo.index ? geo.toNonIndexed() : geo; }

  /* ================= ESTRELA CENTRAL + MOLDURA =================
     A roda-gigante vive no plano YZ (parque.js gira o aro com rotateY(PI/2));
     a estrela usa o mesmo truque para ficar de frente para quem chega do oeste
     e tambem visivel de tras (DoubleSide), ja que o jogador circula o parque. */
  var RAIO_OUT = 1.3, RAIO_IN = 0.5, PONTAS = 5;  /* ponta-a-ponta = 2.6m */

  function formaEstrela(rOut, rIn, pontas) {
    var shape = new T.Shape();
    var passo = Math.PI / pontas;
    for (var i = 0; i < pontas * 2; i++) {
      var r = (i % 2 === 0) ? rOut : rIn;
      var ang = i * passo - Math.PI / 2;   /* primeira ponta para cima */
      var x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
  }

  /* estrela: extrudada, achatada no local-XY e depois virada para o plano
     mundo-YZ; cor uniforme e brilhante (fBase=0 => sem escurecer, le como luz) */
  var estrelaGeo = new T.ExtrudeGeometry(formaEstrela(RAIO_OUT, RAIO_IN, PONTAS), {
    depth: 0.15, bevelEnabled: false, curveSegments: 1
  });
  estrelaGeo.rotateY(Math.PI / 2);
  estrelaGeo.translate(RG.x - 0.075, RG.y, RG.z);
  estrelaGeo = normalizarIndice(estrelaGeo);
  pinta(estrelaGeo, 0xffe08a, 0);

  /* moldura: coroa fina em volta, um pouco atras da estrela (mais X), dourado
     mais profundo, com a base 18% mais escura (pinta cuida disso) para nao
     ficar "chapada" mesmo sendo MeshBasicMaterial (sem luz de verdade) */
  var molduraGeo = new T.TorusGeometry(1.6, 0.13, 10, 72);
  molduraGeo.rotateY(Math.PI / 2);
  molduraGeo.translate(RG.x + 0.09, RG.y, RG.z);
  molduraGeo = normalizarIndice(molduraGeo);
  pinta(molduraGeo, 0xe8a94a, 0.18);

  var matEstrela = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });
  var meshEstrela = new T.Mesh(BGU.mergeBufferGeometries([estrelaGeo, molduraGeo]), matEstrela);
  meshEstrela.name = 'estrela-moldura';
  grupo.add(meshEstrela);

  /* ================= HALO DE BRILHO (Sprite + CanvasTexture) ================= */
  function criarTexturaHalo() {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 256;
    var g2 = cv.getContext('2d');
    var grad = g2.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0.00, 'rgba(255,246,222,0.95)');
    grad.addColorStop(0.22, 'rgba(255,224,138,0.72)');
    grad.addColorStop(0.55, 'rgba(255,209,102,0.28)');
    grad.addColorStop(1.00, 'rgba(255,209,102,0)');
    g2.fillStyle = grad;
    g2.fillRect(0, 0, 256, 256);
    var tex = new T.CanvasTexture(cv);
    tex.generateMipmaps = false;
    tex.minFilter = T.LinearFilter;
    return tex;
  }
  var matHalo = new T.SpriteMaterial({ map: criarTexturaHalo(), transparent: true, depthWrite: false, color: 0xffffff });
  var halo = new T.Sprite(matHalo);
  var DIAM_ESTRELA = RAIO_OUT * 2;             /* 2.6m */
  var DIAM_HALO = DIAM_ESTRELA * 2.0;          /* dentro de 1.5x-2.5x pedido */
  halo.scale.set(DIAM_HALO, DIAM_HALO, 1);
  halo.position.set(RG.x + 0.20, RG.y, RG.z);
  grupo.add(halo);

  /* ================= SPARKLES (InstancedMesh) ================= */
  var N_SPARK = 14;
  var geoSpark = new T.IcosahedronGeometry(0.11, 0);
  geoSpark.deleteAttribute('uv');
  (function branquear(geo) {
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = 1; a[i * 3 + 1] = 1; a[i * 3 + 2] = 1; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
  })(geoSpark);
  var matSpark = new T.MeshBasicMaterial({ vertexColors: true });
  var instSpark = new T.InstancedMesh(geoSpark, matSpark, N_SPARK);
  instSpark.instanceMatrix.setUsage(T.DynamicDrawUsage);
  var CORES_SPARK = [0xffd166, 0xfff0cf, 0xe9b44c];
  for (var ks = 0; ks < N_SPARK; ks++) instSpark.setColorAt(ks, new T.Color(CORES_SPARK[ks % CORES_SPARK.length]));
  if (instSpark.instanceColor) instSpark.instanceColor.needsUpdate = true;
  grupo.add(instSpark);

  /* nuvem esparsa ao redor da estrela, fora da moldura (raio > 1.6), com um
     pouco de jitter em X para dar profundidade (nao ficar tudo num plano) */
  var faseSpark = [], posSpark = [];
  for (var iS = 0; iS < N_SPARK; iS++) {
    var ga = iS * 2.399963;                              /* angulo dourado */
    var raio = 1.95 + ((iS * 0.6180339887) % 1) * 1.45;   /* 1.95 .. 3.40 */
    posSpark.push({
      x: RG.x + Math.sin(iS * 3.71) * 0.28,
      y: RG.y + Math.cos(ga) * raio,
      z: RG.z + Math.sin(ga) * raio
    });
    faseSpark.push((iS * 1.618) % (Math.PI * 2));
  }

  var mtxSp = new T.Matrix4(), quatSp = new T.Quaternion();
  var vecSp = new T.Vector3(), escSp = new T.Vector3(1, 1, 1), eixoY = new T.Vector3(0, 1, 0);
  function porSparkles(t) {
    for (var i = 0; i < N_SPARK; i++) {
      var fase = faseSpark[i];
      var pulso = 0.5 + 0.5 * Math.sin(t * 0.8 + fase);   /* 0..1, suave */
      var esc = 0.65 + 0.55 * pulso;                       /* 0.65 .. 1.20 */
      var rot = t * (0.12 + (i % 3) * 0.05) + fase;        /* giro devagar */
      quatSp.setFromAxisAngle(eixoY, rot);
      escSp.set(esc, esc, esc);
      vecSp.set(posSpark[i].x, posSpark[i].y, posSpark[i].z);
      mtxSp.compose(vecSp, quatSp, escSp);
      instSpark.setMatrixAt(i, mtxSp);
    }
    instSpark.instanceMatrix.needsUpdate = true;
  }
  porSparkles(0);

  return {
    grupo: grupo,
    update: function (t, dt) { porSparkles(t); },
    custo: { dc: 3, tri: 1756 }
  };
};

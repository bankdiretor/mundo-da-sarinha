/* parteMusical -- o PARQUE MUSICAL, dentro da elipse do parque (contrato do
   parteParque: elipse 12x11 centrada em (42,0)). Monta nos espacos livres que
   sobraram entre a roda gigante, a gangorra, o carrossel simples e a cerca:
   piano de chao, tambores, xilofone, arquibancada e notas gigantes.
   Contrato: partes/CONTRATO.md.
   NOTA: o pedido desta peca autorizou orcamento maior que o padrao do
   contrato (3 draw calls / 4000 tri em vez de 2/3000) por causa do
   InstancedMesh dedicado as 13 teclas do piano, que precisam animar
   individualmente. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteMusical = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'parqueMusical';

  var CINZA = new T.Color(0x6a5a8f);
  var EIXO_Y = new T.Vector3(0, 1, 0);

  /* pinta por vertice (gradiente claro/escuro por altura), igual ao
     parteParque, com a normalizacao de indice que o contrato pede antes de
     mesclar geometrias de familias diferentes. */
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
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
  var matV = new T.MeshLambertMaterial({ vertexColors: true });

  /* ================= peca 1: TAMBORES (38,-8) ================= */
  var TAMBORES = [
    { x: 38.3, z: -7.6, rTopo: 0.40, rBase: 0.46, alt: 0.60, cor: 0xe8536e },
    { x: 39.1, z: -8.3, rTopo: 0.53, rBase: 0.60, alt: 0.80, cor: 0x9fb4d8 },
    { x: 39.9, z: -7.7, rTopo: 0.66, rBase: 0.74, alt: 1.00, cor: 0xe9b44c }
  ];
  var pecasEstaticas = [];
  (function tambores() {
    TAMBORES.forEach(function (tb) {
      var corpo = new T.CylinderGeometry(tb.rTopo, tb.rBase, tb.alt, 10);
      corpo.translate(tb.x, tb.alt / 2, tb.z);
      pecasEstaticas.push(pinta(corpo, tb.cor, 0.20));
      ctx.COLISORES.push({ x: tb.x, z: tb.z, raio: 0.6 });
    });
    /* baquetas apoiadas cruzadas em cima do tambor do meio */
    var tm = TAMBORES[1], topoY = tm.alt + 0.03;
    [{ dx: 0.06, dz: -0.05, gy: 0.32 }, { dx: -0.10, dz: 0.11, gy: -0.30 }].forEach(function (bq) {
      var vareta = new T.CylinderGeometry(0.026, 0.036, 0.85, 6);
      vareta.rotateZ(Math.PI / 2);
      vareta.rotateY(bq.gy);
      vareta.translate(tm.x + bq.dx, topoY, tm.z + bq.dz);
      pecasEstaticas.push(pinta(vareta, 0xc9975b, 0.12));
    });
  })();

  /* ================= peca 2: XILOFONE (46,-6) ================= */
  var CORES_XILO = [0xf2a2a2, 0xf5c08a, 0xf2e19a, 0xbcd6b0, 0x9fb4d8, 0xb79ce0, 0xd9a7e8];
  (function xilofone() {
    var XX = 46, XZ = -6;
    var base = new T.BoxGeometry(3.4, 0.22, 1.0);
    base.translate(XX, 0.11, XZ);
    pecasEstaticas.push(pinta(base, 0xd9a35f, 0.16));
    var slot = 3.2 / 7, topoY = 0.22 + 0.035;
    for (var i = 0; i < 7; i++) {
      var x = (XX - 1.6) + slot * (i + 0.5);
      var comp = 1.5 - 0.125 * i;
      var barra = new T.BoxGeometry(0.34, 0.07, comp);
      barra.translate(x, topoY, XZ);
      pecasEstaticas.push(pinta(barra, CORES_XILO[i], 0.10));
    }
    ctx.COLISORES.push({ x: XX, z: XZ, raio: 1.2 });
  })();

  /* ================= peca 3: ARQUIBANCADA (48,3), virada pro piano ===== */
  (function arquibancada() {
    var AX = 48, AZ = 3, PIANO_X = 44, PIANO_Z = 6.5;
    var angCentro = Math.atan2(PIANO_Z - AZ, PIANO_X - AX);   /* aponta pro piano */
    var offsets = [-0.70, -0.35, 0, 0.35, 0.70];               /* leque de ~80 graus */
    var CORES_ALMOFADA = [0xe8a7b2, 0x9fb4d8, 0xe9b44c, 0xbcd6b0, 0xd9c9ff];
    var linhas = [
      { r: 1.7, altura: 0.30, larg: 0.85, prof: 0.45 },   /* degrau da frente, mais baixo */
      { r: 2.5, altura: 0.58, larg: 0.85, prof: 0.45 }    /* degrau de tras, mais alto */
    ];
    linhas.forEach(function (ln, li) {
      offsets.forEach(function (off, k) {
        var ang = angCentro + off;
        var cx = AX + Math.cos(ang) * ln.r, cz = AZ + Math.sin(ang) * ln.r;
        var banco = new T.BoxGeometry(ln.larg, ln.altura, ln.prof);
        banco.translate(cx, ln.altura / 2, cz);
        pecasEstaticas.push(pinta(banco, 0xf0e2cf, 0.12));
        var almofada = new T.BoxGeometry(ln.larg * 0.82, 0.14, ln.prof * 0.82);
        almofada.translate(cx, ln.altura + 0.07, cz);
        pecasEstaticas.push(pinta(almofada, CORES_ALMOFADA[(li * 5 + k) % CORES_ALMOFADA.length], 0.10));
      });
    });
    ctx.COLISORES.push({ x: AX, z: AZ, raio: 1.8 });
  })();

  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecasEstaticas), matV));

  /* ================= peca 4: PIANO GIGANTE DE CHAO (44,6.5) =================
     13 teclas (8 brancas + 5 pretas) num unico InstancedMesh: a geometria e
     um cubo unitario e cada tecla ganha forma/posicao pela matriz da
     instancia (escala nao-uniforme), como o contrato pede. Sem colisor --
     e para pisar em cima. */
  var PIX = 44, PIZ = 6.5;
  var LARG_BRANCA = 1.2, COMP_BRANCA = 4.0, ESP_BRANCA = 0.16, Y_BRANCA = ESP_BRANCA / 2;
  var LARG_PRETA = 0.7, COMP_PRETA = 2.4, ESP_PRETA = 0.20, Y_PRETA = ESP_BRANCA + ESP_PRETA / 2;
  var SINK = 0.06;            /* afunda 6 cm */
  var DUR_TECLA = 0.32;        /* duracao da animacao de pisar, em segundos */

  var TECLAS = [];
  for (var wi = 0; wi < 8; wi++) {
    TECLAS.push({ x: PIX - 4.2 + 1.2 * wi, z: PIZ, i: wi, tipo: 'branca' });
  }
  [0, 1, 3, 4, 5].forEach(function (idxBranca, k) {
    var xA = TECLAS[idxBranca].x, xB = TECLAS[idxBranca + 1].x;
    TECLAS.push({ x: (xA + xB) / 2, z: PIZ, i: 8 + k, tipo: 'preta' });
  });
  var N_TECLAS = TECLAS.length;   /* 13 */
  var timerTecla = new Float32Array(N_TECLAS).fill(-1);

  var geoTecla = new T.BoxGeometry(1, 1, 1);
  geoTecla.deleteAttribute('uv');
  (function () {
    var n = geoTecla.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = 1; a[i * 3 + 1] = 1; a[i * 3 + 2] = 1; }
    geoTecla.setAttribute('color', new T.BufferAttribute(a, 3));
  })();
  var instTeclas = new T.InstancedMesh(geoTecla, matV, N_TECLAS);
  instTeclas.instanceMatrix.setUsage(T.DynamicDrawUsage);
  var COR_BRANCA = new T.Color(0xf4edde), COR_PRETA = new T.Color(0x2c2140);
  TECLAS.forEach(function (tc, k) { instTeclas.setColorAt(k, tc.tipo === 'branca' ? COR_BRANCA : COR_PRETA); });
  if (instTeclas.instanceColor) instTeclas.instanceColor.needsUpdate = true;
  grupo.add(instTeclas);

  var mtxT = new T.Matrix4(), quaIdent = new T.Quaternion(), vecT = new T.Vector3(), escT = new T.Vector3();
  function envelopeTecla(tt) {
    if (tt < 0 || tt >= DUR_TECLA) return 0;
    var desce = DUR_TECLA * 0.28;
    if (tt < desce) return tt / desce;
    return 1 - (tt - desce) / (DUR_TECLA - desce);
  }
  function posicionarTecla(k) {
    var tc = TECLAS[k];
    var branca = tc.tipo === 'branca';
    var largura = branca ? LARG_BRANCA : LARG_PRETA;
    var espessura = branca ? ESP_BRANCA : ESP_PRETA;
    var comprimento = branca ? COMP_BRANCA : COMP_PRETA;
    var restY = branca ? Y_BRANCA : Y_PRETA;
    var offset = timerTecla[k] < 0 ? 0 : envelopeTecla(timerTecla[k]) * SINK;
    escT.set(largura, espessura, comprimento);
    mtxT.compose(vecT.set(tc.x, restY - offset, tc.z), quaIdent, escT);
    instTeclas.setMatrixAt(k, mtxT);
  }
  for (var kk = 0; kk < N_TECLAS; kk++) posicionarTecla(kk);
  instTeclas.instanceMatrix.needsUpdate = true;

  /* ================= peca 5: NOTAS GIGANTES decorativas =================
     3 esculturas de 1.8m, cabeca+haste+bandeira, giram devagar. Geometria
     unica (mesclada) num InstancedMesh; cor de cada instancia sobrescreve o
     branco uniforme da malha base, igual as cabines da roda gigante. */
  function construirNota() {
    var pecas = [];
    var base = new T.CylinderGeometry(0.16, 0.20, 0.14, 8);
    base.translate(0, 0.07, 0);
    pecas.push(base);
    var cabeca = new T.SphereGeometry(0.26, 8, 6);
    cabeca.scale(1, 0.72, 1.05);
    cabeca.translate(0.02, 0.33, 0);
    pecas.push(cabeca);
    var haste = new T.CylinderGeometry(0.045, 0.045, 1.30, 6);
    haste.translate(0.24, 1.167, 0);
    pecas.push(haste);
    var bandeira = new T.BoxGeometry(0.34, 0.22, 0.05);
    bandeira.rotateZ(-0.6);
    bandeira.translate(0.42, 1.75, 0.03);
    pecas.push(bandeira);
    pecas = pecas.map(function (g) { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; });
    var geo = BGU.mergeBufferGeometries(pecas);
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = 1; a[i * 3 + 1] = 1; a[i * 3 + 2] = 1; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    return geo;
  }
  var NOTAS = [
    { x: 50, z: -2, cor: 0xe9b44c, fase: 0.0 },     /* dourada */
    { x: 40, z: 9.2, cor: 0xb79ce0, fase: 2.1 },     /* lilas */
    { x: 41, z: -9.5, cor: 0xe9b44c, fase: 4.2 }     /* dourada */
  ];
  var instNota = new T.InstancedMesh(construirNota(), matV, NOTAS.length);
  instNota.instanceMatrix.setUsage(T.DynamicDrawUsage);
  NOTAS.forEach(function (nt, i) {
    instNota.setColorAt(i, new T.Color(nt.cor));
    ctx.COLISORES.push({ x: nt.x, z: nt.z, raio: 0.4 });
  });
  if (instNota.instanceColor) instNota.instanceColor.needsUpdate = true;
  grupo.add(instNota);

  var mtxN = new T.Matrix4(), quaN = new T.Quaternion(), vecN = new T.Vector3(), escUm = new T.Vector3(1, 1, 1);
  var VELOCIDADE_NOTA = 0.35;   /* rad/s */
  function girarNotas(t) {
    for (var i = 0; i < NOTAS.length; i++) {
      var nt = NOTAS[i];
      quaN.setFromAxisAngle(EIXO_Y, t * VELOCIDADE_NOTA + nt.fase);
      mtxN.compose(vecN.set(nt.x, 0, nt.z), quaN, escUm);
      instNota.setMatrixAt(i, mtxN);
    }
    instNota.instanceMatrix.needsUpdate = true;
  }
  girarNotas(0);

  /* ---- API ---- */
  grupo.userData.teclas = TECLAS.map(function (tc) { return { x: tc.x, z: tc.z, i: tc.i }; });
  grupo.userData.pisarTecla = function (i) {
    if (i >= 0 && i < N_TECLAS) timerTecla[i] = 0;
  };

  return {
    grupo: grupo,
    custo: { dc: 3, tri: 1104 },   /* MEDIDO: node medir2.mjs (harness com THREE r147 real) */
    update: function (t, dt) {
      for (var k = 0; k < N_TECLAS; k++) {
        if (timerTecla[k] < 0) continue;
        timerTecla[k] += dt;
        if (timerTecla[k] >= DUR_TECLA) timerTecla[k] = -1;
      }
      for (var p = 0; p < N_TECLAS; p++) posicionarTecla(p);
      instTeclas.instanceMatrix.needsUpdate = true;
      girarNotas(t);
    }
  };
};

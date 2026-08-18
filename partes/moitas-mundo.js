/* parteMoitasMundo -- as 24 MOITAS espalhadas pelo mundo, substituindo
   os 24 "arbustos floridos" antigos do encanto.js (meia-esfera + 3
   pontinhos — a versao improvisada desta ficha). Receita: partes/moita.js
   (prototipo aprovado na vitrine). Mesmo padrao das trocas anteriores:
   arvores -> arvores-mundo, postes -> luminarias-mundo, arbustos -> aqui.

   POSICOES: extraidas das matrizes REAIS do InstancedMesh do encanto na
   cena viva antes de remover (medidas, nao chutadas). Validacao contra
   ctx.COLISORES achou 1 conflito: o indice 18 (35.7,-11.19) afundava
   numa arvore do aglomerado do parque — realocado para (35.9,-9.2),
   conferido contra as 3 arvores vizinhas (folga >= 2.1).

   ESCALA: os arbustos antigos eram cupulas r0.45 (escala 0.75-1.30);
   a moita nova tem pegada 2.26 de largura. Mapa: sm = 0.42+(s-0.75)*0.35
   -> 0.43-0.61 (moitas de ~1.0-1.4 de largura, mesmo ritmo de antes,
   com os 6 "herois" da vitrine em escala cheia quando o Ivan quiser).

   Versao SIMPLIFICADA para instanciar (como as luminarias estaticas):
   central Icosahedron detail 1, secundarios detail 0, gemas Octahedron
   (de longe le igual; 192 tri/unidade vs 434 do prototipo).
   SEM colisor: moita e macia, sempre foi atravessavel (regra dos
   arbustos antigos). SEM instanceColor (bug do material compartilhado).
   1 draw call. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteMoitasMundo = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'moitasMundo';

  var VERDE = 0x88935a, VERDE_CLARO = 0x949e66, VERDE_ESCURO = 0x7a8450, VERDE_FRENTE = 0x8a9459,
      ROSA = 0xf28db6, ROSA_CLARO = 0xff9fc8, ROSA_FORTE = 0xe676b0;

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

  var pecas = [];
  pecas.push(pinta(new T.CircleGeometry(1.12, 12).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  var VOLUMES = [
    { x: 0,     y: 0.56, z: -0.08, r: 0.80, sx: 1.05, sy: 0.85, sz: 0.95, det: 1, cor: VERDE },
    { x: -0.62, y: 0.34, z: 0.10,  r: 0.48, sx: 1.00, sy: 0.80, sz: 1.00, det: 0, cor: VERDE_CLARO },
    { x: 0.64,  y: 0.38, z: 0.00,  r: 0.52, sx: 1.02, sy: 0.82, sz: 0.92, det: 0, cor: VERDE_ESCURO },
    { x: 0.06,  y: 0.26, z: 0.52,  r: 0.50, sx: 1.00, sy: 0.72, sz: 0.90, det: 0, cor: VERDE_FRENTE }
  ];
  for (var v = 0; v < VOLUMES.length; v++) {
    var vol = VOLUMES[v];
    var blob = new T.IcosahedronGeometry(vol.r, vol.det);
    blob.scale(vol.sx, vol.sy, vol.sz);
    blob.rotateY(v * 0.9);
    blob.translate(vol.x, vol.y, vol.z);
    pecas.push(pinta(blob, vol.cor, 0.10));
  }

  function gema(px, py, pz, cor, tam) {
    var melhor = null, melhorD = 1e9;
    for (var i2 = 0; i2 < VOLUMES.length; i2++) {
      var vo = VOLUMES[i2];
      var dx = (px - vo.x) / (vo.r * vo.sx), dy = (py - vo.y) / (vo.r * vo.sy), dz = (pz - vo.z) / (vo.r * vo.sz);
      var d = Math.hypot(dx, dy, dz);
      if (Math.abs(d - 1) < melhorD) { melhorD = Math.abs(d - 1); melhor = { vo: vo, d: d }; }
    }
    var m = melhor, f = 1 / (m.d || 1);
    var sx2 = m.vo.x + (px - m.vo.x) * f, sy2 = m.vo.y + (py - m.vo.y) * f, sz2 = m.vo.z + (pz - m.vo.z) * f;
    var g = new T.OctahedronGeometry(tam, 0);
    g.rotateY(px * 7.3);
    var nx = sx2 - m.vo.x, ny = sy2 - m.vo.y, nz = sz2 - m.vo.z;
    var nl = Math.hypot(nx, ny, nz) || 1;
    g.translate(sx2 - nx / nl * tam * 0.35, sy2 - ny / nl * tam * 0.35, sz2 - nz / nl * tam * 0.35);
    pecas.push(pinta(g, cor, 0.04));
  }
  gema(-0.20, 1.15, 0.30, ROSA, 0.095);
  gema(-0.95, 0.45, 0.40, ROSA_CLARO, 0.085);
  gema(0.10, 0.42, 0.95, ROSA_FORTE, 0.09);
  gema(0.95, 0.60, 0.35, ROSA, 0.08);
  gema(1.02, 0.30, 0.42, ROSA_CLARO, 0.075);

  var geoMoita = BGU.mergeBufferGeometries(pecas);

  /* ---------- os 24 pontos (matrizes reais do encanto; 18 realocado) ---------- */
  var PONTOS = [
    { x: -13.94, z: 15.63, rot: -0.24, s: 0.913 }, { x: -10.93, z: -17.05, rot: 0.65, s: 1.070 },
    { x: -10.12, z: 13.84, rot: -0.09, s: 1.044 }, { x: -18.85, z: -7.85, rot: 0.75, s: 1.138 },
    { x: -2.90, z: -49.30, rot: 0.48, s: 1.144 }, { x: 14.05, z: -35.20, rot: -0.98, s: 0.937 },
    { x: 0.72, z: -48.88, rot: -1.55, s: 1.231 }, { x: 12.97, z: -43.94, rot: 1.15, s: 0.906 },
    { x: 13.03, z: -42.04, rot: -0.17, s: 1.168 }, { x: 16.65, z: 40.20, rot: -1.35, s: 0.901 },
    { x: -12.36, z: 30.15, rot: -0.13, s: 0.939 }, { x: -1.00, z: 54.25, rot: -0.95, s: 0.884 },
    { x: -15.64, z: 35.85, rot: -0.58, s: 0.987 }, { x: 15.24, z: 36.50, rot: 0.13, s: 0.894 },
    { x: 55.07, z: 0.42, rot: -0.68, s: 1.086 }, { x: 42.19, z: -12.79, rot: -1.16, s: 0.789 },
    { x: 55.51, z: -1.07, rot: 0.12, s: 0.790 }, { x: 55.27, z: 3.55, rot: 0.62, s: 0.926 },
    { x: 35.90, z: -9.20, rot: -0.01, s: 0.785 },   /* realocado: afundava em arvore */
    { x: -49.69, z: 10.66, rot: 0.13, s: 1.264 }, { x: -42.34, z: -11.67, rot: -0.20, s: 1.298 },
    { x: -43.23, z: -11.85, rot: -0.56, s: 0.865 }, { x: -41.36, z: 11.88, rot: -1.35, s: 1.006 },
    { x: -32.37, z: -7.10, rot: -0.59, s: 1.061 }
  ];
  function escalaMoita(s) { return 0.42 + (s - 0.75) * 0.35; }

  var matFeltro = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(),
      vec = new T.Vector3(), esc = new T.Vector3();

  var inst = new T.InstancedMesh(geoMoita, matFeltro, PONTOS.length);
  for (var i = 0; i < PONTOS.length; i++) {
    var p = PONTOS[i], sm = escalaMoita(p.s);
    eul.set(0, p.rot, 0);
    qua.setFromEuler(eul);
    vec.set(p.x, 0, p.z);
    esc.set(sm, sm, sm);
    mtx.compose(vec, qua, esc);
    inst.setMatrixAt(i, mtx);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.name = 'moitasmundo_malha';
  grupo.add(inst);

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 1, tri: 192 * PONTOS.length }   /* ~4.6k; conferir no harness */
  };
};

/* parteMoita — o ARBUSTO/MOITA low-poly do Universo Sarinha (ficha do
   Ivan, 16/08: 4 volumes verdes facetados + 5 gemas rosas embutidas;
   baixo e largo, ~2.1 x 1.3).

   Prototipo de vitrine (padrao vaso-flor.js): 1 unidade na origem, NAO
   carregada no jogo. A espalhada e partes/moitas-mundo.js (substitui os
   24 arbustos-de-cupula antigos do encanto.js).

   Da ficha segui: composicao (central + esquerdo + direito + frontal
   baixo), Icosahedron detail 1 com escalas assimetricas, verdes oliva
   (#7A8450 + variacoes), gemas Icosahedron detail 0 rosas (3 tons),
   dimensoes (largura ~2.1, altura ~1.3), pivo no chao, frente +Z.
   Da ficha IGNOREI (CONTRATO.md): MeshStandardMaterial, castShadow,
   8-15 meshes — aqui e 1 malha Lambert mesclada com cor por vertice,
   sombra = disco escuro pintado. 1 draw call. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteMoita = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'moita';

  /* ---------- paleta da ficha ---------- */
  /* v1 provou: hex base da ficha (#7A8450) + degrade rendia musgo escuro;
     a IMAGEM da ficha e oliva claro amarelado — subi para a familia clara
     que a propria ficha lista (#88935A/#949E66) */
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

  /* ---------- sombra pintada (moita larga = tapete largo) ---------- */
  pecas.push(pinta(new T.CircleGeometry(1.12, 14).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  /* ---------- os 4 volumes (secao 5 da ficha) ---------- */
  /* v1 provou: central largo demais (rx 0.98) engolia os laterais.
     Central mais estreito + laterais maiores e mais afastados = cada
     morro le separado, como na imagem. */
  var VOLUMES = [
    { x: 0,     y: 0.56, z: -0.08, r: 0.80, sx: 1.05, sy: 0.85, sz: 0.95, cor: VERDE },
    { x: -0.62, y: 0.34, z: 0.10,  r: 0.48, sx: 1.00, sy: 0.80, sz: 1.00, cor: VERDE_CLARO },
    { x: 0.64,  y: 0.38, z: 0.00,  r: 0.52, sx: 1.02, sy: 0.82, sz: 0.92, cor: VERDE_ESCURO },
    { x: 0.06,  y: 0.26, z: 0.52,  r: 0.50, sx: 1.00, sy: 0.72, sz: 0.90, cor: VERDE_FRENTE }
  ];
  for (var v = 0; v < VOLUMES.length; v++) {
    var vol = VOLUMES[v];
    var blob = new T.IcosahedronGeometry(vol.r, 1);
    blob.scale(vol.sx, vol.sy, vol.sz);
    blob.rotateY(v * 0.9);
    blob.translate(vol.x, vol.y, vol.z);
    pecas.push(pinta(blob, vol.cor, 0.10));
  }

  /* ---------- as 5 gemas rosas (secoes 9-13), embutidas na superficie ----------
     cada gema: acha o volume mais proximo, projeta o ponto para a casca
     dele e afunda 35% — "pousada", nunca flutuando (secao 14) */
  function gema(px, py, pz, cor, tam) {
    var melhor = null, melhorD = 1e9;
    for (var i2 = 0; i2 < VOLUMES.length; i2++) {
      var vo = VOLUMES[i2];
      var dx = (px - vo.x) / (vo.r * vo.sx), dy = (py - vo.y) / (vo.r * vo.sy), dz = (pz - vo.z) / (vo.r * vo.sz);
      var d = Math.hypot(dx, dy, dz);
      if (Math.abs(d - 1) < melhorD) { melhorD = Math.abs(d - 1); melhor = { vo: vo, dx: dx, dy: dy, dz: dz, d: d }; }
    }
    var m = melhor, f = 1 / (m.d || 1);
    var sx2 = m.vo.x + (px - m.vo.x) * f, sy2 = m.vo.y + (py - m.vo.y) * f, sz2 = m.vo.z + (pz - m.vo.z) * f;
    var g = new T.IcosahedronGeometry(tam, 0);
    g.rotateY(px * 7.3);
    g.rotateX(pz * 5.1);
    /* afunda 35% do proprio raio na direcao do centro do volume */
    var nx = sx2 - m.vo.x, ny = sy2 - m.vo.y, nz = sz2 - m.vo.z;
    var nl = Math.hypot(nx, ny, nz) || 1;
    g.translate(sx2 - nx / nl * tam * 0.35, sy2 - ny / nl * tam * 0.35, sz2 - nz / nl * tam * 0.35);
    pecas.push(pinta(g, cor, 0.04));
  }
  /* 1 topo, 1 esquerda, 1 frente-baixa, 2 direita (secao 12; frente +Z favorecida) */
  gema(-0.20, 1.15, 0.30, ROSA, 0.095);
  gema(-0.95, 0.45, 0.40, ROSA_CLARO, 0.085);
  gema(0.10, 0.42, 0.95, ROSA_FORTE, 0.09);
  gema(0.95, 0.60, 0.35, ROSA, 0.08);
  gema(1.02, 0.30, 0.42, ROSA_CLARO, 0.075);

  /* ---------- 1 draw call ---------- */
  var malha = new T.Mesh(BGU.mergeBufferGeometries(pecas),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'moita_malha';
  grupo.add(malha);

  /* moita e macia: sem colisor (mesma regra dos arbustos antigos do encanto) */

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 1, tri: 0 }   /* medir na vitrine antes de fechar */
  };
};

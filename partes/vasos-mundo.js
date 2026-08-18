/* parteVasosMundo -- os 19 vasos de flores espalhados COM CRITERIO pelo
   mundo (pedido do Ivan 16/08: "pode espalhar, mas com criterios").
   Receita geometrica: partes/vaso-flor.js (prototipo aprovado na vitrine).

   OS CRITERIOS (nada de chuva aleatoria):
   1. DUPLAS SIMETRICAS em entradas (secao 37 da ficha): os 4 portais da
      praca (lateral ±3.5 — os PILARES vivem em ±2.3, a 1a tentativa a
      ±2.6 dava 21cm de folga e foi rejeitada), a pracinha de entrada da
      vilinha, a escada do coreto, a frente do quiosque do radio e a
      escada do palco da festa.
   2. CAMINHO da praca ate a festa (secao 36): 3 vasos alternando lados,
      afastados 0.65 alem da faixa andavel (z ±2.3 -> ±2.95).
   3. PARQUE/RODA-GIGANTE: FORA, de proposito — territorio da roda
      (mesma regra que valeu para as arvores, pedido anterior do Ivan).
   4. Toda posicao foi VALIDADA na cena viva contra ctx.COLISORES
      inteiro (folga minima 0.62 alem do raio de cada obstaculo; a
      validacao pegou e corrigiu 9 posicoes: pilares dos portais e uma
      arvore no caminho da festa).
   5. As FLORES olham para quem chega: cada vaso tem um alvo (o eixo do
      caminho) e gira o +Z (frente da flor, secao 23 da ficha) para ele.

   1 draw call (InstancedMesh de geometria unica), 556 tri por vaso.
   Sem instanceColor (nada do bug do material compartilhado) — variacao
   so por escala/rotacao, deterministica. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteVasosMundo = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'vasosMundo';

  var VASO = 0x8d68c4, BORDA = 0xa886d8, BASE = 0x6d4aa5, TERRA = 0x4a3550,
      VERDE = 0x83ab4e, VERDE_CLARO = 0x8fb75a, VERDE_ESCURO = 0x74994a,
      PETALA = 0xf58cb5, PETALA_CLARA = 0xff9fc5, MIOLO = 0xffd65a;

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
  function prisma(wTopo, wBase, alt, y0) {
    var g = new T.CylinderGeometry(wTopo * 0.5 * Math.SQRT2, wBase * 0.5 * Math.SQRT2, alt, 4, 1);
    g.rotateY(Math.PI / 4);
    g.translate(0, y0 + alt / 2, 0);
    return g;
  }

  /* ---------- receita do vaso (copia fiel de vaso-flor.js) ---------- */
  var pecas = [];
  pecas.push(pinta(new T.CircleGeometry(0.58, 12).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));
  var BASE_ALT = 0.10;
  var basev = new T.CylinderGeometry(0.335, 0.36, BASE_ALT, 8);
  basev.translate(0, BASE_ALT / 2, 0);
  pecas.push(pinta(basev, BASE, 0.20));
  var CORPO_ALT = 0.65, CORPO_Y0 = BASE_ALT - 0.02;
  var corpoVaso = new T.CylinderGeometry(0.42, 0.31, CORPO_ALT, 8, 1, true);
  corpoVaso.translate(0, CORPO_Y0 + CORPO_ALT / 2, 0);
  pecas.push(pinta(corpoVaso, VASO, 0.10));
  var BORDA_ALT = 0.16, BORDA_Y0 = CORPO_Y0 + CORPO_ALT - 0.02;
  var borda = new T.CylinderGeometry(0.50, 0.47, BORDA_ALT, 8);
  borda.translate(0, BORDA_Y0 + BORDA_ALT / 2, 0);
  pecas.push(pinta(borda, BORDA, 0.08));
  var TOPO_VASO = BORDA_Y0 + BORDA_ALT;
  pecas.push(pinta(new T.CircleGeometry(0.44, 8).rotateX(-Math.PI / 2).translate(0, TOPO_VASO + 0.005, 0),
    TERRA, 0.05));
  var ARB_CY = 1.34;
  var VOLUMES = [
    { x: 0,     y: ARB_CY,        z: 0,     r: 0.62, e: 1.00, cor: VERDE },
    { x: -0.26, y: ARB_CY - 0.12, z: 0.06,  r: 0.60, e: 0.50, cor: VERDE_CLARO },
    { x: 0.27,  y: ARB_CY - 0.08, z: -0.06, r: 0.60, e: 0.55, cor: VERDE_ESCURO }
  ];
  for (var v = 0; v < VOLUMES.length; v++) {
    var vol = VOLUMES[v];
    var blob = new T.IcosahedronGeometry(vol.r * vol.e, 1);
    blob.scale(1.0, 0.85, 0.92);
    blob.rotateY(v * 1.1);
    blob.translate(vol.x, vol.y, vol.z);
    pecas.push(pinta(blob, vol.cor, 0.08));
  }
  function flor(cx, cy, cz, corPetala, escala) {
    var s = escala || 1;
    var nx = cx - 0, ny = cy - ARB_CY, nz = cz - 0;
    var nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    var eixo = new T.Vector3(0, 1, 0), alvo = new T.Vector3(nx, ny, nz);
    var q = new T.Quaternion().setFromUnitVectors(eixo, alvo);
    for (var p = 0; p < 5; p++) {
      var ang = (p / 5) * Math.PI * 2 + 0.3;
      var petala = new T.BoxGeometry(0.088 * s, 0.034 * s, 0.088 * s);
      petala.rotateY(ang);
      petala.translate(Math.cos(ang) * 0.095 * s, 0, Math.sin(ang) * 0.095 * s);
      petala.applyQuaternion(q);
      petala.translate(cx, cy, cz);
      pecas.push(pinta(petala, corPetala, 0.05));
    }
    var miolo = new T.BoxGeometry(0.062 * s, 0.040 * s, 0.062 * s);
    miolo.translate(0, 0.012 * s, 0);
    miolo.applyQuaternion(q);
    miolo.translate(cx, cy, cz);
    pecas.push(pinta(miolo, MIOLO, 0.02));
  }
  flor(-0.36, 1.42, 0.44, PETALA, 1.0);
  flor(0.05, 1.24, 0.55, PETALA_CLARA, 0.9);
  flor(0.38, 1.50, 0.38, PETALA, 0.95);
  var geoVaso = BGU.mergeBufferGeometries(pecas);

  /* =========================================================================
     OS 19 PONTOS (validados na cena viva; alvo = para onde as flores olham)
     ========================================================================= */
  /* CRITERIO DE OLHAR: cada dupla se ENTREOLHA atraves da passagem
     (alvo = pe da perpendicular no eixo andavel). Flores para dentro
     ficam visiveis para quem passa em qualquer direcao — a 1a versao
     (alvo no fim do corredor) deixava as flores de costas para quem
     chegava da praca nos portais norte/sul (visto no QA). */
  var PONTOS = [
    /* duplas dos 4 portais (pilares em ±2.3 — ficar a ±3.5) */
    { x: 19.6, z: 3.5, ax: 19.6, az: 0, s: 0.95 }, { x: 19.6, z: -3.5, ax: 19.6, az: 0, s: 0.95 },
    { x: -19.6, z: 3.5, ax: -19.6, az: 0, s: 0.95 }, { x: -19.6, z: -3.5, ax: -19.6, az: 0, s: 0.95 },
    { x: 3.5, z: -19.6, ax: 0, az: -19.6, s: 0.95 }, { x: -3.5, z: -19.6, ax: 0, az: -19.6, s: 0.95 },
    { x: 3.5, z: 19.6, ax: 0, az: 19.6, s: 0.95 }, { x: -3.5, z: 19.6, ax: 0, az: 19.6, s: 0.95 },
    /* pracinha de entrada da vilinha */
    { x: 2.35, z: 24.6, ax: 0, az: 24.6, s: 0.9 }, { x: -2.35, z: 24.6, ax: 0, az: 24.6, s: 0.9 },
    /* escada do coreto do jardim */
    { x: 2.1, z: -40.9, ax: 0, az: -40.9, s: 0.9 }, { x: -2.1, z: -40.9, ax: 0, az: -40.9, s: 0.9 },
    /* frente do quiosque do radio (a dupla emoldura quem chega ao radio).
       ⛔ MUDOU 17/08: o radio saiu de (-13,-13) para (-42,0) e estes dois
       vasos ficaram para tras, viraram PAREDE INVISIVEL dentro da praca
       (2 colisores sem objeto). Ao mover uma zona, a decoracao ancorada
       nela tem de ir junto — a armadilha ja paga na troca da vilinha. */
    { x: -38.6, z: 1.9, ax: -42, az: 0, s: 0.9 }, { x: -38.6, z: -1.9, ax: -42, az: 0, s: 0.9 },
    /* escada do palco da festa */
    { x: -41.6, z: 1.9, ax: -41.6, az: 0, s: 0.9 }, { x: -41.6, z: -1.9, ax: -41.6, az: 0, s: 0.9 },
    /* caminho praca->festa, lados alternados */
    { x: -35.5, z: 2.95, ax: -35.5, az: 0, s: 0.85 },
    { x: -30, z: -2.95, ax: -30, az: 0, s: 0.8 },
    { x: -26, z: 2.95, ax: -26, az: 0, s: 0.88 }
  ];

  var matFeltro = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(),
      vec = new T.Vector3(), esc = new T.Vector3();

  var inst = new T.InstancedMesh(geoVaso, matFeltro, PONTOS.length);
  for (var i = 0; i < PONTOS.length; i++) {
    var p = PONTOS[i];
    eul.set(0, Math.atan2(p.ax - p.x, p.az - p.z), 0);   /* +Z (flores) olha o alvo */
    qua.setFromEuler(eul);
    vec.set(p.x, 0, p.z);
    esc.set(p.s, p.s, p.s);
    mtx.compose(vec, qua, esc);
    inst.setMatrixAt(i, mtx);
    ctx.COLISORES.push({ x: p.x, z: p.z, raio: 0.42 * p.s });
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.name = 'vasosmundo_malha';
  grupo.add(inst);

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 1, tri: 556 * PONTOS.length }   /* 10.6k; conferir no harness */
  };
};

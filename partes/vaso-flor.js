/* parteVasoFlor — o VASO ROXO com arbusto verde e flores rosas do
   Universo Sarinha (ficha de referencia do Ivan, 16/08: vaso facetado +
   borda larga + base + arbusto de 3 volumes + 3 flores de 5 petalas).

   Prototipo de vitrine (padrao luminaria.js / arvore-flor.js): 1 unidade
   na origem, NAO carregada no jogo. Quando o Ivan aprovar, a espalhada
   (ao lado de caminhos, entradas em duplas, casas — secoes 36/37 da
   ficha) vira InstancedMesh em peca propria, com variacao por indice
   deterministico (nada de Math.random, regra do mundo).

   Da ficha segui: estrutura (Pot/Bush/Flowers), cores hex, dimensoes
   (altura total ~1.7, corpo 0.42/0.31/0.65, borda 0.50, arbusto 0.65
   com 3 volumes, flores nas posicoes dadas), pivo no chao (Y=0) e
   frente para +Z (flores viradas para a camera).
   Da ficha IGNOREI (viola partes/CONTRATO.md): MeshStandardMaterial,
   castShadow/receiveShadow, 10-25 meshes separados. Aqui e TUDO numa
   malha so — Lambert + cor por vertice + flatShading, sombra e um disco
   escuro pintado (regra do cenario claro). 1 draw call, ~490 tri
   (meta da ficha: <500).

   Ajuste consciente: corpo e borda com 8 lados (a ficha sugere 6-8; a
   imagem de referencia mostra ~8 facetas e casa melhor com a luminaria). */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteVasoFlor = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'vasoFlor';

  /* ---------- paleta ----------
     Ajuste consciente: os hex do TEXTO da ficha (0x7447A8...) sao bem
     mais escuros que a IMAGEM da mesma ficha (lavanda claro). A imagem
     e a referencia que se compara no final — subi os roxos ~1 tom na
     direcao dela; verdes/rosas/miolo ficaram como no texto. */
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

  var pecas = [];

  /* ---------- sombra pintada (regra do cenario claro) ---------- */
  pecas.push(pinta(new T.CircleGeometry(0.58, 12).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  /* ---------- VASO (secoes 4-7 da ficha) ---------- */
  var BASE_ALT = 0.10;
  var base = new T.CylinderGeometry(0.335, 0.36, BASE_ALT, 8);
  base.translate(0, BASE_ALT / 2, 0);
  pecas.push(pinta(base, BASE, 0.20));

  var CORPO_ALT = 0.65, CORPO_Y0 = BASE_ALT - 0.02;
  var corpoVaso = new T.CylinderGeometry(0.42, 0.31, CORPO_ALT, 8, 1, true);
  corpoVaso.translate(0, CORPO_Y0 + CORPO_ALT / 2, 0);
  pecas.push(pinta(corpoVaso, VASO, 0.10));

  var BORDA_ALT = 0.16, BORDA_Y0 = CORPO_Y0 + CORPO_ALT - 0.02;
  var borda = new T.CylinderGeometry(0.50, 0.47, BORDA_ALT, 8);
  borda.translate(0, BORDA_Y0 + BORDA_ALT / 2, 0);
  pecas.push(pinta(borda, BORDA, 0.08));

  /* terra escura dentro da borda (assenta o arbusto) */
  var TOPO_VASO = BORDA_Y0 + BORDA_ALT;
  pecas.push(pinta(new T.CircleGeometry(0.44, 8).rotateX(-Math.PI / 2).translate(0, TOPO_VASO + 0.005, 0),
    TERRA, 0.05));

  /* ---------- ARBUSTO (secoes 8-10: 3 volumes sobrepostos) ----------
     v1 provou: volumes baixos/largos engolem a borda do vaso. Subi o
     conjunto e encolhi os secundarios — a borda larga precisa aparecer
     inteira, como na imagem da ficha. */
  var ARB_CY = 1.34;   /* senta na borda transbordando um tico (topo do vaso em 0.87) */
  var VOLUMES = [
    { x: 0,     y: ARB_CY,        z: 0,     r: 0.62, e: 1.00, cor: VERDE },
    { x: -0.26, y: ARB_CY - 0.12, z: 0.06,  r: 0.60, e: 0.50, cor: VERDE_CLARO },
    { x: 0.27,  y: ARB_CY - 0.08, z: -0.06, r: 0.60, e: 0.55, cor: VERDE_ESCURO }
  ];
  for (var v = 0; v < VOLUMES.length; v++) {
    var vol = VOLUMES[v];
    var blob = new T.IcosahedronGeometry(vol.r * vol.e, 1);
    blob.scale(1.0, 0.85, 0.92);
    blob.rotateY(v * 1.1);           /* facetas nao alinhadas entre volumes */
    blob.translate(vol.x, vol.y, vol.z);
    pecas.push(pinta(blob, vol.cor, 0.08));
  }

  /* ---------- FLORES (secoes 12-18: 5 petalas + miolo, frente +Z) ----------
     v1 provou: petala de octaedro em pe vira "cravo pontudo". Na imagem
     da ficha as petalas sao cubinhos achatados deitados na copa. */
  function flor(cx, cy, cz, corPetala, escala) {
    var s = escala || 1;
    /* a flor deita na superficie: normal do centro do arbusto ate ela */
    var nx = cx - 0, ny = cy - ARB_CY, nz = cz - 0;
    var nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    var eixo = new T.Vector3(0, 1, 0), alvo = new T.Vector3(nx, ny, nz);
    var q = new T.Quaternion().setFromUnitVectors(eixo, alvo);
    for (var p = 0; p < 5; p++) {
      var ang = (p / 5) * Math.PI * 2 + 0.3;
      var petala = new T.BoxGeometry(0.088 * s, 0.034 * s, 0.088 * s);
      petala.rotateY(ang);                               /* cantinho para fora */
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
  /* posicoes da ficha (secao 17), erguidas junto com o arbusto */
  flor(-0.36, 1.42, 0.44, PETALA, 1.0);
  flor(0.05, 1.24, 0.55, PETALA_CLARA, 0.9);
  flor(0.38, 1.50, 0.38, PETALA, 0.95);

  /* ---------- 1 draw call ---------- */
  var malha = new T.Mesh(BGU.mergeBufferGeometries(pecas),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'vasoflor_malha';
  grupo.add(malha);

  ctx.COLISORES.push({ x: 0, z: 0, raio: 0.42 });

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 1, tri: 0 }   /* medir na vitrine antes de fechar */
  };
};

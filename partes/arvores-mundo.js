/* parteArvoresMundo -- TODAS as arvores do Mundo da Sarinha, num lugar so.

   Historico: comecou como so as arvores NOVAS (flor=principal, cone=
   secundaria) preenchendo vaos vazios. O Ivan pediu depois pra
   SUBSTITUIR toda arvore antiga do jogo pela nova, com variacao de cor
   (rosa/verde) e tamanho. Por isso as arvores antigas de
   partes/flores.js (2, "algodao"), partes/vilinha.js (10, quintal),
   partes/trem.js (6, encosta do tunel) e partes/encanto.js (26,
   "cerejeiras") foram REMOVIDAS de la e viraram instancias daqui —
   nas MESMAS coordenadas de antes (medidas/calculadas, nunca chutadas),
   so que com o desenho novo. Preservado: os colisores de tronco onde ja
   existiam.

   NAO mexido: partes/ilha.js (2 arvorezinhas minusculas em pedras
   flutuantes de fundo, raio 66-90 do centro, fora da area andavel -
   posicao procedural via RNG, baixissimo impacto visual, nao valia
   reproduzir a formula so pra isso). Parque/musical continua sem
   arvore nova (territorio da roda-gigante, por pedido anterior do Ivan).

   Tecnica: cada arvore e desenhada UMA VEZ e repetida via InstancedMesh
   (padrao de encanto.js/vilinha.js) - custa o mesmo pra 1 ou 60
   instancias. A arvore-flor agora e 3 malhas (nao 2): TRONCO/BASE (cor
   fixa, marrom/oliva, nunca tingida), COPA (pintada num degrade NEUTRO
   branco->cinza, sem matiz - existe so pra ser MULTIPLICADA pela cor da
   instancia via setColorAt; e assim que da pra ter copa rosa OU verde
   sem duplicar geometria nem perder o sombreado) e FLORES (gemas
   rosadas fixas, iguais em toda instancia, ficam bem tanto na copa rosa
   quanto na verde, tipo cerejeira/pessegueiro de verdade). A conica
   (secundaria) continua 1 malha so, cor fixa.
   4 draw calls no total (base, copa, flores, cone), qualquer contagem
   de instancia. MeshLambertMaterial + flatShading, SEM
   MeshStandardMaterial, SEM castShadow/receiveShadow (CONTRATO.md).
   Sem luz nova, sem asset externo, nomes ASCII. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteArvoresMundo = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'arvoresMundo';

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.14 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var f = (ys[k] - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.2));
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }
  function pintaUni(geo, cor, fEscuro) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    var c = new T.Color(cor);
    if (fEscuro) c = c.lerp(CINZA, fEscuro);
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }
  /* degrade NEUTRO (branco no topo, cinza claro na base) -- serve so de
     "brilho" pra instanceColor multiplicar. branco x cor = cor exata;
     cinza x cor = a mesma cor mais escura. E assim que 1 geometria so
     funciona tingida de rosa OU verde por instancia. */
  function pintaNeutro(geo, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    var cTopo = new T.Color(0xffffff), cBase = new T.Color(0xffffff).lerp(new T.Color(0x000000), fBase === undefined ? 0.30 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var f = (ys[k] - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.2));
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }
  var matFeltro = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  /* material SO da copa tingida — NAO compartilhar com as malhas sem
     instanceColor: no three r147 o programa compilado fica em cache no
     material, e a 1a malha sem setColorAt compila SEM a diretiva de cor
     por instancia; as copas renderizavam BRANCAS com o buffer de cor
     perfeito na CPU (bug pago, provado com teste do vermelho no QA). */
  var matFeltroTingido = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });

  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(), vec = new T.Vector3(), esc = new T.Vector3();

  var COR_ROSA = new T.Color(0xf4afc7);
  var COR_VERDE = new T.Color(0x8fbf7a);

  /* =========================================================================
     GEOMETRIA 1: arvore-flor (principal), agora em 3 pecas (ver header)
     ========================================================================= */
  var geoFlorBase, geoFlorCopa, geoFlorFlor;
  (function construirArvoreFlor() {
    var COR_TRONCO = 0x9a6b4a, COR_BASE = 0x94a45f, COR_GRAMA = 0x7d9a4e,
        COR_PEDRA = 0xefb3c6, COR_FLOR = 0xe089ad;
    var pecasBase = [];

    var BASE_R = 0.55, BASE_ALT = 0.14;
    var base = new T.CylinderGeometry(BASE_R * 0.86, BASE_R, BASE_ALT, 8);
    base.translate(0, BASE_ALT / 2, 0);
    pecasBase.push(pinta(base, COR_BASE, 0.20));

    var PEDRAS = [{ x: -0.30, z: 0.24, r: 0.05 }, { x: 0.32, z: 0.20, r: 0.045 }];
    for (var pd = 0; pd < PEDRAS.length; pd++) {
      var rocha = new T.IcosahedronGeometry(PEDRAS[pd].r, 0);
      rocha.translate(PEDRAS[pd].x, BASE_ALT + PEDRAS[pd].r * 0.5, PEDRAS[pd].z);
      pecasBase.push(pintaUni(rocha, COR_PEDRA, 0.06));
    }
    var TUFOS = [{ x: -0.18, z: 0.32 }, { x: 0.24, z: -0.18 }];
    for (var tf = 0; tf < TUFOS.length; tf++) {
      var lam = new T.ConeGeometry(0.02, 0.10, 3);
      lam.translate(TUFOS[tf].x, BASE_ALT + 0.05, TUFOS[tf].z);
      pecasBase.push(pintaUni(lam, COR_GRAMA, 0.05));
    }

    var TR_Y0 = BASE_ALT - 0.01, TR_ALT = 0.60;
    var tronco = new T.CylinderGeometry(0.10, 0.17, TR_ALT, 7);
    tronco.translate(0.01, TR_Y0 + TR_ALT / 2, 0);
    pecasBase.push(pinta(tronco, COR_TRONCO, 0.24));

    var FORQUILHA_Y = TR_Y0 + TR_ALT - 0.04;
    function galho(anguloZ, anguloY, comprimento, r0) {
      var g = new T.CylinderGeometry(r0 * 0.55, r0, comprimento, 6);
      g.translate(0, comprimento / 2, 0);
      g.rotateZ(anguloZ); g.rotateY(anguloY);
      g.translate(0, FORQUILHA_Y, 0);
      return g;
    }
    pecasBase.push(pinta(galho(-0.55, 0.3, 0.48, 0.08), COR_TRONCO, 0.20));
    pecasBase.push(pinta(galho(0.48, -0.5, 0.42, 0.075), COR_TRONCO, 0.20));
    geoFlorBase = BGU.mergeBufferGeometries(pecasBase);

    var COPA_BASE_Y = FORQUILHA_Y + 0.38;
    var BLOBS = [
      { x: 0.01, y: COPA_BASE_Y + 0.36, z: 0, r: 0.46 },
      { x: -0.35, y: COPA_BASE_Y + 0.07, z: 0.04, r: 0.32 },
      { x: 0.35, y: COPA_BASE_Y + 0.10, z: -0.04, r: 0.30 },
      { x: -0.08, y: COPA_BASE_Y - 0.07, z: 0.26, r: 0.29 },
      { x: 0.10, y: COPA_BASE_Y - 0.06, z: -0.25, r: 0.29 }
    ];
    var pecasCopa = [];
    for (var b = 0; b < BLOBS.length; b++) {
      var bl = BLOBS[b];
      var blob = new T.IcosahedronGeometry(bl.r, 1);
      blob.rotateY(b * 0.7);
      blob.translate(bl.x, bl.y, bl.z);
      pecasCopa.push(pintaNeutro(blob, 0.30));
    }
    geoFlorCopa = BGU.mergeBufferGeometries(pecasCopa);

    var pecasFlor = [];
    var FLOR_DEFS = [
      { blob: 0, dir: [-0.45, 0.60, 0.65] }, { blob: 0, dir: [0.60, 0.45, -0.55] },
      { blob: 1, dir: [-0.75, 0.15, 0.62] }, { blob: 2, dir: [0.80, 0.25, 0.40] },
      { blob: 3, dir: [-0.25, -0.15, 0.95] }, { blob: 4, dir: [0.45, -0.10, -0.88] }
    ];
    for (var f = 0; f < FLOR_DEFS.length; f++) {
      var def = FLOR_DEFS[f], bl2 = BLOBS[def.blob];
      var dl = Math.hypot(def.dir[0], def.dir[1], def.dir[2]);
      var dx = def.dir[0] / dl, dy = def.dir[1] / dl, dz = def.dir[2] / dl;
      var rf = bl2.r + 0.035;
      var flor = new T.IcosahedronGeometry(0.065, 0);
      flor.translate(bl2.x + dx * rf, bl2.y + dy * rf, bl2.z + dz * rf);
      pecasFlor.push(flor);
    }
    geoFlorFlor = pintaUni(BGU.mergeBufferGeometries(pecasFlor), COR_FLOR, 0.03);
  })();

  /* =========================================================================
     GEOMETRIA 2: arvore-conica (secundaria) -- inalterada, so 1 malha
     ========================================================================= */
  var geoCone;
  (function construirArvoreConica() {
    var COR_TRONCO = 0x8a6a52, COR_COPA = 0xd9a0cf;
    var pecas = [];
    var TR_ALT = 0.42, TRONCO_VISIVEL = 0.30;
    var tronco = new T.CylinderGeometry(0.15, 0.19, TR_ALT, 8);
    tronco.translate(0, TR_ALT / 2, 0);
    pecas.push(pinta(tronco, COR_TRONCO, 0.28));
    var COPA_RAIO = 0.72, COPA_ALT = 1.05, COPA_LADOS = 7;
    var copa = new T.ConeGeometry(COPA_RAIO, COPA_ALT, COPA_LADOS);
    copa.translate(0, TRONCO_VISIVEL + COPA_ALT / 2, 0);
    pecas.push(pinta(copa, COR_COPA, 0.18));
    geoCone = BGU.mergeBufferGeometries(pecas);
  })();

  /* =========================================================================
     POSICOES DA ARVORE-FLOR -- 4 grupos: (A) vaos vazios que eu escolhi
     antes (9, mantidas), (B) as 2 grandes de flores.js/jardim (escala
     bem maior - eram "arvores de algodao" grandes), (C) as 10 do
     quintal da vilinha (escala menor - ficavam apertadas entre as
     casas), (D) as 6 da encosta do tunel/trem (escala menor, fundo),
     (E) as 26 "cerejeiras" do encanto.js espalhadas nas bordas.
     Cada grupo tem sua faixa de escala; a cor (rosa/verde) varia
     deterministicamente por indice (~30% verde), sem Math.random.
     ========================================================================= */
  function grupo_(pontos, escMin, escMax, fracaoVerde) {
    return pontos.map(function (p, i) {
      var s = escMin + ((i * 41 + 17) % 100) / 100 * (escMax - escMin);
      var cor = (((i * 31 + 9) % 100) / 100 < fracaoVerde) ? 'verde' : 'rosa';
      return { x: p.x, z: p.z, escala: s, cor: cor };
    });
  }
  var A_VAOS = [
    { x: 10, z: 3 }, { x: -10, z: 1 }, { x: 7, z: -30 }, { x: -7.5, z: -30 },
    { x: 5, z: 29 }, { x: -5, z: 29 }, { x: -23, z: -23 }, { x: -30, z: -30 }, { x: -38.5, z: 8.8 }
  ];
  var B_JARDIM_GRANDES = [{ x: -9.5, z: -33.5 }, { x: 10.2, z: -39.5 }];
  /* REALOCADAS em 16/08: a vilinha virou QUADRA (4 fileiras retas) e as
     10 arvores seguiam o anel antigo — uma delas ficou plantada BEM NA
     BOCA da vila (-0.34, 29.92) e outras no meio da praca. Agora elas
     emolduram a entrada e ocupam os cantos/fundos da quadra, todas
     conferidas contra os lotes (folga >= 2.0 do centro de cada casa). */
  var C_VILINHA_QUINTAL = [
    { x: 15.5, z: 30.5 }, { x: -15.5, z: 30.5 },      /* cantos de tras */
    { x: 15.5, z: 50.5 }, { x: -15.5, z: 50.5 },      /* cantos da frente */
    { x: 6.8, z: 27.0 }, { x: -6.8, z: 27.0 },        /* emolduram a boca da vila */
    { x: 16.5, z: 40.5 }, { x: -16.5, z: 40.5 },      /* meio das laterais */
    { x: 0.0, z: 55.5 }, { x: -4.5, z: 55.5 }         /* fundo do bairro */
  ];
  var D_ENCOSTA_TUNEL = [
    { x: 23.26, z: -29.05 }, { x: 19.51, z: -21.69 }, { x: 12.01, z: -21.69 },
    { x: 8.26, z: -29.05 }, { x: 12.01, z: -36.41 }, { x: 19.51, z: -36.41 }
  ];
  var E_CEREJEIRAS_ENCANTO = [
    { x: -11.77, z: 13.5 }, { x: -16.74, z: 4.94 }, { x: 14.78, z: -6.24 }, { x: 14.4, z: -8.78 }, { x: 12, z: -11.04 }, { x: -15.35, z: 8.6 },
    { x: -8.75, z: -47.41 }, { x: -11, z: -46.54 }, { x: 15.61, z: -37.1 }, { x: 11.94, z: -43.2 }, { x: -15.85, z: -37.14 },
    { x: -17.13, z: 41.77 }, { x: 16.39, z: 36.71 }, { x: 12.84, z: 29.72 }, { x: -13.23, z: 48.81 }, { x: -15.52, z: 43.98 },
    { x: 35.96, z: -11.57 }, { x: 33.85, z: 10.67 }, { x: 37.06, z: -11.02 }, { x: 43.14, z: -12.52 }, { x: 34.16, z: -10.59 },
    { x: -50.86, z: 9.91 }, { x: -54.61, z: -4.2 }, { x: -28.59, z: -4.38 }, { x: -34.74, z: 9.58 }, { x: -34.05, z: -11.23 }
  ];
  var PONTOS_FLOR = [].concat(
    grupo_(A_VAOS, 0.90, 1.25, 0.0),          /* mantidas como estavam, sempre rosa */
    grupo_(B_JARDIM_GRANDES, 1.85, 2.05, 0.85), /* grandes, quase todas verdes (eram "algodao" verde) */
    grupo_(C_VILINHA_QUINTAL, 0.55, 0.75, 0.4),
    grupo_(D_ENCOSTA_TUNEL, 0.55, 0.72, 0.75),  /* fundo do tunel, maioria verde (natural) */
    grupo_(E_CEREJEIRAS_ENCANTO, 0.75, 1.0, 0.30)
  );

  /* posicoes da conica (secundaria) -- inalteradas desta rodada */
  var PONTOS_CONE = [
    { x: 5, z: 9 }, { x: -6, z: -8 },
    { x: 9, z: -36 }, { x: -11, z: -36 },
    { x: 14, z: 40 }, { x: -14, z: 40 },
    { x: -50.8, z: 3.6 }, { x: -45.6, z: -8.8 }, { x: -33.2, z: -3.6 },
    { x: -42, z: -36 }, { x: -16, z: -26 }
  ];

  function espalhar(geo, pontos, raioColisor, escalaFixaOuNull) {
    var inst = new T.InstancedMesh(geo, matFeltro, pontos.length);
    for (var i = 0; i < pontos.length; i++) {
      var p = pontos[i];
      var s = escalaFixaOuNull != null ? escalaFixaOuNull : (p.escala != null ? p.escala : 1);
      eul.set(0, ((i * 53 + 7) % 100) / 100 * Math.PI * 2, 0);
      qua.setFromEuler(eul);
      vec.set(p.x, 0, p.z);
      esc.set(s, s, s);
      mtx.compose(vec, qua, esc);
      inst.setMatrixAt(i, mtx);
      if (raioColisor) ctx.COLISORES.push({ x: p.x, z: p.z, raio: raioColisor * s });
    }
    inst.instanceMatrix.needsUpdate = true;
    return inst;
  }
  function espalharTingido(geo, pontos) {
    var inst = new T.InstancedMesh(geo, matFeltroTingido, pontos.length);
    for (var i = 0; i < pontos.length; i++) {
      var p = pontos[i];
      var s = p.escala != null ? p.escala : 1;
      eul.set(0, ((i * 53 + 7) % 100) / 100 * Math.PI * 2, 0);
      qua.setFromEuler(eul);
      vec.set(p.x, 0, p.z);
      esc.set(s, s, s);
      mtx.compose(vec, qua, esc);
      inst.setMatrixAt(i, mtx);
      inst.setColorAt(i, p.cor === 'verde' ? COR_VERDE : COR_ROSA);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;   /* sem isso a GPU nunca recebe a cor (achado real, testado) */
    return inst;
  }

  var instFlorBase = espalhar(geoFlorBase, PONTOS_FLOR, 0.40, null);
  instFlorBase.name = 'arvoresmundo_flor_base';
  grupo.add(instFlorBase);

  var instFlorCopa = espalharTingido(geoFlorCopa, PONTOS_FLOR);
  instFlorCopa.name = 'arvoresmundo_flor_copa';
  grupo.add(instFlorCopa);

  var instFlorFlor = espalhar(geoFlorFlor, PONTOS_FLOR, 0, null);
  instFlorFlor.name = 'arvoresmundo_flor_flores';
  grupo.add(instFlorFlor);

  var instCone = espalhar(geoCone, PONTOS_CONE, 0.30, null);
  instCone.name = 'arvoresmundo_cone';
  grupo.add(instCone);

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 4, tri: 0 }   /* medido no QA 15/08: cena inteira 46 DC / 92k tri / 60fps no spawn com as 64 arvores (53 flor + 11 cone) */
  };
};

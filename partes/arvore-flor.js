/* parteArvoreFlor — a arvore PRINCIPAL do Mundo da Sarinha (referencia
   do Ivan: cerejeira low-poly rosa em pedestal de grama).

   Leitura da referencia, item a item:
   - COPA: nuvem UNICA de volumes facetados com o lobulo do TOPO
     dominante e laterais menores bem sobrepostas (nao "bolas soltas").
     Rosa claro e quente, sombra suave (pouco roxo).
   - FLORES: gemas poliedricas pequenas num rosa um pouco mais fundo
     que a copa, pousadas NA superficie.
   - TRONCO: grosso, curto, alarga na base, e BIFURCA em dois galhos
     visiveis que entram na copa (o vao entre copa e tronco mostra a
     forquilha).
   - BASE: montinho octogonal verde-oliva com pedrinhas ROSAS e tufos
     de grama.

   Tecnica: IcosahedronGeometry(r,1) pros volumes da copa (facetas
   grandes), CylinderGeometry de poucos lados pro tronco/galhos, tudo
   mesclado com cor por vertice (BufferGeometryUtils), Lambert +
   flatShading (NAO MeshStandardMaterial - o mundo tem 2 luzes, PBR nao
   ganha nada aqui). SEM castShadow/receiveShadow (CONTRATO.md). Sem
   luz nova, sem asset externo, nomes ASCII.

   Custo: 2 draw calls (corpo + flores). Triangulos a medir com o
   harness antes de fechar rodada - estimativa ~1.100, bem abaixo do
   teto do CONTRATO (3.000). */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteArvoreFlor = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'arvoreFlor';

  var CINZA = new T.Color(0x6a5a8f);
  var COR_COPA   = 0xf4afc7;   /* rosa claro e quente (referencia) */
  var COR_FLOR   = 0xe089ad;   /* rosa um pouco mais fundo pras gemas */
  var COR_TRONCO = 0x9a6b4a;   /* marrom quente */
  var COR_BASE   = 0x94a45f;   /* verde-oliva do montinho */
  var COR_GRAMA  = 0x7d9a4e;
  var COR_PEDRA  = 0xefb3c6;   /* pedrinhas rosas da base */

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

  var pecas = [];

  /* =========================================================================
     BASE — montinho octogonal de grama, com pedrinhas rosas e tufos
     ========================================================================= */
  var BASE_R = 0.95, BASE_ALT = 0.24;
  var base = new T.CylinderGeometry(BASE_R * 0.86, BASE_R, BASE_ALT, 8);
  base.translate(0, BASE_ALT / 2, 0);
  pecas.push(pinta(base, COR_BASE, 0.20));

  /* pedrinhas rosas (2 na frente, 1 atras, como na referencia) */
  var PEDRAS = [
    { x: -0.52, z: 0.42, r: 0.085 },
    { x: 0.55,  z: 0.35, r: 0.075 },
    { x: 0.15,  z: -0.55, r: 0.07 }
  ];
  for (var pd = 0; pd < PEDRAS.length; pd++) {
    var rocha = new T.IcosahedronGeometry(PEDRAS[pd].r, 0);
    rocha.translate(PEDRAS[pd].x, BASE_ALT + PEDRAS[pd].r * 0.5, PEDRAS[pd].z);
    pecas.push(pintaUni(rocha, COR_PEDRA, 0.06));
  }

  /* tufos de grama: laminas finas em par (cones de 3 lados) */
  var TUFOS = [{x:-0.30, z:0.55}, {x:0.42, z:-0.30}, {x:-0.55, z:-0.25}, {x:0.10, z:0.62}];
  for (var tf = 0; tf < TUFOS.length; tf++) {
    for (var lm = 0; lm < 2; lm++) {
      var lam = new T.ConeGeometry(0.028, 0.15 + lm * 0.05, 3);
      lam.rotateZ((lm === 0 ? 1 : -1) * 0.18);
      lam.translate(TUFOS[tf].x + lm * 0.045, BASE_ALT + 0.08, TUFOS[tf].z);
      pecas.push(pintaUni(lam, COR_GRAMA, 0.05));
    }
  }

  /* =========================================================================
     TRONCO — grosso, alarga na base, bifurca em 2 galhos que ENTRAM na copa
     ========================================================================= */
  var TR_Y0 = BASE_ALT - 0.02, TR_ALT = 0.85;
  var tronco = new T.CylinderGeometry(0.15, 0.26, TR_ALT, 7);
  tronco.translate(0.02, TR_Y0 + TR_ALT / 2, 0);
  tronco.rotateZ(0.03);   /* levissima inclinacao, tira o "poste reto" */
  pecas.push(pinta(tronco, COR_TRONCO, 0.24));

  var FORQUILHA_Y = TR_Y0 + TR_ALT - 0.06;
  function galho(anguloZ, anguloY, comprimento, r0) {
    var g = new T.CylinderGeometry(r0 * 0.55, r0, comprimento, 6);
    g.translate(0, comprimento / 2, 0);
    g.rotateZ(anguloZ);
    g.rotateY(anguloY);
    g.translate(0, FORQUILHA_Y, 0);
    return g;
  }
  /* forquilha visivel: esquerda mais aberta, direita mais fechada */
  pecas.push(pinta(galho(-0.55, 0.3, 0.72, 0.12), COR_TRONCO, 0.20));
  pecas.push(pinta(galho(0.48, -0.5, 0.62, 0.11), COR_TRONCO, 0.20));
  /* toquinho central curto continuando reto pra dentro da copa */
  pecas.push(pinta(galho(0.02, 0, 0.42, 0.10), COR_TRONCO, 0.20));

  /* =========================================================================
     COPA — nuvem unica: topo DOMINANTE + 2 laterais + 2 baixos, bem
     sobrepostos (centros proximos) pra silhueta ler como uma coisa so
     ========================================================================= */
  var COPA_BASE_Y = FORQUILHA_Y + 0.55;
  var BLOBS = [
    { x: 0.02,  y: COPA_BASE_Y + 0.52, z: 0,     r: 0.66 },   /* TOPO dominante */
    { x: -0.50, y: COPA_BASE_Y + 0.10, z: 0.06,  r: 0.46 },   /* esquerda */
    { x: 0.50,  y: COPA_BASE_Y + 0.14, z: -0.06, r: 0.44 },   /* direita */
    { x: -0.12, y: COPA_BASE_Y - 0.10, z: 0.38,  r: 0.42 },   /* frente-baixo */
    { x: 0.14,  y: COPA_BASE_Y - 0.08, z: -0.36, r: 0.42 }    /* tras-baixo */
  ];
  for (var b = 0; b < BLOBS.length; b++) {
    var bl = BLOBS[b];
    var blob = new T.IcosahedronGeometry(bl.r, 1);
    blob.rotateY(b * 0.7);   /* varia a orientacao das facetas entre blobs */
    blob.translate(bl.x, bl.y, bl.z);
    pecas.push(pinta(blob, COR_COPA, 0.07));
  }

  var geoCorpo = BGU.mergeBufferGeometries(pecas);
  var matSolido = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var meshCorpo = new T.Mesh(geoCorpo, matSolido);
  meshCorpo.name = 'arvoreflor_corpo';
  grupo.add(meshCorpo);

  /* =========================================================================
     FLORES — gemas pequenas pousadas NA superficie dos blobs (direcao
     unitaria local x raio + folga, nunca enterradas na sobreposicao)
     ========================================================================= */
  var pecasFlor = [];
  var FLOR_DEFS = [
    { blob: 0, dir: [-0.45,  0.60,  0.65] },
    { blob: 0, dir: [ 0.60,  0.45, -0.55] },
    { blob: 0, dir: [ 0.10,  0.95,  0.25] },
    { blob: 1, dir: [-0.75,  0.15,  0.62] },
    { blob: 2, dir: [ 0.80,  0.25,  0.40] },
    { blob: 3, dir: [-0.25, -0.15,  0.95] },
    { blob: 4, dir: [ 0.45, -0.10, -0.88] }
  ];
  for (var f = 0; f < FLOR_DEFS.length; f++) {
    var def = FLOR_DEFS[f], bl2 = BLOBS[def.blob];
    var dl = Math.hypot(def.dir[0], def.dir[1], def.dir[2]);
    var dx = def.dir[0] / dl, dy = def.dir[1] / dl, dz = def.dir[2] / dl;
    var rf = bl2.r + 0.045;
    var flor = new T.IcosahedronGeometry(0.095, 0);
    flor.rotateY(f * 1.1);
    flor.translate(bl2.x + dx * rf, bl2.y + dy * rf, bl2.z + dz * rf);
    pecasFlor.push(flor);
  }
  var geoFlor = BGU.mergeBufferGeometries(pecasFlor);
  var meshFlor = new T.Mesh(pintaUni(geoFlor, COR_FLOR, 0.03), new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  meshFlor.name = 'arvoreflor_flores';
  grupo.add(meshFlor);

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 2, tri: 1100 }   /* a remedir com harness */
  };
};

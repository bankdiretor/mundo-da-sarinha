// roda-luzes.js
// Peca "Iluminacao e FX" da roda-gigante (RODADA 2, categoria Iluminacao e FX).
// Tudo aqui fica em coisas que NAO giram: postes fixos no chao, particulas e
// notas soltas no ar (posicao fixa, so bob/flicker no update), e uma guirlanda
// presa no chao em volta da fundacao da Rodada 1. Nada e preso no aro, nos
// raios ou nas cabines, e a variavel de giro da roda nunca e lida aqui.

window.MUNDO_PARTES = window.MUNDO_PARTES || {};

window.MUNDO_PARTES.parteRodaLuzes = function (ctx) {
  var T = ctx.T;
  var grupo = new T.Group();

  // ---- paleta ----
  var COR_CREME = 0xF4EDDE;
  var COR_ROSA = 0xE8A7B2;
  var COR_MEL = 0xE9B44C;
  var COR_ROXO = 0x6A3FC5;
  var COR_DOURADO = 0xFFD166;

  function escurecer(hex) {
    return new T.Color(hex).lerp(new T.Color(0x6a5a8f), 0.18).getHex();
  }

  var CENTRO_X = 43.5;
  var CENTRO_Z = 0.0;
  var GOLDEN_ANGLE = 2.399963;

  // clona geo, aplica transform (posicao/rotacao/escala) e tira o uv --
  // uv fora ANTES do merge, senao BufferGeometryUtils devolve null calado.
  function xformGeo(geoBase, x, y, z, rx, ry, rz, s) {
    var g = geoBase.clone();
    var obj = new T.Object3D();
    obj.position.set(x, y, z);
    obj.rotation.set(rx || 0, ry || 0, rz || 0);
    obj.scale.setScalar(s || 1);
    obj.updateMatrix();
    g.applyMatrix4(obj.matrix);
    g.deleteAttribute('uv');
    return g;
  }

  var _dummy = new T.Object3D();

  // =========================================================
  // 1) POSTES DE LUZ FESTIVOS
  // Posicoes pre-validadas (raio ~11.4-12.4 do centro da roda): dentro da
  // cerca do parque (raio 11.6 a partir de 42,0 -- centro do parque, que e
  // deslocado do centro da roda), fora da fundacao da Rodada 1 (raio 9.6),
  // e longe da gangorra (36.5,6.5) e do carrossel (35.5,-5.5).
  // =========================================================
  var grupoPostes = new T.Group();
  var POSTES = [
    { x: 39.60, z: 10.71 },
    { x: 38.68, z: 10.33 },
    { x: 32.26, z: 5.24 },
    { x: 31.78, z: 2.07 },
    { x: 31.10, z: 0.00 },
    { x: 31.52, z: -3.21 },
    { x: 37.80, z: -9.87 },
    { x: 39.60, z: -10.71 }
  ];
  var HASTE_H = 2.0;

  var hasteBase = new T.CylinderGeometry(0.045, 0.07, HASTE_H, 10, 1, true);
  var anelBase = new T.TorusGeometry(0.11, 0.032, 8, 16);

  var postesGeoms = [];
  for (var pi = 0; pi < POSTES.length; pi++) {
    var pp = POSTES[pi];
    postesGeoms.push(xformGeo(hasteBase, pp.x, HASTE_H / 2, pp.z, 0, 0, 0, 1));
    postesGeoms.push(xformGeo(anelBase, pp.x, HASTE_H - 0.05, pp.z, Math.PI / 2, 0, 0, 1));
  }
  var postesGeo = T.BufferGeometryUtils.mergeBufferGeometries(postesGeoms, false);
  var postesMat = ctx.materialFeltro(escurecer(COR_MEL));
  var postesMesh = new T.Mesh(postesGeo, postesMat);
  grupoPostes.add(postesMesh);

  var lanternaGeo = new T.SphereGeometry(0.24, 12, 8);
  var lanternaMat = ctx.materialBrilho(COR_DOURADO);
  var lanternaMesh = new T.InstancedMesh(lanternaGeo, lanternaMat, POSTES.length);
  var lanternaBase = [];
  for (var li = 0; li < POSTES.length; li++) {
    var lp = POSTES[li];
    var ly = HASTE_H + 0.30;
    lanternaBase.push({ x: lp.x, y: ly, z: lp.z, fase: li * 0.9 });
    _dummy.position.set(lp.x, ly, lp.z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    lanternaMesh.setMatrixAt(li, _dummy.matrix);
  }
  lanternaMesh.instanceMatrix.needsUpdate = true;
  grupoPostes.add(lanternaMesh);
  grupo.add(grupoPostes);

  // =========================================================
  // 2) PARTICULAS FLUTUANTES
  // Soltas no ar, raio 8-14 do centro da roda, altura 2-12. Posicao base
  // fixa; so sobem/descem e piscam de leve no update.
  // =========================================================
  var grupoParticulas = new T.Group();
  var N_PART = 24;
  var particulaGeo = new T.IcosahedronGeometry(0.12, 0);
  var partDouradoMat = ctx.materialBrilho(COR_DOURADO);
  var partCremeMat = ctx.materialBrilho(COR_CREME);
  var partCountEach = N_PART / 2;
  var partDouradoMesh = new T.InstancedMesh(particulaGeo, partDouradoMat, partCountEach);
  var partCremeMesh = new T.InstancedMesh(particulaGeo, partCremeMat, partCountEach);
  var partBaseD = [];
  var partBaseC = [];
  for (var i = 0; i < N_PART; i++) {
    var ang = i * GOLDEN_ANGLE;
    var raio = 8 + 6 * ((i * 0.6180339887) % 1);
    var alt = 2 + 10 * (((i * 0.37) + 0.15) % 1);
    var px = CENTRO_X + raio * Math.cos(ang);
    var pz = CENTRO_Z + raio * Math.sin(ang);
    var item = { x: px, y: alt, z: pz, fase: i * 0.83 };
    if (i % 2 === 0) { partBaseD.push(item); } else { partBaseC.push(item); }
  }
  for (var di = 0; di < partBaseD.length; di++) {
    var d = partBaseD[di];
    _dummy.position.set(d.x, d.y, d.z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    partDouradoMesh.setMatrixAt(di, _dummy.matrix);
  }
  partDouradoMesh.instanceMatrix.needsUpdate = true;
  for (var ci = 0; ci < partBaseC.length; ci++) {
    var c = partBaseC[ci];
    _dummy.position.set(c.x, c.y, c.z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    partCremeMesh.setMatrixAt(ci, _dummy.matrix);
  }
  partCremeMesh.instanceMatrix.needsUpdate = true;
  grupoParticulas.add(partDouradoMesh);
  grupoParticulas.add(partCremeMesh);
  grupo.add(grupoParticulas);

  // =========================================================
  // 3) NOTAS MUSICAIS FLUTUANTES
  // bolinha + hastezinha, douradas e lilases, mesma faixa de altura
  // das particulas, boiando perto da roda.
  // =========================================================
  var grupoNotas = new T.Group();
  var N_NOTAS = 10;
  var noteHeadGeo = new T.SphereGeometry(0.16, 10, 8);
  var noteStemGeo = new T.BoxGeometry(0.045, 0.5, 0.045);
  var notaGeoms = [
    xformGeo(noteHeadGeo, 0, 0, 0, 0, 0, 0, 1),
    xformGeo(noteStemGeo, 0.14, 0.28, 0, 0, 0, 0.15, 1)
  ];
  var notaGeo = T.BufferGeometryUtils.mergeBufferGeometries(notaGeoms, false);

  var roxoClaro = new T.Color(COR_ROXO).lerp(new T.Color(0xffffff), 0.35).getHex();
  var notaDouradoMat = ctx.materialBrilho(COR_DOURADO);
  var notaRoxoMat = ctx.materialBrilho(roxoClaro);
  var notaCountEach = N_NOTAS / 2;
  var notaDouradoMesh = new T.InstancedMesh(notaGeo, notaDouradoMat, notaCountEach);
  var notaRoxoMesh = new T.InstancedMesh(notaGeo, notaRoxoMat, notaCountEach);
  var notaBaseD = [];
  var notaBaseC = [];
  for (var ni = 0; ni < N_NOTAS; ni++) {
    var nang = ni * GOLDEN_ANGLE + 1.3;
    var nraio = 6.5 + 4 * ((ni * 0.6180339887 + 0.21) % 1);
    var nalt = 2 + 10 * (((ni * 0.53) + 0.4) % 1);
    var nx = CENTRO_X + nraio * Math.cos(nang);
    var nz = CENTRO_Z + nraio * Math.sin(nang);
    var ntilt = -0.3 + 0.6 * ((ni * 0.37) % 1);
    var nitem = { x: nx, y: nalt, z: nz, rot: ntilt, fase: ni * 1.05 };
    if (ni % 2 === 0) { notaBaseD.push(nitem); } else { notaBaseC.push(nitem); }
  }
  for (var ndi = 0; ndi < notaBaseD.length; ndi++) {
    var nd = notaBaseD[ndi];
    _dummy.position.set(nd.x, nd.y, nd.z);
    _dummy.rotation.set(0, 0, nd.rot);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    notaDouradoMesh.setMatrixAt(ndi, _dummy.matrix);
  }
  notaDouradoMesh.instanceMatrix.needsUpdate = true;
  for (var nci = 0; nci < notaBaseC.length; nci++) {
    var nc = notaBaseC[nci];
    _dummy.position.set(nc.x, nc.y, nc.z);
    _dummy.rotation.set(0, 0, nc.rot);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    notaRoxoMesh.setMatrixAt(nci, _dummy.matrix);
  }
  notaRoxoMesh.instanceMatrix.needsUpdate = true;
  grupoNotas.add(notaDouradoMesh);
  grupoNotas.add(notaRoxoMesh);
  grupo.add(grupoNotas);

  // =========================================================
  // 4) GUIRLANDA DE LUZES NO CHAO
  // pisca-pisca acompanhando o contorno externo da fundacao da Rodada 1
  // (raio ~9.6), um pouco fora dela, presa no chao (nao gira).
  // =========================================================
  var grupoGuirlanda = new T.Group();
  var N_GUIR = 64;
  var GUIR_RAIO = 9.8;
  var GUIR_Y = 0.22;
  var guirGeo = new T.IcosahedronGeometry(0.09, 0);
  var guirDouradoMat = ctx.materialBrilho(COR_DOURADO);
  var guirRosaMat = ctx.materialBrilho(COR_ROSA);
  var guirCountEach = N_GUIR / 2;
  var guirDouradoMesh = new T.InstancedMesh(guirGeo, guirDouradoMat, guirCountEach);
  var guirRosaMesh = new T.InstancedMesh(guirGeo, guirRosaMat, guirCountEach);
  var guirBaseD = [];
  var guirBaseC = [];
  for (var gi = 0; gi < N_GUIR; gi++) {
    var gang = (gi / N_GUIR) * Math.PI * 2;
    var gx = CENTRO_X + GUIR_RAIO * Math.cos(gang);
    var gz = CENTRO_Z + GUIR_RAIO * Math.sin(gang);
    var gitem = { x: gx, y: GUIR_Y, z: gz, ordem: gi };
    if (gi % 2 === 0) { guirBaseD.push(gitem); } else { guirBaseC.push(gitem); }
  }
  for (var gdi = 0; gdi < guirBaseD.length; gdi++) {
    var gd = guirBaseD[gdi];
    _dummy.position.set(gd.x, gd.y, gd.z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    guirDouradoMesh.setMatrixAt(gdi, _dummy.matrix);
  }
  guirDouradoMesh.instanceMatrix.needsUpdate = true;
  for (var gci = 0; gci < guirBaseC.length; gci++) {
    var gc = guirBaseC[gci];
    _dummy.position.set(gc.x, gc.y, gc.z);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    guirRosaMesh.setMatrixAt(gci, _dummy.matrix);
  }
  guirRosaMesh.instanceMatrix.needsUpdate = true;
  grupoGuirlanda.add(guirDouradoMesh);
  grupoGuirlanda.add(guirRosaMesh);
  grupo.add(grupoGuirlanda);

  // =========================================================
  // update: so bob/flicker de coisas soltas no ar ou presas no chao.
  // NUNCA le a variavel de giro da roda, nunca acompanha aro/raios/cabines.
  // =========================================================
  function atualizaFlutuante(mesh, base, t, ampY, velY, ampFlick, velFlick) {
    for (var k = 0; k < base.length; k++) {
      var it = base[k];
      var y = it.y + ampY * Math.sin(t * velY + it.fase);
      var esc = 1 + ampFlick * Math.sin(t * velFlick + it.fase * 1.7);
      _dummy.position.set(it.x, y, it.z);
      _dummy.rotation.set(0, 0, it.rot !== undefined ? it.rot : 0);
      _dummy.scale.setScalar(esc);
      _dummy.updateMatrix();
      mesh.setMatrixAt(k, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function atualizaGuirlanda(mesh, base, t, velFlick, dirSign) {
    for (var k = 0; k < base.length; k++) {
      var it = base[k];
      var esc = 0.82 + 0.22 * Math.sin(t * velFlick + dirSign * it.ordem * 0.35);
      _dummy.position.set(it.x, it.y, it.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.setScalar(esc);
      _dummy.updateMatrix();
      mesh.setMatrixAt(k, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    grupo: grupo,
    update: function (t, dt) {
      atualizaFlutuante(partDouradoMesh, partBaseD, t, 0.45, 0.6, 0.12, 1.8);
      atualizaFlutuante(partCremeMesh, partBaseC, t, 0.45, 0.6, 0.12, 1.9);
      atualizaFlutuante(notaDouradoMesh, notaBaseD, t, 0.35, 0.5, 0, 0);
      atualizaFlutuante(notaRoxoMesh, notaBaseC, t, 0.35, 0.5, 0, 0);
      atualizaFlutuante(lanternaMesh, lanternaBase, t, 0.03, 0.8, 0.06, 2.2);
      atualizaGuirlanda(guirDouradoMesh, guirBaseD, t, 2.0, 1);
      atualizaGuirlanda(guirRosaMesh, guirBaseC, t, 2.0, -1);
    },
    // custo MEDIDO com three.js r147 real (script separado em
    // scratchpad/medir-roda-luzes/measure.js), nao estimado.
    custo: {
      dc: 8,
      tri: 6832,
      subsistemas: {
        postes: { dc: 2, tri: 3552 },
        particulas: { dc: 2, tri: 480 },
        notas: { dc: 2, tri: 1520 },
        guirlanda: { dc: 2, tri: 1280 }
      }
    }
  };
};

/* parteIlha — transforma o chao do mundo numa ILHA FLUTUANTE magica no ceu:
   uma saia de rocha facetada pendurada sob o mundo, um barranco de terra e
   grama na beirada, nuvens fofas flutuando ao redor (InstancedMesh, com
   leve balanco no update), uma cascatinha caindo da borda e sumindo nas
   nuvens, e pedras soltas boiando com grama e arvorezinhas.
   Tudo fica ABAIXO ou NA BORDA do chao existente (raio ~88, desde que o
   mundo cresceu) — nada aqui invade a area onde a crianca anda.
   ⛔ ERA calibrado pro mundo antigo (grama terminava em ~58): quando o
   mundo cresceu (grama agora vai a 74, esmaece ate 88), este arquivo NUNCA
   foi atualizado — o barranco de grama continuou nos raios antigos,
   flutuando no MEIO do gramado novo como uma faixa verde estranha cruzando
   o mapa inteiro (visto pelo Ivan, "uma faixa verde passando por um monte
   de lugar"). Todo raio aqui foi deslocado pelo mesmo delta (+30, a
   diferenca entre o fim do gramado antigo e o novo) pra a ilha voltar a
   comecar exatamente onde o chao andavel termina.
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteIlha = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'ilha';

  var CINZA = new T.Color(0x6a5a8f);

  /* pseudo-aleatorio deterministico (mesmo visual toda vez que o mundo carrega) */
  function pr(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }

  /* ---- pintura em degrade: topo (y alto) da PROPRIA peca ate a base (y baixo) ---- */
  function pintaGrad(geo, corTopo, corBase) {
    var cTopo = new T.Color(corTopo), cBase = new T.Color(corBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var f = (ys[k] - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, f);
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    /* TetrahedronGeometry/IcosahedronGeometry nascem SEM indice, enquanto
       Cylinder/Sphere/Plane nascem COM indice — mergeBufferGeometries exige
       que todas as pecas sejam iguais nesse quesito (senao devolve null em
       silencio). Uniformiza tudo para nao-indexado aqui, um unico lugar. */
    return geo.index ? geo.toNonIndexed() : geo;
  }
  /* ---- pintura solida (com escurecida opcional, regra do contrato) ---- */
  function pintaUni(geo, cor, fEscuro) {
    var base = new T.Color(cor);
    if (fEscuro) base = base.lerp(CINZA, fEscuro);
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = base.r; a[i * 3 + 1] = base.g; a[i * 3 + 2] = base.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo.index ? geo.toNonIndexed() : geo;
  }

  var matSolido = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var matAgua = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.75, depthWrite: false, side: T.DoubleSide });
  var matNuvem = new T.MeshLambertMaterial({ vertexColors: true });

  var pecasSolido = [];  /* tudo opaco (rocha, barranco, pedras, espuma) vira 1 malha */

  /* =====================================================================
     1) SAIA DE ROCHA — cone invertido pendurado sob o mundo, do raio 92
        (y=0, por fora de tudo) ate a ponta em y=-26. Facetado, poucos
        lados, lilas-acinzentado no topo escurecendo para a ponta.
     ===================================================================== */
  var R_TOPO = 92, R_PONTA = 0.6, ALT_ROCHA = 26, LADOS_ROCHA = 10;
  var normR, normY; /* normal para fora/baixo da parede do cone (usada pelas lascas) */
  (function saiaDeRocha() {
    var geo = new T.CylinderGeometry(R_TOPO, R_PONTA, ALT_ROCHA, LADOS_ROCHA, 3, true);
    /* leve irregularidade organica por vertice, sem perder o facetado low-poly */
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i);
      var r = Math.hypot(x, z);
      if (r > 0.001) {
        var j = 1 + (pr(i * 0.13) - 0.5) * 0.16;
        pos.setX(i, x * j); pos.setZ(i, z * j);
      }
    }
    pos.needsUpdate = true;
    geo.translate(0, -ALT_ROCHA / 2, 0); /* agora vai de y=0 (topo, raio 62) a y=-26 (ponta) */
    geo.computeVertexNormals();
    pecasSolido.push(pintaGrad(geo, 0x7a6f92, 0x5b5170));

    var dR = R_PONTA - R_TOPO, dY = -ALT_ROCHA, compr = Math.hypot(dR, dY);
    normR = -dY / compr; normY = dR / compr; /* perpendicular a parede, apontando pra fora/baixo */
  })();

  /* lascas de rocha saindo da saia, para nao ficar um cone liso */
  (function lascas() {
    var N = 16;
    for (var i = 0; i < N; i++) {
      var ang = (i / N) * Math.PI * 2 + (pr(i + 0.5) - 0.5) * 0.4;
      var hy = 0.14 + pr(i * 1.7 + 3) * 0.62; /* 0.14..0.76 ao longo da saia */
      var rad = R_TOPO + (R_PONTA - R_TOPO) * hy;
      var y = -hy * ALT_ROCHA;
      var tam = 1.0 + pr(i * 2.3 + 9) * 1.1;
      var geo = new T.TetrahedronGeometry(tam, 0);
      var fora = new T.Vector3(Math.cos(ang) * normR, normY, Math.sin(ang) * normR).normalize();
      var q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), fora);
      geo.applyQuaternion(q);
      geo.translate(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
      var tom = new T.Color(0x8f83a8).lerp(new T.Color(0x5b5170), hy);
      pecasSolido.push(pintaUni(geo, tom));
    }
  })();

  /* =====================================================================
     2) BARRANCO — terra clara + franja de grama na beirada (y=0 a y=-3),
        ligando o chao de grama existente (raio ~88) a saia de rocha (92).
     ===================================================================== */
  (function barranco() {
    var terra = new T.CylinderGeometry(88, 92.5, 3, 30, 1, true);
    terra.translate(0, -1.5, 0);
    pecasSolido.push(pintaGrad(terra, 0xb59ab0, new T.Color(0xb59ab0).lerp(CINZA, 0.24)));

    var grama = new T.CylinderGeometry(85, 89.5, 1.5, 30, 1, true);
    grama.translate(0, -0.35, 0);
    pecasSolido.push(pintaGrad(grama, 0xa8cc9c, new T.Color(0xa8cc9c).lerp(CINZA, 0.22)));

    /* tufos pendurados na borda, para a franja nao ficar um anel liso demais */
    var NT = 36;
    for (var i = 0; i < NT; i++) {
      var ang = (i / NT) * Math.PI * 2;
      var raio = 86 + pr(i * 1.9) * 2.6;
      var tufo = new T.TetrahedronGeometry(0.55 + pr(i * 2.7 + 1) * 0.35, 0);
      tufo.rotateY(pr(i * 3.3 + 2) * Math.PI * 2);
      tufo.translate(Math.cos(ang) * raio, -0.12 - pr(i * 1.3 + 4) * 0.6, Math.sin(ang) * raio);
      pecasSolido.push(pintaUni(tufo, (i % 2) ? 0xa8cc9c : 0x9dc491, 0.08));
    }
  })();

  /* =====================================================================
     3) CASCATINHA — cai da beirada perto de x=-20,z=-52 (longe dos
        caminhos) e some nas nuvens. Faixas translucidas + espuma no topo.
     ===================================================================== */
  function faixaAgua(pecas, topX, topZ, botX, botZ, axX, axZ, wTopo, wBase, fase, seg) {
    var altura = 24;
    var geo = new T.PlaneGeometry(1, altura, 1, seg || 6);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var xl = pos.getX(i), yl = pos.getY(i);
      var t = (yl + altura / 2) / altura; /* 0 no topo .. 1 na base */
      var larg = wTopo + (wBase - wTopo) * t;
      var curva = Math.sin(t * Math.PI * 1.6 + fase) * 0.55 * t; /* mais sinuoso perto da base */
      var lateral = xl * larg + curva;
      var cx = topX + (botX - topX) * t, cz = topZ + (botZ - topZ) * t;
      pos.setX(i, cx + axX * lateral);
      pos.setY(i, -altura * t);
      pos.setZ(i, cz + axZ * lateral);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    pecas.push(pintaGrad(geo, 0xdff3ff, 0x8fc3e6));
  }

  /* ponto da beirada onde a agua cai — era (-20,-52), raio 55.7 (a beirada
     antiga); escalado pro mesmo raio (85.7) da beirada nova, mesmo angulo */
  var TOPX = -30.8, TOPZ = -80.0;
  (function cascatinha() {
    var dd = Math.hypot(TOPX, TOPZ) || 1;
    var dirX = TOPX / dd, dirZ = TOPZ / dd;   /* direcao radial, para fora do mundo */
    var perpX = -dirZ, perpZ = dirX;           /* direcao tangencial */
    var BOTX = TOPX + dirX * 14, BOTZ = TOPZ + dirZ * 14; /* desliza para fora ao cair */

    var pecasAgua = [];
    for (var i = -2; i <= 2; i++) {
      var lat = i * 1.5;
      var tX = TOPX + perpX * lat, tZ = TOPZ + perpZ * lat;
      var bX = BOTX + perpX * lat * 0.4, bZ = BOTZ + perpZ * lat * 0.4;
      /* par cruzado (tangencial + radial) para ficar cheio visto de qualquer angulo */
      faixaAgua(pecasAgua, tX, tZ, bX, bZ, perpX, perpZ, 1.1, 0.4, i * 1.7, 6);
      faixaAgua(pecasAgua, tX, tZ, bX, bZ, dirX, dirZ, 0.55, 0.22, i * 1.7 + 1.9, 6);
    }
    var meshAgua = new T.Mesh(BGU.mergeBufferGeometries(pecasAgua), matAgua);
    grupo.add(meshAgua);

    /* espuma no topo da queda: esferinhas brancas — sao opacas, entram no DC solido */
    for (var k = 0; k < 12; k++) {
      var ang2 = k * 2.4 + pr(k + 200) * 0.6;
      var raioE = 0.35 + pr(k * 1.4 + 210) * 0.9;
      var ex = TOPX + Math.cos(ang2) * raioE;
      var ez = TOPZ + Math.sin(ang2) * raioE;
      var ey = 0.1 - pr(k * 1.7 + 220) * 1.4; /* algumas escorregando borda abaixo */
      var r = 0.2 + pr(k * 2.3 + 230) * 0.28;
      var esf = new T.SphereGeometry(r, 6, 4);
      esf.translate(ex, ey, ez);
      pecasSolido.push(pintaUni(esf, 0xffffff));
    }
  })();

  /* =====================================================================
     4) PEDRAS FLUTUANTES — 6 pedrinhas soltas boiando ao redor da ilha,
        com grama em cima e arvorezinha em algumas.
     ===================================================================== */
  (function pedrasFlutuantes() {
    var N = 6;
    var comArvore = { 1: true, 4: true };
    for (var i = 0; i < N; i++) {
      var ang = (i / N) * Math.PI * 2 + (pr(i + 10) - 0.5) * 0.5;
      var r = 96 + pr(i * 1.3 + 20) * 24;       /* 96..120 */
      var y = -12 + pr(i * 2.1 + 30) * 18;      /* -12..+6 */
      var x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      var raioPedra = 1.5 + pr(i * 3.7 + 40) * 0.9;

      var corpo = new T.IcosahedronGeometry(raioPedra, 0);
      corpo.rotateY(i * 1.1);
      corpo = pintaGrad(corpo, 0x9088ab, 0x5b5170);
      corpo.translate(x, y, z);
      pecasSolido.push(corpo);

      var grama = new T.IcosahedronGeometry(raioPedra * 0.72, 0);
      grama.scale(1, 0.38, 1);
      grama = pintaGrad(grama, 0xbcd6b0, new T.Color(0xbcd6b0).lerp(CINZA, 0.2));
      grama.translate(x, y + raioPedra * 0.52, z);
      pecasSolido.push(grama);

      if (comArvore[i]) {
        var tronco = new T.CylinderGeometry(0.05, 0.08, 0.42, 5, 1, true);
        tronco = pintaUni(tronco, 0x8c7a9e, 0.18);
        tronco.translate(x + raioPedra * 0.15, y + raioPedra * 0.52 + 0.2, z);
        pecasSolido.push(tronco);

        var copa = new T.IcosahedronGeometry(0.3, 0);
        copa = pintaGrad(copa, 0xbcd6b0, new T.Color(0xbcd6b0).lerp(CINZA, 0.2));
        copa.translate(x + raioPedra * 0.15, y + raioPedra * 0.52 + 0.46, z);
        pecasSolido.push(copa);
      }
    }
  })();

  /* junta tudo que e opaco numa unica malha (1 draw call) */
  var meshSolido = new T.Mesh(BGU.mergeBufferGeometries(pecasSolido), matSolido);
  grupo.add(meshSolido);

  /* =====================================================================
     5) NUVENS — o que faz a ilha "flutuar": ~26 nuvens fofas em anel ao
        redor e embaixo, InstancedMesh (1 draw call), com leve balanco.
     ===================================================================== */
  var geoNuvemUnidade = (function () {
    var pecas = [];
    var partes = [
      { x: -0.55, y: 0.02, z: 0.05, r: 0.62 },
      { x: 0.5, y: 0.06, z: -0.06, r: 0.56 },
      { x: 0.0, y: 0.34, z: 0.05, r: 0.48 },
      { x: -0.02, y: -0.02, z: 0.4, r: 0.42 }
    ];
    partes.forEach(function (p) {
      var g = new T.SphereGeometry(p.r, 6, 4);
      g.scale(1, 0.62, 1);
      g.translate(p.x, p.y, p.z);
      pecas.push(pintaGrad(g, 0xffffff, 0xf2d3e2));
    });
    return BGU.mergeBufferGeometries(pecas);
  })();

  var N_NUVEM = 26;
  var instNuvem = new T.InstancedMesh(geoNuvemUnidade, matNuvem, N_NUVEM);
  var nuvemBase = [];
  (function porNuvens() {
    var m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3();
    for (var i = 0; i < N_NUVEM; i++) {
      var ang = (i / N_NUVEM) * Math.PI * 2 + (pr(i + 50) - 0.5) * 0.35;
      var r = 100 + pr(i * 1.6 + 60) * 40;     /* 100..140 */
      var y = -30 + pr(i * 2.2 + 70) * 24;     /* -30..-6 */
      var esc = 2.2 + pr(i * 3.1 + 80) * 2.6;
      var rotY = pr(i * 4.4 + 90) * Math.PI * 2;
      var base = {
        x: Math.cos(ang) * r, y: y, z: Math.sin(ang) * r, esc: esc, rotY: rotY,
        fase: pr(i * 5.1 + 100) * Math.PI * 2,
        amp: 0.3 + pr(i * 1.1 + 110) * 0.5,
        vel: 0.12 + pr(i * 1.9 + 120) * 0.18
      };
      nuvemBase.push(base);
      e.set(0, rotY, 0); q.setFromEuler(e); v.set(base.x, base.y, base.z); s.set(esc, esc, esc);
      m.compose(v, q, s);
      instNuvem.setMatrixAt(i, m);
    }
    instNuvem.instanceMatrix.needsUpdate = true;
  })();
  grupo.add(instNuvem);

  var mT = new T.Matrix4(), qT = new T.Quaternion(), eT = new T.Euler(), vT = new T.Vector3(), sT = new T.Vector3();
  function atualizaNuvens(t) {
    for (var i = 0; i < N_NUVEM; i++) {
      var b = nuvemBase[i];
      vT.set(b.x, b.y + Math.sin(t * b.vel + b.fase) * b.amp, b.z);
      eT.set(0, b.rotY, 0); qT.setFromEuler(eT);
      sT.set(b.esc, b.esc, b.esc);
      mT.compose(vT, qT, sT);
      instNuvem.setMatrixAt(i, mT);
    }
    instNuvem.instanceMatrix.needsUpdate = true;
  }

  return {
    grupo: grupo,
    update: function (t) { atualizaNuvens(t); },
    custo: { dc: 3, tri: 4984 } /* MEDIDO: mesh solido 1120 + agua 120 + nuvens (144 x 26 instancias) 3744 */
  };
};

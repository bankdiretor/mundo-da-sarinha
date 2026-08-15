/* parteAgua — a AGUA DO MUNDO: o lago com fonte no miolo da Vilinha das
   Cores (miolo raio<7 em torno de (0,+40), vazio ate aqui), duas pontinhas
   de madeira cruzando (eixo x e eixo z, com um vao livre no centro para a
   fonte), um riachinho decorativo na borda do bairro, nenufares e dois
   patinhos boiando que giram devagar.
   flatShading:true no material da agua e o truque: o shader deriva a normal
   da propria posicao do triangulo em tempo real, entao quando a superficie
   ondula no update() a luz reage sozinha, sem recalcular normais na CPU
   a cada frame (caro no celular). Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteAgua = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'agua';

  var CZ = 40;                 /* mesmo centro da Vilinha */
  var CINZA = new T.Color(0x6a5a8f);

  /* ---- pintura em degrade por altura (copiada do padrao da vilinha),
     com a normalizacao de indice da armadilha do CONTRATO: Icosahedron
     nasce SEM indice, Box/Cylinder/Cone/Circle/Ring/Plane nascem COM —
     misturar as duas familias no mesmo merge devolve null em silencio. */
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.18 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var f = (ys[k] - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.25));
      a[k*3] = c.r; a[k*3+1] = c.g; a[k*3+2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  /* listras de tabua: mesma geometria da tabua unica, mas colorida em
     faixas alternadas ao longo de um eixo — da a leitura de "tabuas"
     sem gastar 1 triangulo a mais. */
  function pintaTabuas(geo, corA, corB, getCoord) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    var cA = new T.Color(corA), cB = new T.Color(corB);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var faixa = Math.floor(getCoord(pos, i) / 0.42);
      var c = (faixa % 2 === 0) ? cA : cB;
      a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }

  var matSolido = new T.MeshLambertMaterial({ vertexColors: true });
  var matAgua = new T.MeshLambertMaterial({
    vertexColors: true, transparent: true, opacity: 0.88,
    depthWrite: false, side: T.DoubleSide, flatShading: true, emissive: new T.Color(0x2f7fa8)
  });

  var pecasSolido = [];   /* pedrinhas, fonte de pedra, pontes, pedras do riacho, nenufares */
  var pecasAgua = [];     /* espelho do lago, jorro, arcos, gotinhas, faixa do riacho */

  /* =====================================================================
     1) LAGO — fundo escuro (le como profundidade), espelho d'agua com
        ondulacao (RingGeometry com phiSegments = aneis radiais para a
        onda se propagar do centro para a borda) e borda de pedrinhas.
     ===================================================================== */
  var R_LAGO = 5.5, R_BORDA = 5.65, R_COLISOR = 5.8;

  (function fundo() {
    var g = new T.CircleGeometry(5.4, 32).rotateX(-Math.PI / 2);
    g.translate(0, 0.015, CZ);
    pecasSolido.push(pinta(g, 0x2f6b6a, 0.22));
  })();

  var nVertLago = 0, nVertJorro = 0;
  (function superficie() {
    var g = new T.RingGeometry(0.06, R_LAGO, 40, 6).rotateX(-Math.PI / 2);
    g.translate(0, 0.05, CZ);
    g = pinta(g, 0x4fb3dd, 0.02);
    nVertLago = g.attributes.position.count;
    pecasAgua.push(g);
  })();

  /* pedrinhas claras em 8 direcoes (2 por direcao = 16); colisor SO nas
     4 diagonais — nos eixos (0/90/180/270) e onde as pontes cruzam a
     margem, essas ficam livres de proposito. */
  (function pedrinhasEColisores() {
    for (var i = 0; i < 8; i++) {
      var ang = i * Math.PI / 4;
      for (var k = 0; k < 2; k++) {
        var a2 = ang + (k - 0.5) * 0.22;
        var rr = R_BORDA + (k - 0.5) * 0.18;
        var x = Math.cos(a2) * rr, z = CZ + Math.sin(a2) * rr;
        var peb = new T.IcosahedronGeometry(0.11 + 0.04 * ((i + k) % 2), 0);
        peb.translate(x, 0.09, z);
        pecasSolido.push(pinta(peb, 0xe4dccb, 0.16));
      }
      if (i % 2 === 1) { /* 45,135,225,315: longe das pontes */
        ctx.COLISORES.push({ x: Math.cos(ang) * R_COLISOR, z: CZ + Math.sin(ang) * R_COLISOR, raio: 0.5 });
      }
    }
  })();

  /* =====================================================================
     2) FONTE — base de pedra em 2 niveis + jorro central (pulsa) + 3 arcos
        caindo + gotinhas. Colisor unico no centro.
     ===================================================================== */
  ctx.COLISORES.push({ x: 0, z: CZ, raio: 1.5 });

  (function fonteBase() {
    var t1 = new T.CylinderGeometry(1.3, 1.45, 0.22, 14, 1, false);
    t1.translate(0, 0.11, CZ);
    pecasSolido.push(pinta(t1, 0xd8d0c0, 0.16));
    var t2 = new T.CylinderGeometry(0.85, 1.05, 0.22, 14, 1, false);
    t2.translate(0, 0.33, CZ);
    pecasSolido.push(pinta(t2, 0xe4dccb, 0.14));
  })();

  (function jorro() {
    var g = new T.ConeGeometry(0.22, 1.6, 10, 1, false);
    g.translate(0, 1.24, CZ);
    g = pinta(g, 0xe8f7fb, 0.06);
    nVertJorro = g.attributes.position.count;
    pecasAgua.push(g);
  })();

  function arcoFonte(thetaDeg) {
    var th = thetaDeg * Math.PI / 180;
    var perfil = [[0.18, 1.05], [0.55, 1.6], [1.05, 1.25], [1.55, 0.18]];
    var pts = perfil.map(function (p) {
      return new T.Vector3(Math.cos(th) * p[0], p[1], CZ + Math.sin(th) * p[0]);
    });
    var curva = new T.CatmullRomCurve3(pts);
    var g = new T.TubeGeometry(curva, 10, 0.05, 5, false);
    pecasAgua.push(pinta(g, 0xe8f7fb, 0.06));
  }
  [0, 120, 240].forEach(arcoFonte);

  function gota(x, y, z, r) {
    var g = new T.SphereGeometry(r, 5, 4);
    g.translate(x, y, z);
    pecasAgua.push(pinta(g, 0xf2fbfd, 0.04));
  }
  [0, 120, 240].forEach(function (a) {
    var th = a * Math.PI / 180;
    gota(Math.cos(th) * 1.65, 0.22, CZ + Math.sin(th) * 1.65, 0.055);
  });
  gota(0.12, 2.05, CZ + 0.05, 0.05);
  gota(-0.15, 1.95, CZ - 0.1, 0.045);
  gota(0.05, 1.85, CZ + 0.18, 0.04);

  /* =====================================================================
     3) PONTINHAS — uma no eixo x, outra no eixo z. Cada uma em 2
        segmentos (banco ate perto do centro) para deixar o miolo livre
        para a fonte (colisor raio 1.5). Tabuleiro no eixo em y=0.35.
     ===================================================================== */
  function segX(x1, x2, z) {
    var comp = x2 - x1, midx = (x1 + x2) / 2;
    var deck = new T.BoxGeometry(comp, 0.12, 1.1);
    deck.translate(midx, 0.29, z);
    pecasSolido.push(pintaTabuas(deck, 0xc9a878, 0xb8946a, function (p, i) { return p.getX(i); }));
    [0.2, 0.8].forEach(function (tt) {
      var leg = new T.BoxGeometry(0.12, 0.30, 0.12);
      leg.translate(x1 + comp * tt, 0.15, z);
      pecasSolido.push(pinta(leg, 0xb08968, 0.2));
    });
    [-0.55, 0.55].forEach(function (lat) {
      [0.15, 0.5, 0.85].forEach(function (tt) {
        var poste = new T.CylinderGeometry(0.035, 0.035, 0.34, 6, 1, true);
        poste.translate(x1 + comp * tt, 0.52, z + lat);
        pecasSolido.push(pinta(poste, 0xf0e2cf, 0.14));
      });
      var corda = new T.CylinderGeometry(0.028, 0.028, comp * 0.72, 6, 1, true);
      corda.rotateZ(Math.PI / 2);
      corda.translate(midx, 0.69, z + lat);
      pecasSolido.push(pinta(corda, 0xe9b44c, 0.1));
    });
  }
  function segZ(x, z1, z2) {
    var comp = z2 - z1, midz = (z1 + z2) / 2;
    var deck = new T.BoxGeometry(1.1, 0.12, comp);
    deck.translate(x, 0.29, midz);
    pecasSolido.push(pintaTabuas(deck, 0xc9a878, 0xb8946a, function (p, i) { return p.getZ(i); }));
    [0.2, 0.8].forEach(function (tt) {
      var leg = new T.BoxGeometry(0.12, 0.30, 0.12);
      leg.translate(x, 0.15, z1 + comp * tt);
      pecasSolido.push(pinta(leg, 0xb08968, 0.2));
    });
    [-0.55, 0.55].forEach(function (lat) {
      [0.15, 0.5, 0.85].forEach(function (tt) {
        var poste = new T.CylinderGeometry(0.035, 0.035, 0.34, 6, 1, true);
        poste.translate(x + lat, 0.52, z1 + comp * tt);
        pecasSolido.push(pinta(poste, 0xf0e2cf, 0.14));
      });
      var corda = new T.CylinderGeometry(0.028, 0.028, comp * 0.72, 6, 1, true);
      corda.rotateX(Math.PI / 2);
      corda.translate(x + lat, 0.69, midz);
      pecasSolido.push(pinta(corda, 0xe9b44c, 0.1));
    });
  }
  /* vao livre entre 1.7 e 6.0 (fora do colisor da fonte, ate o banco) */
  segX(1.7, 6.0, CZ);
  segX(-6.0, -1.7, CZ);
  segZ(0, CZ + 1.7, CZ + 6.0);
  segZ(0, CZ - 6.0, CZ - 1.7);

  /* =====================================================================
     4) RIACHINHO decorativo — faixa fina fora da rua (raio>10.2), lado
        leste do bairro (x grande, longe do corredor |x|<4 z19-32 e da
        entrada norte), serpenteando por 5 pontos. 3 pedrinhas dentro.
     ===================================================================== */
  var RIO_PTS = [-35, -18, -2, 15, 32].map(function (ang, i) {
    var r = [11.5, 12.8, 11.3, 13.0, 11.6][i];
    var a = ang * Math.PI / 180;
    return { x: Math.cos(a) * r, z: CZ + Math.sin(a) * r };
  });
  (function faixaRio() {
    var nSeg = RIO_PTS.length - 1;
    var g = new T.PlaneGeometry(1, nSeg, 1, nSeg);
    var pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var xl = pos.getX(i), yl = pos.getY(i);
      var tt = ((nSeg / 2) - yl) / nSeg;
      var segF = tt * nSeg, idx = Math.min(nSeg - 1, Math.max(0, Math.floor(segF))), frac = segF - idx;
      var p0 = RIO_PTS[idx], p1 = RIO_PTS[idx + 1];
      var cx = p0.x + (p1.x - p0.x) * frac, cz = p0.z + (p1.z - p0.z) * frac;
      var dx = p1.x - p0.x, dz = p1.z - p0.z, dl = Math.hypot(dx, dz) || 1;
      var px = -dz / dl, pz = dx / dl;
      var lateral = xl * 0.55;
      pos.setX(i, cx + px * lateral);
      pos.setY(i, 0.02);
      pos.setZ(i, cz + pz * lateral);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    pecasAgua.push(pinta(g, 0x9fd8ec, 0.08));
  })();
  [0.2, 0.5, 0.8].forEach(function (tt) {
    var nSeg = RIO_PTS.length - 1, segF = tt * nSeg;
    var idx = Math.min(nSeg - 1, Math.floor(segF)), frac = segF - idx;
    var p0 = RIO_PTS[idx], p1 = RIO_PTS[idx + 1];
    var x = p0.x + (p1.x - p0.x) * frac, z = p0.z + (p1.z - p0.z) * frac;
    var st = new T.IcosahedronGeometry(0.14, 0);
    st.translate(x, 0.05, z);
    pecasSolido.push(pinta(st, 0xcfc6b8, 0.18));
  });

  /* =====================================================================
     5) NENUFARES — 4 discos verdes nas diagonais (mesmos angulos livres
        dos colisores da margem), longe do eixo das pontes.
     ===================================================================== */
  [45, 135, 225, 315].forEach(function (ang, i) {
    var a = ang * Math.PI / 180, r = 3.0 + (i % 2) * 0.5;
    var g = new T.CircleGeometry(0.4 + (i % 2) * 0.08, 10).rotateX(-Math.PI / 2);
    g.translate(Math.cos(a) * r, 0.075, CZ + Math.sin(a) * r);
    pecasSolido.push(pinta(g, 0x7fbf6a, 0.12));
  });

  /* ---- funde o solido (1 draw call) e a agua (1 draw call) ---- */
  var meshSolido = new T.Mesh(BGU.mergeBufferGeometries(pecasSolido), matSolido);
  grupo.add(meshSolido);

  var geoAgua = BGU.mergeBufferGeometries(pecasAgua);
  var meshAgua = new T.Mesh(geoAgua, matAgua);
  grupo.add(meshAgua);

  var posAgua = geoAgua.attributes.position;
  var basePosAgua = posAgua.array.slice();
  var jorroBaseY = Infinity;
  for (var jv = nVertLago; jv < nVertLago + nVertJorro; jv++) {
    var jy = basePosAgua[jv * 3 + 1];
    if (jy < jorroBaseY) jorroBaseY = jy;
  }

  /* =====================================================================
     6) PATINHOS — 2 patos de brinquedo (esfera + bico), InstancedMesh
        (1 draw call), giram devagar no update.
     ===================================================================== */
  var geoPato = (function () {
    var pecas = [];
    var corpo = new T.SphereGeometry(0.16, 10, 8);
    corpo.scale(1, 0.7, 1.05);
    corpo.translate(0, 0.12, 0);
    pecas.push(pinta(corpo, 0xffd166, 0.06));
    var bico = new T.ConeGeometry(0.06, 0.14, 6, 1, false);
    bico.rotateX(Math.PI / 2);
    bico.translate(0, 0.13, 0.19);
    pecas.push(pinta(bico, 0xff9d4d, 0.08));
    return BGU.mergeBufferGeometries(pecas);
  })();
  var PATOS = [
    { x: 2.6, z: CZ + 1.8, ang: 0.4 },
    { x: -2.0, z: CZ - 2.6, ang: 2.1 }
  ];
  var instPato = new T.InstancedMesh(geoPato, matSolido, PATOS.length);
  (function () {
    var m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3(1, 1, 1);
    PATOS.forEach(function (p, i) {
      e.set(0, p.ang, 0); q.setFromEuler(e); v.set(p.x, 0.16, p.z);
      m.compose(v, q, s);
      instPato.setMatrixAt(i, m);
    });
    instPato.instanceMatrix.needsUpdate = true;
  })();
  grupo.add(instPato);

  /* ---- API para o jogo ---- */
  grupo.userData.ponte = { alt: 0.35 };
  grupo.userData.lago = { x: 0, z: CZ, raio: 5.5 };

  var mP = new T.Matrix4(), qP = new T.Quaternion(), eP = new T.Euler(), vP = new T.Vector3(), sP = new T.Vector3(1, 1, 1);

  return {
    grupo: grupo,
    custo: { dc: 3, tri: 2406 }, /* MEDIDO: solido 1092 + agua 998 + patos (158 x 2 instancias) 316 */
    update: function (t) {
      /* onda do lago: propaga do centro (fonte) para a borda */
      var arr = posAgua.array;
      for (var i = 0; i < nVertLago; i++) {
        var bx = basePosAgua[i*3], bz = basePosAgua[i*3+2], by = basePosAgua[i*3+1];
        var r = Math.hypot(bx - 0, bz - CZ);
        arr[i*3+1] = by + Math.sin(t * 1.3 + r * 2.0) * 0.032;
      }
      /* jorro pulsando (a base fica fixa, a ponta estica/encolhe) */
      var pulso = 1 + 0.09 * Math.sin(t * 3.1);
      for (var j = nVertLago; j < nVertLago + nVertJorro; j++) {
        var jby = basePosAgua[j*3+1];
        arr[j*3+1] = jorroBaseY + (jby - jorroBaseY) * pulso;
      }
      posAgua.needsUpdate = true;

      /* patinhos girando devagar */
      for (var k = 0; k < PATOS.length; k++) {
        var p = PATOS[k];
        eP.set(0, p.ang + t * 0.35, 0); qP.setFromEuler(eP);
        vP.set(p.x, 0.16, p.z);
        mP.compose(vP, qP, sP);
        instPato.setMatrixAt(k, mP);
      }
      instPato.instanceMatrix.needsUpdate = true;
    }
  };
};

/* ===========================================================================
   parteCoreto — o coreto de feltro no coracao do Jardim, em (0, -44).
   Palquinho redondo com 3 degraus, 6 colunas de doce, teto de circo listrado,
   bandeirinhas e o ANEL DE RITMO dourado que pulsa na batida da musica.

   Orcamento MEDIDO: 3 draw calls / 2.412 triangulos (feltro mesclado 2192 +
   bandeirinhas 132 + anel 88). Raio total medido 3.53 (< 3.6), altura 4.57.
   Plataforma: raio 3.0, altura 0.35 — NAO e colisor,
   a crianca sobe nela (o degrau do chao entra em alturaChao do mundo).
   Integracao do ritmo:  grupo.userData.pulsar(forca)  /  API.pulsarCoreto(forca)
   =========================================================================== */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCoreto = function (ctx) {
  var T = ctx.T, M = ctx.M, P = M.paleta;
  var BGU = T.BufferGeometryUtils;

  var CX = 0, CZ = -44;                 /* centro do coreto no mundo */
  var R_PLAT = 3.00, H_PLAT = 0.35;     /* plataforma (nao e colisor) */
  var NCOL = 6, R_COL = 2.52, H_COL = 2.6, RAIO_COL = 0.16;
  var Y_TOPO_COL = H_PLAT + H_COL;      /* 2.95 */
  var Y_FIO = 2.52;                     /* altura do fio das bandeirinhas */
  var TETO_R = 3.30, TETO_APICE = 4.30, TETO_BEIRA = 2.62, TETO_SEG = 24;

  var grupo = new T.Group();
  grupo.position.set(CX, 0, CZ);

  /* ---------- pintura (cor por vertice; 1 material para tudo) ---------- */
  var SOMBRA = new T.Color(0x6a5a8f);   /* armadilha paga: sem tom escuro o feltro claro lava */
  var CREME = new T.Color(P.creme), ROSA = new T.Color(P.rosa),
      MEL = new T.Color(P.mel), AZUL = new T.Color(P.azulpo),
      VERDE = new T.Color(M.corGrama), DOURADO = new T.Color(0xFFD166);

  function esc(cor, k){ return new T.Color(cor).lerp(SOMBRA, k === undefined ? 0.18 : k); }

  /* toda peca vira non-indexed e perde uv: mergeBufferGeometries devolve null
     se os atributos ou o modo (indexado/nao) diferirem entre as pecas */
  function nu(geo){ geo.deleteAttribute('uv'); return geo.toNonIndexed(); }

  function pinta(geo, cor){
    var c = new T.Color(cor), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++){ a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    return geo;
  }
  /* pinta TRIANGULO a triangulo (geometria non-indexed): listra sem degrade */
  function pintaFace(geo, fn){
    var pos = geo.attributes.position, n = pos.count;
    var a = new Float32Array(n * 3), c = new T.Color();
    for (var f = 0; f < n; f += 3){
      var mx = (pos.getX(f) + pos.getX(f+1) + pos.getX(f+2)) / 3;
      var my = (pos.getY(f) + pos.getY(f+1) + pos.getY(f+2)) / 3;
      var mz = (pos.getZ(f) + pos.getZ(f+1) + pos.getZ(f+2)) / 3;
      fn(c, mx, my, mz);
      for (var k = 0; k < 3; k++){
        a[(f+k)*3] = c.r; a[(f+k)*3+1] = c.g; a[(f+k)*3+2] = c.b;
      }
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    return geo;
  }

  var pecas = [];

  /* ---------- 1. saia de sombra sob a plataforma ---------- */
  var saia = nu(new T.CylinderGeometry(3.08, 3.16, 0.11, 26));
  saia.translate(0, 0.055, 0);
  pinta(saia, esc(P.creme, 0.34));
  pecas.push(saia);

  /* ---------- 2. plataforma redonda (tampo creme com rubor rosa na borda) ---------- */
  var plat = nu(new T.CylinderGeometry(R_PLAT, R_PLAT + 0.08, H_PLAT, 30));
  plat.translate(0, H_PLAT / 2, 0);
  pintaFace(plat, function (c, x, y, z){
    if (y > H_PLAT - 0.05){                       /* tampo: onde a crianca danca */
      var r = Math.sqrt(x*x + z*z) / R_PLAT;
      c.copy(CREME).lerp(ROSA, 0.08 + 0.30 * r * r);
    } else if (y < 0.03){
      c.copy(esc(P.creme, 0.45));                 /* fundo */
    } else {
      c.copy(CREME).lerp(SOMBRA, 0.14 + 0.24 * (1 - y / H_PLAT));
    }
  });
  pecas.push(plat);

  /* ---------- 3. tres degraus baixinhos na frente (+z, quem chega da praca) ----------
     Degraus CURVOS concentricos: num palquinho redondo o degrau reto joga o canto
     para fora do raio permitido (medido: 3.61 > 3.6). Em arco, o raio maximo e o
     proprio raio do degrau. Vao de 60 graus, igual ao vao entre as colunas. */
  var VAO = Math.PI / 3;                                  /* 60 graus */
  var degraus = [
    { r: 3.50, h: H_PLAT / 3 },
    { r: 3.34, h: H_PLAT * 2 / 3 },
    { r: 3.18, h: H_PLAT }
  ];
  for (var d = 0; d < degraus.length; d++){
    (function (g){
      var arco = nu(new T.CylinderGeometry(g.r, g.r + 0.02, g.h, 8, 1, false, -VAO/2, VAO));
      arco.translate(0, g.h / 2, 0);
      pintaFace(arco, function (c, x, y, z){
        if (y > g.h - 0.01) c.copy(CREME).lerp(ROSA, 0.14);   /* pisada */
        else if (y < 0.02) c.copy(esc(P.creme, 0.45));
        else c.copy(esc(P.rosa, 0.24));                       /* espelho rosado */
      });
      pecas.push(arco);
    })(degraus[d]);
  }
  /* bochechas laterais: fecham a lateral da escadinha e viram corrimao de feltro */
  for (var b2 = 0; b2 < 2; b2++){
    var aB = (b2 === 0 ? -1 : 1) * (VAO / 2);
    var rM = 3.22;
    var boch = nu(new T.BoxGeometry(0.07, 0.37, 0.62).rotateY(aB));
    boch.translate(rM * Math.sin(aB), 0.185, rM * Math.cos(aB));
    pinta(boch, esc(P.creme, 0.30));
    pecas.push(boch);
  }

  /* ---------- 4. seis colunas de doce, listra em espiral pintada ---------- */
  var colXZ = [];
  for (var i = 0; i < NCOL; i++){
    /* vaos centrados em 0 grau (frente, onde ficam os degraus) e em 180 */
    var ang = (30 + 60 * i) * Math.PI / 180;
    colXZ.push([R_COL * Math.sin(ang), R_COL * Math.cos(ang)]);
  }
  for (i = 0; i < NCOL; i++){
    var par = (i % 2 === 0);
    var corBase = par ? P.creme : P.rosa;
    var corListra = par ? P.rosa : P.creme;
    var cx = colXZ[i][0], cz = colXZ[i][1];

    var corpo = nu(new T.CylinderGeometry(0.150, 0.172, H_COL, 10, 8, true));
    (function (geo, cA, cB){
      var A = new T.Color(cA), B = new T.Color(cB);
      pintaFace(geo, function (c, x, y, z){
        var th = Math.atan2(x, z) / (Math.PI * 2);        /* -0.5 .. 0.5 */
        var u = (y + H_COL / 2) / H_COL;                  /* 0 na base, 1 no topo */
        var s = th + u * 2.15;                            /* ~2 voltas de espiral */
        s = s - Math.floor(s);
        c.copy(s < 0.32 ? B : A).lerp(SOMBRA, 0.06 + 0.20 * (1 - u));
      });
    })(corpo, corBase, corListra);
    corpo.translate(cx, H_PLAT + H_COL / 2, cz);
    pecas.push(corpo);

    var colar = nu(new T.CylinderGeometry(0.205, 0.235, 0.11, 10));
    colar.translate(cx, H_PLAT + 0.055, cz);
    pinta(colar, esc(corBase, 0.28));
    pecas.push(colar);

    var capitel = nu(new T.CylinderGeometry(0.235, 0.200, 0.13, 10));
    capitel.translate(cx, Y_TOPO_COL - 0.065, cz);
    pinta(capitel, esc(corListra, 0.10));
    pecas.push(capitel);

    ctx.COLISORES.push({ x: CX + cx, z: CZ + cz, raio: 0.28 });
  }

  /* ---------- 5. teto conico listrado (barraquinha de circo) ---------- */
  var perfil = [], NP = 7;
  for (i = 0; i < NP; i++){
    var u = i / (NP - 1);                                   /* 0 no apice, 1 na beirada */
    perfil.push(new T.Vector2(
      Math.max(0.006, TETO_R * Math.pow(u, 0.80)),
      TETO_APICE - (TETO_APICE - TETO_BEIRA) * Math.pow(u, 0.67)
    ));
  }
  var teto = nu(new T.LatheGeometry(perfil, TETO_SEG));
  teto.computeVertexNormals();                              /* paineis chapados, como lona */
  pintaFace(teto, function (c, x, y, z){
    var a = Math.atan2(x, z); if (a < 0) a += Math.PI * 2;
    var k = Math.floor(a / (Math.PI * 2) * TETO_SEG) % 2;
    var alto = (y - TETO_BEIRA) / (TETO_APICE - TETO_BEIRA);
    alto = Math.max(0, Math.min(1, alto));
    c.copy(k === 0 ? ROSA : CREME).lerp(SOMBRA, 0.05 + 0.22 * (1 - alto));
  });
  pecas.push(teto);

  /* ---------- 6. bolinha dourada no topo ---------- */
  var bola = nu(new T.SphereGeometry(0.17, 10, 7));
  bola.translate(0, TETO_APICE + 0.10, 0);
  pinta(bola, DOURADO);
  pecas.push(bola);

  var malhaFeltro = new T.Mesh(
    BGU.mergeBufferGeometries(pecas),
    new T.MeshLambertMaterial({ vertexColors: true })
  );
  grupo.add(malhaFeltro);

  /* ---------- 7. bandeirinhas: 6 vaos x (fio de 8 gomos + 6 triangulinhos) ---------- */
  var VAO_SEG = 8, POR_VAO = 6, SAG = 0.34;
  var CORES_BAND = [ROSA, MEL, AZUL, VERDE];
  var nTri = NCOL * VAO_SEG * 2 + NCOL * POR_VAO;
  var bPos = new Float32Array(nTri * 9);
  var bNor = new Float32Array(nTri * 9);
  var bCor = new Float32Array(nTri * 9);
  var vi = 0;
  function vert(px, py, pz, nx, ny, nz, c){
    bPos[vi*3] = px; bPos[vi*3+1] = py; bPos[vi*3+2] = pz;
    bNor[vi*3] = nx; bNor[vi*3+1] = ny; bNor[vi*3+2] = nz;
    bCor[vi*3] = c.r; bCor[vi*3+1] = c.g; bCor[vi*3+2] = c.b;
    vi++;
  }
  function noFio(A, B, s){
    return {
      x: A[0] + (B[0] - A[0]) * s,
      y: Y_FIO - SAG * Math.sin(Math.PI * s),
      z: A[1] + (B[1] - A[1]) * s
    };
  }
  var abanos = [];                       /* pontas que balançam no update */
  var corFio = esc(P.creme, 0.42);
  for (var v = 0; v < NCOL; v++){
    var A = colXZ[v], B = colXZ[(v + 1) % NCOL];

    for (var j = 0; j < VAO_SEG; j++){   /* fio: fitinha vertical de 0.045 */
      var p0 = noFio(A, B, j / VAO_SEG), p1 = noFio(A, B, (j + 1) / VAO_SEG);
      var l0 = Math.hypot(p0.x, p0.z) || 1, l1 = Math.hypot(p1.x, p1.z) || 1;
      var n0x = p0.x / l0, n0z = p0.z / l0, n1x = p1.x / l1, n1z = p1.z / l1;
      vert(p0.x, p0.y + 0.045, p0.z, n0x, 0, n0z, corFio);
      vert(p0.x, p0.y, p0.z, n0x, 0, n0z, corFio);
      vert(p1.x, p1.y, p1.z, n1x, 0, n1z, corFio);
      vert(p0.x, p0.y + 0.045, p0.z, n0x, 0, n0z, corFio);
      vert(p1.x, p1.y, p1.z, n1x, 0, n1z, corFio);
      vert(p1.x, p1.y + 0.045, p1.z, n1x, 0, n1z, corFio);
    }

    for (var k2 = 0; k2 < POR_VAO; k2++){
      var s = (k2 + 0.5) / POR_VAO;
      var pm = noFio(A, B, s);
      var pa = noFio(A, B, Math.max(0, s - 0.02)), pb = noFio(A, B, Math.min(1, s + 0.02));
      var dx = pb.x - pa.x, dz = pb.z - pa.z, dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;
      var nx = dz, nz = -dx;                            /* normal horizontal da bandeirinha */
      var cB = CORES_BAND[(v * POR_VAO + k2) % CORES_BAND.length];
      var cPonta = cB.clone().lerp(SOMBRA, 0.22);
      vert(pm.x - dx * 0.10, pm.y, pm.z - dz * 0.10, nx, 0, nz, cB);
      vert(pm.x + dx * 0.10, pm.y, pm.z + dz * 0.10, nx, 0, nz, cB);
      abanos.push({ i: vi, nx: nx, nz: nz, fase: (v * POR_VAO + k2) * 0.9 });
      vert(pm.x, pm.y - 0.30, pm.z, nx, 0, nz, cPonta);  /* ponta que abana */
    }
  }
  var gBand = new T.BufferGeometry();
  gBand.setAttribute('position', new T.BufferAttribute(bPos, 3));
  gBand.setAttribute('normal', new T.BufferAttribute(bNor, 3));
  gBand.setAttribute('color', new T.BufferAttribute(bCor, 3));
  var bBase = bPos.slice(0);
  var malhaBand = new T.Mesh(gBand, new T.MeshLambertMaterial({ vertexColors: true }));
  grupo.add(malhaBand);

  /* ---------- 8. anel dourado do ritmo (marcador que pulsa na batida) ---------- */
  var matAnel = ctx.materialBrilho(0xFFD166);
  matAnel.transparent = true;
  matAnel.opacity = 0.42;
  matAnel.depthWrite = false;
  var anel = new T.Mesh(new T.RingGeometry(2.08, 2.26, 44, 1).rotateX(-Math.PI / 2), matAnel);
  anel.position.y = H_PLAT + 0.01;                        /* 0.36 */
  anel.renderOrder = 3;
  grupo.add(anel);

  /* pop de escala/opacidade a cada batida; a integracao chama isto na musica */
  var pulso = 0, forca = 1;
  function pulsar(f){
    forca = (typeof f === 'number' && isFinite(f)) ? Math.max(0, Math.min(1.6, f)) : 1;
    pulso = 1;
  }
  grupo.userData.anel = anel;
  grupo.userData.pulsar = pulsar;
  grupo.userData.plataforma = { x: CX, z: CZ, raio: R_PLAT, altura: H_PLAT };

  return {
    grupo: grupo,
    pulsarCoreto: pulsar,          /* vira window.__mundo.API.pulsarCoreto */
    update: function (t, dt){
      /* bandeirinhas ondulam de leve */
      for (var b = 0; b < abanos.length; b++){
        var q = abanos[b], j = q.i * 3;
        var w = Math.sin(t * 2.4 + q.fase);
        bPos[j]     = bBase[j]     + q.nx * 0.075 * w;
        bPos[j + 1] = bBase[j + 1] + 0.028 * Math.abs(w);
        bPos[j + 2] = bBase[j + 2] + q.nz * 0.075 * w;
      }
      gBand.attributes.position.needsUpdate = true;

      /* o anel volta suavemente a escala 1 depois de cada pulso */
      if (pulso > 0) pulso = Math.max(0, pulso - dt * 3.2);
      var e = pulso * pulso * forca;
      var s = 1 + 0.20 * e;
      anel.scale.set(s, 1, s);
      matAnel.opacity = Math.min(1, 0.38 + 0.05 * Math.sin(t * 2.2) + 0.52 * e);
    },
    custo: { dc: 3, tri: 2412 }
  };
};

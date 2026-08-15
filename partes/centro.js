/* ============================================================
   parteCentro — o monumento da Praca da Estrelinha
   Pedestal de feltro + haste de mel com pratinho (encaixe da
   logo 3D), 4 canteirinhos de flores e um anel de mosaico.
   Orcamento: 2 draw calls (1 malha estatica + 1 malha de flores).
   ============================================================ */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCentro = function (ctx) {
  var T = ctx.T;
  var M = ctx.M;
  var BGU = T.BufferGeometryUtils;
  var P = M.paleta;
  var TAU = Math.PI * 2;
  var MEIO = Math.PI / 2;
  var grupo = new T.Group();

  /* ---------- pintura (o cenario claro "lava" sem variacao de tom) ---------- */
  var SOMBRA = new T.Color(0x6a5a8f);
  function esc(cor, f) { return new T.Color(cor).lerp(SOMBRA, f); }
  function limpa(geo) { geo.deleteAttribute('uv'); return geo; }

  function pinta(geo, cor) {
    limpa(geo);
    var c = (cor && cor.isColor) ? cor : new T.Color(cor);
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    return geo;
  }

  /* gradiente vertical: topo iluminado, base afundando no cinza-azulado */
  function pintaY(geo, corTopo, corBase, y0, y1) {
    limpa(geo);
    var ct = (corTopo && corTopo.isColor) ? corTopo : new T.Color(corTopo);
    var cb = (corBase && corBase.isColor) ? corBase : new T.Color(corBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var vao = (y1 - y0) || 1;
    for (var i = 0; i < n; i++) {
      var f = (pos.getY(i) - y0) / vao;
      f = f < 0 ? 0 : (f > 1 ? 1 : f);
      var c = cb.clone().lerp(ct, f);
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    return geo;
  }

  /* ruidinho deterministico (mesmo desenho toda vez que o mundo abre) */
  var semente = 20260814;
  function rnd() {
    semente = (semente * 1664525 + 1013904223) % 4294967296;
    return semente / 4294967296;
  }

  var ESTATICO = [];

  /* ============================================================
     1) PEDESTAL — 2 degraus redondos de feltro creme + costura
     ============================================================ */
  var cremeAlto = esc(P.creme, 0.05);
  var cremeMeio = esc(P.creme, 0.19);
  var cremeFundo = esc(P.creme, 0.36);
  var corCostura = esc(P.creme, 0.52);

  var deg1 = new T.CylinderGeometry(1.90, 1.96, 0.25, 24);
  deg1.translate(0, 0.125, 0);
  ESTATICO.push(pintaY(deg1, cremeMeio, cremeFundo, 0.0, 0.25));

  var deg2 = new T.CylinderGeometry(1.55, 1.60, 0.25, 24);
  deg2.translate(0, 0.375, 0);
  ESTATICO.push(pintaY(deg2, cremeAlto, cremeMeio, 0.25, 0.50));

  /* costura decorativa: anel fino rente a borda de cada degrau */
  var cst1 = new T.RingGeometry(1.70, 1.80, 24, 1).rotateX(-MEIO);
  cst1.translate(0, 0.253, 0);
  ESTATICO.push(pinta(cst1, corCostura));

  var cst2 = new T.RingGeometry(1.34, 1.44, 24, 1).rotateX(-MEIO);
  cst2.translate(0, 0.503, 0);
  ESTATICO.push(pinta(cst2, corCostura));

  /* ============================================================
     2) HASTE DE MEL + PRATINHO — o suporte de onde a logo flutua
     ============================================================ */
  var melClaro = esc(P.mel, 0.02);
  var melFundo = esc(P.mel, 0.38);

  var colar = new T.CylinderGeometry(0.24, 0.32, 0.13, 12);
  colar.translate(0, 0.565, 0);
  ESTATICO.push(pintaY(colar, melClaro, melFundo, 0.50, 0.63));

  var haste = new T.CylinderGeometry(0.105, 0.155, 2.00, 12, 1, true);
  haste.translate(0, 1.50, 0);   /* de y=0.50 ate y=2.50 */
  ESTATICO.push(pintaY(haste, melClaro, esc(P.mel, 0.30), 0.60, 2.50));

  var prato = new T.CylinderGeometry(0.36, 0.22, 0.11, 18);
  prato.translate(0, 2.545, 0);
  ESTATICO.push(pintaY(prato, esc(P.mel, 0.0), melFundo, 2.49, 2.60));

  var pratoCostura = new T.RingGeometry(0.15, 0.25, 16, 1).rotateX(-MEIO);
  pratoCostura.translate(0, 2.602, 0);
  ESTATICO.push(pinta(pratoCostura, esc(P.mel, 0.42)));

  /* ============================================================
     4) ANEL DE MOSAICO no chao (raio 3.0 -> 3.6), rente em y=0.02
     ============================================================ */
  var leito = new T.RingGeometry(3.00, 3.60, 36, 1).rotateX(-MEIO);
  leito.translate(0, 0.02, 0);
  ESTATICO.push(pinta(leito, esc(P.creme, 0.32)));

  var CORES_MOSAICO = [P.rosa, P.azulpo, P.mel];
  var MOS_RAIO = [3.14, 3.46];
  var MOS_QTD = [24, 28];
  for (var am = 0; am < 2; am++) {
    for (var im = 0; im < MOS_QTD[am]; im++) {
      var angM = (im + (am ? 0.5 : 0)) / MOS_QTD[am] * TAU;
      var pedra = new T.CircleGeometry(0.118, 7).rotateX(-MEIO);
      pedra.translate(Math.cos(angM) * MOS_RAIO[am], 0.035, Math.sin(angM) * MOS_RAIO[am]);
      ESTATICO.push(pinta(pedra, esc(CORES_MOSAICO[(im + am) % 3], 0.06)));
    }
  }

  /* ============================================================
     3) CANTEIRINHOS — 4 diagonais a 2.6 do centro
        (montinho de terra + anelzinho de grama ficam na malha
         estatica; as florzinhas vao para a malha animada)
     ============================================================ */
  var CANTEIROS = [];
  for (var qc = 0; qc < 4; qc++) {
    var angC = Math.PI / 4 + qc * MEIO;
    CANTEIROS.push({ x: Math.cos(angC) * 2.6, z: Math.sin(angC) * 2.6 });
  }

  var R_TERRA = 0.44, ALT_TERRA = 0.185;
  var corTerra = 0xc9a37e;

  for (var ic = 0; ic < CANTEIROS.length; ic++) {
    var cx = CANTEIROS[ic].x, cz = CANTEIROS[ic].z;

    var grama = new T.RingGeometry(0.41, 0.60, 12, 1).rotateX(-MEIO);
    grama.translate(cx, 0.03, cz);
    ESTATICO.push(pinta(grama, esc(M.corGrama, 0.14)));

    var terra = new T.SphereGeometry(R_TERRA, 10, 3, 0, TAU, 0, MEIO);
    terra.scale(1, ALT_TERRA / R_TERRA, 1);
    terra.translate(cx, 0.02, cz);
    ESTATICO.push(pintaY(terra, esc(corTerra, 0.06), esc(corTerra, 0.34), 0.02, 0.02 + ALT_TERRA));
  }

  /* ---------- malha estatica: 1 draw call ---------- */
  var geoEstatica = BGU.mergeBufferGeometries(ESTATICO);
  var malhaEstatica = new T.Mesh(geoEstatica, new T.MeshLambertMaterial({ vertexColors: true }));
  grupo.add(malhaEstatica);

  /* ============================================================
     FLORZINHAS — 3 por canteiro, malha unica deformada por CPU
     (rotacao em seno ao redor do pe de cada flor)
     ============================================================ */
  var PECAS_FLOR = [];
  var FLORES = [];
  var vOff = 0;
  var CORES_PETALA = [P.rosa, P.azulpo, P.creme];

  function montaFlor(px, pz, altura, corPetala) {
    var pecas = [];

    var caule = new T.CylinderGeometry(0.016, 0.028, altura, 5, 1, true);
    caule.translate(0, altura / 2, 0);
    pecas.push(pintaY(caule, esc(M.corGrama, 0.10), esc(M.corGrama, 0.42), 0, altura));

    var miolo = new T.SphereGeometry(0.075, 6, 3);
    miolo.scale(1, 0.62, 1);
    miolo.translate(0, altura + 0.015, 0);
    pecas.push(pinta(miolo, esc(P.mel, 0.04)));

    var cTopo = esc(corPetala, 0.0), cBase = esc(corPetala, 0.26);
    for (var ip = 0; ip < 5; ip++) {
      var angP = ip / 5 * TAU + 0.3;
      var pet = new T.SphereGeometry(0.062, 5, 2);
      pet.scale(1.55, 0.40, 1.0);
      pet.rotateY(-angP);
      pet.translate(Math.cos(angP) * 0.105, altura + 0.008, Math.sin(angP) * 0.105);
      pecas.push(pintaY(pet, cTopo, cBase, altura - 0.02, altura + 0.03));
    }

    /* leva a flor inteira para o canteiro e registra o intervalo de vertices */
    var n = 0;
    for (var k = 0; k < pecas.length; k++) {
      pecas[k].translate(px, 0, pz);
      n += pecas[k].attributes.position.count;
      PECAS_FLOR.push(pecas[k]);
    }

    var dir = rnd() * TAU;
    FLORES.push({
      i0: vOff, i1: vOff + n,
      px: px, py: 0, pz: pz,
      ax: Math.cos(dir), az: Math.sin(dir),
      amp: 0.055 + rnd() * 0.045,
      vel: 1.05 + rnd() * 0.75,
      fase: rnd() * TAU
    });
    vOff += n;
  }

  /* 3 posicoes por montinho; y do pe segue a curva do domo de terra */
  var LOCAL_FLOR = [
    { x: 0.00, z: 0.13, h: 0.34 },
    { x: -0.16, z: -0.09, h: 0.28 },
    { x: 0.17, z: -0.06, h: 0.31 }
  ];
  for (var jc = 0; jc < CANTEIROS.length; jc++) {
    for (var jf = 0; jf < LOCAL_FLOR.length; jf++) {
      var L = LOCAL_FLOR[jf];
      var fx = CANTEIROS[jc].x + L.x, fz = CANTEIROS[jc].z + L.z;
      montaFlor(fx, fz, L.h, CORES_PETALA[(jc + jf) % 3]);
    }
  }

  var geoFlores = BGU.mergeBufferGeometries(PECAS_FLOR);
  var malhaFlores = new T.Mesh(geoFlores, new T.MeshLambertMaterial({ vertexColors: true }));

  /* o pe de cada flor pousa na casca do montinho de terra */
  var posFlor = geoFlores.attributes.position;
  var arrFlor = posFlor.array;
  for (var fi = 0; fi < FLORES.length; fi++) {
    var F = FLORES[fi];
    var ci = CANTEIROS[Math.floor(fi / LOCAL_FLOR.length)];
    var rr = Math.hypot(F.px - ci.x, F.pz - ci.z) / R_TERRA;
    var alt = 0.02 + ALT_TERRA * Math.sqrt(Math.max(0, 1 - rr * rr)) - 0.03;
    F.py = alt;
    for (var vi = F.i0; vi < F.i1; vi++) arrFlor[vi * 3 + 1] += alt;
  }
  var BASE_FLOR = new Float32Array(arrFlor);
  geoFlores.computeBoundingSphere();
  if (geoFlores.boundingSphere) geoFlores.boundingSphere.radius += 0.25;

  grupo.add(malhaFlores);

  /* ============================================================
     ENCAIXE DA LOGO — ponto vazio; a integracao pendura o modelo
     ============================================================ */
  var slot = new T.Group();
  slot.position.set(0, 2.9, 0);
  grupo.add(slot);

  /* ---------- colisor ---------- */
  ctx.COLISORES.push({ x: 0, z: 0, raio: 2.0 });

  /* ---------- custo medido ---------- */
  function contaTri(geo) {
    if (!geo) return 0;
    return (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  }
  var TRI = contaTri(geoEstatica) + contaTri(geoFlores);

  return {
    grupo: grupo,
    slotLogo: slot,
    pegarSlotLogo: function () { return slot; },
    update: function (t, dt) {
      /* haste e pratinho ficam parados; so as florzinhas balancam */
      var arr = posFlor.array;
      for (var f = 0; f < FLORES.length; f++) {
        var F = FLORES[f];
        var ang = F.amp * Math.sin(t * F.vel + F.fase);
        var c = Math.cos(ang), s = Math.sin(ang), um = 1 - c;
        var ax = F.ax, az = F.az;
        for (var i = F.i0; i < F.i1; i++) {
          var k = i * 3;
          var vx = BASE_FLOR[k] - F.px;
          var vy = BASE_FLOR[k + 1] - F.py;
          var vz = BASE_FLOR[k + 2] - F.pz;
          var d = ax * vx + az * vz;
          arr[k] = F.px + vx * c - az * vy * s + ax * d * um;
          arr[k + 1] = F.py + vy * c + (az * vx - ax * vz) * s;
          arr[k + 2] = F.pz + vz * c + ax * vy * s + az * d * um;
        }
      }
      posFlor.needsUpdate = true;
    },
    custo: { dc: 2, tri: TRI }
  };
};

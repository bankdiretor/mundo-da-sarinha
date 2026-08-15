/* ===========================================================================
   parteLampioes — 6 lampioes de feltro no circulo de raio 14 (Geografia v1).
   Nascem APAGADOS (cinza-lavanda) e vao acendendo conforme a crianca acha
   estrelinha: grupo.userData.acender(i) troca a cupula para dourado
   (materialBrilho) e liga o halo. E a mecanica-simbolo do mundo.

   ORCAMENTO — 4 draw calls, um por material, e nem um a mais:
     1) postes    : bases + hastes + ganchos + chapeuzinhos, mesclados, cor por vertice
     2) cupulas apagadas : 6 gotas mescladas, Lambert 0x9a92b8
     3) cupulas acesas   : as MESMAS 6 gotas mescladas, MeshBasicMaterial 0xFFD166
     4) halos     : 3 planos cruzados por lampiao, CanvasTexture, aditivo

   Como uma cupula individual acende sem virar 6 draw calls: cada gota ocupa
   uma faixa conhecida de vertices dentro da malha mesclada. "Sumir" = escrever
   todos os vertices da faixa no centro dela (triangulo degenerado, zero pixel);
   "aparecer" = reescrever a partir das posicoes canonicas guardadas. Acender e
   so trocar a faixa de malha: some da apagada, aparece na acesa. O mesmo
   mecanismo faz o pulso (escala 4%) por lampiao, dentro de UMA malha.
   =========================================================================== */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteLampioes = function (ctx) {
  var T = ctx.T, M = ctx.M, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'lampioes';

  /* ---------- medidas ---------- */
  var N = 6, RAIO = 14;
  var ALT = 2.85;                       /* topo da haste reta */
  var ARC_R = 0.42;                     /* raio do gancho fofo */
  var ARC_ANG = Math.PI * 5 / 6;        /* 150 graus: sobe, vira e aponta pra baixo */
  var ARC_SEG = 6;
  var PONTA_X = -ARC_R + ARC_R * Math.cos(ARC_ANG);   /* ponta do gancho (local, pra dentro) */
  var PONTA_Y = ALT + ARC_R * Math.sin(ARC_ANG);
  var CUP_X = PONTA_X, CUP_Y = PONTA_Y - 0.42;        /* centro da cupula pendurada */
  var CUP_R = 0.26, HALO_TAM = 2.5;

  var COR_APAGADA = 0x9a92b8, COR_ACESA = 0xffd166;

  /* ---------- cores de feltro (regra paga: tom mais escuro na base/sombra) ---------- */
  function escurece(cor, f) {
    return new T.Color(cor).lerp(new T.Color(0x6a5a8f), f === undefined ? 0.18 : f);
  }
  var cSombra = escurece(M.paleta.creme, 0.30);   /* tapetinho de contato no chao */
  var cBase   = new T.Color(M.paleta.rosa);
  var cHaste  = escurece(M.paleta.creme, 0.20);   /* creme acinzentado: nao some no chao creme */
  var cMel    = new T.Color(M.paleta.mel);

  /* ---------- receita do contrato: cor por vertice + uv fora antes de mesclar ---------- */
  function pinta(geo, cor) {
    var c = cor.isColor ? cor : new T.Color(cor);
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }

  /* cilindro entre dois pontos do plano XY local (folga = sobreposicao nas juntas) */
  function bastao(x0, y0, x1, y1, raio, seg, folga) {
    var dx = x1 - x0, dy = y1 - y0, comp = Math.hypot(dx, dy) * (1 + (folga || 0));
    var g = new T.CylinderGeometry(raio, raio, comp, seg);
    g.rotateZ(Math.atan2(dy, dx) - Math.PI / 2);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0);
    return g;
  }

  /* ---------- monta os 6 lampioes ---------- */
  var pecasPoste = [], gotas = [], halos = [], centros = [];

  for (var i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2;                 /* comeca em 0 */
    var px = Math.cos(ang) * RAIO, pz = Math.sin(ang) * RAIO;

    /* local -X aponta pro centro da praca depois do rotateY(-ang) */
    var local = [];

    /* tapetinho de feltro: e a "sombra" pintada a mao que assenta o poste no chao */
    local.push(pinta(new T.CircleGeometry(0.62, 14).rotateX(-Math.PI / 2).translate(0, 0.014, 0), cSombra));
    /* base redonda */
    local.push(pinta(new T.CylinderGeometry(0.34, 0.50, 0.20, 12).translate(0, 0.125, 0), cBase));
    /* haste reta */
    local.push(pinta(new T.CylinderGeometry(0.075, 0.095, ALT - 0.16, 8, 1, true)
      .translate(0, (ALT + 0.16) / 2, 0), cHaste));
    /* juntinha no topo, onde o gancho comeca */
    local.push(pinta(new T.SphereGeometry(0.10, 6, 4).translate(0, ALT, 0), cMel));
    /* gancho: arco tangente a haste, em segmentos curtos com sobreposicao */
    for (var s = 0; s < ARC_SEG; s++) {
      var f0 = (s / ARC_SEG) * ARC_ANG, f1 = ((s + 1) / ARC_SEG) * ARC_ANG;
      local.push(pinta(bastao(
        -ARC_R + ARC_R * Math.cos(f0), ALT + ARC_R * Math.sin(f0),
        -ARC_R + ARC_R * Math.cos(f1), ALT + ARC_R * Math.sin(f1),
        0.072, 6, 0.14), cHaste));
    }
    /* chapeuzinho de mel fechando a gota (fica de feltro mesmo quando acende) */
    local.push(pinta(new T.ConeGeometry(0.19, 0.18, 9, 1, true)
      .translate(CUP_X, CUP_Y + 0.31, 0), cMel));

    for (var k = 0; k < local.length; k++) pecasPoste.push(local[k].rotateY(-ang).translate(px, 0, pz));

    /* cupula-gota: esfera identica em todas (faixas de vertice do mesmo tamanho) */
    gotas.push(new T.SphereGeometry(CUP_R, 9, 6).scale(1, 1.18, 1)
      .translate(CUP_X, CUP_Y, 0).rotateY(-ang).translate(px, 0, pz));

    /* centro da gota no mundo (o rotateY(-ang) leva o -X local pro raio menor) */
    var cx = px + CUP_X * Math.cos(ang), cz = pz + CUP_X * Math.sin(ang);
    centros.push({ x: cx, y: CUP_Y, z: cz });

    /* halo: 3 planos cruzados a 60 graus — le bem de qualquer angulo, 6 tris */
    for (var h = 0; h < 3; h++) {
      halos.push(new T.PlaneGeometry(HALO_TAM, HALO_TAM)
        .rotateY(h * Math.PI / 3).translate(cx, CUP_Y, cz));
    }

    ctx.COLISORES.push({ x: px, z: pz, raio: 0.35 });
  }

  /* ---------- DC 1: postes ---------- */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecasPoste),
    new T.MeshLambertMaterial({ vertexColors: true })));

  /* ---------- DC 2 e 3: as mesmas gotas, apagadas e acesas ---------- */
  for (var q = 0; q < gotas.length; q++) gotas[q].deleteAttribute('uv');
  var geoApagada = BGU.mergeBufferGeometries(gotas);
  var geoAcesa = geoApagada.clone();
  var VG = gotas[0].attributes.position.count;          /* vertices por cupula */
  var canon = new Float32Array(geoApagada.attributes.position.array);

  var malhaApagada = new T.Mesh(geoApagada, ctx.materialFeltro(COR_APAGADA));
  var malhaAcesa = new T.Mesh(geoAcesa, ctx.materialBrilho(COR_ACESA));
  /* posicoes mudam em tempo real: a esfera de corte ficaria velha */
  malhaApagada.frustumCulled = false;
  malhaAcesa.frustumCulled = false;
  grupo.add(malhaApagada);
  grupo.add(malhaAcesa);

  var atApagada = geoApagada.attributes.position, atAcesa = geoAcesa.attributes.position;

  /* escreve a faixa da cupula i com escala s em torno do proprio centro (s=0 some) */
  function gota(attr, i, s) {
    var c = centros[i], arr = attr.array, ini = i * VG * 3, fim = ini + VG * 3;
    for (var k = ini; k < fim; k += 3) {
      arr[k]     = c.x + (canon[k]     - c.x) * s;
      arr[k + 1] = c.y + (canon[k + 1] - c.y) * s;
      arr[k + 2] = c.z + (canon[k + 2] - c.z) * s;
    }
  }
  for (var a = 0; a < N; a++) gota(atAcesa, a, 0);       /* nasce tudo apagado */
  atAcesa.needsUpdate = true;

  /* ---------- DC 4: halos ---------- */
  var geoHalo = BGU.mergeBufferGeometries(halos);
  var nvH = geoHalo.attributes.position.count;
  geoHalo.setAttribute('color', new T.BufferAttribute(new Float32Array(nvH * 3), 3));
  var VH = nvH / N;                                     /* vertices por halo */
  var atHalo = geoHalo.attributes.color;

  var cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  var g2d = cv.getContext('2d');
  var grad = g2d.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0.00, 'rgba(255,244,214,1)');
  grad.addColorStop(0.20, 'rgba(255,209,102,0.70)');
  grad.addColorStop(0.52, 'rgba(255,193,86,0.20)');
  grad.addColorStop(1.00, 'rgba(255,176,62,0)');
  g2d.fillStyle = grad; g2d.fillRect(0, 0, 128, 128);
  var texHalo = new T.CanvasTexture(cv);
  texHalo.generateMipmaps = false; texHalo.minFilter = T.LinearFilter;

  var malhaHalo = new T.Mesh(geoHalo, new T.MeshBasicMaterial({
    map: texHalo, vertexColors: true, transparent: true,
    blending: T.AdditiveBlending, depthWrite: false, fog: false
  }));
  malhaHalo.renderOrder = 3;
  grupo.add(malhaHalo);

  /* brilho do halo: cor por vertice em cinza multiplica a textura dourada.
     0 = invisivel de verdade no aditivo (nao soma nada). */
  function halo(i, brilho) {
    var arr = atHalo.array, ini = i * VH * 3, fim = ini + VH * 3;
    for (var k = ini; k < fim; k += 3) { arr[k] = brilho; arr[k + 1] = brilho; arr[k + 2] = brilho; }
  }

  /* ---------- API da mecanica ---------- */
  grupo.userData.total = N;
  grupo.userData.aceso = [false, false, false, false, false, false];

  function acender(i) {
    i = i | 0;
    if (i < 0 || i >= N || grupo.userData.aceso[i]) return false;
    grupo.userData.aceso[i] = true;
    gota(atApagada, i, 0); atApagada.needsUpdate = true;
    gota(atAcesa, i, 1);   atAcesa.needsUpdate = true;
    halo(i, 1);            atHalo.needsUpdate = true;
    return true;
  }
  function apagar(i) {
    i = i | 0;
    if (i < 0 || i >= N || !grupo.userData.aceso[i]) return false;
    grupo.userData.aceso[i] = false;
    gota(atApagada, i, 1); atApagada.needsUpdate = true;
    gota(atAcesa, i, 0);   atAcesa.needsUpdate = true;
    halo(i, 0);            atHalo.needsUpdate = true;
    return true;
  }
  grupo.userData.acender = acender;
  grupo.userData.apagar = apagar;

  return {
    grupo: grupo,
    /* o host copia funcoes do retorno pra window.__mundo.API */
    acender: acender,
    apagar: apagar,
    update: function (t, dt) {
      var mexeu = false;
      for (var i = 0; i < N; i++) {
        if (!grupo.userData.aceso[i]) continue;
        gota(atAcesa, i, 1 + 0.04 * Math.sin(t * 2.2 + i * 1.1));      /* pulso de 4% */
        halo(i, 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(t * 1.7 + i * 0.9))); /* respira */
        mexeu = true;
      }
      if (mexeu) { atAcesa.needsUpdate = true; atHalo.needsUpdate = true; }
    },
    /* medido com THREE r147 real: 1656 (postes) + 540 + 540 (gotas) + 36 (halos) */
    custo: { dc: 4, tri: 2772 }
  };
};

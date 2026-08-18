/* parteRadio — a RADIO DA SARINHA: cabine hexagonal de feltro no setor
   noroeste da praca, centro (-13,-13), virada para o centro (+x/+z).
   Balcao com microfone antigo + jukebox, antena com estrelinha e ondas
   de radio pulsando, alto-falantes nos dois lados, notas musicais
   flutuando ao redor. Contrato: partes/CONTRATO.md.

   Orientacao: local +X = "frente" (aponta pro centro da praca), local
   +Z = lateral. Cada peca estrutural nasce no frame local e recebe
   .rotateY(-ANG).translate(CX,0,CZ) — igual ao padrao de lampioes.js
   (rotateY(-ang).translate(px,pz)), so que com um unico ANG fixo.
   As notas musicais e as ondas/estrela nao dependem de "frente" (ficam
   em volta / no eixo central), entao sao posicionadas direto no mundo. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteRadio = function (ctx) {
  var T = ctx.T, M = ctx.M, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'radio';

  /* MUDOU 17/08: a Radio morava em (-13,-13), DENTRO da praca (raio 22) —
     os arquitetos mediram que ela roubava o quadrante noroeste do lugar
     onde a crianca nasce. Foi para o OESTE (-42,0), a vaga que o Palco
     deixou, e agora e uma zona de verdade em vez de um intruso no hub. */
  var CX = -42, CZ = 0, ANG = Math.PI / 2;
  var cosA = Math.cos(ANG), sinA = Math.sin(ANG);
  var CINZA = new T.Color(0x6a5a8f);

  function escurece(cor, f) {
    return new T.Color(cor).lerp(CINZA, f === undefined ? 0.18 : f);
  }
  /* ponto do mundo a partir de (frente, lado) local, sem mexer em geometria */
  function pontoMundo(fwd, lado) {
    return { x: CX + cosA * fwd - sinA * lado, z: CZ + sinA * fwd + cosA * lado };
  }
  /* leva uma peca do frame local (frente=+X) pro mundo, igual lampioes.js */
  function orient(geo) { return geo.rotateY(-ANG).translate(CX, 0, CZ); }

  /* ---- pinta: cor por vertice + tira uv (receita do CONTRATO) ---- */
  function pinta(geo, cor) {
    var c = cor.isColor ? cor : new T.Color(cor);
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  var matV = new T.MeshLambertMaterial({ vertexColors: true });

  var pecas = [];

  /* =========================================================================
     CABINE hexagonal: base creme + 6 coluninhas rosa + teto conico mel.
     CylinderGeometry/ConeGeometry(radial=6) nascem com vertice no angulo 0;
     giramos Math.PI/6 pra sobrar uma FACE (nao um bico) virada pra frente,
     onde encostam o balcao e a plaquinha.
     ========================================================================= */
  var HEX_R = 1.0, BASE_H = 1.0, ROOF_H = 0.85, ROOF_R = 1.2;

  pecas.push(orient(pinta(
    new T.CylinderGeometry(HEX_R, HEX_R * 1.05, BASE_H, 6).rotateY(Math.PI / 6)
      .translate(0, BASE_H / 2, 0), M.paleta.creme)));

  for (var k = 0; k < 6; k++) {
    var angC = Math.PI / 6 + k * (Math.PI / 3);
    var cxL = Math.cos(angC) * HEX_R * 0.9, czL = Math.sin(angC) * HEX_R * 0.9;
    pecas.push(orient(pinta(
      new T.CylinderGeometry(0.075, 0.075, BASE_H, 6, 1, true)
        .translate(cxL, BASE_H / 2, czL), M.paleta.rosa)));
  }

  pecas.push(orient(pinta(
    new T.ConeGeometry(ROOF_R, ROOF_H, 6).rotateY(Math.PI / 6)
      .translate(0, BASE_H + ROOF_H / 2, 0), M.paleta.mel)));

  /* haste da antena (a estrelinha e as ondas vao no DC do brilho) */
  var ANT_H = 0.85, ANT_TOPO = BASE_H + ROOF_H + ANT_H;   /* 2.70 */
  pecas.push(orient(pinta(
    new T.CylinderGeometry(0.03, 0.04, ANT_H, 6, 1, true)
      .translate(0, BASE_H + ROOF_H + ANT_H / 2, 0), escurece(M.paleta.mel, 0.35))));

  /* tapetinho de sombra sob a cabine (regra: tom mais escuro assenta no chao) */
  pecas.push(orient(pinta(
    new T.CircleGeometry(1.35, 16).rotateX(-Math.PI / 2).translate(0, 0.008, 0),
    escurece(M.paleta.creme, 0.30))));

  /* =========================================================================
     BALCAO virado pra frente (+x/+z), com microfone antigo e jukebox ao lado.
     ========================================================================= */
  var FWD_BAL = 2.0;

  pecas.push(orient(pinta(
    new T.BoxGeometry(0.6, 0.12, 1.7).translate(FWD_BAL, 0.84, 0), M.paleta.creme)));
  pecas.push(orient(pinta(
    new T.BoxGeometry(0.55, 0.80, 1.6).translate(FWD_BAL, 0.40, 0),
    escurece(M.paleta.rosa, 0.12))));
  /* sombra do conjunto balcao+jukebox */
  pecas.push(orient(pinta(
    new T.CircleGeometry(1.1, 14).rotateX(-Math.PI / 2).scale(1.55, 1, 1)
      .translate(FWD_BAL - 0.1, 0.006, 0.35), escurece(M.paleta.creme, 0.28))));

  /* microfone antigo: haste + capsula arredondada prateada */
  var MIC_FWD = FWD_BAL - 0.15, MIC_LADO = -0.45;
  var PRATA = 0xd8d2e8;
  pecas.push(orient(pinta(
    new T.CylinderGeometry(0.022, 0.03, 0.5, 6, 1, true)
      .translate(MIC_FWD, 0.84 + 0.25, MIC_LADO), PRATA)));
  pecas.push(orient(pinta(
    new T.SphereGeometry(0.095, 7, 5).scale(1, 1.25, 1)
      .translate(MIC_FWD, 0.84 + 0.5 + 0.10, MIC_LADO), PRATA)));

  /* jukebox: caixa colorida ao lado do balcao, com botoes (a tela vem no DC3) */
  var JX = 1.35, JZ = 1.05, JW = 0.55, JD = 0.5, JH = 0.75;
  pecas.push(orient(pinta(
    new T.BoxGeometry(JD, JH, JW).translate(JX, JH / 2, JZ), M.paleta.azulpo)));
  var CORES_BOTAO = [M.paleta.rosa, M.paleta.mel, M.paleta.azulpo];
  for (var b = 0; b < 3; b++) {
    pecas.push(orient(pinta(
      new T.BoxGeometry(0.08, 0.06, 0.08)
        .translate(JX + JD / 2 + 0.02, 0.16, JZ + (b - 1) * 0.15), CORES_BOTAO[b])));
  }

  /* alto-falantes nos dois lados da cabine */
  [-1, 1].forEach(function (lado) {
    pecas.push(orient(pinta(
      new T.BoxGeometry(0.32, 0.55, 0.32)
        .translate(0, 0.28, lado * (HEX_R + 0.45)), 0x4a4258)));
  });

  /* =========================================================================
     NOTAS MUSICAIS flutuantes (~10): bolinha + haste, mesma malha local
     clonada, cada uma nasce numa posicao do mundo e SOBE devagar no update,
     reaparecendo embaixo — mesmo truque de "reescrever a faixa de vertices"
     de lampioes.js/festa.js, so que com translacao em vez de escala.
     ========================================================================= */
  var notaBase = BGU.mergeBufferGeometries([
    new T.SphereGeometry(0.085, 6, 5),
    new T.BoxGeometry(0.03, 0.30, 0.03).translate(0.075, 0.16, 0)
  ].map(function (g) { g.deleteAttribute('uv'); return g; }));
  var VN = notaBase.attributes.position.count;
  var notaCanon = new Float32Array(notaBase.attributes.position.array);

  var N_NOTA = 10;
  var CORES_NOTA = [M.paleta.mel, M.paleta.rosa, M.paleta.azulpo, M.corGrama, M.paleta.creme];
  var notaAncora = [];
  for (var i = 0; i < N_NOTA; i++) {
    var angN = (i / N_NOTA) * Math.PI * 2;
    var raioN = 1.9 + (i % 3) * 0.35;
    notaAncora.push({
      x: CX + Math.cos(angN) * raioN, z: CZ + Math.sin(angN) * raioN,
      y0: 0.9 + (i % 4) * 0.32, fase: i * 0.31
    });
    var clone = notaBase.clone();
    pinta(clone, CORES_NOTA[i % CORES_NOTA.length]);
    clone.translate(notaAncora[i].x, notaAncora[i].y0, notaAncora[i].z);
    pecas.push(clone);
  }

  /* indice (em vertices) de onde comecam as notas dentro do merge grande */
  var notaInicioV = 0;
  for (var s = 0; s < pecas.length - N_NOTA; s++) notaInicioV += pecas[s].attributes.position.count;

  var geoDC1 = BGU.mergeBufferGeometries(pecas);
  var malhaDC1 = new T.Mesh(geoDC1, matV);
  malhaDC1.frustumCulled = false;   /* posicao das notas muda todo frame */
  grupo.add(malhaDC1);
  var posDC1 = geoDC1.attributes.position;

  /* =========================================================================
     ONDAS DE RADIO + ESTRELINHA: 3 aneis (torus) + estrela num unico DC
     aditivo. TorusGeometry nasce indexada, OctahedronGeometry NAO — normaliza
     as duas pro mesmo formato (armadilha do CONTRATO) antes de mesclar.
     Aneis "pulsam pra fora": escala cresce e brilho cai (cor por vertice,
     igual ao halo de lampioes.js), reiniciando o ciclo por defasagem de fase.
     ========================================================================= */
  var CENTRO_GLOW = { x: CX, y: ANT_TOPO + 0.10, z: CZ };   /* 2.80 */

  function semIndice(geo) { return geo.index ? geo.toNonIndexed() : geo; }

  var anel0 = semIndice(new T.TorusGeometry(0.22, 0.02, 5, 14))
    .rotateX(Math.PI / 2).translate(CENTRO_GLOW.x, CENTRO_GLOW.y, CENTRO_GLOW.z);
  anel0.deleteAttribute('uv');
  var VR = anel0.attributes.position.count;
  var anel1 = anel0.clone(), anel2 = anel0.clone();
  var estrela = semIndice(new T.OctahedronGeometry(0.15, 0))
    .translate(CENTRO_GLOW.x, CENTRO_GLOW.y, CENTRO_GLOW.z);
  estrela.deleteAttribute('uv');
  var VS = estrela.attributes.position.count;

  var geoGlow = BGU.mergeBufferGeometries([anel0, anel1, anel2, estrela]);
  var corGlow = new Float32Array(geoGlow.attributes.position.count * 3);
  geoGlow.setAttribute('color', new T.BufferAttribute(corGlow, 3));
  var posGlow = geoGlow.attributes.position, atGlow = geoGlow.attributes.color;
  var canonGlow = new Float32Array(posGlow.array);   /* pose de repouso (escala 1) */

  var matGlow = new T.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.9,
    blending: T.AdditiveBlending, depthWrite: false, fog: false
  });
  var malhaGlow = new T.Mesh(geoGlow, matGlow);
  malhaGlow.frustumCulled = false;
  grupo.add(malhaGlow);

  /* reescreve a faixa [ini,ini+n) em torno de CENTRO_GLOW com escala s */
  function reescala(attr, ini, n, s) {
    var arr = attr.array, cx = CENTRO_GLOW.x, cy = CENTRO_GLOW.y, cz = CENTRO_GLOW.z;
    for (var v = ini; v < ini + n; v++) {
      var k = v * 3;
      arr[k]     = cx + (canonGlow[k]     - cx) * s;
      arr[k + 1] = cy + (canonGlow[k + 1] - cy) * s;
      arr[k + 2] = cz + (canonGlow[k + 2] - cz) * s;
    }
  }
  function corFaixa(attr, ini, n, brilho) {
    var arr = attr.array;
    for (var v = ini; v < ini + n; v++) { var k = v * 3; arr[k] = brilho; arr[k + 1] = brilho; arr[k + 2] = brilho; }
  }
  var idxEstrela = 3 * VR;
  reescala(posGlow, idxEstrela, VS, 1);   /* estrela nao muda de escala, so brilho */

  /* =========================================================================
     PLAQUINHA "Radio da Sarinha" + TELA do jukebox: 1 atlas de CanvasTexture,
     2 planos, 1 DC (igual portais.js). Tela fica na frente do jukebox; a
     placa fica encostada na parede da cabine, abaixo do beiral do teto.
     ========================================================================= */
  var LARG_TELA = 256, LARG_PLACA = 512, ALT_CEL = 256;
  var cv = document.createElement('canvas');
  cv.width = LARG_TELA + LARG_PLACA; cv.height = ALT_CEL;
  var g2 = cv.getContext('2d');

  function caixaRedonda(x, y, w, h, r) {
    g2.beginPath();
    g2.moveTo(x + r, y);
    g2.arcTo(x + w, y,     x + w, y + h, r);
    g2.arcTo(x + w, y + h, x,     y + h, r);
    g2.arcTo(x,     y + h, x,     y,     r);
    g2.arcTo(x,     y,     x + w, y,     r);
    g2.closePath();
  }
  function fonteQueCabe(txt, tam, larguraMax) {
    var s = tam;
    while (s > 20) {
      g2.font = '800 ' + s + 'px "Baloo 2", Arial, sans-serif';
      if (g2.measureText(txt).width <= larguraMax) break;
      s -= 2;
    }
    return s;
  }
  function notinha(x, y, cor) {
    g2.fillStyle = cor;
    g2.beginPath(); g2.ellipse(x, y, 10, 7, -0.35, 0, Math.PI * 2); g2.fill();
    g2.fillRect(x + 8, y - 34, 4, 34);
    g2.beginPath();
    g2.moveTo(x + 12, y - 34); g2.quadraticCurveTo(x + 26, y - 28, x + 12, y - 16);
    g2.fill();
  }
  function desenhaAtlas() {
    g2.clearRect(0, 0, cv.width, cv.height);
    /* ---- tela do jukebox ---- */
    g2.fillStyle = '#241664';
    caixaRedonda(14, 14, LARG_TELA - 28, ALT_CEL - 28, 16); g2.fill();
    g2.strokeStyle = '#120a33'; g2.lineWidth = 6; g2.stroke();
    notinha(78, 168, '#ffd166');
    notinha(126, 116, '#ff9bb0');
    notinha(178, 150, '#9fd8f2');
    /* ---- placa "Radio da Sarinha" ---- */
    var ox = LARG_TELA;
    g2.lineCap = 'round';
    g2.strokeStyle = '#7a5f3a'; g2.lineWidth = 7;
    g2.beginPath();
    g2.moveTo(ox + LARG_PLACA / 2, 6); g2.lineTo(ox + 96, 40);
    g2.moveTo(ox + LARG_PLACA / 2, 6); g2.lineTo(ox + LARG_PLACA - 96, 40);
    g2.stroke();
    g2.fillStyle = '#efe3c8';
    caixaRedonda(ox + 24, 36, LARG_PLACA - 48, ALT_CEL - 60, 26); g2.fill();
    g2.strokeStyle = '#c79a6b'; g2.lineWidth = 8; g2.stroke();
    g2.setLineDash([12, 10]); g2.lineWidth = 4; g2.strokeStyle = '#d9b98a';
    caixaRedonda(ox + 42, 52, LARG_PLACA - 84, ALT_CEL - 92, 18); g2.stroke();
    g2.setLineDash([]);
    g2.textAlign = 'center'; g2.textBaseline = 'middle';
    g2.fillStyle = '#6a3fc5';
    var fs = fonteQueCabe('Radio da Sarinha', 62, LARG_PLACA - 110);
    g2.font = '800 ' + fs + 'px "Baloo 2", Arial, sans-serif';
    g2.fillText('Rádio da Sarinha', ox + LARG_PLACA / 2, ALT_CEL / 2 + 6);
  }
  desenhaAtlas();
  var texAtlas = new T.CanvasTexture(cv);
  texAtlas.generateMipmaps = false; texAtlas.minFilter = T.LinearFilter; texAtlas.magFilter = T.LinearFilter;
  if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
    document.fonts.ready.then(function () { desenhaAtlas(); texAtlas.needsUpdate = true; });
  }

  var W_ATLAS = LARG_TELA + LARG_PLACA;
  function remapaUv(geo, u0, u1) {
    var uv = geo.attributes.uv;
    for (var w = 0; w < uv.count; w++) uv.setX(w, u0 + uv.getX(w) * (u1 - u0));
  }

  var telaGeo = new T.PlaneGeometry(0.34, 0.24).rotateY(Math.PI / 2)
    .translate(JX + JD / 2 + 0.005, 0.52, JZ);
  remapaUv(telaGeo, 0, LARG_TELA / W_ATLAS);
  orient(telaGeo);

  var placaGeo = new T.PlaneGeometry(1.1, 0.42).rotateY(Math.PI / 2)
    .translate(0.90, 0.80, 0);
  remapaUv(placaGeo, LARG_TELA / W_ATLAS, 1);
  orient(placaGeo);

  var geoDC3 = BGU.mergeBufferGeometries([telaGeo, placaGeo]);
  var malhaDC3 = new T.Mesh(geoDC3, new T.MeshBasicMaterial({ map: texAtlas }));
  grupo.add(malhaDC3);

  /* ---------- colisor: so a cabine, exatamente como pedido ---------- */
  ctx.COLISORES.push({ x: CX, z: CZ, raio: 2.6 });

  /* ---------- API ---------- */
  grupo.userData.balcao = pontoMundo(2.9, 0);
  var pulso = 0;
  grupo.userData.pulsar = function () { pulso = 1; };

  return {
    grupo: grupo,
    balcao: grupo.userData.balcao,
    pulsar: grupo.userData.pulsar,
    /* medido com THREE r147 real (harness headless, sem canvas de verdade):
       920 (cabine+balcao+mic+jukebox+alto-falantes+notas) + 428 (ondas+estrela) + 4 (atlas) */
    custo: { dc: 3, tri: 1352 },
    update: function (t, dt) {
      pulso *= 0.90;
      /* notas: sobem devagar e reaparecem embaixo */
      for (var i = 0; i < N_NOTA; i++) {
        var an = notaAncora[i];
        var prog = ((t * 0.28 + an.fase) % 1 + 1) % 1;
        var ax = an.x + Math.sin(t * 0.6 + i) * 0.12;
        var az = an.z + Math.cos(t * 0.5 + i * 1.3) * 0.12;
        var ay = an.y0 + prog * 2.2;
        var ini = notaInicioV + i * VN;
        for (var v = 0; v < VN; v++) {
          var k = (ini + v) * 3, kc = v * 3;
          posDC1.array[k]     = notaCanon[kc]     + ax;
          posDC1.array[k + 1] = notaCanon[kc + 1] + ay;
          posDC1.array[k + 2] = notaCanon[kc + 2] + az;
        }
      }
      posDC1.needsUpdate = true;

      /* ondas de radio: 3 aneis em fases diferentes, escala sobe / brilho cai */
      for (var r = 0; r < 3; r++) {
        var p = ((t * 0.55 + r / 3) % 1 + 1) % 1;
        reescala(posGlow, r * VR, VR, 1 + p * (2.4 + pulso * 1.2));
        corFaixa(atGlow, r * VR, VR, Math.max(0, (1 - p) * (0.85 + pulso * 0.4)));
      }
      /* estrelinha: pisca suave, com flash quando a musica toca */
      corFaixa(atGlow, idxEstrela, VS, 0.75 + 0.25 * Math.sin(t * 2.2) + pulso * 0.5);
      posGlow.needsUpdate = true;
      atGlow.needsUpdate = true;
    }
  };
};

/* parteVilinha — o BAIRRO DAS CASAS: uma casinha de feltro desenhada uma vez e
   repetida em 24 cores diferentes (InstancedMesh = 1 draw call para o bairro
   inteiro). Cada crianca escolhe a SUA casa; a escolhida ganha bandeirinha.
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteVilinha = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'vilinha';

  var CZ = 40;                 /* centro da Vilinha: (0, +40) — ao SUL da praca */
  var CINZA = new T.Color(0x6a5a8f);

  /* =========================================================================
     OS 20 LOTES — QUADRA (16/08). O anel redondo antigo foi abandonado:
     as casas nao alinhavam (cada uma com rotacao propria), encostavam nos
     vizinhos e NAO HAVIA ENTRADA — a crianca atravessava a parede de casas.
     Agora sao 4 FILEIRAS RETAS ao redor da praca do chafariz:
       NORTE (z 29.5): 4 casas, com um VAO CENTRAL de 9.6 de largura —
                       e a boca da vila, alinhada com o corredor que vem
                       da praca principal;
       SUL   (z 51.5): 6 casas;  LESTE/OESTE (x ±12.5): 5 casas cada.
     Cada fileira tem UMA rotacao so (a porta olha para a praca), entao o
     alinhamento e exato. Os cantos foram medidos: o par mais proximo
     (norte-leste) tem 5.3 de distancia entre centros, com casas de ~3.4.
     A tabela vive AQUI e e publicada em window.VILINHA_LOTES para a peca
     que desenha as casas (casas-vilinha.js) usar a MESMA verdade. */
  function montarLotes() {
    var L = [];
    function fila(pontos, rot) {
      for (var i = 0; i < pontos.length; i++) L.push({ x: pontos[i][0], z: pontos[i][1], rot: rot });
    }
    /* porta olha para o centro da praca */
    fila([[-9, 29.5], [-4.8, 29.5], [4.8, 29.5], [9, 29.5]], 0);                    /* norte: olha +Z */
    fila([[-10, 51.5], [-6, 51.5], [-2, 51.5], [2, 51.5], [6, 51.5], [10, 51.5]], Math.PI); /* sul: olha -Z */
    fila([[12.5, 33.5], [12.5, 37], [12.5, 40.5], [12.5, 44], [12.5, 47.5]], -Math.PI / 2); /* leste: olha -X */
    fila([[-12.5, 33.5], [-12.5, 37], [-12.5, 40.5], [-12.5, 44], [-12.5, 47.5]], Math.PI / 2); /* oeste: olha +X */
    return L;
  }
  window.VILINHA_LOTES = montarLotes();

  function pinta(geo, cor, fBase) {
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.20 : fBase);
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
  var matV = new T.MeshLambertMaterial({ vertexColors: true });

  /* ---- chao do bairro (QUADRA) + calcada + rua de entrada ----
     O disco eliptico virou um retangulo de cantos chanfrados, do tamanho
     da quadra; a rua em anel virou uma CALCADA retangular com um furo
     redondo onde mora o lago/chafariz (a fonte e peca propria, agua.js,
     e continua no centro (0,40) — o Ivan pediu para manter). */
  (function chao() {
    var pecas = [];
    /* grama da quadra: retangulo chanfrado (octogono achatado) */
    var g = new T.CircleGeometry(1, 8).rotateY(Math.PI / 8).rotateX(-Math.PI / 2);
    g.scale(18.6, 1, 16.4);
    g.translate(0, 0.006, CZ + 0.6);
    var verde = new T.Color(0xbcd6b0), longe = new T.Color(0x6f7fa8);
    var pos = g.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var ex = pos.getX(i) / 16, ez = (pos.getZ(i) - CZ) / 14;
      var kk = Math.min(1, Math.hypot(ex, ez));
      var c = verde.clone().lerp(longe, Math.pow(kk, 2.6) * 0.72);
      a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    g.deleteAttribute('uv');
    pecas.push(g);
    /* corredor da praca principal ate a BOCA da vila (vao central norte) */
    /* ⛔ era 0xbcd6b0 (cor da grama): a avenida sul era invisivel. Creme
       0xf0e2cf, igual as avenidas leste/oeste e ao corredor do jardim. */
    var cor = new T.PlaneGeometry(6.0, 12).rotateX(-Math.PI / 2);
    cor.translate(0, 0.005, 24.0);
    pecas.push(pinta(cor, 0xf0e2cf, 0.1));

    /* CALCADA: retangulo com furo redondo para o lago (Shape + hole).
       Sem o furo, a calcada cobriria a agua do chafariz. */
    (function calcada() {
      var s = new T.Shape();
      var X = 10.6, Z0 = -9.4, Z1 = 9.4, ch = 2.2;   /* cantos chanfrados */
      s.moveTo(-X + ch, Z0);
      s.lineTo(X - ch, Z0); s.lineTo(X, Z0 + ch);
      s.lineTo(X, Z1 - ch); s.lineTo(X - ch, Z1);
      s.lineTo(-X + ch, Z1); s.lineTo(-X, Z1 - ch);
      s.lineTo(-X, Z0 + ch); s.closePath();
      var furo = new T.Path();
      furo.absarc(0, 0, 6.3, 0, Math.PI * 2, true);
      s.holes.push(furo);
      var geo = new T.ShapeGeometry(s, 8);
      geo.rotateX(Math.PI / 2);                       /* Shape nasce em XY */
      geo.translate(0, 0.014, CZ);
      pecas.push(pinta(geo, 0xf0e2cf, 0.12));
    })();

    /* pracinha da boca (onde o corredor encontra a vila) */
    var ent = new T.PlaneGeometry(9.6, 5.2).rotateX(-Math.PI / 2);
    ent.translate(0, 0.013, CZ - 12.4);
    pecas.push(pinta(ent, 0xf0e2cf, 0.12));
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- A CASINHA ANTIGA SAIU (16/08) ----
     Era UMA caixa com telhado, repetida 20x com cor por instancia.
     Foi substituida pelos 4 MODELOS da ficha do Ivan (HOUSE-01..04),
     desenhados em partes/casas-vilinha.js NOS MESMOS 20 LOTES.
     O que ficou aqui: as coordenadas (CASAS), os colisores, a bandeira
     e a API (marcarCasa/corDaCasa) — a mecanica de escolher a sua casa
     nao muda. Esta peca continua dona do CHAO, da rua e das cercas. */

  /* ---- 24 casas em anel, todas viradas para a rua ---- */
  var CORES = [
    0xff9bb0, 0xffc6d0, 0xffd166, 0xffe9a8, 0x9fd8f2, 0xbfe6ff,
    0xa8dCa0, 0xc9ecb8, 0xd9c9ff, 0xc0aef5, 0xffb98a, 0xffd6b0,
    0xf58fa0, 0xffe3b0, 0x8fd0e8, 0xa6e0d0, 0xcfe8a0, 0xe8c8f0,
    0xffb3c6, 0xb8e0f5
  ];
  var LOTES = window.VILINHA_LOTES;
  var N_CASA = Math.min(CORES.length, LOTES.length);
  var CASAS = [];
  (function porCasas() {
    for (var i = 0; i < N_CASA; i++) {
      var L = LOTES[i], x = L.x, z = L.z;
      /* a porta fica no lado que a casa olha (+Z local girado por L.rot);
         a crianca para 2.0 a frente dela, sobre a calcada */
      var px = x + Math.sin(L.rot) * 2.0, pz = z + Math.cos(L.rot) * 2.0;
      CASAS.push({ i: i, x: x, z: z, rot: L.rot, cor: CORES[i], px: px, pz: pz });
      ctx.COLISORES.push({ x: x, z: z, raio: 1.7 });
    }
  })();

  /* ---- cerquinhas entre as casas (1 malha) ----
     as arvorezinhas que moravam nas posicoes pares (i%2===0) foram
     substituidas pela arvore-flor nova (partes/arvores-mundo.js, grupo
     C_VILINHA_QUINTAL, mesmas 10 coordenadas calculadas desta formula)
     - pedido do Ivan de trocar toda arvore antiga do jogo pela nova. */
  (function enfeites() {
    var pecas = [];
    /* cerquinha NO VAO ENTRE CASAS VIZINHAS da mesma fileira (quintal) */
    for (var i = 0; i < N_CASA - 1; i++) {
      var A = LOTES[i], B = LOTES[i + 1];
      if (A.rot !== B.rot) continue;                 /* nao cerca a virada de esquina */
      var d = Math.hypot(B.x - A.x, B.z - A.z);
      if (d > 5.2) continue;                         /* pula o vao da entrada */
      var mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2;
      for (var k = -1; k <= 1; k++) {
        var est = new T.CapsuleGeometry(0.07, 0.34, 3, 5);
        /* espalha a cerquinha ao longo da fileira, atras da linha das casas */
        est.translate(mx + Math.cos(A.rot) * k * 0.4, 0.26, mz - Math.sin(A.rot) * k * 0.4);
        pecas.push(pinta(est, 0xf0e2cf, 0.16));
      }
    }
    /* placa de boas-vindas ao lado da BOCA da vila */
    var poste = new T.CylinderGeometry(0.09, 0.09, 1.6, 6);
    poste.translate(-3.4, 0.8, CZ - 12.0);
    pecas.push(pinta(poste, 0xb08968, 0.2));
    grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));
  })();

  /* ---- bandeirinha dourada que marca A SUA casa ---- */
  var bandeira = (function () {
    var pecas = [];
    var mastro = new T.CylinderGeometry(0.05, 0.05, 1.5, 6);
    mastro.translate(0, 0.75, 0);
    pecas.push(pinta(mastro, 0xf0e2cf, 0.1));
    var pano = new T.BoxGeometry(0.7, 0.42, 0.05);
    pano.translate(0.37, 1.3, 0);
    pecas.push(pinta(pano, 0xffd166, 0.08));
    var m = new T.Mesh(BGU.mergeBufferGeometries(pecas), matV);
    m.visible = false;
    grupo.add(m);
    return m;
  })();

  /* ---- API para o jogo ---- */
  grupo.userData.casas = CASAS;
  grupo.userData.centro = { x: 0, z: CZ, rx: 15, rz: 13 };
  grupo.userData.marcarCasa = function (i) {
    if (i < 0 || i >= N_CASA) return false;
    var c = CASAS[i];
    /* bandeira ao lado da porta, na frente da casa (usa a rotacao da fileira) */
    bandeira.position.set(c.x + Math.sin(c.rot) * 1.5 + Math.cos(c.rot) * 1.1,
                          0,
                          c.z + Math.cos(c.rot) * 1.5 - Math.sin(c.rot) * 1.1);
    bandeira.visible = true;
    return true;
  };
  grupo.userData.corDaCasa = function (i) { return CORES[i % N_CASA]; };

  return {
    grupo: grupo,
    custo: { dc: 4, tri: 5200 },
    update: function (t) {
      if (bandeira.visible) bandeira.rotation.y = Math.sin(t * 1.4) * 0.25;
    }
  };
};

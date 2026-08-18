/* parteCasa03 - HOUSE-03, a casa "nivel 3, mais encantadora" (rosa).

   Ficha: 3.4 x 3.4 de planta, parede 2.5, altura total ~4.45 (bolinha do
   pinaculo inclusa). Pivo no centro/chao (Y=0 = chao), FRENTE = +Z.
   O que define ESTA casa e o DORMER FRONTAL (mansarda): uma casinha
   pequena que nasce de dentro do telhado, com telhadinho proprio de 2
   aguas e uma janelinha acesa. Mais floreiras sob as duas janelas da
   frente, com pontinhos verdes e florzinhas rosa claro.

   CONTRATO.md respeitado: 2 draw calls (1 malha Lambert com cor por
   vertice + 1 malha Basic para o que acende), zero luz nova, zero sombra
   de engine (sombra = disco escuro pintado no chao), zero textura, ASCII
   puro, script classico (nada de modulo ES).

   GEOMETRIA QUE A FICHA NAO CONTA (as armadilhas ja pagas):
   1. Sem CSG nao existe furo na parede: janela e porta sao CAMADAS na
      FRENTE da face da parede (z=1.70). A moldura e VAZADA (Shape com
      holes) e vai mais para a frente; o vidro/porta ficam ATRAS da
      moldura mas AINDA na frente da parede -> o recuo e de verdade.
   2. Face vertical pega ~55% da luz neste rig de 2 luzes: a parede
      grande vai com o pigmento clareado ~10% (PAREDE_LUZ) para nao
      apagar. Paredes usam fBase baixo (0.04-0.06); pecas pequenas
      0.10-0.16.
   3. O dormer PRECISA nascer de dentro do telhado: a base dele fica
      ABAIXO do plano do telhado na frente e o topo fica ABAIXO do plano
      la atras -> a caixa "afunda" no telhado nas duas pontas e so a
      parte do meio aparece. As contas estao anotadas na secao DORMER.
   4. ConeGeometry(R, alt, 4) nasce com os CANTOS em +X/+Z; o
      rotateY(PI/4) joga os cantos para as diagonais e faz as 4 AGUAS
      olharem para +X/-X/+Z/-Z, alinhadas com as paredes. A meia largura
      do telhado vira R*cos(45) = 0.7071*R, nao R. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCasa03 = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'casa03';

  /* ---------- paleta da ficha (hex exatos) ---------- */
  var PAREDE = 0xffb4d1, PAREDE_CLARA = 0xfce6ef,
      TELHADO = 0xf48fb1, TELHADO_MEDIO = 0xe9789c, TELHADO_ESCURO = 0xcb5f7a,
      PORTA = 0x6b4150, DOURADO = 0xf2b94b, DOURADO_CLARO = 0xffd98a,
      VERDE = 0x66c27a,
      VIDRO = 0xffe49a, VIDRO_QUENTE = 0xffb83e;

  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.12 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var minY = 1e9, maxY = -1e9, i, y;
    for (i = 0; i < n; i++) { y = pos.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (i = 0; i < n; i++) {
      var f = (pos.getY(i) - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.15));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  /* vidro que ACENDE: miolo quente, borda mel. Pintar ANTES de mover a
     geometria (usa a coordenada local para achar o miolo). */
  function acende(geo, raio) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var cBorda = new T.Color(VIDRO), cMiolo = new T.Color(VIDRO_QUENTE);
    for (var i = 0; i < n; i++) {
      var dx = pos.getX(i) / raio, dy = pos.getY(i) / raio;
      var d = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      var c = cMiolo.clone().lerp(cBorda, Math.min(1, 0.22 + d * 1.0));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  var corpo = [], brilho = [];

  /* =====================================================================
     MEDIDAS (metros do mundo)
     ===================================================================== */
  var MX = 1.70;                    /* meia largura      -> casa 3.40 em X */
  var MZ = 1.70;                    /* meia profundidade -> casa 3.40 em Z */
  var ALT_PAREDE = 2.50;            /* topo da parede em Y=2.50 */
  var ALT_BASE = 0.18;              /* alicerce/rodape que sobra 0.08 na planta */

  var Y_BEIRAL = 2.40, ALT_BEIRAL = 0.22;   /* tabua do beiral: 2.40 -> 2.62 */
  var Y_TELHADO = 2.58, ALT_TELHADO = 1.74; /* cone: 2.58 -> 4.32 (o apice) */
  var R_TELHADO = 2.80;                     /* meia largura = 0.7071*2.80 = 1.98 */
  var MEIA_TELHADO = R_TELHADO * Math.cos(Math.PI / 4);
  var APEX = Y_TELHADO + ALT_TELHADO;       /* 4.32 */
  var INCL = ALT_TELHADO / MEIA_TELHADO;    /* 0.879 de subida por metro */
  /* altura da agua frontal num dado z (so vale para |x| < z) */
  function alturaTelhado(z) { return APEX - z * INCL; }

  var Z_FACE = MZ;                  /* face da parede da frente: z = 1.70 */

  /* =====================================================================
     SOMBRA (disco escuro pintado no chao) + ALICERCE + PAREDES
     ===================================================================== */
  corpo.push(pinta(new T.CircleGeometry(2.25, 12).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  /* alicerce: 3.56 x 3.56, 0.18 de altura -> a casa nao "flutua" no chao */
  corpo.push(pinta(new T.BoxGeometry(MX * 2 + 0.16, ALT_BASE, MZ * 2 + 0.16)
    .translate(0, ALT_BASE / 2, 0), TELHADO_ESCURO, 0.16));

  /* caixa da parede: pigmento clareado 10% (armadilha 2 do cabecalho) */
  var PAREDE_LUZ = new T.Color(PAREDE).lerp(new T.Color(0xffffff), 0.10);
  corpo.push(pinta(new T.BoxGeometry(MX * 2, ALT_PAREDE, MZ * 2)
    .translate(0, ALT_PAREDE / 2, 0), PAREDE_LUZ, 0.05));

  /* =====================================================================
     TELHADO PIRAMIDAL DE 4 AGUAS + BEIRAL SALIENTE + PINACULO
     ===================================================================== */
  /* tabua do beiral: sobra 0.32 da parede (2.022 contra 1.70) e ainda
     sobra 0.09 do proprio cone -> a beira do telhado ganha espessura */
  var beiral = new T.CylinderGeometry(2.86, 2.62, ALT_BEIRAL, 4);
  beiral.rotateY(Math.PI / 4);
  beiral.translate(0, Y_BEIRAL + ALT_BEIRAL / 2, 0);
  corpo.push(pinta(beiral, TELHADO_ESCURO, 0.14));

  var cone = new T.ConeGeometry(R_TELHADO, ALT_TELHADO, 4);
  cone.rotateY(Math.PI / 4);                 /* aguas olhando +X/-X/+Z/-Z */
  cone.translate(0, Y_TELHADO + ALT_TELHADO / 2, 0);
  corpo.push(pinta(cone, TELHADO, 0.15));

  /* bolinha dourada no apice (altura total = 4.32 + 0.15 = ~4.47) */
  corpo.push(pinta(new T.SphereGeometry(0.12, 6, 3).translate(0, APEX + 0.03, 0),
    DOURADO_CLARO, 0.12));

  /* =====================================================================
     CHAMINE (fundo-esquerda, enterrada na agua lateral)
     ===================================================================== */
  (function chamine() {
    var cx = -1.02, cz = -0.55;              /* teto ali esta em y = 3.46 */
    var alt = 1.22, y0 = 2.94;               /* base enterrada, topo em 4.16 */
    corpo.push(pinta(new T.BoxGeometry(0.42, alt, 0.42).translate(cx, y0 + alt / 2, cz),
      PAREDE_CLARA, 0.14));
    corpo.push(pinta(new T.BoxGeometry(0.54, 0.13, 0.54).translate(cx, y0 + alt + 0.06, cz),
      TELHADO_ESCURO, 0.12));
  })();

  /* =====================================================================
     PORTA EM ARCO (camadas: moldura VAZADA na frente, folha atras dela,
     as duas ainda na frente da face da parede)
     ===================================================================== */
  /* arco: retangulo com o topo fechado por duas quadraticas */
  function formaArco(largura, altura) {
    var w = largura / 2, ombro = altura - w;   /* ombro = onde a curva comeca */
    var s = new T.Shape();
    s.moveTo(-w, 0);
    s.lineTo(-w, ombro);
    s.quadraticCurveTo(-w, altura, 0, altura);
    s.quadraticCurveTo(w, altura, w, ombro);
    s.lineTo(w, 0);
    s.closePath();
    return s;
  }

  var PORTA_L = 0.98, PORTA_H = 1.80;          /* vao livre da porta */
  (function portaArco() {
    /* moldura clara vazada: 1.16 x 1.92 por fora, o vao por dentro */
    var fora = formaArco(1.16, 1.92);
    var dentro = formaArco(PORTA_L, PORTA_H);
    fora.holes.push(new T.Path(dentro.getPoints(24)));
    var mold = new T.ExtrudeGeometry(fora, { depth: 0.16, bevelEnabled: false, curveSegments: 4 });
    mold.translate(0, ALT_BASE - 0.10, Z_FACE - 0.02);   /* frente da moldura em z=1.84 */
    corpo.push(pinta(mold, PAREDE_CLARA, 0.10));

    /* folha da porta: chapa recuada 0.10 atras da frente da moldura,
       porem 0.04 A FRENTE da parede -> nao some dentro dela */
    var folha = new T.ShapeGeometry(formaArco(PORTA_L + 0.03, PORTA_H + 0.02), 4);
    folha.translate(0, ALT_BASE - 0.10, Z_FACE + 0.04);
    corpo.push(pinta(folha, PORTA, 0.10));

    /* macaneta dourada: sobra 0.10 da folha para pegar luz */
    corpo.push(pinta(new T.SphereGeometry(0.075, 6, 3).translate(0.34, 0.98, Z_FACE + 0.10),
      DOURADO, 0.10));

    /* degrau da soleira */
    corpo.push(pinta(new T.BoxGeometry(1.34, 0.14, 0.42).translate(0, 0.07, Z_FACE + 0.16),
      PAREDE_CLARA, 0.16));
  })();

  /* =====================================================================
     JANELAS DA FRENTE (2, ACESAS) + FLOREIRAS
     ===================================================================== */
  /* moldura vazada retangular: 4 pontos por fora, 4 por dentro */
  function molduraVazada(lg, alt, esp) {
    var w = lg / 2, h = alt / 2, wi = w - esp, hi = h - esp;
    var s = new T.Shape();
    s.moveTo(-w, -h); s.lineTo(w, -h); s.lineTo(w, h); s.lineTo(-w, h); s.closePath();
    var vao = new T.Shape();
    vao.moveTo(-wi, -hi); vao.lineTo(wi, -hi); vao.lineTo(wi, hi); vao.lineTo(-wi, hi); vao.closePath();
    s.holes.push(new T.Path(vao.getPoints(24)));
    return new T.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false });
  }

  function janelaFrente(cx, cy) {
    var LG = 0.94, ALT = 0.94, ESP = 0.13;
    /* moldura: z de 1.68 a 1.82 (a mais saliente das camadas) */
    var m = molduraVazada(LG, ALT, ESP);
    m.translate(cx, cy, Z_FACE - 0.02);
    corpo.push(pinta(m, PAREDE_CLARA, 0.10));
    /* vidro aceso: 0.06 atras da frente da moldura, 0.06 na frente da parede */
    var v = acende(new T.PlaneGeometry(LG - ESP * 2 + 0.04, ALT - ESP * 2 + 0.04, 2, 2), (ALT - ESP * 2) * 0.62);
    v.translate(cx, cy, Z_FACE + 0.06);
    brilho.push(v);
    /* caixilho em cruz, na frente do vidro e atras da testa da moldura */
    corpo.push(pinta(new T.BoxGeometry(LG - ESP * 2, 0.055, 0.05).translate(cx, cy, Z_FACE + 0.10),
      PAREDE_CLARA, 0.10));
    corpo.push(pinta(new T.BoxGeometry(0.055, ALT - ESP * 2, 0.05).translate(cx, cy, Z_FACE + 0.10),
      PAREDE_CLARA, 0.10));
  }

  /* floreira: caixinha escura + friso dourado + 3 pontinhos verdes + 3 flores */
  function floreira(cx, yTopo) {
    var yc = yTopo - 0.11;
    corpo.push(pinta(new T.BoxGeometry(0.86, 0.22, 0.26).translate(cx, yc, Z_FACE + 0.13),
      PORTA, 0.14));
    corpo.push(pinta(new T.BoxGeometry(0.92, 0.06, 0.30).translate(cx, yTopo + 0.01, Z_FACE + 0.13),
      DOURADO, 0.12));
    var dx = [-0.28, 0.0, 0.28], i;
    for (i = 0; i < 3; i++) {
      corpo.push(pinta(new T.SphereGeometry(0.14, 5, 2)
        .translate(cx + dx[i], yTopo + 0.10, Z_FACE + 0.15), VERDE, 0.16));
    }
    var fx = [-0.20, 0.06, 0.24], fy = [0.20, 0.24, 0.17];
    for (i = 0; i < 3; i++) {
      corpo.push(pinta(new T.SphereGeometry(0.085, 5, 2)
        .translate(cx + fx[i], yTopo + fy[i], Z_FACE + 0.21), PAREDE_CLARA, 0.14));
    }
  }

  janelaFrente(-0.99, 1.62);
  janelaFrente(0.99, 1.62);
  floreira(-0.99, 1.10);            /* topo da floreira 0.05 abaixo da janela */
  floreira(0.99, 1.10);

  /* =====================================================================
     DORMER FRONTAL (a assinatura da HOUSE-03)
     Agua da frente: y = 4.32 - z*0.879.
       z=1.66 (testa do dormer)  -> telhado em 2.86 ; base do dormer 2.74  (enterrada)
       z=0.66 (fundo do dormer)  -> telhado em 3.74 ; topo do dormer 3.66  (enterrada)
     Ou seja: a caixa entra no telhado nas duas pontas e so o miolo aparece.
     ===================================================================== */
  (function dormer() {
    var Z_TESTA = 1.66, Z_FUNDO = 0.66;
    var zc = (Z_TESTA + Z_FUNDO) / 2, prof = Z_TESTA - Z_FUNDO;
    var LG = 1.10, ALT = 0.92, yc = 3.20;      /* corpo: 2.74 -> 3.66 */
    var yTopo = yc + ALT / 2;

    corpo.push(pinta(new T.BoxGeometry(LG, ALT, prof).translate(0, yc, zc), PAREDE_LUZ, 0.06));

    /* frontao de 2 aguas: prisma triangular + as 2 rampas do telhadinho */
    var W = LG / 2 + 0.05, H = 0.42;
    var tri = new T.Shape();
    tri.moveTo(-W, 0); tri.lineTo(W, 0); tri.lineTo(0, H); tri.closePath();
    var gt = new T.ExtrudeGeometry(tri, { depth: prof, bevelEnabled: false });
    gt.translate(0, yTopo, Z_FUNDO);
    corpo.push(pinta(gt, PAREDE_CLARA, 0.10));

    var comp = Math.sqrt(W * W + H * H) + 0.16;
    var ang = Math.atan2(H, W);
    for (var lado = -1; lado <= 1; lado += 2) {
      var ramp = new T.BoxGeometry(comp, 0.13, prof + 0.16);
      ramp.rotateZ(-lado * ang);
      ramp.translate(lado * W / 2, yTopo + H / 2 + 0.04, zc + 0.05);
      corpo.push(pinta(ramp, TELHADO_MEDIO, 0.13));
    }

    /* janelinha acesa do dormer, na testa (z=1.66): moldura + vidro atras */
    var m = molduraVazada(0.66, 0.56, 0.10);
    m.translate(0, 3.20, Z_TESTA - 0.02);
    corpo.push(pinta(m, PAREDE_CLARA, 0.10));
    var v = acende(new T.PlaneGeometry(0.50, 0.40, 2, 2), 0.26);
    v.translate(0, 3.20, Z_TESTA + 0.06);
    brilho.push(v);
  })();

  /* =====================================================================
     2 DRAW CALLS
     ===================================================================== */
  var malhaCorpo = new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malhaCorpo.name = 'casa03_corpo';
  grupo.add(malhaCorpo);

  var malhaBrilho = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
  malhaBrilho.name = 'casa03_brilho';
  grupo.add(malhaBrilho);

  /* =====================================================================
     ANCHORS (pontos de encaixe para a composicao da vilinha)
     ===================================================================== */
  var anchors = new T.Group();
  anchors.name = 'Anchors';
  var DEF_ANCHORS = [
    { nome: 'TopAnchor', x: 0, y: APEX, z: 0 },            /* apice do telhado */
    { nome: 'FrontAnchor', x: 0, y: 0, z: MZ + 0.35 },     /* na frente da porta */
    { nome: 'LeftAnchor', x: -MX - 0.20, y: 0, z: 0 },
    { nome: 'RightAnchor', x: MX + 0.20, y: 0, z: 0 },
    { nome: 'BackAnchor', x: 0, y: 0, z: -MZ - 0.20 }
  ];
  var mapaAnchors = {};
  for (var ia = 0; ia < DEF_ANCHORS.length; ia++) {
    var d = DEF_ANCHORS[ia];
    var o = new T.Object3D();
    o.name = d.nome;
    o.position.set(d.x, d.y, d.z);
    anchors.add(o);
    mapaAnchors[d.nome] = o;
  }
  grupo.add(anchors);
  grupo.userData.anchors = mapaAnchors;

  /* colisor: meia largura + 0.15 */
  ctx.COLISORES.push({ x: 0, z: 0, raio: MX + 0.15 });

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 2, tri: 781 }    /* MEDIDO: 757 no corpo + 24 no brilho */
  };
};

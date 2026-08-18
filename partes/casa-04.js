/* parteCasa04 — HOUSE-04, a casa NIVEL 4 (a mais detalhada das quatro) do
   Mundo da Sarinha. Casa dourada/mel de 3.6 x 3.6, parede 2.6, altura
   total 4.72 (ponta do pinaculo). Pivo no centro inferior (Y=0 = chao),
   frente = +Z.

   O QUE FAZ ELA SER "NIVEL 4" (ficha do Ivan):
     a) ALPENDRE coberto na frente, com 2 colunas que descem ATE O CHAO
     b) 3 janelas acesas com moldura grossa (2 na frente + 1 na lateral +X)
     c) 2 floreiras sob as janelas da frente, com folhagem verde
     d) janela CIRCULAR acesa no frontao, com aro dourado
     e) faixa horizontal de madeira separando a base da parede
   Mais: telhado de 4 aguas com beiral saliente, porta em arco com macaneta
   dourada, chamine, cantoneiras de madeira nas 4 quinas e 2 lampioes de
   parede ao lado da porta.

   CONTRATO: 2 draw calls. Malha 1 = corpo (MeshLambertMaterial,
   vertexColors + flatShading, tudo mesclado). Malha 2 = o que ACENDE
   (MeshBasicMaterial, vertexColors, DoubleSide) — vidros das 3 janelas,
   o olho-de-boi e os 2 lampioes. Nenhuma luz nova, nenhuma sombra de
   engine (a sombra e um disco pintado no chao), nenhuma textura.

   AS CONTAS QUE IMPORTAM (armadilhas ja pagas neste projeto):
   - Sem CSG nao existe vao afundado: TODO buraco (porta/janela) e feito
     por CAMADAS na frente da face da parede (FACE = 1.80). Ordem radial:
     caixilho 1.78..1.88 < vidro 1.895 < cruzeta 1.905..1.955 < moldura
     1.78..1.96. A moldura e sempre a peca mais saliente, o vidro fica
     ATRAS dela — e o olho le como recuo.
   - A moldura da porta e Shape com hole (Path), senao a chapa cheia tapa
     a porta.
   - Face vertical pega ~55% da luz neste rig de 2 luzes: a parede usa o
     pigmento 1 tom ACIMA do hex da ficha (PAREDE_V / CLARA_V) senao a
     casa fica marrom na tela.
   - fBase baixo (0.05-0.08) em parede alta, alto (0.10-0.16) em peca
     pequena — senao a parede escurece da cintura para baixo.
   - As colunas do alpendre: piso 0..0.12, base 0.12..0.28, fuste
     0.28..1.78, capitel 1.78..1.91, viga 1.91..2.05, telhadinho
     2.05..2.51. Nada flutua e nada bate no beiral do telhado grande
     (que comeca em 2.56 e so existe ate |z|=2.28; o telhadinho tem o
     pico em z=2.42, ja FORA da projecao do beiral).
*/
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCasa04 = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'casa04';

  /* ---------------- paleta da ficha ---------------- */
  var PAREDE = 0xffdba6, PAREDE_CLARA = 0xf8ead1;
  var TELHADO = 0xf2c069, TELHADO_MED = 0xe4ae4a, TELHADO_ESC = 0xc9972f;
  var MADEIRA = 0x8b6b3d, DOURADO = 0xf2b94b, DOURADO_CLARO = 0xffd98a;
  var VERDE = 0x6ebd73;
  var VIDRO = 0xffe49a, VIDRO_QUENTE = 0xffb83e;
  /* mesmos tons da ficha, 1 tom acima, so para as GRANDES faces verticais */
  var PAREDE_V = 0xffe7c0, CLARA_V = 0xfff2e0;

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

  /* o que ACENDE: mesma normalizacao de atributos da pinta (senao o merge
     do brilho devolve null), mas com miolo quente na altura f=0.35 */
  function acende(geo) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var minY = 1e9, maxY = -1e9, i, y;
    for (i = 0; i < n; i++) { y = pos.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    var cFrio = new T.Color(VIDRO), cQuente = new T.Color(VIDRO_QUENTE);
    for (i = 0; i < n; i++) {
      var f = (pos.getY(i) - minY) / faixa;
      var c = cFrio.clone().lerp(cQuente, Math.max(0, 1 - Math.abs(f - 0.35) * 2.1));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  /* ---------------- ajudantes de geometria ---------------- */
  function caixa(w, h, d, x, y, z) { return new T.BoxGeometry(w, h, d).translate(x, y, z); }
  /* telhado de 4 aguas: cone de 4 lados girado 45 graus vira piramide de
     base quadrada alinhada aos eixos; a meia-largura vira raio*cos(45) */
  function piramide(meiaW, meiaD, alt, x, yBase, z) {
    var g = new T.ConeGeometry(1, alt, 4);
    g.rotateY(Math.PI / 4);
    var k = Math.cos(Math.PI / 4);
    g.scale(meiaW / k, 1, meiaD / k);
    g.translate(x, yBase + alt / 2, z);
    return g;
  }

  var corpo = [], brilho = [];

  /* ---------------- medidas mestras ---------------- */
  var LARG = 3.6, MEIA = LARG / 2;          /* 1.80 = face da parede */
  var FACE = MEIA;                          /* plano da parede da frente (+Z) */
  var Y_BASE = 0.58;                        /* topo do embasamento */
  var Y_FAIXA = 0.74;                       /* topo da faixa de madeira */
  var Y_PAREDE = 2.66;                      /* topo da parede */
  var BEIRAL = 2.28;                        /* meia-largura do telhado (0.48 de beiral) */
  var Y_TELHADO = 2.56, ALT_TELHADO = 1.92; /* topo do telhado = 4.48 */
  var Y_TOPO = 4.72;                        /* ponta do pinaculo */

  /* ---------------- sombra pintada no chao ---------------- */
  corpo.push(pinta(new T.CircleGeometry(2.6, 12).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  /* ---------------- corpo: embasamento + faixa + parede ---------------- */
  corpo.push(pinta(caixa(LARG, Y_BASE, LARG, 0, Y_BASE / 2, 0), CLARA_V, 0.08));
  /* (e) faixa/moldura horizontal: um dedo mais larga que a parede */
  corpo.push(pinta(caixa(LARG + 0.14, Y_FAIXA - Y_BASE, LARG + 0.14, 0, (Y_BASE + Y_FAIXA) / 2, 0), MADEIRA, 0.14));
  corpo.push(pinta(caixa(LARG, Y_PAREDE - 0.70, LARG, 0, (0.70 + Y_PAREDE) / 2, 0), PAREDE_V, 0.05));

  /* cantoneiras de madeira nas 4 quinas (saem 0.04 da parede) */
  for (var qx = -1; qx <= 1; qx += 2) {
    for (var qz = -1; qz <= 1; qz += 2) {
      corpo.push(pinta(caixa(0.16, Y_PAREDE - Y_FAIXA, 0.16,
        qx * 1.76, (Y_FAIXA + Y_PAREDE) / 2, qz * 1.76), MADEIRA, 0.10));
    }
  }

  /* ---------------- telhado de 4 aguas + tabica + chamine ---------------- */
  /* tabica (a tabua da beira), um pouco menor que o beiral para o telhado
     sobrar por cima dela */
  corpo.push(pinta(caixa(4.44, 0.18, 4.44, 0, 2.49, 0), TELHADO_ESC, 0.12));
  corpo.push(pinta(piramide(BEIRAL, BEIRAL, ALT_TELHADO, 0, Y_TELHADO, 0), TELHADO, 0.18));
  /* pinaculo: dadinho + pontinha dourada (topo em 4.72) */
  corpo.push(pinta(caixa(0.24, 0.10, 0.24, 0, 4.45, 0), DOURADO, 0.12));
  corpo.push(pinta(piramide(0.16, 0.16, 0.24, 0, 4.48, 0), DOURADO_CLARO, 0.14));
  /* chamine em (-1.05,-0.95): ali a agua do telhado esta em y=3.60, entao
     o tubo sai de 2.93 (enterrado no telhado) e a tampa termina em 4.60 —
     ACIMA da cumeeira (4.48), senao a chamine some atras do telhado em
     quase todo angulo da camera do jogo (medido por raycast) */
  corpo.push(pinta(caixa(0.44, 1.52, 0.44, -1.05, 3.69, -0.95), PAREDE_CLARA, 0.16));
  corpo.push(pinta(caixa(0.58, 0.15, 0.58, -1.05, 4.525, -0.95), MADEIRA, 0.12));

  /* ---------------- (d) frontao + olho-de-boi aceso ----------------
     O frontao e um triangulo extrudado que avanca ate z=2.22; nesse plano
     a agua do telhado esta em y=2.61, logo o triangulo (apice 3.50) fura
     o telhado e sobra 0.89 de frontao visivel — espaco de sobra para a
     janela redonda de raio 0.30. */
  (function frontao() {
    var BASE_Y = 2.25, APICE_Y = 3.50, MEIA_F = 1.05, Z_FACE_F = 2.22;
    var s = new T.Shape();
    s.moveTo(-MEIA_F, BASE_Y);
    s.lineTo(MEIA_F, BASE_Y);
    s.lineTo(0, APICE_Y);
    var g = new T.ExtrudeGeometry(s, { depth: 0.92, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, Z_FACE_F - 0.92);
    corpo.push(pinta(g, PAREDE_V, 0.06));

    /* tabuas de beira do frontao, uma em cada agua */
    var ang = Math.atan2(APICE_Y - BASE_Y, MEIA_F);
    var comp = Math.sqrt(MEIA_F * MEIA_F + (APICE_Y - BASE_Y) * (APICE_Y - BASE_Y)) + 0.10;
    for (var s2 = -1; s2 <= 1; s2 += 2) {
      var b = new T.BoxGeometry(comp, 0.13, 0.16);
      b.rotateZ(-s2 * ang);
      b.translate(s2 * MEIA_F / 2, (BASE_Y + APICE_Y) / 2, Z_FACE_F);
      corpo.push(pinta(b, TELHADO_ESC, 0.10));
    }

    /* aro dourado (disco cheio) + vidro menor NA FRENTE dele: o anel de
       0.085 que sobra em volta e o aro que a ficha pede */
    var aro = new T.CylinderGeometry(0.30, 0.30, 0.12, 8);
    aro.rotateX(Math.PI / 2);
    aro.translate(0, 2.98, Z_FACE_F + 0.04);
    corpo.push(pinta(aro, DOURADO, 0.12));
    brilho.push(acende(new T.CircleGeometry(0.215, 8).translate(0, 2.98, Z_FACE_F + 0.115)));
  })();

  /* ---------------- (a) ALPENDRE: piso, 2 colunas, viga e telhadinho ----------------
     Colunas em x=+-0.86, z=2.86, do CHAO ate a viga. O telhadinho tem o
     pico em z=2.42 (fora da projecao do beiral, que so vai ate 2.28). */
  var COL_X = 0.86, COL_Z = 2.86, ALP_CZ = 2.42;
  corpo.push(pinta(caixa(2.30, 0.12, 1.55, 0, 0.06, 2.45), CLARA_V, 0.16));   /* piso/degrau */
  for (var c = -1; c <= 1; c += 2) {
    corpo.push(pinta(caixa(0.30, 0.16, 0.30, c * COL_X, 0.20, COL_Z), MADEIRA, 0.14));   /* base 0.12..0.28 */
    var fuste = new T.CylinderGeometry(0.095, 0.115, 1.50, 6);
    fuste.translate(c * COL_X, 1.03, COL_Z);                                              /* 0.28..1.78 */
    corpo.push(pinta(fuste, CLARA_V, 0.10));
    corpo.push(pinta(caixa(0.28, 0.13, 0.28, c * COL_X, 1.845, COL_Z), MADEIRA, 0.12));   /* capitel */
  }
  corpo.push(pinta(caixa(2.10, 0.14, 1.36, 0, 1.98, ALP_CZ), MADEIRA, 0.12));             /* viga 1.91..2.05 */
  corpo.push(pinta(piramide(1.14, 0.72, 0.46, 0, 2.05, ALP_CZ), TELHADO_MED, 0.16));      /* 2.05..2.51 */

  /* ---------------- porta em arco (moldura vazada + folha recuada) ----------------
     A moldura externa desce ate y=-0.10 do vao para o furo NAO encostar no
     contorno de fora (triangulacao com hole encostada da defeito). Esses
     0.10 ficam enterrados no piso do alpendre. */
  (function porta() {
    var Y_PORTA = 0.12, LARG_P = 0.84, RETO = 1.05, ALT_P = 1.66;
    function forma(m, y0) {
      var w2 = LARG_P / 2 + m, hs = RETO + m * 0.5, h = ALT_P + m;
      var s = new T.Shape();
      s.moveTo(-w2, y0);
      s.lineTo(w2, y0);
      s.lineTo(w2, hs);
      s.quadraticCurveTo(w2, h, 0, h);
      s.quadraticCurveTo(-w2, h, -w2, hs);
      return s;   /* o fechamento implicito ja e a lateral esquerda */
    }
    /* moldura: casca vazada, a peca MAIS saliente (1.78..1.96) */
    var fora = forma(0.11, -0.10);
    fora.holes.push(new T.Path(forma(0, 0).getPoints(5)));
    var mold = new T.ExtrudeGeometry(fora, { depth: 0.18, bevelEnabled: false, curveSegments: 5 });
    mold.translate(0, Y_PORTA, FACE - 0.02);
    corpo.push(pinta(mold, DOURADO, 0.10));
    /* folha da porta: chapa recuada 0.13 atras da frente da moldura */
    var folha = new T.ShapeGeometry(forma(0.015, 0), 5);
    folha.translate(0, Y_PORTA, FACE + 0.03);
    corpo.push(pinta(folha, MADEIRA, 0.16));
    /* 2 almofadas na folha (ainda atras da moldura) */
    corpo.push(pinta(caixa(0.62, 0.055, 0.03, 0, Y_PORTA + 0.55, FACE + 0.05), DOURADO_CLARO, 0.14));
    corpo.push(pinta(caixa(0.62, 0.055, 0.03, 0, Y_PORTA + 1.02, FACE + 0.05), DOURADO_CLARO, 0.14));
    /* macaneta dourada */
    var mac = new T.CylinderGeometry(0.05, 0.05, 0.07, 6);
    mac.rotateX(Math.PI / 2);
    mac.translate(0.26, Y_PORTA + 0.85, FACE + 0.07);
    corpo.push(pinta(mac, DOURADO, 0.10));
  })();

  /* ---------------- (b) janelas acesas com moldura grossa ----------------
     Montadas SEMPRE na parede da frente (+Z) e depois giradas em Y; a casa
     e quadrada (3.6 x 3.6), entao rotateY(PI/2) leva a peca inteira para a
     face +X sem nenhuma conta extra. */
  function janela(ang, cx, cy, w, h) {
    var p = [], mx = w / 2 + 0.055, my = h / 2 + 0.055;
    p.push(pinta(caixa(w + 0.08, h + 0.08, 0.10, cx, cy, FACE + 0.03), MADEIRA, 0.16));      /* caixilho 1.78..1.88 */
    var vidro = new T.PlaneGeometry(w, h).translate(cx, cy, FACE + 0.095);                   /* vidro 1.895 */
    p.push(pinta(caixa(0.055, h, 0.05, cx, cy, FACE + 0.13), DOURADO, 0.12));                /* cruzeta 1.905..1.955 */
    p.push(pinta(caixa(w, 0.055, 0.05, cx, cy, FACE + 0.13), DOURADO, 0.12));
    p.push(pinta(caixa(0.11, h + 0.22, 0.18, cx - mx, cy, FACE + 0.07), DOURADO, 0.10));     /* moldura 1.78..1.96 */
    p.push(pinta(caixa(0.11, h + 0.22, 0.18, cx + mx, cy, FACE + 0.07), DOURADO, 0.10));
    p.push(pinta(caixa(w + 0.22, 0.11, 0.18, cx, cy - my, FACE + 0.07), DOURADO, 0.10));
    p.push(pinta(caixa(w + 0.22, 0.11, 0.18, cx, cy + my, FACE + 0.07), DOURADO, 0.10));
    p.push(pinta(caixa(w + 0.34, 0.09, 0.22, cx, cy - my - 0.10, FACE + 0.06), MADEIRA, 0.14)); /* peitoril */
    for (var i = 0; i < p.length; i++) { if (ang) p[i].rotateY(ang); corpo.push(p[i]); }
    if (ang) vidro.rotateY(ang);
    brilho.push(acende(vidro));
  }
  var JX = 1.20, JY = 1.34, JW = 0.62, JH = 0.80;   /* x=1.20 deixa a cantoneira (1.68) livre */
  janela(0, -JX, JY, JW, JH);
  janela(0, JX, JY, JW, JH);
  janela(Math.PI / 2, -0.35, 1.42, JW, JH);         /* lateral +X, puxada 0.35 para a frente */

  /* ---------------- (c) floreiras sob as janelas da frente ---------------- */
  for (var f = -1; f <= 1; f += 2) {
    var fx = f * JX;
    corpo.push(pinta(caixa(0.84, 0.27, 0.32, fx, 0.575, FACE + 0.19), MADEIRA, 0.14));
    corpo.push(pinta(caixa(0.88, 0.07, 0.36, fx, 0.72, FACE + 0.19), DOURADO, 0.12));   /* borda */
    for (var d = -1; d <= 1; d++) {
      var folha2 = new T.BoxGeometry(0.20, 0.18, 0.20);
      folha2.rotateY(0.5 * d + 0.25);
      folha2.rotateZ(0.18 * d);
      folha2.translate(fx + d * 0.25, 0.82, FACE + 0.27);
      corpo.push(pinta(folha2, VERDE, 0.16));
    }
  }

  /* ---------------- lampioes de parede ao lado da porta (acendem) ---------------- */
  for (var L = -1; L <= 1; L += 2) {
    corpo.push(pinta(caixa(0.16, 0.06, 0.16, L * 0.72, 1.49, FACE + 0.08), DOURADO, 0.12));
    brilho.push(acende(caixa(0.12, 0.20, 0.12, L * 0.72, 1.36, FACE + 0.08)));
  }

  /* ---------------- 2 draw calls ---------------- */
  var malhaCorpo = new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malhaCorpo.name = 'casa04_corpo';
  grupo.add(malhaCorpo);
  var malhaBrilho = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
  malhaBrilho.name = 'casa04_brilho';
  grupo.add(malhaBrilho);

  /* ---------------- anchors ----------------
     FrontAnchor fica na BOCA DO ALPENDRE (z=3.30), nao na porta: e o ponto
     onde um caminho encosta na casa. Os outros 3 ficam na face da parede
     mais a folga do colisor (1.95). */
  var anchors = new T.Group();
  anchors.name = 'Anchors';
  var DEF = [
    { nome: 'TopAnchor', x: 0, y: Y_TOPO, z: 0 },
    { nome: 'FrontAnchor', x: 0, y: 0, z: 3.30 },
    { nome: 'LeftAnchor', x: -1.95, y: 0, z: 0 },
    { nome: 'RightAnchor', x: 1.95, y: 0, z: 0 },
    { nome: 'BackAnchor', x: 0, y: 0, z: -1.95 }
  ];
  var mapa = {};
  for (var k = 0; k < DEF.length; k++) {
    var o = new T.Object3D();
    o.name = DEF[k].nome;
    o.position.set(DEF[k].x, DEF[k].y, DEF[k].z);
    anchors.add(o);
    mapa[DEF[k].nome] = o;
  }
  grupo.add(anchors);
  grupo.userData.anchors = mapa;

  ctx.COLISORES.push({ x: 0, z: 0, raio: MEIA + 0.15 });

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 2, tri: 0 }   /* MEDIDO em three r147 headless: 997 tri (959 corpo + 38 brilho) */
  };
};

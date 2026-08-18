/* parteCasa02 — HOUSE-02: a casinha "nivel 2" do Mundo da Sarinha.
   Lilas/roxo, telhado piramidal de 4 aguas com beiral saliente, porta em
   ARCO com macaneta dourada e — a MARCA desta casa — uma JANELA REDONDA
   ACESA na frente, com aro dourado e cruzeta por cima do vidro.

   MEDIDAS (pivo no centro inferior; Y=0 e o chao; FRENTE = +Z):
     largura 3.2 (X) x profundidade 3.2 (Z), parede ate Y=2.40
     faixa do beiral 2.40 -> 2.52 (fascia que sobra 0.32 alem da parede)
     telhado piramidal 2.52 -> 4.05 · ponta dourada 3.88 -> 4.20
     ALTURA TOTAL = 4.20 exatos (a ponta dourada fecha a conta)

   ORCAMENTO DA FACHADA (o que decidiu as proporcoes): a parede tem so
   2.40 e precisa caber, em pilha e SEM encostar: rodape (0 -> 0.22),
   porta+moldura (0.20 -> 1.61), janela redonda (1.69 -> 2.37) e a faixa
   do beiral (2.40). Por isso a faixa do beiral fica EM CIMA da parede e
   nao mordendo o topo dela: se descesse, engolia a janela redonda.

   ANCHORS (Object3D nomeados no grupo 'Anchors' + grupo.userData.anchors):
     TopAnchor   (0, 4.20, 0)     ponta do telhado
     FrontAnchor (0, 0, 2.10)     no chao, a frente do degrau da porta
     LeftAnchor  (-1.95, 0, 0)    no chao, logo fora do beiral (1.92)
     RightAnchor (1.95, 0, 0)
     BackAnchor  (0, 0, -1.95)

   CONTRATO (partes/CONTRATO.md): 2 malhas / 2 draw calls — corpo Lambert
   mesclado (vertexColors + flatShading) e vidros MeshBasic. Nenhuma luz
   nova, nenhuma sombra de engine (a sombra e um disco pintado no chao),
   nenhuma textura, nada de material PBR, nada de brilho por material.
   Identificadores em ASCII puro.

   MEDIDO (node, three r147, fora do navegador): 2 draw calls, 564 tri
   (546 no corpo + 18 nos vidros), teto do contrato 800. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCasa02 = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'casa02';

  /* ---------- medidas mestras ---------- */
  var LARG = 3.2, PROF = 3.2;          /* caixa da parede */
  var MEIA = LARG / 2;                 /* 1.60 — face da parede em X e Z */
  var ALT_PAREDE = 2.4;
  var ALT_TOTAL = 4.2;
  var Y_FAIXA = 2.40, H_FAIXA = 0.12;  /* fascia do beiral: 2.40 -> 2.52 */
  var Y_TELHA = Y_FAIXA + H_FAIXA;     /* 2.52 — base da piramide */
  var Y_TOPO_TELHA = 4.05;             /* onde a piramide termina */
  /* ConeGeometry(r,h,4).rotateY(PI/4) vira uma PIRAMIDE de base quadrada
     com meia-largura = r*cos(45) = r*0.7071. Queremos 1.60 + 0.32 de
     beiral = 1.92 -> r = 1.92 / 0.7071 = 2.716. */
  var R_TELHA = 2.716;
  var MEIA_TELHA = R_TELHA * Math.SQRT1_2;              /* 1.92 — ponta do beiral */
  var FORA = Math.round((MEIA_TELHA + 0.03) * 100) / 100; /* 1.95 — onde ficam os anchors laterais */

  /* ---------- paleta da ficha, compensada ----------
     face VERTICAL recebe ~55% da luz neste rig de 2 luzes: parede e
     detalhes sobem ~1 tom acima do hex da ficha para nao "apagar". */
  var PAREDE_CLARA = 0xf2e0fb,   /* ficha #EBD2F7 — corpo da casa */
      PAREDE       = 0xc6c9df,   /* ficha #B8BBD2 — rodape e chamine */
      TELHADO      = 0xad82e2,   /* ficha #A174DA */
      TELHADO_ESC  = 0x8a6bc2,   /* ficha #7E60B5 — fascia do beiral */
      DETALHE      = 0x6a4fa1,   /* ficha #5E4591 — cantoneiras, frisos */
      PORTA_ESC    = 0x2e2740,   /* ficha #2E2740 — folha da porta (fica escura de proposito) */
      DOURADO      = 0xf2b94b,   /* ficha #F2B94B */
      DOURADO_CL   = 0xffd98a,   /* ficha #FFD98A */
      VIDRO        = 0xffe49a,   /* ficha #FFE49A */
      VIDRO_MIOLO  = 0xffb83e;   /* ficha #FFB83E */

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

  /* vidro redondo: miolo quente no centro, esfriando para a borda.
     USAR ANTES de transladar — le X/Y locais em torno da origem. */
  function chapaRadial(geo, corBorda, corMiolo, rMax) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var cB = new T.Color(corBorda), cM = new T.Color(corMiolo);
    for (var i = 0; i < n; i++) {
      var x = pos.getX(i), y = pos.getY(i);
      var d = Math.min(1, Math.sqrt(x * x + y * y) / rMax);
      var c = cM.clone().lerp(cB, Math.pow(d, 0.7));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  /* vidro quadrado: quente embaixo, claro em cima (parece luz de dentro) */
  function chapaGrad(geo, corBaixo, corCima) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var cA = new T.Color(corBaixo), cB = new T.Color(corCima);
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < n; i++) { var y = pos.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (i = 0; i < n; i++) {
      var c = cA.clone().lerp(cB, (pos.getY(i) - minY) / faixa);
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  var corpo = [];    /* tudo que e feltro (Lambert)  */
  var brilho = [];   /* so o que ACENDE (Basic)      */

  /* ---------- 1. sombra no chao (disco escuro pintado) ---------- */
  corpo.push(pinta(
    new T.CircleGeometry(2.1, 12).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xf4edde).lerp(CINZA, 0.30), 0.0));

  /* ---------- 2. corpo da casa ---------- */
  /* parede: fBase baixo (0.05) porque parede alta com fBase alto vira breu */
  corpo.push(pinta(new T.BoxGeometry(LARG, ALT_PAREDE, PROF).translate(0, ALT_PAREDE / 2, 0), PAREDE_CLARA, 0.05));
  /* rodape: 0 -> 0.22, sobra 0.08 alem da parede (meia = 1.68) — fica
     ATRAS da moldura da porta (que chega a z=1.72), entao nao a engole */
  corpo.push(pinta(new T.BoxGeometry(3.36, 0.22, 3.36).translate(0, 0.11, 0), PAREDE, 0.08));
  /* 4 cantoneiras nas quinas: 0.24 de lado, do topo do rodape (0.21) ao
     topo da parede (2.41); sobram 0.12 em X e Z, quebram a caixa lisa */
  for (var qx = -1; qx <= 1; qx += 2) {
    for (var qz = -1; qz <= 1; qz += 2) {
      corpo.push(pinta(new T.BoxGeometry(0.24, 2.20, 0.24).translate(qx * MEIA, 1.31, qz * MEIA), DETALHE, 0.10));
    }
  }

  /* ---------- 3. telhado piramidal + beiral ---------- */
  /* fascia do beiral: tronco de piramide 2.40 -> 2.52, largo em cima
     (2.716 = beiral cheio) e mais estreito embaixo (2.56) = tabua chanfrada */
  corpo.push(pinta(
    new T.CylinderGeometry(R_TELHA, 2.56, H_FAIXA, 4).rotateY(Math.PI / 4).translate(0, Y_FAIXA + H_FAIXA / 2, 0),
    TELHADO_ESC, 0.14));
  /* a piramide de 4 aguas: 2.52 -> 4.05 (altura 1.53) */
  var H_TELHA = Y_TOPO_TELHA - Y_TELHA;
  corpo.push(pinta(
    new T.ConeGeometry(R_TELHA, H_TELHA, 4).rotateY(Math.PI / 4).translate(0, Y_TELHA + H_TELHA / 2, 0),
    TELHADO, 0.10));
  /* ponta dourada: 3.88 -> 4.20, morde 0.17 do bico da piramide p/ nao dar fresta */
  corpo.push(pinta(new T.ConeGeometry(0.15, 0.32, 6).translate(0, 4.04, 0), DOURADO_CL, 0.14));

  /* ---------- 4. chamine ---------- */
  /* fica em (-0.82, -0.82); ali a agua do telhado esta em
     2.52 + (1 - 0.82/1.92) * 1.53 = 3.40, entao o tubo (2.07 -> 3.82)
     atravessa e sobra 0.42 de fora. A tampa fecha em 3.95 (< 4.05 do bico). */
  corpo.push(pinta(new T.BoxGeometry(0.36, 1.75, 0.36).translate(-0.82, 2.945, -0.82), PAREDE, 0.12));
  corpo.push(pinta(new T.BoxGeometry(0.50, 0.14, 0.50).translate(-0.82, 3.88, -0.82), TELHADO_ESC, 0.14));

  /* ---------- 5. PORTA EM ARCO (frente, +Z) ----------
     SEM CSG: o "recuo" e feito por CAMADAS na frente da parede (face em
     z=1.60). Moldura vazada mais saliente (1.57 -> 1.72), vao escuro
     atras dela (1.585 -> 1.635) e folha da porta entre os dois
     (1.635 -> 1.695). Tudo com z MAIOR que 1.60, senao some na parede. */
  var P_MEIA = 0.44, P_ALT = 1.28, P_ARCO = 0.40, P_Y = 0.22;
  function formaArco(dw, dh) {
    var s = new T.Shape();
    var w2 = P_MEIA + dw, h = P_ALT + dh, arc = P_ARCO + dh * 0.5;
    s.moveTo(-w2, 0);
    s.lineTo(w2, 0);
    s.lineTo(w2, h - arc);
    s.quadraticCurveTo(w2 * 0.92, h - arc * 0.22, 0, h);
    s.quadraticCurveTo(-w2 * 0.92, h - arc * 0.22, -w2, h - arc);
    s.closePath();
    return s;
  }
  /* moldura dourada VAZADA: Shape grande com o vao entrando como HOLE.
     (chapa cheia aqui taparia a porta inteira — armadilha ja paga) */
  var moldeP = formaArco(0.13, 0.13);
  /* getPoints(6) e nao (20): o Path do furo amostra TODAS as curvas do
     contorno, retas inclusive — com 20 o furo saia com ~100 pontos e a
     moldura sozinha custava 212 tri (medido). Com 6 caem para ~60. */
  moldeP.holes.push(new T.Path(formaArco(0.005, 0.005).getPoints(6)));
  corpo.push(pinta(
    new T.ExtrudeGeometry(moldeP, { depth: 0.15, bevelEnabled: false, curveSegments: 4 }).translate(0, P_Y - 0.02, 1.57),
    DOURADO, 0.12));
  /* vao escuro no fundo (a sombra de dentro da casa) */
  corpo.push(pinta(
    new T.ExtrudeGeometry(formaArco(0.005, 0.005), { depth: 0.05, bevelEnabled: false, curveSegments: 4 }).translate(0, P_Y, 1.585),
    PORTA_ESC, 0.0));
  /* folha da porta, 0.025 recuada em relacao a frente da moldura */
  corpo.push(pinta(
    new T.ExtrudeGeometry(formaArco(-0.03, -0.03), { depth: 0.06, bevelEnabled: false, curveSegments: 4 }).translate(0, P_Y + 0.01, 1.635),
    PORTA_ESC, 0.05));
  /* 2 frisos verticais (tabuas) para a porta escura nao virar mancha */
  for (var fx = -1; fx <= 1; fx += 2) {
    corpo.push(pinta(new T.BoxGeometry(0.045, 0.92, 0.04).translate(fx * 0.16, P_Y + 0.52, 1.70), DETALHE, 0.10));
  }
  /* macaneta dourada, na altura da mao (0.84) e a direita de quem olha */
  corpo.push(pinta(new T.SphereGeometry(0.07, 6, 4).translate(0.28, P_Y + 0.62, 1.73), DOURADO_CL, 0.14));
  /* degrau de entrada: 0 -> 0.18, avanca ate z=2.05 */
  corpo.push(pinta(new T.BoxGeometry(1.28, 0.18, 0.46).translate(0, 0.09, 1.82), PAREDE, 0.10));

  /* ---------- 6. A MARCA DA HOUSE-02: JANELA REDONDA ACESA ----------
     Centro em (0, 2.03, frente). Raio externo 0.34 => ocupa 1.69 -> 2.37,
     exatamente a folga entre o topo da moldura da porta (1.61) e a faixa
     do beiral (2.40). Empilhada em camadas para a frente, como a porta:
       fundo escuro 1.605 | tubo do aro 1.60->1.71 | vidro 1.685 |
       aro chato 1.715 | cruzeta 1.745  */
  var JR_Y = 2.03, JR_EXT = 0.34, JR_INT = 0.23, JR_VID = 0.265, JR_SEG = 16;
  /* fundo escuro: da profundidade ao buraco e evita halo claro na parede.
     raio 0.36 (nao 0.40) para o topo morrer em 2.39, ainda DENTRO da
     parede (2.40) — passando disso ele sumia atras da faixa do beiral */
  corpo.push(pinta(new T.CircleGeometry(0.36, JR_SEG).translate(0, JR_Y, 1.605), PORTA_ESC, 0.0));
  /* tubo do aro (cilindro fino de 16 lados, aberto, deitado no eixo Z):
     e ele que da ESPESSURA ao aro; um RingGeometry sozinho fica de papel */
  corpo.push(pinta(
    new T.CylinderGeometry(JR_EXT, JR_EXT, 0.11, JR_SEG, 1, true).rotateX(Math.PI / 2).translate(0, JR_Y, 1.655),
    DOURADO, 0.12));
  /* VIDRO ACESO (malha Basic): pintado antes de transladar, miolo quente */
  brilho.push(chapaRadial(new T.CircleGeometry(JR_VID, JR_SEG), VIDRO, VIDRO_MIOLO, JR_VID).translate(0, JR_Y, 1.685));
  /* aro chato na frente, cobrindo a borda do vidro (0.23 -> 0.34) */
  corpo.push(pinta(new T.RingGeometry(JR_INT, JR_EXT, JR_SEG).translate(0, JR_Y, 1.715), DOURADO_CL, 0.12));
  /* CRUZETA: 2 barrinhas cruzadas POR CIMA do vidro (z=1.745, na frente
     do aro em 1.715); 0.60 de ponta a ponta => a ponta cai em 0.30, ou
     seja EM CIMA do aro (0.23 -> 0.34), e a barra fica ancorada */
  corpo.push(pinta(new T.BoxGeometry(0.60, 0.065, 0.05).translate(0, JR_Y, 1.745), DOURADO_CL, 0.14));
  corpo.push(pinta(new T.BoxGeometry(0.065, 0.60, 0.05).translate(0, JR_Y, 1.745), DOURADO_CL, 0.14));

  /* ---------- 7. janela lateral quadrada ACESA (+X) ----------
     Mesma logica de camadas, agora empilhando em X (face da parede 1.60):
     moldura 1.58->1.69 | vidro 1.70 | divisor 1.72 */
  var JL_Y = 1.35;
  corpo.push(pinta(new T.BoxGeometry(0.11, 0.82, 0.82).translate(1.635, JL_Y, 0), DOURADO, 0.12));
  brilho.push(chapaGrad(new T.PlaneGeometry(0.56, 0.56).rotateY(Math.PI / 2), VIDRO_MIOLO, VIDRO).translate(1.70, JL_Y, 0));
  /* divisor comeca em 1.705 (e nao em 1.70) para a face de tras dele NAO
     ficar coplanar com o vidro — coplanar da z-fighting piscando */
  corpo.push(pinta(new T.BoxGeometry(0.05, 0.62, 0.065).translate(1.73, JL_Y, 0), DOURADO_CL, 0.14));
  /* peitoril logo abaixo do vao (base do vidro em 0.94) */
  corpo.push(pinta(new T.BoxGeometry(0.16, 0.10, 0.98).translate(1.66, 0.89, 0), DETALHE, 0.12));

  /* ---------- 8. as 2 malhas (2 draw calls) ---------- */
  var geoCorpo = BGU.mergeBufferGeometries(corpo);
  var geoBrilho = BGU.mergeBufferGeometries(brilho);
  var mCorpo = new T.Mesh(geoCorpo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mCorpo.name = 'Casa02Corpo';
  grupo.add(mCorpo);
  var mBrilho = new T.Mesh(geoBrilho, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
  mBrilho.name = 'Casa02Vidros';
  grupo.add(mBrilho);

  /* triangulos MEDIDOS (as geometrias saem nao-indexadas de pinta/chapa) */
  var TRI = (geoCorpo.attributes.position.count + geoBrilho.attributes.position.count) / 3;

  /* ---------- 9. colisor: metade da largura + 0.15 ---------- */
  ctx.COLISORES.push({ x: 0, z: 0, raio: MEIA + 0.15 });

  /* ---------- 10. ANCHORS ---------- */
  var anchors = new T.Group();
  anchors.name = 'Anchors';
  var DEF = [
    { nome: 'TopAnchor',   x: 0,     y: ALT_TOTAL, z: 0 },
    { nome: 'FrontAnchor', x: 0,     y: 0,         z: 2.10 },  /* a frente do degrau (que morre em 2.05) */
    { nome: 'LeftAnchor',  x: -FORA, y: 0,         z: 0 },     /* no chao, logo fora do beiral */
    { nome: 'RightAnchor', x: FORA,  y: 0,         z: 0 },
    { nome: 'BackAnchor',  x: 0,     y: 0,         z: -FORA }
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

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 2, tri: TRI }
  };
};

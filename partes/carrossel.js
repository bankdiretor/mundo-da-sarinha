/* PARQUE_BRINQUEDOS.carrossel - o CARROSSEL do Parque.
   O de verdade: plataforma redonda elevada, poste grosso no meio, TETO CONICO
   LISTRADO de 12 gomos (creme x rosa) com pinaculo dourado e estrelinha que
   brilha, festao de bolinhas douradas no beiral, 4 cavalinhos pendurados em
   barras douradas, 2 banquinhos e degrau de acesso na frente (+Z).

   Substitui o carrossel simplinho do parque.js (um disco com 3 bolinhas).

   PIVO: centro da base. Y=0 e o chao. Frente (degrau) em +Z.

   MEDIDO em node com three r147 real (build UMD + examples/js BufferGeometryUtils),
   nao chutado - numeros do medidor, nao do meu palpite:
     3 draw calls (1300 + 112 + 88) | 1.524 triangulos  [orcamento 3 / 1600]
     bbox  X -3.160..3.160 | Y 0.000..4.190 | Z -3.160..3.800
     menor Y = 0.000000  (o pe fixo e a soleira assentam no chao)
     diametro da plataforma 5.80 | beiral 6.20 | com o festao 6.32 | altura 4.19
     merge nao-null nas 3 malhas | 0 par coplanar | 0 triangulo degenerado
     girando 1.7 rad o raio do conjunto continua 3.116 (nada varre para fora)
     raycast com o material real (FrontSide) acerta o teto de cima em r=1.0/2.4/3.0,
     o forro visto de baixo e a saia do beiral -> nenhuma face virada ao contrario
     0 vertice do giro passa da plataforma na faixa 0.40<y<2.40 (nada pendurado no vazio)

   DESENHO DAS 3 DRAW CALLS
     1. malha do GIRO (Lambert) - plataforma, poste, teto, cavalos, bancos
     2. ESTRELA+FESTAO (Basic)  - o que "acende" (contrato: sem luz nova)
     3. malha FIXA    (Lambert) - pe da base + degrau
   O que gira mora no sub-grupo `giro`, entao `girar(t)` e uma linha so.

   ARMADILHAS DA SKILL QUE MORDERAM AQUI (e como saiu cada uma):
   [6/cone] nao usei ConeGeometry no teto: ela nasce com 1 triangulo degenerado
     por gomo E pintaria o cone inteiro de uma cor so. O teto e feito a mao, gomo
     a gomo, num perfil de sino de 5 aneis - assim cada listra e uma geometria
     propria com a sua cor, e o medidor confirma 0 degenerado.
   [4/coplanar] a 1a versao tinha 8 PARES nos dois degraus. Regra que ficou: peca
     que encosta AFUNDA na vizinha em vez de tangenciar - pe fixo 0.10 dentro da
     plataforma, banco 0.06, degrau de cima 0.05 dentro da soleira, friso do banco
     com a base escondida no encosto. Faixa e friso da borda saem 0.02/0.035.
   [13/cor] a compensacao tem SINAL e tem TETO. Subiu um tom o que e face VERTICAL
     (ouro da faixa/barra/colar F2B94B->FCC766; cavalo lilas C5A9E8->CBB4EA; azul
     9FB4D8->AEC1DE). NAO subiu o teto: os gomos olham para CIMA e pegam o sol
     cheio, entao o #F2789F da ficha e o que aparece na tela. O forro olha para
     BAIXO e so recebe a metade de CHAO da hemisferica (0x584a38): nem branco puro
     o clareia - compensei ate o limite e parei.
   [14/fBase] fita fina com degrade forte nao le como volume, le como encardido
     (faixa e friso cairam para 0.04-0.05); o tampo da plataforma e horizontal e
     foi para 0.0; a barriga do cavalo saiu preta com 0.14 e caiu para 0.08.
   [1,2/merge] toda geometria passa por `pinta` (nao-indexada, sem uv, com cor) -
     inclusive Octahedron/Tetrahedron, que nascem SEM indice e sozinhos derrubariam
     o merge para null em silencio.
   [16/namespace] namespace proprio: NAO entra em window.MUNDO_PARTES, senao o
     montarPartes() plantaria um carrossel solto no meio da praca.

   CONTRATO: sem luz nova, sem sombra de engine, sem textura, sem import,
   ASCII puro, Lambert com cor por vertice + flatShading no corpo. */
window.PARQUE_BRINQUEDOS = window.PARQUE_BRINQUEDOS || {};
window.PARQUE_BRINQUEDOS.carrossel = function (T) {
  var BGU = T.BufferGeometryUtils;

  var grupo = new T.Group();
  grupo.name = 'carrossel';
  var giro = new T.Group();               /* tudo que roda vive aqui dentro */
  giro.name = 'carrossel_giro';
  grupo.add(giro);

  /* ---------------- paleta (hex da ficha; ver nota [13] no cabecalho) ------- */
  var CREME      = 0xf6e4d2;   /* plataforma                                  */
  var CREME_PE   = 0xe7d3be;   /* pe fixo, na sombra da plataforma            */
  var CREME_DEG  = 0xefdac4;   /* degraus                                     */
  var CREME_POST = 0xfaeedf;   /* poste central                               */
  var DOURADO    = 0xf2b94b;   /* dourado da ficha (faces inclinadas/de cima) */
  var DOURADO_V  = 0xfcc766;   /* o mesmo ouro um tom ACIMA, para face vertical
                                  (faixa, barras, colares): parede em pe rende
                                  ~0.6 do pigmento no rig do mundo [arm. 13]  */
  var ROSA       = 0xf2789f;   /* friso e listra do teto                      */
  var TETO_CLARO = 0xfff3e8;   /* listra clara do teto                        */
  var FORRO      = 0xfff4e6;   /* forro: normal (0,-1,0) so pega a metade de
                                  CHAO da hemisferica; nem branco puro clareia
                                  mais que isso - compensa ate o teto e para   */
  var OURO_ESTRE = 0xffd35a;   /* estrelinha que brilha                       */

  /* ---------------- medidas mestras ---------------------------------------- */
  var R_PLAT    = 2.90;        /* raio da plataforma  -> diametro 5.80        */
  var Y_PLAT_B  = 0.10;        /* base da plataforma (flutua sobre o pe fixo) */
  var Y_PLAT_T  = 0.36;        /* piso onde a crianca anda                    */
  var R_PE      = 2.52;        /* pe fixo, mais estreito: da sombra e apoio   */
  var R_TETO    = 3.10;        /* beiral saliente                             */
  var Y_FORRO   = 2.45;        /* fundo do beiral = teto por dentro           */
  var Y_BEIRAL  = 2.61;        /* topo da saia do beiral                      */
  var Y_APICE   = 3.62;        /* ponta do cone                               */
  var R_MONTA   = 1.95;        /* raio onde ficam cavalos e bancos            */
  var N_GOMOS   = 12;          /* 12 listras: par, entao a alternancia fecha  */

  /* ---------------- a funcao `pinta` canonica do mundo --------------------- */
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

  var fixas = [];      /* nao gira: pe + degraus            */
  var moveis = [];     /* gira: plataforma, teto, cavalos   */
  var brilho = [];     /* MeshBasic: a estrelinha           */

  /* ======================= 1. BASE FIXA + DEGRAUS =========================== */
  (function base() {
    /* pe fixo: entra 0.10 dentro da plataforma, entao a tampa de cima some la
       dentro e nao forma par coplanar com o fundo da plataforma [arm. 4]. */
    var pe = new T.CylinderGeometry(R_PE, R_PE + 0.06, 0.20, 16);
    pe.translate(0, 0.10, 0);
    fixas.push(pinta(pe, CREME_PE, 0.16));

    /* degrau de acesso na FRENTE (+Z), em dois niveis.
       [defeito que eu mesmo achei] a 1a versao eram duas caixas encostadas z a z:
       o medidor acusou 8 PARES COPLANARES - as duas tinham fundo em y=0 e a mesma
       largura, entao fundo com fundo e lateral com lateral ficavam no mesmo plano
       na faixa em que se cruzavam. Agora o degrau de baixo e UMA soleira larga
       (1.44 x 0.84) e o de cima POUSA DENTRO dela: fundo em y=0.05 (escondido),
       0.07 mais estreito de cada lado e 0.02 a frente do costado. Zero pares. */
    var d1 = new T.BoxGeometry(1.44, 0.12, 0.84);          /* soleira: z 2.96..3.80 */
    d1.translate(0, 0.06, 3.38);
    fixas.push(pinta(d1, CREME_DEG, 0.14));
    var d2 = new T.BoxGeometry(1.30, 0.25, 0.42);          /* pisada: z 2.98..3.40  */
    d2.translate(0, 0.175, 3.19);                          /* y 0.05 .. 0.30        */
    fixas.push(pinta(d2, CREME_DEG, 0.12));
  })();

  /* ======================= 2. PLATAFORMA ==================================== */
  (function plataforma() {
    /* costado + fundo + TAMPO EM 12 GOMOS (o mesmo ritmo do teto no chao).
       Custa os mesmos 96 triangulos de um CylinderGeometry fechado - a tampa
       de cima do cilindro seria 24 triangulos de UMA cor so; aqui os mesmos 24
       viram 12 fatias alternadas e o piso deixa de ser um disco lavado. */
    var lado = new T.CylinderGeometry(R_PLAT, R_PLAT, Y_PLAT_T - Y_PLAT_B, 24, 1, true);
    lado.translate(0, (Y_PLAT_T + Y_PLAT_B) / 2, 0);
    moveis.push(pinta(lado, CREME, 0.10));
    var fundo = new T.CircleGeometry(R_PLAT, 24);
    fundo.rotateX(Math.PI / 2);                            /* olha para baixo    */
    fundo.translate(0, Y_PLAT_B, 0);
    moveis.push(pinta(fundo, CREME_PE, 0.10));
    for (var w = 0; w < 12; w++) {
      var v = [];
      for (var k = 0; k < 2; k++) {                        /* 2 fatias por gomo  */
        var a0 = ((w * 2 + k) / 24) * Math.PI * 2, a1 = ((w * 2 + k + 1) / 24) * Math.PI * 2;
        v.push(0, Y_PLAT_T, 0,
               Math.sin(a0) * R_PLAT, Y_PLAT_T, Math.cos(a0) * R_PLAT,
               Math.sin(a1) * R_PLAT, Y_PLAT_T, Math.cos(a1) * R_PLAT);
      }
      var gt = new T.BufferGeometry();
      gt.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
      gt.computeVertexNormals();
      /* fBase 0: disco horizontal com degrade sai escuro justo na face que a
         crianca mais ve [arm. 14] */
      moveis.push(pinta(gt, (w % 2 === 0) ? CREME : 0xf7ccd9, 0.0));
    }

    /* faixa dourada da borda: cilindro aberto, 0.02 saliente sobre a casca.
       fBase BAIXO de proposito: uma fita de 13 cm com degrade forte nao le como
       volume, le como encardido - foi o que o render acusou na 1a versao. */
    var faixa = new T.CylinderGeometry(R_PLAT + 0.02, R_PLAT + 0.02, 0.13, 24, 1, true);
    faixa.translate(0, 0.195, 0);
    moveis.push(pinta(faixa, DOURADO_V, 0.05));

    /* friso rosa logo acima, 0.035 saliente (folga de 0.015 para a faixa) */
    var friso = new T.CylinderGeometry(R_PLAT + 0.035, R_PLAT + 0.035, 0.045, 24, 1, true);
    friso.translate(0, 0.302, 0);
    moveis.push(pinta(friso, 0xf98ab0, 0.04));
  })();

  /* ======================= 3. POSTE CENTRAL ================================= */
  (function poste() {
    var p = new T.CylinderGeometry(0.30, 0.34, 2.24, 10);
    p.translate(0, 1.40, 0);                               /* y 0.28 .. 2.52     */
    moveis.push(pinta(p, CREME_POST, 0.13));
    /* dois colares dourados: cilindros cheios; a tampa fica dentro do poste e
       so aparece o anel em volta - de graca e le como serralheria de parque. */
    [0.45, 2.30].forEach(function (y) {
      var col = new T.CylinderGeometry(0.375, 0.375, 0.16, 10);
      col.translate(0, y, 0);
      moveis.push(pinta(col, DOURADO_V, 0.06));
    });
  })();

  /* ======================= 4. TETO CONICO LISTRADO ==========================
     Feito gomo a gomo. Perfil de SINO: inclinacao 26 graus junto do pinaculo
     caindo para 13 graus no beiral - e isso que separa "carrossel" de "chapeu
     de bruxa". A saia vertical no fim (2 triangulos) da espessura ao beiral. */
  var PERFIL = [
    [0.00, Y_APICE],   /* apice                        */
    [0.70, 3.28],
    [1.55, 3.00],
    [2.42, 2.77],
    [R_TETO, Y_BEIRAL],/* beiral                       */
    [R_TETO, Y_FORRO]  /* saia vertical do beiral      */
  ];
  (function teto() {
    function P(r, y, a) { return [r * Math.sin(a), y, r * Math.cos(a)]; }
    for (var g = 0; g < N_GOMOS; g++) {
      var a0 = (g / N_GOMOS) * Math.PI * 2, a1 = ((g + 1) / N_GOMOS) * Math.PI * 2;
      var v = [];
      function tri(p, q, s) { v.push(p[0], p[1], p[2], q[0], q[1], q[2], s[0], s[1], s[2]); }
      for (var i = 0; i < PERFIL.length - 1; i++) {
        var rA = PERFIL[i][0], yA = PERFIL[i][1], rB = PERFIL[i + 1][0], yB = PERFIL[i + 1][1];
        var A0 = P(rA, yA, a0), A1 = P(rA, yA, a1), B0 = P(rB, yB, a0), B1 = P(rB, yB, a1);
        tri(A0, B0, B1);                       /* ordem A0,B0,B1 = normal p/ fora */
        if (rA > 1e-6) tri(A0, B1, A1);        /* no apice A0==A1: so 1 triangulo */
      }
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
      geo.computeVertexNormals();
      moveis.push(pinta(geo, (g % 2 === 0) ? TETO_CLARO : ROSA, 0.06));
    }
    /* forro: disco virado para BAIXO, fechando o teto por dentro. Sem ele o
       cone e casca de uma face so e a crianca ve o ceu por dentro do teto. */
    var forro = new T.CircleGeometry(R_TETO, 24);
    forro.rotateX(Math.PI / 2);                /* +Z -> -Y : olha para baixo     */
    forro.translate(0, Y_FORRO, 0);
    moveis.push(pinta(forro, FORRO, 0.05));

    /* festao: 12 bolinhas douradas na costura de cada gomo.
       [defeito que eu mesmo achei] na 1a versao elas eram Lambert e sairam
       MARROM-ESCURO no render com a luz real do jogo: bolinha pendurada no
       beiral so mostra a barriga, e face virada para baixo so pega a metade
       de CHAO da hemisferica (0x584a38). Dourado x marrom = sujeira. Foram
       para a malha MeshBasic (a mesma da estrela, entao NAO custa draw call):
       viraram as lampadinhas do beiral, que e o que um carrossel tem mesmo. */
    for (var b = 0; b < N_GOMOS; b++) {
      var ab = (b / N_GOMOS) * Math.PI * 2;
      var bol = new T.OctahedronGeometry(0.105, 0);
      bol.scale(1, 0.92, 1);
      bol.translate(Math.sin(ab) * 3.055, 2.525, Math.cos(ab) * 3.055);
      brilho.push(pinta(bol, 0xffd98a, 0.0));
    }
  })();

  /* ======================= 5. PINACULO + ESTRELA ============================ */
  (function pinaculo() {
    var bolota = new T.OctahedronGeometry(0.155, 0);
    bolota.translate(0, Y_APICE + 0.09, 0);
    moveis.push(pinta(bolota, DOURADO, 0.16));
    var haste = new T.CylinderGeometry(0.045, 0.055, 0.24, 6);
    haste.translate(0, Y_APICE + 0.26, 0);                 /* y 3.76 .. 4.00     */
    moveis.push(pinta(haste, DOURADO, 0.14));

    /* estrela de 5 pontas em DUAS chapas cruzadas (le de qualquer angulo) e
       material DoubleSide - 16 triangulos e nenhuma luz nova [contrato]. */
    function chapaEstrela(rOut, rIn) {
      var s = new T.Shape();
      for (var i = 0; i < 10; i++) {
        var r = (i % 2 === 0) ? rOut : rIn;
        var a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        var x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
      }
      s.closePath();
      return new T.ShapeGeometry(s);
    }
    var e1 = chapaEstrela(0.19, 0.08);
    var e2 = chapaEstrela(0.19, 0.08);
    e2.rotateY(Math.PI / 2);
    [e1, e2].forEach(function (g) {
      g.translate(0, Y_APICE + 0.38, 0);      /* centro 4.00, ponta 4.19 = altura */
      brilho.push(pinta(g, OURO_ESTRE, 0.0)); /* fBase 0 = cor chapada, sem degrade */
    });
  })();

  /* ======================= 6. CAVALINHOS ====================================
     Corpo de barril hexagonal (peito mais gordo que a garupa), pescoco inclinado,
     cabeca + focinho, 2 orelhas, crina, rabo, 4 perninhas em galope e sela.
     Nariz para +X no local; depois rotateY(ang) poe o bicho de frente para a
     tangente, que e exatamente o sentido em que o carrossel anda. */
  function cavalo(yBase, corCorpo, corCrina, corSela) {
    var g = [];
    function Y(v) { return yBase + v; }

    var corpo = new T.CylinderGeometry(0.21, 0.245, 0.92, 6);
    corpo.rotateZ(Math.PI / 2);          /* eixo no X: topo->garupa, base->peito */
    corpo.rotateX(Math.PI / 6);          /* uma face do hexagono virada p/ cima  */
    corpo.translate(0, Y(0.62), 0);
    g.push(pinta(corpo, corCorpo, 0.08));   /* barriga saia preta com fBase alto */

    var pesc = new T.BoxGeometry(0.22, 0.52, 0.26);
    pesc.rotateZ(-0.55);                 /* sobe inclinado para a frente         */
    pesc.translate(0.40, Y(0.94), 0);
    g.push(pinta(pesc, corCorpo, 0.14));

    var cab = new T.BoxGeometry(0.34, 0.22, 0.22);
    cab.rotateZ(0.28);
    cab.translate(0.67, Y(1.18), 0);
    g.push(pinta(cab, corCorpo, 0.13));

    var foc = new T.BoxGeometry(0.16, 0.16, 0.18);
    foc.rotateZ(0.28);
    foc.translate(0.86, Y(1.10), 0);
    g.push(pinta(foc, corCorpo, 0.13));

    [-1, 1].forEach(function (s) {       /* orelhas: tetraedro (4 tri cada)      */
      var or = new T.TetrahedronGeometry(0.075, 0);
      or.rotateY(0.6);
      or.translate(0.55, Y(1.33), s * 0.075);
      g.push(pinta(or, corCorpo, 0.12));
    });

    var crina = new T.BoxGeometry(0.11, 0.60, 0.17);
    crina.rotateZ(-0.55);
    crina.translate(0.31, Y(1.01), 0);
    g.push(pinta(crina, corCrina, 0.12));

    var rabo = new T.BoxGeometry(0.15, 0.36, 0.15);
    rabo.rotateZ(1.25);                  /* aponta para tras e um pouco p/ cima  */
    rabo.translate(-0.56, Y(0.83), 0);
    g.push(pinta(rabo, corCrina, 0.13));

    function perna(x, z, ang) {
      var p = new T.BoxGeometry(0.14, 0.58, 0.14);
      p.translate(0, -0.29, 0);          /* pivo no ombro, nao no casco [arm.10] */
      p.rotateZ(ang);
      p.translate(x, Y(0.51), z);
      return pinta(p, corCorpo, 0.11);
    }
    [-1, 1].forEach(function (s) {
      g.push(perna(0.30, s * 0.13, 0.72));    /* dianteiras esticadas p/ frente */
      g.push(perna(-0.30, s * 0.13, -0.82));  /* traseiras esticadas p/ tras    */
    });

    var sela = new T.BoxGeometry(0.32, 0.13, 0.42);
    sela.translate(0, Y(0.89), 0);
    g.push(pinta(sela, corSela, 0.15));
    return g;
  }

  var CAVALOS = [
    { ang: Math.PI * 0.25, y: 0.70, corpo: 0xf6a9c0, crina: 0xfff3e8, sela: DOURADO },
    { ang: Math.PI * 0.75, y: 0.94, corpo: 0xcbb4ea, crina: 0xfff3e8, sela: DOURADO },
    { ang: Math.PI * 1.25, y: 0.70, corpo: 0xaec1de, crina: 0xfff3e8, sela: DOURADO },
    { ang: Math.PI * 1.75, y: 0.94, corpo: 0xf6e4d2, crina: 0xf2789f, sela: DOURADO }
  ];
  CAVALOS.forEach(function (c) {
    var pecas = cavalo(c.y, c.corpo, c.crina, c.sela);
    pecas.forEach(function (geo) {
      geo.rotateY(c.ang);                                  /* olha para a tangente */
      geo.translate(Math.sin(c.ang) * R_MONTA, 0, Math.cos(c.ang) * R_MONTA);
      moveis.push(geo);
    });
    /* barra dourada: do fundo da plataforma ate atravessar o forro */
    var barra = new T.CylinderGeometry(0.045, 0.045, 2.48, 6);
    barra.translate(Math.sin(c.ang) * R_MONTA, 1.54, Math.cos(c.ang) * R_MONTA);
    moveis.push(pinta(barra, DOURADO_V, 0.08));              /* y 0.30 .. 2.78      */
  });

  /* ======================= 7. BANQUINHOS ====================================
     Duas carruagens baixinhas nos lados (+X e -X), afundadas 0.06 na plataforma
     para nao gerar par coplanar com o piso [arm. 4]. */
  [Math.PI * 0.5, Math.PI * 1.5].forEach(function (ang) {
    var g = [];
    var saia = new T.BoxGeometry(0.80, 0.34, 0.56);
    saia.translate(0, 0.47, 0);                            /* y 0.30 .. 0.64      */
    g.push(pinta(saia, CREME, 0.14));
    var assento = new T.BoxGeometry(0.94, 0.13, 0.68);
    assento.translate(0, 0.685, 0);                        /* y 0.62 .. 0.75      */
    g.push(pinta(assento, 0xf6a9c0, 0.12));
    var encosto = new T.BoxGeometry(0.94, 0.42, 0.13);
    encosto.translate(-0.30, 0.92, 0);                     /* y 0.71 .. 1.13      */
    g.push(pinta(encosto, 0xf6a9c0, 0.12));
    /* [defeito que eu mesmo achei] so com essas 3 caixas o banco lia como
       GELADEIRA no render em close. O friso dourado de coroamento (mais largo e
       mais fundo que o encosto, com a base escondida dentro dele) quebra o bloco
       e amarra o banco na mesma serralheria dourada do resto do carrossel. */
    var rail = new T.BoxGeometry(0.99, 0.07, 0.17);
    rail.translate(-0.30, 1.145, 0);                       /* fundo dentro do encosto */
    g.push(pinta(rail, DOURADO_V, 0.06));
    g.forEach(function (geo) {
      geo.rotateY(ang);
      geo.translate(Math.sin(ang) * R_MONTA, 0, Math.cos(ang) * R_MONTA);
      moveis.push(geo);
    });
    var barra = new T.CylinderGeometry(0.04, 0.04, 2.48, 6);
    barra.rotateY(ang);
    barra.translate(Math.sin(ang) * (R_MONTA - 0.40), 1.54, Math.cos(ang) * (R_MONTA - 0.40));
    moveis.push(pinta(barra, DOURADO_V, 0.08));
  });

  /* ======================= montagem: 3 draw calls =========================== */
  var matCorpo = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var matBrilho = new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide });

  var geoFixa = BGU.mergeBufferGeometries(fixas);
  var malhaFixa = new T.Mesh(geoFixa, matCorpo);
  malhaFixa.name = 'carrossel_fixo';
  grupo.add(malhaFixa);

  var geoGiro = BGU.mergeBufferGeometries(moveis);
  var malhaGiro = new T.Mesh(geoGiro, matCorpo);
  malhaGiro.name = 'carrossel_giro_malha';
  giro.add(malhaGiro);

  var geoBrilho = BGU.mergeBufferGeometries(brilho);
  var malhaBrilho = new T.Mesh(geoBrilho, matBrilho);
  malhaBrilho.name = 'carrossel_estrela';
  giro.add(malhaBrilho);

  /* ======================= API para o mundo ================================ */
  var VELOCIDADE = 0.38;                 /* rad/s ~= 3.6 voltas por minuto      */
  function girar(t) { giro.rotation.y = t * VELOCIDADE; }

  grupo.userData.raio = R_PLAT;
  grupo.userData.raioTeto = R_TETO;
  grupo.userData.altura = 4.190;
  grupo.userData.alturaPlataforma = Y_PLAT_T;
  grupo.userData.embarque = { x: 0, z: 3.30 };             /* pe do degrau, +Z    */
  grupo.userData.colisor = { x: 0, z: 0, raio: 2.95 };     /* o host empurra aqui */
  grupo.userData.eixoGiro = giro;                          /* controle direto     */
  grupo.userData.girar = girar;

  return {
    grupo: grupo,
    custo: { dc: 3, tri: 1524 },
    girar: girar,
    update: function (t) { girar(t); }
  };
};

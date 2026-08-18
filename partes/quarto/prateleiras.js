/* QUARTO_MOVEIS.prateleiras - as DUAS PRATELEIRAS DE PAREDE com os enfeites
   (itens 18,19,21,22,23,27,28,29,30 da ficha do quarto da menina).

   Duas taboas de madeira clara presas na parede por maos-francesas
   (suportes triangulares), uma acima da outra e DESLOCADAS: a de baixo
   puxa para a esquerda, a de cima para a direita. Juntas ocupam a
   largura toda sem virar um "degrau" simetrico.

     prateleira de CIMA  (topo em Y=1.10, x de -0.10 a +1.20)
       - ESTRELA LUMINOSA amarela num pezinho de madeira (a unica peca
         que ACENDE: malha 2, MeshBasicMaterial)
       - moldura de quadro pequena com CORACAO rosa
     prateleira de BAIXO (topo em Y=0.55, x de -1.20 a +0.45)
       - planta pendente: vaso claro + cascata de folhas caindo pela
         BORDA DA FRENTE (e ela que ocupa o vao debaixo da prateleira)
       - casinha decorativa (branca, telhado rosa, portinha)
       - dois ursinhos sentados lado a lado
       - pilha de 4 livros deitados + o ursinho menor sentado em cima

   MEDIDAS: cabe na caixa de 2.40 (X) x 0.34 (Z) x 1.30 (Y) pedida na
   ficha - a largura bate exata (2.400) e nada passa de 0.321 em Z nem
   de 1.296 em Y.
   PIVO: Y=0 e a BASE do conjunto (nao o chao do quarto); X=0 e o meio da
   largura; Z=0 e a PAREDE e a peca cresce para +Z. No quartinho.js ela
   entra com rot=Math.PI na parede do fundo, entao o +Z local vira o
   miolo do quarto.
   ATENCAO de quem for posicionar: entre Y=0 e Y=0.188 nao ha geometria
   nenhuma (o vao debaixo da prateleira de baixo, onde so passa a ponta
   da planta pendente). Isso e proposital - Y=0 e a referencia de
   montagem que a ficha pediu, nao o chao do movel.

   CONTRATO: 2 draw calls, sem luz, sem sombra de engine, sem textura,
   sem material PBR, ASCII puro, sem import. Malha 1 = Lambert com cor
   por vertice + flatShading; malha 2 = Basic (a estrela).

   --- decisoes que valem a pena registrar ---
   [cor] Quarto CLARO (piso creme, parede lilas): o hex da ficha entra
     SEM subir de tom e o volume vem do fBase (0.10-0.18). Subir pigmento
     aqui lava a peca, como ja aconteceu na poltrona.
   [z-fighting] Nada de face colada em face. Toda peca que "senta" numa
     superficie plana AFUNDA de 0.010 a 0.020 dentro dela (livro na
     taboa, telhado na casinha, suporte na prateleira, porta na parede
     da casinha). Bola em cima de taboa nao precisa: contato de esfera e
     tangente, nao e plano contra plano. Os fundos (Z=0) das duas taboas
     dividem o mesmo plano da parede, mas nunca na mesma faixa de altura,
     entao nao se sobrepoem; ja os suportes ficam em Z=0.006 justamente
     para nao cair no plano das taboas.
   [silhueta] Peca vista de perto: cada enfeite ganhou o minimo de bolas
     que ainda le como o que e (ursinho = corpo, cabeca, 2 orelhas,
     focinho claro, 2 bracos, 2 pernas, olhos e nariz). Detalhe menor que
     isso some; maior que isso estoura o orcamento.
   [brilho] A estrela nao usa cor de emissao nem luz: ela e Basic (cor
     cheia, sem sombreamento) e ganha uma AUREOLA de octogono palido
     atras (0.03 de folga) mais 3 faiscas soltas. Num quarto Lambert
     isso le como "acesa". A aureola desce por tras da taboa de cima e
     e cortada por ela - de proposito, e o que faz o brilho parecer
     nascer da prateleira.
   [medido] montada em Node com three r147 de verdade: 2 draw calls,
     784 triangulos (728 no corpo + 56 no brilho), nenhum merge nulo,
     nenhum triangulo degenerado e ZERO par de faces coplanares
     sobrepostas com folga menor que 0.005. Caixa real: 2.400 x 1.108 x
     0.321, de Y=0.188 (ponta da planta pendente) a Y=1.296 (aureola). */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};
window.QUARTO_MOVEIS.prateleiras = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'prateleiras';

  /* ---------- paleta (hex da ficha, sem subir tom) ---------- */
  var MADEIRA = 0xd9a66c,        /* taboa da prateleira (ficha) */
      MADEIRA_SUP = 0xc9915a,    /* mao-francesa: madeira um pouco mais funda */
      ESTRELA = 0xffd35a,        /* estrela luminosa (ficha) */
      ESTRELA_AURA = 0xfff2c0,   /* aureola/faiscas */
      URSO = 0xc9a37a,           /* pelucia (ficha) */
      URSO_CLARO = 0xdcbb98,     /* orelha e focinho */
      OLHO = 0x4a3524,
      CASA = 0xf7f0e4,           /* casinha branca */
      TELHADO = 0xe8a7b2,        /* telhado rosa */
      PORTA = 0xd07f96,
      VASO = 0xf0e0c8,
      FOLHA = 0x7fc08a,          /* folhagem (ficha) */
      FOLHA_ESC = 0x6cae7a,
      LIVRO_ROSA = 0xe8a7b2,
      LIVRO_LILAS = 0xb9a0dc,
      LIVRO_VERDE = 0x8fc79c,
      LIVRO_CREME = 0xf4edde,
      MOLDURA = 0xe8c8a0,
      PAINEL = 0xfdf7ec,
      CORACAO = 0xef8fae;

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

  var corpo = [];    /* malha 1: tudo que recebe luz */
  var brilho = [];   /* malha 2: so o que acende */
  function poe(geo, cor, f) { corpo.push(pinta(geo, cor, f)); return geo; }

  /* MEDIDO no r147: ConeGeometry nasce com 1 triangulo DEGENERADO por
     gomo (a ponta colapsada vira area zero). Eram 28 triangulos pagos e
     invisiveis - poda tira antes de mesclar. Devolve nao-indexada, sem
     uv, com normal: e o mesmo formato que `pinta` entrega, senao o
     mergeBufferGeometries volta null. */
  function poda(geo) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    var pos = geo.attributes.position, n = pos.count, guarda = [], i;
    for (i = 0; i < n; i += 3) {
      var ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i);
      var bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1);
      var cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2);
      var ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * nx + ny * ny + nz * nz < 1e-18) continue;
      guarda.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(guarda, 3));
    g.computeVertexNormals();
    return g;
  }

  /* solta uma lista {g,c,f} montada na origem: gira em Y e leva ao lugar */
  function solta(lista, x, y, z, giro) {
    for (var i = 0; i < lista.length; i++) {
      var g = lista[i].g;
      if (giro) g.rotateY(giro);
      g.translate(x, y, z);
      corpo.push(pinta(g, lista[i].c, lista[i].f));
    }
  }

  /* ============================================================
     AS DUAS TABOAS
     ============================================================ */
  var Y_ALTA = 1.10, Y_BAIXA = 0.55;     /* topo de cada taboa */
  var ESP_A = 0.055, ESP_B = 0.060;      /* espessura */
  var LARG_A = 1.30, LARG_B = 1.65;      /* de -0.10 a 1.20 / de -1.20 a 0.45 */
  var CX_A = 0.55, CX_B = -0.375;
  var PROF_A = 0.25, PROF_B = 0.28;      /* a folga ate 0.34 e da planta pendente */

  var taboaA = new T.BoxGeometry(LARG_A, ESP_A, PROF_A);
  taboaA.translate(CX_A, Y_ALTA - ESP_A / 2, PROF_A / 2);
  poe(taboaA, MADEIRA, 0.14);

  var taboaB = new T.BoxGeometry(LARG_B, ESP_B, PROF_B);
  taboaB.translate(CX_B, Y_BAIXA - ESP_B / 2, PROF_B / 2);
  poe(taboaB, MADEIRA, 0.14);

  /* mao-francesa: prisma triangular (8 triangulos) encostado na parede.
     O topo entra 0.012 DENTRO da taboa - encostar rente faria as duas
     faces horizontais brigarem por pixel. */
  function suporte(bx, yTopo, prof, alt, esp) {
    var f = new T.Shape();
    f.moveTo(0, 0); f.lineTo(prof, 0); f.lineTo(0, -alt);
    var g = new T.ExtrudeGeometry(f, { depth: esp, bevelEnabled: false, steps: 1, curveSegments: 1 });
    g.rotateY(-Math.PI / 2);          /* o triangulo passa a viver no plano ZY */
    g.translate(bx + esp / 2, yTopo, 0.006);
    return g;
  }
  poe(suporte(-1.00, Y_BAIXA - ESP_B + 0.012, 0.19, 0.15, 0.050), MADEIRA_SUP, 0.12);
  poe(suporte(0.26, Y_BAIXA - ESP_B + 0.012, 0.19, 0.15, 0.050), MADEIRA_SUP, 0.12);
  poe(suporte(0.10, Y_ALTA - ESP_A + 0.012, 0.17, 0.13, 0.045), MADEIRA_SUP, 0.12);
  poe(suporte(1.02, Y_ALTA - ESP_A + 0.012, 0.17, 0.13, 0.045), MADEIRA_SUP, 0.12);

  /* ============================================================
     URSINHOS - y=0 local e a superficie onde ele senta
     ============================================================ */
  function urso(s, completo) {
    var L = [], i, d, m, R;
    var c = new T.SphereGeometry(0.082 * s, 6, completo ? 4 : 3);
    c.scale(1.00, 0.92, 0.90);
    c.translate(0, 0.066 * s, 0);
    L.push({ g: c, c: URSO, f: 0.17 });

    var cab = new T.SphereGeometry(0.062 * s, 6, 3);
    cab.translate(0, 0.168 * s, 0.006 * s);
    L.push({ g: cab, c: URSO, f: 0.13 });

    /* ORELHA e FOCINHO: uma esfera de 6x2 e uma BIPIRAMIDE - vista de
       lado ela e um espeto. A primeira renderizacao entregou dois
       chifres e um bico de passaro. A correcao que nao custa triangulo
       e virar o eixo dos polos para a CAMERA (rotateX) e achatar nesse
       eixo: o que sobra de frente e o hexagono do equador, ou seja, um
       disco redondo. Meia orelha fica enterrada na cabeca. */
    for (i = -1; i <= 1; i += 2) {
      var ore = new T.SphereGeometry(0.028 * s, 6, 2);
      ore.rotateX(Math.PI / 2);
      ore.scale(1.00, 0.90, 0.50);
      ore.translate(i * 0.045 * s, 0.204 * s, 0.004 * s);
      L.push({ g: ore, c: URSO_CLARO, f: 0.14 });
    }

    var foc = new T.SphereGeometry(0.030 * s, 6, 2);
    foc.rotateX(Math.PI / 2);
    foc.scale(1.15, 0.82, 0.72);
    foc.translate(0, 0.148 * s, 0.050 * s);
    L.push({ g: foc, c: URSO_CLARO, f: 0.10 });

    /* olhos: disquinho a 0.007 ACIMA da casca da cabeca (a regra da folga
       de 0.005). Menos que isso e a bolinha pisca dentro da cabeca. */
    var dirs = [[-0.34, 0.20, 0.92], [0.34, 0.20, 0.92]];
    for (i = 0; i < 2; i++) {
      d = dirs[i];
      m = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      R = 0.062 * s + 0.007;
      var olho = new T.CircleGeometry(0.010 * s, 6);
      olho.translate(d[0] / m * R, 0.168 * s + d[1] / m * R, 0.006 * s + d[2] / m * R);
      L.push({ g: olho, c: OLHO, f: 0.0 });
    }

    if (completo) {
      var nar = new T.CircleGeometry(0.009 * s, 6);
      nar.translate(0, 0.152 * s, 0.050 * s + 0.030 * 0.72 * s + 0.008);
      L.push({ g: nar, c: OLHO, f: 0.0 });

      /* so as PATAS da frente, e com 3 fatias de altura (24 triangulos):
         de qualquer angulo elas precisam ler como bolinha, e a versao de
         12 saia em forma de losango. Os bracos laterais foram cortados -
         a ficha pede corpo, cabeca, orelha e focinho, e eles viravam
         duas asas pontudas. O que eles custavam pagou estas patas. */
      for (i = -1; i <= 1; i += 2) {
        var per = new T.SphereGeometry(0.031 * s, 6, 3);
        per.scale(1.00, 0.72, 1.35);
        per.translate(i * 0.042 * s, 0.015 * s, 0.060 * s);
        L.push({ g: per, c: URSO, f: 0.16 });
      }
    }
    return L;
  }

  /* os dois sentados lado a lado, virados um para o outro de leve */
  solta(urso(1.00, true), -0.46, Y_BAIXA, 0.145, 0.16);
  solta(urso(0.94, true), -0.22, Y_BAIXA, 0.140, -0.20);

  /* ============================================================
     CASINHA DECORATIVA
     ============================================================ */
  var casa = new T.BoxGeometry(0.170, 0.130, 0.150);
  casa.translate(-0.76, Y_BAIXA - 0.010 + 0.065, 0.140);
  poe(casa, CASA, 0.15);
  /* piramide de 4 aguas; entra 0.020 na caixa (o beiral fica de fora) */
  var telha = new T.ConeGeometry(0.135, 0.085, 4);
  telha.rotateY(Math.PI / 4);
  telha.translate(-0.76, Y_BAIXA - 0.010 + 0.130 - 0.020 + 0.0425, 0.140);
  poe(poda(telha), TELHADO, 0.13);
  /* portinha: 0.012 enfiada na parede e o pe ENTERRADO na taboa. Na
     primeira medicao ela nascia exatamente no fundo da casinha (folga
     zero, duas faces brigando); agora a base dela fica 0.010 abaixo do
     fundo da caixa e 0.020 abaixo do topo da prateleira. */
  var porta = new T.BoxGeometry(0.052, 0.096, 0.024);
  porta.translate(-0.76, 0.578, 0.140 + 0.075);
  poe(porta, PORTA, 0.10);

  /* ============================================================
     PLANTA PENDENTE - a cascata desce PELA FRENTE da taboa (z>0.28),
     e o unico enfeite que ocupa o vao debaixo da prateleira.
     ============================================================ */
  var vaso = new T.CylinderGeometry(0.052, 0.038, 0.075, 6);
  vaso.translate(-1.03, Y_BAIXA - 0.010 + 0.0375, 0.130);
  poe(vaso, VASO, 0.13);

  /* duas bolas achatadas tapam a boca do vaso. A segunda vem GIRADA 0.55
     rad: sem isso os gomos das duas (6 segmentos, mesmo passo de 60 graus)
     ficam paralelos e a 0.0006 um do outro - foi o par que a medicao
     pegou piscando aqui. Girar fora do passo mata a coplanaridade. */
  var mata1 = new T.SphereGeometry(0.048, 6, 2);
  mata1.scale(1.00, 0.45, 1.00);
  mata1.translate(-1.035, 0.620, 0.128);
  poe(mata1, FOLHA, 0.14);
  var mata2 = new T.SphereGeometry(0.038, 6, 2);
  mata2.scale(1.00, 0.50, 1.00);
  mata2.rotateY(0.55);
  mata2.rotateZ(0.16);
  mata2.translate(-1.006, 0.650, 0.150);
  poe(mata2, FOLHA_ESC, 0.14);

  /* cada folha e um cone de 3 lados (6 triangulos) apontando para baixo */
  /* O passo vertical (0.054) e MENOR que a folha (0.075) de proposito:
     na primeira renderizacao elas ficaram encostando so na ponta e a
     cascata virou bandeirinha de festa junina. Com sobreposicao vira
     galho. Quem passa pela faixa de altura da taboa (0.49 a 0.55) fica
     obrigatoriamente com z > 0.285, ou seja, POR FORA da borda da
     frente - a folha nao atravessa a madeira. */
  var FOLHAS = [
    [-1.046, 0.600, 0.240, 2.60, 0.30],
    [-1.060, 0.548, 0.306, 3.00, -0.20],
    [-1.050, 0.494, 0.310, 3.10, 0.25],
    [-1.064, 0.440, 0.302, 2.95, -0.30],
    [-1.048, 0.386, 0.306, 3.05, 0.20],
    [-1.062, 0.332, 0.300, 3.00, -0.25],
    [-1.050, 0.278, 0.304, 3.10, 0.15],
    [-1.058, 0.224, 0.298, 2.92, -0.18],
    [-0.988, 0.560, 0.308, 2.80, 0.35],
    [-0.994, 0.512, 0.310, 3.00, -0.22]
  ];
  for (var fi = 0; fi < FOLHAS.length; fi++) {
    var F = FOLHAS[fi];
    var folha = new T.ConeGeometry(0.025, 0.075, 3);
    folha.rotateX(F[3]);
    folha.rotateZ(F[4]);
    folha.translate(F[0], F[1], F[2]);
    poe(poda(folha), fi % 2 ? FOLHA_ESC : FOLHA, 0.14);
  }

  /* ============================================================
     PILHA DE LIVROS DEITADOS (cada um afunda 0.010 no de baixo)
     ============================================================ */
  var LIVROS = [
    [0.210, 0.032, 0.145, 0.535, LIVRO_ROSA, 0.06],
    [0.196, 0.028, 0.136, 0.557, LIVRO_LILAS, -0.05],
    [0.202, 0.026, 0.142, 0.575, LIVRO_VERDE, 0.10],
    [0.176, 0.030, 0.126, 0.591, LIVRO_CREME, -0.03]
  ];
  for (var li = 0; li < LIVROS.length; li++) {
    var B = LIVROS[li];
    var livro = new T.BoxGeometry(B[0], B[1], B[2]);
    livro.rotateY(B[5]);
    livro.translate(0.140, B[3] + B[1] / 2, 0.145);
    poe(livro, B[4], 0.13);
  }
  /* o ursinho menor sentado no alto da pilha */
  solta(urso(0.62, false), 0.140, 0.620, 0.150, -0.38);

  /* ============================================================
     MOLDURA COM CORACAO (prateleira de cima)
     ============================================================ */
  (function quadro() {
    var L = [];
    var chapa = new T.BoxGeometry(0.155, 0.185, 0.016);
    L.push({ g: chapa, c: MOLDURA, f: 0.14 });
    /* As tres pecas do quadro sao chapas paralelas - o lugar mais facil
       do mundo para piscar. Na primeira medicao o fundo do coracao caiu
       EXATAMENTE no plano do painel (folga 0.000). O eixo Z foi entao
       resolvido no papel, face a face:
         chapa   -0.008 .. +0.008
         painel   0.000 .. +0.020
         coracao +0.014 .. +0.026
       nenhuma distancia entre faces paralelas fica abaixo de 0.006. */
    var painel = new T.BoxGeometry(0.115, 0.140, 0.020);
    painel.translate(0, 0.004, 0.010);
    L.push({ g: painel, c: PAINEL, f: 0.08 });

    var h = new T.Shape();
    h.moveTo(0, -0.045);
    h.lineTo(0.045, 0.010); h.lineTo(0.038, 0.040); h.lineTo(0.018, 0.048);
    h.lineTo(0, 0.030);
    h.lineTo(-0.018, 0.048); h.lineTo(-0.038, 0.040); h.lineTo(-0.045, 0.010);
    var cor = new T.ExtrudeGeometry(h, { depth: 0.012, bevelEnabled: false, steps: 1, curveSegments: 1 });
    cor.translate(0, 0.006, 0.014);
    L.push({ g: cor, c: CORACAO, f: 0.12 });

    for (var i = 0; i < L.length; i++) {
      L[i].g.rotateX(-0.09);          /* encostada para tras, como quadro em pe */
      L[i].g.rotateY(-0.20);
      L[i].g.translate(0.18, Y_ALTA - 0.004 + 0.0925, 0.115);
      corpo.push(pinta(L[i].g, L[i].c, L[i].f));
    }
  })();

  /* ============================================================
     ESTRELA LUMINOSA (malha 2) + o pezinho de madeira (malha 1)
     ============================================================ */
  /* pezinho baixo de proposito: cada centimetro dele empurrava a
     aureola para fora do teto de 1.30 de altura do conjunto */
  var pe = new T.BoxGeometry(0.055, 0.030, 0.055);
  pe.translate(0.88, Y_ALTA - 0.012 + 0.015, 0.115);
  poe(pe, MADEIRA_SUP, 0.12);

  var RE = 0.090, RI = 0.042;
  var forma = new T.Shape();
  for (var p = 0; p < 10; p++) {
    var raio = (p % 2 === 0) ? RE : RI;
    var ang = Math.PI / 2 + p * Math.PI / 5;
    var px = Math.cos(ang) * raio, py = Math.sin(ang) * raio;
    if (p === 0) forma.moveTo(px, py); else forma.lineTo(px, py);
  }
  /* sem closePath: o ExtrudeGeometry fecha sozinho (fechar na mao
     duplicaria o primeiro ponto e criaria aresta degenerada) */
  var estrela = new T.ExtrudeGeometry(forma, {
    depth: 0.032, bevelEnabled: false, steps: 1, curveSegments: 1
  });
  /* as duas pontas de baixo ficam 0.010 dentro do pezinho */
  var yEstrela = Y_ALTA - 0.012 + 0.030 - 0.010 + 0.809 * RE;
  estrela.translate(0.88, yEstrela, 0.099);
  brilho.push(pinta(estrela, ESTRELA, 0.16));

  /* aureola: octogono palido 0.030 ATRAS da estrela */
  var aura = new T.CircleGeometry(0.115, 8);
  aura.translate(0.88, yEstrela, 0.069);
  brilho.push(pinta(aura, ESTRELA_AURA, 0.10));

  /* faiscas soltas em volta */
  var FAISCAS = [[0.742, 1.258, 0.140, 0.016], [1.006, 1.228, 0.130, 0.013], [0.962, 1.132, 0.150, 0.011]];
  for (var si = 0; si < FAISCAS.length; si++) {
    var S = FAISCAS[si];
    var faisca = new T.TetrahedronGeometry(S[3], 0);
    faisca.translate(S[0], S[1], S[2]);
    brilho.push(pinta(faisca, ESTRELA_AURA, 0.18));
  }

  /* ---------- DC 1: o corpo ---------- */
  var malha = new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'prateleiras_malha';
  grupo.add(malha);

  /* ---------- DC 2: o que acende ---------- */
  var malhaBrilho = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true }));
  malhaBrilho.name = 'prateleiras_brilho';
  grupo.add(malhaBrilho);

  return { grupo: grupo, custo: { dc: 2, tri: 784 } };
};

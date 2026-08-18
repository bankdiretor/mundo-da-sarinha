/* caixaBrinquedos — a CAIXA DE BRINQUEDOS do quarto da Sarinha
   (itens 36, 37 e 38 da ficha: caixote lilas com estrela + blocos transbordando).

   Caixote quadrado 0.85 x 0.85, altura 0.62, pivo no CENTRO DA BASE (Y=0 e o
   chao) e frente em +Z. Parede de espessura visivel (0.055), borda superior
   mais clara e saliente, quatro quinas chanfradas, uma ESTRELA DOURADA
   estampada em cada uma das 4 faces e 8 brinquedos transbordando por cima
   (3 bolas, 1 cilindro deitado, 1 cubo azul, 1 bloco rosa, 1 bloco creme e
   1 cilindrinho verde), todos em angulos diferentes — a bagunca e o charme.

   Namespace proprio (QUARTO_MOVEIS), assinatura function(T): o interior nao
   recebe o ctx do mundo. Sem luz, sem sombra de engine, sem textura, sem
   Standard, sem modulo externo: UMA malha so, Lambert + cor por vertice + flatShading
   sobre geometrias mescladas. 1 draw call.

   Armadilhas ja pagas neste projeto e respeitadas aqui:
   - mergeBufferGeometries devolve null se os atributos nao baterem — TODA peca
     passa por `pinta`, que normaliza indice e apaga o uv antes de mesclar.
   - estrela coplanar com a face pisca (z-fighting) — cada estrela e extrudada
     0.022 e assentada NA superficie da face, ficando saliente, nunca rente.
   - o mesmo cuidado vale para o resto: os puxadores entram 0.006 na parede e
     saem 0.020; corpo e borda se sobrepoem 0.01 em Y (nada de face colada). */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};
window.QUARTO_MOVEIS.caixaBrinquedos = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'caixaBrinquedos';

  /* ---------- paleta ----------
     Hex da ficha mantidos como estao. A face vertical pega ~55% da luz neste
     rig de 2 luzes, entao a compensacao aqui NAO foi feita mexendo no pigmento
     (isso trairia a referencia) e sim no fBase: as paredes usam 0.10 e a borda
     0.08, o minimo que ainda da volume sem lavar a cor. */
  var LILAS = 0xa78bc9,        /* faces da caixa */
      BORDA = 0xc0a6de,        /* borda superior, mais clara */
      DENTRO = 0x6b5590,       /* penumbra do fundo falso (a caixa parece cheia) */
      PUXADOR = 0x7e63ad,      /* alca lateral, lilas escurecido = "recorte" */
      OURO = 0xffd35a,         /* a estrela — marca da peca */
      BOLA_ROSA = 0xf2789f, BOLA_AZUL = 0x7fb4e8, BOLA_AMARELA = 0xffd35a,
      CIL_AMARELO = 0xf2c069, CUBO_AZUL = 0x6f9fd8, BLOCO_ROSA = 0xf2789f,
      BLOCO_CREME = 0xf4edde, BLOCO_VERDE = 0xa9ce8e;

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

  var pecas = [];

  /* ---------- medidas (item 36) ----------
     MEIA  = meia-largura externa (0.85 de lado)
     ESP   = espessura da parede que a crianca ve na borda
     CHANFRO = quanto cada quina e "cortada" em X e em Z */
  var MEIA = 0.425, ESP = 0.055, ALT = 0.62, CHANFRO = 0.07;
  var Y_BORDA = 0.545;              /* onde a borda clara comeca */

  /* ---------- o caixote, em duas faixas de altura ----------
     Uma faixa = 4 paredes + 4 postes de quina girados 45 graus. Os postes sao
     dimensionados para encostar EXATAMENTE na quina das paredes (o canto do
     poste cai em x = H), entao a quina fica chanfrada de verdade: nada sobra
     para fora e nao existe par de faces coplanares para brigar no z-buffer. */
  function faixaCaixa(y0, y1, ext, cor, fBase) {
    var H = MEIA + ext;             /* face externa desta faixa */
    var esp = ESP + ext * 2;        /* a borda cresce para fora E para dentro */
    var h = y1 - y0, cy = (y0 + y1) / 2;
    var vao = 2 * (H - CHANFRO);    /* parede reta entre duas quinas */
    var cw = H - esp / 2;           /* centro da parede */
    var g, i;

    g = new T.BoxGeometry(vao, h, esp); g.translate(0, cy, cw);  pecas.push(pinta(g, cor, fBase));
    g = new T.BoxGeometry(vao, h, esp); g.translate(0, cy, -cw); pecas.push(pinta(g, cor, fBase));
    g = new T.BoxGeometry(esp, h, vao); g.translate(cw, cy, 0);  pecas.push(pinta(g, cor, fBase));
    g = new T.BoxGeometry(esp, h, vao); g.translate(-cw, cy, 0); pecas.push(pinta(g, cor, fBase));

    /* quinas: o poste aponta a profundidade (Z local) para a diagonal do canto */
    var PROF = 0.10;
    var cq = H - CHANFRO / 2 - (PROF / 2) * Math.SQRT1_2;
    var QUINAS = [
      [1, 1, Math.PI / 4], [1, -1, 3 * Math.PI / 4],
      [-1, -1, -3 * Math.PI / 4], [-1, 1, -Math.PI / 4]
    ];
    for (i = 0; i < 4; i++) {
      g = new T.BoxGeometry(CHANFRO * Math.SQRT2, h, PROF);
      g.rotateY(QUINAS[i][2]);
      g.translate(QUINAS[i][0] * cq, cy, QUINAS[i][1] * cq);
      pecas.push(pinta(g, cor, fBase));
    }
  }
  faixaCaixa(0, Y_BORDA + 0.01, 0, LILAS, 0.10);      /* corpo (invade 0.01 a borda) */
  faixaCaixa(Y_BORDA, ALT, 0.012, BORDA, 0.08);       /* borda clara e saliente */

  /* ---------- fundo falso (item 38: a caixa tem que parecer CHEIA) ----------
     Nao existe fundo la embaixo: uma laje logo abaixo da borda tampa o vazio,
     entao quem olha de cima ve penumbra e brinquedos, nunca uma caixa oca.
     Economiza geometria e ainda serve de "chao" para as bolas descansarem. */
  var fundo = new T.BoxGeometry(0.72, 0.05, 0.72);
  fundo.translate(0, 0.50, 0);
  pecas.push(pinta(fundo, DENTRO, 0.10));

  /* ---------- ESTRELA em cada uma das 4 faces (item 37) ----------
     Extrudada 0.022 e assentada NA face (base rente a superficie, ponta para
     fora): saliente de verdade, nunca coplanar. fBase baixo porque a estrela
     e um carimbo dourado — tem que ler como luz, nao como volume. */
  function formaEstrela(rOut, rIn) {
    var shape = new T.Shape(), passo = Math.PI / 5, i, r, ang;
    for (i = 0; i < 10; i++) {
      r = (i % 2 === 0) ? rOut : rIn;
      ang = i * passo + Math.PI / 2;          /* primeira ponta para cima */
      if (i === 0) shape.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else shape.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    shape.closePath();
    return shape;
  }
  var Y_ESTRELA = 0.27, SALIENTE = 0.022;
  var FACES = [
    { rot: 0, x: 0, z: MEIA },                 /* frente (+Z) */
    { rot: Math.PI, x: 0, z: -MEIA },          /* costas */
    { rot: Math.PI / 2, x: MEIA, z: 0 },       /* direita */
    { rot: -Math.PI / 2, x: -MEIA, z: 0 }      /* esquerda */
  ];
  for (var f = 0; f < FACES.length; f++) {
    var est = new T.ExtrudeGeometry(formaEstrela(0.175, 0.075), {
      depth: SALIENTE, bevelEnabled: false, curveSegments: 1
    });
    est.rotateY(FACES[f].rot);
    est.translate(FACES[f].x, Y_ESTRELA, FACES[f].z);
    pecas.push(pinta(est, OURO, 0.05));
  }

  /* ---------- alcas laterais (o "opcional barato") ----------
     Barra escura entre a estrela e a borda: entra 0.006 na parede e sai 0.020,
     entao le como recorte de mao sem custar recorte de geometria. */
  var px;
  px = new T.BoxGeometry(0.026, 0.062, 0.26); px.translate(MEIA + 0.007, 0.485, 0);
  pecas.push(pinta(px, PUXADOR, 0.10));
  px = new T.BoxGeometry(0.026, 0.062, 0.26); px.translate(-(MEIA + 0.007), 0.485, 0);
  pecas.push(pinta(px, PUXADOR, 0.10));

  /* ---------- BRINQUEDOS TRANSBORDANDO (item 38) ----------
     8 pecas entre y 0.60 e 0.85: a base de cada uma some atras da borda (0.62)
     e o topo aparece — le como caixa cheia demais. Nenhum angulo se repete e
     nenhuma cor vizinha e igual; e essa mistura que faz o charme, nao a
     contagem. Esferas com 7 segmentos (facetadas, no estilo feltro do mundo). */
  function bola(r, larg, altSeg, x, y, z, giro, cor) {
    var g = new T.SphereGeometry(r, larg, altSeg);
    g.rotateY(giro);
    g.translate(x, y, z);
    pecas.push(pinta(g, cor, 0.14));
  }
  bola(0.135, 7, 5, -0.175, 0.665, 0.135, 0.4, BOLA_ROSA);
  bola(0.125, 7, 5, 0.115, 0.715, 0.245, 1.1, BOLA_AZUL);   /* a mais alta, na frente */
  bola(0.105, 7, 4, 0.245, 0.630, -0.115, 2.0, BOLA_AMARELA);

  /* cilindro amarelo DEITADO e torto */
  var cil = new T.CylinderGeometry(0.10, 0.10, 0.30, 8);
  cil.rotateZ(Math.PI / 2);
  cil.rotateY(0.55);
  cil.translate(-0.130, 0.615, -0.200);
  pecas.push(pinta(cil, CIL_AMARELO, 0.14));

  /* blocos: cada um com um par de giros diferente */
  function bloco(lado, x, y, z, ry, rx, cor) {
    var g = new T.BoxGeometry(lado, lado, lado);
    g.rotateY(ry); g.rotateX(rx);
    g.translate(x, y, z);
    pecas.push(pinta(g, cor, 0.14));
  }
  bloco(0.185, 0.245, 0.660, 0.060, 0.60, 0.32, CUBO_AZUL);
  bloco(0.155, -0.260, 0.635, -0.060, -0.45, 0.28, BLOCO_ROSA);   /* debrucado na borda */
  bloco(0.135, 0.020, 0.600, -0.285, 0.90, -0.35, BLOCO_CREME);

  /* cilindrinho verde em pe, so para quebrar a paleta da caixa */
  var cil2 = new T.CylinderGeometry(0.062, 0.062, 0.15, 6);
  cil2.rotateX(0.20);
  cil2.translate(-0.020, 0.665, -0.020);
  pecas.push(pinta(cil2, BLOCO_VERDE, 0.14));

  /* ---------- 1 draw call ---------- */
  var malha = new T.Mesh(BGU.mergeBufferGeometries(pecas),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'caixabrinquedos_malha';
  grupo.add(malha);

  return { grupo: grupo, custo: { dc: 1, tri: 618 } };
};

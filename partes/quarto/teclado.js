/* teclado - o TECLADO MUSICAL do quarto da Sarinha (item 13 da ficha).
   E o objeto-simbolo do quarto: a Sarinha e cantora, entao o teclado e a
   primeira coisa que o olho tem que achar quando a porta abre.

   Piano digital infantil ROSA sobre suporte em X de metal claro. Duas malhas:
   corpo Lambert (mesclado, cor por vertice) + telinha/nota/botoes em
   MeshBasic (acendem sem luz nova, como manda o CONTRATO).

   ANATOMIA (de baixo para cima):
     pes -> X de cada lado -> travessa do meio -> trilhos de apoio
     -> caixa rosa com a frente inclinada -> leito escuro das teclas
     -> 15 teclas brancas + 10 pretas (cadencia real: 2 e 3)
     -> testeiras rosa nas pontas -> painel traseiro rosa escuro
     -> partitura clara apoiada nele com a NOTA dourada -> botoes coloridos

   MEDIDAS (medidas na malha pronta, nao no projeto): 1.300 (X) x 0.420 (Z) x
   0.752 de altura; topo das teclas em 0.620; menor Y = 0.00000.
   PIVO: centro da base, Y=0 e o chao. As teclas olham para +Z (quem toca
   senta no pufe em +Z).

   CUSTO MEDIDO: 2 draw calls, 554 triangulos (468 no corpo + 86 no brilho).

   ARMADILHAS RESPEITADAS (todas conferidas por auditoria automatica, nao no
   olho - a busca por faces coplanares sobrepostas fecha em ZERO pares):
   - as teclas pretas cruzam as brancas POR DENTRO e ainda sobram 5mm atras
     delas; a tecla afunda 2mm na tampa; o painel e recuado 5mm da traseira e
     das laterais da caixa; as duas fitas de cada X correm desencontradas.
   - `pinta` normaliza indice e apaga uv em toda peca, senao
     mergeBufferGeometries devolve null calado.
   - a frente inclinada e um cisalhamento do Box (12 tris, sem peca extra);
     por isso as normais sao recalculadas na mao depois de mexer no vertice.
     O SENTIDO da inclinacao foi escolhido pela luz, nao pelo gosto - ver o
     comentario de inclinaFrente.
   - sem sombra pintada no chao: o piso do quarto ainda nao existe e um
     tapete de cor errada e pior que nenhum. */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};
window.QUARTO_MOVEIS.teclado = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'teclado';

  /* ---------- paleta ---------- */
  var ROSA = 0xf2789f,          /* corpo */
      ROSA_ESCURO = 0xe0648c,   /* painel traseiro */
      LEITO = 0x9c4f70,         /* fundo escuro por baixo das teclas */
      BRANCA = 0xfff6f8,        /* tecla branca */
      PRETA = 0x4a3b52,         /* tecla preta */
      METAL = 0xc9c4d8,         /* suporte em X */
      METAL_PE = 0xb3adc6,      /* pes (um tom abaixo, para assentar) */
      DOURADO = 0xffd35a,       /* nota musical */
      TELA = 0xfdeff6,          /* partitura */
      BOTAO_AZUL = 0x8fc7e8,
      BOTAO_VERDE = 0xa8dfa0;

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

  /* ---------- ajudantes ---------- */
  /* caixa posicionada pelo centro */
  function caixa(lx, ly, lz, x, y, z) {
    var g = new T.BoxGeometry(lx, ly, lz);
    g.translate(x, y, z);
    return g;
  }
  /* cisalha a metade da frente do Box (ainda centrado na origem): o TOPO recua
     `recuo` e a base fica na frente, entao a face frontal deita para TRAS
     subindo e a normal dela aponta para frente e para CIMA.
     MEDIDO no rig do jogo (hemisferica 0.9 + direcional 0.55 vinda de 10,18,6):
       face virada para baixo (a inclinacao ao contrario) = 35% da luz do topo -> vinho sujo
       face vertical                                      = 57%
       esta, virada para cima                             = 75% -> le como o mesmo rosa
     Foi por isso que a frente inclina neste sentido, e nao no outro. */
  function inclinaFrente(geo, alt, recuo) {
    var pos = geo.attributes.position, i, f;
    for (i = 0; i < pos.count; i++) {
      if (pos.getZ(i) > 0) {
        f = (pos.getY(i) + alt / 2) / alt;          /* 0 na base, 1 no topo */
        pos.setZ(i, pos.getZ(i) - recuo * Math.max(0, Math.min(1, f)));
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();                      /* mexeu no vertice, refaz a normal */
    return geo;
  }
  /* barra do X: caixa alinhada em Y, girada no plano ZY e levada ao meio.
     E uma FITA CHATA (fina em X, larga no plano do X), como o suporte de
     verdade. Nao e so estetica: das quatro faces compridas da barra, duas sao
     verticais (57% da luz) e duas ficam inclinadas - a inclinada para baixo
     recebe 35% e some. Deixando a barra fina em X, essa face vira um fio de
     24mm em vez de um poste escuro. */
  function barraX(x, z0, y0, z1, y1, largX, esp) {
    var dz = z1 - z0, dy = y1 - y0;
    var comp = Math.sqrt(dy * dy + dz * dz) + esp;   /* sobra para fechar as pontas */
    var g = new T.BoxGeometry(largX, comp, esp);
    g.rotateX(Math.atan2(dz, dy));
    g.translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
    return g;
  }

  var corpo = [], brilho = [];

  /* ============ SUPORTE EM X ============ */
  var LADO = 0.415,        /* x de cada lado do suporte */
      X_Y0 = 0.042, X_Y1 = 0.532, X_Z = 0.150, X_DESVIO = 0.014;
  /* X_Y0 nao e 0.028 (o topo do pe) de proposito: barraX estica a barra meia
     espessura para fora de cada ponta, e no angulo do X isso descia 7.6mm
     ABAIXO do chao. Medido, nao chutado. Comecando em 0.042 o ponto mais baixo
     da barra fica em +0.006 e a ponta morre por dentro do pe. */
  for (var s = 0; s < 2; s++) {
    var lx = (s === 0) ? -LADO : LADO;
    /* as duas barras cruzadas: uma sobe da frente para tras, a outra ao
       contrario. Elas correm em X DESENCONTRADAS (X_DESVIO): passam uma ao
       lado da outra, como as fitas parafusadas de um suporte de verdade.
       Sem esse desvio as quatro faces largas dividiam plano no cruzamento -
       118 pares coplanares, z-fighting piscando bem no meio do X. */
    corpo.push(pinta(barraX(lx - X_DESVIO, -X_Z, X_Y0, X_Z, X_Y1, 0.024, 0.052), METAL, 0.14));
    corpo.push(pinta(barraX(lx + X_DESVIO, X_Z, X_Y0, -X_Z, X_Y1, 0.024, 0.052), METAL, 0.14));
    /* pe no chao (corre no eixo Z, passando das duas pontas de baixo) */
    corpo.push(pinta(caixa(0.075, 0.028, 0.400, lx, 0.014, 0), METAL_PE, 0.22));
    /* trilho de apoio: entra 4mm na barriga da caixa (nada coplanar) */
    corpo.push(pinta(caixa(0.070, 0.026, 0.360, lx, 0.516, 0), METAL, 0.12));
  }
  /* travessa que amarra os dois X na altura do cruzamento */
  corpo.push(pinta(caixa(0.800, 0.030, 0.030, 0, (X_Y0 + X_Y1) / 2, 0), METAL, 0.14));

  /* ============ CAIXA DO TECLADO ============ */
  var CX_Y0 = 0.525, CX_ALT = 0.070, CX_TOPO = CX_Y0 + CX_ALT;   /* topo = 0.595 */
  var tampa = new T.BoxGeometry(1.300, CX_ALT, 0.420);
  inclinaFrente(tampa, CX_ALT, 0.026);             /* frente levemente inclinada */
  tampa.translate(0, CX_Y0 + CX_ALT / 2, 0);
  corpo.push(pinta(tampa, ROSA, 0.10));
  /* a borda da frente da tampa fica em z = +0.184; as teclas param em +0.170,
     entao sobra um labio rosa de 14mm na frente delas. */

  /* ============ LEITO ESCURO DAS TECLAS ============
     sobe 5mm acima do topo da caixa: e ele que aparece nas frestas entre as
     teclas e vira a linha de sombra na frente delas. */
  corpo.push(pinta(caixa(1.210, 0.022, 0.231, 0, 0.589, 0.0595), LEITO, 0.18));

  /* ============ TECLAS ============ */
  var N_BRANCAS = 15, PASSO = 0.080, X_INI = -0.560;   /* -(15-1)/2 * PASSO */
  /* a tecla afunda 2mm na tampa: assim a base dela NAO divide plano com o topo
     da caixa (o culling salvaria, mas 2mm custam nada e tiram a duvida) */
  var BR_LARG = 0.0735, BR_ALT = 0.027, BR_Y = CX_TOPO + BR_ALT / 2 - 0.002;   /* 0.593 -> 0.620 */
  var BR_PROF = 0.190, BR_Z = 0.075;                   /* -0.020 -> +0.170 */
  var i;
  for (i = 0; i < N_BRANCAS; i++) {
    corpo.push(pinta(caixa(BR_LARG, BR_ALT, BR_PROF, X_INI + i * PASSO, BR_Y, BR_Z), BRANCA, 0.10));
  }
  /* pretas: existem depois das brancas C, D, F, G, A (0,1,3,4,5 do ciclo de 7),
     o que da os grupos de 2 e de 3 do piano de verdade.
     Base em 0.612 = DENTRO da branca (0.593-0.620): cruza por dentro, nunca
     encosta no mesmo plano - z-fighting resolvido na origem. */
  /* a preta tambem sobra 5mm ATRAS da branca (vai parar em cima do leito
     escuro, onde nao aparece): se as duas traseiras ficassem no mesmo z=-0.020
     eram 50 pares coplanares de mesma face piscando no fundo do teclado. */
  var PR_LARG = 0.042, PR_Y0 = 0.612, PR_ALT = 0.048;
  var PR_PROF = 0.120, PR_Z = -0.025 + PR_PROF / 2;
  for (i = 0; i < N_BRANCAS - 1; i++) {
    var nota = i % 7;
    if (nota === 2 || nota === 6) continue;           /* nao ha preta depois de E nem de B */
    corpo.push(pinta(caixa(PR_LARG, PR_ALT, PR_PROF, X_INI + i * PASSO + PASSO / 2,
      PR_Y0 + PR_ALT / 2, PR_Z), PRETA, 0.08));
  }

  /* ============ TESTEIRAS (blocos rosa que fecham as pontas do teclado) ============ */
  for (i = 0; i < 2; i++) {
    corpo.push(pinta(caixa(0.048, 0.032, 0.198, (i === 0 ? -1 : 1) * 0.622, 0.609, 0.073), ROSA, 0.06));
  }

  /* ============ PAINEL TRASEIRO ============
     recuado 5mm da traseira da caixa e 5mm das laterais: nenhuma face divide
     plano com a caixa. */
  var PN_FRENTE = -0.140;
  corpo.push(pinta(caixa(1.290, 0.207, 0.065, 0, 0.6485, -0.1725), ROSA_ESCURO, 0.16));

  /* ============ PARTITURA + NOTA (MeshBasic: acendem) ============ */
  var TELA_ANG = -0.22, TELA_Y = 0.660, TELA_Z = -0.122;
  /* girar por -0.22 rad joga o topo para tras e vira a face para cima: e a
     inclinacao de um atril de verdade. */
  var tela = new T.BoxGeometry(0.460, 0.140, 0.014);
  tela.rotateX(TELA_ANG);
  tela.translate(0, TELA_Y, TELA_Z);
  brilho.push(pinta(tela, TELA, 0.18));

  /* nota musical dourada: bolinha + hastezinha, construidas no plano da tela
     e levadas junto com ela (mesma rotacao, mesmo destino) */
  function naTela(geo) {
    geo.rotateX(TELA_ANG);
    geo.translate(0, TELA_Y, TELA_Z);
    return geo;
  }
  var cabeca = new T.CircleGeometry(0.030, 10);
  cabeca.translate(-0.030, -0.014, 0.013);            /* 6mm na frente da face da tela */
  brilho.push(pinta(naTela(cabeca), DOURADO, 0.10));
  var haste = new T.BoxGeometry(0.011, 0.070, 0.009);
  haste.translate(-0.0025, 0.021, 0.012);
  brilho.push(pinta(naTela(haste), DOURADO, 0.10));

  /* ============ BOTOEZINHOS ============ */
  /* tres na cara do painel (olham para quem toca) */
  var CORES_BOTAO = [DOURADO, BOTAO_AZUL, BOTAO_VERDE];
  for (i = 0; i < 3; i++) {
    brilho.push(pinta(caixa(0.030, 0.030, 0.018, -0.505 + i * 0.050, 0.665, PN_FRENTE + 0.006),
      CORES_BOTAO[i], 0.16));
  }
  /* dois deitados na prateleira, do outro lado: sao os que a camera de cima
     enxerga (a cara do painel some quando o jogo olha o quarto por cima) */
  for (i = 0; i < 2; i++) {
    var disco = new T.CircleGeometry(0.020, 8);
    disco.rotateX(-Math.PI / 2);
    disco.translate(0.420 + i * 0.062, 0.598, -0.075);
    brilho.push(pinta(disco, i === 0 ? BOTAO_AZUL : BOTAO_VERDE, 0.10));
  }

  /* ---------- DC 1: corpo ---------- */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(corpo),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true })));

  /* ---------- DC 2: o que acende ---------- */
  var malhaBrilho = new T.Mesh(BGU.mergeBufferGeometries(brilho),
    new T.MeshBasicMaterial({ vertexColors: true }));
  malhaBrilho.name = 'teclado_brilho';
  grupo.add(malhaBrilho);

  return { grupo: grupo, custo: { dc: 2, tri: 554 } };
};

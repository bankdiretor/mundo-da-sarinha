/* decoracao - os DOIS enfeites do quarto da Sarinha, no mesmo arquivo:

     QUARTO_MOVEIS.vasoPlanta   (item 24) - vaso ceramico claro com uma
       costela-de-adao infantil: 7 folhas gordas e chapadas, cada uma na sua
       hastinha, abrindo em leque do centro da terra.
     QUARTO_MOVEIS.quadroParede (item 26) - quadrinho vertical de parede,
       moldura creme VAZADA, tela branco-rosada e um CORACAO rosa saliente.

   Namespace proprio (QUARTO_MOVEIS), assinatura function(T), UMA malha por
   objeto: MeshLambertMaterial({vertexColors, flatShading}) sobre geometrias
   mescladas. Sem luz, sem sombra, sem textura, sem Standard, sem modulo.

   MEDIDO em three r147 rodando em node (nao chutado, nao olhado no navegador).
   Os numeros de cada peca estao no cabecalho da sua funcao.

   ARMADILHAS RESPEITADAS (todas ja custaram retrabalho neste projeto)
   - `pinta` normaliza indice e apaga o `uv` em TODA peca: Lathe/Cylinder/Circle
     nascem COM indice e Extrude nasce SEM. Misturar as duas familias faz
     mergeBufferGeometries devolver null calado. Conferido no medidor: nenhum
     merge voltou null e as duas malhas tem `color`.
   - A moldura do quadro e um `Shape` com `holes.push(new T.Path(...))`. Chapa
     cheia tapa a arte - erro ja pago por um agente daqui.
   - Nada de face coplanar: o coracao ATRAVESSA a tela (comeca 6mm dentro dela)
     e a moldura ATRAVESSA a tela em Z. Peca que so encosta pisca quando a
     camera anda. Medido: 0 pares coplanares sobrepostos nas duas pecas.
   - O quarto e CLARO: o pigmento nao sobe acima do hex da ficha. O volume vem
     do `fBase` (0.10-0.18), que puxa a BASE do degrade para o cinza-azulado.
     Subir tom em ambiente claro lava a cor.
   - `ExtrudeGeometry` so gasta `curveSegments` em CURVA: 1 nos contornos retos
     da moldura, 3 nas folhas (que sao gotas simples) e 6 no CORACAO. O 6 nao e
     desperdicio: com amostragem baixa o lobo achata e o coracao le como "V".
     `bevelEnabled:false` em tudo - o chanfro INFLA a forma para fora e muda o
     tamanho real da peca (licao paga na estrela da luminaria). */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};

/* ==========================================================================
   ITEM 24 - VASO DE PLANTA

   ANATOMIA: vaso tronco-conico (mais largo em cima) com aro saliente no topo
   -> terra escura logo abaixo do aro -> 7 hastes finas saindo do centro da
   terra, cada uma com uma folha larga em forma de gota.

   MEDIDO: 0.479 de altura, 0.297 (X) x 0.289 (Z) de largura, menor Y = 0.00000.
   PIVO: centro da base, Y=0 e a superficie onde ele apoia (o chao do quarto).
   CUSTO MEDIDO: 1 draw call, 300 triangulos (teto 320) =
     96 vaso + 8 terra + 7 x (8 haste + 20 folha).

   Decisoes que valem o comentario:
   - o vaso e um LatheGeometry de 7 pontos, nao uma pilha de cilindros. Um
     unico contorno sobe pela PAREDE DE FORA, passa POR CIMA do aro e desce
     pela PAREDE DE DENTRO: assim a boca tem espessura de verdade (11mm) e nao
     existe aresta aberta para virar buraco. Pilha de cilindros precisaria de
     um cilindro invertido para a parede interna - e inverter cilindro no three
     e trocar a rotacao das faces na mao.
   - a ORDEM dos pontos e lei: base -> fora -> por cima do aro -> dentro. No
     LatheGeometry o contorno subindo (+Y) gera face para FORA do eixo; entao
     a parede externa tem que subir e a interna tem que DESCER, senao a peca
     nasce do avesso e some com o backface culling. Conferido no medidor
     (componente radial da normal geometrica, face a face).
   - a terra e um disco cujo raio sai INTERPOLADO do proprio contorno do vaso
     (funcao `raioInterno`) mais 1.5mm de sobra. A sobra entra na espessura da
     parede - some dentro da ceramica em vez de aparecer como anel escuro por
     fora, e garante que nunca sobre fresta entre a terra e a parede.
   - as folhas nao sao agulhas: sao gotas de 2 curvas bezier com os pontos de
     controle abertos perto da PONTA (1.3x a meia-largura a 92% do comprimento),
     o que arredonda o topo e afina a base onde a haste entra.
   - cada folha inclina 0.10 rad MAIS que a sua haste. E o que faz a planta
     abrir em leque em vez de virar um buque de espetos paralelos.
   ========================================================================== */
window.QUARTO_MOVEIS.vasoPlanta = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'vaso_planta';

  /* ---------- paleta (hex da ficha, sem subir tom) ---------- */
  var CERAMICA = 0xefe3d8,   /* vaso (ficha) */
      TERRA = 0x5a4638,      /* terra (ficha) */
      TALO = 0x5fa96b,       /* hastes (ficha) */
      FOLHA = 0x74c47f;      /* folhas (ficha) */

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

  /* ---------- O VASO ----------
     Contorno em (raio, altura). Le de cima para baixo na lista = o caminho que
     o dedo faz na peca: centro do fundo, borda do fundo, sobe a parede de
     fora, cinta do aro, topo do aro, volta pela boca, desce a parede de dentro.
     O primeiro ponto tem raio 0.002 (nao 0) para o fundo nao nascer com uma
     coroa de triangulos degenerados no eixo. */
  var PERFIL = [
    [0.002, 0.000],   /* centro do fundo */
    [0.084, 0.000],   /* borda do fundo (base ESTREITA) */
    [0.127, 0.150],   /* parede de fora subindo: tronco-conico, largo em cima */
    [0.141, 0.161],   /* cinta do aro: 14mm de balanco sobre o corpo */
    [0.140, 0.178],   /* topo do aro (a boca) */
    [0.121, 0.176],   /* volta pela boca: o anel do topo tem 19mm de largura */
    [0.110, 0.130]    /* desce a parede de dentro; abaixo disso a terra tapa */
  ];
  var SEG = 8;                       /* 8 lados: peca de 0.28 de largura, ninguem le a facetagem */
  var ptos = [], pi;
  for (pi = 0; pi < PERFIL.length; pi++) ptos.push(new T.Vector2(PERFIL[pi][0], PERFIL[pi][1]));
  pecas.push(pinta(new T.LatheGeometry(ptos, SEG), CERAMICA, 0.17));

  /* raio da PAREDE DE DENTRO numa altura y, lido do proprio contorno (os dois
     ultimos pontos). Usar o mesmo numero que gerou a malha e o que impede
     fresta entre a terra e a ceramica. */
  function raioInterno(y) {
    var a = PERFIL[6], b = PERFIL[5];              /* [0.110,0.130] -> [0.121,0.176] */
    var t = (y - a[1]) / (b[1] - a[1]);
    t = Math.max(0, Math.min(1, t));
    return a[0] + t * (b[0] - a[0]);
  }

  /* ---------- TERRA ----------
     Disco chato 38mm abaixo do topo do aro: de pe, a crianca ve a terra por
     cima da boca. O +0.0015 de sobra fica ESCONDIDO dentro dos 11mm de
     espessura da parede - poke invisivel vale mais que fresta visivel. */
  var Y_TERRA = 0.140;
  var terra = new T.CircleGeometry(raioInterno(Y_TERRA) + 0.0015, SEG);
  terra.rotateX(-Math.PI / 2);                     /* normal para CIMA */
  terra.translate(0, Y_TERRA, 0);
  pecas.push(pinta(terra, TERRA, 0.10));

  /* ---------- FOLHAGEM ----------
     Cada linha: [azimute, altura da haste, inclinacao da haste, tamanho da
     folha]. Alturas e angulos TODOS diferentes de proposito: planta com hastes
     iguais vira grafico de barras. */
  var PLANO = [
    [0.00,  0.240, 0.16, 1.00],
    [0.92,  0.150, 0.54, 0.84],
    [1.78,  0.196, 0.34, 0.94],
    [2.65,  0.118, 0.70, 0.76],
    [3.55,  0.172, 0.44, 0.90],
    [4.42,  0.134, 0.60, 0.80],
    [5.36,  0.208, 0.26, 0.96]
  ];
  var Y_BROTO = Y_TERRA - 0.012;                   /* as hastes nascem DENTRO da terra */
  var R_BROTO = 0.020;                             /* espalha os pes para nao virar um no */
  var L_FOLHA = 0.125, W_FOLHA = 0.050;            /* comprimento e meia-largura da maior */

  var f, az, hs, incl, esc, sa, ca, dx, dz, ponta, folha, haste;
  for (f = 0; f < PLANO.length; f++) {
    az = PLANO[f][0]; hs = PLANO[f][1]; incl = PLANO[f][2]; esc = PLANO[f][3];
    sa = Math.sin(az); ca = Math.cos(az);
    dx = R_BROTO * sa; dz = R_BROTO * ca;          /* pe da haste, fora do centro */

    /* haste: tubo de 4 lados (raio 6mm - 4 lados ja lem como cilindro),
       deitado do pe ate a ponta pela inclinacao e depois girado no azimute */
    haste = new T.CylinderGeometry(0.0055, 0.0075, hs, 4, 1, true);
    haste.translate(0, hs / 2, 0);                 /* pivo no pe, cresce para +Y */
    haste.rotateX(incl);
    haste.rotateY(az);
    haste.translate(dx, Y_BROTO, dz);
    pecas.push(pinta(haste, TALO, 0.14));

    /* ponta da haste = onde a folha se planta (mesma conta que a rotacao fez) */
    ponta = [
      dx + Math.sin(incl) * sa * hs,
      Y_BROTO + Math.cos(incl) * hs,
      dz + Math.sin(incl) * ca * hs
    ];

    /* folha: gota de 2 bezier, desenhada no plano XY crescendo para +Y, com a
       base (0,0) na haste. Sem closePath: o Extrude fecha o contorno sozinho e
       fechar na mao duplicaria o primeiro ponto (aresta degenerada). */
    var CL = L_FOLHA * esc, CW = W_FOLHA * esc;
    var forma = new T.Shape();
    forma.moveTo(0, 0);
    forma.bezierCurveTo(CW * 1.45, CL * 0.22, CW * 1.30, CL * 0.92, 0, CL);
    forma.bezierCurveTo(-CW * 1.30, CL * 0.92, -CW * 1.45, CL * 0.22, 0, 0);
    folha = new T.ExtrudeGeometry(forma, {
      depth: 0.007, bevelEnabled: false, steps: 1, curveSegments: 3
    });
    folha.translate(0, 0, -0.0035);                /* centra a espessura em z=0 */
    folha.rotateX(incl + 0.10);                    /* abre 0.10 rad a mais que a haste */
    folha.rotateY(az);
    /* -0.008 em Y: a base da folha entra na haste em vez de pousar nela */
    folha.translate(ponta[0], ponta[1] - 0.008, ponta[2]);
    pecas.push(pinta(folha, FOLHA, 0.16));
  }

  /* ---------- 1 draw call ---------- */
  var geo = BGU.mergeBufferGeometries(pecas);
  var malha = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'vaso_planta_malha';
  grupo.add(malha);

  return { grupo: grupo, custo: { dc: 1, tri: 300 } };
};

/* ==========================================================================
   ITEM 26 - QUADRO VERTICAL DE PAREDE

   ANATOMIA (de tras para a frente): tela branco-rosada colada na parede ->
   coracao rosa nascendo DENTRO da tela e saindo 8mm -> moldura creme vazada
   por cima, emoldurando os dois.

   MEDIDO: 0.300 (X) x 0.400 (Y) x 0.044 (Z), pivo no CENTRO em X e Y.
   Z = 0 e A PAREDE: nada nasce em z negativo e nada encosta no zero - a peca
   vai de z 0.002 a 0.046, crescendo so para +Z, para dentro do quarto.
   CUSTO MEDIDO: 1 draw call, 136 triangulos (teto 320) =
     12 tela + 92 coracao + 32 moldura.

   O empilhamento em Z, que e o que impede o piscar:
     tela     0.002 -> 0.018   (16mm de chapa)
     coracao  0.012 -> 0.026   (nasce 6mm DENTRO da tela, sobra 8mm de fora)
     moldura  0.014 -> 0.046   (entra 4mm na tela)
   Nenhum par de faces divide plano: toda emenda e uma INVASAO, nao um encosto.

   Decisoes que valem o comentario:
   - a moldura e `Shape` retangular com `holes.push(new T.Path(...))`. Chapa
     cheia tapa a arte inteira - foi assim que um agente daqui perdeu uma
     rodada. O vazado tambem e o que da a "espessura visivel" de 4cm de
     madeira que a ficha pede.
   - a tela tem 0.276 x 0.376 e a janela da moldura tem 0.22 x 0.30: a borda da
     tela morre 18mm ATRAS do batente em cada lado. Tela do tamanho da janela
     mostraria a emenda no primeiro angulo torto.
   - o coracao sao QUATRO `bezierCurveTo`, duas por metade: ponta -> OMBRO (o
     ponto mais largo) e ombro -> COVINHA. Duas curvas so, uma por lado, foi a
     versao rejeitada: uma cubica sozinha nao consegue sair da ponta, abrir,
     subir, arquear por cima do lobo e voltar para a covinha - ela corta o
     caminho e o contorno vira um "V" largo, tipo pipa ou decote. Com o ombro
     como ponto intermediario, cada lobo ganha uma curva inteira so para si.
   - as tangentes sao o truque: o control point que CHEGA no ombro e o que SAI
     dele estao os dois na vertical do ombro (mesmo X). Tangente vertical no
     ombro = o maior calibre cai exatamente ali, e os dois lados emendam sem
     bico. Depois a curva de cima arqueia com o control em (0.030, 0.098), bem
     ACIMA da covinha (0.040) - e isso que levanta o lobo.
   - MEDIDO NO CONTORNO AMOSTRADO (nao nos control points, que mentem sobre a
     forma final), com `curveSegments:6` = 25 pontos e 92 triangulos:
       largura maxima 0.165 na altura y=0.021, que e 69% da altura -> o calibre
         maximo esta NOS LOBOS, nao embaixo;
       pico do lobo y=0.072 contra covinha y=0.040 -> covinha de 32mm, 20% da
         altura da peca;
       perfil de largura da ponta ao topo (17 cortes):
         0.000 0.029 0.055 0.078 0.099 0.116 0.131 0.143 0.152 0.159 0.162
         0.165 0.161 0.158 0.147 0.133 0.069
       ou seja: CRESCE, atinge o maximo e DEPOIS CAI. O perfil de um V so
       cresce e para - foi assim que a versao anterior foi pega.
   - 92 triangulos num teto de 320 e barato pelo que compra. Amostragem baixa
     nao economiza nada aqui e achata justamente o unico desenho da peca.
   ========================================================================== */
window.QUARTO_MOVEIS.quadroParede = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'quadro_parede';

  /* ---------- paleta (hex da ficha, sem subir tom) ---------- */
  var MOLDURA = 0xf3e4dc,    /* moldura creme-clara (ficha) */
      TELA = 0xfdf2f5,       /* fundo branco-rosado (ficha) */
      CORACAO = 0xf2789f;    /* coracao rosa (ficha) */

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

  var LARG = 0.300, ALT = 0.400;     /* medida externa da ficha */
  var BORDA = 0.040;                 /* largura da madeira: janela 0.220 x 0.320 */

  /* ---------- TELA (o fundo, colado na parede) ----------
     Caixa em vez de plano: de lado, um plano sem espessura desaparece e a
     moldura fica flutuando. 0.002 de folga da parede contra z-fighting. */
  var tela = new T.BoxGeometry(0.276, 0.376, 0.016);
  tela.translate(0, 0, 0.010);                      /* 0.002 -> 0.018 */
  pecas.push(pinta(tela, TELA, 0.10));

  /* ---------- CORACAO ----------
     Ponta embaixo, duas curvas em cima. Comeca em z=0.012 (6mm DENTRO da
     tela) e termina em 0.026: sobra 8mm de saliencia e nao existe encosto. */
  var PONTA = -0.092,        /* a ponta, embaixo */
      OMBRO_X = 0.0825,      /* o ponto MAIS LARGO do coracao */
      OMBRO_Y = 0.020,
      COVINHA = 0.040;       /* a dobra do meio, entre os dois lobos */
  var cor = new T.Shape();
  cor.moveTo(0, PONTA);
  /* ponta -> ombro ESQUERDO: afina progressivamente em curva ate a ponta.
     O 2o control point fica na vertical do ombro, entao a tangente chega
     vertical - e o que poe o maior calibre exatamente no ombro. */
  cor.bezierCurveTo(-0.030, -0.072, -OMBRO_X, -0.032, -OMBRO_X, OMBRO_Y);
  /* ombro ESQUERDO -> covinha: sai vertical do ombro, arqueia POR CIMA do lobo
     e desce na covinha. E esta curva que a versao anterior nao tinha. */
  cor.bezierCurveTo(-OMBRO_X, 0.072, -0.030, 0.098, 0, COVINHA);
  cor.bezierCurveTo(0.030, 0.098, OMBRO_X, 0.072, OMBRO_X, OMBRO_Y);   /* lobo DIREITO */
  cor.bezierCurveTo(OMBRO_X, -0.032, 0.030, -0.072, 0, PONTA);         /* volta a ponta */
  var coracao = new T.ExtrudeGeometry(cor, {
    depth: 0.014, bevelEnabled: false, steps: 1, curveSegments: 6
  });
  /* +0.0099 centra a CAIXA do coracao na tela (ele nasce de -0.092 a +0.072):
     a ponta desce mais do que os lobos sobem, entao centrar pelo pivo do
     desenho deixaria a figura alta dentro da moldura. */
  coracao.translate(0, 0.0099, 0.012);              /* z: 0.012 -> 0.026 */
  pecas.push(pinta(coracao, CORACAO, 0.16));

  /* ---------- MOLDURA VAZADA ----------
     Contorno externo + `holes.push(new T.Path(...))`. curveSegments:1 porque
     nao ha uma curva sequer: em contorno reto o parametro so gastaria
     triangulo. */
  var mx = LARG / 2, my = ALT / 2;
  var jx = mx - BORDA, jy = my - BORDA;             /* janela: 0.110 x 0.160 */
  var quadro = new T.Shape();
  quadro.moveTo(-mx, -my);
  quadro.lineTo(mx, -my);
  quadro.lineTo(mx, my);
  quadro.lineTo(-mx, my);
  var janela = new T.Path();
  janela.moveTo(-jx, -jy);
  janela.lineTo(-jx, jy);
  janela.lineTo(jx, jy);
  janela.lineTo(jx, -jy);
  quadro.holes.push(janela);
  var moldura = new T.ExtrudeGeometry(quadro, {
    depth: 0.032, bevelEnabled: false, steps: 1, curveSegments: 1
  });
  moldura.translate(0, 0, 0.014);                   /* 0.014 -> 0.046 (invade a tela) */
  pecas.push(pinta(moldura, MOLDURA, 0.15));

  /* ---------- 1 draw call ---------- */
  var geo = BGU.mergeBufferGeometries(pecas);
  var malha = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'quadro_parede_malha';
  grupo.add(malha);

  return { grupo: grupo, custo: { dc: 1, tri: 136 } };
};

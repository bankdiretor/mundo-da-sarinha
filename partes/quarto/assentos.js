/* assentos - os DOIS moveis redondos do quarto da Sarinha, no mesmo arquivo:

     QUARTO_MOVEIS.criadoMudo (item 6)  - mesinha de cabeceira redonda e
       baixa, de madeira mel, com tres perninhas abertas (banquinho
       escandinavo infantil). E o apoio da luminaria-bolha (item 34).
     QUARTO_MOVEIS.pufe       (item 12) - pufe cilindrico de tecido
       roxo-lilas, com costura no meio e assento almofadado afundado.
       E onde a crianca senta para tocar o teclado (item 11).

   As duas seguem partes/CONTRATO.md: sem luz nova, sem sombra de engine,
   sem textura, sem import, ASCII puro, UMA malha Lambert por peca com cor
   por vertice e flatShading. A sombra e um disco creme escurecido pintado
   no chao, como na cama - a engine nao projeta sombra nenhuma.

   MEDIDO em three r147 rodando em NODE (nao chutado, nao olhado no
   navegador; o numero de cada peca esta no cabecalho dela). As auditorias
   que rodaram nas duas:
     - merge devolveu geometria (nenhum null), `uv` fora e as duas malhas
       tem `color`; material Lambert + vertexColors + flatShading;
     - faces coplanares SOBREPOSTAS: 0 pares nas duas (o teste projeta o
       triangulo no plano, encolhe 12% e usa eixo separador, entao vizinho
       de aresta nao conta como par);
     - menor Y das duas = 0.00000 exato (pivo no centro da base);
     - PIGMENTO: o vertice mais claro do criado-mudo e #D9A66C e o do pufe
       e #C0A6DE - exatamente o teto da ficha, nem um passo acima (a conta
       exclui o disco de sombra, que e creme do CHAO, nao cor de movel);
     - o tampo do criado-mudo e um disco plano de raio 0.242 sem nenhum
       vertice acima dele: a luminaria-bolha (raio 0.165) pousa com 7.7cm
       de folga de cada lado;
     - a saia da almofada do pufe morre 11.1mm DENTRO do corpo, entao nao
       existe anel vazado entre almofada e corpo em nenhum angulo.

   ARMADILHAS RESPEITADAS
   - `pinta` normaliza indice (`toNonIndexed`) e apaga `uv` em TODA peca:
     sem isso o mergeBufferGeometries devolve null calado, porque Circle e
     Cylinder nascem com indice e uv e o merge exige atributos iguais.
   - NENHUM encaixe compartilha plano: perna entra 2.4cm DENTRO do tampo,
     a saia da cupula do pufe morre 3cm dentro do corpo, a costura se
     sobrepoe 1.8cm nas duas faixas do corpo e a tampa do fundo esta 6mm
     ACIMA do chao. Faces que so se encostam brigam de profundidade e
     piscam quando a camera anda.
   - O quarto e CLARO (piso creme, parede lilas). O pigmento NAO sobe: o
     volume sai com o hex da ficha e o relevo vem do `fBase` (0.10-0.16),
     que puxa a base do degrade para o cinza-azulado. O tom claro da ficha
     (#C0A6DE) fica so na almofada do pufe, que e a face que olha pra cima.
     Subir tom em ambiente claro lava a cor - ja custou uma poltrona.
   - `pinta` mede o degrade pelo Y da PROPRIA peca: numa peca PLANA
     (maxY == minY) todo vertice cai em f=0 e sai inteiro na cor ESCURA.
     Por isso todo disco horizontal daqui (tampo, tampa, sombra) recebe
     fBase 0.0 - senao o tampo do criado-mudo, que e a superficie mais
     visivel da peca, sairia mais escuro que a borda dele.
   - Nada de ConeGeometry (gomo degenerado do r147) e nada de esfera de
     poucos segmentos virando bipiramide: o abaulado do pufe e meia-esfera
     de 12 gomos ESCALADA em Y, cortada em 0.62*PI para a saia recolher
     para dentro do corpo. */
window.QUARTO_MOVEIS = window.QUARTO_MOVEIS || {};

/* ==========================================================================
   ITEM 6 - CRIADO-MUDO REDONDO

   ANATOMIA (de baixo para cima):
     3 perninhas finas e ABERTAS (pe no raio 0.185, topo no raio 0.100)
     -> tampo redondo de 12 gomos com chanfro em cima e embaixo -> topo
     plano e limpo, que e onde a luminaria-bolha pousa.

   MEDIDO: 0.42000 de altura, 0.52000 de largura, menor Y = 0.00000.
   PIVO: centro da base, Y=0 e o chao.
   CUSTO MEDIDO: 1 draw call, 246 triangulos.

   Decisoes que valem o comentario:
   - o tampo NAO e um cilindro so: e um sanduiche de 3 faixas (chanfro,
     corpo, chanfro) mais duas tampas. Custa 96 triangulos e da a borda
     amaciada que a ficha pede, sem gastar os 120+ de um Lathe (que ainda
     jogaria 24 triangulos degenerados nos polos). A faixa de baixo sai no
     mel ESCURO: vira um debrum que separa o tampo das pernas de longe.
   - a perna e um tronco de cone (0.019 no topo, 0.0135 no pe): perna que
     afina para baixo e o que faz o movel parecer leve. Ela sobe ate
     y=0.389 e o tampo comeca em 0.365 - 2.4cm DENTRO da madeira. Perna
     encostada na base do tampo abre fresta na primeira volta da camera.
   - o angulo de abertura (12.4 graus) nao foi escolhido no olho: sai de
     querer o pe em 0.185 e o topo em 0.100 com 0.395 de comprimento. O
     tampo (raio 0.26) sobra 5.6cm alem do pe, que e a proporcao que faz
     ler como banquinho escandinavo e nao como mesa de bar.
   - `pousa` desce cada perna pelo vertice MAIS BAIXO dela, nao pelo eixo:
     a base cortada em diagonal ficaria 3mm enterrada no chao se eu
     confiasse na conta do eixo.
   - sombra em 3 discos pequenos (um por pe), nao um disco unico: o movel
     e VAZADO embaixo, entao um disco grande apareceria inteiro entre as
     pernas e leria como mancha no piso, nao como sombra.
   ========================================================================== */
window.QUARTO_MOVEIS.criadoMudo = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'criado_mudo';

  /* ---------- paleta (hex da ficha, sem subir tom) ---------- */
  var MEL = 0xd9a66c,        /* tampo (ficha) */
      MEL_ESCURO = 0xc08e52, /* perninhas e debrum de baixo do tampo (ficha) */
      CHAO_SOMBRA = 0xf4edde;/* creme do mundo, escurecido no uso */

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

  /* encosta a peca no chao pelo vertice mais baixo dela (nao pelo eixo) */
  function pousa(geo, alvo) {
    var pos = geo.attributes.position, i, minY = 1e9;
    for (i = 0; i < pos.count; i++) { if (pos.getY(i) < minY) minY = pos.getY(i); }
    geo.translate(0, alvo - minY, 0);
    return geo;
  }

  /* ---------- medidas mestras ---------- */
  var GOMOS = 12;            /* lados do tampo */
  var R_TAMPO = 0.26;        /* raio do tampo (ficha) */
  var R_CHATO = 0.242;       /* raio do miolo plano, depois do chanfro */
  var ALTURA = 0.42;         /* altura total (ficha) */
  var ESP = 0.055;           /* espessura do tampo (ficha) */
  var CHAN = 0.012;          /* altura de cada chanfro */
  var Y_SOB = ALTURA - ESP;         /* 0.365 - onde o tampo comeca */
  var Y_C1 = Y_SOB + CHAN;          /* 0.377 - fim do chanfro de baixo */
  var Y_C2 = ALTURA - CHAN;         /* 0.408 - inicio do chanfro de cima */

  var pecas = [], i;

  /* ---------- SOMBRA: um disco por pe (o movel e vazado embaixo) ----------
     fBase 0 porque o disco e PLANO: com faixa de Y zerada o `pinta` jogaria
     tudo na cor escura do degrade. */
  var CINZA_CHAO = new T.Color(CHAO_SOMBRA).lerp(CINZA, 0.30);

  /* ---------- PERNINHAS: 3, abertas para fora ----------
     Construcao: nasce em pe com a base no zero -> tomba (topo cai para -X)
     -> vai para o raio do pe em +X -> encosta no chao -> gira para o seu
     terco. Assim o PE fica por fora e o TOPO por dentro, que e o desenho
     de banquinho, e nao ao contrario. */
  var R_PE = 0.185;          /* raio do pe no chao */
  var R_TOPO = 0.100;        /* raio do topo da perna, ja embaixo do tampo */
  var L_PERNA = 0.395;
  var TOMBO = Math.asin((R_PE - R_TOPO) / L_PERNA);   /* 12.4 graus */
  var ang;

  for (i = 0; i < 3; i++) {
    ang = Math.PI / 2 + i * (Math.PI * 2 / 3);        /* um pe para o fundo */

    var perna = new T.CylinderGeometry(0.019, 0.0135, L_PERNA, 10, 1, false);
    perna.translate(0, L_PERNA / 2, 0);
    perna.rotateZ(TOMBO);
    perna.translate(R_PE, 0, 0);
    pousa(perna, 0);
    perna.rotateY(ang);
    pecas.push(pinta(perna, MEL_ESCURO, 0.16));

    var pad = new T.CircleGeometry(0.042, 10);
    pad.rotateX(-Math.PI / 2);
    pad.translate(R_PE * Math.cos(ang), 0.004, -R_PE * Math.sin(ang));
    pecas.push(pinta(pad, CINZA_CHAO, 0.0));
  }

  /* ---------- TAMPO: chanfro / corpo / chanfro + duas tampas ----------
     As faixas compartilham o anel de vertices exato (mesmo raio, mesmo Y),
     entao a casca e estanque; e como nenhuma tem a mesma inclinacao da
     vizinha, nao existe par coplanar para brigar de profundidade. */
  var chanBaixo = new T.CylinderGeometry(R_TAMPO, R_CHATO, CHAN, GOMOS, 1, true);
  chanBaixo.translate(0, Y_SOB + CHAN / 2, 0);
  pecas.push(pinta(chanBaixo, MEL_ESCURO, 0.10));

  var corpo = new T.CylinderGeometry(R_TAMPO, R_TAMPO, Y_C2 - Y_C1, GOMOS, 1, true);
  corpo.translate(0, (Y_C1 + Y_C2) / 2, 0);
  pecas.push(pinta(corpo, MEL, 0.14));

  var chanCima = new T.CylinderGeometry(R_CHATO, R_TAMPO, CHAN, GOMOS, 1, true);
  chanCima.translate(0, Y_C2 + CHAN / 2, 0);
  pecas.push(pinta(chanCima, MEL, 0.06));

  /* o tampo limpo onde a luminaria-bolha pousa: fBase 0 = hex puro da ficha */
  var tampa = new T.CircleGeometry(R_CHATO, GOMOS);
  tampa.rotateX(-Math.PI / 2);
  tampa.translate(0, ALTURA, 0);
  pecas.push(pinta(tampa, MEL, 0.0));

  var fundo = new T.CircleGeometry(R_CHATO, GOMOS);
  fundo.rotateX(Math.PI / 2);
  fundo.translate(0, Y_SOB, 0);
  pecas.push(pinta(fundo, MEL_ESCURO, 0.0));

  /* ---------- 1 draw call ---------- */
  var geo = BGU.mergeBufferGeometries(pecas);
  var malha = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'criado_mudo_malha';
  grupo.add(malha);

  return {
    grupo: grupo,
    custo: { dc: 1, tri: 246 }
  };
};

/* ==========================================================================
   ITEM 12 - PUFE / BANQUINHO REDONDO

   ANATOMIA (de baixo para cima):
     corpo em duas faixas (mais estreito no chao, abrindo para cima) ->
     COSTURA saliente na cintura -> almofada abaulada no tom claro, com o
     afundamento de quem senta no meio.

   MEDIDO: 0.35692 de altura, 0.60900 de largura, menor Y = 0.00000.
   O afundamento do assento tem 10.9mm do anel mais alto ate o centro.
   PIVO: centro da base, Y=0 e o chao.
   CUSTO MEDIDO: 1 draw call, 180 triangulos.

   Decisoes que valem o comentario:
   - a cupula e cortada em thetaLength = 0.62*PI, nao em PI/2. Passar de 90
     graus faz a saia VIRAR PARA DENTRO: a maior largura (0.3002) fica em
     y=0.309 e a borda de baixo recolhe para 0.2808 em y=0.270, morrendo
     DENTRO do corpo (que ali tem 0.287). E isso que fecha a emenda sem
     fresta - meia-esfera cortada no equador deixaria um anel vazado entre
     a almofada e o corpo, visivel de qualquer angulo baixo.
   - o abaulado NAO e esfera de poucos segmentos (viraria diamante): e uma
     esfera de 12 gomos ESCALADA para 0.082 de altura. A silhueta continua
     redonda no plano do chao e so a altura achata.
   - `afunda` usa cosseno levantado (0.5*(1+cos(PI*d))), nao cosseno ao
     quadrado: a queda comeca suave na borda e o centro desce 1.1cm abaixo
     do anel de 0.14 de raio. Le como marca de bumbum; com o cos^2 o
     afundamento vira funil pontudo no meio.
   - a costura tem raio 0.3045 contra ~0.298 da parede: sobressai 6mm, o
     bastante para ler como debrum de estofaria a 2 metros. Ela tambem
     esconde a junta das duas faixas do corpo, que fica no meio dela.
   - a tampa do fundo esta em y=0.006, nao em y=0: no chao ela dividiria o
     plano com o piso do quarto. Fica 6mm dentro, escondida pela parede, e
     o menor Y da peca continua sendo o anel de baixo do corpo (0.00000).
   ========================================================================== */
window.QUARTO_MOVEIS.pufe = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'pufe';

  /* ---------- paleta (hex da ficha, sem subir tom) ---------- */
  var ROXO = 0xa78bc9,       /* corpo do pufe (ficha) */
      ROXO_CLARO = 0xc0a6de, /* almofada do topo (ficha) */
      ROXO_COSTURA = 0x8e74b4, /* debrum da cintura: um tom ABAIXO, para vincar */
      CHAO_SOMBRA = 0xf4edde;

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

  /* cava a marca de quem senta no centro do topo (raio no plano XZ) */
  function afunda(geo, raio, prof) {
    var pos = geo.attributes.position, i, x, z, d;
    for (i = 0; i < pos.count; i++) {
      x = pos.getX(i); z = pos.getZ(i);
      d = Math.sqrt(x * x + z * z) / raio;
      if (d >= 1) continue;
      pos.setY(i, pos.getY(i) - prof * 0.5 * (1 + Math.cos(Math.PI * d)));
    }
    pos.needsUpdate = true;
    return geo;
  }

  /* ---------- medidas mestras ---------- */
  var GOMOS = 12;
  var R_PE = 0.262;          /* base mais estreita (ficha) */
  var R_CINTURA = 0.2985;
  var R_OMBRO = 0.290;       /* topo do corpo: fica DENTRO da saia da cupula */
  var Y_CINTURA = 0.160;
  var Y_OMBRO = 0.302;

  var pecas = [];

  /* ---------- SOMBRA DE CONTATO ----------
     Raio 0.285: menor que a almofada (0.3045), entao ela vive quase toda
     debaixo do balanco do pufe e so aparece de angulo rasante - a mesma
     regra da poltrona. fBase 0 porque o disco e plano. */
  var sombra = new T.CircleGeometry(0.285, GOMOS);
  sombra.rotateX(-Math.PI / 2);
  sombra.translate(0, 0.0035, 0);
  pecas.push(pinta(sombra, new T.Color(CHAO_SOMBRA).lerp(CINZA, 0.34), 0.0));

  /* ---------- CORPO: duas faixas, base estreita abrindo para cima ---------- */
  var baixo = new T.CylinderGeometry(R_CINTURA, R_PE, 0.165, GOMOS, 1, true);
  baixo.translate(0, 0.0825, 0);
  pecas.push(pinta(baixo, ROXO, 0.15));

  var alto = new T.CylinderGeometry(R_OMBRO, R_CINTURA, Y_OMBRO - 0.155, GOMOS, 1, true);
  alto.translate(0, (0.155 + Y_OMBRO) / 2, 0);
  pecas.push(pinta(alto, ROXO, 0.13));

  /* tampa do fundo 6mm ACIMA do chao: nao divide plano com o piso e ainda
     assim veda o vazado (a parede de dentro e descartada pelo culling) */
  var fundo = new T.CircleGeometry(0.263, GOMOS);
  fundo.rotateX(Math.PI / 2);
  fundo.translate(0, 0.006, 0);
  pecas.push(pinta(fundo, ROXO_COSTURA, 0.0));

  /* ---------- COSTURA: debrum saliente na cintura ----------
     Sobressai 6mm da parede e cobre a junta das duas faixas do corpo. */
  var costura = new T.CylinderGeometry(0.3045, 0.3045, 0.026, GOMOS, 1, true);
  costura.translate(0, Y_CINTURA, 0);
  pecas.push(pinta(costura, ROXO_COSTURA, 0.06));

  /* ---------- ALMOFADA: cupula achatada com a marca de sentar ----------
     Unica peca no tom claro da ficha: e a face que olha para cima. */
  var almofada = new T.SphereGeometry(1, GOMOS, 4, 0, Math.PI * 2, 0, Math.PI * 0.62);
  almofada.scale(0.302, 0.082, 0.302);
  almofada.translate(0, 0.300, 0);
  afunda(almofada, 0.26, 0.036);
  pecas.push(pinta(almofada, ROXO_CLARO, 0.13));

  /* ---------- 1 draw call ---------- */
  var geo = BGU.mergeBufferGeometries(pecas);
  var malha = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'pufe_malha';
  grupo.add(malha);

  return {
    grupo: grupo,
    custo: { dc: 1, tri: 180 }
  };
};

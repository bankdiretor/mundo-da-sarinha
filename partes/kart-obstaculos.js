/* KART_OBSTACULOS — namespace COMPARTILHADO entre 3 agentes (agua, parede,
   estrela de velocidade) para os obstaculos estilo Mario Kart espalhados
   pela pista-kart-anel.js (NAO MEXER nela). Cada peca nasce centrada na
   propria origem local (0,0,0) porque quem planta decide a posicao/rotacao
   dentro da faixa (metade esquerda ou direita dos 6 m de largura).

   NAO registrar em window.MUNDO_PARTES — estas nao sao pecas montaveis
   sozinhas pelo host (armadilha 16 do CONTRATO). Contrato geral:
   partes/CONTRATO.md. */
window.KART_OBSTACULOS = window.KART_OBSTACULOS || {};

/* ===========================================================================
   ESTRELA DE VELOCIDADE — coletavel que da impulso ao kart. Reaproveita a
   linguagem visual da estrelinha dourada ja oficial do mundo (a mesma que
   o boneco coleta espalhada pelo mapa, e a mesma tecnica do portico do
   kartodromo.js: T.Shape de 10 pontos + ExtrudeGeometry SEM bevel — bevel
   infla a forma, armadilha 7). So que maior, girando, flutuando: marca
   "pegue-me para ganhar velocidade", NADA de caixa "?" nem moeda redonda
   (isso e Nintendo, nao e a linguagem deste mundo).
   =========================================================================== */
window.KART_OBSTACULOS.estrelaVelocidade = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'obstaculo-estrela-velocidade';

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

  var ALTURA_FLUTUA = 1.05;         /* onde o CENTRO da estrela flutua */
  var DOURADO = 0xffd35a;
  var DOURADO_CLARO = 0xffe9a8;

  /* ---- 1. a estrela: T.Shape de 10 pontos, extrudada SEM bevel (armadilha 7:
     bevel infla a forma para fora — evitado igual ao portico do kartodromo) */
  var BRILHO = [];   /* sacola MeshBasic: a peca inteira "acende" sozinha */
  var forma = new T.Shape();
  var RAIO_EXT = 0.42, RAIO_INT = 0.19;
  for (var p = 0; p < 10; p++) {
    var aa = -Math.PI / 2 + p * Math.PI / 5;
    var rr = (p % 2 === 0) ? RAIO_EXT : RAIO_INT;
    var px = Math.cos(aa) * rr, pz = Math.sin(aa) * rr;
    if (p === 0) forma.moveTo(px, pz); else forma.lineTo(px, pz);
  }
  forma.closePath();
  var PROF = 0.14;
  var geoEstrela = new T.ExtrudeGeometry(forma, { depth: PROF, bevelEnabled: false, curveSegments: 2 });
  /* a shape nasce no plano XY (extrude ao longo de Z) — deita a estrela para
     encarar para CIMA e centraliza a espessura em torno de y=0 local */
  geoEstrela.rotateX(-Math.PI / 2);
  /* apos rotateX(-90), y local vai de 0 a PROF: recuar PROF/2 centra a
     espessura em y=0 antes de subir para a altura de flutuacao (bug pego
     na medicao: estava com +PROF/2, dobrando o deslocamento e deixando a
     estrela 0.14 mais alta que o previsto) */
  geoEstrela.translate(0, -PROF / 2, 0);
  geoEstrela.translate(0, ALTURA_FLUTUA, 0);
  BRILHO.push(pinta(geoEstrela, DOURADO, 0.0));

  /* ---- 2. a aureola: toro achatado ao redor, dourado mais claro — sugere
     brilho sem gastar luz nova (e so cor + Basic) */
  var geoAureola = new T.TorusGeometry(0.62, 0.045, 6, 20);
  geoAureola.scale(1, 0.62, 1);      /* achata para ficar mais "disco" que rosca */
  geoAureola.rotateX(Math.PI / 2);   /* deita no plano horizontal */
  geoAureola.translate(0, ALTURA_FLUTUA, 0);
  BRILHO.push(pinta(geoAureola, DOURADO_CLARO, 0.0));

  /* ---- 3. rastro de luz ate o chao: cone bem fino, translucido, do chao
     (y=0) ate a base da estrela — marca no asfalto por onde ela flutua sem
     poluir (fica bem fino: raio pequeno no topo e na base) */
  var geoRastro = new T.CylinderGeometry(0.05, 0.16, ALTURA_FLUTUA - PROF / 2, 6, 1, true);
  /* CylinderGeometry fecha em 6 gomos SEM triangulo degenerado (armadilha 6
     e so em ConeGeometry — aqui e cilindro aberto, sem tampa) */
  geoRastro.translate(0, (ALTURA_FLUTUA - PROF / 2) / 2, 0);
  BRILHO.push(pinta(geoRastro, DOURADO_CLARO, 0.0));

  var geoMerge = BGU.mergeBufferGeometries(BRILHO);
  var matBrilho = new T.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 });
  var meshBrilho = new T.Mesh(geoMerge, matBrilho);
  grupo.add(meshBrilho);

  return {
    grupo: grupo,
    custo: { dc: 1, tri: 288 },   /* medido em Node com three.cjs real (script de verificacao) */
    tipo: 'estrela',
    /* gira em torno do proprio eixo Y (~1 volta a cada 3s) e balanca a
       altura (amplitude pequena, ~0.1) — quem chama a cada frame e o jogo */
    animar: function (t) {
      grupo.rotation.y = t * (Math.PI * 2 / 3);
      grupo.position.y = Math.sin(t * 1.7) * 0.1;
    }
  };
};

/* ===========================================================================
   PAREDE (bloco de desviar) — obstaculo fixo tipo "muralha de castelo de
   blocos de brinquedo": pedestal + 3 blocos empilhados, encostados (flush)
   na borda bloqueada e afunilando em degrau (efeito ziguezague/piramide) rumo
   a faixa livre — como uma muralha construida contra o limite da pista.
   Moldura dourada + estrelinha no bloco do topo (o unico "brilho" da peca).
   Ocupa ~60% da largura da pista a partir do lado indicado, deixando ~2.4m
   livres do lado oposto (largura padrao 6m). SEM copia visual da Nintendo:
   nada de cano verde, nada de caixa "?".
   =========================================================================== */
window.KART_OBSTACULOS.parede = function (T, largura, lado) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'obstaculo-parede';

  largura = largura || 6.0;
  lado = (lado === 1) ? 1 : -1;   /* qualquer valor invalido cai em -1 */

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

  var MEIA = largura / 2;
  var OCC = largura * 0.6;              /* extensao bloqueada a partir do lado (3.6 p/ 6m) */
  var D0 = largura * 0.19;              /* profundidade (Z) do pedestal (~1.14 p/ 6m) */

  var FATOR = [1.0, 0.82, 0.64, 0.46];  /* pedestal, bloco1, bloco2, bloco3 (topo) */
  var COR   = [0x9FB4D8, 0xF2789F, 0xF2C069, 0xA78BC9]; /* azul-poeira, rosa, amarelo, lilas */
  var ALT   = [0.20, 0.32, 0.32, 0.32]; /* altura de cada camada */
  var SOBRA = 0.02;                     /* sobreposicao entre camadas — armadilha 4/10 do
                                            CONTRATO: blocos empilhados que dividem plano
                                            exato piscam (z-fighting); 0.02 de folga evita */

  var edge = lado * MEIA;               /* x da borda bloqueada (a do pedestal, camada 0) */
  var sinal = -lado;                    /* direcao (em x), da borda para o centro da pista */
  var RECUO = 0.03;                     /* defeito achado na medicao (ver rodape): as 4
                                            camadas rentes ao MESMO plano X, com a sobra de
                                            0.02 em Y que evita coplanar HORIZONTAL, criavam
                                            uma faixa onde a face VERTICAL externa de duas
                                            camadas vizinhas ocupava o mesmo plano ao mesmo
                                            tempo (42 pares coplanares medidos). Recuar cada
                                            camada mais um pouco alem do afunilamento tira as
                                            faces externas do mesmo plano — imperceptivel
                                            (9cm no topo de uma parede com 3,6m de base) e
                                            ainda ajuda no ar de "empilhado a mao". */

  var CORPO = [];
  var y = 0, topoX3 = 0, topoZ3 = 0, topoW3 = 0, topoD3 = 0, topoY3 = 0;
  for (var k = 0; k < FATOR.length; k++) {
    var w = OCC * FATOR[k], d = D0 * FATOR[k], h = ALT[k];
    var yBase = (k === 0) ? 0 : y - SOBRA;
    var edgeK = edge + sinal * (RECUO * k);
    var cx = edgeK + sinal * (w / 2);
    var box = new T.BoxGeometry(w, h, d);
    box.translate(cx, yBase + h / 2, 0);
    CORPO.push(pinta(box, COR[k], 0.10));
    y = yBase + h;
    if (k === FATOR.length - 1) { topoX3 = cx; topoZ3 = 0; topoW3 = w; topoD3 = d; topoY3 = y; }
  }

  /* moldura dourada — "cinto" mais largo que o bloco do topo, embutido na
     parte de cima dele: e um volume estritamente MAIOR que o trecho de
     bloco3 que cobre, entao nao ha face coplanar (evita a armadilha 4). */
  var mW = topoW3 + 0.10, mD = topoD3 + 0.10, mH = 0.10;
  var mTopo = topoY3 - 0.02, mBase = mTopo - mH;
  var moldura = new T.BoxGeometry(mW, mH, mD);
  moldura.translate(topoX3, mBase + mH / 2, topoZ3);
  CORPO.push(pinta(moldura, 0xF2B94B, 0.04));

  /* estrelinha dourada no topo — unico "brilho" da peca (MeshBasic) */
  var BRILHO = [];
  (function estrela() {
    var forma = new T.Shape();
    for (var p = 0; p < 10; p++) {
      var aa = -Math.PI / 2 + p * Math.PI / 5, rr = (p % 2 === 0) ? 0.16 : 0.072;
      var px = Math.cos(aa) * rr, pz = Math.sin(aa) * rr;
      if (p === 0) forma.moveTo(px, pz); else forma.lineTo(px, pz);
    }
    forma.closePath();
    /* SEM bevel — bevel infla a forma para fora (armadilha 7) */
    var est = new T.ExtrudeGeometry(forma, { depth: 0.09, bevelEnabled: false, curveSegments: 2 });
    est.rotateX(-Math.PI / 2);                     /* deita a estrela, face para cima */
    est.translate(topoX3, topoY3 - 0.02, topoZ3);  /* 0.02 embutida no bloco — evita coplanar */
    BRILHO.push(pinta(est, 0xFFD166, 0.0));
  })();

  var corpoGeo = BGU.mergeBufferGeometries(CORPO);
  var brilhoGeo = BGU.mergeBufferGeometries(BRILHO);
  var matV = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var matB = new T.MeshBasicMaterial({ vertexColors: true });
  grupo.add(new T.Mesh(corpoGeo, matV));
  grupo.add(new T.Mesh(brilhoGeo, matB));

  return { grupo: grupo, custo: { dc: 2, tri: 0 }, tipo: 'parede', meiaLarguraOcupada: OCC };
};

/* ===========================================================================
   AGUA — poca rasa atravessando a largura inteira da pista (o kart atravessa,
   NAO contorna). Reinterpretacao PROPRIA deste mundo: nada de icone de jogo
   comercial, so a linguagem pastel/geometrica de sempre — uma lamina de agua
   ondulada (a ondulacao e so geometria, sem animacao) que afunda um pouco no
   asfalto, com duas margens em rampa (uma em cada ponta, entrada/saida) e
   alguns respingos MeshBasic flutuando por cima.

   Coordenada LOCAL: eixo X = largura da pista (-largura/2 .. +largura/2),
   eixo Z = sentido do trajeto. Y=0 e o nivel do asfalto onde a peca encosta
   (a pista roda em y=0.02; aqui a peca afunda ate ~-0.135, dentro do limite
   de -0.15 pedido). Quem planta rotaciona pela tangente do tracado e
   translada pelo centro(s) (ver userData.tracado em pista-kart-anel.js).
   =========================================================================== */
window.KART_OBSTACULOS.agua = function (T, largura) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'obstaculo-agua';

  var MEIA = (largura || 6.0) / 2;              /* 3.0 pra largura=6 */
  var LARG_TOTAL = MEIA * 2;
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

  var CORPO = [], BRILHO = [];
  var LZ = 1.7;                    /* comprimento da lamina de agua */
  var LB = 0.42;                   /* comprimento de cada margem (rampa) */
  var Y_BORDA_AGUA = -0.075;       /* altura onde a agua encosta na margem */
  var Y_CRISTA = 0.15;             /* crista externa da margem */

  /* 1. AGUA — lamina ondulada (so geometria), cobre a largura inteira */
  (function corpoDeAgua() {
    var geo = new T.PlaneGeometry(LARG_TOTAL, LZ, 12, 6);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i);
      var borda = Math.min(1, Math.abs(z) / (LZ / 2));            /* 0 centro .. 1 na margem */
      var prof = Y_BORDA_AGUA - 0.03 * (1 - borda);                /* mais fundo no meio */
      var onda = (Math.sin(x * 1.6 + z * 0.6) * 0.02 + Math.sin(z * 2.4 - x * 0.4) * 0.012)
                 * (0.4 + 0.6 * (1 - borda));                       /* amortece perto da margem */
      pos.setY(i, prof + onda);
    }
    geo.computeVertexNormals();
    CORPO.push(pinta(geo, 0x8fcde0, 0.35));
  })();

  /* 2. MARGENS — rampa dos dois lados (entrada/saida marcando o trecho);
     sobe da agua (Y_BORDA_AGUA) ate a crista externa (Y_CRISTA) sem deixar
     fundo exposto, porque encaixa exatamente na altura da agua na juncao */
  function margem(zCentro, sinal) {
    var geo = new T.PlaneGeometry(LARG_TOTAL, LB, 10, 3);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), zLocal = pos.getZ(i);
      var t = (zLocal / (LB / 2)) * sinal;               /* -1 lado da agua .. +1 lado externo */
      var tt = (t + 1) / 2;
      var pedrinha = Math.sin(x * 5.3 + zLocal * 9.1) * 0.012;
      pos.setY(i, Y_BORDA_AGUA + tt * (Y_CRISTA - Y_BORDA_AGUA) + pedrinha);
      pos.setZ(i, zLocal + zCentro);
    }
    geo.computeVertexNormals();
    CORPO.push(pinta(geo, 0xb8a888, 0.06));
  }
  margem(-(LZ / 2 + LB / 2), -1);
  margem((LZ / 2 + LB / 2), 1);

  /* 3. RESPINGOS — pequenos losangos MeshBasic flutuando sobre a agua */
  (function respingos() {
    var pts = [
      { x: -1.5, z: -0.25, y: 0.30, s: 0.9 },
      { x: 0.4, z: 0.30, y: 0.36, s: 1.0 },
      { x: 1.7, z: -0.15, y: 0.32, s: 0.8 }
    ];
    pts.forEach(function (p) {
      var geo = new T.OctahedronGeometry(0.08 * p.s, 0);
      geo.scale(1, 1.3, 0.55);
      geo.translate(p.x, p.y, p.z);
      var cor = (p.s > 0.85) ? 0xeaf6fb : 0xbfe3f0;
      BRILHO.push(pinta(geo, cor, 0));
    });
  })();

  var matV = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var matB = new T.MeshBasicMaterial({ vertexColors: true });

  var gCorpo = BGU.mergeBufferGeometries(CORPO);
  grupo.add(new T.Mesh(gCorpo, matV));
  var gBrilho = BRILHO.length ? BGU.mergeBufferGeometries(BRILHO) : null;
  if (gBrilho) grupo.add(new T.Mesh(gBrilho, matB));

  function contarTri(geo) {
    if (!geo) return 0;
    return (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  }
  var custoTri = contarTri(gCorpo) + contarTri(gBrilho);

  return {
    grupo: grupo,
    custo: { dc: gBrilho ? 2 : 1, tri: custoTri },
    tipo: 'agua',
    meiaLarguraOcupada: MEIA
  };
};

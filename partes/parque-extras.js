/* parque-extras.js - dois brinquedos que faltavam no PARQUE (42, 0):

     giraGira    - o carrossel de chao que as criancas empurram: disco baixo de
                   4 gomos coloridos, eixo dourado no meio e 4 barras de mao.
     barraquinha - a tendinha de feira: balcao de madeira mel com tampo claro,
                   toldo de duas aguas listrado creme/coral sobre 2 postes,
                   plaquinha com estrelinha dourada e as coisinhas do balcao
                   (algodao-doce, caixote de macas e dois potes).

   NAMESPACE PROPRIO (PARQUE_BRINQUEDOS), assinatura function(T): estas pecas
   NAO entram em window.MUNDO_PARTES de proposito. montarPartes() monta tudo
   que existir la, e componente registrado por engano ja plantou castelo
   desmontado no meio da praca (armadilha 16 da skill). Quem monta escolhe
   onde: quem chama passa o THREE e posiciona o grupo.

   CONTRATO (partes/CONTRATO.md) - o que este arquivo NAO faz:
   sem luz nova, sem castShadow/receiveShadow, sem textura/TextureLoader/fetch/
   import, sem MeshStandardMaterial, sem emissive, sem acento em identificador.
   Corpo = UMA malha MeshLambertMaterial({vertexColors, flatShading}) sobre
   geometrias mescladas com mergeBufferGeometries. O que acende (so a estrelinha
   da placa) = uma segunda malha MeshBasicMaterial. Sombra = disco escuro
   PINTADO no chao (cor do gramado do parque, 0xc6dcb4, puxada para o cinza).

   ARMADILHAS RESPEITADAS AQUI (medido em Node com three r147, nao no olho):
   - mergeBufferGeometries devolve null CALADO se atributos/indice nao baterem:
     toda peca passa por `pinta`/`pintaLisa`, que fazem toNonIndexed e apagam o
     uv. Octahedron/Icosahedron nascem sem indice, Cylinder/Box/Circle com -
     normalizados no mesmo lugar.
   - os 4 gomos do disco NAO sao 4 cilindros sobrepostos (isso da faces
     coplanares piscando): e um CylinderGeometry por gomo com thetaStart/
     thetaLength. Os gomos so se encostam pela aresta e as laterais radiais nem
     existem (o setor de cilindro nasce aberto nos dois lados).
   - toldo de duas aguas: as abas NAO dividem plano na cumeeira - cada aba passa
     0.08 do apice e CRUZA a outra; a cumeeira ainda ganha um rufo por cima.
   - listras do toldo: encostar face a face divide plano, mas SO alargar tambem
     nao resolve (as 8 listras de uma agua nasciam no mesmo plano de topo, e a
     sobreposicao passava a ser dos TOPOS). A 1a rodada mediu 230 pares assim.
     Resolvido com 3 folgas independentes - largura, altura na normal e
     comprimento - explicadas na secao do toldo.
   - nada encosta exato: tampo afunda no balcao, poste afunda na viga, mastro
     afunda no cubo, ponta da barra afunda no disco, estrela sai 0.022 da placa.
   - pinta faz degrade pelo Y: em peca CHATA (CircleGeometry/ShapeGeometry)
     minY==maxY e TUDO cairia na cor escura - por isso sombra, tampa do cubo e
     estrela usam fBase 0 / pintaLisa.
   - ConeGeometry (que no r147 nasce com 1 triangulo degenerado por gomo) nao e
     usada: tudo e cilindro truncado, caixa, circulo ou poliedro.

   CUSTO MEDIDO (Node + three r147, contando triangulo a triangulo):
     giraGira    1 draw call, 388 triangulos - bbox 4.04 x 0.765 x 4.04 (disco r1.9)
     barraquinha 2 draw calls, 556 triangulos - bbox 2.90 x 2.500 x 2.01
   Menor Y = 0 exato nas duas. Zero pares de faces coplanares sobrepostas. */
window.PARQUE_BRINQUEDOS = window.PARQUE_BRINQUEDOS || {};

/* ---------- a pintura canonica do mundo (degrade vertical) ---------- */
function PARQUE_EXTRAS_pinta(T, geo, cor, fBase) {
  var CINZA = new T.Color(0x6a5a8f);
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

/* cor chapada, para peca CHATA e para a malha que acende (MeshBasic) */
function PARQUE_EXTRAS_pintaLisa(T, geo, cor) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  geo.deleteAttribute('uv');
  var c = new T.Color(cor);
  var n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new T.BufferAttribute(a, 3));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  return geo;
}

/* tubo reto entre dois pontos (cilindro aberto: sem tampa para z-fight) */
function PARQUE_EXTRAS_tubo(T, p0, p1, raio, seg) {
  var dir = new T.Vector3().subVectors(p1, p0);
  var len = dir.length();
  var g = new T.CylinderGeometry(raio, raio, len, seg, 1, true);
  var q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize());
  g.applyQuaternion(q);
  g.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2);
  return g;
}

/* ==================================================================== */
/* GIRA-GIRA                                                            */
/* ==================================================================== */
/* Disco de raio 1.9 e 0.18 de espessura, dividido em 4 gomos de cores
   alternadas (quente/frio/quente/frio, para nenhuma vizinha empatar). O disco
   flutua 0.13 do chao sobre um pe curto - e assim que o brinquedo de verdade e.
   No centro o cubo dourado baixo, o mastro e o castao. Saindo do mastro, 4
   barras de mao em "L" curvo (sobe, corre reta na altura de segurar 0.55, e
   mergulha na plataforma). As barras ficam no MEIO de cada gomo, nao na emenda.
   PIVO: centro, Y=0 e o CHAO. Altura total 0.765.
   CUSTO MEDIDO: 1 draw call, 388 triangulos. */
window.PARQUE_BRINQUEDOS.giraGira = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'giraGira';

  function pinta(geo, cor, fBase) { return PARQUE_EXTRAS_pinta(T, geo, cor, fBase); }
  function tubo(p0, p1, r, s) { return PARQUE_EXTRAS_tubo(T, p0, p1, r, s); }

  /* ---------- paleta (hex pedidos, sem clarear: o parque e ao ar livre e
       o volume vem do fBase, nao de subir pigmento) ---------- */
  var GOMOS = [0xf2789f, 0x9fb4d8, 0xf2c069, 0xa78bc9];   /* rosa, azul, amarelo, lilas */
  var DOURADO = 0xe9b44c, DOURADO_CLARO = 0xffd166;
  var METAL = 0xe8dce8;
  var PE = 0x9a86bb;

  var pecas = [];

  /* ---------- sombra pintada no gramado do parque ---------- */
  pecas.push(pinta(new T.CircleGeometry(2.02, 16).rotateX(-Math.PI / 2).translate(0, 0.012, 0),
    new T.Color(0xc6dcb4).lerp(new T.Color(0x6a5a8f), 0.30), 0.0));

  /* ---------- pe (0 -> 0.24; entra 0.02 no disco, sem tampa) ---------- */
  var pe = new T.CylinderGeometry(0.30, 0.38, 0.24, 8, 1, true);
  pe.translate(0, 0.12, 0);
  pecas.push(pinta(pe, PE, 0.22));

  /* ---------- DISCO: 4 gomos por thetaStart/thetaLength ----------
     Setor de cilindro nasce ABERTO nas duas faces radiais: os gomos vizinhos
     nem tem geometria na emenda, so compartilham aresta. Nada pisca.
     ⛔ ERA uma folha fina de 0.18 a 13 cm do chao e o brinquedo lia como
     tampa de panela. Agora e uma PLATAFORMA: 0.24 de espessura, piso a 0.46,
     e um aro mais escuro contornando para a borda existir de perfil. */
  var R_DISCO = 1.9, ESP = 0.24, DISCO_Y0 = 0.22, DISCO_Y1 = DISCO_Y0 + ESP;   /* 0.22 -> 0.46 */
  for (var g = 0; g < 4; g++) {
    var gomo = new T.CylinderGeometry(R_DISCO, R_DISCO, ESP, 8, 1, false,
      g * Math.PI / 2, Math.PI / 2);
    gomo.translate(0, DISCO_Y0 + ESP / 2, 0);
    pecas.push(pinta(gomo, GOMOS[g], 0.10));
  }
  /* aro da borda: mais largo que o disco, para nao dividir plano com ele */
  var aro = new T.CylinderGeometry(R_DISCO + 0.06, R_DISCO + 0.06, 0.10, 8, 1, true);
  aro.translate(0, DISCO_Y0 + 0.05, 0);
  pecas.push(pinta(aro, 0x8a7fa6, 0.16));

  /* ---------- EIXO: cubo dourado + mastro + castao ----------
     O mastro subiu junto com as barras: ele e quem as sustenta. */
  var cubo = new T.CylinderGeometry(0.30, 0.38, 0.26, 8, 1, true);   /* 0.40 -> 0.66 */
  cubo.translate(0, 0.53, 0);
  pecas.push(pinta(cubo, DOURADO, 0.16));
  pecas.push(pinta(new T.CircleGeometry(0.30, 8).rotateX(-Math.PI / 2).translate(0, 0.66, 0),
    DOURADO_CLARO, 0.0));                                            /* peca CHATA: fBase 0 */

  var mastro = new T.CylinderGeometry(0.085, 0.085, 0.34, 6, 1, true);  /* 0.62 -> 0.96 */
  mastro.translate(0, 0.79, 0);
  pecas.push(pinta(mastro, DOURADO, 0.14));

  var castao = new T.OctahedronGeometry(0.12);   /* cobre a boca do mastro */
  castao.rotateY(Math.PI / 4);
  castao.translate(0, 0.975, 0);
  pecas.push(pinta(castao, DOURADO_CLARO, 0.18));

  /* ---------- 4 BARRAS DE MAO ----------
     Perfil em (raio, altura): nasce DENTRO do mastro (ponta aberta escondida),
     sobe, CORRE NA ALTURA DE SEGURAR e mergulha dentro do disco.
     ⛔ A pega corria a 0.55 — altura de JOELHO para a crianca de 1,40 deste
     mundo, que teria de se agachar. Subiu para 0.86, que e onde a mao dela
     fecha em pe ao lado, e ainda da alcance sentada no piso (0.46).
     E o tubo era um arame de 0.055: foi para 0.075. */
  var PERFIL = [[0.03, 0.92], [0.52, 0.86], [1.42, 0.86], [1.74, 0.34]];
  var R_BARRA = 0.075;
  for (var b = 0; b < 4; b++) {
    var ang = Math.PI / 4 + b * Math.PI / 2;     /* meio do gomo, nao a emenda */
    var sx = Math.sin(ang), sz = Math.cos(ang);
    var pts = [];
    for (var k = 0; k < PERFIL.length; k++) {
      pts.push(new T.Vector3(PERFIL[k][0] * sx, PERFIL[k][1], PERFIL[k][0] * sz));
    }
    for (var s = 0; s < pts.length - 1; s++) {
      pecas.push(pinta(tubo(pts[s], pts[s + 1], R_BARRA, 5), METAL, 0.20));
    }
    /* juntas: tapam a boca dos tubos nas dobras */
    for (var j = 1; j <= 2; j++) {
      var junta = new T.OctahedronGeometry(0.095);
      junta.translate(pts[j].x, pts[j].y, pts[j].z);
      pecas.push(pinta(junta, METAL, 0.20));
    }
  }

  /* ---------- 4 ASSENTOS ----------
     Sem lugar de sentar o brinquedo nao diz para que serve. Ficam na EMENDA
     dos gomos (as barras ficam no meio), encostados na borda, na cor do gomo
     oposto para nenhum sumir no proprio fundo. */
  var COR_ASSENTO = [GOMOS[2], GOMOS[3], GOMOS[0], GOMOS[1]];
  for (var t2 = 0; t2 < 4; t2++) {
    var aA = t2 * Math.PI / 2;                     /* emenda entre gomos */
    var ax = Math.sin(aA) * 1.28, az = Math.cos(aA) * 1.28;
    var banco = new T.BoxGeometry(0.62, 0.20, 0.46);
    banco.rotateY(aA);
    banco.translate(ax, DISCO_Y1 + 0.10, az);      /* pousa no piso do disco */
    pecas.push(pinta(banco, COR_ASSENTO[t2], 0.14));
    /* encosto baixinho, recuado para nao dividir plano com o banco */
    var enc = new T.BoxGeometry(0.62, 0.26, 0.11);
    enc.rotateY(aA);
    enc.translate(ax + Math.sin(aA) * 0.20, DISCO_Y1 + 0.31, az + Math.cos(aA) * 0.20);
    pecas.push(pinta(enc, COR_ASSENTO[t2], 0.18));
  }

  /* ---------- 1 draw call ---------- */
  var malha = new T.Mesh(BGU.mergeBufferGeometries(pecas),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'giragira_malha';
  grupo.add(malha);

  return { grupo: grupo, custo: { dc: 1, tri: 388 } };
};

/* ==================================================================== */
/* BARRAQUINHA DE FEIRA                                                 */
/* ==================================================================== */
/* Balcao de madeira mel com tampo claro e faixa coral, dois postes que seguram
   a viga da cumeeira, e o toldo de DUAS AGUAS listrado creme/coral (9 listras
   por agua). Pendurada na aba da frente, a plaquinha lilas com a estrelinha
   dourada que acende. Sobre o tampo: algodao-doce numa haste, caixote com 3
   macas e dois potes.
   PIVO: centro da base, Y=0 e o CHAO. FRENTE (o balcao) em +Z.
   Largura 2.6 (2.90 com a beirada do toldo) x altura 2.50 x fundo 2.02.
   CUSTO MEDIDO: 2 draw calls (corpo Lambert + estrela Basic), 556 triangulos. */
window.PARQUE_BRINQUEDOS.barraquinha = function (T) {
  var BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'barraquinha';

  function pinta(geo, cor, fBase) { return PARQUE_EXTRAS_pinta(T, geo, cor, fBase); }
  function pintaLisa(geo, cor) { return PARQUE_EXTRAS_pintaLisa(T, geo, cor); }
  function caixa(lx, ly, lz, cx, cy, cz) {
    return new T.BoxGeometry(lx, ly, lz).translate(cx, cy, cz);
  }

  /* ---------- paleta ---------- */
  var MADEIRA = 0xd9a66c,      /* balcao e postes: madeira mel */
      TAMPO = 0xf6e4c8,        /* tampo claro */
      CREME = 0xfff3e8,        /* listra clara do toldo */
      CORAL = 0xe8536e,        /* listra coral do toldo + faixa do balcao */
      MADEIRA_ESC = 0xc9915a,  /* viga, caixote, tampas dos potes */
      PLACA = 0xa78bc9,        /* plaquinha lilas */
      OURO = 0xffd166,         /* estrelinha (MeshBasic) */
      ALGODAO = 0xffb6d5,
      MACA = 0xe2585f,
      POTE_A = 0x9fb4d8,
      POTE_B = 0xf2c069;

  var pecas = [];

  /* ---------- sombra pintada (elipse no gramado) ---------- */
  var sombra = new T.CircleGeometry(1, 14).rotateX(-Math.PI / 2);
  sombra.scale(1.45, 1, 0.95);
  sombra.translate(0, 0.012, 0.05);
  pecas.push(pinta(sombra, new T.Color(0xc6dcb4).lerp(new T.Color(0x6a5a8f), 0.30), 0.0));

  /* ---------- BALCAO (frente em +Z) ----------
     O corpo NAO chega ate os postes em Z: se chegasse, a face de baixo do
     balcao e a do poste dividiriam o plano y=0 com area em comum (o chao nao
     salva ninguem de z-fighting). Fica 0.035 na frente deles; o tampo, mais
     fundo, e quem passa por cima e amarra os dois. */
  /* corpo: x -1.10..1.10, y 0..0.86, z 0.10..0.72 */
  pecas.push(pinta(caixa(2.20, 0.86, 0.62, 0, 0.43, 0.41), MADEIRA, 0.14));
  /* tampo claro: afunda 0.03 no corpo (nada encosta exato), y 0.83..0.93 */
  pecas.push(pinta(caixa(2.44, 0.10, 0.84, 0, 0.88, 0.36), TAMPO, 0.10));
  /* faixa coral: sai 0.035 da face da frente do corpo */
  pecas.push(pinta(caixa(2.16, 0.16, 0.05, 0, 0.72, 0.73), CORAL, 0.10));

  /* ---------- POSTES + VIGA DA CUMEEIRA ----------
     Os 2 postes ficam na LINHA DA CUMEEIRA (z=0): assim o toldo se equilibra
     neles como um guarda-sol, e nao fica aba pendurada no ar. */
  /* postes: y 0..2.24, topo escondido DENTRO da viga */
  pecas.push(pinta(caixa(0.13, 2.24, 0.13, -1.12, 1.12, 0), MADEIRA, 0.18));
  pecas.push(pinta(caixa(0.13, 2.24, 0.13, 1.12, 1.12, 0), MADEIRA, 0.18));
  /* viga: y 2.20..2.36, encosta por dentro nas duas aguas */
  pecas.push(pinta(caixa(2.50, 0.16, 0.18, 0, 2.28, 0), MADEIRA_ESC, 0.16));

  /* ---------- TOLDO DE DUAS AGUAS ----------
     apice (cumeeira) em y 2.40, beiral em y 2.00 a z +-0.92.
     9 listras por agua (numero IMPAR de proposito: a alternancia fecha com
     creme nas duas beiradas, com 8 uma beirada saia coral e a outra creme).
     TRES folgas, cada uma matando um jeito de piscar:
      (a) largura = passo + folga, entao vizinhas se INTERPENETRAM em X
          (encostadas exato dividiriam plano);
      (b) so isso NAO bastava - as listras de uma agua nascem todas no MESMO plano
          de topo, e a interpenetracao de (a) fazia esses topos se sobreporem.
          Por isso a listra IMPAR sobe 0.012 na normal da agua: fica num plano
          paralelo proprio (e de quebra da relevo de toldo costurado);
      (c) a listra impar tambem e 0.05 mais curta, senao as faces das PONTAS
          (que a folga (b) nao desloca) se sobrepunham na mesma medida.
     E a folga da agua de tras e menor que a da frente (0.008 x 0.020): as duas
     aguas se CRUZAM na cumeeira, e com a mesma largura as faces laterais das
     duas cairiam no mesmo plano dentro do cruzamento. */
  var TOLDO_L = 2.60, N_LISTRA = 9, PASSO = TOLDO_L / N_LISTRA;   /* IMPAR: creme nas duas beiradas */
  var RUN = 0.92, RISE = 0.40;
  var ANG = Math.atan2(RISE, RUN);
  var COMP = Math.sqrt(RUN * RUN + RISE * RISE) + 0.16;   /* 0.08 de sobra em cada ponta */
  var APICE = 2.40, BEIRAL = APICE - RISE;                /* 2.40 -> 2.00 */
  for (var lado = 0; lado < 2; lado++) {
    var sinal = lado === 0 ? 1 : -1;                       /* +1 = agua da frente (+Z) */
    var folga = lado === 0 ? 0.020 : 0.008;
    var nY = Math.cos(ANG), nZ = Math.sin(ANG) * sinal;    /* normal da agua */
    for (var i = 0; i < N_LISTRA; i++) {
      var impar = (i % 2 !== 0);
      var cx = -TOLDO_L / 2 + (i + 0.5) * PASSO;
      var off = impar ? 0.012 : 0;
      var lis = new T.BoxGeometry(PASSO + folga, 0.06, impar ? COMP - 0.05 : COMP);
      lis.rotateX(sinal * ANG);
      lis.translate(cx + 0, (APICE + BEIRAL) / 2 + off * nY, sinal * RUN / 2 + off * nZ);
      pecas.push(pinta(lis, impar ? CORAL : CREME, 0.12));
    }
  }
  /* rufo da cumeeira: tapa o cruzamento das duas aguas (x +-1.28: fora de
     qualquer plano lateral de listra, que vao de +-1.304 a +-1.31) */
  pecas.push(pinta(caixa(2.56, 0.11, 0.22, 0, 2.445, 0), TAMPO, 0.12));

  /* ---------- PLAQUINHA pendurada na aba da frente ---------- */
  /* hastes: sobem ate 2.02, dentro do toldo tanto na listra rasa quanto na
     alta (0.012 acima), e descem ate dentro da placa */
  pecas.push(pinta(caixa(0.035, 0.32, 0.035, -0.22, 1.86, 0.86), MADEIRA_ESC, 0.18));
  pecas.push(pinta(caixa(0.035, 0.32, 0.035, 0.22, 1.86, 0.86), MADEIRA_ESC, 0.18));
  /* placa: y 1.36..1.74, z 0.83..0.89 */
  pecas.push(pinta(caixa(0.66, 0.38, 0.06, 0, 1.55, 0.86), PLACA, 0.16));

  /* ---------- COISINHAS SOBRE O TAMPO (topo do tampo em y 0.93) ---------- */
  /* algodao-doce: haste afunda 0.04 no tampo. Haste em madeira escura e um
     pouco mais grossa de proposito - creme fino sobre o forro creme do toldo
     sumia de longe e a bola parecia flutuar. */
  var haste = new T.CylinderGeometry(0.026, 0.026, 0.46, 5, 1, true);
  haste.translate(0.78, 1.12, 0.32);
  pecas.push(pinta(haste, MADEIRA_ESC, 0.14));
  var doce = new T.IcosahedronGeometry(0.17, 0);
  doce.scale(1.0, 0.95, 0.95);
  doce.translate(0.78, 1.44, 0.32);
  pecas.push(pinta(doce, ALGODAO, 0.12));

  /* caixote + 3 macas */
  pecas.push(pinta(caixa(0.46, 0.14, 0.36, -0.66, 0.96, 0.32), MADEIRA_ESC, 0.18));
  var MACAS = [[-0.77, 1.06, 0.25], [-0.57, 1.05, 0.36], [-0.68, 1.14, 0.33]];
  for (var m = 0; m < MACAS.length; m++) {
    var maca = new T.IcosahedronGeometry(0.085, 0);
    maca.rotateY(m * 0.7);
    maca.translate(MACAS[m][0], MACAS[m][1], MACAS[m][2]);
    pecas.push(pinta(maca, MACA, 0.14));
  }

  /* dois potes: corpo aberto em cima, tampa cobrindo a boca por fora.
     Afastados 0.36 (> 2 x 0.128 da tampa): encostando, as duas tampas
     dividiriam o plano de baixo com area em comum. */
  var POTES = [[-0.12, POTE_A], [0.24, POTE_B]];
  for (var p = 0; p < POTES.length; p++) {
    var corpo = new T.CylinderGeometry(0.115, 0.10, 0.26, 8, 1, true);   /* 0.90 -> 1.16 */
    corpo.translate(POTES[p][0], 1.03, 0.30);
    pecas.push(pinta(corpo, POTES[p][1], 0.14));
    var tampa = new T.CylinderGeometry(0.128, 0.128, 0.06, 8, 1, false); /* 1.13 -> 1.19 */
    tampa.translate(POTES[p][0], 1.16, 0.30);
    pecas.push(pinta(tampa, MADEIRA_ESC, 0.18));
  }

  /* ---------- corpo: 1 draw call ---------- */
  var malha = new T.Mesh(BGU.mergeBufferGeometries(pecas),
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  malha.name = 'barraquinha_malha';
  grupo.add(malha);

  /* ---------- o que ACENDE: estrelinha dourada (MeshBasic) ----------
     Sai 0.022 da face da placa (z 0.89) - saliencia da regra anti-z-fight. */
  var forma = new T.Shape();
  for (var e = 0; e < 10; e++) {
    /* comeca em +PI/2: PONTA PARA CIMA. Com -PI/2 a estrela nasce de ponta
       para baixo (defeito visto no render de frente da 1a rodada). */
    var a = Math.PI / 2 + e * Math.PI / 5;
    var rr = (e % 2 === 0) ? 0.13 : 0.058;
    var ex = Math.cos(a) * rr, ey = Math.sin(a) * rr;
    if (e === 0) forma.moveTo(ex, ey); else forma.lineTo(ex, ey);
  }
  forma.closePath();
  var estrela = new T.ShapeGeometry(forma);
  estrela.translate(0, 1.55, 0.912);
  var malhaLuz = new T.Mesh(pintaLisa(estrela, OURO),
    new T.MeshBasicMaterial({ vertexColors: true }));
  malhaLuz.name = 'barraquinha_luz';
  grupo.add(malhaLuz);

  return { grupo: grupo, custo: { dc: 2, tri: 556 } };
};

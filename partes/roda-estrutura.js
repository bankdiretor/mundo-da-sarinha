/* parteRodaEstrutura -- reforca estruturalmente as 4 pernas da roda-gigante
   (parque.js, NAO editado -- so leio as coordenadas ja publicadas la) com
   gilding dourado (aneis + pezinhos) e contraventamento diagonal (barras +
   presilhas), atendendo ao parecer do Diretor na Rodada 1: as pernas bordo
   (#e8536e) pesadas ganham um "eco dourado" do aro/estrela, sem precisar
   mudar a cor delas (parque.js nao e editavel).
   Contrato: partes/CONTRATO.md.

   Referencia (parque.js, NAO editado, so leitura):
     eixo da roda-gigante: (43.5, 9.2, 0)
     as 4 pernas (colisores ja existentes, raio 0.5, ja bloqueiam o jogador):
       CylinderGeometry(0.26 topo, 0.34 base, altura 9.8, 7 segmentos)
       .rotateX(dz*0.20)  -- leve inclinacao em A --
       .translate(43.5+dx, 4.9, dz*1.9)   dx em [-2.4,2.4], dz em [-1,1]
       ou seja: (41.1,~4.9,-1.9) (45.9,~4.9,-1.9) (41.1,~4.9,1.9) (45.9,~4.9,1.9)
     esta peca reproduz A MESMA sequencia de transformacao (rotateX e so
     depois translate) para que aneis/pezinhos/presilhas abracem a perna
     inclinada de verdade, sem chutar posicao. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteRodaEstrutura = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'roda-estrutura';

  var RG = { x: 43.5, y: 9.2, z: 0 };
  var H = RG.y + 0.6;          /* 9.8 -- altura total da perna, igual parque.js */
  var HALF = H / 2;            /* 4.9 -- translate.y da perna em parque.js */
  var CINZA = new T.Color(0x6a5a8f);

  function criaPerna(dx, dz) {
    return { dx: dx, dz: dz, theta: dz * 0.20, baseX: RG.x + dx, baseZ: RG.z + dz * 1.9 };
  }
  var P_NO = criaPerna(-2.4, -1), P_NE = criaPerna(2.4, -1);
  var P_SO = criaPerna(-2.4, 1), P_SE = criaPerna(2.4, 1);
  var PERNAS = [P_NO, P_NE, P_SO, P_SE];
  /* pares na mesma face (mesmo dx, dz opostos) -- e onde entra o suporte lateral */
  var LADOS = [
    { x: P_NO.baseX, a: P_NO, b: P_SO },
    { x: P_NE.baseX, a: P_NE, b: P_SE }
  ];

  /* raio real da perna (cone reto: 0.34 na base ate 0.26 no topo) numa
     altura LOCAL ly (medida a partir do CENTRO da perna, faixa -HALF..HALF) */
  function raioPerna(ly) {
    var f = (ly + HALF) / H;
    return 0.34 + (0.26 - 0.34) * f;
  }
  /* ponto no eixo da perna numa altura MUNDO alvo (desfaz a inclinacao) */
  function pontoAltura(perna, worldY) {
    var ly = (worldY - HALF) / Math.cos(perna.theta);
    return { ly: ly, x: perna.baseX, y: worldY, z: perna.baseZ + ly * Math.sin(perna.theta) };
  }
  /* leva uma geometria local (construida em torno do proprio eixo Y, altura
     local ly) e aplica A MESMA rotacao+translacao que parque.js aplica na
     propria perna -- e assim que os enfeites "grudam" na perna inclinada
     de verdade em vez de flutuar num cilindro reto imaginario */
  function montaNaPerna(geo, perna, ly) {
    geo.translate(0, ly, 0);
    geo.rotateX(perna.theta);
    geo.translate(perna.baseX, HALF, perna.baseZ);
    return geo;
  }
  /* armadilha ja paga (CONTRATO.md): Torus/Cylinder nascem COM indice,
     Icosahedron nasce SEM -- misturar as duas familias no merge devolve
     null em silencio. Normalizo tudo antes de empilhar. */
  function normalizarIndice(geo) { return geo.index ? geo.toNonIndexed() : geo; }
  /* gradiente vertical (mundo Y), ~14-18% mais escuro puxado pro cinza-
     azulado na base -- regra do contrato pra nao ficar "chapado" */
  function pinta(geo, cor, fBase) {
    var c0 = new T.Color(cor), c1 = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.18 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var c = c1.clone().lerp(c0, Math.min(1, ((ys[k] - minY) / faixa) * 1.3));
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }

  var pecasCorpo = [];    /* DC1 -- Lambert vertexColors: contraventamento + presilhas creme */
  var pecasBrilho = [];   /* DC2 -- Basic dourado flat (igual roda-plataforma): aneis + pezinhos + rebites */

  /* ================= 1) GILDING DAS PERNAS: aneis dourados =================
     3 aneis por perna em alturas MUNDO diferentes (1.5 / 3.5 / 5.5); o raio
     de cada anel acompanha o raio REAL da perna naquela altura (cone reto)
     mais uma folga fixa -- abraca a perna de verdade em vez de flutuar. */
  (function aneisDourados() {
    var ALTURAS = [1.5, 3.5, 5.5], TUBO = 0.055, FOLGA = 0.07;
    PERNAS.forEach(function (perna) {
      ALTURAS.forEach(function (altura) {
        var ly = (altura - HALF) / Math.cos(perna.theta);
        var r = raioPerna(ly) + FOLGA;
        var g = new T.TorusGeometry(r, TUBO, 6, 14);
        g.rotateX(Math.PI / 2);         /* furo do toro alinhado com o eixo Y local (abraca cilindro vertical) */
        montaNaPerna(g, perna, ly);
        g = normalizarIndice(g);
        g.deleteAttribute('uv');
        pecasBrilho.push(g);
      });
    });
  })();

  /* ================= 2) PEZINHOS DECORATIVOS na base das 4 pernas =================
     flare (cone reto alargado, funde com a superficie real da perna) mais
     uma placa fina por baixo (sapata) -- dourados, plantados exatamente
     onde a propria perna toca o chao (ly = -HALF, ponto real, nao chutado). */
  (function pezinhos() {
    var ALT_FLARE = 0.26, ALT_PLACA = 0.07;
    PERNAS.forEach(function (perna) {
      var rBase = raioPerna(-HALF);   /* 0.34 -- raio real da perna na base */

      var flare = new T.CylinderGeometry(rBase * 1.0, rBase * 1.45, ALT_FLARE, 8);
      flare.translate(0, ALT_FLARE / 2, 0);
      montaNaPerna(flare, perna, -HALF);
      flare = normalizarIndice(flare);
      flare.deleteAttribute('uv');
      pecasBrilho.push(flare);

      var placa = new T.CylinderGeometry(rBase * 1.6, rBase * 1.6, ALT_PLACA, 8);
      placa.translate(0, -ALT_PLACA / 2, 0);
      montaNaPerna(placa, perna, -HALF);
      placa = normalizarIndice(placa);
      placa.deleteAttribute('uv');
      pecasBrilho.push(placa);
    });
  })();

  /* ================= 3) SUPORTE LATERAL (contraventamento em X) =================
     barras diagonais creme ligando as 2 pernas de cada face (mesmo x, dz
     opostos) na altura media 2.5-4.0m, formando um X; presilhas onde cada
     barra encosta na perna e um rebite dourado no cruzamento do X (eco do
     aro/estrela, como pedido pelo Diretor). */
  (function contraventamento() {
    var Y_TOPO = 4.0, Y_BASE = 2.5, RAIO_BARRA = 0.075;

    /* barra reta entre 2 pontos que SEMPRE tem o mesmo x (mesma face) --
       so precisa de UMA rotacao em X, igual o resto do arquivo */
    function barra(p1, p2) {
      var dy = p2.y - p1.y, dz = p2.z - p1.z;
      var comp = Math.sqrt(dy * dy + dz * dz);
      var phi = Math.atan2(dz, dy);
      var g = new T.CylinderGeometry(RAIO_BARRA, RAIO_BARRA * 0.85, comp, 8);
      g.rotateX(phi);
      g.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2);
      return g;
    }
    function presilha(perna, ly) {
      var r = raioPerna(ly) + 0.05;
      var g = new T.TorusGeometry(r, 0.045, 5, 10);
      g.rotateX(Math.PI / 2);
      montaNaPerna(g, perna, ly);
      return g;
    }

    LADOS.forEach(function (lado) {
      var a = lado.a, b = lado.b;
      var pABase = pontoAltura(a, Y_BASE), pATopo = pontoAltura(a, Y_TOPO);
      var pBBase = pontoAltura(b, Y_BASE), pBTopo = pontoAltura(b, Y_TOPO);

      /* as 2 diagonais do X */
      [barra(pABase, pBTopo), barra(pATopo, pBBase)].forEach(function (g) {
        g = normalizarIndice(g);
        pinta(g, 0xf7f2e8, 0.16);
        pecasCorpo.push(g);
      });

      /* presilha creme nos 4 pontos onde as barras encostam nas pernas */
      [
        { perna: a, ly: pABase.ly }, { perna: a, ly: pATopo.ly },
        { perna: b, ly: pBBase.ly }, { perna: b, ly: pBTopo.ly }
      ].forEach(function (pt) {
        var g = normalizarIndice(presilha(pt.perna, pt.ly));
        pinta(g, 0xf7f2e8, 0.14);
        pecasCorpo.push(g);
      });

      /* rebite dourado no cruzamento do X (as 2 pernas da face dividem o
         mesmo x, entao o X inteiro vive no plano x=lado.x) */
      var mZ = (pABase.z + pATopo.z + pBBase.z + pBTopo.z) / 4;
      var mY = (Y_TOPO + Y_BASE) / 2;
      var cruz = new T.IcosahedronGeometry(0.10, 0);
      cruz.translate(lado.x, mY, mZ);
      cruz = normalizarIndice(cruz);
      cruz.deleteAttribute('uv');
      pecasBrilho.push(cruz);
    });
  })();

  /* ---------- monta os 2 draw calls ---------- */
  var matCorpo = new T.MeshLambertMaterial({ vertexColors: true });
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecasCorpo), matCorpo));
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecasBrilho), ctx.materialBrilho(0xffd166)));

  /* sem colisor novo: as 4 pernas ja tem colisor (raio 0.5) em parque.js;
     aneis/pezinhos/barras ficam dentro desse raio, e so decoracao visual */

  return {
    grupo: grupo,
    update: function (t, dt) { },
    /* medido com THREE r147 real (script Node separado, fora deste arquivo,
       somando geometry.index ? index.count/3 : position.count/3 por malha):
       DC1 (corpo, contraventamento+presilhas creme) =  928 tri
       DC2 (brilho, aneis+pezinhos+rebites dourados)  = 2312 tri */
    custo: { dc: 2, tri: 3240 }
  };
};

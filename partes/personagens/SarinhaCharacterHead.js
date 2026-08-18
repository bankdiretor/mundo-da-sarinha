/* SarinhaCharacterHead — CHAR-01: a cabeca DEFINITIVA com rosto.
   Substitui o HeadPlaceholder do CHAR-00 encaixando no HeadPivot que ja existe:
   nao mexe no rig, nao mexe nos anchors, nao move o corpo.
   Ficha: fichas/CHAR-01-CABECA-ROSTO.md

   Medida oficial (Ivan, 18/08/2026): cabeca = 32% da altura-base do personagem
   = ~0.83u quando o personagem tem 2.60. Aqui ela e construida na escala CRUA
   do CHAR-00 (0.63 de altura); o CharacterBase normaliza na saida.

   Estrutura devolvida:
     CharacterHead (Group, pivo na BASE da cabeca)
       ├ HeadMesh      — cranio + orelhas, mesclados (1 malha)
       └ FaceDetails   — olhos, boca e bochechas, mesclados (1 malha)

   Contrato do mundo: 1 MeshLambertMaterial vertexColors+flatShading, cor por
   vertice, sem luz, sem sombra real, sem textura, sem import/export. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  /* medidas na escala CRUA do CHAR-00 (personagem cru = 1.974) */
  var H = {
    raio:        0.35,
    escala:      [1.00, 0.90, 0.81],  /* X 0.700 · Y 0.630 · Z 0.567 */
    taper:       0.13,                /* base afunilada: o queixinho */
    achataFace:  0.14,                /* frente um pouco mais plana que a nuca */
    seg:         [12, 8],             /* facetas visiveis, como manda o estilo */

    /* orelhas: volumes simples, meio enterrados no cranio, na altura dos olhos */
    orelhaRaio:  0.072,
    orelhaSeg:   [5, 4],
    orelhaX:     0.325,
    orelhaY:     0.010,
    orelhaZ:    -0.015,
    orelhaEscala:[0.60, 1.10, 0.90],

    /* ⚠️ posicoes LIDAS DA FICHA VISUAL (medidas no painel 1, em % da cabeca),
       nao do texto do prompt: olhos a 46% do topo (LEVEMENTE acima do centro),
       sobrancelhas a 36%, boca a 68%, bochechas a 52%. */
    olhoX:       0.133,
    olhoY:       0.025,
    /* ⚠️ CONTORNO escuro atras da esclera. MEDIDO: a esclera branca renderiza a
       0.60 de luminancia e a pele da testa a 0.55 — o "branco" do olho e quase
       igual a pele, e sem contorno o olho vira um buraco preto sem forma. A
       ficha do GPT tem esse contorno; eu e que nao tinha copiado. */
    /* v1.2 (Face Art Pass): contorno MAIS FINO — ele continua sendo o que separa
       o olho da pele (ver armadilha 2), mas com 0.0045 de espessura ele lê como
       desenho do olho e nao como armacao de oculos. */
    contornoRaio:0.0715,
    contornoEscalaY:1.38,
    /* olho OVAL VERTICAL (razao 1.38, era 1.18 quase circular) */
    olhoRaio:    0.067,
    olhoEscalaY: 1.38,
    /* pupila = 68% da area da esclera (era 40%): o olhar ganha calor.
       ⚠️ nao passar disso — a 74% ela engole a esclera e vira buraco preto. */
    pupilaRaio:  0.057,
    pupilaEscalaY:1.30,
    pupilaY:    -0.002,
    brilhoRaio:  0.016,
    brilhoDX:    0.019,
    brilhoDY:    0.030,

    /* sobrancelhas: a FICHA tem (o texto dizia "opcional"). Sao elas que dao a
       expressao curiosa e tiram a cara de boneco vazio.
       v1.2: mais CURTAS (79° em vez de 101°) e mais FINAS (0.012 em vez de
       0.021) — grossa e comprida lia como SURPRESA, nao como gentileza. */
    sobrancelhaY:      0.092,
    sobrancelhaRaioInt:0.056,
    sobrancelhaRaioExt:0.068,
    sobrancelhaArco:   [0.28, 0.44],   /* [inicio, comprimento] em voltas de PI */
    sobrancelhaEscalaY:0.85,

    /* boca: semicirculo (boquinha aberta sorrindo). v1.2: mais LARGA, mesma
       altura — sorriso mais aberto sem virar bocarra */
    bocaY:      -0.118,
    bocaRaio:    0.072,
    bocaEscalaY: 0.52,

    /* bochechas discretas. v1.2: desceram, senao o olho (agora mais alto)
       encostava nelas */
    bochechaX:   0.238,
    bochechaY:  -0.075,
    bochechaRaio:0.046,
    bochechaEscalaY:0.70,

    /* ⚠️ folgas em Z. A superficie da cabeca e curva: cada elemento facial senta
       na altura dele + um degrau. Entre as CAMADAS do olho tambem: esclera,
       pupila e brilho coplanares piscariam (z-fighting). */
    degrauFace:  0.006,
    degrauCamada:0.004
  };

  var CORES = {
    esclera:  0xfff6ef,   /* branco quente */
    pupila:   0x2a1a16,   /* marrom escuro quase preto */
    brilho:   0xfffdf8,
    boca:     0x7d3340,   /* vinho suave */
    bochecha: 0xf2a3a8,   /* rosa coral bem suave */
    sobrancelha: 0x5a3a2c,/* marrom suave (v1.2: era 0x4a2e22, duro demais) */
    contorno: 0x3b241c    /* delineado que separa o olho da pele */
  };

  var CINZA = null, BRANCO = null;

  /* pinta canonica do mundo (mesma do CHAR-00): normaliza uv/indice — sem isso o
     mergeBufferGeometries devolve null EM SILENCIO — e faz o degrade vertical.
     fBase negativo CLAREIA a base (compensa a luz noturna do mundo, que apaga
     a barriga dos volumes); 0 = cor chapada, usado nos detalhes do rosto. */
  function pinta(T, geo, cor, fBase) {
    if (!CINZA) { CINZA = new T.Color(0x6a5a8f); BRANCO = new T.Color(0xffffff); }
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    if (fBase === undefined) fBase = 0.10;
    var cTopo = new T.Color(cor),
        cBase = (fBase < 0) ? new T.Color(cor).lerp(BRANCO, -fBase)
              : (fBase === 0) ? new T.Color(cor)
                              : new T.Color(cor).lerp(CINZA, fBase);
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

  /* raios do elipsoide da cabeca (antes das deformacoes) */
  function raios() {
    return { a: H.raio * H.escala[0], b: H.raio * H.escala[1], c: H.raio * H.escala[2] };
  }

  /* onde fica a superficie frontal na coordenada (x,y): usa a equacao do
     elipsoide. Sem isso, os elementos do rosto ou afundam ou flutuam nas
     bordas, porque a face e CURVA e nao um plano. */
  function zDaFace(x, y) {
    var r = raios();
    var k = 1 - (x * x) / (r.a * r.a) - (y * y) / (r.b * r.b);
    if (k <= 0) return 0;
    var z = r.c * Math.sqrt(k);
    return z * (1 - H.achataFace);   /* a frente e um pouco mais plana */
  }

  /* cranio: esfera achatada, afunilada embaixo e com a frente aplainada */
  function cranio(T, corPele) {
    var g = new T.SphereGeometry(H.raio, H.seg[0], H.seg[1]);
    g.scale(H.escala[0], H.escala[1], H.escala[2]);
    var pos = g.attributes.position, r = raios(), i, x, y, z, f, k;
    for (i = 0; i < pos.count; i++) {
      x = pos.getX(i); y = pos.getY(i); z = pos.getZ(i);
      if (y < 0) {                       /* queixinho: estreita a metade de baixo */
        f = Math.min(1, -y / r.b);
        k = 1 - H.taper * f * f;
        x *= k; z *= k;
      }
      if (z > 0) z *= (1 - H.achataFace);   /* face frontal mais plana que a nuca */
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return pinta(T, g, corPele, -0.34);     /* clareia a base: a luz do mundo apaga */
  }

  function orelha(T, corPele, lado) {
    var g = new T.SphereGeometry(H.orelhaRaio, H.orelhaSeg[0], H.orelhaSeg[1]);
    g.scale(H.orelhaEscala[0], H.orelhaEscala[1], H.orelhaEscala[2]);
    g.translate(lado * H.orelhaX, H.orelhaY, H.orelhaZ);
    return pinta(T, g, corPele, -0.20);
  }

  /* disco do rosto: circulo achatado, assentado na superficie curva e virado
     para +Z (a frente do personagem) */
  function discoFacial(T, raio, x, y, camada, cor, escalaY, segmentos) {
    var g = new T.CircleGeometry(raio, segmentos || 10);
    if (escalaY && escalaY !== 1) g.scale(1, escalaY, 1);
    g.translate(x, y, zDaFace(x, y) + H.degrauFace + camada * H.degrauCamada);
    return pinta(T, g, cor, 0);
  }

  /* sobrancelha: arco fino (segmento de anel) acima do olho */
  function sobrancelha(T, lado) {
    var g = new T.RingGeometry(H.sobrancelhaRaioInt, H.sobrancelhaRaioExt, 7, 1,
                               Math.PI * H.sobrancelhaArco[0], Math.PI * H.sobrancelhaArco[1]);
    g.scale(1, H.sobrancelhaEscalaY, 1);
    /* ⛔ NAO espelhar com scale(-1,1,1): inverte a orientacao das faces e a
       sobrancelha esquerda some no backface culling (aconteceu). O arco ja e
       simetrico em torno de PI/2, entao a mesma geometria serve nos dois lados. */
    var x = lado * H.olhoX, y = H.sobrancelhaY;
    g.translate(x, y, zDaFace(x, y) + H.degrauFace);
    return pinta(T, g, CORES.sobrancelha, 0);
  }

  /* boca: semicirculo com o lado reto em cima = boquinha aberta sorrindo */
  function boca(T) {
    var g = new T.CircleGeometry(H.bocaRaio, 9, Math.PI, Math.PI);
    g.scale(1, H.bocaEscalaY, 1);
    g.translate(0, H.bocaY, zDaFace(0, H.bocaY) + H.degrauFace);
    return pinta(T, g, CORES.boca, 0);
  }

  window.SARINHA_PERSONAGENS.createSarinhaCharacterHead = function (ctx, opts) {
    var T = ctx.T, BGU = ctx.BGU || T.BufferGeometryUtils;
    opts = opts || {};
    var skinColor = opts.skinColor === undefined ? 0xD8A27E : opts.skinColor,
        showFace  = opts.showFace  === undefined ? true     : opts.showFace,
        /* ⚠️ EXCECAO JUSTIFICADA ao flat shading (contrato mestre item 30 preve
           "raras excecoes em elementos especificos"): com 8 aneis e faces planas,
           a luz noturna do mundo vira BANDAS horizontais, e a banda dos olhos cai
           inteira na sombra — o rosto some. Interpolar a normal SO no cranio
           devolve um degrade continuo. O corpo inteiro segue facetado. */
        suave     = opts.flatShading === undefined ? true : !opts.flatShading,
        material  = opts.material || new T.MeshLambertMaterial(
                      { vertexColors: true, flatShading: !suave });

    var grupo = new T.Group();
    grupo.name = 'CharacterHead';

    var alturaCabeca = H.raio * H.escala[1] * 2;
    var centroY = H.raio * H.escala[1];      /* pivo na BASE: o conteudo sobe meia altura */

    /* --- HeadMesh: cranio + 2 orelhas numa malha so --- */
    var pecasCranio = [cranio(T, skinColor), orelha(T, skinColor, -1), orelha(T, skinColor, 1)];
    var geoCranio = BGU.mergeBufferGeometries(pecasCranio);
    if (!geoCranio) throw new Error('merge do cranio devolveu null');
    var headMesh = new T.Mesh(geoCranio, material);
    headMesh.name = 'HeadMesh';
    headMesh.position.y = centroY;
    grupo.add(headMesh);

    /* --- FaceDetails: olhos (3 camadas), boca e bochechas numa malha so --- */
    if (showFace) {
      var f = [], lado;
      for (lado = -1; lado <= 1; lado += 2) {
        var ox = lado * H.olhoX;
        /* camadas 0..3 = contorno · esclera · pupila · brilho. Os degraus em Z
           evitam o z-fighting de discos no mesmo plano (armadilha ja paga). */
        f.push(discoFacial(T, H.contornoRaio, ox, H.olhoY, 0, CORES.contorno, H.contornoEscalaY, 14));
        f.push(discoFacial(T, H.olhoRaio, ox, H.olhoY, 1, CORES.esclera, H.olhoEscalaY, 14));
        f.push(discoFacial(T, H.pupilaRaio, ox, H.olhoY + H.pupilaY, 2, CORES.pupila, H.pupilaEscalaY, 12));
        f.push(discoFacial(T, H.brilhoRaio, ox + H.brilhoDX, H.olhoY + H.brilhoDY, 3, CORES.brilho, 1, 6));
        f.push(discoFacial(T, H.bochechaRaio, lado * H.bochechaX, H.bochechaY, 0,
                           CORES.bochecha, H.bochechaEscalaY, 8));
        f.push(sobrancelha(T, lado));
      }
      f.push(boca(T));
      var geoFace = BGU.mergeBufferGeometries(f);
      if (!geoFace) throw new Error('merge do rosto devolveu null');
      var faceMesh = new T.Mesh(geoFace, material);
      faceMesh.name = 'FaceDetails';
      faceMesh.position.y = centroY;
      grupo.add(faceMesh);
    }

    grupo.userData = {
      type: 'SarinhaMiniHead',
      version: '1.0',
      expression: 'GentleHappy',
      headHeight: alturaCabeca,
      measures: H
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.HEAD_MEASURES = H;
  window.SARINHA_PERSONAGENS.HEAD_HEIGHT = H.raio * H.escala[1] * 2;
})();

/* SarinhaHairCurly01 — CHAR-05: cabelo CACHEADO do Sarinha Mini Style.
   Senta no mesmo HairAnchor do CHAR-02/03/04 e acompanha o HeadPivot.

   A ideia da peca: nao existe "cacho por cacho" dentro do orcamento. O que faz
   ler como massa de cachos e (a) uma silhueta REDONDA e mais LARGA que o cranio,
   e (b) o RAIO da casca perturbado por tres ondas de frequencias diferentes em
   ANGULO e em ALTURA — montinhos e vales espalhados, nunca alinhados. Com
   flatShading cada montinho vira um punhado de facetas: cacho low-poly.

   Comprimento CURTO/MEDIO: a barra para na altura do queixo (a cabeca termina em
   y = -0.315), nao vira cortina de peito como o CHAR-03/04.

   Contrato do mundo: 1 MeshLambertMaterial vertexColors + flatShading, cor por
   vertice, sem luz, sem sombra real, sem textura, sem import/export. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  /* escala CRUA do sistema (personagem cru = 1.974; cabeca com centro em y=0
     local e raios 0.350 / 0.315 / 0.2835). O queixo fica em y = -0.315. */
  var C = {
    raioCabecaX: 0.350,
    raioCabecaY: 0.315,
    raioCabecaZ: 0.2835,
    achataFace:  0.14,

    /* espessura GORDA de proposito: e ela que segura o relevo dos cachos sem
       deixar nenhum vale afundar dentro do cranio (ver comentario do relevo). */
    espessura:   0.068,
    volumeTopo:  0.026,
    volumeNuca:  0.030,

    /* ⭐ O QUE FAZ O CACHEADO Nº1: a massa e mais LARGA que a cabeca.
       O raio horizontal e multiplicado por este fator ANTES de qualquer volume;
       a forma base continua sendo o cranio (armadilha nº 2), so que dilatado no
       plano horizontal — o topo segue em y = raioCabecaY, entao nao nasce cupula
       nem bico de perfil. */
    largura:     1.14,

    /* onde o cabelo termina, em y local.
       ⚠️ MEDIDO: a barra NAO e o ponto mais baixo da peca. A casca e grossa e o
       relevo incha na direcao radial, e no fim da saia essa direcao aponta para
       BAIXO — a ponta desce mais ~0.08 do que o corte diz. Com corteAtras -0.330
       a ponta chegava a -0.406, que e a altura do PEITO (onde o CHAR-03 termina):
       virava cabelo longo. Os cortes abaixo poem a ponta real em ~-0.35, logo
       abaixo do queixo (-0.315), que e o comprimento pedido. */
    corteFrente:  0.162,    /* 2a rodada: sobrava testa e o cabelo lia como chapeu
                               apoiado. ⚠️ o corte NAO e a borda visivel: o inchaco
                               radial levanta a barra ~0.037 (medido). Corte 0.162
                               poe a borda VISIVEL em ~0.199 — franja assentada — e
                               a sobrancelha (termina em 0.150) segue livre. */
    corteLado:   -0.200,    /* cobre a orelha (-0.069 a +0.089) e para no queixo */
    corteAtras:  -0.230,    /* atras desce um tico mais, cobrindo a nuca */

    /* a quebra do CHAR-03/04: acima dela a casca segue o cranio, abaixo ela
       continua a nuvem. Aqui a "saia" NAO cai reta — ela arredonda e recolhe na
       ponta, para a silhueta fechar como bola de cachos e nao como cortina. */
    yQuebra:     -0.090,
    afinaPonta:   0.74,

    /* ⭐ O QUE FAZ O CACHEADO Nº2: o relevo.
       Tres termos de frequencias diferentes em angulo E altura. Os dois primeiros
       sao PRODUTOS (angulo x altura) — dao montinhos isolados, nao faixas; o
       terceiro e diagonal e quebra o padrao de grade.
       ⛔ ARMADILHA Nº 8 DO BRIEFING: no CHAR-04 a onda era 8% do raio (0.028 de
       deslocamento) e ficou INVISIVEL. 1a MEDIDA DESTA PECA: com pico 0.065 os
       VERTICES so pegavam ±0.05 e o deslocamento MEDIO era 0.016 — ou seja, na
       pratica quase o mesmo 0.028 ja reprovado. Pico de formula nao e o que se
       ve; o que se ve e o deslocamento MEDIO nos vertices que existem. Amplitude
       subiu 1.45x. MEDIDO na malha final (ja com valeRaso): amplitude de raio
       de 0.076 a 0.13 por faixa de altura, 4-5 montinhos por volta da cabeca —
       visivel, e sem os vales fundos que viravam bico.
       As frequencias angulares sao INTEIRAS de proposito: `ang` vira de +PI para
       -PI atras, e frequencia quebrada abriria uma costura visivel na nuca. */
    /* ⛔ 2a RODADA (o Ivan viu "coroa de papel quebrada", nao cachos).
       As frequencias de ALTURA eram 22/30/16 para 11 aneis: cada montinho ficava
       com 2-3 vertices e a malha amostrava a onda em pontos irregulares — o que
       vira BICO, nao cacho. Baixadas para 11/14/8: montinho maior, com 5-6
       vertices, que le como cacho macio. A amplitude do termo de alta frequencia
       (o que fazia as pontas finas) caiu de 0.018 para 0.009. */
    cachoA1: 0.044, cachoKA1: 4, cachoKY1: 11, cachoFA1: 0.60, cachoFY1: 1.10,
    cachoA2: 0.026, cachoKA2: 5, cachoKY2: 14, cachoFA2: 2.40,
    cachoA3: 0.009, cachoKA3: 7, cachoKY3: 8,  cachoFA3: 1.90, cachoFY3: 0.40,

    /* a barra ondula de leve — mas COESA. 2a rodada: com 0.022+0.015 as pontas
       da saia desciam em angulos diferentes e a silhueta fragmentava ("pedacos",
       nao massa). Metade da dose ja da a irregularidade sem soltar ponta.
       ⚠️ a dose na FRENTE e quase zero (peso 0.12): e a onda da barra somada a
       assimetria que desenhava uma MECHA DIAGONAL atravessando a testa. */
    barraA:  0.013, barraK:  3, barraF:  0.70,
    barraB:  0.008, barraKB: 5, barraFB: 2.30,
    assimetria: 0.007,

    /* ⭐ 2a RODADA — os tres amortecedores anti-bico (todos medidos):
       valeRaso: os VALES do relevo entram com 30% da profundidade; os montes
         ficam inteiros. Cacho e monte redondo com vinco raso — vale fundo com
         pouco vertice vira V afiado (a "coroa de papel" da foto).
       calmaPonta: o relevo desliga gradualmente ao descer a saia — era ele,
         inchando na direcao radial (que na ponta aponta para BAIXO), que fazia
         cada gomo terminar numa altura diferente.
       calmaFranja: faixa de ~0.20 acima da barra da testa fica quieta — mata a
         mecha diagonal e deixa a franja ler como linha limpa. */
    valeRaso:    0.30,
    calmaPonta:  0.62,
    calmaFranja: 0.70,

    /* 17 gomos x 11 aneis = 17*21 = 357 tri. Gomo IMPAR de proposito: com numero
       par os montinhos saem espelhados esquerda/direita e a cabeca fica com cara
       de molde. Aneis contam mais que gomos (anel e forma que desce), mas o
       cacheado precisa dos dois: o relevo anda em angulo e em altura. */
    seg: [17, 11]
  };

  var COR_PADRAO = 0x8B6A55;
  var CINZA = null, BRANCO = null;

  /* pinta canonica do mundo — normaliza uv/indice (senao o merge devolve null em
     silencio). fBase negativo CLAREIA a base, compensando a luz noturna. */
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

  function suave(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }

  /* relevo do cacho para um ponto (angulo, altura). Deslocamento ABSOLUTO, na
     direcao radial — vira montinho no perfil, nao um desenho pintado. */
  function relevoCacho(ang, y) {
    return C.cachoA1 * Math.sin(C.cachoKA1 * ang + C.cachoFA1)
                     * Math.sin(C.cachoKY1 * y + C.cachoFY1)
         + C.cachoA2 * Math.sin(C.cachoKA2 * ang + C.cachoKY2 * y + C.cachoFA2)
         + C.cachoA3 * Math.sin(C.cachoKA3 * ang + C.cachoFA3)
                     * Math.cos(C.cachoKY3 * y + C.cachoFY3);
  }

  /* onde o cabelo termina, por angulo. ang: 0 = frente · ±PI/2 = laterais · PI = nuca.
     ⚠️ ARMADILHA Nº 6: o arco da testa tem de ir ate 0.74 rad antes de a barra
     comecar a descer — a sobrancelha vive ate ~0.69 rad e ate y = 0.150. */
  function corteNoAngulo(ang) {
    var a = Math.abs(ang), base;
    if (a <= 0.74) base = C.corteFrente;                     /* arco da testa */
    else if (a <= 1.28) base = C.corteFrente +
      (C.corteLado - C.corteFrente) * suave((a - 0.74) / (1.28 - 0.74));
    else base = C.corteLado + (C.corteAtras - C.corteLado) * suave((a - 1.28) / (Math.PI - 1.28));

    var peso = (a > 0.74) ? 1 : 0.12;   /* 2a rodada: frente quase reta */
    base += peso * (C.barraA * Math.sin(C.barraK * ang + C.barraF) +
                    C.barraB * Math.sin(C.barraKB * ang + C.barraFB));
    if (ang < 0) base -= C.assimetria * Math.min(1, a / 1.0);
    return base;
  }

  function casca(T, cor) {
    var thetaMax = Math.PI * 0.98;
    var g = new T.SphereGeometry(1, C.seg[0], C.seg[1], 0, Math.PI * 2, 0, thetaMax);
    var uyMin = Math.cos(thetaMax);
    var pos = g.attributes.position, i, ux, uy, uz, x, y, z, esp, ang, corte;
    var fAtras, t, rh, raioH, yRef, kForma, desce, tQuebra, rel, pesoTopo, nrm, d;
    var yTopo = C.raioCabecaY;
    for (i = 0; i < pos.count; i++) {
      ux = pos.getX(i); uy = pos.getY(i); uz = pos.getZ(i);
      ang = Math.atan2(ux, uz);
      corte = corteNoAngulo(ang);
      fAtras = Math.max(0, -Math.cos(ang));

      t = Math.min(1, Math.max(0, (uy - uyMin) / (1 - uyMin)));   /* 0 barra · 1 topo */
      esp = C.espessura + C.volumeTopo * t + C.volumeNuca * fAtras * (0.35 + 0.65 * t);

      /* ⛔ ARMADILHA Nº 5 (o "V" que rasgou a coroa do CHAR-04): a barra varia de
         +0.205 na frente a -0.230 atras, variacao grande demais para interpolar
         y direto. Entao a CALOTA e igual em todos os angulos (segue a esfera) e
         so a SAIA estica ate a barra da coluna. */
      tQuebra = (C.yQuebra / yTopo - uyMin) / (1 - uyMin);
      if (t >= tQuebra) {
        y = Math.max(uy * yTopo, corte);
      } else {
        y = Math.max(corte, corte + (C.yQuebra - corte) * (t / Math.max(0.001, tQuebra)));
      }

      /* forma base = CRANIO puro (armadilha nº 2), dilatado no horizontal.
         ⛔ ARMADILHA Nº 3: nada de travar so o Y — o raio horizontal e sempre
         recalculado para a altura FINAL do vertice, entao a borda desce colada
         em vez de virar aba de viseira. */
      yRef = Math.max(y, C.yQuebra);
      raioH = Math.sqrt(Math.max(0.0006, 1 - (yRef * yRef) / (yTopo * yTopo)));
      /* abaixo da quebra a massa NAO cai reta (isso seria cortina, o CHAR-03):
         ela segue redonda e recolhe perto da ponta — bola de cachos fechando. */
      desce = (y < C.yQuebra)
        ? Math.min(1, (C.yQuebra - y) / Math.max(0.001, C.yQuebra - corte)) : 0;
      kForma = 1 - (1 - C.afinaPonta) * desce * desce;

      rh = Math.sqrt(ux * ux + uz * uz);
      if (rh > 0.0001) {
        x = (ux / rh) * C.raioCabecaX * raioH * kForma * C.largura;
        z = (uz / rh) * C.raioCabecaZ * raioH * kForma * C.largura;
      } else { x = 0; z = 0; }
      if (z > 0) z *= (1 - C.achataFace);       /* acompanha a testa mais plana */

      /* relevo + espessura incham juntos na direcao radial: forma e volume
         separados (licao do CHAR-02).
         2a rodada: a rampa do topo alargou (0.50 -> 0.78). Antes o relevo ja
         agia inteiro no 2o anel (~32 graus do polo), onde o anel e pequeno e 17
         vertices viram pontas de estrela — a coroa pontuda da foto. */
      pesoTopo = 0.35 + 0.65 * Math.min(1, Math.sqrt(Math.max(0, 1 - uy * uy)) / 0.78);
      rel = relevoCacho(ang, y);
      if (rel < 0) rel *= C.valeRaso;           /* vales rasos, montes inteiros */
      rel *= pesoTopo;
      rel *= 1 - C.calmaPonta * desce;          /* saia fecha coesa, sem pontas */
      var fFrente = Math.max(0, Math.cos(ang));
      var cf = fFrente * Math.min(1, Math.max(0, 1 - (y - corte) / 0.20));
      rel *= 1 - C.calmaFranja * cf;            /* faixa da franja quieta */
      d = esp + rel;
      /* piso: nenhum vale pode furar para dentro do cranio e deixar a cabeca
         aparecer atraves do cabelo. MEDIDO com a espessura 0.068: morde em 0 dos
         216 vertices — e so a rede de seguranca de quem mexer nas amplitudes. */
      if (d < 0.004) d = 0.004;

      nrm = Math.sqrt(x * x + y * y + z * z);
      if (nrm > 0.0001) { x += (x / nrm) * d; y += (y / nrm) * d; z += (z / nrm) * d; }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.22);
  }

  window.SARINHA_PERSONAGENS.createSarinhaHairCurly01 = function (ctx, opts) {
    var T = ctx.T;
    opts = opts || {};
    var cor = opts.hairColor === undefined ? COR_PADRAO : opts.hairColor,
        material = opts.material || new T.MeshLambertMaterial(
                     { vertexColors: true, flatShading: opts.flatShading !== false });

    var grupo = new T.Group();
    grupo.name = 'SarinhaHairCurly01';
    var malha = new T.Mesh(casca(T, cor), material);
    malha.name = 'HairMesh';
    grupo.add(malha);

    grupo.userData = {
      type: 'SarinhaHairCurly01',
      version: '1.0',
      hairColor: cor,
      /* mesmo encaixe dos outros: o HairAnchor mora acima do centro da cabeca e
         o cabelo e construido com origem NO centro dela */
      offsetNoHairAnchor: -(C.raioCabecaY * 1.42 - C.raioCabecaY)
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.HAIR_CURLY01_MEASURES = C;
  window.SARINHA_PERSONAGENS.HAIR_CURLY01_CORTE = corteNoAngulo;
})();

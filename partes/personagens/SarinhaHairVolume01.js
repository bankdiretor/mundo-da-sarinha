/* SarinhaHairVolume01 — CHAR-05: cabelo MEDIO VOLUMOSO do Sarinha Mini Style.
   Senta no mesmo HairAnchor do CHAR-02/03/04 e acompanha o HeadPivot.
   Estilo nº 6 da folha: comprimento no ombro/queixo, massa cheia e afofada,
   pontas viradas para FORA.

   O risco desta peca e virar "um longo mais curto". O que a separa dos outros
   nao e o comprimento: e o CORPO. Tres coisas fazem isso, e nenhuma existe nos
   outros tres cabelos:
   · kCorpo — o raio horizontal e MULTIPLICADO numa rampa que comeca na tempora
     (y=0.280) e satura na altura da orelha, PESADA POR ANGULO: zero nas colunas
     que emolduram o rosto, cheia nas laterais e atras.
   · kFlare — abaixo da quebra o raio ABRE em vez de afinar (o liso e o ondulado
     usam afinaPonta<1; aqui e >1). Sao as pontas viradas para fora.
   · mechas — uma onda no raio ao longo do ANGULO (nao da altura, como o
     ondulado): quebra o sino liso em mechas em volta da cabeca.

   ⛔ ERRO PAGO NA 1a RODADA (a foto frontal do Ivan): kCorpo e kFlare agiam em
   TODOS os angulos por igual. As colunas logo depois da transicao — as que a
   camera frontal ve como borda interna da massa — eram empurradas para fora
   junto, e como a cabeca AFINA abaixo dos olhos, abria um VAO de ate 0.29 entre
   o rosto e o cabelo: duas placas penduradas, testa de fora, cabelo ralo. O
   volume estava todo no PERFIL, onde a camera frontal nao ve. A correcao tem
   tres pernas: (1) a barra desce cedo e rapido (0.74->1.05, como o longo v1.2),
   entao a moldura nasce colada na testa; (2) kCorpo/kFlare pesados por angulo —
   as colunas da moldura ABRACAM o cranio e so as laterais/tras incham; (3) rolo
   de franja (volumeFranja) para o topo ter presenca de frente.

   Contrato do mundo: 1 MeshLambertMaterial vertexColors + flatShading, cor por
   vertice, sem luz, sem sombra real, sem textura, sem import/export. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  /* escala CRUA do sistema (personagem cru = 1.974; cabeca com centro em y=0
     local, raios 0.350 / 0.315 / 0.2835). O peito fica em y = -0.41 (ate onde
     desce o cabelo LONGO); o queixo/ombro deste aqui para bem antes. */
  var C = {
    raioCabecaX: 0.350,
    raioCabecaY: 0.315,
    raioCabecaZ: 0.2835,
    achataFace:  0.14,

    /* espessura da casca. Mais grossa que a do liso (0.022) — cabelo com corpo
       tambem e cabelo mais denso, nao so mais largo. */
    espessura:   0.034,
    volumeTopo:  0.030,
    /* ⛔ BUG MEU da 1a rodada: o sino era sin(PI*min(1,t/0.62)) — morria em
       t>=0.62 e a metade DE CIMA da casca ficava sem massa nenhuma. Agora o
       sino cobre a altura toda: zero na barra, cheio no meio, zero no topo. */
    volumeMassa: 0.040,
    volumeNuca:  0.036,
    /* rolo da franja (a mesma ideia do curto): engrossa a faixa logo acima da
       barra frontal, para a franja ter presenca DE FRENTE, nao ser uma tira. */
    volumeFranja: 0.038,
    faixaFranja:  0.16,    /* ate que altura acima da barra o rolo age */

    /* onde o cabelo termina, em y local. MEDIO: para na altura do ombro/queixo.
       ⚠️ a franja tem de parar acima da sobrancelha (que vive de +0.129 a +0.150
       e vai ate ~0.69 rad) — armadilha nº 6 do briefing. Minimo medido da barra
       frontal: 0.172, folga de 0.022 sobre a sobrancelha. */
    corteFrente:  0.195,   /* franja baixa (pedido: 0.19-0.21), emoldura o rosto */
    corteLado:   -0.235,   /* barra no ombro (-0.22 tipico; -0.256 no dente fundo) */
    corteAtras:  -0.265,

    /* ⭐ A QUEBRA (mesma licao do CHAR-03): acima dela a calota e IGUAL em todos
       os angulos, senao a coroa rasga em V. Aqui ela fica bem mais alta que no
       longo (-0.020 contra -0.115) porque a saia deste cabelo e curta e precisa
       de aneis para desenhar a abertura da ponta. */
    yQuebra:     -0.020,

    /* ⭐ O CORPO — o que faz esta peca ser ela mesma.
       Rampa suave do raio horizontal: 0 na tempora, cheia na altura da orelha.
       Comeca ALTO de proposito: se o volume so aparecesse embaixo, a leitura
       seria "saia", nao "cabelo armado". */
    corpoTopoY:    0.280,
    corpoBaseY:    0.020,
    volumeLateral: 0.26,

    /* ⭐ PESO POR ANGULO do corpo/flare — a correcao da foto frontal.
       0 ate 1.10 rad (colunas que emolduram o rosto: abracam o cranio),
       1 a partir de 1.55 rad (lateral plena e tras: volume cheio).
       ⛔ MEDIDO NA 2a RODADA: com o peso comecando em 0.82 o vao voltou
       (0.136 em y=-0.15). Causa: com 16 gomos as colunas vivem a cada 0.393
       rad (0.785, 1.178, 1.571...) — um inicio em 0.82 alarga a coluna de
       1.178, que e JUSTAMENTE a que desenha a moldura do rosto. O inicio em
       1.10 deixa a 1.178 quase magra (peso 0.08) e da o corpo todo a partir
       da lateral plena (1.571). Discretizacao vence intencao: o peso tem de
       ser pensado NAS COLUNAS QUE EXISTEM, nao no continuo. */
    pesoAngIni:  1.10,
    pesoAngLarg: 0.45,

    /* a moldura ainda TUCA para dentro na descida (so onde pesoAng e baixo):
       o queixo afina e o cabelo acompanha, como no cabelo de verdade. Sem isso
       a moldura cai reta e abre 0.05 de vao na altura da barra. */
    tuckMoldura: 0.18,

    /* ⭐ AS PONTAS VIRADAS PARA FORA. O liso e o ondulado AFINAM na barra
       (afinaPonta 0.93 / 0.90); aqui o raio ABRE. Expoente 2 concentra a
       abertura na ponta — "viram LEVEMENTE para fora", nao um cone desde a
       orelha. Na moldura do rosto o flare cai a 25% (senao reabre o vao). */
    flarePonta:  0.11,
    expFlare:    2.00,

    /* mechas: onda do raio ao longo do ANGULO. O ondulado ondula na ALTURA —
       sao gestos diferentes de proposito, para as duas pecas nao se parecerem. */
    mechaA: 0.038,
    mechaK: 5.00,
    mechaF: 0.60,

    /* barra irregular + assimetria (remedio classico contra cara de capacete).
       ⚠️ as amplitudes sao limitadas: a ponta MAIS BAIXA da franja ainda tem de
       ficar acima de 0.150. Medido: minimo da franja = 0.210. */
    ondaBarraA:     0.024,
    ondaBarraK:     3.20,
    ondaBarraF:     0.85,
    ondaBarraExtra: 0.018,
    assimetriaLado: 0.011,

    /* 16 gomos x 11 aneis = 16*(2*11-1) = 336 tri. O anel e que desenha a
       abertura da ponta; o gomo so arredonda. Personagem: 1373 + 336 = 1709. */
    seg: [16, 11]
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

  /* onde o cabelo termina, por angulo. ang: 0 = frente · ±PI/2 = laterais · PI = nuca.
     O arco da testa vai ate 0.74 rad ANTES de a barra comecar a descer — abaixo
     disso a franja comeria a sobrancelha (armadilha nº 6, ja paga no CHAR-02). */
  function corteNoAngulo(ang) {
    /* descida CEDO e RAPIDA (0.74->1.05) — licao da foto frontal: com a
       transicao lenta (ate 1.32) as colunas ao lado do rosto ainda estavam
       altas, e de frente o rosto ficava sem moldura nenhuma ate a orelha. */
    var a = Math.abs(ang), base;
    if (a <= 0.74) base = C.corteFrente;
    else if (a <= 1.05) base = C.corteFrente +
      (C.corteLado - C.corteFrente) * suave((a - 0.74) / (1.05 - 0.74));
    else base = C.corteLado + (C.corteAtras - C.corteLado) * suave((a - 1.05) / (Math.PI - 1.05));

    /* ⚠️ no CHAR-03/04 o peso da onda pula de 0.35 para 1 exatamente em 0.74 —
       um degrau. Aqui a rampa e suave, entao a barra nao ganha quina na tempora. */
    var peso = 0.30 + 0.70 * suave((a - 0.55) / 0.40);
    base += C.ondaBarraA * Math.sin(C.ondaBarraK * ang + C.ondaBarraF) * peso;
    base += C.ondaBarraExtra * Math.sin(4.70 * ang + 1.60) * suave((a - 0.74) / 0.40);
    if (ang < 0) base -= C.assimetriaLado * Math.min(1, a / 1.0);
    return base;
  }

  function casca(T, cor) {
    var thetaMax = Math.PI * 0.98;
    var g = new T.SphereGeometry(1, C.seg[0], C.seg[1], 0, Math.PI * 2, 0, thetaMax);
    var uyMin = Math.cos(thetaMax);
    var yTopo = C.raioCabecaY;
    var tQuebra = (C.yQuebra / yTopo - uyMin) / (1 - uyMin);
    var pos = g.attributes.position;
    var i, ux, uy, uz, x, y, z, ang, corte, t, esp, rh, raioH, yRef, fAtras;
    var hCorpo, kCorpo, desce, kFlare, nrm, pesoAng, fFrente, rolo;

    for (i = 0; i < pos.count; i++) {
      ux = pos.getX(i); uy = pos.getY(i); uz = pos.getZ(i);
      ang = Math.atan2(ux, uz);
      corte = corteNoAngulo(ang);
      fAtras = Math.max(0, -Math.cos(ang));
      fFrente = Math.max(0, Math.cos(ang));
      t = Math.min(1, Math.max(0, (uy - uyMin) / (1 - uyMin)));   /* 0 barra · 1 topo */

      /* ⛔ ERRO PAGO no CHAR-03 (o "V" na coroa que o Ivan viu de olho): quando a
         barra varia muito com o angulo, interpolar y de `corte` ate o topo
         comprime os aneis de um lado e estica do outro, e a coroa RASGA. Aqui a
         barra vai de +0.195 (franja) a -0.265 (nuca) — variacao de 0.46, muita.
         Entao: CALOTA igual em todos os angulos, e so a SAIA estica ate a barra. */
      if (t >= tQuebra) {
        y = Math.max(uy * yTopo, corte);
      } else {
        y = Math.max(corte, corte + (C.yQuebra - corte) * (t / Math.max(0.001, tQuebra)));
      }

      /* ⛔ ERRO PAGO no CHAR-02: volume MAXIMO na ponta engrossa a barra e vira
         asa. Sino cheio na altura toda (zero na barra, cheio no meio, zero no
         topo) — o sino antigo morria em t>=0.62, bug da 1a rodada.
         O rolo da franja e por DISTANCIA ACIMA DA BARRA (y-corte): zero na
         propria barra (sem asa), cheio ~0.08 acima — e as colunas empilhadas na
         barra frontal ganham todas o mesmo esp, sem briga de face. */
      rolo = Math.sin(Math.PI * Math.min(1, (y - corte) / C.faixaFranja));
      esp = C.espessura
          + C.volumeTopo   * t
          + C.volumeMassa  * Math.sin(Math.PI * Math.pow(t, 0.85))
          + C.volumeNuca   * fAtras * (0.30 + 0.70 * t)
          + C.volumeFranja * Math.pow(fFrente, 1.5) * Math.max(0, rolo);

      /* ⛔ ERRO PAGO (4 rodadas no CHAR-02): a FORMA base e sempre o CRANIO PURO;
         espessura e volume so incham radialmente DEPOIS. Um topo proprio
         (raio + espessura) cria uma cupula que a cabeca nao tem e nasce bico de
         perfil. O raio horizontal e sempre recalculado para a altura FINAL do
         vertice — e por isso que a borda desce colada em vez de virar viseira. */
      yRef = Math.max(y, C.yQuebra);
      raioH = Math.sqrt(Math.max(0.0006, 1 - (yRef * yRef) / (yTopo * yTopo)));

      /* ⭐ CORPO: alarga o raio da tempora para baixo, PESADO POR ANGULO.
         hCorpo e 0 na coroa (nada de cupula); pesoAng e 0 nas colunas que
         emolduram o rosto — elas abracam o cranio, e de frente a massa ENCOSTA
         na cabeca (era o vao das "duas placas" da foto). So as laterais e o
         tras ganham o corpo cheio. As mechas seguem o mesmo peso. */
      pesoAng = suave((Math.abs(ang) - C.pesoAngIni) / C.pesoAngLarg);
      hCorpo = suave((C.corpoTopoY - y) / (C.corpoTopoY - C.corpoBaseY));
      kCorpo = 1 + C.volumeLateral * hCorpo * pesoAng;
      kCorpo *= 1 + C.mechaA * Math.sin(C.mechaK * ang + C.mechaF) * hCorpo * pesoAng;

      /* ⭐ PONTAS PARA FORA: o liso/ondulado multiplicam por <1 aqui (afinam);
         este abre. Na moldura do rosto o flare cai a 25% — abertura plena so
         nas laterais/tras, senao a ponta reabriria o vao perto do queixo. */
      desce = (y < C.yQuebra)
        ? Math.min(1, (C.yQuebra - y) / Math.max(0.001, C.yQuebra - corte)) : 0;
      kFlare = 1 + C.flarePonta * Math.pow(desce, C.expFlare) * (0.25 + 0.75 * pesoAng);
      /* tuck da moldura: as colunas de peso baixo fecham para dentro conforme
         descem, seguindo o queixo que afina — mata o vao na altura da barra */
      kFlare *= 1 - C.tuckMoldura * desce * (1 - pesoAng);

      rh = Math.sqrt(ux * ux + uz * uz);
      if (rh > 0.0001) {
        x = (ux / rh) * C.raioCabecaX * raioH * kCorpo * kFlare;
        z = (uz / rh) * C.raioCabecaZ * raioH * kCorpo * kFlare;
      } else { x = 0; z = 0; }
      if (z > 0) z *= (1 - C.achataFace);      /* acompanha a testa mais plana */

      nrm = Math.sqrt(x * x + y * y + z * z);
      if (nrm > 0.0001) { x += (x / nrm) * esp; y += (y / nrm) * esp; z += (z / nrm) * esp; }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.22);
  }

  window.SARINHA_PERSONAGENS.createSarinhaHairVolume01 = function (ctx, opts) {
    var T = ctx.T;
    opts = opts || {};
    var cor = opts.hairColor === undefined ? COR_PADRAO : opts.hairColor,
        material = opts.material || new T.MeshLambertMaterial(
                     { vertexColors: true, flatShading: opts.flatShading !== false });

    var grupo = new T.Group();
    grupo.name = 'SarinhaHairVolume01';
    var malha = new T.Mesh(casca(T, cor), material);
    malha.name = 'HairMesh';
    grupo.add(malha);

    grupo.userData = {
      type: 'SarinhaHairVolume01',
      version: '1.1',
      hairColor: cor,
      /* mesmo encaixe dos outros: o HairAnchor mora acima do centro da cabeca e
         o cabelo e construido com origem NO centro dela */
      offsetNoHairAnchor: -(C.raioCabecaY * 1.42 - C.raioCabecaY)
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.HAIR_VOLUME01_MEASURES = C;
  window.SARINHA_PERSONAGENS.HAIR_VOLUME01_CORTE = corteNoAngulo;
})();

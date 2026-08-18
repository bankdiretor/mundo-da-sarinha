/* SarinhaHairShort01 — CHAR-02: cabelo CURTO SIMPLES do Sarinha Mini Style.
   Senta no HairAnchor do CHAR-00 e acompanha a curvatura da cabeca do CHAR-01.
   Ficha: fichas/CHAR-02-CABELO-CURTO.md

   As 4 pecas da ficha (franja, calota, laterais, nuca) sao construidas separadas
   e MESCLADAS numa malha so — modular no desenho, 1 draw call no render.

   A borda do cabelo tem ALTURA VARIAVEL por angulo: alta na frente (a franja
   para acima das sobrancelhas), media nas laterais (deixa a orelha aparecer pela
   metade) e baixa atras (cobre a nuca). E isso que faz ler como corte de cabelo
   e nao como capacete.

   Contrato do mundo: 1 MeshLambertMaterial vertexColors, cor por vertice, sem
   luz, sem sombra real, sem textura, sem import/export. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  /* escala CRUA do sistema (a mesma do CHAR-00/CHAR-01: personagem cru = 1.974).
     A cabeca tem raios a=0.350 b=0.315 c=0.2835 e centro em y=0 local. */
  var C = {
    raioCabecaX: 0.350,
    raioCabecaY: 0.315,
    raioCabecaZ: 0.2835,
    achataFace:  0.14,      /* o mesmo do CHAR-01: a frente da cabeca e mais plana */

    /* ⛔ ERRO PAGO NA 1a RODADA: franja, nuca e costeletas eram ESFERAS SOLTAS
       posicionadas por cima. A franja virou uma boina flutuando acima da testa e
       a vista lateral virou um amontoado. Cabelo curto e UMA casca continua — o
       que muda de lugar para lugar e a ESPESSURA, nao a quantidade de bolas. */
    espessura:   0.020,     /* casca base */
    volumeTopo:  0.034,     /* massa no alto */
    volumeFranja:0.034,     /* engrossa a franja perto da barra da testa */
    volumeNuca:  0.046,     /* a nuca e a parte mais cheia (vista de lado) */
    faixaBarra:  0.16,      /* ate que distancia da barra o volume extra age */

    /* onde a barra do cabelo termina, em y local (0 = meio da cabeca).
       ⚠️ a franja PRECISA parar acima da sobrancelha, que vai de +0.129 a +0.150
       no CHAR-01 — senao o cabelo come a expressao. */
    corteFrente: 0.198,
    corteLado:  0.018,
    corteAtras: -0.128,

    /* v1.1 POLISH — o que tira a cara de capacete, sem gastar triangulo:
       a barra deixa de ser lisa e ganha DENTES (blocos de franja) e assimetria.
       Sao ondas fixas na geometria, nao aleatorio por frame. */
    denteFrenteA:  0.026,   /* onda 1 da franja */
    denteFrenteKA: 3.20,
    denteFrenteFA: 0.70,
    denteFrenteB:  0.017,   /* onda 2, frequencia diferente = ritmo irregular */
    denteFrenteKB: 5.10,
    denteFrenteFB: 2.30,
    denteAtrasA:   0.022,   /* 3 ondulacoes grandes na barra da nuca */
    denteAtrasK:   3.00,
    denteAtrasF:   0.40,
    /* assimetria: o lado esquerdo desce um pouco mais que o direito */
    assimetriaLado:0.009,
    /* topo deslocado alguns milimetros — quebra o hemisferio perfeito */
    topoDeslocaX: 0.012,
    topoDeslocaZ: 0.010,

    /* ⛔ MEDIDO: com 20 gomos ha apenas ~4 vertices no arco da testa, e ondas
       nao conseguem desenhar 3-5 dentes ali — sairia uma curva lisa (foi o que
       aconteceu). Para dentes de verdade numa casca uniforme seriam ~40 gomos =
       500+ tri, muito acima do teto de 250. Solucao: a casca faz o VOLUME com
       poucos gomos, e as pontas da franja sao CUNHAS dedicadas, mescladas na
       mesma malha. 5 cunhas custam ~40 tri e desenham a franja de verdade. */
    seg:         [20, 6],

    /* ⛔ AS PONTAS DE FRANJA FORAM ABANDONADAS (3 tentativas, todas medidas):
       · triangulos afiados -> DENTES DE SERRA, pareciam coroa;
       · trapezios largos   -> desciam sobre a sobrancelha;
       · trapezios curtos e altos -> PLACAS soltas boiando na testa.
       A causa e orcamentaria: blocos de franja bem desenhados precisam de ~40
       gomos na casca (500+ tri) e o teto e 250. Ficam aqui as coordenadas caso
       o teto suba um dia. O que DA o desenho hoje: ondas na barra + assimetria. */
    pontas: [
      [-0.54, 0.24, 0.024],
      [-0.26, 0.26, 0.040],
      [ 0.02, 0.24, 0.028],
      [ 0.30, 0.25, 0.042],
      [ 0.57, 0.22, 0.022]
    ],
    pontaEspessura: 0.020,

  };

  var COR_PADRAO = 0x8B6A55;    /* castanho da ficha */

  var CINZA = null, BRANCO = null;

  /* pinta canonica do mundo — normaliza uv/indice (senao o merge devolve null em
     silencio) e faz o degrade vertical. fBase negativo CLAREIA a base, para
     compensar a luz noturna que apaga a barriga dos volumes. */
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

  /* altura da barra do cabelo para um dado angulo horizontal.
     ang = atan2(x, z): 0 = frente (+Z) · ±PI/2 = laterais · PI = nuca */
  /* suavizacao classica: 0 em 0, 1 em 1, derivada zero nas pontas — sem quina */
  function suave(t) {
    t = Math.min(1, Math.max(0, t));
    return t * t * (3 - 2 * t);
  }

  /* A barra fica ALTA por todo o arco da testa (ate ~25°), desce suave ate a
     lateral (~85°) e segue descendo ate a nuca.
     ⚠️ Duas armadilhas ja pagas aqui:
     · interpolacao linear em cos(ang) fazia a barra cair para 0.126 na coluna
       dos olhos — abaixo da sobrancelha (0.129–0.150) — e o cabelo comia a
       expressao;
     · potencia (pow 0.4) resolveu a altura mas criou uma QUINA na tempora,
       visivel de lado. Smoothstep por angulo resolve os dois. */
  function corteNoAngulo(ang) {
    var a = Math.abs(ang), base;                 /* 0 = frente · PI = nuca */
    if (a <= 0.55) base = C.corteFrente;                       /* arco da testa */
    else if (a <= 1.90) base = C.corteFrente +
      (C.corteLado - C.corteFrente) * suave((a - 0.55) / (1.90 - 0.55));
    else base = C.corteLado + (C.corteAtras - C.corteLado) * suave((a - 1.90) / (Math.PI - 1.90));

    /* v1.1: DENTES. Duas ondas de frequencia diferente na frente dao 3-5 blocos
       de franja com comprimentos desiguais; uma onda mais lenta atras ondula a
       barra da nuca. O peso cai nas laterais para nao serrilhar o contorno todo.
       ⚠️ a amplitude e limitada de proposito: a ponta MAIS BAIXA da franja ainda
       tem de ficar acima da sobrancelha (que termina em 0.150). */
    var pesoFrente = Math.max(0, Math.cos(a * 1.35));
    var pesoAtras  = Math.max(0, -Math.cos(a * 1.05));
    base += pesoFrente * (
        C.denteFrenteA * Math.sin(C.denteFrenteKA * ang + C.denteFrenteFA) +
        C.denteFrenteB * Math.sin(C.denteFrenteKB * ang + C.denteFrenteFB));
    base += pesoAtras * C.denteAtrasA * Math.sin(C.denteAtrasK * ang + C.denteAtrasF);

    /* assimetria: o lado esquerdo (x<0, ou seja ang<0) desce um pouco mais */
    if (ang < 0) base -= C.assimetriaLado * Math.min(1, a / 0.9);
    return base;
  }

  /* calota: casca que envolve a cabeca. Cada vertice e projetado sobre a forma
     da cabeca (mesma equacao do CHAR-01, achatamento frontal incluido) e depois
     empurrado para fora pela espessura. Quem esta abaixo da barra sobe ate ela. */
  function calota(T, cor) {
    var thetaMax = Math.PI * 0.98;
    var g = new T.SphereGeometry(1, C.seg[0], C.seg[1], 0, Math.PI * 2, 0, thetaMax);
    var uyMin = Math.cos(thetaMax);
    var pos = g.attributes.position, i, ux, uy, uz, x, y, z, esp, ang, corte;
    var cosAng, fFrente, fAtras, perto, t, rh, yTopo, raioH;
    for (i = 0; i < pos.count; i++) {
      ux = pos.getX(i); uy = pos.getY(i); uz = pos.getZ(i);   /* direcao unitaria */
      ang = Math.atan2(ux, uz);
      corte = corteNoAngulo(ang);
      cosAng = Math.cos(ang);
      fFrente = Math.max(0, cosAng);
      fAtras  = Math.max(0, -cosAng);

      /* ⛔ ERRO PAGO (2 rodadas): na 1a versao os vertices abaixo da barra eram
         TRAVADOS em y=corte. Todos os aneis de baixo colapsavam na mesma altura
         — faces empilhadas, aba de viseira e uma quina feia na tempora.
         Agora o parametro vertical da esfera e REMAPEADO: o anel de baixo cai
         exatamente na barra, o de cima no alto da cabeca, e os do meio se
         distribuem. Nenhum vertice desperdicado, nenhuma face degenerada. */
      t = (uy - uyMin) / (1 - uyMin);          /* 0 na barra · 1 no topo */
      t = Math.min(1, Math.max(0, t));

      /* ⛔ ERRO PAGO: com o volume MAXIMO na ponta da franja (perto = 1 em t=0),
         a borda engrossava e, de perfil, saia uma ASA de 5 cm na frente da testa.
         Cabelo afina na ponta: sino — zero na borda, cheio logo acima, zero de
         novo mais para cima. */
      perto = Math.sin(Math.PI * Math.min(1, t / 0.52));
      esp = C.espessura
          + C.volumeTopo   * t
          + C.volumeFranja * fFrente * perto            /* o rolo da franja */
          + C.volumeNuca   * fAtras  * (0.30 + 0.70 * perto);  /* a nuca cheia */

      /* ⛔ ERRO PAGO (3a rodada do mesmo defeito): o raio horizontal era calculado
         com um topo que VARIAVA por vertice (raioCabecaY + esp). Vizinhos com
         espessuras diferentes caiam em elipsoides diferentes e a costura virava
         um BICO na frente da testa. Agora a FORMA e sempre a mesma (o cranio) e
         a espessura so INCHA para fora depois — forma e volume separados. */
      /* ⛔ 4a rodada do MESMO defeito, e a causa real: o cabelo usava um topo
         PROPRIO (raioCabecaY + espessura + volume = 0.369) e ganhava uma cupula
         que nao existe no cranio. Medido: 0.146 de saliencia em y=0.333, acima
         do topo da cabeca — era esse o "bico" de perfil. A forma base agora e o
         CRANIO puro; espessura e volume so incham radialmente depois. */
      yTopo = C.raioCabecaY;
      y = corte + (yTopo - corte) * t;

      raioH = Math.sqrt(Math.max(0.0006, 1 - (y * y) / (yTopo * yTopo)));
      rh = Math.sqrt(ux * ux + uz * uz);
      if (rh > 0.0001) {
        x = (ux / rh) * C.raioCabecaX * raioH;
        z = (uz / rh) * C.raioCabecaZ * raioH;
      } else { x = 0; z = 0; }
      if (z > 0) z *= (1 - C.achataFace);      /* acompanha a testa mais plana */

      /* incha na direcao radial: some volume sem mexer na forma de base */
      var nrm = Math.sqrt(x * x + y * y + z * z);
      if (nrm > 0.0001) {
        x += (x / nrm) * esp; y += (y / nrm) * esp; z += (z / nrm) * esp;
      }
      /* v1.1: topo levemente deslocado — mata o hemisferio perfeito de manequim.
         So age no alto (t^2), entao a barra do cabelo nao se mexe. */
      x += C.topoDeslocaX * t * t;
      z += C.topoDeslocaZ * t * t;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.22);
  }


  /* ponto na superficie externa do cabelo para um dado angulo e altura */
  function naSuperficie(ang, y, folga) {
    var yTopo = C.raioCabecaY, k = Math.max(0.015, 1 - (y * y) / (yTopo * yTopo));
    var raioH = Math.sqrt(k);
    var sx = Math.sin(ang), sz = Math.cos(ang);
    var x = sx * (C.raioCabecaX + C.espessura + folga) * raioH;
    var z = sz * (C.raioCabecaZ + C.espessura + folga) * raioH;
    if (z > 0) z *= (1 - C.achataFace);
    return [x, y, z];
  }

  /* cunha de franja: um bloco triangular que desce da barra. Duas faces (frente
     e verso) mais as bordas — 8 triangulos por ponta, e a franja passa a TER
     desenho em vez de ser uma linha lisa. */
  /* ⛔ ERRO PAGO: a 1a versao era um TRIANGULO (dois vertices em cima, um bico
     embaixo). Cinco deles viraram DENTES DE SERRA — parecia coroa, nao franja.
     Agora e um TRAPEZIO: a base de baixo tem 62% da largura de cima, entao cada
     ponta e um BLOCO de cabelo com o canto arredondado pela propria faceta. */
  function pontaFranja(T, cor, ang, meiaLarg, comprimento) {
    var yA = corteNoAngulo(ang - meiaLarg), yB = corteNoAngulo(ang + meiaLarg);
    var yBase = Math.min(yA, yB) - comprimento;
    var mlBaixo = meiaLarg * 0.62;
    var fora = C.pontaEspessura;
    /* 4 cantos externos e 4 internos */
    var A = naSuperficie(ang - meiaLarg, yA, fora),
        B = naSuperficie(ang + meiaLarg, yB, fora),
        Cc= naSuperficie(ang + mlBaixo, yBase, fora * 0.7),
        D = naSuperficie(ang - mlBaixo, yBase, fora * 0.7);
    var a = naSuperficie(ang - meiaLarg, yA, 0),
        b = naSuperficie(ang + meiaLarg, yB, 0),
        cc= naSuperficie(ang + mlBaixo, yBase, 0),
        d = naSuperficie(ang - mlBaixo, yBase, 0);
    var v = [];
    function tri(p, q, r) { v.push(p[0],p[1],p[2], q[0],q[1],q[2], r[0],r[1],r[2]); }
    tri(A, B, Cc); tri(A, Cc, D);        /* face de fora */
    tri(b, a, d);  tri(b, d, cc);        /* face de dentro */
    tri(a, b, B);  tri(a, B, A);         /* borda de cima */
    tri(d, cc, Cc);tri(d, Cc, D);        /* barra de baixo */
    tri(b, cc, Cc);tri(b, Cc, B);        /* lateral direita */
    tri(d, a, A);  tri(d, A, D);         /* lateral esquerda */
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.18);
  }

  window.SARINHA_PERSONAGENS.createSarinhaHairShort01 = function (ctx, opts) {
    var T = ctx.T, BGU = ctx.BGU || T.BufferGeometryUtils;
    opts = opts || {};
    var cor = opts.hairColor === undefined ? COR_PADRAO : opts.hairColor,
        material = opts.material || new T.MeshLambertMaterial(
                     { vertexColors: true, flatShading: opts.flatShading !== false });

    var grupo = new T.Group();
    grupo.name = 'SarinhaHairShort01';

    /* as 4 "pecas" da ficha (franja, calota, laterais, nuca) existem como REGIOES
       de espessura de uma casca so — ver o comentario do erro pago em C.espessura */
    /* ⛔ 3a TENTATIVA de franja em blocos, tambem descartada — ver o comentario
       de C.pontas. A casca sozinha e o melhor que cabe em 250 triangulos. */
    var geo = calota(T, cor);
    if (!geo) throw new Error('geometria do cabelo devolveu null');
    var malha = new T.Mesh(geo, material);
    malha.name = 'HairMesh';
    grupo.add(malha);

    /* o HairAnchor mora ACIMA do centro da cabeca; o cabelo e construido com
       origem no CENTRO dela, entao desce esse offset ao ser pendurado la */
    grupo.userData = {
      type: 'SarinhaHairShort01',
      version: '1.0',
      hairColor: cor,
      offsetNoHairAnchor: -(C.raioCabecaY * 1.42 - C.raioCabecaY)
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.HAIR_SHORT01_MEASURES = C;
  window.SARINHA_PERSONAGENS.HAIR_SHORT01_CORTE = corteNoAngulo;
  /* paleta da ficha: uma cor por peca de cabelo */
  window.SARINHA_PERSONAGENS.HAIR_PALETTE = [
    0x8B6A55, 0xA67C62, 0x8E6CA9, 0x6E88B6, 0x7DBD9B, 0xC89AC6
  ];
})();

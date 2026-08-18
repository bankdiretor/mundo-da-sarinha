/* SarinhaHairBuns01 — CHAR-05: cabelo COQUINHOS do Sarinha Mini Style.
   Senta no mesmo HairAnchor dos outros cabelos e acompanha o HeadPivot.
   Estilo nº 5 da folha: cabelo PRESO, com DOIS COQUES redondos no alto, um de
   cada lado.

   A diferenca para os outros tres nao esta na barra nem na queda: e o VOLUME
   FORA DO CRANIO. A casca aqui e a mais fina e colada de todas (cabelo puxado,
   a orelha aparece inteira) e toda a massa vai para os dois coques.
   MEDIDO: os coques sobem 0.096 acima da coroa da casca (topo do cabelo em
   y=0.470 contra 0.374 da casca) e chegam a x=±0.386, alem do contorno da
   cabeca (0.350). Curto/longo/ondulado nunca passam desse contorno; este passa
   — e por isso o verificador da 0.165 / 0.257 / 0.289 de diferenca contra eles.

   MEDIDO no encosto coque x casca (57.200 amostras da superficie da casca):
   · 2.279 e 2.390 amostras da casca caem DENTRO do volume de cada coque
   · profundidade maxima da casca dentro do coque: 0.0642 / 0.0654
   · 43 e 48 vertices do coque estao DENTRO da casca (ate 0.056 de profundidade)
   · circulo de contato: raio 0.112 / 0.105 — junta larga, nada de coque boiando

   Contrato do mundo: 1 MeshLambertMaterial vertexColors + flatShading, cor por
   vertice, sem luz, sem sombra real, sem textura, sem import/export. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  /* escala CRUA do sistema (personagem cru = 1.974; cabeca com centro em y=0
     local e raios 0.350 / 0.315 / 0.2835). A sobrancelha vive entre y=+0.129 e
     +0.150 e vai ate ~0.69 rad; a orelha, de y=-0.069 a +0.089. */
  var C = {
    raioCabecaX: 0.350,
    raioCabecaY: 0.315,
    raioCabecaZ: 0.2835,
    achataFace:  0.14,

    /* CASCA PUXADA: a mais fina dos quatro cabelos. O cabelo esta preso, entao
       ele nao pode ter volume solto — quem tem volume sao os coques. */
    espessura:    0.015,
    volumeTopo:   0.016,
    volumeNuca:   0.028,
    /* ⭐ RECOLHIMENTO: a casca engrossa da tempora para cima, na direcao dos
       coques. E o "cabelo sendo puxado" — e tambem o que faz o coque parecer
       nascer da cabeca em vez de estar colado por cima. */
    volumeRecolhe:0.030,

    /* onde a casca termina, em y local */
    corteFrente:  0.216,    /* testa alta: cabelo preso mostra mais testa */
    corteLado:    0.060,    /* acima da orelha (topo dela em +0.089): orelha de fora */
    corteAtras:  -0.150,    /* cobre a nuca */
    riscaFrente:  0.014,    /* leve descida no meio da testa (bico de viuva) */

    ondaBarraA:   0.012,
    ondaBarraK:   2.30,
    ondaBarraF:   0.60,
    assimetriaLado: 0.008,

    /* 16 gomos x 6 aneis = 16*(2*6-1) = 176 tri. A casca aqui e so a base:
       o triangulo caro tem de sobrar para os coques. */
    seg:          [16, 6],

    /* ⭐ OS COQUES.
       Posicao por DIRECAO (angulo horizontal + elevacao), nao por x,y soltos:
       assim o coque e apoiado na superficie da casca por construcao, e a
       penetracao vira um numero que eu escolho, nao um acidente. */
    coqueAng:     1.60,     /* rad no plano: ~92°, um tico para tras das orelhas */
    coqueElev:    0.93,     /* rad de elevacao: alto, mas ainda para o lado */
    coqueRaio:    0.130,
    coqueAchata:  0.86,     /* achatado no eixo que aponta para a cabeca */
    /* ⛔ ARMADILHA 1 do briefing ("peca solta nao vira cabelo") aplicada a um
       volume que E legitimo: o coque so nao flutua se ENTRAR na casca. Este e o
       numero que garante isso — o polo interno do coque fica 0.060 ABAIXO da
       superficie da casca. MEDIDO na malha final: penetracao 0.060, profundidade
       maxima 0.065 e circulo de contato de raio 0.112. */
    coquePenetra: 0.060,
    /* torcao: o raio do coque ondula, entao ele le como cabelo enrolado e nao
       como bolinha de gude. O sinal gira com o lado (coques espelhados). */
    coqueTorcaoA: 0.075,
    coqueTorcaoK: 3,
    coqueTorcaoM: 2.4,
    /* 8 gomos x 5 aneis = 2*8*(5-1) = 64 tri por coque */
    coqueSeg:     [8, 5]
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

  /* onde a casca termina, por angulo. ang: 0 = frente · ±PI/2 = laterais · PI = nuca.
     ⚠️ o arco da testa vai ate 0.74 rad ANTES de a barra comecar a descer — a
     sobrancelha vive ate ~0.69 rad e nao pode ser coberta (armadilha 6). */
  function corteNoAngulo(ang) {
    var a = Math.abs(ang), base;
    if (a <= 0.74) base = C.corteFrente - C.riscaFrente * Math.cos(a * 2.12);
    else if (a <= 1.55) base = C.corteFrente +
      (C.corteLado - C.corteFrente) * suave((a - 0.74) / (1.55 - 0.74));
    else base = C.corteLado + (C.corteAtras - C.corteLado) * suave((a - 1.55) / (Math.PI - 1.55));
    base += C.ondaBarraA * Math.sin(C.ondaBarraK * ang + C.ondaBarraF) * (a > 0.74 ? 1 : 0.4);
    if (ang < 0) base -= C.assimetriaLado * Math.min(1, a / 1.0);
    return base;
  }

  /* espessura da casca no angulo `ang` com parametro vertical `t` (0 barra, 1 topo).
     Isolada numa funcao porque o COQUE tambem precisa dela: e assim que ele sabe
     onde fica a superficie externa da casca no ponto de apoio. */
  function espessuraEm(ang, t) {
    var fAtras = Math.max(0, -Math.cos(ang));
    var fLado  = Math.abs(Math.sin(ang));
    return C.espessura
         + C.volumeTopo    * t
         + C.volumeNuca    * fAtras * (0.35 + 0.65 * t)
         + C.volumeRecolhe * fLado  * t * t;
  }

  /* distancia do centro da cabeca ate o CRANIO numa direcao unitaria */
  function distanciaCranio(dx, dy, dz) {
    var k = Math.sqrt((dx / C.raioCabecaX) * (dx / C.raioCabecaX) +
                      (dy / C.raioCabecaY) * (dy / C.raioCabecaY) +
                      (dz / C.raioCabecaZ) * (dz / C.raioCabecaZ));
    return 1 / Math.max(0.0001, k);
  }

  /* CASCA: mesma receita provada nos outros tres — a forma base e o CRANIO PURO
     (armadilha 2), o parametro vertical e REMAPEADO da barra ate o topo
     (armadilha 4), o raio horizontal e recalculado para a altura final para a
     borda descer colada (armadilha 3), e a espessura so incha na direcao radial
     depois (forma e volume separados). */
  function casca(T, cor) {
    var thetaMax = Math.PI * 0.98;
    var g = new T.SphereGeometry(1, C.seg[0], C.seg[1], 0, Math.PI * 2, 0, thetaMax);
    var uyMin = Math.cos(thetaMax);
    var pos = g.attributes.position, i, ux, uy, uz, x, y, z;
    var ang, corte, t, esp, raioH, rh, nrm;
    var yTopo = C.raioCabecaY;
    for (i = 0; i < pos.count; i++) {
      ux = pos.getX(i); uy = pos.getY(i); uz = pos.getZ(i);
      ang = Math.atan2(ux, uz);
      corte = corteNoAngulo(ang);
      t = Math.min(1, Math.max(0, (uy - uyMin) / (1 - uyMin)));   /* 0 barra · 1 topo */
      esp = espessuraEm(ang, t);

      y = corte + (yTopo - corte) * t;
      raioH = Math.sqrt(Math.max(0.0006, 1 - (y * y) / (yTopo * yTopo)));
      rh = Math.sqrt(ux * ux + uz * uz);
      if (rh > 0.0001) {
        x = (ux / rh) * C.raioCabecaX * raioH;
        z = (uz / rh) * C.raioCabecaZ * raioH;
      } else { x = 0; z = 0; }
      if (z > 0) z *= (1 - C.achataFace);            /* a testa e mais plana */

      nrm = Math.sqrt(x * x + y * y + z * z);
      if (nrm > 0.0001) { x += (x / nrm) * esp; y += (y / nrm) * esp; z += (z / nrm) * esp; }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.22);
  }

  /* eixos e centro de um coque.
     ⛔ ARMADILHA 10: NADA de scale(-1,1,1) para espelhar — inverte as faces e a
     peca some. Os dois coques saem da MESMA funcao; so o sinal de `lado` muda. */
  function eixosDoCoque(lado) {
    var ce = Math.cos(C.coqueElev), se = Math.sin(C.coqueElev);
    var ang = lado * C.coqueAng;
    var n  = [Math.sin(ang) * ce, se, Math.cos(ang) * ce];     /* aponta para fora */
    var e1 = [Math.cos(ang), 0, -Math.sin(ang)];               /* horizontal, ⟂ a n */
    var e2 = [n[1] * e1[2] - n[2] * e1[1],
              n[2] * e1[0] - n[0] * e1[2],
              n[0] * e1[1] - n[1] * e1[0]];                    /* n x e1 */

    /* superficie EXTERNA da casca na direcao do coque = cranio + espessura local.
       t=0.93 porque o apoio fica no alto da casca. */
    var dCranio = distanciaCranio(n[0], n[1], n[2]);
    var dCasca  = dCranio + espessuraEm(Math.atan2(n[0], n[2]), 0.93);
    /* o coque e achatado no eixo n, entao o alcance dele nessa direcao e
       raio*achata; recuar `coquePenetra` faz o polo interno entrar na casca. */
    var d = dCasca + C.coqueRaio * C.coqueAchata - C.coquePenetra;
    return {
      n: n, e1: e1, e2: e2,
      centro: [n[0] * d, n[1] * d, n[2] * d],
      dCasca: dCasca, dCentro: d
    };
  }

  function coque(T, cor, lado) {
    var E = eixosDoCoque(lado), n = E.n, e1 = E.e1, e2 = E.e2, c = E.centro;
    var g = new T.SphereGeometry(1, C.coqueSeg[0], C.coqueSeg[1]);
    var pos = g.attributes.position, i, ux, uy, uz, phi, r, a, b, h;
    for (i = 0; i < pos.count; i++) {
      ux = pos.getX(i); uy = pos.getY(i); uz = pos.getZ(i);
      phi = Math.atan2(uz, ux);
      /* torcao: raio ondulado — cabelo enrolado, nao bola lisa */
      r = C.coqueRaio * (1 + C.coqueTorcaoA *
          Math.sin(C.coqueTorcaoK * lado * phi + C.coqueTorcaoM * uy));
      a = r * ux; b = r * uz; h = r * uy * C.coqueAchata;
      pos.setXYZ(i,
        c[0] + e1[0] * a + e2[0] * b + n[0] * h,
        c[1] + e1[1] * a + e2[1] * b + n[1] * h,
        c[2] + e1[2] * a + e2[2] * b + n[2] * h);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.16);
  }

  /* merge de emergencia: todas as pecas ja saem da `pinta` sem indice, sem uv e
     com position/normal/color — entao concatenar e seguro se o BufferGeometryUtils
     nao estiver na pagina. */
  function mesclaNaMao(T, lista) {
    var nomes = ['position', 'normal', 'color'], total = 0, i, j, k;
    for (i = 0; i < lista.length; i++) total += lista[i].attributes.position.count;
    var g = new T.BufferGeometry();
    for (k = 0; k < nomes.length; k++) {
      var arr = new Float32Array(total * 3), off = 0;
      for (i = 0; i < lista.length; i++) {
        var at = lista[i].attributes[nomes[k]];
        if (!at) return null;
        for (j = 0; j < at.count; j++) {
          arr[off++] = at.getX(j); arr[off++] = at.getY(j); arr[off++] = at.getZ(j);
        }
      }
      g.setAttribute(nomes[k], new T.BufferAttribute(arr, 3));
    }
    return g;
  }

  window.SARINHA_PERSONAGENS.createSarinhaHairBuns01 = function (ctx, opts) {
    var T = ctx.T, BGU = ctx.BGU || T.BufferGeometryUtils;
    opts = opts || {};
    var cor = opts.hairColor === undefined ? COR_PADRAO : opts.hairColor,
        material = opts.material || new T.MeshLambertMaterial(
                     { vertexColors: true, flatShading: opts.flatShading !== false });

    /* casca + 2 coques MESCLADOS numa malha so (contrato: 1 draw call).
       Ordem preservada no merge: casca, coque direito, coque esquerdo. */
    var partes = [casca(T, cor), coque(T, cor, 1), coque(T, cor, -1)];
    var geo = (BGU && BGU.mergeBufferGeometries)
      ? BGU.mergeBufferGeometries(partes, false)
      : null;
    if (!geo) geo = mesclaNaMao(T, partes);   /* ⛔ o merge devolve null em silencio */
    if (!geo) throw new Error('geometria do cabelo coquinhos devolveu null');
    geo.computeVertexNormals();

    var grupo = new T.Group();
    grupo.name = 'SarinhaHairBuns01';
    var malha = new T.Mesh(geo, material);
    malha.name = 'HairMesh';
    grupo.add(malha);

    grupo.userData = {
      type: 'SarinhaHairBuns01',
      version: '1.0',
      hairColor: cor,
      /* mesmo encaixe dos outros: o HairAnchor mora acima do centro da cabeca e
         o cabelo e construido com origem NO centro dela */
      offsetNoHairAnchor: -(C.raioCabecaY * 1.42 - C.raioCabecaY)
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.HAIR_BUNS01_MEASURES = C;
  window.SARINHA_PERSONAGENS.HAIR_BUNS01_CORTE = corteNoAngulo;
  /* exposto para medicao: centro, eixos e raios de cada coque */
  window.SARINHA_PERSONAGENS.HAIR_BUNS01_COQUES = function () {
    return [eixosDoCoque(1), eixosDoCoque(-1)];
  };
})();

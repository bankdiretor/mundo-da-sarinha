/* SarinhaHairLong01 — CHAR-03: cabelo LONGO LISO do Sarinha Mini Style.
   Senta no mesmo HairAnchor do CHAR-02 e acompanha o HeadPivot.
   Ficha: fichas/CHAR-03-CABELO-LONGO.md

   A diferenca para o cabelo curto nao e "mais casca": e a CORTINA. Ate a altura
   do maxilar o cabelo acompanha o cranio; dali para baixo ele para de seguir a
   esfera e CAI RETO ate a altura do peito, mantendo o raio horizontal. E isso
   que da laterais em cortina e extremidade limpa e plana, como pede a ficha.

   Contrato do mundo: 1 MeshLambertMaterial vertexColors + flatShading, cor por
   vertice, sem luz, sem sombra real, sem textura, sem import/export. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  /* escala CRUA do sistema (personagem cru = 1.974; cabeca com centro em y=0
     local, raios 0.350 / 0.315 / 0.2835). O torso vai de 0.725 a 1.505 e a
     cabeca de 1.344 a 1.974 — o peito fica por volta de 1.25 absoluto, que em
     coordenada local do cabelo e y = -0.41. E ate ali que a cortina desce. */
  var C = {
    raioCabecaX: 0.350,
    raioCabecaY: 0.315,
    raioCabecaZ: 0.2835,
    achataFace:  0.14,

    espessura:   0.022,
    volumeTopo:  0.030,
    volumeNuca:  0.040,

    /* onde o cabelo termina, em y local */
    corteFrente:  0.235,    /* franja leve, acima da sobrancelha (termina em 0.150) */
    corteLado:   -0.410,    /* cortina ate a altura do peito */
    corteAtras:  -0.430,    /* atras desce um tico mais */

    /* ⭐ A QUEBRA: acima dela o cabelo segue o cranio; abaixo, vira cortina reta.
       Sem isso a "casca" continuaria fechando para dentro e o cabelo longo sairia
       com forma de sino colado no pescoco em vez de cair. */
    yQuebra:     -0.115,
    afinaPonta:   0.93,     /* a cortina afina de leve na barra (extremidade limpa) */

    /* ondulacao suave da barra e assimetria — o mesmo remedio do CHAR-02 contra
       a cara de capacete, em dose menor (cabelo liso e mais quieto) */
    ondaBarraA:   0.020,
    ondaBarraK:   2.60,
    ondaBarraF:   0.90,
    assimetriaLado: 0.012,

    /* 16 gomos x 10 aneis: a queda longa precisa de aneis, nao de gomos.
       16*10*2 - 16 = 304 tri, dentro da meta 240-340 da ficha. */
    seg:         [16, 10]
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
     ⚠️ a franja tem de parar acima da sobrancelha (que termina em 0.150) — foi a
     armadilha nº 2 do CHAR-02 e vale igual aqui. */
  function corteNoAngulo(ang) {
    var a = Math.abs(ang), base;
    if (a <= 0.74) base = C.corteFrente;                    /* arco da testa */
    else if (a <= 1.30) base = C.corteFrente +   /* a cortina so comeca DEPOIS da
        sobrancelha (que vive ate ~0.69 rad) — mesma correcao do CHAR-04 */
      (C.corteLado - C.corteFrente) * suave((a - 0.74) / (1.30 - 0.74));
    else base = C.corteLado + (C.corteAtras - C.corteLado) * suave((a - 1.30) / (Math.PI - 1.30));
    base += C.ondaBarraA * Math.sin(C.ondaBarraK * ang + C.ondaBarraF) * (a > 0.74 ? 1 : 0.35);
    if (ang < 0) base -= C.assimetriaLado * Math.min(1, a / 1.0);
    return base;
  }

  function casca(T, cor) {
    var thetaMax = Math.PI * 0.98;
    var g = new T.SphereGeometry(1, C.seg[0], C.seg[1], 0, Math.PI * 2, 0, thetaMax);
    var uyMin = Math.cos(thetaMax);
    var pos = g.attributes.position, i, ux, uy, uz, x, y, z, esp, ang, corte;
    var fAtras, t, rh, raioH, yRef, kAfina;
    var yTopo = C.raioCabecaY;
    for (i = 0; i < pos.count; i++) {
      ux = pos.getX(i); uy = pos.getY(i); uz = pos.getZ(i);
      ang = Math.atan2(ux, uz);
      corte = corteNoAngulo(ang);
      fAtras = Math.max(0, -Math.cos(ang));

      t = Math.min(1, Math.max(0, (uy - uyMin) / (1 - uyMin)));   /* 0 barra · 1 topo */
      esp = C.espessura + C.volumeTopo * t + C.volumeNuca * fAtras * (0.35 + 0.65 * t);

      /* ⛔ ERRO PAGO — o "V" no alto da cabeca que o Ivan viu.
         Interpolar y de `corte` ate o topo distorce a malha quando a barra varia
         muito com o angulo: na frente a barra fica a 0.08 do topo e atras a
         0.745, entao os aneis comprimem de um lado e esticam do outro e a coroa
         RASGA. Agora a CALOTA (acima da quebra) e igual para todos os angulos —
         segue a esfera — e so a CORTINA (abaixo) estica ate a barra de cada
         coluna. O curto nao tinha o defeito porque a barra dele quase nao varia. */
      var tQuebra = (C.yQuebra / yTopo - uyMin) / (1 - uyMin);
      if (t >= tQuebra) {
        /* calota = esfera pura, IGUAL em todos os angulos (nao distorce a coroa).
           Onde a barra esta acima da quebra (a franja, na frente), os aneis que
           cairiam abaixo dela sobem ate a barra — e o raio e recalculado logo
           abaixo para a altura final, entao nao vira aba de viseira. */
        y = Math.max(uy * yTopo, corte);
      } else {
        /* cortina: estica da quebra ate a barra daquela coluna */
        y = Math.max(corte, corte + (C.yQuebra - corte) * (t / Math.max(0.001, tQuebra)));
      }

      /* ⭐ CORTINA: o raio horizontal congela na altura da quebra. Acima dela o
         cabelo acompanha o cranio; abaixo, cai reto — e ainda afina de leve na
         ponta, para a barra ficar limpa em vez de um tubo cortado. */
      yRef = Math.max(y, C.yQuebra);
      raioH = Math.sqrt(Math.max(0.0006, 1 - (yRef * yRef) / (yTopo * yTopo)));
      kAfina = (y < C.yQuebra)
        ? 1 - (1 - C.afinaPonta) * Math.min(1, (C.yQuebra - y) / Math.max(0.001, C.yQuebra - corte))
        : 1;

      rh = Math.sqrt(ux * ux + uz * uz);
      if (rh > 0.0001) {
        x = (ux / rh) * C.raioCabecaX * raioH * kAfina;
        z = (uz / rh) * C.raioCabecaZ * raioH * kAfina;
      } else { x = 0; z = 0; }
      if (z > 0) z *= (1 - C.achataFace);

      /* incha na direcao radial (forma e volume separados — licao do CHAR-02) */
      var nrm = Math.sqrt(x * x + y * y + z * z);
      if (nrm > 0.0001) { x += (x / nrm) * esp; y += (y / nrm) * esp; z += (z / nrm) * esp; }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.22);
  }

  window.SARINHA_PERSONAGENS.createSarinhaHairLong01 = function (ctx, opts) {
    var T = ctx.T;
    opts = opts || {};
    var cor = opts.hairColor === undefined ? COR_PADRAO : opts.hairColor,
        material = opts.material || new T.MeshLambertMaterial(
                     { vertexColors: true, flatShading: opts.flatShading !== false });

    var grupo = new T.Group();
    grupo.name = 'SarinhaHairLong01';
    var malha = new T.Mesh(casca(T, cor), material);
    malha.name = 'HairMesh';
    grupo.add(malha);

    grupo.userData = {
      type: 'SarinhaHairLong01',
      version: '1.0',
      hairColor: cor,
      /* mesmo encaixe do cabelo curto: o HairAnchor mora acima do centro da
         cabeca e o cabelo e construido com origem NO centro */
      offsetNoHairAnchor: -(C.raioCabecaY * 1.42 - C.raioCabecaY)
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.HAIR_LONG01_MEASURES = C;
  window.SARINHA_PERSONAGENS.HAIR_LONG01_CORTE = corteNoAngulo;
})();

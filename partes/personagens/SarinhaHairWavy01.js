/* SarinhaHairWavy01 — CHAR-04: cabelo LONGO ONDULADO do Sarinha Mini Style.
   Senta no mesmo HairAnchor do CHAR-02 e acompanha o HeadPivot.
   Ficha: fichas/CHAR-04-CABELO-ONDULADO.md

   Mesma CORTINA do CHAR-03 (o cabelo para de seguir o cranio no maxilar e cai
   ate o peito), com uma diferenca: a cortina ONDULA. O raio horizontal ganha uma
   senoide na ALTURA — duas ondas suaves ao longo da queda — e a barra fica
   irregular. Sao as ondas que separam este do liso; o volume e a queda sao iguais.

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
    afinaPonta:   0.90,     /* a cortina afina de leve na barra */

    /* ⭐ AS ONDAS (o que faz deste o ondulado):
       o raio da cortina varia com a ALTURA, criando duas curvas suaves na queda.
       A amplitude cresce para baixo — raiz quieta, pontas soltas, como cabelo de
       verdade. A fase gira com o angulo para as ondas nao ficarem alinhadas em
       volta da cabeca (isso pareceria um vaso torneado, nao cabelo). */
    /* ⛔ ERRO PAGO: a amplitude era 0.085 (8,5% do raio). MEDIDO contra o liso:
       diferenca maxima de 0.028 — 8% do raio da cabeca, invisivel. O Ivan olhou
       e perguntou "nao e o mesmo do anterior?". Estava. Para a onda LER, o
       deslocamento tem de ser da ordem de 0.08-0.12 absoluto. */
    ondaRaioA:    0.40,     /* amplitude maxima, na ponta (0.30 nao separava o envelope do longo v1.2) */
    ondaRaioK:   13.0,      /* ~1,5 onda ao longo da queda (onda GRANDE, nao ripple) */
    ondaRaioFase: 1.10,
    ondaGiraPorAngulo: 0.55,
    /* a onda tambem empurra em Z: cabelo ondulado tem movimento para fora, nao
       so 'engorda e afina' */
    ondaZ:        0.080,
    /* a barra tambem ondula mais que no liso: pontas desiguais */
    ondaBarraExtra: 0.030,

    /* ondulacao suave da barra e assimetria — o mesmo remedio do CHAR-02 contra
       a cara de capacete, em dose menor (cabelo liso e mais quieto) */
    ondaBarraA:   0.020,
    ondaBarraK:   2.60,
    ondaBarraF:   0.90,
    assimetriaLado: 0.012,

    /* ⚠️ Onde gastar o triangulo, medido: com 16x14 (432 tri) o PERSONAGEM ia a
       1.805 e estourava o teto de 1.800. O corte saiu dos GOMOS (16→14), nao dos
       aneis: anel e onda, gomo e so redondeza. 14x13 = 350 tri, personagem 1.723.
       Ainda acima da meta do liso (240-340) — a onda custa, e e ela a peca. */
    seg:         [14, 13]
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
    else if (a <= 1.30) base = C.corteFrente +               /* a cortina so comeca
        DEPOIS da sobrancelha (que vive ate ~0.69 rad) */
      (C.corteLado - C.corteFrente) * suave((a - 0.74) / (1.30 - 0.74));
    else base = C.corteLado + (C.corteAtras - C.corteLado) * suave((a - 1.30) / (Math.PI - 1.30));
    base += C.ondaBarraA * Math.sin(C.ondaBarraK * ang + C.ondaBarraF) * (a > 0.74 ? 1 : 0.35);
    if (a > 0.74) base += C.ondaBarraExtra * Math.sin(5.3 * ang + 2.1);
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
      var desce = (y < C.yQuebra)
        ? Math.min(1, (C.yQuebra - y) / Math.max(0.001, C.yQuebra - corte)) : 0;
      kAfina = 1 - (1 - C.afinaPonta) * desce;
      /* onda: amplitude cresce com a descida (raiz quieta, ponta solta) */
      var faseOnda = C.ondaRaioK * y + C.ondaRaioFase + ang * C.ondaGiraPorAngulo;
      if (desce > 0) kAfina *= 1 + C.ondaRaioA * desce * Math.sin(faseOnda);

      rh = Math.sqrt(ux * ux + uz * uz);
      if (rh > 0.0001) {
        x = (ux / rh) * C.raioCabecaX * raioH * kAfina;
        z = (uz / rh) * C.raioCabecaZ * raioH * kAfina;
      } else { x = 0; z = 0; }
      if (z > 0) z *= (1 - C.achataFace);
      /* movimento em Z: a onda nao so engorda o raio, ela ondula para fora */
      if (desce > 0) z += C.ondaZ * desce * Math.cos(faseOnda) * (uz >= 0 ? 1 : -1);

      /* incha na direcao radial (forma e volume separados — licao do CHAR-02) */
      var nrm = Math.sqrt(x * x + y * y + z * z);
      if (nrm > 0.0001) { x += (x / nrm) * esp; y += (y / nrm) * esp; z += (z / nrm) * esp; }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.22);
  }

  window.SARINHA_PERSONAGENS.createSarinhaHairWavy01 = function (ctx, opts) {
    var T = ctx.T;
    opts = opts || {};
    var cor = opts.hairColor === undefined ? COR_PADRAO : opts.hairColor,
        material = opts.material || new T.MeshLambertMaterial(
                     { vertexColors: true, flatShading: opts.flatShading !== false });

    var grupo = new T.Group();
    grupo.name = 'SarinhaHairWavy01';
    var malha = new T.Mesh(casca(T, cor), material);
    malha.name = 'HairMesh';
    grupo.add(malha);

    grupo.userData = {
      type: 'SarinhaHairWavy01',
      version: '1.0',
      hairColor: cor,
      /* mesmo encaixe do cabelo curto: o HairAnchor mora acima do centro da
         cabeca e o cabelo e construido com origem NO centro */
      offsetNoHairAnchor: -(C.raioCabecaY * 1.42 - C.raioCabecaY)
    };
    return grupo;
  };

  window.SARINHA_PERSONAGENS.HAIR_WAVY01_MEASURES = C;
  window.SARINHA_PERSONAGENS.HAIR_WAVY01_CORTE = corteNoAngulo;
})();

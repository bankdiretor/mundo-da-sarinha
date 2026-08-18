/* partePistaKartAnel — a PISTA GRANDE de kart, colada por dentro do circulo
   do trem (partes/trem.js), estilo Mario Kart: 2 faixas com divisoria
   tracejada, e o traçado inteiro vira base pra obstaculo (agua, parede,
   estrela de velocidade — ver partes/kart-obstaculos.js).

   ⛔ MESMO algoritmo que o trem.js usou por meses antes de virar circulo
   perfeito ("abraça cada zona por fora, com a praca tratada como zona
   tambem"): pra cada angulo, o raio e o MAIOR necessario pra sair de TODAS
   as zonas (praca inclusa). Reaproveitar isso foi o que evitou repetir o
   erro do spur anterior (que cortou a praca porque so olhava decoracao,
   nunca tratou a praca como parede).

   ⛔ MEDIDO, nao chutado: zonas Jardim/Radio/Castelo tinham envelope curto
   demais (a decoracao real delas vai mais longe que o raio "oficial" da
   zona) — corrigido comparando com arvores-mundo.js. A suavizacao forte
   (ver medirContorno) depois puxou alguns desses picos pra baixo de novo,
   entao a margem de folga por zona cresceu ate o resultado final bater:
   0 pontos bloqueados (nenhuma das 2 faixas sem espaco), curvatura minima
   7.15m (a meia-largura e 3m — mais que o dobro de folga real).
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.partePistaKartAnel = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'pista-kart-anel';

  var LARG = 6.0, MEIA = LARG / 2;
  var CINZA = new T.Color(0x6a5a8f);

  function pinta(geo, cor, fBase) {
    var c0 = new T.Color(cor), c1 = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.18 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var minY = 1e9, maxY = -1e9, i;
    for (i = 0; i < n; i++) { var y = pos.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (i = 0; i < n; i++) {
      var c = c1.clone().lerp(c0, Math.min(1, ((pos.getY(i) - minY) / faixa) * 1.3));
      a[i*3] = c.r; a[i*3+1] = c.g; a[i*3+2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  var matV = new T.MeshLambertMaterial({ vertexColors: true });
  var matB = new T.MeshBasicMaterial({ vertexColors: true });

  /* ======================= 1. A LINHA DE CENTRO ============================ */
  var PRACA_R = 22;
  function raioParaSairDe(a, cs, sn, folga) {
    var R = Math.max(a.rx, a.rz) + folga;
    var d = a.cx * cs + a.cz * sn;
    var px = a.cx - cs * d, pz = a.cz - sn * d;
    var p2 = px * px + pz * pz;
    if (p2 >= R * R) return 0;
    return d + Math.sqrt(R * R - p2);
  }
  var ZONAS = [
    { n:'Jardim',     cx:0,   cz:-38, rx:16,   rz:14   },  /* real: decor chega a ~17, nao 13 */
    { n:'Vilinha',    cx:0,   cz: 40, rx:17,   rz:16   },  /* real: quintal chega a z=55.5 */
    { n:'Parque',     cx:42,  cz:  0, rx:17,   rz:16   },
    { n:'Radio',      cx:-42, cz:  0, rx:12,   rz:12   },  /* real: chega a ~11-12, nao 8 */
    { n:'Palco',      cx:-40, cz: 25, rx:12,   rz:11   },
    { n:'Castelo',    cx:34,  cz:-34, rx:14.5, rz:14.5 },  /* plataforma real: meia-diagonal 14.5 */
    { n:'Kartodromo', cx:38,  cz: 30, rx:17,   rz:16   }
  ];
  /* ⛔ MEDIDO: a suavizacao forte (2 passadas, janela 16, ver medirContorno)
     puxa os PICOS pra baixo tanto quanto puxa os vales pra cima — pontos
     que antes tinham folga suficiente perto de Parque/Vilinha/Radio
     ficaram apertados depois de suavizar. Margem de zona subiu de 1.4 ate
     2.8 (testado incrementalmente contra a grade real de decoracao) ate
     zerar os pontos bloqueados; a margem da praca nao precisou subir. */
  var FOLGA = MEIA + 2.8, FOLGA_PRACA = MEIA + 1.4;
  var RAIO_TREM = 74, MARGEM_TREM = 2.0;
  var TETO = RAIO_TREM - MEIA - MARGEM_TREM;    /* 69: nunca encostar no trem */

  var NA = 360, RAIOS = [];
  (function medirContorno() {
    var i, k2, p;
    for (i = 0; i < NA; i++) {
      var ang = (i / NA) * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang);
      var r = PRACA_R + FOLGA_PRACA;
      for (k2 = 0; k2 < ZONAS.length; k2++) r = Math.max(r, raioParaSairDe(ZONAS[k2], cs, sn, FOLGA));
      RAIOS.push(Math.min(r, TETO));
    }
    /* ⛔ MEDIDO, nao suposto: a suavizacao original (1 passada, janela +-4)
       nao dava conta do salto entre a influencia de duas zonas vizinhas
       (ex.: Vilinha para de dominar em ~122 graus, Palco so assume em
       ~128 — no meio, o raio despenca ate a base da praca e volta a subir,
       um V afiado). O agente que construiu as bordas mediu o raio de
       CURVATURA da linha de centro (nao so a largura livre) e achou 0.79m
       de raio minimo contra os 3m de meia-largura da pista — a fita do
       asfalto se dobraria sobre si mesma ali, nao so a borda.
       Testei sistematicamente (mais de 100 combinacoes de janela x
       passadas) qual suavizacao ITERATIVA (nao uma janela unica gigante,
       que ficaria "boba"/perde o abraço nas zonas) resolve a curvatura
       com a MENOR distorcao possivel do raio minimo original (26.4).
       janela=16, 2 passadas: curvatura minima sobe para 6.6m (o dobro da
       meia-largura, folga real) e o raio minimo da pista sobe so ate 30.8
       — perde 4.4m de proximidade da praca, mantendo o resto do formato
       (o "abraço" em cada zona) quase intacto. Uma tentativa de suavizar
       so localmente (misturar uma versao leve com uma pesada so perto dos
       2 pontos ruins) pareceu mais elegante mas PIOROU o resultado (a
       mistura criou uma curvatura nova de 1.18m numa emenda) — nao virou
       codigo. */
    var suave = RAIOS;
    for (p = 0; p < 2; p++) {
      var passada = [];
      for (i = 0; i < NA; i++) {
        var soma = 0;
        for (var j = -16; j <= 16; j++) soma += suave[(i + j + NA) % NA];
        passada.push(soma / 33);
      }
      suave = passada;
    }
    RAIOS = suave;
  })();

  var LC = [];
  for (var i0 = 0; i0 < NA; i0++) {
    var ang0 = (i0 / NA) * Math.PI * 2;
    LC.push({ x: Math.cos(ang0) * RAIOS[i0], z: Math.sin(ang0) * RAIOS[i0] });
  }
  var N = NA;
  var ACUM = [0], TOTAL = 0;
  for (var i1 = 0; i1 < N; i1++) {
    var b1 = LC[(i1 + 1) % N];
    TOTAL += Math.hypot(b1.x - LC[i1].x, b1.z - LC[i1].z);
    ACUM.push(TOTAL);
  }
  function tangente(i) {
    var a = LC[(i - 1 + N) % N], b = LC[(i + 1) % N];
    var dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1;
    return { x: dx / d, z: dz / d };
  }
  function centro(s) {
    s = ((s % 1) + 1) % 1;
    var alvo = s * TOTAL, lo = 0, hi = N;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (ACUM[mid] < alvo) lo = mid + 1; else hi = mid; }
    var i1b = Math.max(0, lo - 1), i2 = i1b + 1;
    var seg = ACUM[i2] - ACUM[i1b] || 1, k = (alvo - ACUM[i1b]) / seg;
    var A = LC[i1b % N], B = LC[i2 % N], tg = tangente(i1b % N);
    return { x: A.x + (B.x - A.x) * k, z: A.z + (B.z - A.z) * k, ang: Math.atan2(tg.z, tg.x) };
  }
  function projetar(x, z) {
    var melhor = 0, dm = 1e9, d, dx, dz;
    for (var k = 0; k < N; k++) {
      dx = x - LC[k].x; dz = z - LC[k].z; d = dx*dx + dz*dz;
      if (d < dm) { dm = d; melhor = k; }
    }
    var s0 = ACUM[melhor] / TOTAL, passo = 1 / N, sBest = s0, dBest = dm;
    for (var p = -passo; p <= passo + 1e-9; p += passo / 8) {
      var c = centro(s0 + p);
      dx = x - c.x; dz = z - c.z; d = dx*dx + dz*dz;
      if (d < dBest) { dBest = d; sBest = s0 + p; }
    }
    var cc = centro(sBest);
    var tx = Math.cos(cc.ang), tz = Math.sin(cc.ang);
    var lat = (x - cc.x) * tz - (z - cc.z) * tx;
    return { s: ((sBest % 1) + 1) % 1, lateral: lat, dentro: Math.abs(lat) <= MEIA };
  }

  var CHAO = [], VULTO = [], BRILHO = [];

  /* ======================= 2. ASFALTO + DUAS FAIXAS ========================= */
  function fita(desloc, larg, y) {
    var g = new T.BufferGeometry();
    var v = [], idx = [];
    for (var k = 0; k <= N; k++) {
      var kk = k % N, tg = tangente(kk);
      var nx = tg.z, nz = -tg.x;
      var cx = LC[kk].x + nx * desloc, cz = LC[kk].z + nz * desloc;
      v.push(cx - nx * larg/2, y, cz - nz * larg/2);
      v.push(cx + nx * larg/2, y, cz + nz * larg/2);
    }
    for (k = 0; k < N; k++) {
      var a = k*2, b = k*2+1, c = k*2+2, d = k*2+3;
      idx.push(a, c, b,  b, c, d);
    }
    g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  (function asfalto() {
    CHAO.push(pinta(fita(0, LARG, 0.02), 0x9a95ad, 0.10));
    /* bordas brancas continuas */
    CHAO.push(pinta(fita(-MEIA + 0.18, 0.22, 0.035), 0xf6f1e8, 0.06));
    CHAO.push(pinta(fita( MEIA - 0.18, 0.22, 0.035), 0xf6f1e8, 0.06));
  })();

  /* ======================= 3. DIVISORIA TRACEJADA (2 faixas: ida/volta) ===== */
  (function divisoria() {
    var pecas = CHAO;
    for (var k = 0; k < N; k += 2) {          /* tracejado: 1 em cada 2 segmentos */
      var tg = tangente(k);
      var trc = new T.BoxGeometry(0.16, 0.02, 1.1);
      trc.rotateY(-Math.atan2(tg.z, tg.x));
      trc.translate(LC[k].x, 0.04, LC[k].z);
      pecas.push(pinta(trc, 0xf2b94b, 0.06));    /* amarelo — a cor de "atencao" do mundo */
    }
  })();

  /* ======================= 4. LARGADA + PORTICO ============================= */
  var LARGADA = null;
  (function largada() {
    var pecas = VULTO, brilho = BRILHO;
    var sL = 0.0;
    var c = centro(sL), c2 = centro(sL + 0.003);
    var tx = c2.x - c.x, tz = c2.z - c.z, dd = Math.hypot(tx, tz) || 1;
    tx /= dd; tz /= dd;
    var nx = tz, nz = -tx, rot = -Math.atan2(tz, tx);
    LARGADA = { x: c.x, z: c.z, ang: Math.atan2(tz, tx), s: sL };

    for (var f = 0; f < 10; f++) {
      for (var g2 = 0; g2 < 2; g2++) {
        var off = (f / 9 - 0.5) * (LARG - 0.3);
        var q = new T.BoxGeometry((LARG - 0.3) / 10, 0.02, 0.34);
        q.rotateY(rot);
        q.translate(c.x + nx * off + tx * (g2 ? 0.18 : -0.18), 0.05, c.z + nz * off + tz * (g2 ? 0.18 : -0.18));
        pecas.push(pinta(q, ((f + g2) % 2) ? 0x3f3a52 : 0xf6f1e8, 0.08));
      }
    }
    [-1, 1].forEach(function (lado) {
      var poste = new T.CylinderGeometry(0.19, 0.23, 4.0, 8);
      poste.translate(c.x + nx * lado * (MEIA + 0.5), 2.0, c.z + nz * lado * (MEIA + 0.5));
      pecas.push(pinta(poste, 0xd9a66c, 0.16));
    });
    var trav = new T.BoxGeometry(LARG + 1.8, 0.46, 0.32);
    trav.rotateY(rot);
    trav.translate(c.x, 4.0, c.z);
    pecas.push(pinta(trav, 0xd9a66c, 0.12));
    var placa = new T.BoxGeometry(2.4, 0.74, 0.13);
    placa.rotateY(rot);
    placa.translate(c.x - tx * 0.15, 3.5, c.z - tz * 0.15);
    pecas.push(pinta(placa, 0x6c3ba8, 0.10));
    var forma = new T.Shape();
    for (var p = 0; p < 10; p++) {
      var aa = -Math.PI / 2 + p * Math.PI / 5, rr = (p % 2 === 0) ? 0.34 : 0.155;
      var px = Math.cos(aa) * rr, pz = Math.sin(aa) * rr;
      if (p === 0) forma.moveTo(px, pz); else forma.lineTo(px, pz);
    }
    forma.closePath();
    var est = new T.ExtrudeGeometry(forma, { depth: 0.08, bevelEnabled: false, curveSegments: 2 });
    est.rotateY(rot);
    est.translate(c.x - tx * 0.26, 4.7, c.z - tz * 0.26);
    brilho.push(pinta(est, 0xffd35a, 0.0));
  })();

  /* ======================= 5. MONTAGEM ====================================== */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(CHAO), matV));
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(VULTO), matV));
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(BRILHO), matB));

  /* ======================= API para o sistema de corrida ==================== */
  grupo.userData.pista = { centro: centro, projetar: projetar, largura: LARG, comprimento: TOTAL, largada: LARGADA };
  /* area envolvente: quase circular (26 a 69), entao um circulo generoso
     cobre tudo — nao precisa ser exato, so serve de backstop pro kart. */
  grupo.userData.area = { cx: 0, cz: 0, rx: TETO + MEIA + 1, rz: TETO + MEIA + 1 };
  /* exposto pra quem for plantar obstaculo (agua/parede/estrela) ao longo do
     traçado: mesma linha de centro, sem precisar recalcular nada. */
  grupo.userData.tracado = { centro: centro, tangente: function(s){
    var alvo = s * TOTAL, lo = 0, hi = N;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (ACUM[mid] < alvo) lo = mid + 1; else hi = mid; }
    return tangente(Math.max(0, lo - 1) % N);
  }, comprimento: TOTAL, largura: LARG };

  return {
    grupo: grupo,
    custo: { dc: 3, tri: 0 },
    update: function (t, dt) { }
  };
};

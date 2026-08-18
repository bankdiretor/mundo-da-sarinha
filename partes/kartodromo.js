/* parteKartodromo — o KARTODROMO do sudeste. So o cenario e a GEOMETRIA DO
   TRACADO; quem pilota e o sistema KART do mundo-sarinha.html, que consome
   `userData.pista`.

   A pista nao e um oval chato: reta principal, curva ampla, uma chicane
   (esquerda-direita) e um grampo. O asfalto e uma FAIXA (ribbon) de
   quadrilateros construida ao longo da linha de centro — juntar retangulos
   soltos abre buraco na curva e soma faces coplanares.

   ⛔ Zona: centro (38,30), tem de caber na elipse rx=14 rz=13 (e a area que o
   trem.js contorna). Quem mexer no tracado remede isso.
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteKartodromo = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'kartodromo';

  var CX = 38, CZ = 30;             /* centro da zona                        */
  var LARG = 3.6;                   /* largura da pista                      */
  var MEIA = LARG / 2;
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

  /* ======================= 1. A LINHA DE CENTRO ============================
     Raio que varia com o angulo: da a reta, a curva ampla, a chicane e o
     grampo sem precisar de spline. Amplitudes pequenas — em pista estreita,
     ondulacao grande vira no que a crianca nao consegue seguir. */
  function raioNo(a) {
    return 11.6
         + 1.30 * Math.cos(a)               /* achata um lado: a reta principal */
         - 0.95 * Math.sin(2 * a)           /* curva ampla                      */
         + 1.10 * Math.sin(3 * a + 0.6)     /* chicane                          */
         - 1.45 * Math.cos(2 * a + 1.2);    /* grampo                           */
  }
  var N = 176;                               /* amostras da linha de centro   */
  var LC = [];                               /* {x,z} ao longo do tracado     */
  var i, rMax = 0;
  for (i = 0; i < N; i++) rMax = Math.max(rMax, raioNo((i / N) * Math.PI * 2));
  /* ⛔ A zona e uma ELIPSE rx=14 rz=13; o que sai dela o trem corta. O que
     fica mais longe da linha de centro nao e a pista: e a mureta de pneus
     (meia largura + 0.95 + 0.32). Se o tracado passar do teto, encolhe TUDO
     proporcionalmente em vez de deixar vazar — medido, nao estimado. */
  var TETO = Math.min(17, 16) - (MEIA + 1.30);
  var ESC = rMax > TETO ? TETO / rMax : 1;
  for (i = 0; i < N; i++) {
    var ang = (i / N) * Math.PI * 2, r = raioNo(ang) * ESC;
    LC.push({ x: CX + Math.cos(ang) * r, z: CZ + Math.sin(ang) * r });
  }
  /* comprimento acumulado: e o que transforma indice em "s" de 0..1 */
  var ACUM = [0], TOTAL = 0;
  for (i = 0; i < N; i++) {   /* i ja declarado acima */
    var b = LC[(i + 1) % N];
    TOTAL += Math.hypot(b.x - LC[i].x, b.z - LC[i].z);
    ACUM.push(TOTAL);
  }
  /* tangente por diferenca central: mais estavel que a frente/atras */
  function tangente(i) {
    var a = LC[(i - 1 + N) % N], b = LC[(i + 1) % N];
    var dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz) || 1;
    return { x: dx / d, z: dz / d };
  }
  /* ponto na linha de centro em s (0..1), por interpolacao no comprimento */
  function centro(s) {
    s = ((s % 1) + 1) % 1;
    var alvo = s * TOTAL, lo = 0, hi = N;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (ACUM[mid] < alvo) lo = mid + 1; else hi = mid; }
    var i1 = Math.max(0, lo - 1), i2 = i1 + 1;
    var seg = ACUM[i2] - ACUM[i1] || 1, k = (alvo - ACUM[i1]) / seg;
    var A = LC[i1 % N], B = LC[i2 % N], tg = tangente(i1 % N);
    return { x: A.x + (B.x - A.x) * k, z: A.z + (B.z - A.z) * k,
             ang: Math.atan2(tg.z, tg.x) };
  }
  /* onde (x,z) cai na pista: amostragem densa + refino local */
  function projetar(x, z) {
    var melhor = 0, dm = 1e9, d, dx, dz;
    for (var k = 0; k < N; k++) {
      dx = x - LC[k].x; dz = z - LC[k].z; d = dx*dx + dz*dz;
      if (d < dm) { dm = d; melhor = k; }
    }
    /* refina entre o vizinho anterior e o seguinte */
    var s0 = ACUM[melhor] / TOTAL, passo = 1 / N, sBest = s0, dBest = dm;
    for (var p = -passo; p <= passo + 1e-9; p += passo / 8) {
      var c = centro(s0 + p);
      dx = x - c.x; dz = z - c.z; d = dx*dx + dz*dz;
      if (d < dBest) { dBest = d; sBest = s0 + p; }
    }
    var cc = centro(sBest);
    var tx = Math.cos(cc.ang), tz = Math.sin(cc.ang);
    /* lateral com sinal: produto vetorial da tangente com o vetor ate o ponto */
    var lat = (x - cc.x) * tz - (z - cc.z) * tx;
    return { s: ((sBest % 1) + 1) % 1, lateral: lat, dentro: Math.abs(lat) <= MEIA };
  }

  /* Duas sacolas: tudo que for Lambert entra numa malha so no fim. Cada
     `new Mesh` e um draw call, e o orcamento e 4 para a zona inteira. */
  var CHAO = [], VULTO = [], BRILHO = [];

  /* ======================= 2. ASFALTO + FAIXAS ============================= */
  (function asfalto() {
    var pecas = CHAO;
    /* faixa (ribbon): 2 triangulos por segmento, sem buraco na curva */
    function fita(desloc, larg, y) {
      var g = new T.BufferGeometry();
      var v = [], idx = [];
      for (var k = 0; k <= N; k++) {
        var kk = k % N, tg = tangente(kk);
        var nx = tg.z, nz = -tg.x;            /* normal no plano do chao */
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
    /* asfalto claro (o mundo e pastel: nada de preto) */
    pecas.push(pinta(fita(0, LARG, 0.02), 0x9a95ad, 0.10));
    /* faixas brancas nas duas bordas, um fio acima para nao brigar */
    pecas.push(pinta(fita(-MEIA + 0.16, 0.20, 0.035), 0xf6f1e8, 0.06));
    pecas.push(pinta(fita( MEIA - 0.16, 0.20, 0.035), 0xf6f1e8, 0.06));
  })();

  /* ======================= 3. ZEBRAS (curbs) ==============================
     So onde a pista curva de verdade — zebra em reta nao existe e ainda
     gastaria triangulo. Alternam vermelho e creme. */
  (function zebras() {
    var pecas = CHAO;
    for (var k = 0; k < N; k += 2) {
      var t0 = tangente(k), t1 = tangente((k + 3) % N);
      var curva = Math.abs(Math.atan2(t0.x*t1.z - t0.z*t1.x, t0.x*t1.x + t0.z*t1.z));
      if (curva < 0.075) continue;            /* trecho reto: sem zebra */
      var tg = t0, nx = tg.z, nz = -tg.x;
      var lado = ((t0.x*t1.z - t0.z*t1.x) > 0) ? 1 : -1;   /* borda de fora */
      var d = lado * (MEIA + 0.26);
      var g = new T.BoxGeometry(0.52, 0.07, 0.46);
      g.rotateY(-Math.atan2(tg.z, tg.x));
      g.translate(LC[k].x + nx * d, 0.035, LC[k].z + nz * d);
      pecas.push(pinta(g, (k % 4) ? 0xe8536e : 0xf6f1e8, 0.12));
    }
  })();

  /* ======================= 4. MURETA DE PNEUS =============================
     InstancedMesh: sao dezenas, e cada um NAO pode virar um draw call. */
  var PNEUS = [];
  (function murosDePneu() {
    for (var k = 0; k < N; k += 3) {
      var t0 = tangente(k), t1 = tangente((k + 4) % N);
      var curva = Math.abs(Math.atan2(t0.x*t1.z - t0.z*t1.x, t0.x*t1.x + t0.z*t1.z));
      if (curva < 0.10) continue;             /* so nas curvas perigosas */
      var lado = ((t0.x*t1.z - t0.z*t1.x) > 0) ? 1 : -1;
      var nx = t0.z, nz = -t0.x, d = lado * (MEIA + 0.95);
      PNEUS.push({ x: LC[k].x + nx * d, z: LC[k].z + nz * d, i: k });
    }
    if (!PNEUS.length) return;
    var g = new T.CylinderGeometry(0.32, 0.32, 0.34, 7);
    g.translate(0, 0.17, 0);
    g.deleteAttribute('uv');
    var n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i*3] = 1; a[i*3+1] = 1; a[i*3+2] = 1; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    /* ⛔ material PROPRIO: no r147 o programa fica em cache no material, e uma
       malha sem setColorAt compila sem a diretiva de cor por instancia — foi
       o que deixou as copas das arvores brancas. */
    var matPneu = new T.MeshLambertMaterial({ vertexColors: true });
    var inst = new T.InstancedMesh(g, matPneu, PNEUS.length);
    var mtx = new T.Matrix4(), qua = new T.Quaternion(), vec = new T.Vector3(), esc = new T.Vector3(1,1,1);
    var CORES = [0x6e6880, 0x8a7fa6, 0xe8a7b2, 0xe9b44c];
    for (i = 0; i < PNEUS.length; i++) {
      mtx.compose(vec.set(PNEUS[i].x, 0, PNEUS[i].z), qua.identity(), esc);
      inst.setMatrixAt(i, mtx);
      inst.setColorAt(i, new T.Color(CORES[i % CORES.length]));
    }
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    grupo.add(inst);
  })();

  /* ======================= 5. LARGADA + PORTICO =========================== */
  var LARGADA = null;
  (function largada() {
    var pecas = VULTO, brilho = BRILHO;
    var sL = 0.0;
    var c = centro(sL), c2 = centro(sL + 0.004);
    var tx = c2.x - c.x, tz = c2.z - c.z, dd = Math.hypot(tx, tz) || 1;
    tx /= dd; tz /= dd;
    var nx = tz, nz = -tx;
    var rot = -Math.atan2(tz, tx);
    LARGADA = { x: c.x, z: c.z, ang: Math.atan2(tz, tx), s: sL };

    /* quadriculado atravessando a pista */
    for (var f = 0; f < 8; f++) {
      for (var g2 = 0; g2 < 2; g2++) {
        var off = (f / 7 - 0.5) * (LARG - 0.2);
        var q = new T.BoxGeometry((LARG - 0.2) / 8, 0.02, 0.30);
        q.rotateY(rot);
        q.translate(c.x + nx * off + tx * (g2 ? 0.16 : -0.16),
                    0.045,
                    c.z + nz * off + tz * (g2 ? 0.16 : -0.16));
        pecas.push(pinta(q, ((f + g2) % 2) ? 0x3f3a52 : 0xf6f1e8, 0.08));
      }
    }
    /* dois postes + travessa: o portico */
    [-1, 1].forEach(function (lado) {
      var poste = new T.CylinderGeometry(0.17, 0.20, 3.3, 8);
      poste.translate(c.x + nx * lado * (MEIA + 0.5), 1.65, c.z + nz * lado * (MEIA + 0.5));
      pecas.push(pinta(poste, 0xd9a66c, 0.16));
    });
    var trav = new T.BoxGeometry(LARG + 1.6, 0.42, 0.30);
    trav.rotateY(rot);
    trav.translate(c.x, 3.30, c.z);
    pecas.push(pinta(trav, 0xd9a66c, 0.12));
    /* placa da travessa */
    var placa = new T.BoxGeometry(2.1, 0.66, 0.12);
    placa.rotateY(rot);
    placa.translate(c.x - tx * 0.14, 2.86, c.z - tz * 0.14);
    pecas.push(pinta(placa, 0x6c3ba8, 0.10));
    /* estrelinha dourada no alto — em MeshBasic: e assim que este mundo
       acende coisa sem luz nova */
    var forma = new T.Shape();
    for (var p = 0; p < 10; p++) {
      var aa = -Math.PI / 2 + p * Math.PI / 5, rr = (p % 2 === 0) ? 0.30 : 0.135;
      var px = Math.cos(aa) * rr, pz = Math.sin(aa) * rr;
      if (p === 0) forma.moveTo(px, pz); else forma.lineTo(px, pz);
    }
    forma.closePath();
    var est = new T.ExtrudeGeometry(forma, { depth: 0.07, bevelEnabled: false, curveSegments: 2 });
    est.rotateY(rot);
    est.translate(c.x - tx * 0.24, 3.86, c.z - tz * 0.24);
    brilho.push(pinta(est, 0xffd35a, 0.0));
  })();

  /* ======================= 6. BOXES + ARQUIBANCADA ======================== */
  (function boxesEArquibancada() {
    var pecas = VULTO;
    /* 3 baias cobertas. ⛔ Ficavam do lado de FORA e eram elas (com a
       arquibancada) que faziam a zona estourar a elipse rx=14 rz=13 — o
       tracado tinha de encolher para pagar por elas. Foram para DENTRO do
       anel, que estava vazio: e onde o paddock fica num kartodromo de
       verdade, e o miolo passou a ter o que olhar.
       A normal (tz,-tx) aponta para FORA (a linha corre em angulo
       crescente), entao "para dentro" e o sinal negativo. */
    var cB = centro(0.055);
    var t2 = centro(0.059);
    var tx = t2.x - cB.x, tz = t2.z - cB.z, dd = Math.hypot(tx, tz) || 1;
    tx /= dd; tz /= dd;
    var nx = tz, nz = -tx, rot = -Math.atan2(tz, tx);
    var CORES = [0xe8536e, 0x9fb4d8, 0xe9b44c];
    for (var b = 0; b < 3; b++) {
      var off = (b - 1) * 2.0;
      var bx = cB.x - nx * (MEIA + 2.1) + tx * off;
      var bz = cB.z - nz * (MEIA + 2.1) + tz * off;
      var chao = new T.BoxGeometry(1.7, 0.10, 1.7);
      chao.rotateY(rot); chao.translate(bx, 0.05, bz);
      pecas.push(pinta(chao, 0xefdac4, 0.12));
      /* o fundo da baia fica do lado oposto a pista: a boca olha para o
         asfalto, senao a crianca ve so as costas dos boxes */
      var fundo = new T.BoxGeometry(1.7, 1.25, 0.14);
      fundo.rotateY(rot);
      fundo.translate(bx - nx * 0.78, 0.72, bz - nz * 0.78);
      pecas.push(pinta(fundo, CORES[b], 0.16));
      var teto = new T.BoxGeometry(1.9, 0.12, 1.9);
      teto.rotateY(rot); teto.translate(bx, 1.42, bz);
      pecas.push(pinta(teto, CORES[b], 0.10));
      [-1, 1].forEach(function (l) {
        var col = new T.CylinderGeometry(0.075, 0.075, 1.36, 6);
        col.translate(bx + tx * l * 0.78 + nx * 0.74, 0.68, bz + tz * l * 0.78 + nz * 0.74);
        pecas.push(pinta(col, 0xd9a66c, 0.16));
      });
    }
    /* arquibancada de 3 degraus, tambem no miolo, virada para a curva ampla */
    var cA = centro(0.30), c2 = centro(0.304);
    var ax = c2.x - cA.x, az = c2.z - cA.z, da = Math.hypot(ax, az) || 1;
    ax /= da; az /= da;
    var mx = az, mz = -ax, rotA = -Math.atan2(az, ax);
    for (var d3 = 0; d3 < 3; d3++) {
      var deg = new T.BoxGeometry(5.2, 0.34, 0.72);
      deg.rotateY(rotA);
      deg.translate(cA.x - mx * (MEIA + 1.3 + d3 * 0.72), 0.17 + d3 * 0.34,
                    cA.z - mz * (MEIA + 1.3 + d3 * 0.72));
      pecas.push(pinta(deg, d3 === 1 ? 0xe7d3be : 0xefdac4, 0.14));
    }
  })();

  /* ======================= 7. MONTAGEM (4 draw calls) ===================== */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(CHAO), matV));    /* asfalto+zebra */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(VULTO), matV));   /* portico+boxes */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(BRILHO), matB));  /* a estrela     */
  /* + o InstancedMesh dos pneus = 4 */

  /* ======================= API para o sistema de corrida ================== */
  grupo.userData.pista = {
    centro: centro,
    projetar: projetar,
    largura: LARG,
    comprimento: TOTAL,
    largada: LARGADA
  };
  grupo.userData.area = { cx: CX, cz: CZ, rx: 17, rz: 16 };

  return {
    grupo: grupo,
    custo: { dc: 5, tri: 0 },
    update: function (t, dt) { }
  };
};

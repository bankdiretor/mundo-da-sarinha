/* parteEncanto -- o ENCANTO que veste o mundo inteiro: decoracao instanciada
   espalhada pelas bordas e nos vaos das areas existentes (praca, jardim,
   vilinha, parque, festa). Nada invade o miolo de nenhuma area; tudo fica
   na faixa logo fora de cada borda, ou no anel externo da praca.
   Contrato: partes/CONTRATO.md.

   5 familias, 5 draw calls (o orcamento desta peca e maior: ate 9000 tri):
     1) cerejeiras  -- InstancedMesh, tronco + 3 esferas de copa (com colisor)
     2) postes      -- InstancedMesh, so o poste fino de feltro (Lambert)
     3) notas       -- InstancedMesh, bolinha+haste, flutuam e giram devagar
     4) arbustos    -- InstancedMesh, meia-esfera + 3 pontinhos de flor
     5) brilho      -- InstancedMesh UNICA para cupula-de-lampiao + estrelinha:
                       as duas sao pontinhos de luz dourada com o MESMO
                       MeshBasicMaterial: junta-las numa so malha e o que fecha
                       a conta em 5 draw calls em vez de 6 (senao a cupula,
                       que precisa de material proprio que BRILHA, separado do
                       poste de feltro, estouraria o teto sozinha).

   Nada de luz nova, nada de asset externo, nada de sombra de engine.
   Ruido deterministico (mesma semente sempre) para o cenario nao mudar
   de cara a cada carregamento. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteEncanto = function (ctx) {
  var T = ctx.T, M = ctx.M, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'encanto';

  /* ---------- ruido deterministico (mesmo padrao do parteCentro) ---------- */
  var semente = 20260815;
  function rnd() {
    semente = (semente * 1664525 + 1013904223) % 4294967296;
    return semente / 4294967296;
  }

  /* ---------- pintura: cor por vertice com degrade vertical automatico ---------- */
  var CINZA = new T.Color(0x6a5a8f);
  function pinta(geo, cor, fBase) {
    if (geo.index) geo = geo.toNonIndexed();   /* normaliza: armadilha do contrato */
    var cTopo = (cor && cor.isColor) ? cor : new T.Color(cor);
    var cBase = cTopo.clone().lerp(CINZA, fBase === undefined ? 0.18 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var f = (ys[k] - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.2));
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  /* branco puro: para pecas onde a cor real vem por instancia (setColorAt) */
  function pintaBranco(geo) {
    if (geo.index) geo = geo.toNonIndexed();
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = 1; a[i * 3 + 1] = 1; a[i * 3 + 2] = 1; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }

  var matFeltro = new T.MeshLambertMaterial({ vertexColors: true });
  var matBrilho = new T.MeshBasicMaterial({ vertexColors: true, color: 0xffffff });

  /* =========================================================================
     GEOGRAFIA -- onde cada area comeca e termina (Contrato + geografia dada)
     ========================================================================= */
  var AREAS = [
    { key: 'praca',   anel: true, rMin: 15, rMax: 21 },
    { key: 'jardim',  cx: 0,   cz: -38, rx: 13,   rz: 10 },
    { key: 'vilinha', cx: 0,   cz: 40,  rx: 15.5, rz: 12.4 },
    { key: 'parque',  cx: 42,  cz: 0,   rx: 12,   rz: 11 },
    { key: 'festa',   cx: -42, cz: 0,   rx: 12,   rz: 11 }
  ];

  /* corredores livres (dados prontos): nunca ponha nada dentro destas faixas */
  function emCorredor(x, z) {
    if (Math.abs(z) < 4 && ((x >= 19 && x <= 32) || (x <= -19 && x >= -32))) return true;
    if (Math.abs(x) < 4 && ((z >= 19 && z <= 32) || (z <= -19 && z >= -30))) return true;
    return false;
  }
  /* fica perto de um dos 4 pontos cardeais (onde estao os portais em raio 20)? */
  function pertoCardeal(ang) {
    var d = Math.PI / 2, folga = 14 * Math.PI / 180;
    var m = ((ang % d) + d) % d;
    return (m < folga || m > d - folga);
  }

  /* devolve um ponto {x,z,ang} na borda/vao de uma area, tentando fugir de
     corredor e (na praca) dos portais cardeais. extra = quanto alem da borda. */
  function gerarPonto(area, extraMin, extraMax) {
    var x = 0, z = 0, ang = 0;
    for (var tent = 0; tent < 12; tent++) {
      ang = rnd() * Math.PI * 2;
      if (area.anel) {
        if (pertoCardeal(ang)) continue;
        var raio = area.rMin + rnd() * (area.rMax - area.rMin);
        x = Math.cos(ang) * raio; z = Math.sin(ang) * raio;
      } else {
        var extra = extraMin + rnd() * (extraMax - extraMin);
        var k = 1 + extra / ((area.rx + area.rz) / 2);
        x = area.cx + Math.cos(ang) * area.rx * k;
        z = area.cz + Math.sin(ang) * area.rz * k;
      }
      if (emCorredor(x, z)) continue;
      return { x: x, z: z, ang: ang };
    }
    return { x: x, z: z, ang: ang };   /* raro: aceita mesmo assim apos 12 tentativas */
  }
  function distribuir(contagens, extraMin, extraMax) {
    var pontos = [];
    for (var i = 0; i < AREAS.length; i++) {
      var area = AREAS[i], n = contagens[area.key] || 0;
      for (var j = 0; j < n; j++) pontos.push(gerarPonto(area, extraMin, extraMax));
    }
    return pontos;
  }

  /* ---------- matrizes reutilizaveis (nada de alocar dentro do loop) ---------- */
  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(),
      vec = new T.Vector3(), esc = new T.Vector3();

  function contaTri(geo) {
    if (!geo) return 0;
    return (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  }

  /* =========================================================================
     1) CEREJEIRAS -- tronco marrom-lilas + copa de 3 esferas rosa-claro
     ========================================================================= */
  var TRONCO_COR = new T.Color(0x8a6a52).lerp(new T.Color(M.paleta.roxo), 0.32);
  var geoCereja = (function () {
    var pecas = [];
    var tronco = new T.CylinderGeometry(0.055, 0.09, 1.0, 5, 1, true);
    tronco.translate(0, 0.5, 0);
    pecas.push(pinta(tronco, TRONCO_COR, 0.24));
    var copa1 = new T.SphereGeometry(0.46, 6, 4); copa1.translate(0, 1.55, 0);
    pecas.push(pinta(copa1, 0xffc6d0, 0.16));
    var copa2 = new T.SphereGeometry(0.40, 6, 4); copa2.translate(-0.30, 1.34, 0.16);
    pecas.push(pinta(copa2, 0xffb3c6, 0.16));
    var copa3 = new T.SphereGeometry(0.38, 6, 4); copa3.translate(0.32, 1.36, -0.14);
    pecas.push(pinta(copa3, 0xf7a8bd, 0.16));
    return BGU.mergeBufferGeometries(pecas);
  })();
  var PONTOS_CEREJA = distribuir({ praca: 6, jardim: 5, vilinha: 5, parque: 5, festa: 5 }, 0.5, 2.6);
  var instCereja = new T.InstancedMesh(geoCereja, matFeltro, PONTOS_CEREJA.length);
  (function () {
    for (var i = 0; i < PONTOS_CEREJA.length; i++) {
      var p = PONTOS_CEREJA[i];
      var s = 0.85 + rnd() * 0.4;
      eul.set(0, rnd() * Math.PI * 2, 0);
      qua.setFromEuler(eul);
      vec.set(p.x, 0, p.z);
      esc.set(s, s, s);
      mtx.compose(vec, qua, esc);
      instCereja.setMatrixAt(i, mtx);
      ctx.COLISORES.push({ x: p.x, z: p.z, raio: 0.55 });
    }
    instCereja.instanceMatrix.needsUpdate = true;
  })();
  grupo.add(instCereja);

  /* =========================================================================
     2) LAMPIOES -- so o poste fino de feltro (a cupula vive na familia 5)
     ========================================================================= */
  var geoPoste = (function () {
    var g = new T.CylinderGeometry(0.035, 0.06, 1.65, 5, 1, true);
    g.translate(0, 0.825, 0);
    return pinta(g, M.paleta.creme, 0.22);
  })();
  var PONTOS_POSTE = distribuir({ praca: 6, jardim: 6, vilinha: 6, parque: 6, festa: 6 }, 0.3, 2.2);
  var instPoste = new T.InstancedMesh(geoPoste, matFeltro, PONTOS_POSTE.length);
  (function () {
    for (var i = 0; i < PONTOS_POSTE.length; i++) {
      var p = PONTOS_POSTE[i];
      var s = 0.9 + rnd() * 0.25;
      eul.set(0, rnd() * Math.PI * 2, 0);
      qua.setFromEuler(eul);
      vec.set(p.x, 0, p.z);
      esc.set(s, s, s);
      mtx.compose(vec, qua, esc);
      instPoste.setMatrixAt(i, mtx);
    }
    instPoste.instanceMatrix.needsUpdate = true;
  })();
  grupo.add(instPoste);

  /* =========================================================================
     3) NOTAS MUSICAIS FLUTUANTES -- bolinha + hastezinha, sobem e descem
     ========================================================================= */
  var geoNota = (function () {
    var pecas = [];
    var cab = new T.SphereGeometry(0.16, 6, 4); cab.translate(0, 0.30, 0);
    pecas.push(cab);
    var haste = new T.CylinderGeometry(0.025, 0.035, 0.5, 5, 1, true);
    haste.translate(0.13, -0.02, 0);
    pecas.push(haste);
    pecas.forEach(function (g) { g.deleteAttribute('uv'); });
    return pintaBranco(BGU.mergeBufferGeometries(pecas));
  })();
  var PONTOS_NOTA = distribuir({ praca: 8, jardim: 8, vilinha: 8, parque: 8, festa: 8 }, 0.2, 3.0);
  var CORES_NOTA = [new T.Color(0xffd166), new T.Color(0xe9b44c), new T.Color(0xd9c9ff), new T.Color(0xc0aef5)];
  var NOTAS = PONTOS_NOTA.map(function (p, i) {
    return {
      x: p.x, z: p.z,
      baseY: 2.75 + (rnd() - 0.5) * 0.2,
      amp: 1.0 + rnd() * 0.15,
      vel: 0.35 + rnd() * 0.35,
      fase: i * 0.9 + rnd() * Math.PI * 2,
      rotY: rnd() * Math.PI * 2,
      escala: 0.8 + rnd() * 0.45
    };
  });
  var instNota = new T.InstancedMesh(geoNota, matFeltro, NOTAS.length);
  instNota.instanceMatrix.setUsage(T.DynamicDrawUsage);
  for (var iN = 0; iN < NOTAS.length; iN++) instNota.setColorAt(iN, CORES_NOTA[iN % CORES_NOTA.length]);
  if (instNota.instanceColor) instNota.instanceColor.needsUpdate = true;
  function atualizarNotas(t) {
    for (var i = 0; i < NOTAS.length; i++) {
      var n = NOTAS[i];
      var y = n.baseY + Math.sin(t * n.vel + n.fase) * n.amp;
      var bal = Math.sin(t * n.vel * 1.7 + n.fase) * 0.22;
      eul.set(bal * 0.5, n.rotY + t * 0.12, bal * 0.35);
      qua.setFromEuler(eul);
      vec.set(n.x, y, n.z);
      esc.set(n.escala, n.escala, n.escala);
      mtx.compose(vec, qua, esc);
      instNota.setMatrixAt(i, mtx);
    }
    instNota.instanceMatrix.needsUpdate = true;
  }
  atualizarNotas(0);
  grupo.add(instNota);

  /* =========================================================================
     4) ARBUSTOS FLORIDOS -- meia-esfera + 3 pontinhos de flor
     ========================================================================= */
  var geoArbusto = (function () {
    var pecas = [];
    var monte = new T.SphereGeometry(0.45, 6, 4).scale(1, 0.62, 1);
    monte.translate(0, 0.279, 0);
    pecas.push(pinta(monte, M.corGrama, 0.20));
    var pontinhos = [
      { x: 0.17, y: 0.44, z: 0.06, cor: M.paleta.rosa },
      { x: -0.15, y: 0.42, z: 0.11, cor: M.paleta.mel },
      { x: 0.02, y: 0.46, z: -0.16, cor: 0xf7f2e8 }
    ];
    for (var i = 0; i < pontinhos.length; i++) {
      var p = pontinhos[i];
      var pt = new T.SphereGeometry(0.09, 4, 3);
      pt.translate(p.x, p.y, p.z);
      pecas.push(pinta(pt, p.cor, 0.08));
    }
    return BGU.mergeBufferGeometries(pecas);
  })();
  var PONTOS_ARBUSTO = distribuir({ praca: 4, jardim: 5, vilinha: 5, parque: 5, festa: 5 }, 0.3, 2.2);
  var instArbusto = new T.InstancedMesh(geoArbusto, matFeltro, PONTOS_ARBUSTO.length);
  (function () {
    for (var i = 0; i < PONTOS_ARBUSTO.length; i++) {
      var p = PONTOS_ARBUSTO[i];
      var s = 0.75 + rnd() * 0.55;
      eul.set(0, rnd() * Math.PI * 2, 0);
      qua.setFromEuler(eul);
      vec.set(p.x, 0, p.z);
      esc.set(s, s, s);
      mtx.compose(vec, qua, esc);
      instArbusto.setMatrixAt(i, mtx);
    }
    instArbusto.instanceMatrix.needsUpdate = true;
  })();
  grupo.add(instArbusto);

  /* =========================================================================
     5) BRILHO -- cupula-de-lampiao (em cima de cada poste) + estrelinha-de-chao,
        na MESMA InstancedMesh (mesmo material que brilha, MeshBasicMaterial)
     ========================================================================= */
  var geoBrilho = pintaBranco(new T.OctahedronGeometry(1, 0));
  var PONTOS_ESTRELA = distribuir({ praca: 2, jardim: 4, vilinha: 4, parque: 4, festa: 4 }, 0.1, 2.0);
  var CUPOLA_COR = new T.Color(0xffe9a8), ESTRELA_COR = new T.Color(0xffd166);
  var totalBrilho = PONTOS_POSTE.length + PONTOS_ESTRELA.length;
  var instBrilho = new T.InstancedMesh(geoBrilho, matBrilho, totalBrilho);
  (function () {
    var i;
    for (i = 0; i < PONTOS_POSTE.length; i++) {
      var p = PONTOS_POSTE[i];
      eul.set(rnd() * 0.3 - 0.15, rnd() * Math.PI * 2, rnd() * 0.3 - 0.15);
      qua.setFromEuler(eul);
      vec.set(p.x, 1.65 + 0.14, p.z);
      var s = 0.17 + rnd() * 0.05;
      esc.set(s, s * 1.15, s);
      mtx.compose(vec, qua, esc);
      instBrilho.setMatrixAt(i, mtx);
      instBrilho.setColorAt(i, CUPOLA_COR);
    }
    for (var j = 0; j < PONTOS_ESTRELA.length; j++) {
      var p2 = PONTOS_ESTRELA[j];
      eul.set(0, rnd() * Math.PI * 2, 0);
      qua.setFromEuler(eul);
      vec.set(p2.x, 0.035, p2.z);
      var s2 = 0.10 + rnd() * 0.06;
      esc.set(s2, s2 * 0.35, s2);
      mtx.compose(vec, qua, esc);
      instBrilho.setMatrixAt(PONTOS_POSTE.length + j, mtx);
      instBrilho.setColorAt(PONTOS_POSTE.length + j, ESTRELA_COR);
    }
    instBrilho.instanceMatrix.needsUpdate = true;
    if (instBrilho.instanceColor) instBrilho.instanceColor.needsUpdate = true;
  })();
  grupo.add(instBrilho);

  /* ---------- custo medido de verdade: instancias x tris da unidade ----------
     Rodado de verdade com THREE r147 (Node + BufferGeometryUtils) antes de
     integrar: cereja 118x26=3068, poste 10x30=300, nota 46x40=1840,
     arbusto 84x24=2016, brilho 8x48=384 (30 cupulas + 18 estrelinhas
     partilhando a mesma malha). Total 7608 tri, 5 draw calls -- dentro do
     teto de 9000 tri / 5 dc desta peca. */
  var TRI_TOTAL =
    contaTri(geoCereja) * PONTOS_CEREJA.length +
    contaTri(geoPoste) * PONTOS_POSTE.length +
    contaTri(geoNota) * NOTAS.length +
    contaTri(geoArbusto) * PONTOS_ARBUSTO.length +
    contaTri(geoBrilho) * totalBrilho;

  return {
    grupo: grupo,
    update: function (t, dt) { atualizarNotas(t); },
    custo: { dc: 5, tri: TRI_TOTAL }
  };
};

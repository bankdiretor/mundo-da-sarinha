/* parteEncanto -- o ENCANTO que veste o mundo inteiro: decoracao instanciada
   espalhada pelas bordas e nos vaos das areas existentes (praca, jardim,
   vilinha, parque, festa). Nada invade o miolo de nenhuma area; tudo fica
   na faixa logo fora de cada borda, ou no anel externo da praca.
   Contrato: partes/CONTRATO.md.

   2 familias, 2 draw calls (o orcamento desta peca e maior: ate 9000 tri):
     2) notas       -- InstancedMesh, bolinha+haste, flutuam e giram devagar
     4) brilho      -- InstancedMesh so com as estrelinhas-de-chao douradas

   As 26 "cerejeiras" que moravam aqui (familia 1 original) foram
   substituidas pela arvore-flor nova (partes/arvores-mundo.js, grupo
   E_CEREJEIRAS_ENCANTO, mesmas 26 coordenadas - simuladas a partir
   desta MESMA semente/distribuir() antes de remover) - pedido do Ivan
   de trocar toda arvore antiga do jogo pela nova.

   Os 30 POSTES FINOS (antiga familia 1 v2) e as CUPULAS deles (metade
   da familia 4) foram substituidos pela LUMINARIA nova da ficha
   (partes/luminarias-mundo.js) em 16/08 - posicoes extraidas das
   matrizes reais desta peca ANTES de remover, e ajustadas la (a troca
   das cerejeiras tinha deslocado o gerador e 6 postes cairam DENTRO de
   arvores). Nao preservei o consumo do rnd() dos blocos removidos -
   notas/arbustos/estrelinhas caem em pontos diferentes de antes, mesmas
   areas/regras (precedente ja aceito na troca das cerejeiras).

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
  /* material SO das notas (tem setColorAt) — NUNCA compartilhar material
     entre InstancedMesh com e sem instanceColor: o programa fica em cache
     no material e o lado errado herda (copa branca / arbusto PRETO).
     Bug pago 2x: arvores-mundo.js e aqui (arbustos pretos em 16/08). */
  var matFeltroTingido = new T.MeshLambertMaterial({ vertexColors: true });
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

  /* familia 1 (cerejeiras) removida daqui - virou arvore-flor nova em
     partes/arvores-mundo.js (grupo E_CEREJEIRAS_ENCANTO). Nao preservei
     o consumo do gerador determinístico no lugar exato (teria que
     replicar tambem os rnd() por ponto do loop antigo) - postes/notas/
     arbustos abaixo vao cair numa distribuicao diferente da de antes,
     mas ainda dentro das mesmas areas/regras (nunca no miolo nem no
     corredor); nao ha coordenada fixa/importante em jogo aqui pra
     preservar, e o visual esperado (decoracao ambiente espalhada) nao
     muda. Conferido com screenshot depois, sem sobreposicao ruim. */

  /* familia 1 (30 postes finos) removida - virou a LUMINARIA nova em
     partes/luminarias-mundo.js (posicoes extraidas das matrizes desta
     instancia antes de remover, e ajustadas la para fugir das arvores). */

  /* =========================================================================
     2) NOTAS MUSICAIS FLUTUANTES -- bolinha + hastezinha, sobem e descem
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
  var instNota = new T.InstancedMesh(geoNota, matFeltroTingido, NOTAS.length);
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

  /* familia 3 (24 arbustos floridos) removida - virou a MOITA da ficha
     em partes/moitas-mundo.js (matrizes reais extraidas desta instancia
     antes de remover; 1 realocada por afundar em arvore). */

  /* =========================================================================
     4) BRILHO -- so as estrelinhas-de-chao douradas (as cupulas dos postes
        sairam junto com os postes; ver partes/luminarias-mundo.js)
     ========================================================================= */
  var geoBrilho = pintaBranco(new T.OctahedronGeometry(1, 0));
  /* ⛔ RUIDO DE REGRA (achado na auditoria de 16/08): estas estrelinhas de
     chao eram DECORACAO pintada de 0xffd166 — a cor EXATA da estrelinha
     COLETAVEL do jogo (as 12 que acendem o mundo). A crianca corria atras
     de falso positivo, ainda por cima em parque/festa, onde nao existe
     nenhuma estrela de verdade. A cor 0xffd166 agora e RESERVADA do
     coletavel e da guia; a decoracao vira pontinho rosa-perola discreto
     e cai de 18 para 8. */
  var PONTOS_ESTRELA = distribuir({ praca: 1, jardim: 2, vilinha: 2, parque: 2, festa: 1 }, 0.1, 2.0);
  var ESTRELA_COR = new T.Color(0xf0d9e8);
  var totalBrilho = PONTOS_ESTRELA.length;
  var instBrilho = new T.InstancedMesh(geoBrilho, matBrilho, totalBrilho);
  (function () {
    for (var j = 0; j < PONTOS_ESTRELA.length; j++) {
      var p2 = PONTOS_ESTRELA[j];
      eul.set(0, rnd() * Math.PI * 2, 0);
      qua.setFromEuler(eul);
      vec.set(p2.x, 0.035, p2.z);
      var s2 = 0.10 + rnd() * 0.06;
      esc.set(s2, s2 * 0.35, s2);
      mtx.compose(vec, qua, esc);
      instBrilho.setMatrixAt(j, mtx);
      instBrilho.setColorAt(j, ESTRELA_COR);
    }
    instBrilho.instanceMatrix.needsUpdate = true;
    if (instBrilho.instanceColor) instBrilho.instanceColor.needsUpdate = true;
  })();
  grupo.add(instBrilho);

  /* ---------- custo medido de verdade: instancias x tris da unidade ----------
     Depois de remover cerejeiras (-> arvores-mundo.js), postes+cupulas
     (-> luminarias-mundo.js) e arbustos (-> moitas-mundo.js):
     nota 46x40=1840, brilho 8x18=144. Total ~2000 tri, 2 draw calls. */
  var TRI_TOTAL =
    contaTri(geoNota) * NOTAS.length +
    contaTri(geoBrilho) * totalBrilho;

  return {
    grupo: grupo,
    update: function (t, dt) { atualizarNotas(t); },
    custo: { dc: 2, tri: TRI_TOTAL }
  };
};

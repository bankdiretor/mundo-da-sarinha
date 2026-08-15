/* ===========================================================================
   parteRodaPlataforma -- fundacao decorada para a roda-gigante do parque.
   Hoje a plataforma de embarque (caixa 5.4 x 3.4 x 0.34, ja existente em
   parque.js) flutua sozinha no chao do parque. Esta peca so ACRESCENTA
   cenario ao redor dela -- nao mexe em nada que ja existe.

   O que entra:
     1) fundacao circular decorada no chao, ao redor da roda e das 4 pernas
        (aneis concentricos coloridos, sem cobrir os colisores das pernas)
     2) 3 degraus bem baixos na borda norte da plataforma (por onde a
        crianca chega vindo do centro do parque)
     3) guarda-corpo fofo nas duas bordas LONGAS da plataforma, com um vao
        aberto do lado norte (onde ficam os degraus) para nao travar a entrada

   Geometria de referencia (parque.js, NAO editado, so lido para as contas):
     centro/eixo da roda: (43.5, 9.2, 0), raio 7.6
     pernas (colisores ja existentes, raio 0.5): (41.1,-1.9) (45.9,-1.9)
       (41.1,1.9) (45.9,1.9) -- ficam a raio ~3.06 do centro (43.5,0)
     plataforma: caixa 5.4(x) x 3.4(z) x 0.34(y), centro (43.5,0.17,-5.4)
       topo em y=0.34; borda norte em z=-3.7; borda sul em z=-7.1

   ORCAMENTO -- 2 draw calls:
     DC1 (Lambert, cor por vertice): aneis do chao + degraus + postes +
         bolinhas dos postes + travessas do corrimao + sombra dos degraus
     DC2 (Basic dourado, "brilho"): aro externo do chao + 2 chapeuzinhos
         dourados nos postes de entrada (marcam o portal dos degraus)

   Armadilhas do CONTRATO.md ja tratadas:
     - geo.deleteAttribute('uv') em TODA peca antes de mesclar
     - so uso formas com indice (Ring/Box/Cylinder/Sphere/Cone/Torus/Circle);
       nenhuma familia sem indice (Tetrahedron/Icosahedron) entra no merge,
       entao nao precisa normalizar com toNonIndexed()
   =========================================================================== */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteRodaPlataforma = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'rodaPlataforma';

  /* ---------- referencia (parque.js, so leitura) ---------- */
  var CX = 43.5, CZ = 0;                       /* centro da roda-gigante */
  var PLAT = { x0: 40.8, x1: 46.2, zNorte: -3.7, zSul: -7.1, topo: 0.34 };

  /* ---------- paleta (hex direto, igual ao contrato) ---------- */
  var COR_CREME = 0xf4edde, COR_ROSA = 0xe8a7b2, COR_AZULPO = 0x9fb4d8,
      COR_MEL = 0xe9b44c, COR_VERDE = 0xbcd6b0, COR_ROXO = 0x6a3fc5,
      COR_DOURADO = 0xffd166;
  var CINZA = new T.Color(0x6a5a8f);

  /* cor por vertice, uniforme (pecas planas/decal: o proprio padrao de cores
     ja da contraste, nao precisa de gradiente) */
  function pintaPlano(geo, cor) {
    var c = new T.Color(cor);
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }

  /* cor por vertice com gradiente vertical (mais escuro embaixo, ~18% pro
     cinza-azulado) -- regra do contrato para pecas com volume, evita o
     visual "chapado" */
  function pintaVol(geo, cor, fBase) {
    var c0 = new T.Color(cor), c1 = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.18 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var minY = 1e9, maxY = -1e9, ys = [];
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var t = Math.min(1, ((ys[k] - minY) / faixa) * 1.3);
      var c = c1.clone().lerp(c0, t);
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }

  var matV = new T.MeshLambertMaterial({ vertexColors: true });
  var pecasCorpo = [];   /* DC1 */
  var pecasBrilho = [];  /* DC2 */

  /* ================= 1) FUNDACAO CIRCULAR DECORADA =================
     Aneis concentricos no chao, y=0.03 (acima do chao do parque em y=0.006,
     sem brigar de plano). Comeca em raio 4.0 -- os colisores das pernas
     ficam a raio ~3.06 do centro, entao sobra folga -- e vai ate 9.6,
     envolvendo toda a roda. */
  (function fundacao() {
    var SEG = 48;
    var faixas = [
      { r0: 4.00, r1: 4.60, cor: COR_DOURADO },
      { r0: 4.60, r1: 6.00, cor: COR_CREME },
      { r0: 6.00, r1: 6.50, cor: COR_ROSA },
      { r0: 6.50, r1: 8.60, cor: COR_CREME },
      { r0: 8.60, r1: 9.20, cor: COR_AZULPO },
      { r0: 9.20, r1: 9.60, cor: COR_DOURADO }
    ];
    faixas.forEach(function (f) {
      var g = new T.RingGeometry(f.r0, f.r1, SEG, 1).rotateX(-Math.PI / 2);
      g.translate(CX, 0.03, CZ);
      pecasCorpo.push(pintaPlano(g, f.cor));
    });

    /* aro externo dourado (brilhante, "portal" visual da atracao) */
    var rim = new T.TorusGeometry(9.6, 0.05, 6, SEG).rotateX(Math.PI / 2);
    rim.translate(CX, 0.035, CZ);
    rim.deleteAttribute('uv');
    pecasBrilho.push(rim);
  })();

  /* ================= 2) DEGRAUS (borda norte da plataforma) =================
     3 degraus solidos, subindo de y=0 (chao) ate y=0.34 (topo da plataforma),
     terminando exatamente na borda norte z=-3.7. Largura 4.6, centrada em CX
     -- sobra 0.4 de cada lado ate a borda da plataforma (40.8/46.2), onde
     ficam os postes de canto do corrimao. */
  (function degraus() {
    var LARGURA = 4.6, PROF = 0.35, DEGRAUS = 3;
    var ALTURA = PLAT.topo / DEGRAUS;   /* 0.1133 por degrau */
    for (var i = 0; i < DEGRAUS; i++) {
      /* i=0 -> degrau mais ao norte (mais baixo); i=DEGRAUS-1 -> encosta na plataforma */
      var zFundo = PLAT.zNorte - PROF * (DEGRAUS - i);
      var zTopo = zFundo + PROF;
      var alturaTopo = ALTURA * (i + 1);
      var g = new T.BoxGeometry(LARGURA, alturaTopo, PROF);
      g.translate(CX, alturaTopo / 2, (zFundo + zTopo) / 2);
      pecasCorpo.push(pintaVol(g, 0xf0e2cf, 0.16));
    }
    /* sombra de contato, achatada, pra assentar o degrau no chao (truque do
       lampioes.js: tapete pintado a mao em vez de sombra de verdade) */
    var sombra = new T.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    sombra.scale(2.6, 1, 1.1);
    sombra.translate(CX, 0.018, PLAT.zNorte - PROF * DEGRAUS * 0.55);
    pecasCorpo.push(pintaPlano(sombra, new T.Color(COR_CREME).lerp(CINZA, 0.30)));
  })();

  /* ================= 3) GUARDA-CORPO (bordas longas z=-7.1 e z=-3.7) =============
     Postinhos verticais + travessa horizontal por cima. Na borda norte
     (z=-3.7) o trecho x=[41.2,45.8] -- exatamente a largura dos degraus --
     fica ABERTO: nem poste nem travessa ali, so os 2 postes de canto. */
  var POST_R = 0.09, POST_H = 0.42;             /* topo do poste = 0.34+0.42 = 0.76 */
  var TOPO_POSTE = PLAT.topo + POST_H;
  var XS = [40.8, 41.7, 42.6, 43.5, 44.4, 45.3, 46.2];   /* espacamento 0.9 */
  var GAP_X0 = 41.2, GAP_X1 = 45.8;                       /* vao dos degraus */
  var postesEntrada = [];   /* guarda os 2 postes de canto do lado norte, pro chapeuzinho dourado */

  function poste(x, z) {
    var p = new T.CylinderGeometry(POST_R, POST_R * 1.1, POST_H, 6);
    p.translate(x, PLAT.topo + POST_H / 2, z);
    pecasCorpo.push(pintaVol(p, COR_AZULPO, 0.20));
    var bola = new T.SphereGeometry(0.12, 6, 4);
    bola.translate(x, TOPO_POSTE + 0.02, z);
    pecasCorpo.push(pintaVol(bola, COR_ROSA, 0.14));
    ctx.COLISORES.push({ x: x, z: z, raio: 0.15 });
  }
  function travessa(x0, x1, z) {
    var t = new T.BoxGeometry(x1 - x0, 0.07, 0.07);
    t.translate((x0 + x1) / 2, TOPO_POSTE, z);
    pecasCorpo.push(pintaVol(t, COR_CREME, 0.14));
  }

  /* borda sul: corrida inteira, sem vao */
  XS.forEach(function (x) { poste(x, PLAT.zSul); });
  travessa(PLAT.x0, PLAT.x1, PLAT.zSul);

  /* borda norte: so os 2 postes de canto (fora do vao dos degraus) + 2
     travessinhas curtas ligando cada canto ate a boca do vao */
  poste(PLAT.x0, PLAT.zNorte);
  poste(PLAT.x1, PLAT.zNorte);
  postesEntrada.push({ x: PLAT.x0, z: PLAT.zNorte }, { x: PLAT.x1, z: PLAT.zNorte });
  travessa(PLAT.x0, GAP_X0, PLAT.zNorte);
  travessa(GAP_X1, PLAT.x1, PLAT.zNorte);

  /* chapeuzinhos dourados nos 2 postes de entrada -- marcam o portal por
     onde a crianca entra (DC2, junto do aro externo do chao) */
  postesEntrada.forEach(function (p) {
    var chapeu = new T.ConeGeometry(0.13, 0.18, 6);
    chapeu.translate(p.x, TOPO_POSTE + 0.02 + 0.11, p.z);
    chapeu.deleteAttribute('uv');
    pecasBrilho.push(chapeu);
  });

  /* ---------- monta os 2 draw calls ---------- */
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecasCorpo), matV));
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecasBrilho), ctx.materialBrilho(COR_DOURADO)));

  return {
    grupo: grupo,
    update: function (t, dt) { },
    /* medido com THREE r147 real (harness Node com o three@0.147.0 de verdade):
       DC1 (corpo, Lambert vertexColors) = 1208 tri; DC2 (brilho dourado) = 612 tri */
    custo: { dc: 2, tri: 1820 }
  };
};

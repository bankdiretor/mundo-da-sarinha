/* ===========================================================================
   parteRodaFila -- corredorzinho de fila na entrada da roda-gigante.
   Rodada 4 (Interacoes) e PROPOSITALMENTE pequena: das 6 interacoes do plano
   mestre, 5 ja existem (embarque, giro, coletar estrelas, radio tocando,
   vista panoramica) -- so falta "entrar na fila". Esta peca e SO decoracao:
   posta um corredorzinho de postinhos com cordinha guiando o jogador da
   abertura do guarda-corpo ate os degraus da plataforma. Sem mecanica nova,
   sem colisor (o corredor e sugestao visual, nao barreira -- ver ORCAMENTO).

   Geometria de referencia (parque.js + roda-plataforma.js, NAO editados,
   so lidos para as contas):
     eixo da roda / da plataforma: x=43.5
     plataforma: caixa 5.4(x) x 3.4(z) x 0.34(y), topo em y=0.34
     guarda-corpo (roda-plataforma.js): vao ABERTO em z=-3.7, entre x=41.2
       e x=45.8 -- e por ali que o jogador entra, vindo do norte (z perto
       de 0, do centro do parque) andando para o sul
     pernas da roda (colisores raio 0.5, roda-estrutura.js/parque.js):
       (41.1,-1.9) (45.9,-1.9) (41.1,1.9) (45.9,1.9) -- fora do corredor

   Corredor: 1.2m de largura (x=42.9 a x=44.1, centralizado no eixo 43.5),
   de z=-1.7 a z=-3.3 -- comeca pouco depois de onde o jogador vem do centro
   do parque e termina 0.4 antes do vao do guarda-corpo (z=-3.7), sem
   encostar nele. 3 postes por fileira (6 no total), cordinha fina ligando
   os postes de cada fileira. Tapete rosa fino no chao entre as fileiras.

   ORCAMENTO -- 1 draw call so (Lambert, cor por vertice): hastes + bolinhas
   dos 6 postes + 4 segmentos de cordinha + tapete. MIRE BAIXO: o parque ja
   esta em 51 dc / 71k tri (teto de alerta 60/90k) e esta rodada foi
   encolhida de proposito -- ver ORCAMENTO-RODA-GIGANTE.md.

   Armadilhas do CONTRATO.md ja tratadas:
     - geo.deleteAttribute('uv') em toda peca antes de mesclar
     - so uso formas com indice (Cylinder/Sphere/Box/Plane); nenhuma familia
       sem indice (Tetrahedron/Icosahedron) entra no merge
   =========================================================================== */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteRodaFila = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'rodaFila';

  /* ---------- referencia (parque.js + roda-plataforma.js, so leitura) ---------- */
  var CX = 43.5;                 /* eixo da roda-gigante e da plataforma */

  /* ---------- paleta (hex direto, igual ao contrato) ---------- */
  var COR_DOURADO = 0xffd166, COR_ROSA = 0xe8a7b2;
  var CINZA = new T.Color(0x6a5a8f);

  /* cor por vertice com gradiente vertical (mais escuro embaixo, ~18% pro
     cinza-azulado) -- regra do contrato para pecas com volume */
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

  /* cor por vertice, uniforme (o tapete e plano, nao precisa de gradiente) */
  function pintaPlano(geo, cor) {
    var c = new T.Color(cor);
    var n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }

  var pecas = [];   /* 1 draw call so */

  /* ================= POSTINHOS COM CORDINHA ================= */
  var POST_R = 0.045, POST_H = 0.55, BOLA_R = 0.075;
  var CORDA_Y = POST_H - 0.08;
  var XS = [CX - 0.6, CX + 0.6];             /* fileira dupla, corredor de 1.2m */
  var ZS = [-1.7, -2.5, -3.3];               /* 3 postes por fileira, espacamento 0.8 */

  function poste(x, z) {
    var haste = new T.CylinderGeometry(POST_R, POST_R, POST_H, 6);
    haste.translate(x, POST_H / 2, z);
    pecas.push(pintaVol(haste, COR_DOURADO, 0.18));

    var bola = new T.SphereGeometry(BOLA_R, 6, 4);
    bola.translate(x, POST_H + BOLA_R * 0.55, z);
    pecas.push(pintaVol(bola, COR_DOURADO, 0.10));
  }

  function cordinha(x, z0, z1) {
    var comprimento = Math.abs(z1 - z0);
    var t = new T.BoxGeometry(0.03, 0.03, comprimento);
    t.translate(x, CORDA_Y, (z0 + z1) / 2);
    pecas.push(pintaVol(t, COR_DOURADO, 0.12));
  }

  XS.forEach(function (x) {
    ZS.forEach(function (z) { poste(x, z); });
    for (var i = 0; i < ZS.length - 1; i++) cordinha(x, ZS[i], ZS[i + 1]);
  });

  /* ================= TAPETE DE ENTRADA (decorativo) =================
     faixa rosa fina no chao entre as fileiras, y=0.02 pra nao brigar com
     o chao/fundacao ja existentes (chao do parque em y~0.006, fundacao da
     roda em y=0.03). */
  (function tapete() {
    var g = new T.PlaneGeometry(1.0, ZS[0] - ZS[ZS.length - 1]).rotateX(-Math.PI / 2);
    g.translate(CX, 0.02, (ZS[0] + ZS[ZS.length - 1]) / 2);
    pecas.push(pintaPlano(g, COR_ROSA));
  })();

  /* ---------- monta o unico draw call ---------- */
  var matV = new T.MeshLambertMaterial({ vertexColors: true });
  grupo.add(new T.Mesh(BGU.mergeBufferGeometries(pecas), matV));

  /* sem colisor de proposito: o corredor e sugestao visual, nao barreira --
     ver ORCAMENTO no cabecalho. Nada em ctx.COLISORES. */

  return {
    grupo: grupo,
    update: function (t, dt) { },
    /* medido com THREE r147 real (harness Node com o three@0.147.0 de
       verdade): 1 draw call, 410 triangulos. */
    custo: { dc: 1, tri: 410 }
  };
};

/* parteArvoreConica — arvore de copa conica facetada (baixo poligono),
   rosa/lilas, tronco curto marrom. Pedido do Ivan: construir identica a
   uma foto de referencia (cone facetado, nao esfera arredondada como as
   arvores da vilinha). Uma unica instancia de teste nesta rodada, perto
   da praca, pra avaliacao visual - posicao final e reuso (InstancedMesh
   se for virar bosque) ficam pra depois.

   Tecnica: merge de BufferGeometry com cor por vertice (degrade por
   altura, mesma receita de partes/vilinha.js). ConeGeometry com POUCOS
   lados (7) pra ficar com facetas grandes e visiveis, MeshLambertMaterial
   com flatShading:true (garante o olhar de "gema facetada" mesmo com
   normais suavizadas por padrao). Sem luz nova, sem asset externo, sem
   sombra de engine, nomes ASCII.

   Orcamento MEDIDO (harness Node + three.js 0.147.0, nao chutado):
   TOTAL 1 draw call / 34 triangulos (tronco 12 + copa 7*2=14 laterais +
   7 base = 21... ver harness). Bem dentro do teto generico do CONTRATO
   (2dc/3.000tri). */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteArvoreConica = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'arvoreConica';

  var CINZA = new T.Color(0x6a5a8f);
  var COR_TRONCO = 0x8a6a52;      /* marrom quente */
  var COR_COPA   = 0xd9a0cf;      /* rosa-lilas, mais quente/rosado */

  /* mesma receita de partes/vilinha.js: gradiente vertical (base mais
     escura, topo na cor cheia) + normaliza uv/indice antes do merge */
  function pinta(geo, cor, fBase) {
    geo = geo.index ? geo.toNonIndexed() : geo;
    var cTopo = new T.Color(cor), cBase = new T.Color(cor).lerp(CINZA, fBase === undefined ? 0.20 : fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var ys = [], minY = 1e9, maxY = -1e9;
    for (var i = 0; i < n; i++) { var y = pos.getY(i); ys.push(y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (var k = 0; k < n; k++) {
      var f = (ys[k] - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.15));
      a[k * 3] = c.r; a[k * 3 + 1] = c.g; a[k * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  var pecas = [];

  /* ---- tronco: cilindro curto e grosso; so um pedacinho (TRONCO_VISIVEL)
     fica de fora por baixo da copa, igual a referencia ---- */
  var TR_ALT = 0.42, TRONCO_VISIVEL = 0.30;
  var tronco = new T.CylinderGeometry(0.15, 0.19, TR_ALT, 8);
  tronco.translate(0, TR_ALT / 2, 0);
  pecas.push(pinta(tronco, COR_TRONCO, 0.28));

  /* ---- copa: cone com poucos lados (facetas grandes, "gema") ---- */
  var COPA_RAIO = 0.72, COPA_ALT = 1.05, COPA_LADOS = 7;
  var copa = new T.ConeGeometry(COPA_RAIO, COPA_ALT, COPA_LADOS);
  copa.translate(0, TRONCO_VISIVEL + COPA_ALT / 2, 0);   /* base da copa pousa em y=TRONCO_VISIVEL */
  pecas.push(pinta(copa, COR_COPA, 0.18));

  var geo = BGU.mergeBufferGeometries(pecas);
  var mat = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  var mesh = new T.Mesh(geo, mat);
  mesh.name = 'arvoreconica_malha';
  grupo.add(mesh);

  /* posicao de teste (temporaria): perto do nascimento do jogador, pra
     avaliacao visual rapida. Reposicionar/duplicar quando o Ivan decidir
     onde ela entra de verdade no mundo. */
  grupo.position.set(4, 0, 8);

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 1, tri: 34 }
  };
};

/* parteCasasVilinha — as 20 casas da Vilinha, agora com os 4 MODELOS
   novos (HOUSE-01..04) no lugar da casinha unica antiga.

   O Ivan pediu: "varias casas, mas 4 modelos". Entao as 20 posicoes
   EXISTENTES do anel continuam iguais (mesma formula do vilinha.js:
   raio 12.6, elipse 0.80 em z, centro (0,40), porta virada para a rua);
   o que muda e QUAL modelo ocupa cada lote.

   COMO INSTANCIA: cada modelo e montado UMA vez fora da cena so para
   colher as geometrias prontas; depois cada malha vira um InstancedMesh
   com as posicoes daquele modelo. Assim 20 casas custam 2 draw calls
   por modelo (corpo + vidros acesos), nao 20x2.
   Isso funciona com qualquer estrutura interna que as pecas tenham —
   a peca so precisa devolver um grupo com malhas.

   ESCALA: os 4 modelos tem larguras diferentes (3.0 / 3.2 / 3.4 / 3.6).
   O vao entre lotes vizinhos no anel e ~3.4, entao os modelos maiores
   levam um encolhimento leve (fator por modelo) para nao se tocarem —
   medido, nao chutado (ver ESCALA_MODELO).

   A MECANICA CONTINUA NO vilinha.js: `casas`, `marcarCasa(i)` e
   `corDaCasa(i)` seguem la (a bandeira que marca a casa da crianca usa
   as mesmas coordenadas). Esta peca so DESENHA. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCasasVilinha = function (ctx) {
  var T = ctx.T;
  var grupo = new T.Group();
  grupo.name = 'casasVilinha';

  var MODELOS = ['parteCasa01', 'parteCasa02', 'parteCasa03', 'parteCasa04'];
  /* encolhe os modelos maiores para caber no lote do anel (vao ~3.4) */
  var ESCALA_MODELO = { parteCasa01: 1.00, parteCasa02: 0.96, parteCasa03: 0.92, parteCasa04: 0.88 };

  /* ---------- geometria de cada modelo: monta 1x fora da cena ---------- */
  var protos = [];
  for (var m = 0; m < MODELOS.length; m++) {
    var nome = MODELOS[m];
    var fab = window.MUNDO_PARTES[nome];
    if (typeof fab !== 'function') continue;          /* modelo ainda nao existe: pula */
    var lixo = [];                                    /* colisores do proto vao para o lixo */
    var ctxTmp = {
      T: T, cena: ctx.cena, M: ctx.M,
      materialFeltro: ctx.materialFeltro, materialBrilho: ctx.materialBrilho,
      COLISORES: lixo
    };
    var r;
    try { r = fab(ctxTmp); } catch (e) { continue; }
    if (!r || !r.grupo) continue;
    var malhas = [];
    r.grupo.traverse(function (o) {
      if (o.isMesh && o.geometry) malhas.push({ geo: o.geometry, mat: o.material });
    });
    if (malhas.length) protos.push({ nome: nome, malhas: malhas, escala: ESCALA_MODELO[nome] || 1 });
  }
  if (!protos.length) {
    return { grupo: grupo, update: function () {}, custo: { dc: 0, tri: 0 } };
  }

  /* ---------- os 20 lotes: UMA fonte de verdade (vilinha.js publica) ----------
     Antes cada peca recalculava o anel por conta propria — com a QUADRA
     (4 fileiras retas), duas contas separadas seriam duas vilas
     diferentes na primeira divergencia. */
  var LOTES = window.VILINHA_LOTES;
  if (!LOTES || !LOTES.length) {
    return { grupo: grupo, update: function () {}, custo: { dc: 0, tri: 0 } };
  }
  var posPorModelo = [];
  for (var p = 0; p < protos.length; p++) posPorModelo.push([]);
  for (var i = 0; i < LOTES.length; i++) {
    posPorModelo[i % protos.length].push({ x: LOTES[i].x, z: LOTES[i].z, rot: LOTES[i].rot });
  }

  /* ---------- instancia cada malha de cada modelo ---------- */
  var mtx = new T.Matrix4(), qua = new T.Quaternion(), eul = new T.Euler(),
      vec = new T.Vector3(), esc = new T.Vector3();
  var dc = 0;
  for (var k = 0; k < protos.length; k++) {
    var pr = protos[k], pts = posPorModelo[k];
    if (!pts.length) continue;
    for (var mm = 0; mm < pr.malhas.length; mm++) {
      var inst = new T.InstancedMesh(pr.malhas[mm].geo, pr.malhas[mm].mat, pts.length);
      for (var q = 0; q < pts.length; q++) {
        var pt = pts[q];
        eul.set(0, pt.rot, 0);
        qua.setFromEuler(eul);
        vec.set(pt.x, 0, pt.z);
        esc.set(pr.escala, pr.escala, pr.escala);
        mtx.compose(vec, qua, esc);
        inst.setMatrixAt(q, mtx);
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.name = 'casas_' + pr.nome + '_' + mm;
      grupo.add(inst);
      dc++;
    }
  }

  /* colisores: um por lote (o vilinha.js ja empurra os dele; aqui NAO
     duplicamos — a casa nova ocupa o mesmo lote da antiga) */

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: dc, tri: 0 }
  };
};

/* parteRodaLuzesGiro -- fecha a lacuna do plano original: luzes de verdade
   PRESAS na roda-gigante (parque.js, NAO editado), acompanhando as DUAS
   pecas moveis dela -- que se movem por formulas DIFERENTES:

   1) O ARO gira de verdade (roda.rotation.x = giro em parque.js). Um ponto
      preso nele em angulo local fixo phi, offset X fixo ox, raio r, tem
      posicao no mundo (formula NOVA desta rodada, deduzida e confirmada
      linha a linha contra parque.js -- NAO aproximada):
        function posNoAro(phi, giro, r, ox) {
          var a = phi + giro;
          return { x: 43.5 + ox, y: 9.2 + Math.cos(a) * r, z: 0 + Math.sin(a) * r };
        }
      Repare: mesma FORMA de posCabine, so que o angulo fixo da luz (phi)
      entra no lugar de (i/8)*2*PI, e o raio/offset X podem variar por anel.

   2) As CABINES sao translacao pura -- NUNCA giram, so mudam de posicao
      (formula COPIADA LITERAL de roda-cabines.js / parque.js):
        function posCabine(i, giro) {
          var a = (i / 8) * Math.PI * 2 + giro;
          return { x: 43.5, y: 9.2 + Math.cos(a) * 7.6, z: 0 + Math.sin(a) * 7.6 };
        }
      A matriz de cada cabine e SEMPRE rotacao identidade -- a luz da cabine
      segue a mesma regra: rotacao fixa bakeada na geometria local (a argola
      deitada, mesmo truque do gancho em roda-cabines.js), so a translacao
      muda por quadro.

   As duas formulas sao PARECIDAS mas NAO SAO A MESMA -- nao confundir:
   posNoAro usa angulo FIXO (phi) + giro, com offset X fixo do proprio aro;
   posCabine usa (i/8)*2*PI + giro, sem nenhuma rotacao, so translacao.

   Contrato: partes/CONTRATO.md. Orcamento: partes/ORCAMENTO-RODA-GIGANTE.md
   (teto especial da zona da roda-gigante). */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteRodaLuzesGiro = function (ctx) {
  var T = ctx.T;
  var grupo = new T.Group();
  grupo.name = 'roda-luzes-giro';

  /* RG hardcoded igual parque.js / roda-cabines.js -- NAO derivar, copiar literal */
  var RG = { x: 43.5, y: 9.2, z: 0, raio: 7.6, n: 8 };

  var COR_DOURADO = 0xFFD166;
  var COR_DOURADO_SUAVE = new T.Color(0xFFD166).lerp(new T.Color(0xF4EDDE), 0.30).getHex();

  function posNoAro(phi, giro, r, ox) {
    var a = phi + giro;
    return { x: RG.x + ox, y: RG.y + Math.cos(a) * r, z: RG.z + Math.sin(a) * r };
  }
  function posCabine(i, giro) {
    var a = (i / RG.n) * Math.PI * 2 + giro;
    return { x: RG.x, y: RG.y + Math.cos(a) * RG.raio, z: RG.z + Math.sin(a) * RG.raio };
  }

  var _v = new T.Vector3(), _esc = new T.Vector3(1, 1, 1), _m = new T.Matrix4();
  var _qIdent = new T.Quaternion();

  /* =========================================================
     1) COLAR DE LUZES NO ARO -- 24 lampadinhas douradas presas no anel
        EXTERNO (offset local x=+1.5, mesmo anel que roda.js desenha em
        aro()), phi_i = (i/24)*2*PI. Esferinha simples (IcosahedronGeometry
        r,0 = atalho de 20 tri conhecido), 1 InstancedMesh = 1 draw call.
        Acompanha o giro do aro via posNoAro.
     ========================================================= */
  var N_ARO = 24;
  var ARO_R = RG.raio;      /* 7.6 -- mesmo raio do anel externo */
  var ARO_OX = 1.5;         /* mesmo offset X do anel externo em aro() de parque.js */
  var PHI_ARO = [];
  for (var pa = 0; pa < N_ARO; pa++) PHI_ARO.push((pa / N_ARO) * Math.PI * 2);

  var bulboGeo = new T.IcosahedronGeometry(0.11, 0);   /* 20 tri, esferinha */
  bulboGeo.deleteAttribute('uv');
  var instAro = new T.InstancedMesh(bulboGeo, ctx.materialBrilho(COR_DOURADO), N_ARO);
  instAro.instanceMatrix.setUsage(T.DynamicDrawUsage);
  grupo.add(instAro);

  /* =========================================================
     2) LUZ NA CABINE -- 1 por cabine, faixa/anel luminoso na base do teto
        (offset local {x:0, y:0.30, z:0} sobre posCabine, exatamente como
        especificado). Argola deitada (furo alinhado ao eixo Y, mesmo truque
        do gancho em roda-cabines.js) -- rotacao bakeada na geometria, so
        translacao pura no sync (cabine nunca gira). 1 InstancedMesh = 1 dc.
     ========================================================= */
  var OFFSET_LUZ_CABINE = { x: 0, y: 0.30, z: 0 };
  var argolaGeo = new T.TorusGeometry(0.34, 0.035, 4, 10);  /* 80 tri */
  argolaGeo.rotateX(Math.PI / 2);   /* deita a argola: furo alinhado com o eixo Y (haste) */
  argolaGeo.deleteAttribute('uv');
  var instCabineLuz = new T.InstancedMesh(argolaGeo, ctx.materialBrilho(COR_DOURADO_SUAVE), RG.n);
  instCabineLuz.instanceMatrix.setUsage(T.DynamicDrawUsage);
  grupo.add(instCabineLuz);

  /* =========================================================
     SINCRONIZACAO -- chamada pelo Rei a cada quadro com o giro real da
     roda. Recalcula as 32 instancias (24 do aro + 8 das cabines) com as
     formulas EXATAS do topo do arquivo. Nenhum colisor: tudo no ar.
     ========================================================= */
  grupo.userData.sincronizar = function (giro) {
    for (var i = 0; i < N_ARO; i++) {
      var p = posNoAro(PHI_ARO[i], giro, ARO_R, ARO_OX);
      _v.set(p.x, p.y, p.z);
      _m.compose(_v, _qIdent, _esc);
      instAro.setMatrixAt(i, _m);
    }
    instAro.instanceMatrix.needsUpdate = true;

    for (var k = 0; k < RG.n; k++) {
      var c = posCabine(k, giro);
      _v.set(c.x + OFFSET_LUZ_CABINE.x, c.y + OFFSET_LUZ_CABINE.y, c.z + OFFSET_LUZ_CABINE.z);
      _m.compose(_v, _qIdent, _esc);   /* rotacao identidade: argola ja deitada na geometria */
      instCabineLuz.setMatrixAt(k, _m);
    }
    instCabineLuz.instanceMatrix.needsUpdate = true;
  };
  grupo.userData.sincronizar(0);   /* posicao inicial, giro=0 */

  return {
    grupo: grupo,
    update: function (t, dt) { /* sync real vem de grupo.userData.sincronizar(giro), chamada pelo Rei -- mesmo padrao de roda-cabines.js, para nao disputar a mesma matriz de instancia com dois caminhos de escrita por quadro */ },
    /* medido com three@0.147.0 real (script Node separado, scratchpad/
       medir-roda-luzes-giro/medir.js), somando geometry.index ? index.count/3
       : position.count/3 por malha, multiplicado pelas instancias:
       colar do aro   = 20 tri/unidade x 24 =  480 tri, 1 dc
       luz da cabine  = 80 tri/unidade x  8 =  640 tri, 1 dc */
    custo: {
      dc: 2,
      tri: 1120,
      subsistemas: {
        colarAro: { dc: 1, tri: 480 },
        luzCabine: { dc: 1, tri: 640 }
      }
    }
  };
};

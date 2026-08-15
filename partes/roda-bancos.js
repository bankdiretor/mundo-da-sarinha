/* parteRodaBancos -- o "banco" visivel de dentro das 8 cabines da
   roda-gigante (parque.js, NAO editado). As cabines sao uma caixa fechada,
   entao nao da pra mostrar um banco interno de verdade: a solucao e um
   ENCOSTO (silhueta curva, tipo respaldo de banquinho) que espia por cima
   da borda frontal do casco (face -Z, topo em y=-0.2 local), como se
   alguem estivesse sentado ali dentro.

   Formula de posicao das cabines (COPIADA LITERAL de parque.js / de
   roda-cabines.js, NAO parafraseada): RG = {x:43.5, y:9.2, z:0, raio:7.6, n:8}
     function posCabine(i, giro) {
       var a = (i / 8) * Math.PI * 2 + giro;
       return { x: 43.5, y: 9.2 + Math.cos(a) * 7.6, z: 0 + Math.sin(a) * 7.6 };
     }
   A cabine e SEMPRE rotacao identidade (nunca gira, so translada) -- o
   encosto segue a mesma regra de roda-cabines.js: offset local BAKEADO NA
   PROPRIA GEOMETRIA (translate antes do merge), e no sync so translacao
   pura ate posCabine, rotacao identidade -- exatamente como porta,
   floreira e gancho em roda-cabines.js.

   Geometria da cabine existente (referencia, casco = onde o encosto se
   apoia): BoxGeometry(1.5,1.0,1.5) translate(0,-0.7,0) -> x/z de -0.75 a
   0.75, y de -1.2 a -0.2. A borda frontal (face -Z, topo) fica no ponto
   local {x:0, y:-0.2, z:-0.751} -- e esse o ANCORA do encosto.

   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteRodaBancos = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'roda-bancos';

  /* RG hardcoded igual roda-cabines.js -- NAO derivar, copiar literal */
  var RG = { x: 43.5, y: 9.2, z: 0, raio: 7.6, n: 8 };

  function posCabine(i, giro) {
    var a = (i / RG.n) * Math.PI * 2 + giro;
    return { x: RG.x, y: RG.y + Math.cos(a) * RG.raio, z: RG.z + Math.sin(a) * RG.raio };
  }

  /* ---- utilidades de geometria (mesmo padrao de roda-cabines.js) ---- */
  function normalizarIndice(geo) { return geo.index ? geo.toNonIndexed() : geo; }
  function corSolida(geo, cor) {
    var c = new T.Color(cor), n = geo.attributes.position.count, a = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    geo.deleteAttribute('uv');
    return geo;
  }
  function peca(geoBase, cor) {
    var g = normalizarIndice(geoBase);
    return corSolida(g, cor);
  }

  var matFeltro = new T.MeshLambertMaterial({ vertexColors: true }); /* encosto, shaded como feltro */

  var _v = new T.Vector3(), _esc = new T.Vector3(1, 1, 1), _m = new T.Matrix4();
  var _qIdent = new T.Quaternion();

  /* =========================================================
     ENCOSTO -- 1 por cabine, face -Z. Ancora local {x:0, y:-0.2, z:-0.751}
     (borda frontal do casco). Duas pecas mescladas, offset final ja
     BAKEADO NA GEOMETRIA (do mesmo jeito que porta/floreira/gancho em
     roda-cabines.js) -- no sync so falta a translacao ate posCabine:

     1) "almofada" -- hump largo e baixo (Icosahedron achatado) centrado
        um pouco ACIMA da ancora em y e um pouco A FRENTE em z, entao boa
        parte fica acima da borda (y > -0.2, visivel espiando pra fora) e
        um pouco fica embutida atras da parede (y < -0.2 ou z > -0.75,
        escondida dentro do casco -- sem problema, e opaco).
     2) "botao" -- bolinha pequena dourada por cima, feito decoracao/brilho
        do encosto (igual a macaneta da porta usa o mesmo atalho).
     ========================================================= */
  var instBancos;
  (function banco() {
    var pecas = [];

    var almofada = new T.IcosahedronGeometry(0.22, 0);   /* 20 tri -- atalho conhecido */
    almofada.scale(1.4, 0.8, 0.55);
    almofada.translate(0, -0.12, -0.80);                  /* ancora {0,-0.2,-0.751} + offset local */
    pecas.push(peca(almofada, 0xF4EDDE));                  /* creme -- combina com qualquer cabine */

    var botao = new T.IcosahedronGeometry(0.07, 0);        /* 20 tri */
    botao.translate(0, -0.05, -0.85);
    pecas.push(peca(botao, 0xFFD166));                     /* dourado, so um toque de brilho */

    var geo = BGU.mergeBufferGeometries(pecas);
    instBancos = new T.InstancedMesh(geo, matFeltro, RG.n);
    instBancos.instanceMatrix.setUsage(T.DynamicDrawUsage);
    grupo.add(instBancos);
  })();

  /* =========================================================
     SINCRONIZACAO -- chamada pelo Rei a cada quadro com o giro atual da
     roda. Formula EXATA de posCabine (copiada, nao aproximada). O offset
     local do encosto ja esta bakeado na geometria, entao a matriz e
     translacao pura ate posCabine, rotacao identidade -- igual porta/
     floreira/gancho de roda-cabines.js.
     ========================================================= */
  grupo.userData.sincronizar = function (giro) {
    for (var i = 0; i < RG.n; i++) {
      var a = (i / RG.n) * Math.PI * 2 + giro;
      var p = { x: RG.x, y: RG.y + Math.cos(a) * RG.raio, z: RG.z + Math.sin(a) * RG.raio };

      _v.set(p.x, p.y, p.z);
      _m.compose(_v, _qIdent, _esc);
      instBancos.setMatrixAt(i, _m);
    }
    instBancos.instanceMatrix.needsUpdate = true;
  };
  grupo.userData.sincronizar(0);   /* posicao inicial, giro=0 */

  return {
    grupo: grupo,
    update: function (t, dt) { /* sync real vem de grupo.userData.sincronizar(giro), chamada pelo Rei */ },
    /* medido com three@0.147.0 real (script Node separado, scratchpad/
       medir-roda-bancos/medir.mjs), somando geometry.index ? index.count/3
       : position.count/3 por malha, multiplicado pelas instancias:
       banco (almofada+botao) = 40 tri/unidade x 8 = 320 tri, 1 dc */
    custo: {
      dc: 1,
      tri: 320,
      subsistemas: {
        banco: { dc: 1, tri: 320 }
      }
    }
  };
};

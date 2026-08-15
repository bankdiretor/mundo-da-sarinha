/* parteRodaCabines -- decora as 8 cabines da roda-gigante (parque.js, NAO
   editado) com janelinhas redondas, portinha, floreira e um gancho dourado
   no topo. Categoria mais TECNICA da rodada: exige sincronizar CADA
   instancia com o giro da roda a cada quadro, ou a decoracao "flutua" ao
   lado errado da cabine.

   Formula de posicao das cabines (COPIADA LITERAL de parque.js, NAO
   parafraseada): RG = {x:43.5, y:9.2, z:0, raio:7.6, n:8}
     function posCabine(i, giro) {
       var a = (i / 8) * Math.PI * 2 + giro;
       return { x: 43.5, y: 9.2 + Math.cos(a) * 7.6, z: 0 + Math.sin(a) * 7.6 };
     }
   A matriz de cada cabine e SEMPRE rotacao identidade (nunca gira, so
   translada) -- as decoracoes seguem a mesma regra: rotacao fixa (bakeada
   na geometria local, calculada uma vez), so a translacao muda por quadro.

   Geometria da cabine existente (referencia, para os offsets locais batem
   com o casco/teto/haste ja publicados):
     casco: BoxGeometry(1.5,1.0,1.5) translate(0,-0.7,0) -> x/z de -0.75 a 0.75, y de -1.2 a -0.2
     teto:  ConeGeometry(1.2,0.55,6) translate(0,0.05,0)
     haste: CylinderGeometry(0.06,0.06,0.5,5) translate(0,0.4,0) -> y de 0.15 a 0.65

   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteRodaCabines = function (ctx) {
  var T = ctx.T, BGU = T.BufferGeometryUtils;
  var grupo = new T.Group();
  grupo.name = 'roda-cabines';

  /* RG hardcoded igual parque.js -- NAO derivar, copiar literal */
  var RG = { x: 43.5, y: 9.2, z: 0, raio: 7.6, n: 8 };

  function posCabine(i, giro) {
    var a = (i / RG.n) * Math.PI * 2 + giro;
    return { x: RG.x, y: RG.y + Math.cos(a) * RG.raio, z: RG.z + Math.sin(a) * RG.raio };
  }

  /* ---- utilidades de geometria (mesmo padrao de roda-estrutura.js) ---- */
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

  var matJanela = new T.MeshBasicMaterial({ vertexColors: true });   /* brilho: janelas acesas */
  var matFeltro = new T.MeshLambertMaterial({ vertexColors: true }); /* porta + floreira, shaded */

  var _v = new T.Vector3(), _esc = new T.Vector3(1, 1, 1), _m = new T.Matrix4();
  var _qIdent = new T.Quaternion();

  /* =========================================================
     1) JANELINHAS -- 4 por cabine (faces +X/-X/+Z/-Z do casco) x 8 cabines
        = 32 no total, 1 InstancedMesh so. Unidade "janela" (vidro+moldura)
        construida no ORIGEM local, olhando pra +Z (padrao do CircleGeometry
        e do TorusGeometry) -- a orientacao final de cada face e resolvida
        por um quaternion FIXO por slot (a cabine nunca gira, entao a
        orientacao de cada face no mundo tambem nunca muda).
     ========================================================= */
  var instJanelas;
  (function janelas() {
    var pecas = [];
    pecas.push(peca(new T.CircleGeometry(0.26, 8), 0xFFF6E8));           /* vidro creme claro */
    pecas.push(peca(new T.TorusGeometry(0.30, 0.045, 4, 8), 0xE9B44C));  /* moldura mel */
    var geo = BGU.mergeBufferGeometries(pecas);
    instJanelas = new T.InstancedMesh(geo, matJanela, RG.n * 4);
    instJanelas.instanceMatrix.setUsage(T.DynamicDrawUsage);
    grupo.add(instJanelas);
  })();

  var EIXO_Y = new T.Vector3(0, 1, 0);
  var qFacePZ = new T.Quaternion();                                          /* +Z: identidade */
  var qFaceNZ = new T.Quaternion().setFromAxisAngle(EIXO_Y, Math.PI);        /* -Z */
  var qFacePX = new T.Quaternion().setFromAxisAngle(EIXO_Y, Math.PI / 2);    /* +X */
  var qFaceNX = new T.Quaternion().setFromAxisAngle(EIXO_Y, -Math.PI / 2);   /* -X */
  /* offsets locais das 4 faces, altura y=-0.7 local (mesma altura do meio do casco) */
  var FACES_JANELA = [
    { dx: 0.751, dz: 0, quat: qFacePX },
    { dx: -0.751, dz: 0, quat: qFaceNX },
    { dx: 0, dz: 0.751, quat: qFacePZ },
    { dx: 0, dz: -0.751, quat: qFaceNZ }
  ];

  /* =========================================================
     2) PORTINHA -- 1 por cabine, face -Z, y=-0.75 local. Cor unica dourado
        neutro (nao precisa combinar com a cor da cabine). Unidade "porta"
        ja construida com o OFFSET FINAL bakeado na geometria (posicao
        relativa a origem da cabine): so falta a translacao ate posCabine.
     ========================================================= */
  var instPortas;
  (function porta() {
    var pecas = [];
    var painel = new T.BoxGeometry(0.5, 0.7, 0.05);
    painel.translate(0, -0.75, -0.751);
    pecas.push(peca(painel, 0xE8A94A));                       /* dourado neutro, cor unica */
    var mac = new T.IcosahedronGeometry(0.045, 0);             /* macaneta -- 20 tri (atalho conhecido) */
    mac.translate(0.16, -0.75, -0.79);
    pecas.push(peca(mac, 0xFFD166));
    var geo = BGU.mergeBufferGeometries(pecas);
    instPortas = new T.InstancedMesh(geo, matFeltro, RG.n);
    instPortas.instanceMatrix.setUsage(T.DynamicDrawUsage);
    grupo.add(instPortas);
  })();

  /* =========================================================
     3) FLOREIRA -- jardineira fina embaixo da janela da frente (face -Z)
        + 4 bolinhas coloridas (florzinhas), tudo mesclado numa unidade so
        ("geometria mesclada simples", como o enunciado permite). Offset
        final ja bakeado na geometria, so falta translacao ate posCabine.
     ========================================================= */
  var instFloreiras;
  (function floreira() {
    var pecas = [];
    var caixa = new T.BoxGeometry(0.5, 0.14, 0.16);
    caixa.translate(0, -0.95, -0.80);
    var corCaixa = new T.Color(0xE9B44C).lerp(new T.Color(0x6a5a8f), 0.30).getHex();
    pecas.push(peca(caixa, corCaixa));                        /* jardineira, tom mel escurecido */
    var CORES_FLOR = [0xE8A7B2, 0x9FB4D8, 0xE9B44C, 0xFFD166];
    var DX_FLOR = [-0.17, -0.06, 0.06, 0.17];
    for (var i = 0; i < 4; i++) {
      var bolinha = new T.IcosahedronGeometry(0.05, 0);        /* 20 tri cada */
      bolinha.translate(DX_FLOR[i], -0.86, -0.80);
      pecas.push(peca(bolinha, CORES_FLOR[i]));
    }
    var geo = BGU.mergeBufferGeometries(pecas);
    instFloreiras = new T.InstancedMesh(geo, matFeltro, RG.n);
    instFloreiras.instanceMatrix.setUsage(T.DynamicDrawUsage);
    grupo.add(instFloreiras);
  })();

  /* =========================================================
     4) GANCHO/PENDURADOR -- argola dourada no topo, y=0.65 local (onde a
        haste encontra o aro). 1 por cabine. Rotacao bakeada (deitada na
        horizontal, "abracando" o topo da haste), so translacao no sync.
     ========================================================= */
  var instGanchos;
  (function gancho() {
    var argola = new T.TorusGeometry(0.09, 0.02, 5, 10);
    argola.rotateX(Math.PI / 2);   /* deita a argola: furo alinhado com o eixo Y (haste) */
    argola.translate(0, 0.65, 0);
    var geo = normalizarIndice(argola);
    geo.deleteAttribute('uv');
    instGanchos = new T.InstancedMesh(geo, ctx.materialBrilho(0xFFD166), RG.n);
    instGanchos.instanceMatrix.setUsage(T.DynamicDrawUsage);
    grupo.add(instGanchos);
  })();

  /* =========================================================
     SINCRONIZACAO -- chamada pelo Rei a cada quadro com o giro atual da
     roda. Formula EXATA de posCabine (copiada, nao aproximada). Porta,
     floreira e gancho tem o offset local ja bakeado na propria geometria,
     entao a MESMA matriz (translacao pura ate posCabine, rotacao
     identidade) serve para os 3 -- so as janelas precisam de um quaternion
     por face (fixo por slot, a cabine nunca gira).
     ========================================================= */
  grupo.userData.sincronizar = function (giro) {
    for (var i = 0; i < RG.n; i++) {
      var a = (i / RG.n) * Math.PI * 2 + giro;
      var p = { x: RG.x, y: RG.y + Math.cos(a) * RG.raio, z: RG.z + Math.sin(a) * RG.raio };

      /* janelas: 4 faces desta cabine */
      for (var f = 0; f < 4; f++) {
        var off = FACES_JANELA[f];
        _v.set(p.x + off.dx, p.y - 0.7, p.z + off.dz);
        _m.compose(_v, off.quat, _esc);
        instJanelas.setMatrixAt(i * 4 + f, _m);
      }

      /* porta + floreira + gancho: translacao pura ate posCabine (offset
         local ja bakeado em cada geometria), rotacao identidade */
      _v.set(p.x, p.y, p.z);
      _m.compose(_v, _qIdent, _esc);
      instPortas.setMatrixAt(i, _m);
      instFloreiras.setMatrixAt(i, _m);
      instGanchos.setMatrixAt(i, _m);
    }
    instJanelas.instanceMatrix.needsUpdate = true;
    instPortas.instanceMatrix.needsUpdate = true;
    instFloreiras.instanceMatrix.needsUpdate = true;
    instGanchos.instanceMatrix.needsUpdate = true;
  };
  grupo.userData.sincronizar(0);   /* posicao inicial, giro=0 */

  return {
    grupo: grupo,
    update: function (t, dt) { /* sync real vem de grupo.userData.sincronizar(giro), chamada pelo Rei */ },
    /* medido com three@0.147.0 real (script Node separado, scratchpad/
       medir-roda-cabines/medir.js), somando geometry.index ? index.count/3
       : position.count/3 por malha, multiplicado pelas instancias:
       janelas   = 72 tri/unidade x 32 =  2304 tri, 1 dc
       portinha  = 32 tri/unidade x  8 =   256 tri, 1 dc
       floreira  = 92 tri/unidade x  8 =   736 tri, 1 dc
       gancho    =100 tri/unidade x  8 =   800 tri, 1 dc */
    custo: {
      dc: 4,
      tri: 4096,
      subsistemas: {
        janelas: { dc: 1, tri: 2304 },
        portinha: { dc: 1, tri: 256 },
        floreira: { dc: 1, tri: 736 },
        gancho: { dc: 1, tri: 800 }
      }
    }
  };
};

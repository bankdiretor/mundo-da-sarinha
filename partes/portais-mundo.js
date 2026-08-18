/* parteP portaisMundo — OS 4 PORTAIS da praca, agora com o ARCO ENCANTADO
   (partes/portal-zona.js, ficha aprovada pelo Ivan em 17/08) no lugar dos
   arcos simples do partes/portais.js.

   ONDE: o mesmo circulo de sempre, RAIO 20, nos 4 pontos cardeais — as
   coordenadas nao mudam, so o desenho.
     NORTE (0,-20) Jardim   · SUL   (0,+20) Vilinha
     LESTE (+20,0) Parque   · OESTE (-20,0) Palco da Festinha
   (os nomes de leste/oeste estavam TROCADOS no arquivo antigo e foram
   corrigidos na auditoria de 16/08 — aqui ja entram certos.)

   ORIENTACAO: a frente do portal (+Z local) olha para o CENTRO da praca,
   porque e de dentro que a crianca ve o portal ao escolher para onde ir.
   Formula: rot = atan2(-x, -z).

   ⛔ COLISORES: `portal-zona.js` devolve os colisores em coordenada LOCAL
   (ele nao recebe ctx). Aqui eles sao reprojetados pela matriz de cada
   portal antes de ir para ctx.COLISORES — sem isso, o portal do leste
   bloquearia o oeste (a armadilha que ja custou caro no castelo).
   O VAO fica deliberadamente livre: a crianca passa por baixo. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.partePortaisMundo = function (ctx) {
  var T = ctx.T;
  var grupo = new T.Group();
  grupo.name = 'portaisMundo';

  var fab = window.PORTAL_ZONA && window.PORTAL_ZONA.criar;
  if (typeof fab !== 'function') {
    return { grupo: grupo, update: function () {}, custo: { dc: 0, tri: 0 } };
  }

  var RAIO = 20;
  var ZONAS = [
    { chave: 'norte', x: 0,      z: -RAIO, titulo: 'Jardim',            icone: 'flor' },
    { chave: 'sul',   x: 0,      z:  RAIO, titulo: 'Vilinha',           icone: 'casa' },
    { chave: 'leste', x: RAIO,   z: 0,     titulo: 'Parque',            icone: 'roda' },
    { chave: 'oeste', x: -RAIO,  z: 0,     titulo: 'Palco da Festinha', icone: 'nota' }
  ];

  var ESCALA = 0.92;          /* cabe no corredor sem espremer o vao livre */
  var v = new T.Vector3();
  var dcTotal = 0, triTotal = 0;

  for (var i = 0; i < ZONAS.length; i++) {
    var Z = ZONAS[i];
    var r;
    try {
      r = fab(T, { titulo: Z.titulo, icone: Z.icone,
                   mostrarVasos: true, mostrarLuminarias: true, mostrarMarcadores: false });
    } catch (e) { continue; }
    if (!r || !r.grupo) continue;

    var g = r.grupo;
    g.name = 'portal_' + Z.chave;
    g.position.set(Z.x, 0, Z.z);
    g.rotation.y = Math.atan2(-Z.x, -Z.z);      /* frente olha o centro da praca */
    g.scale.setScalar(ESCALA);
    grupo.add(g);

    dcTotal += (r.custo && r.custo.dc) || 0;
    triTotal += (r.custo && r.custo.tri) || 0;

    /* colisores locais -> mundo */
    g.updateMatrixWorld(true);
    var cols = r.colisores || [];
    for (var k = 0; k < cols.length; k++) {
      var c = cols[k];
      v.set(c.x, 0, c.z).applyMatrix4(g.matrixWorld);
      ctx.COLISORES.push({ x: v.x, z: v.z, raio: c.raio * ESCALA });
    }
  }

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: dcTotal, tri: triTotal }
  };
};

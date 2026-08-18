/* parteBrinquedosParque — planta os brinquedos NOVOS dentro do Parque.
   As pecas moram no namespace PARQUE_BRINQUEDOS (carrossel.js, playground.js,
   parque-extras.js) para nao serem montadas sozinhas na origem do mundo.
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteBrinquedosParque = function (ctx) {
  var T = ctx.T;
  var grupo = new T.Group();
  grupo.name = 'brinquedos-parque';

  /* O parque e a elipse (42,0) rx=17 rz=16, com cerca em 16.6 x 15.6.
     Ja ocupam o terreno: a roda gigante e sua plataforma de embarque (miolo),
     o caminho de entrada (x 22..36.3, z -2.6..+2.6) e o canto musical, que
     ficou agrupado no NORDESTE (piano, arquibancada e as 3 notas gigantes).
     ⛔ Cada posicao abaixo foi MEDIDA, nao estimada: nuvem de 3.195 pontos de
     obstaculo na faixa de altura que estorva (0.30 < y < 4.3), folga real ao
     obstaculo mais proximo e pior vertice contra a elipse da cerca.
     Folga medida: carrossel 0.89 · giraGira 1.84 · balanco 1.31 ·
     escorregador 2.50 · barraquinha 3.21. Entre brinquedos, minimo 1.64. */
  var PLANTA = [
    /* noroeste, a area que abriu: o carrossel em tamanho cheio, com o degrau
       virado para o sul, de frente para quem chega pelo caminho */
    { qual: 'carrossel',    x: 36.0, z:  8.5, rot: Math.PI },
    /* sudoeste */
    { qual: 'giraGira',     x: 34.0, z: -8.0, rot: 0 },
    /* oeste, ladeando a entrada (o caminho passa entre os dois) */
    { qual: 'balanco',      x: 29.5, z:  4.5, rot: 0 },
    { qual: 'escorregador', x: 30.0, z: -3.5, rot: -Math.PI / 2 },
    /* sudeste, do outro lado da roda */
    { qual: 'barraquinha',  x: 51.5, z: -6.0, rot: Math.PI }
  ];

  var B = window.PARQUE_BRINQUEDOS || {};
  var girantes = [], dc = 0, tri = 0;

  for (var i = 0; i < PLANTA.length; i++) {
    var p = PLANTA[i], fabrica = B[p.qual];
    if (typeof fabrica !== 'function') { console.warn('brinquedo ausente:', p.qual); continue; }
    var r = null;
    try { r = fabrica(T); } catch (e) { console.error('brinquedo falhou:', p.qual, e); continue; }
    if (!r || !r.grupo) continue;
    r.grupo.position.set(p.x, 0, p.z);       /* o parque e plano: chao em y=0 */
    r.grupo.rotation.y = p.rot;
    grupo.add(r.grupo);
    if (typeof r.girar === 'function') girantes.push(r.girar);
    if (r.custo) { dc += (r.custo.dc || 0); tri += (r.custo.tri || 0); }
  }

  return {
    grupo: grupo,
    custo: { dc: dc, tri: tri },
    update: function (t, dt) {
      for (var g = 0; g < girantes.length; g++) girantes[g](t);
    }
  };
};

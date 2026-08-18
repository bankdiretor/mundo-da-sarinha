/* parteKartAnelObstaculos — planta os obstaculos de kart-obstaculos.js
   (agua, parede, estrela de velocidade) ao longo do traçado de
   pista-kart-anel.js. So esta peça sabe ONDE cada obstaculo entra; a
   geometria de cada um mora no namespace KART_OBSTACULOS.

   16 obstaculos, espaçados a cada ~28m (447m / 16), num padrao que se
   repete a cada 4 (estrela · parede · estrela · agua) — troca o LADO da
   parede a cada volta do padrao pra obrigar a criança a mudar de faixa,
   nao decorar "sempre desvia pra direita". Os primeiros 20m depois da
   largada ficam livres (sem obstaculo em cima da linha de largada).
   Contrato: partes/CONTRATO.md. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteKartAnelObstaculos = function (ctx) {
  var T = ctx.T;
  var grupo = new T.Group();
  grupo.name = 'kart-anel-obstaculos';

  var anel = window.MUNDO_PARTES.partePistaKartAnel ? null : null;   /* nao monta o anel aqui */
  var PECA_ANEL = null;   /* preenchido por fora, ver montarObstaculos() */

  var OB = window.KART_OBSTACULOS || {};
  var animaveis = [];

  function plantarEm(tracado, s, fabrica, args, custoAcc) {
    var r = null;
    try { r = fabrica.apply(null, args); } catch (e) { console.error('obstaculo falhou em s=' + s, e); return; }
    if (!r || !r.grupo) return;
    var c = tracado.centro(s);
    r.grupo.position.set(c.x, 0, c.z);
    r.grupo.rotation.y = -c.ang + Math.PI / 2;   /* alinha Z local ao sentido do trajeto */
    grupo.add(r.grupo);
    if (typeof r.animar === 'function') animaveis.push(r);
    if (r.custo) { custoAcc.dc += (r.custo.dc || 0); custoAcc.tri += (r.custo.tri || 0); }
  }

  /* monta so quando a pista-kart-anel ja estiver na cena (esta funcao e
     chamada pelo host DEPOIS de montar todas as partes — ver mundo-sarinha.html) */
  grupo.userData.montarObstaculos = function (pecaAnel) {
    if (!pecaAnel || !pecaAnel.grupo || !pecaAnel.grupo.userData.tracado) return;
    var tracado = pecaAnel.grupo.userData.tracado;
    var LARG = tracado.largura;
    var custo = { dc: 0, tri: 0 };

    var PADRAO = ['estrela', 'parede', 'estrela', 'agua'];
    var N_OBST = 16;
    var S0 = 20 / tracado.comprimento;             /* pula os primeiros 20m depois da largada */
    var passo = (1 - S0 * 2) / N_OBST;              /* deixa vao livre nas duas pontas tb */
    var ladoAlterna = -1;

    for (var i = 0; i < N_OBST; i++) {
      var s = S0 + i * passo;
      var tipo = PADRAO[i % PADRAO.length];
      if (tipo === 'estrela') {
        plantarEm(tracado, s, OB.estrelaVelocidade, [T], custo);
      } else if (tipo === 'agua') {
        plantarEm(tracado, s, OB.agua, [T, LARG], custo);
      } else if (tipo === 'parede') {
        ladoAlterna = -ladoAlterna;
        plantarEm(tracado, s, OB.parede, [T, LARG, ladoAlterna], custo);
      }
    }
    grupo.userData.custoObstaculos = custo;
  };

  return {
    grupo: grupo,
    custo: { dc: 0, tri: 0 },   /* atualizado em montarObstaculos(); a montagem inicial esta vazia */
    update: function (t, dt) {
      for (var i = 0; i < animaveis.length; i++) animaveis[i].animar(t);
    }
  };
};

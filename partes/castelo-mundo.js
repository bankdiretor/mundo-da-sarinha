/* parteCasteloMundo — O CASTELO DA SARINHA plantado no mapa.
   Monta as 5 pecas (fundacao + escada + nucleo + asas + 2 torres) pela
   cadeia de ANCHORS e coloca o conjunto na EXTREMIDADE NORDESTE da ilha
   (pedido do Ivan 16/08: "afastado, o jogador tem que andar ate a
   extremidade").

   ONDE E POR QUE (medido na cena viva, nao chutado):
   - centro (34, -34): raio 48 do centro do mundo, 57 do ponto onde a
     crianca nasce (0,12) — a caminhada mais longa do mapa. A grama vai
     ate raio 58, entao a pegada do castelo (meia-diagonal ~8.8) fica
     inteira no gramado.
   - diagonal NORDESTE: o unico quadrante grande vazio (jardim fica a
     34 de distancia, parque a 35). As 4 zonas antigas seguem intocadas.
   - girado -45 graus: a FACHADA (+Z local) olha para o centro da praca,
     entao quem chega de qualquer caminho ve a frente do castelo, nunca
     os fundos.

   COLISORES: as sub-pecas empurram colisor em coordenada LOCAL. Aqui
   eles sao capturados num ctx-proxy e reprojetados pela matrixWorld de
   cada peca antes de ir para ctx.COLISORES — senao o castelo bloquearia
   o lugar errado do mapa (a 34,-34 girado, o erro seria de dezenas de
   metros).

   PLATAFORMA: o mundo tem alturaChao()=0 em todo lugar. A peca exporta
   grupo.userData.plataforma com a pegada, a altura (1.32) e a rampa da
   escada; o host usa isso em alturaChao() para a crianca SUBIR pela
   escada e andar la em cima. Sem isso o castelo seria so cenario
   atravessavel. */
window.MUNDO_PARTES = window.MUNDO_PARTES || {};
window.MUNDO_PARTES.parteCasteloMundo = function (ctx) {
  var T = ctx.T, MP = window.MUNDO_PARTES;
  var grupo = new T.Group();
  grupo.name = 'casteloMundo';

  /* ---------- lugar no mapa ---------- */
  var CX = 34, CZ = -34, ROT = -Math.PI / 4;
  /* ⭐ ESCALA 1.75 (17/08, pedido do Ivan): "o castelo tem que encantar,
     ser visto de todos os lugares e almejado pelas criancas". Com 1.0 ele
     tinha 11.0 de altura e a roda-gigante (17) o ofuscava; com 1.75 ele
     sobe para ~19.3 e vira o PONTO MAIS ALTO do mundo — o marco que se ve
     da praca, da vilinha e do parque. Tudo escala junto (colisores e a
     plataforma andavel), senao a crianca sobe escada de mentira. */
  var ESC = 1.75;
  grupo.position.set(CX, 0, CZ);
  grupo.rotation.y = ROT;
  grupo.scale.setScalar(ESC);

  /* ---------- ctx-proxy: captura os colisores locais ---------- */
  var colsLocais = [];
  var ctxL = {
    T: T, cena: ctx.cena, M: ctx.M,
    materialFeltro: ctx.materialFeltro, materialBrilho: ctx.materialBrilho,
    COLISORES: colsLocais
  };
  var registros = [];
  function montar(pai, anchor, nomeParte, escala) {
    var i0 = colsLocais.length;
    var r = MP[nomeParte](ctxL);
    var g = r.grupo;
    if (anchor) g.position.copy(anchor.position);
    if (escala) g.scale.setScalar(escala);
    pai.add(g);
    registros.push({ g: g, i0: i0, i1: colsLocais.length });
    return g;
  }

  /* ---------- a cadeia de encaixe ---------- */
  var fund = montar(grupo, null, 'parteFundacaoCastelo');
  var A = fund.userData.anchors;
  montar(fund, A.FacadeAnchor, 'parteNucleoCastelo');
  var asas = montar(fund, A.FacadeAnchor, 'parteAsasCastelo');
  var AW = asas.userData.anchors;
  montar(asas, AW.LeftTowerAnchor, 'parteTorreCastelo', 0.88);
  montar(asas, AW.RightTowerAnchor, 'parteTorreCastelo', 0.88);
  var escada = montar(fund, A.StairsAnchor, 'parteEscadaCastelo');

  /* ---------- reprojeta os colisores para o mundo ---------- */
  grupo.updateMatrixWorld(true);
  var v = new T.Vector3(), esc = new T.Vector3();
  for (var r2 = 0; r2 < registros.length; r2++) {
    var rg = registros[r2];
    rg.g.getWorldScale(esc);
    for (var i = rg.i0; i < rg.i1; i++) {
      var c = colsLocais[i];
      v.set(c.x, 0, c.z).applyMatrix4(rg.g.matrixWorld);
      ctx.COLISORES.push({ x: v.x, z: v.z, raio: c.raio * esc.x });
    }
  }

  /* ---------- plataforma andavel (o host consome em alturaChao) ----------
     pegada da fundacao: 14.5 x 10 (meia 7.25 x 5.0), topo 1.32.
     escada: corredor de 4.1 de largura que sobe de 0 a 1.32 entre
     zLocal 5.93 (pe) e 2.81 (topo) — valores medidos das pecas. */
  /* ⚠️ TUDO multiplicado por ESC: estes numeros sao medidas LOCAIS das
     pecas, e o grupo inteiro esta escalado. Sem isso a crianca subiria
     uma escada de mentira (a rampa acabaria antes da plataforma real). */
  grupo.userData.plataforma = {
    x: CX, z: CZ, rot: ROT,
    /* NIVEL DE CIMA (2o nivel, onde o castelo assenta) */
    meiaL: 5.60 * ESC, meiaP: 3.30 * ESC, alt: 1.32 * ESC,
    /* NIVEL DO TERRACO (a volta da base, um degrau abaixo) */
    terracoL: 6.90 * ESC, terracoP: 4.60 * ESC, terracoAlt: 0.98 * ESC,
    /* RAMPA DA ESCADA — testada ANTES dos niveis, senao a pegada da
       plataforma engole a rampa e a crianca sobe num pulo so */
    escadaLarg: 2.05 * ESC,    /* meia-largura do vao de degraus */
    escadaZ0: 5.93 * ESC,      /* pe (local, +Z = frente) */
    escadaZ1: 2.90 * ESC       /* topo, na borda do 2o nivel */
  };

  return {
    grupo: grupo,
    update: function () {},
    custo: { dc: 11, tri: 4500 }
  };
};

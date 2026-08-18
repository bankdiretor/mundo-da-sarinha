/* SarinhaCharacterBase — CHAR-00: o corpo-base modular do Universo Sarinha.
   Fundacao de TODO personagem (jogador, NPC, amigos): corpo neutro, low-poly,
   chibi, articulado e pronto para receber cabeca, cabelo, roupa e acessorio
   pelos anchors. Ficha: fichas/CHAR-00-CORPO-BASE.md.

   Escala de construcao: BASE_HEIGHT = 2.60 (padrao do contrato mestre).
   A altura de INSTANCIA no jogo se aplica por opts.height (scale.setScalar).

   Eixos: +Y cima, +Z FRENTE (bico do sapato aponta +Z), +X direita.
   Pivo principal em (0,0,0); a sola do sapato encosta em y=0.

   ⛔ NAO registrar em window.MUNDO_PARTES — o montarPartes() do jogo montaria
   um corpo solto no meio da praca (armadilha 16). Namespace proprio abaixo. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';

  var BASE_HEIGHT = 2.60;   /* altura de ENTREGA (contrato). A construcao acontece
                               na altura natural das proporcoes e e normalizada
                               para esta no fim — ver NOTA DA v1.1 abaixo. */

  /* ---------------------------------------------------------------------------
     NOTA DA v1.1 (silhouette pass pedido pelo Ivan em 18/08):
     as reducoes pedidas (cabeca -13%, torso -18%, pernas -14%, bracos -12%) NAO
     fecham numa altura fixa de 2.60 — com o corpo menor, encher 2.60 exigiria uma
     cabeca de ~46% do corpo. Entao as proporcoes mandam: monta-se na altura
     natural (~2.19) e escala-se para o `height` pedido. A cabeca passa a ocupar
     ~36% do corpo (era 34,7%): mais chibi, que era o alvo.
     --------------------------------------------------------------------------- */

  /* Todas as medidas num lugar so (sem numero magico espalhado pelo codigo).
     Marcos verticais CRUS: sola 0 · topo do sapato 0.182 · quadril 0.775 ·
     ombro 1.358 · topo do torso 1.505 · topo da cabeca 2.191. */
  var P = {
    /* cabeca v1.2 (medida oficial do Ivan, 18/08): 32% da altura-base =
       0.83u quando o personagem tem 2.60 (teto de 0.85u).
       NAO e esfera perfeita — mais larga em X que alta em Y, achatada em Z e com
       a base afunilada. O placeholder tem a MESMA massa da cabeca definitiva do
       CHAR-01, para os dois serem intercambiaveis sem mexer no corpo. */
    headRadius:    0.35,
    headScale:     [1.00, 0.90, 0.81], /* X 0.70 · Y 0.63 · Z 0.567 (cru) */
    headTaper:     0.13,                /* quanto a base estreita (0 = esfera) */
    headTopY:      1.974,               /* altura CRUA do conjunto (normalizada na saida) */
    neckY:         1.344,               /* base da cabeca — FIXA: o corpo nao se mexe */

    /* torso v1.1: CURTO e LARGO (altura -18%, largura +6%). O topo da capsula e
       um afilamento, entao ele sobe acima da base da cabeca e a cabeca — mais
       larga — cobre a emenda: sem pescoco, sem gap, sem ovo vertical. */
    torsoRadius:   0.28,
    torsoLength:   0.22,                /* capsula: altura total = 0.22 + 2*0.28 = 0.78 */
    torsoScale:    [1.357, 1.00, 0.85], /* largura 0.76 · profundidade 0.476 */
    torsoCenterY:  1.115,               /* de 0.725 a 1.505 */

    shoulderY:     1.358,               /* linha do ombro mais alta no torso */
    shoulderX:     0.365,               /* braco MAIS COLADO (borda do torso: 0.38) */
    upperArmRadius:0.110,               /* +12% de espessura */
    upperArmLength:0.137,               /* total 0.357 (-12%) */
    /* a junta SOBREPOE de proposito: com pouca sobreposicao o membro vira uma
       salsicha de gomos separados assim que o cotovelo dobra */
    elbowDrop:     0.29,
    forearmRadius: 0.099,               /* +12% */
    forearmLength: 0.089,               /* total 0.287 (-12%) */
    handRadius:    0.115,               /* -15%: luvinha de brinquedo */
    handScale:     [1.00, 1.02, 0.86],

    hipY:          0.775,               /* pernas -14%: curtas e estaveis */
    hipX:          0.185,
    thighRadius:   0.126,               /* +10% de espessura */
    thighLength:   0.068,               /* total 0.32 */
    kneeDrop:      0.27,
    lowerLegRadius:0.115,               /* +10% */
    lowerLegLength:0.135,               /* total 0.365 — a ponta entra no sapato */

    /* sapato v1.1: mais LARGO e mais FUNDO, e mais BAIXO — propositalmente
       grandinho, que e o que assina a fofura do brinquedo */
    shoeRadius:    0.175,               /* capsula deitada: largura 0.35 */
    shoeLength:    0.145,               /* profundidade total 0.495 */
    shoeFlatten:   0.52,                /* altura 0.35*0.52 = 0.182 (era 0.198) */
    shoeZ:         0.115,               /* bico avanca para +Z (marca a FRENTE) */

    /* segmentos: escolhidos MEDINDO o custo em triangulos (total = 1.000).
       Membros com 6 lados assumem a faceta low-poly da folha de referencia. */
    /* 9 aneis na cabeca (nao 7): a HemisphereLight do mundo tem chao escuro e,
       com flatShading, poucos aneis viram um DEGRAU escuro cortando a cabeca
       ao meio. Mais aneis = a mesma luz vira degrade. Custa 40 tri. */
    segHead:       [10, 9],
    segTorso:      [2, 8],
    segLimb:       [1, 6],
    segShoe:       [2, 6],
    segHand:       [8, 6]
  };

  var CINZA = null, BRANCO = null;

  /* pinta canonica do mundo: normaliza a geometria (uv/indice) e faz o degrade
     vertical leve. Sem ela o mergeBufferGeometries devolve null EM SILENCIO.
     ⭐ fBase NEGATIVO = COMPENSACAO: em vez de escurecer, CLAREIA a base.
     A HemisphereLight do mundo tem chao marrom escuro e apaga a barriga de
     qualquer volume; numa cabeca grande isso virava uma faixa quase preta que o
     olho lia como um VAO entre cabeca e torso (nao havia vao — raycast e pixel
     confirmaram). Clarear a base devolve a leitura de volume. */
  function pinta(T, geo, cor, fBase) {
    if (!CINZA) { CINZA = new T.Color(0x6a5a8f); BRANCO = new T.Color(0xffffff); }
    geo = geo.index ? geo.toNonIndexed() : geo;
    geo.deleteAttribute('uv');
    if (fBase === undefined) fBase = 0.10;
    var cTopo = new T.Color(cor),
        cBase = (fBase < 0) ? new T.Color(cor).lerp(BRANCO, -fBase)
                            : new T.Color(cor).lerp(CINZA, fBase);
    var pos = geo.attributes.position, n = pos.count, a = new Float32Array(n * 3);
    var minY = 1e9, maxY = -1e9, i, y;
    for (i = 0; i < n; i++) { y = pos.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (i = 0; i < n; i++) {
      var f = (pos.getY(i) - minY) / faixa;
      var c = cBase.clone().lerp(cTopo, Math.min(1, f * 1.15));
      a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(a, 3));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    return geo;
  }

  /* ---- helpers ---- */

  /* membro low-poly: capsula com o TOPO em y=0, pendendo do pivo da articulacao
     (armadilha: capsula nasce centrada; sem esta translacao o membro gira pelo
     meio e o cotovelo/joelho dobra no lugar errado) */
  function createLowPolyLimb(T, raio, comp, cor) {
    var g = new T.CapsuleGeometry(raio, comp, P.segLimb[0], P.segLimb[1]);
    g.translate(0, -(comp / 2 + raio), 0);
    return pinta(T, g, cor, -0.12);
  }

  /* mao "mitten": esfera low-poly achatada, sem dedo nenhum.
     ⛔ era um icosaedro detail 0 e virava um DIAMANTE pontudo na tela
     (armadilha 5: poucos segmentos = bipiramide). Esfera 8x6 arredonda. */
  function createSimpleHand(T, cor, y) {
    var g = new T.SphereGeometry(P.handRadius, P.segHand[0], P.segHand[1]);
    g.scale(P.handScale[0], P.handScale[1], P.handScale[2]);
    g.translate(0, y, 0);
    return pinta(T, g, cor, -0.12);
  }

  /* sapato: capsula deitada e achatada — pilula fofa de brinquedo, base em y=0 */
  function createSimpleFoot(T, cor) {
    var g = new T.CapsuleGeometry(P.shoeRadius, P.shoeLength, P.segShoe[0], P.segShoe[1]);
    g.rotateX(Math.PI / 2);
    g.scale(1, P.shoeFlatten, 1);
    g.translate(0, P.shoeRadius * P.shoeFlatten, P.shoeZ);
    return pinta(T, g, cor, -0.10);
  }

  /* cabeca v1.1: esfera achatada E AFUNILADA na base. Esfera perfeita lia como
     bola de manequim; o estreitamento de baixo cria o queixinho que assina a
     carinha infantil (o rosto definitivo vem no CHAR-01).
     fBase 0.02: a HemisphereLight do mundo tem chao marrom escuro e JA escurece
     a metade de baixo de qualquer esfera. Somar o degrade da pinta criava uma
     faixa escura partindo a cabeca ao meio (armadilha 13: compensacao tem sinal). */
  function createHeadPlaceholder(T, cor) {
    var g = new T.SphereGeometry(P.headRadius, P.segHead[0], P.segHead[1]);
    g.scale(P.headScale[0], P.headScale[1], P.headScale[2]);
    var pos = g.attributes.position, raioY = P.headRadius * P.headScale[1], i, y, f, k;
    for (i = 0; i < pos.count; i++) {
      y = pos.getY(i);
      if (y < 0) {                            /* so a metade de baixo estreita */
        f = Math.min(1, -y / raioY);
        k = 1 - P.headTaper * f * f;          /* quadratico: suave no meio, firme na ponta */
        pos.setX(i, pos.getX(i) * k);
        pos.setZ(i, pos.getZ(i) * k);
      }
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return pinta(T, g, cor, -0.34);   /* negativo = clareia a base (ver pinta) */
  }

  /* anchor: Object3D vazio e invisivel (em debug ganha um marcador) */
  function createCharacterAnchor(T, nome, x, y, z) {
    var a = new T.Object3D();
    a.name = nome;
    a.position.set(x, y, z);
    return a;
  }

  /* marcador de QA: depthTest desligado para o anchor aparecer ATRAVES do corpo
     (quase todos moram dentro da geometria e ficariam invisiveis na inspecao) */
  function marcadorDebug(T, cor) {
    var m = new T.Mesh(new T.SphereGeometry(0.05, 8, 6),
                       new T.MeshBasicMaterial({ color: cor, depthTest: false }));
    m.name = 'DebugMarker';
    m.renderOrder = 999;
    return m;
  }

  var COR_DEBUG_ANCHOR = {
    HeadAnchor: 0xff3b30, HairAnchor: 0xff9500, HatAnchor: 0xffd60a,
    LeftShoulderAnchor: 0x64d2ff, RightShoulderAnchor: 0x0a84ff,
    LeftHandAnchor: 0x30d158, RightHandAnchor: 0x34c759,
    WaistAnchor: 0xff2d92, BackAccessoryAnchor: 0xbf5af2,
    LeftFootAnchor: 0xa78bfa, RightFootAnchor: 0x7dd3fc
  };

  /* ---- braco e perna: UMA funcao para os dois lados (sem duplicar codigo) ---- */

  function createArm(T, BGU, mat, side, skinColor, anchors, rig, debug) {
    var s = (side === 'left') ? -1 : 1;
    var nome = (side === 'left') ? 'Left' : 'Right';

    /* Y relativo ao Pelvis (que ja mora em P.hipY): sem subtrair, o ombro
       subiria o dobro e o boneco inteiro flutuaria acima do chao. */
    var shoulderPivot = new T.Object3D();
    shoulderPivot.name = nome + 'ShoulderPivot';
    shoulderPivot.position.set(s * P.shoulderX, P.shoulderY - P.hipY, 0);

    var upper = new T.Mesh(createLowPolyLimb(T, P.upperArmRadius, P.upperArmLength, skinColor), mat);
    upper.name = nome + 'UpperArm';
    shoulderPivot.add(upper);

    var elbowPivot = new T.Object3D();
    elbowPivot.name = nome + 'ElbowPivot';
    elbowPivot.position.set(0, -P.elbowDrop, 0);
    shoulderPivot.add(elbowPivot);

    /* antebraco + mao mesclados: a mao nunca se move sozinha e o anchor da mao
       ja da o ponto de encaixe de item — 2 malhas economizadas no orcamento */
    var comprimentoAntebraco = P.forearmLength + P.forearmRadius * 2;
    var forearmGeo = BGU.mergeBufferGeometries([
      createLowPolyLimb(T, P.forearmRadius, P.forearmLength, skinColor),
      createSimpleHand(T, skinColor, -comprimentoAntebraco - P.handRadius * 0.35)
    ]);
    if (!forearmGeo) throw new Error('merge do antebraco devolveu null');
    var forearm = new T.Mesh(forearmGeo, mat);
    forearm.name = nome + 'Forearm';
    elbowPivot.add(forearm);

    var yMao = -comprimentoAntebraco - P.handRadius * 1.1;
    var handAnchor = createCharacterAnchor(T, nome + 'HandAnchor', 0, yMao, 0);
    elbowPivot.add(handAnchor);

    var shoulderAnchor = createCharacterAnchor(T, nome + 'ShoulderAnchor', 0, 0, 0);
    shoulderPivot.add(shoulderAnchor);

    if (debug) {
      handAnchor.add(marcadorDebug(T, COR_DEBUG_ANCHOR[nome + 'HandAnchor']));
      shoulderAnchor.add(marcadorDebug(T, COR_DEBUG_ANCHOR[nome + 'ShoulderAnchor']));
    }

    anchors[side + 'Hand'] = handAnchor;
    anchors[side + 'Shoulder'] = shoulderAnchor;
    rig[side + 'ShoulderPivot'] = shoulderPivot;
    rig[side + 'ElbowPivot'] = elbowPivot;
    return shoulderPivot;
  }

  function createLeg(T, BGU, mat, side, skinColor, shoeColor, anchors, rig, debug) {
    var s = (side === 'left') ? -1 : 1;
    var nome = (side === 'left') ? 'Left' : 'Right';

    /* o quadril E a altura do Pelvis: Y relativo = 0 (mesma armadilha do ombro) */
    var hipPivot = new T.Object3D();
    hipPivot.name = nome + 'HipPivot';
    hipPivot.position.set(s * P.hipX, 0, 0);

    var thigh = new T.Mesh(createLowPolyLimb(T, P.thighRadius, P.thighLength, skinColor), mat);
    thigh.name = nome + 'Thigh';
    hipPivot.add(thigh);

    var kneePivot = new T.Object3D();
    kneePivot.name = nome + 'KneePivot';
    kneePivot.position.set(0, -P.kneeDrop, 0);
    hipPivot.add(kneePivot);

    var lower = new T.Mesh(createLowPolyLimb(T, P.lowerLegRadius, P.lowerLegLength, skinColor), mat);
    lower.name = nome + 'LowerLeg';
    kneePivot.add(lower);

    /* sapato-base: filho do joelho e posicionado para a SOLA cair em y=0 do
       personagem (o pivo do joelho esta em hipY - kneeDrop acima do chao) */
    var foot = new T.Mesh(createSimpleFoot(T, shoeColor), mat);
    foot.name = nome + 'Foot';
    foot.position.y = -(P.hipY - P.kneeDrop);
    kneePivot.add(foot);

    var footAnchor = createCharacterAnchor(T, nome + 'FootAnchor', 0, -(P.hipY - P.kneeDrop), 0);
    kneePivot.add(footAnchor);
    if (debug) footAnchor.add(marcadorDebug(T, COR_DEBUG_ANCHOR[nome + 'FootAnchor']));

    anchors[side + 'Foot'] = footAnchor;
    rig[side + 'HipPivot'] = hipPivot;
    rig[side + 'KneePivot'] = kneePivot;
    return hipPivot;
  }

  /* ---- funcao principal ---- */

  window.SARINHA_PERSONAGENS.createSarinhaCharacterBase = function (ctx, opts) {
    var T = ctx.T, BGU = ctx.BGU || T.BufferGeometryUtils;
    opts = opts || {};
    var height             = opts.height             === undefined ? BASE_HEIGHT : opts.height,
        skinColor          = opts.skinColor          === undefined ? 0xD8A27E    : opts.skinColor,
        debugColor         = opts.debugColor         === undefined ? 0xC9A7D8    : opts.debugColor,
        shoeDebugColor     = opts.shoeDebugColor     === undefined ? 0x9D6BC1    : opts.shoeDebugColor,
        showHeadPlaceholder= opts.showHeadPlaceholder=== undefined ? true        : opts.showHeadPlaceholder,
        showDebugAnchors   = opts.showDebugAnchors   === undefined ? false       : opts.showDebugAnchors,
        /* altura da cabeca que sera montada no pescoco. Default = a do
           placeholder; o CHAR-01 passa a dele para a normalizacao dar a altura
           certa mesmo com o placeholder desligado. */
        headHeight         = opts.headHeight         === undefined
                             ? P.headRadius * P.headScale[1] * 2 : opts.headHeight;

    var character = new T.Group();
    character.name = 'SarinhaCharacterBase';

    /* UM material para o corpo inteiro (contrato do mundo: Lambert + cor por
       vertice + flat shading; Standard/sombra/luz nova sao proibidos aqui) */
    var mat = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true });

    var anchors = {}, rig = {};

    var root = new T.Object3D();
    root.name = 'CharacterRoot';
    character.add(root);

    /* Pelvis na altura do quadril: girar aqui balanca o corpo pelo quadril
       (andar, dancar), nao pelos pes */
    var pelvis = new T.Object3D();
    pelvis.name = 'Pelvis';
    pelvis.position.set(0, P.hipY, 0);
    root.add(pelvis);

    /* torso: capsula achatada em Z — mais largo que fundo, sem cintura adulta */
    var torsoGeo = new T.CapsuleGeometry(P.torsoRadius, P.torsoLength, P.segTorso[0], P.segTorso[1]);
    torsoGeo.scale(P.torsoScale[0], P.torsoScale[1], P.torsoScale[2]);
    var torso = new T.Mesh(pinta(T, torsoGeo, debugColor, -0.16), mat);
    torso.name = 'Torso';
    torso.position.y = P.torsoCenterY - P.hipY;
    pelvis.add(torso);

    /* cabeca: pivo na BASE dela (gira/inclina a partir do pescoco).
       O pescoco (P.neckY) e FIXO: trocar a cabeca por uma maior ou menor nao
       mexe o corpo um milimetro — quem se adapta e a cabeca (regra do Ivan). */
    var headPivot = new T.Object3D();
    headPivot.name = 'HeadPivot';
    headPivot.position.set(0, P.neckY - P.hipY, 0);
    pelvis.add(headPivot);
    rig.headPivot = headPivot;

    var headCenterOffset = P.headRadius * P.headScale[1];
    if (showHeadPlaceholder) {
      var head = new T.Mesh(createHeadPlaceholder(T, skinColor), mat);
      head.name = 'HeadPlaceholder';
      head.position.y = headCenterOffset;
      headPivot.add(head);
    }

    /* anchors da cabeca ficam SOB o HeadPivot (a folha os desenha num grupo
       solto, mas cabelo/chapeu TEM de acompanhar a cabeca quando ela gira) */
    var headAnchor = createCharacterAnchor(T, 'HeadAnchor', 0, 0, 0);
    var hairAnchor = createCharacterAnchor(T, 'HairAnchor', 0, headCenterOffset * 1.42, 0);
    var hatAnchor  = createCharacterAnchor(T, 'HatAnchor',  0, headCenterOffset * 2, 0);
    headPivot.add(headAnchor); headPivot.add(hairAnchor); headPivot.add(hatAnchor);
    anchors.head = headAnchor; anchors.hair = hairAnchor; anchors.hat = hatAnchor;

    /* membros: mesma funcao para os dois lados */
    pelvis.add(createArm(T, BGU, mat, 'left',  skinColor, anchors, rig, showDebugAnchors));
    pelvis.add(createArm(T, BGU, mat, 'right', skinColor, anchors, rig, showDebugAnchors));
    pelvis.add(createLeg(T, BGU, mat, 'left',  skinColor, shoeDebugColor, anchors, rig, showDebugAnchors));
    pelvis.add(createLeg(T, BGU, mat, 'right', skinColor, shoeDebugColor, anchors, rig, showDebugAnchors));

    /* anchors que seguem o tronco */
    var grupoAnchors = new T.Object3D();
    grupoAnchors.name = 'Anchors';
    pelvis.add(grupoAnchors);

    var waistAnchor = createCharacterAnchor(T, 'WaistAnchor', 0, 0.02, 0);
    var backAnchor  = createCharacterAnchor(T, 'BackAccessoryAnchor', 0,
                        P.torsoCenterY - P.hipY, -P.torsoRadius * P.torsoScale[2] * 0.95);
    grupoAnchors.add(waistAnchor); grupoAnchors.add(backAnchor);
    anchors.waist = waistAnchor; anchors.back = backAnchor;

    if (showDebugAnchors) {
      headAnchor.add(marcadorDebug(T, COR_DEBUG_ANCHOR.HeadAnchor));
      hairAnchor.add(marcadorDebug(T, COR_DEBUG_ANCHOR.HairAnchor));
      hatAnchor.add(marcadorDebug(T, COR_DEBUG_ANCHOR.HatAnchor));
      waistAnchor.add(marcadorDebug(T, COR_DEBUG_ANCHOR.WaistAnchor));
      backAnchor.add(marcadorDebug(T, COR_DEBUG_ANCHOR.BackAccessoryAnchor));
    }

    /* normaliza da altura CRUA (pescoco + cabeca montada) para a altura pedida.
       Usar headHeight — e nao uma constante — mantem a altura final correta
       quando o CHAR-01 troca o placeholder por uma cabeca de outra medida. */
    var rawHeight = P.neckY + headHeight;
    character.scale.setScalar(height / rawHeight);

    character.userData = {
      type: 'SarinhaCharacterBase',
      version: '1.2',
      baseHeight: BASE_HEIGHT,
      rawHeight: rawHeight,
      neckY: P.neckY,
      headHeight: headHeight,
      height: height,
      material: mat,
      proportions: P,
      anchors: anchors,
      rig: rig
    };
    return character;
  };

  window.SARINHA_PERSONAGENS.CHARACTER_BASE_HEIGHT = BASE_HEIGHT;
  window.SARINHA_PERSONAGENS.CHARACTER_PROPORTIONS = P;
})();

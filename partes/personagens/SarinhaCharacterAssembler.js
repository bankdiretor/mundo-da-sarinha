/* SarinhaCharacterAssembler — CHAR-20: o montador do Universo Sarinha.
   Junta corpo + cabeca + cabelo (e, no futuro, roupa e acessorio) numa figura
   so, a partir de uma ESCOLHA simples. E a peca que tira os personagens da
   vitrine e os coloca no jogo.

   Uso:
     var p = SARINHA_PERSONAGENS.montarPersonagem({T, BGU}, {
       altura: 1.90,          // altura de instancia no mundo
       pele: 1,               // indice no catalogo TONS_DE_PELE
       cabelo: 'longo',       // chave do catalogo CATALOGO_CABELO
       corCabelo: 0,          // indice na paleta do cabelo
       olharPara: -1          // -1 = convencao do jogo (-Z) · +1 = sistema (+Z)
     });
     p.userData.rig   -> os 9 pivos, para animar
     p.userData.pecas -> {corpo, cabeca, cabelo}

   ⚠️ O sistema de personagens olha para +Z e o bonequinho antigo do jogo olha
   para −Z. O montador resolve isso com `olharPara`, para o jogo nao precisar
   saber da diferenca. */
window.SARINHA_PERSONAGENS = window.SARINHA_PERSONAGENS || {};

(function () {
  'use strict';
  var S = window.SARINHA_PERSONAGENS;

  /* tons de pele: os mesmos 4 que o jogo ja oferece na tela de montagem, para a
     escolha antiga da crianca continuar valendo depois da troca */
  var TONS_DE_PELE = [0xf7d6bd, 0xeab68f, 0xb97a4e, 0x8a5a3a];

  /* catalogo de cabelo: chave -> como criar. Cada novo penteado entra AQUI e
     passa a existir no jogo inteiro sem mexer em mais nada. */
  var CATALOGO_CABELO = {
    nenhum:    { nome: 'Carequinha',      criar: null },
    curto:     { nome: 'Curto',           criar: 'createSarinhaHairShort01' },
    longo:     { nome: 'Longo liso',      criar: 'createSarinhaHairLong01' },
    ondulado:  { nome: 'Longo ondulado',  criar: 'createSarinhaHairWavy01' },
    cacheado:  { nome: 'Cacheado',        criar: 'createSarinhaHairCurly01' },
    coquinhos: { nome: 'Coquinhos',       criar: 'createSarinhaHairBuns01' },
    volumoso:  { nome: 'Medio volumoso',  criar: 'createSarinhaHairVolume01' }
  };

  var PALETA_CABELO = [0x8B6A55, 0xA67C62, 0x6E5A49, 0x5B4637, 0x2b2b33, 0xC89AC6];

  function catalogo() {
    var lista = [];
    for (var k in CATALOGO_CABELO) if (CATALOGO_CABELO.hasOwnProperty(k))
      lista.push({ chave: k, nome: CATALOGO_CABELO[k].nome });
    return lista;
  }

  S.montarPersonagem = function (ctx, escolha) {
    var T = ctx.T, BGU = ctx.BGU || T.BufferGeometryUtils;
    escolha = escolha || {};
    var altura    = escolha.altura    === undefined ? 1.90 : escolha.altura,
        iPele     = escolha.pele      === undefined ? 1    : escolha.pele,
        chaveCab  = escolha.cabelo    === undefined ? 'curto' : escolha.cabelo,
        iCorCab   = escolha.corCabelo === undefined ? 0    : escolha.corCabelo,
        corRoupa  = escolha.corRoupa  === undefined ? 0xC9A7D8 : escolha.corRoupa,
        corSapato = escolha.corSapato === undefined ? null : escolha.corSapato,
        olharPara = escolha.olharPara === undefined ? -1   : escolha.olharPara;

    var corPele = TONS_DE_PELE[iPele % TONS_DE_PELE.length];
    var corCab  = PALETA_CABELO[iCorCab % PALETA_CABELO.length];
    var item    = CATALOGO_CABELO[chaveCab] || CATALOGO_CABELO.curto;

    /* corpo com a cabeca definitiva: o placeholder sai e a altura de
       normalizacao passa a ser a da cabeca real */
    var corpo = S.createSarinhaCharacterBase(ctx, {
      height: altura,
      skinColor: corPele,
      showHeadPlaceholder: false,
      headHeight: S.HEAD_HEIGHT,
      debugColor: corRoupa,
      shoeDebugColor: corSapato !== null ? corSapato
        : new T.Color(corRoupa).lerp(new T.Color(0x6a5acd), 0.45).getHex()
    });

    var cabeca = S.createSarinhaCharacterHead(ctx, { skinColor: corPele });
    corpo.userData.rig.headPivot.add(cabeca);

    var cabelo = null;
    if (item.criar && typeof S[item.criar] === 'function') {
      cabelo = S[item.criar](ctx, { hairColor: corCab });
      cabelo.position.y = cabelo.userData.offsetNoHairAnchor;
      corpo.userData.anchors.hair.add(cabelo);
    }

    /* ⚠️ o giro que casa o sistema (+Z) com a convencao do jogo (−Z).
       ⛔ Vai no CharacterRoot (filho), NAO no grupo raiz: o jogo escreve em
       `boneco.rotation.y` para virar o personagem (kart, caminhada, dança) e
       apagaria o giro se ele morasse ali. */
    if (olharPara < 0) {
      var raiz = corpo.getObjectByName('CharacterRoot');
      if (raiz) raiz.rotation.y = Math.PI;
    }

    corpo.userData.escolha = { pele: iPele, cabelo: chaveCab, corCabelo: iCorCab,
                               corRoupa: corRoupa, altura: altura };
    corpo.userData.pecas = { corpo: corpo, cabeca: cabeca, cabelo: cabelo };
    corpo.userData.pelvis = corpo.getObjectByName('Pelvis');
    /* ⚠️ guarda o Y BASE do quadril: escrever position.y direto no balanco da
       caminhada arrancaria o quadril do lugar (ele mora em hipY, nao em 0). */
    var pelvisY0 = corpo.userData.pelvis ? corpo.userData.pelvis.position.y : 0;

    /* animacao de caminhada, no MESMO contrato do bonequinho antigo do jogo
       (`userData.andar(t, andando)`), para a troca no jogo ser 1 linha. */
    var rig = corpo.userData.rig;
    corpo.userData.andar = function (t, andando) {
      var amp = andando ? 0.62 : 0, w = Math.sin(t * 9);
      rig.leftShoulderPivot.rotation.x =  w * amp;
      rig.rightShoulderPivot.rotation.x = -w * amp;
      rig.leftHipPivot.rotation.x = -w * amp;
      rig.rightHipPivot.rotation.x =  w * amp;
      /* cotovelo e joelho acompanham de leve: o antigo nao tinha, e e o que faz
         a caminhada parecer de gente e nao de boneco de pau */
      rig.leftElbowPivot.rotation.x  = -Math.max(0, w) * amp * 0.45;
      rig.rightElbowPivot.rotation.x = -Math.max(0, -w) * amp * 0.45;
      rig.leftKneePivot.rotation.x   = -Math.max(0, -w) * amp * 0.5;
      rig.rightKneePivot.rotation.x  = -Math.max(0, w) * amp * 0.5;
      if (corpo.userData.pelvis) corpo.userData.pelvis.position.y = pelvisY0 +
        (andando ? Math.abs(Math.sin(t * 9)) * 0.03 : Math.sin(t * 1.8) * 0.01);
    };
    return corpo;
  };

  S.CATALOGO_CABELO = CATALOGO_CABELO;
  S.CATALOGO_CABELO_LISTA = catalogo;
  S.TONS_DE_PELE = TONS_DE_PELE;
  S.PALETA_CABELO = PALETA_CABELO;
})();

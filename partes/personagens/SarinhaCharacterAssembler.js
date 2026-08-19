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

  /* catalogo de ROUPA (CHAR-08+): 'vestido' e peca unica (exclui top e bottom).
     Roupa nova entra AQUI e aparece no jogo sozinha, como os cabelos. */
  var CATALOGO_ROUPA = {
    classico:  { nome: 'Camiseta + sainha', top: 'createSarinhaTop01',   bottom: 'createSarinhaSkirt01' },
    esportivo: { nome: 'Camiseta + short',  top: 'createSarinhaTop01',   bottom: 'createSarinhaShorts01' },
    passeio:   { nome: 'Camiseta + calca',  top: 'createSarinhaTop01',   bottom: 'createSarinhaPants01' },
    vestido:   { nome: 'Vestido',           dress: 'createSarinhaDress01' },
    pop:       { nome: 'Jaqueta + calca',   top: 'createSarinhaTop01',   bottom: 'createSarinhaPants01',
                 jacket: 'createSarinhaJacket01' }
  };

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

    /* traje (CHAR-08+): so veste se as pecas ja estiverem carregadas na pagina —
       sem elas, o personagem fica com o torso de sempre (nada quebra) */
    var chaveTraje = escolha.traje === undefined ? null : escolha.traje;
    var traje = chaveTraje && CATALOGO_ROUPA[chaveTraje] ? CATALOGO_ROUPA[chaveTraje] : null;
    var pecasRoupa = {};
    if (traje) {
      if (traje.dress) pecasRoupa.dress = vestir(ctx, corpo, traje.dress, corRoupa);
      else {
        /* a cor escolhida pela crianca vai na peca PRINCIPAL (top). As
           secundarias usam a PROPRIA cor padrao (design da folha mestre) —
           jaqueta rosa sobre camiseta lavanda LE como jaqueta; tudo da mesma
           cor virava um bloco so. corRoupa2 sobrescreve se vier. */
        if (traje.top)    pecasRoupa.top    = vestir(ctx, corpo, traje.top, corRoupa);
        if (traje.bottom) pecasRoupa.bottom = vestir(ctx, corpo, traje.bottom, escolha.corRoupa2);
        if (traje.jacket) pecasRoupa.jacket = vestir(ctx, corpo, traje.jacket, escolha.corRoupa2);
      }
    }

    corpo.userData.escolha = { pele: iPele, cabelo: chaveCab, corCabelo: iCorCab,
                               corRoupa: corRoupa, traje: chaveTraje, altura: altura };
    corpo.userData.roupas = pecasRoupa;
    corpo.userData.pecas = { corpo: corpo, cabeca: cabeca, cabelo: cabelo };
    corpo.userData.pelvis = corpo.getObjectByName('Pelvis');
    /* ⚠️ guarda o Y BASE do quadril: escrever position.y direto no balanco da
       caminhada arrancaria o quadril do lugar (ele mora em hipY, nao em 0). */
    var pelvisY0 = corpo.userData.pelvis ? corpo.userData.pelvis.position.y : 0;

    /* animacao de caminhada, no MESMO contrato do bonequinho antigo do jogo
       (`userData.andar(t, andando)`), para a troca no jogo ser 1 linha.
       ⛔ IDLE COM VARIACAO — pesquisa do Roblox: o Animate padrao de la tem
       "Idle com 2 variacoes" que entram de vez em quando, pra nao ficar so
       respirando parado. Aqui: a cada PERIODO parado, um gesto curto entra e
       sai suave (envelope seno), alternando 2 poses (cabeca+braco). So toca
       enquanto REALMENTE parado (andando=false) — andar cancela na hora. */
    var rig = corpo.userData.rig;
    var GESTO_PERIODO = 6.0, GESTO_DUR = 1.4;
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

      if (!andando && rig.headPivot) {
        var fase = t % GESTO_PERIODO, env = 0;
        if (fase < GESTO_DUR) env = Math.sin((fase / GESTO_DUR) * Math.PI);   /* entra e sai suave */
        var variacaoA = Math.floor(t / GESTO_PERIODO) % 2 === 0;
        if (variacaoA) {
          /* A: espreguica o braço esquerdo, cabeça acompanha de leve */
          rig.headPivot.rotation.z = env * 0.10;
          rig.headPivot.rotation.y = env * 0.14;
          rig.leftShoulderPivot.rotation.z = env * 0.55;
          rig.leftElbowPivot.rotation.x = -env * 0.30;
        } else {
          /* B: da uma olhadinha pro outro lado e da de ombros */
          rig.headPivot.rotation.y = -env * 0.22;
          rig.leftShoulderPivot.rotation.z = env * 0.12;
          rig.rightShoulderPivot.rotation.z = -env * 0.12;
        }
      } else {
        /* andando: o ciclo de caminhada so mexe em rotation.x dos ombros —
           sem isto, um gesto interrompido no meio deixava o braço torto
           (rotation.z do ombro) ate a proxima vez que ficasse parado. */
        if (rig.headPivot) { rig.headPivot.rotation.z = 0; rig.headPivot.rotation.y = 0; }
        rig.leftShoulderPivot.rotation.z = 0;
        rig.rightShoulderPivot.rotation.z = 0;
      }
    };
    return corpo;
  };

  /* pintura de perna: reescreve a cor por vertice da coxa/perna (a pintura
     ACOMPANHA o membro — e assim que short e calca "vestem" a perna que balanca) */
  function repintar(T, mesh, cor) {
    if (!mesh || !mesh.geometry || !mesh.geometry.attributes.color) return;
    var c = new T.Color(cor), esc = new T.Color(cor).multiplyScalar(0.82);
    var pos = mesh.geometry.attributes.position, col = mesh.geometry.attributes.color;
    var minY = 1e9, maxY = -1e9, i, y;
    for (i = 0; i < pos.count; i++) { y = pos.getY(i); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    var faixa = Math.max(0.001, maxY - minY);
    for (i = 0; i < pos.count; i++) {
      var f = (pos.getY(i) - minY) / faixa;
      col.setXYZ(i, esc.r + (c.r - esc.r) * f, esc.g + (c.g - esc.g) * f, esc.b + (c.b - esc.b) * f);
    }
    col.needsUpdate = true;
  }

  /* veste uma peca no personagem ja montado (chamado pelo montarPersonagem) */
  function vestir(ctx, corpo, chaveCriar, clothColor) {
    var T = ctx.T;
    if (!chaveCriar || typeof S[chaveCriar] !== 'function') return null;
    var peca = S[chaveCriar](ctx, { clothColor: clothColor });
    var pelvis = corpo.getObjectByName('Pelvis');
    if (!pelvis) return null;
    pelvis.add(peca);
    if (peca.userData.hideTorso) {
      var t = corpo.getObjectByName('Torso'); if (t) t.visible = false;
    }
    if (peca.userData.legPaint) {
      var lp = peca.userData.legPaint;
      /* ⛔ bug pago: com clothColor undefined (peca usando o proprio padrao),
         new Color(undefined) e BRANCO — a coxa saiu branca. A cor efetiva vem
         da PECA criada, que sempre guarda a que usou. */
      var corEfetiva = (peca.userData.clothColor !== undefined)
                       ? peca.userData.clothColor : clothColor;
      ['Left', 'Right'].forEach(function (lado) {
        if (lp.thigh === 'cloth') repintar(T, corpo.getObjectByName(lado + 'Thigh'), corEfetiva);
        if (lp.lowerLeg === 'cloth') repintar(T, corpo.getObjectByName(lado + 'LowerLeg'), corEfetiva);
      });
    }
    return peca;
  }
  S.vestirPersonagem = vestir;

  S.CATALOGO_ROUPA = CATALOGO_ROUPA;
  S.CATALOGO_ROUPA_LISTA = function () {
    var l = []; for (var k in CATALOGO_ROUPA) if (CATALOGO_ROUPA.hasOwnProperty(k))
      l.push({ chave: k, nome: CATALOGO_ROUPA[k].nome });
    return l;
  };
  S.CATALOGO_CABELO = CATALOGO_CABELO;
  S.CATALOGO_CABELO_LISTA = catalogo;
  S.TONS_DE_PELE = TONS_DE_PELE;
  S.PALETA_CABELO = PALETA_CABELO;
})();

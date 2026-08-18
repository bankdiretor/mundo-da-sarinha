# CASA DA SARINHA — dossiê técnico e orçamento

## ⛔ RELOCAÇÃO (15/08/2026): abandonada a ilha flutuante isolada
O Ivan mandou uma nova imagem de referência (visão geral do mundo
inteiro, uma ilha só com casa+roda-gigante+carrossel+vilinha+tudo
conectado por caminho) e pediu pra **abandonar o mundo externo/portal e
colocar a casa no chão principal, andável, igual a roda-gigante** —
reaproveitando o máximo do código já feito. Tudo que este documento
descreve abaixo como "ilha isolada" / "portal" / "teleporte" **NÃO VALE
MAIS** — ficou só como histórico de como cada peça foi construída
originalmente (as medidas RELATIVAS de cada peça continuam válidas,
só a ÂNCORA no mundo mudou).

**Arquitetura nova**: a casa fica no chão principal do mundo, em
`x:18, z:20` — perto da vilinha e da roda-gigante, andável direto da
praça, culling por `LUGARES`/`FORA` exatamente como a roda-gigante (sem
zona especial, sem `CASA_SARINHA.dentro`, sem teleporte). Removido de
`mundo-sarinha.html`: todo o bloco `CASA_SARINHA` (estado, entrar/sair,
zona `casaSarinha`, `CASA_SARINHA_ALT`), a peça `casa-portal.js` (não
tem mais portal — o arquivo continua no disco mas não é mais carregado).

**O que foi relocado (offset aplicado: dx=-282, dy=-14, dz=+216 a
partir da ilha original em 300/-200/y14)**:
- `casa-estrutura.js`, `casa-janelas-varanda.js`, `casa-porta.js`,
  `casa-jardim-entrada.js`: só mudou a âncora numérica (CX/CZ/Y0 e
  derivados), a geometria RELATIVA é a mesma, zero retrabalho de design.
- `casa-ilha.js`: **cirurgia, não relocação simples** — removido tudo
  que só fazia sentido numa ilha isolada (saia de rocha, disco de
  grama, barranco, tufos, lago/riacho/cachoeira — o chão principal do
  mundo já existe, não precisa de base própria). Mantido e relocado: o
  caminho de pedra até a porta + 2 postes de luz externa.

**Nova entrada em LUGARES/FORA** (mesmo padrão da roda-gigante): raios
36-40 centrados em `(18,20)`, sem zona especial nem culling binário.

Isso deixa a porta ABERTA levando a um vão vazio (sem interior
construído ainda) — normal, é o que a Rodada 4 resolve, também com
arquitetura redesenhada pro chão principal (sem teleporte pra dentro,
os cômodos precisam ser espaço físico real, não um "quarto" isolado).
*A casa principal do mundo: uma ilha flutuante isolada, com a casa, os
cômodos internos, área musical externa, jardim encantado e trenzinho.
O maior marco do jogo — "o lugar que toda criança vai querer visitar e
morar". Este arquivo existe para o Diretor e os Construtores NUNCA
precisarem redescobrir a arquitetura: está tudo aqui.*

## ⚠️ Regra de iluminação (ler antes de escolher Lambert ou Basic)
A luz direcional do mundo (`sol`) fica em `(10,18,6)` mirando a origem —
só ilumina de verdade faces viradas pra NORTE, LESTE ou CIMA. Qualquer
geometria numa face virada pra SUL (fachada principal da casa, `z:-199.5`)
ou OESTE (`x:295.5`) nunca recebe luz direta e fica escura/sem graça com
`MeshLambertMaterial`. **Regra prática**: peça encostada na parede sul ou
oeste da casa → `MeshBasicMaterial` (cor por vértice, auto-iluminado).
Peça em superfície virada pra cima (varanda, degraus, chão) ou nas faces
norte/leste → `MeshLambertMaterial` normal, sem problema. Descoberto e
corrigido na Rodada 2 (ver "Medido no jogo real" abaixo) depois de testar
com a câmera na posição real de chegada do jogador — não repetir a
descoberta em cada rodada nova.

## Onde fica (não inventar coordenada nova sem ler isto primeiro)

**Portal de entrada** — fica no mundo principal, perto da praça, visível
e andável a pé (não é teleporte escondido, a criança VÊ o portal e anda
até ele):
- Posição: `x:13, z:13` (canto nordeste da praça — espaço livre; o Rádio
  fica no espelho, `x:-13,z:-13`).
- Peça: `partes/casa-portal.js` → registra `window.MUNDO_PARTES.parteCasaPortal`.
- Deve expor em `grupo.userData.entrada = {x:13, z:13}` (o ponto exato
  onde o `acaoPrincipal()` detecta "perto o suficiente pra entrar").
- Já está ligado no jogo: `LUGARES.parteCasaPortal = {x:13,z:13,r:40}`,
  já está na lista `FORA`, já dispara o prompt "Visitar a Casa da
  Sarinha? 🏡✨" e já chama `entrarCasaSarinha()`. **Vocês só constroem
  a peça visual e preenchem `userData.entrada`.**

**A ilha** — fica isolada, longe de tudo (como o quartinho de cada
criança, que mora sozinho em `400,400` — a ilha mora em outro canto
pra nunca encostar em nada):
- Centro da ilha: `x:300, z:-200`.
- Altura do chão da ilha: `y:14` (flutuante — já ligado em
  `alturaChao()` via `CASA_SARINHA_ALT = 14`, automático, vocês não
  mexem nisso).
- Raio da ilha (base/terreno): ~26 unidades.
- Ponto de chegada (onde a criança aparece ao entrar, e pra onde ela
  volta ao sair): borda sul da ilha, `x:300, z:-216`, olhando para
  norte (`yaw:0`), de frente pra casa.
- Peça: `partes/casa-ilha.js` → registra `window.MUNDO_PARTES.parteCasaIlha`.
  Deve expor `grupo.userData.chegada = {x:300, z:-216, yaw:0}`.
- **A casa em si** (estrutura, próximas rodadas) fica centrada em
  `x:300, z:-196` — 20 unidades ao norte da chegada, deixando um
  caminho/jardim de entrada entre o portal de chegada e a porta da casa.

## Como funciona entrar/sair (já está pronto, não mexer)
- `CASA_SARINHA.dentro` — flag global. Quando `true`, o mundo inteiro
  (lista `FORA`) some e só a lista `CASA_SARINHA_PECAS` aparece —
  exatamente como o quartinho, só que pra ilha inteira.
- Sair funciona de QUALQUER lugar de dentro da ilha (barra de espaço /
  toque), igual ao quartinho — não existe risco de a criança "se
  perder" lá dentro sem conseguir voltar.
- Toda peça nova da ilha (terreno, casa, jardim, música, luzes,
  cômodos internos) entra na lista `CASA_SARINHA_PECAS` — **o Rei
  adiciona isso na integração, os construtores só constroem a peça e
  avisam o nome dela no relatório.**

## Orçamento (ilha inteira, teto especial como a roda-gigante)
Igual à roda-gigante: esta é uma sub-feature showpiece, orçamento
próprio, mas **não é ilimitado**. Cada peça ainda declara `custo:{dc,tri}`
medido de verdade (harness Node + three.js, nunca chutado).

- **Teto de alerta pra ilha inteira: 90 draw calls / 140.000 triângulos**
  medido com o jogador DENTRO da ilha (em vários pontos: perto da
  chegada, perto da casa, no fundo do jardim). Fora da ilha, o custo
  dela é **zero** (culling binário via `CASA_SARINHA.dentro`), então
  não compete com o resto do mundo.
- Teto do portal (fora, no mundo principal, compete com o resto da
  praça): **3 draw calls / 3.500 triângulos** — ele é só uma porta
  bonita, não o showpiece.
- **Rodada 1 (esta) — orçamento por peça:**
  - `casa-portal.js`: até 3dc / 3.500 tri.
  - `casa-ilha.js` (terreno, relevo, caminhos de pedra, lagos/riachos/
    cachoeiras, canteiros de jardim, postes de luz externa — TUDO
    junto, é a base da ilha inteira): até 10dc / 16.000 tri. É
    generoso de propósito porque é a fundação de tudo que vem depois.

## Estética (mesma do resto do mundo — ler o CONTRATO.md geral também)
- Feltro artesanal, formas redondas, paleta pastel sob céu roxo. A
  ilha pode ter um brilho mágico/dourado a mais (é a casa da Sarinha),
  mas sem luz nova de engine — só `materialBrilho`/emissive, igual
  sempre.
- Cor de destaque sugerida pela imagem de referência do Ivan: roxo
  claro/lilás no telhado, branco/creme nas paredes, estrela dourada no
  topo (igual a logo da Sarinha), corações na fachada.
- **Cachoeiras/lagos**: nada de textura de água de verdade (proibido
  asset externo) — usar o mesmo truque de `parteAgua` do mundo
  principal (canvas texture gerado, sem import). Leiam
  `partes/agua.js` como peça-modelo antes de inventar do zero.
- **Ilha flutuante com borda rochosa**: peça-modelo mais próxima é
  `partes/ilha.js` (a ilha do centro do mundo) — mesma técnica de
  base flutuante, só que maior.

## ⛔ BUG GRAVE corrigido em 15/08/2026: chegada de costas pra casa
O dossiê original (Rodada 1) especificava `chegada.yaw = 0`. Isso estava
**errado** — pela fórmula de câmera/movimento do jogo (`dirX=sin(yaw),
dirZ=cos(yaw)`, câmera fica atrás do jogador na direção `(dirX,dirZ)`),
`yaw:0` faz o jogador nascer olhando pra **-Z (sul), de costas pra casa**
(que fica ao norte, `z:-196` vindo de `z:-216`). Resultado real: toda
criança que entrasse veria só céu vazio até virar 180° manualmente — e
foi exatamente o que o Ivan reportou ("entrei mas não vi nada").

**Corrigido**: `chegada.yaw = Math.PI` (mesma convenção do spawn
principal do mundo, `PL.yaw = Math.PI`) em `casa-ilha.js`. Confirmado com
teste isolado (teleporte real + `__mundo.bater()`, sem `foto()` manual):
câmera agora mostra a fachada inteira imediatamente ao chegar.

⚠️ **Lição de método, não só de código**: todas as fotos das Rodadas 1-3
usavam `__mundo.foto(de,para)`, que define câmera e alvo manualmente —
isso NUNCA testou a orientação real de chegada (`PL.yaw`), só a
existência/posição das peças. O bug só apareceu simulando teclado E
espaço de verdade. **Testar posição não basta — testar ORIENTAÇÃO de
chegada é obrigatório em qualquer teleporte novo daqui pra frente.**

Também corrigido nesta sessão: `servidor.js` não mandava nenhum header
de cache — o navegador do Ivan reteve versões antigas dos `.js` das
rodadas anteriores entre uma visita e outra. Adicionado `Cache-Control:
no-store`.

⛔ **Segundo bug real, achado com screenshot do PRÓPRIO Ivan jogando**: o
cordeirinho (`OVE`, o companheiro adotável) nascia num deslocamento FIXO
(`+1.2,+0.6`) ao entrar na casa — com o `yaw` agora corrigido pra
`Math.PI`, esse deslocamento cai bem na FRENTE do jogador (na linha de
visão da chegada), dando a impressão de "montado" no bicho no primeiro
instante. Corrigido calculando a posição inicial do cordeirinho com a
MESMA fórmula que `tickCordeiro` usa pra persegui-lo por trás
(`sin(yaw)*1.5, cos(yaw)*1.5`), não um offset fixo. Testado com
`ESTADO.cordeiro` setado (simulando sessão real com bicho já adotado) —
ele nasce corretamente atrás do jogador, sem sobreposição.

## Rodada 2 — Estrutura da Casa (medidas exatas, não inventar)
A casa fica dentro da ilha (centro da ilha `x:300,z:-200`), com a fachada
principal virada para SUL (para o ponto de chegada `x:300,z:-216`).

- **Volume principal**: caixa de `x:295.5` a `304.5` (largura 9), `z:-199.5`
  a `-192.5` (profundidade 7), paredes de `y:14` (chão da ilha) até `y:18.2`
  (altura 4.2).
- **Telhado**: duas águas caindo para os lados X, cumeeira em `y:20.8`
  (2.6 acima do topo da parede), lilás (`#b49af8`-ish, ver paleta do
  clipe — pode usar `paleta.roxo` do `ctx.M` como base e clarear).
- **Chaminé**: no telhado, lado leste, base em torno de `x:303,z:-195`,
  subindo até `y:22`.
- **Porta/vão de entrada** (o vão fica pronto agora; a porta ORNAMENTADA
  em si é Rodada 3 — não construam a porta, só o buraco): centrado em
  `x:300`, na parede sul (`z:-199.5`), largura 1.8, altura 2.6, base em
  `y:14`. **Não fechem esse vão com parede nem com porta.**
- **Varanda/escadaria de entrada**: um patamar pequeno saindo da parede
  sul, entre `z:-199.5` e `z:-202` aprox, subindo do chão da ilha
  (`y:14`) até a base da porta com 1-2 degraus decorativos se quiser
  (não precisa ser preciso, meçam e reportem).
- **Janelas iluminadas**: pelo menos 2 na fachada sul flanqueando a
  porta (perto de `x:297.5` e `x:302.5`), podem ter mais nas laterais
  se o orçamento permitir — vidro com `materialBrilho` quente (creme/
  dourado), sem luz de engine.
- **Moldura do coração**: motivo decorativo em formato de coração na
  parede sul, acima do vão da porta, centrado em `x:300` na parte alta
  da parede (perto de `y:17`) — mesma linguagem visual do arco do
  portal (`casa-portal.js`) já aprovado, pode ler ele como referência
  de "traço" mesmo sendo peça diferente.

**Orçamento desta rodada:**
- `casa-estrutura.js` (volume + telhado + chaminé): até 6dc / 9.000tri.
- `casa-janelas-varanda.js` (janelas + moldura do coração + varanda/
  escadaria): até 5dc / 6.000tri.

Soma esperada acumulada na ilha após esta rodada (parado perto da casa):
~15dc / ~18.000tri — ainda bem dentro do teto geral de 90dc/140.000tri.

## Rodada 3 — Fachada e Porta Principal (medidas exatas, não inventar)
O vão da porta já existe e está aberto (`casa-estrutura.js`,
`grupo.userData.vaoDaPorta = {x:300, z:-199.5, largura:1.8, altura:2.6,
base:14}`). **Lembrete da regra de iluminação lá em cima**: tudo nesta
rodada encosta na face SUL (`z≈-199.5`) → nasce em `MeshBasicMaterial`,
nunca Lambert.

- **Porta principal**: painel decorativo preenchendo o vão, mas
  ABERTO/encostado (a casa é mágica e convidativa — "entre" já está
  escrito no portal). Sugestão: dobradiça de um lado (`x:299.1` ou
  `x:300.9`), painel girado ~80-100° encostado na parede adjacente, não
  bloqueando a passagem. **Não adicionem colisor no vão** — a passagem
  continua livre, igual está desde a Rodada 2.
- **Arco decorativo**: tipo treliça de jardim, straddling o vão, da
  altura do topo do vão (`y:16.6`) até uns `y:18.3`, largura ~2.2
  (um pouco mais larga que o vão de 1.8), encostado em `z:-199.5` a
  `-199.8`. Pode ter a mesma linguagem visual do arco do portal
  (`casa-portal.js`, Rodada 1) sem duplicar geometria dele.
- **Flores e trepadeiras**: pequenos aglomerados subindo pelas laterais
  do vão/arco e pela parte baixa da parede sul — paleta do clipe (rosa
  `#E8A7B2`, mel `#E9B44C`, roxo `#6A3FC5`).
- **Luminárias da entrada**: 2 postes flanqueando o caminho de chegada,
  perto de `x:298.5` e `x:301.5`, em `z:-203` (logo depois do último
  degrau da varanda, que termina em `z:-202` — ver Rodada 2). Mesma
  família visual dos lampiões do mundo principal (`partes/lampioes.js`)
  ou do poste do portal (`casa-portal.js`), sem duplicar geometria.

**Orçamento desta rodada:**
- `casa-porta.js` (porta + dobradiça/moldura): até 3dc / 3.000tri.
- `casa-jardim-entrada.js` (arco decorativo + flores/trepadeiras +
  2 luminárias): até 5dc / 5.000tri.

Soma esperada acumulada na ilha após esta rodada: ~23dc / ~13.000tri —
ainda bem dentro do teto geral de 90dc/140.000tri.

## Ordem das entregas (a imagem do Ivan já define isso — seguir)
1. **Base global** (ESTA RODADA): ilha, terreno, caminhos, água, jardim, luz externa.
2. Estrutura da casa (volume, telhado, chaminé, janelas, moldura do coração, varanda).
3. Fachada e entrada (porta, arco decorativo, flores/trepadeiras, luminárias).
4. Interior principal (hall, sala musical, cantinho de leitura, quarto, cozinha, decoração temática) — cômodos MÚLTIPLOS, dentro do mesmo patch isolado da ilha (não é teleporte por cômodo, é andar de porta em porta).
5. Área musical externa (palco do piano, banco, mini palco, iluminação cênica).
6. Jardim, trenzinho e trilhos (gazebo, banco do jardim, árvore rosa, jardim florido, fonte, trenzinho pequeno em volta da ilha).
7. Luzes e efeitos (partículas mágicas, estrelinhas flutuantes, notas musicais no ar, glow suave, atmosfera noturna).
8. Interações + polimento final (entrar na casa, abrir a porta, explorar ambientes, tocar piano, escutar músicas, coletar estrelas, descobrir segredos, vista panorâmica).

O Rei decide, rodada a rodada, se agrupa categorias (como fez na
roda-gigante) — não travar isso de antemão.

## Medido no jogo real
| Momento | Draw calls (na ilha) | Triângulos |
|---|---|---|
| Antes de qualquer rodada | 0 (ilha não existe) | 0 |
| Após Rodada 1 (portal + base da ilha), parado na chegada | 4 | 3.596 |
| Após Rodada 2 (+ estrutura + janelas/coração/varanda), parado perto da casa | 15 | 5.398 |
| Após Rodada 3 (+ porta aberta + arco/flores/luminárias), parado perto da casa | 28 | 9.967 |

**Por peça (2 supervisores independentes, harness Node+three.js, bateu exato):**
- `casa-portal.js`: 3dc / 722 tri (teto era 3dc/3.500tri — draw calls no limite, triângulos com 79% de folga).
- `casa-ilha.js`: 3dc / 2.410 tri (teto era 10dc/16.000tri — folga grande, 70-85%).

⚠️ **Bug real encontrado testando de verdade, não na auditoria estática**: a
cúpula do céu (`SphereGeometry` raio 150) fica fixa na origem do mundo — a
ilha, a ~370 unidades de distância, ficava do lado de FORA da cúpula, então
de lá se via uma "bola roxa sólida" no lugar do céu, em vez do céu envolvente
normal. Corrigido fazendo a cúpula (e as estrelas) acompanhar a câmera a
cada quadro (`ceuMesh.position.copy(cam.position)`), técnica padrão de
skybox — resolve para qualquer distância futura, não só para esta ilha.
Isso é `mundo-sarinha.html`, não uma peça — o Rei corrigiu direto, não foi
uma peça de construtor.

⚠️ **Rodada 2 — mesma causa, achado de novo (não é acidente, é estrutural
desta ilha)**: a luz direcional do mundo (`sol`, posição `(10,18,6)` mirando
a origem) só ilumina de verdade as faces viradas pra norte/leste/cima —
qualquer coisa virada pra SUL ou OESTE nunca recebe luz direta, só a
hemisférica fraca. Como a fachada principal da casa (a primeira coisa que a
criança vê ao chegar) e as janelas laterais oeste ficam exatamente nessas
faces "sem sol", tudo que ali era `MeshLambertMaterial` saía escuro e sem
graça — inclusive o coração da fachada, o motivo mais importante da rodada.
Corrigido trocando por `MeshBasicMaterial` (cor por vértice, auto-iluminado)
nesses elementos específicos: fachada sul da estrutura, caixilhos das
janelas, moldura do coração. Custo final: `casa-estrutura.js` 3dc/136tri,
`casa-janelas-varanda.js` 4dc/212tri (ambos ainda dentro do teto: 6dc/9.000
e 5dc/6.000). **Lição pras próximas rodadas** (fachada R3, jardim R6): toda
peça nova encostada na face SUL ou OESTE da casa precisa nascer já em
Basic, não Lambert — não vale a pena redescobrir isso rodada a rodada.

✅ **Rodada 3 confirmou que a lição colou**: os dois construtores
nasceram as peças inteiras em `MeshBasicMaterial` por conta própria,
zero Lambert em `casa-porta.js`/`casa-jardim-entrada.js`, sem eu
precisar corrigir depois. Custo final: porta 1dc/220tri, arco+flores+
luminárias 3dc/2.092tri (tetos 3dc/3.000 e 5dc/5.000). Porta fica ABERTA
de propósito (encostada na parede leste do vão) e sem colisor — passagem
confirmada livre por 2 supervisores independentes lendo o código.

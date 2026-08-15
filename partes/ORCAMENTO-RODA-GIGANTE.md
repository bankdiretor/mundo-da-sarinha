# ORÇAMENTO DA RODA-GIGANTE — teto especial documentado
*Aberto pelo Diretor na Rodada 3: os 6 arquivos `roda-*.js` já estouravam o teto genérico
do CONTRATO.md (2 draw calls / 3.000 tri) sem nenhum documento explicando por quê.
Este arquivo é a resposta — trackear aqui a cada rodada, não deixar por inferência.*

## Regra
O CONTRATO.md continua valendo para peças NOVAS e AVULSAS do resto do mundo.
A **sub-feature Roda-Gigante** (tudo que começa com `roda-*.js`) tem orçamento
próprio porque é um showpiece com muitas camadas de detalhe — mas **não é ilimitado**.

## Medido no jogo real (não somado por arquivo — importa o total na tela)
| Momento | Draw calls (na roda) | Triângulos |
|---|---|---|
| Antes de qualquer rodada | ~25 | ~35k |
| Após Rodada 1 (Plataforma + Estrela) | 33 | 36k |
| Após Rodada 2 (+ Estrutura + Luzes) | 43 | 46k |
| Após Rodada 3 (+ Cabines + Externa) | 51 | 71k |
| Após Rodada 4 (+ Fila) — **REMEDIDO no jogo real, parado perto da roda** | **48** | **51k** |

**Teto de alerta: 60 draw calls / 90k triângulos na zona da roda-gigante.**

✅ **A medição real veio MELHOR que a projeção por soma de arquivo** (que apontava
52/71k). O sistema de culling (esconder o que está longe da câmera) está reduzindo
o custo de verdade, não só no papel.

⚠️ **Achado da Rodada 5**: medir só "perto da roda" escondia o PIOR caso real.
Parado na praça central (0,0) — a 43,5 do eixo da roda, a mesma distância dos
raios de visibilidade que eu tinha dado às peças da roda (55 a 75) — **tudo
continuava sendo desenhado mesmo de longe**: 75 draw calls / 84 mil triângulos,
o pior número do jogo inteiro, e eu nem sabia que existia.

**Causa**: raios de visibilidade das peças `roda-*` maiores que a distância até
a praça central (43,5). **Correção**: raios reduzidos para 32-42 (cabem dentro
do parque e do corredor de entrada, mas não alcançam mais a praça central).

**Depois da correção, medido em 5 pontos do mundo**:
| Onde o jogador está | Draw calls | Triângulos |
|---|---|---|
| Perto da roda-gigante | 48 | 51k |
| Praça central (era 75/84k) | **45** | **63k** |
| Corredor de entrada do parque | 45 | 64k |
| Longe, na Festinha | 29 | 31k |
| Longe, na Vilinha | 29 | 39k |

**Pior caso do jogo inteiro: 48 draw calls / 64k triângulos** — 40% melhor que
antes da correção (era 75/84k), com folga real até o teto de 60/90k.

⚠️ Lição confirmada: **nunca confiar em soma-por-arquivo, nem em medir um único
ponto** — o número que importa é o PIOR CASO entre vários lugares do mundo,
medido com `__mundo.getMetrics()` no jogo rodando de verdade.

## Rodada 6 (extra) — luzes sincronizadas no aro/cabines + bancos + cerca
3 arquivos novos: `roda-luzes-giro.js` (2dc/1120tri), `roda-bancos.js` (1dc/320tri),
`roda-cerca.js` (1dc/912tri) — 4dc/2.352tri somados por arquivo.

**Remedido no jogo real, mesmos 5 pontos de antes:**
| Onde o jogador está | Draw calls | Triângulos |
|---|---|---|
| Perto da roda-gigante | **52** | 54k |
| Praça central | 47 | 63k |
| Corredor de entrada do parque | 45 | **64k** |
| Longe, na Festinha | 29 | 31k |
| Longe, na Vilinha | 29 | 39k |

**Pior caso do jogo inteiro: 52 draw calls / 64k triângulos** — dentro do teto
de 60/90k, com folga de 8 draw calls e 26 mil triângulos.

## Decisão tomada na Rodada 3
Rodada 4 (Interações) foi **encolhida de propósito** para conter o crescimento:
metade das interações do plano mestre já existem (embarque, giro, rádio tocando,
vista panorâmica) — só falta o que é genuinamente novo. Ver PLANO-R4 abaixo do
relatório do Diretor.

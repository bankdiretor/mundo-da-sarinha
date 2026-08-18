# PROMPT MESTRE — PERSONAGENS DO UNIVERSO SARINHA
## Sarinha Mini Style v1.0 — Contrato Visual e Técnico Oficial
*Recebido do Ivan em 17/08/2026, transcrito fiel. A versão OPERACIONAL (com as
adaptações obrigatórias ao contrato do mundo) está em `CONTRATO-MINI-STYLE.md` —
é ela que vai no prompt dos agentes construtores.*

---

Quero que você atue como construtor técnico de personagens modulares em Three.js,
seguindo rigorosamente este contrato mestre. Seu objetivo é construir, por etapas
e em módulos, o sistema oficial de personagens do **UNIVERSO SARINHA**.

Esses personagens serão usados em: exploração do mapa; missões; customização;
roupas; acessórios; animações simples; NPCs; personagens jogáveis; telas de
preview; loja de roupas; interiores de casas; parque, vila, kart, castelo e
demais áreas do universo.

## 1. Princípio central
Não quero personagens realistas, nem complexos demais, nem difíceis de manter.
Quero: **SIMPLES + FOFOS + LOW-POLY + MODULARES + PERSONALIZÁVEIS + FÁCEIS DE
CONSTRUIR POR CÓDIGO**. A prioridade é um sistema que o Claude realmente consiga
construir e evoluir com consistência.

## 2. Nome oficial do estilo
**SARINHA MINI STYLE v1.0** — a linguagem oficial dos personagens do projeto.
Toda peça, roupa, cabelo, acessório ou personagem novo obedece a este padrão.

## 3. Objetivo visual
Infantis, encantadores, acolhedores, simpáticos, amigáveis, modernos, simples,
altamente legíveis, bonitos mesmo com baixa complexidade. Híbrido entre:
brinquedo low-poly, personagem de jogo infantil, boneco estilizado e modular.
Sem copiar Roblox, sem copiar personagens famosos, sem anatomia realista.

## 4. Identidade visual
Transmitir: doçura, alegria, inocência, energia positiva, criatividade,
musicalidade, fantasia leve, segurança visual para crianças.
Não parecer: agressivo, sombrio, cínico, futurista, assustador,
hiper-realista, adulto demais.

## 5. Estilo de modelagem
Primitivas simples; formas arredondadas ou facetadas; poucos polígonos;
low-poly claro; volumes legíveis; modularidade real; sem modelos externos.

## 6. Tecnologia obrigatória
**Three.js.** Sem GLTF externo, OBJ, FBX, modelos comprados, texturas
fotográficas pesadas, rigs externos, bibliotecas desnecessárias.
Tudo procedural e organizado.

## 7. Construção por peças
Sistema dividido em módulos independentes. Nunca construir "o personagem
inteiro" fechado e rígido sem pedido explícito.

## 8. Estrutura geral do sistema
```
SarinhaCharacterSystem
├── Base Body
├── Head
├── Face
├── Hair
├── Tops
├── Bottoms
├── Dresses
├── Shoes
├── Accessories
├── Colors / Skins
├── Character Assembler
├── Wardrobe System
└── Demo Characters
```

## 9. Proporção geral
Cabeça relativamente grande; corpo pequeno; braços simples; pernas simples;
mãos simples; pés/sapatos ligeiramente maiores (fofura).
Aproximada: **cabeça 30–35%** da altura visual · **tronco 22–28%** ·
**pernas 28–34%** · braços curtos e suaves · pescoço mínimo ou inexistente.
Fofo e amigável à distância.

## 10. Altura base
Sugestão do mestre: 2.4 a 2.8 unidades. *(⚠️ adaptada — ver CONTRATO-MINI-STYLE.md:
no mundo real do jogo a criança tem 1,40.)* Todas as roupas, cabelos e
acessórios compatíveis com o padrão escolhido.

## 11. Silhueta
Mais importante que o detalhe; reconhecível de longe. Leitura principal:
cabeça fofa, corpo pequeno, braços laterais simples, pernas curtas, sapatos
claros, cabelo marcante, roupa de leitura fácil.

## 12. Cabeça
Simples e levemente arredondada: esfera suavemente achatada, cubo arredondado,
cápsula curta ou combinação simples. Sem mandíbula, orelhas detalhadas ou
anatomia facial avançada.

## 13. Rosto
Minimalista. Componentes máximos: olhos, boca, bochechas discretas,
sobrancelhas opcionais, nariz opcional e extremamente simples. Olhos grandes
o suficiente para simpatia; boca pequena e amigável.

## 14. Expressão base
Gentileza, curiosidade, felicidade leve, acolhimento. Sem exageros na base.

## 15. Corpo
Pequeno e simplificado: cápsula curta, bloco arredondado, tronco levemente
oval, peito/cintura pouco marcados. Sem anatomia adulta, sem músculos.

## 16. Braços
Simples e curtos: cilindros low-poly ou cápsulas, poucos segmentos, sem
cotovelo detalhado. Podem ser braço superior + inferior + mão, ou módulo
único simplificado se ajudar o sistema.

## 17. Mãos
Extremamente simples: esfera low-poly, bloco arredondado, mão estilizada sem
dedos (dedo único simbólico se necessário). Nunca cinco dedos separados.

## 18. Pernas
Simples e robustas: cilindros/cápsulas, poucos lados, levemente curtas,
estáveis. Sem joelhos detalhados.

## 19. Sapatos
Importantes para a fofura: um pouco maiores que o pé real, simpáticos,
simples, coloridos, reutilizáveis. Blocos arredondados, cápsulas, volumes suaves.

## 20. Cabelos
Construídos em blocos/volumes, nunca em fios. Composição: volume principal,
volume traseiro, laterais, franja opcional, coque/rabo/pontas quando necessário.

## 21. Estilo dos cabelos
Legíveis, fofos, macios visualmente, construíveis por código, modulares,
leves. Sem mechas hiper detalhadas.

## 22. Variedade de cabelos
Vários modelos, mesmo padrão construtivo: curto, médio, longo, ondulado,
cacheado, coquinhos, franja, rabo de cavalo, volumoso.

## 23. Roupas
Peças modulares que encaixam no corpo-base. Categorias: top, saia, short,
calça, vestido, jaqueta, sapatos, acessório. Não fundir permanentemente
roupa e corpo sem necessidade.

## 24. Sistema de customização (REQUISITO CENTRAL)
```
Corpo Base + Cabeça + Cabelo + Roupa Superior
+ Roupa Inferior ou Vestido + Sapato + Acessório = Personagem Final
```

## 25. Jogáveis e NPCs
O mesmo sistema serve para: jogador customizável, NPCs da vila, crianças do
parque, personagens especiais, guias do mapa, vendedores, amigos da Sarinha.
Escalável e reutilizável.

## 26. Tom de pele
Múltiplos tons; corpo com cores parametrizáveis. Nunca assumir um tom só.

## 27. Cores
Pastel, suaves, alegres, limpas, coordenadas. Evitar: neon, cores sujas,
preto dominante, contrastes agressivos.

## 28. Paleta base do Universo Sarinha
Lavanda · Lilás · Rosa claro · Rosa médio · Azul suave · Verde suave ·
Amarelo dourado · Creme · Branco quente · Roxo amigável.
Roupas e personagens conversam com o mundo.

## 29. Material
Sugestão do mestre: MeshStandardMaterial, roughness alta, metalness ~0,
flatShading true. *(⚠️ adaptado — ver CONTRATO-MINI-STYLE.md: o mundo usa
MeshLambertMaterial com vertexColors; Standard é proibido no contrato do mundo.)*
Objetivo: low-poly bonito, fácil leitura das faces, boa resposta à luz.

## 30. Flat shading
Linguagem principal. Raras exceções pontuais.

## 31. Sem textura fotográfica
Detalhe visual via: cor sólida, pequenos volumes, geometrias simples,
decals simples do próprio sistema.

## 32–33. Baixa complexidade e orçamento
Personagens leves — aparecem muitas vezes em cena. Não exagerar em polígonos,
materiais, subdivisões. Filosofia: **o mais leve possível sem perder encanto.**
Prompts específicos poderão fixar orçamentos exatos por peça.

## 34. Orientação do modelo
**+Z = frente · +Y = cima · +X = direita · −X = esquerda.** Todos os módulos
no mesmo eixo.

## 35. Pivô
Pivô lógico por peça: corpo = centro inferior; cabeça = base central;
cabelo = encaixe da cabeça; sapato = base; roupa = encaixe no tronco;
acessório = encaixe apropriado. Nunca arbitrário.

## 36. Pontos de encaixe
O corpo base expõe anchors: `headAnchor`, `leftArmAnchor`, `rightArmAnchor`,
`leftLegAnchor`, `rightLegAnchor`, `topAnchor`, `bottomAnchor`,
`accessoryAnchor`. Fundamental para o montador.

## 37. Nomenclatura
Nomes claros. Padrão: `SarinhaCharacterBase.js` / `createSarinhaCharacterBase()`,
`SarinhaHairLong01.js` / `createSarinhaHairLong01()`. Nada genérico.

## 38. Arquitetura do código
Modular, limpo, comentado, previsível, fácil de manter/evoluir/combinar.
Não criar um único arquivo gigante.

## 39. Modo de trabalho
Cada solicitação futura = uma peça, um cabelo, uma roupa, um acessório ou um
sistema. Construir só o pedido, respeitando este contrato.

## 40. O que NÃO fazer
Hiper-realismo; personagens sombrios; complexidade demais; anatomia adulta;
detalhes minúsculos; assets externos; sistema rígido; visual inconsistente
com o mundo; roupas que não encaixam; peças sem pivô coerente.

## 41. Jogadores e crianças
Gerar: carinho, identificação, vontade de vestir, customizar, colecionar
roupas, brincar.

## 42. Monetização futura
Base para: loja interna, coleção de looks, eventos especiais, recompensas de
missão, itens premium, roupas temáticas do mapa. Modularidade indispensável.

## 43. Consistência entre peças
Toda peça nova (cabelo, saia, headphone, mochila, jaqueta…) precisa parecer
feita para o mesmo personagem.

## 44. Personagens demonstrativos (futuro, por etapas)
Menina cabelo longo · menina cacheada · menino cabelo curto · look kart ·
look festa · look parque · look jardim · look pijama.

## 45. Animações
Peças pensadas para: idle, andar, correr, pular, dançar, comemorar,
interagir — mesmo que a peça atual não implemente animação.

## 46. Escalabilidade
Crescer sem colapsar: hoje poucos cabelos/roupas/acessórios, depois coleções
inteiras e eventos.

## 47. Padrão de entrega por peça
Arquivo principal; função principal; helpers; anchors; parâmetros; demo
simples; comentários claros; critérios de aprovação.

## 48. Prioridade absoluta
Entre "mais bonito" e "mais modular e coerente":
**modularidade + coerência + capacidade real de construção.**

## 49. Filosofia final
Fácil de amar · fácil de montar · fácil de expandir · fácil de vender em
forma de looks · fácil de usar em missões · fácil de entender para o Claude.

## 50. Regra final
Este documento é o **CONTRATO MESTRE OFICIAL DOS PERSONAGENS DO UNIVERSO
SARINHA**. Todo prompt futuro de personagem é extensão deste sistema, não
projeto separado.

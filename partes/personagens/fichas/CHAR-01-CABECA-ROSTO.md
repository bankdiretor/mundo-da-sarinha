# FICHA CHAR-01 — CABEÇA + ROSTO OFICIAL
*Prompt + ficha visual do GPT (18/08/2026), com as decisões tomadas na
construção. Medida oficial travada pelo Ivan: **cabeça = 32% da altura-base,
~0,83u em 2.60, teto 0,85u**.*

## Escopo
Substituir o `HeadPlaceholder` do CHAR-00 por uma cabeça definitiva com rosto.
SEM cabelo, chapéu, roupa, acessório, animação facial. Não mexer no rig, nos
anchors nem nas proporções do corpo.

## Entregue
`SarinhaCharacterHead.js` → `SARINHA_PERSONAGENS.createSarinhaCharacterHead(ctx, opts)`
`opts`: `skinColor` · `showFace` · `flatShading` · `material`

```
CharacterHead (pivô na BASE)
  ├ HeadMesh     — crânio + 2 orelhas mesclados
  └ FaceDetails  — 2×(contorno+esclera+pupila+brilho+bochecha+sobrancelha) + boca
```

## v1.2 — FACE ART PASS (18/08)
Só o desenho do rosto; a solução técnica (crânio de normais suaves, corpo
facetado, contorno do olho) foi preservada integralmente, por ordem do Ivan:
"as medições no motor real têm prioridade sobre a ficha conceitual".

| item | v1.1 | v1.2 | por quê |
|---|---|---|---|
| contorno do olho | 0,0090 | **0,0045** | lia como armação de óculos |
| forma do olho | 1,18 (quase redondo) | **1,38 oval vertical** | pedido do Ivan |
| pupila / área da esclera | 40% | **68,2%** | alvo 65–70%: olhar mais caloroso |
| sobrancelha | 101°, 0,021 grossa | **79°, 0,012** | grossa+comprida lia SURPRESA |
| cor da sobrancelha | 0x4a2e22 | **0x5a3a2c** | mais suave |
| boca | 0,124 larg | **0,144 larg**, mesma altura | sorriso mais aberto |
| bochechas | Y −0,020 | **Y −0,075** | o olho, agora mais alto, encostava nelas |

Triângulos e malhas **inalterados** (373 / 2): só mudaram raios e escalas.
⚠️ Conferido por cálculo que a sobrancelha (base em +0,1287) não invade o olho
(topo em +0,1175).

## Números MEDIDOS
- Cabeça: **373 triângulos**, **2 malhas** (alvo do GPT: 280–400, teto 450 · máx 2–4 malhas)
- Cabeça: **0,8298u** de altura = **31,9%** do personagem ✔ medida oficial
- Personagem completo: **1.373 triângulos** (teto 1.800) · 13 malhas
- Altura 2,600 · pé em y=0,000 · zero violação (sem Standard, sem luz, sem sombra)
- Console limpo · rosto voltado para +Z · cabeça acompanha o `HeadPivot`
- Contraste do olho contra a pele: 0,73 (clara) e 0,12 (escura) — legível nas duas

## Decisões (e por que divergem do texto do prompt)
1. **Sobrancelhas EXISTEM.** O texto dizia "opcional, só se melhorar muito";
   a **ficha visual tem** em todos os rostos, e elas carregam a expressão. A
   imagem venceu o texto (regra da casa).
2. **Posições lidas da FICHA, não do texto.** O texto punha os olhos em Y +0,07
   a +0,11; medi no painel 1 da ficha e usei: olhos a **46%** do topo,
   sobrancelhas a 36%, boca a 68%, bochechas a 52%.
3. **Conflito olhos × "40% superiores reservados ao cabelo" (item 30)**: resolvido
   como zona de **topo e nuca**, não face frontal — franja cobre testa em todo
   penteado real. Nenhum elemento facial passa de Y +0,13 (a testa continua livre).
4. **Contorno escuro no olho** — não estava no texto, está na ficha. Ver armadilha 2.
5. **Shading suave só no crânio** — exceção justificada, ver armadilha 1.

## ⚠️ ARMADILHAS PAGAS NESTE MÓDULO
1. **Flat shading + luz noturna = BANDAS, e a banda dos olhos engole o rosto.**
   Com 8 anéis e faces planas, a cabeça vira faixas horizontais de luminância; a
   faixa dos olhos caía inteira na sombra. Achatar a frente **não resolveu**
   (medido: queda de 39% → 31%, quase nada). O que resolveu foi **interpolar a
   normal só no crânio** (contrato mestre item 30 prevê "raras exceções"). O
   corpo inteiro segue facetado.
2. **A esclera branca some contra a pele.** MEDIDO na tela: esclera 0,60 de
   luminância, pele da testa 0,55 — diferença de 0,05. Sem contorno, o olho lê
   como um buraco preto sem forma. A ficha do GPT já trazia o contorno escuro;
   eu é que não tinha copiado. Com ele, o olho ganhou desenho.
3. **`scale(-1,1,1)` para espelhar SOME com a peça.** A sobrancelha esquerda
   desapareceu: inverter um eixo inverte a orientação das faces e o backface
   culling a esconde. Arco simétrico não precisa de espelho.
4. **Pupila grande demais engole a doçura.** A 74% do olho, virava buraco preto;
   a 62% sobra esclera e o olhar fica gentil.
5. **Discos faciais empilhados precisam de degrau em Z** (0,004 entre camadas)
   ou piscam — quatro camadas por olho no mesmo plano seria z-fighting garantido.

## PROVA NA LUZ REAL DO JOGO
`fotos/personagens/char-01-no-jogo/` — o personagem montado DENTRO do
`mundo-sarinha.html` (névoa, céu, chão creme, castelo ao fundo, NPCs antigos ao
lado para comparação direta), em praça, jardim, vilinha e castelo. Console
limpo, sem erro. Receita: `scratchpad/fotos_no_jogo.py` — injeta os dois scripts
com `add_script_tag`, monta no `HeadPivot` e usa `__mundo.foto()`.
⚠️ Nestas tomadas o personagem vai **sem** o giro de 180°: ele olha para +Z e as
câmeras estão em +Z. O giro só entra na integração de verdade, para casar com a
convenção −Z do boneco antigo. (Na 1ª rodada girei e ele saiu de costas.)

## Como ver
`_vitrine-personagem.html?zoom=cabeca&vista=frente` (troque `vista` por
`34|lado|costas`) · `&pele=5A3524` testa pele escura · `&rosto=0` esconde o
rosto · `&cabeca=0` volta ao placeholder · `&flat=1` mostra o crânio facetado
(o defeito da armadilha 1).
Fotos: `fotos/personagens/char-01/`

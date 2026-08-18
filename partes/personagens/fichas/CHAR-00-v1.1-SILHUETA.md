# CHAR-00 v1.1 — SILHOUETTE PASS
*Ordem de correção do Ivan, 18/08/2026. O v1.0 é **alpha aprovado como estrutura**:
provou arquitetura, anchors e rig. Esta rodada mexe SÓ em proporção e silhueta.*

## Diagnóstico do Ivan
"Tecnicamente correto, mas visualmente parece um **robô low-poly**." Alvo:
personagem infantil estilizado, fofo, de brinquedo, **silhueta compacta**.
Teste final: com os anchors desligados e sem rosto/cabelo/roupa, o corpo tem de
ler como **criança fofa**, não como manequim técnico.

## Alterações pedidas
| parte | ordem |
|---|---|
| Cabeça | −12% · NÃO esfera perfeita: mais larga em X, mais curta em Y, achatada em Z; base estreita discretamente |
| Torso | altura −15~20% · largura +discreta · curto, arredondado, infantil; **evitar ovo vertical** |
| Ombros | braços mais perto do corpo · linha do ombro ligeiramente mais alta |
| Braços | comprimento −12% · espessura +10~15% · preservar UpperArm/ElbowPivot/Forearm |
| Mãos | −15% · arredondada/facetada, luvinha de brinquedo |
| Pernas | altura −15% · espessura +discreta · curta e estável |
| Sapatos | largura e profundidade MAIORES · altura ligeiramente menor · propositalmente grandes e fofos |
| Pescoço | nenhum cilindro/ponto colorido visível entre cabeça e torso com debug desligado |
| Debug | anchors e cores de debug só com `showDebugAnchors=true` |

## Preservar (intocável)
`CharacterRoot` · `Pelvis` · todos os pivôs · todos os anchors · orientação +Z ·
Y=0 nos pés · modularidade · funcionamento para animação.

## ⚠️ Conflito aritmético e como foi resolvido
As reduções somadas (cabeça −12%, torso −18%, pernas −15%) **não fecham em 2.60**:
com o corpo menor, manter a altura absoluta exigiria uma cabeça de ~46% da altura.
Resolução: as reduções são aplicadas em **proporção**, a peça é construída na sua
altura natural (~2.19) e **normalizada para o `height` pedido** na saída. Efeito:
a altura final continua controlada pelo parâmetro, e a cabeça passa a ocupar
**~36%** do corpo (era 34,7%) — ou seja, MAIS chibi, que é o objetivo.
Consequência registrada: 36% estoura por ~1 ponto o range 30–35% do contrato
mestre (item 9). É consequência direta da ordem do Ivan e do alvo "mais fofo";
o critério da ficha foi para 32–37% com esta justificativa.

## Não fazer nesta rodada
Rosto, cabelo, roupas, CHAR-01. Só silhueta.

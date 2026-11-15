# Tournament Bracket Graph & Podium Export Specification

**Approved**: 2026-11-15 - user: "aprovado"

## Problem Statement

Durante e após o torneio, o organizador e os participantes precisam alternar entre abas separadas (Winners, Losers e Grande Final) sem uma visão gráfica unificada do chaveamento completo. Além disso, ao encerrar o torneio, não há uma classificação oficial de 1º, 2º, 3º e 4º lugar em destaque nem uma forma de baixar uma imagem consolidada do torneio com o chaveamento e o pódio completo para compartilhamento e registro.

## Goals

- [x] Adicionar uma aba dedicada (`6. GRÁFICO DO TORNEIO`) que exibe em tempo real o gráfico completo de chaveamento (Winners Bracket, Losers Bracket e Grande Final conectados visualmente).
- [x] Calcular e exibir em destaque o pódio com o 1º, 2º, 3º e 4º lugar ao concluir a Grande Final, ordenando os não-campeões pelo total absoluto de vitórias (`wins`), origem (`WINNERS` > `LOSERS`) e `seed` inicial.
- [x] Permitir baixar uma imagem PNG do torneio completo contendo em destaque os nomes dos participantes em 1º, 2º, 3º e 4º lugar e todas as chaves disputadas quando o torneio estiver concluído (`COMPLETED`).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Registro ou edição de vencedores diretamente nos nós da aba de Gráfico | O usuário definiu que a aba de gráfico é exclusiva para visualização em tempo real e exportação da imagem |
| Exportação de imagem em formatos adicionais (PDF, JPEG) ou geração no servidor | O download será gerado no cliente em formato PNG seguindo a arquitetura zero-dependências de front-end (AD-001) |
| Classificação detalhada do 5º ao 64º lugar no pódio de destaque | O destaque solicitado foca especificamente nos 4 finalistas da Grande Final (1º, 2º, 3º e 4º lugar) |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Regra de desempate do 2º, 3º e 4º lugar na Grande Final | Ordenar os 3 finalistas restantes pelo total absoluto de vitórias (`wins` decrescente), desempatando por origem (`WINNERS` antes de `LOSERS`) e depois por `seed` inicial (`seed` ascendente) | Escolha explícita do usuário: "Total absoluto de vitórias (wins) na Grande Final, desempatando por origem (Winners > Losers) e Seed inicial" | y |
| Comportamento interativo da aba de Gráfico de Chaveamento | Visualização panorâmica em tempo real (Winners + Losers + Grande Final conectados + Pódio Top 4) sem botões de alteração de resultado das partidas | Escolha explícita do usuário: "(Recommended) Somente visualização em tempo real (Winners + Losers + Grande Final conectados com linhas e Pódio Top 4) + exportação de imagem" | y |
| Momento de habilitação e formato do download da imagem | Botão de download gera arquivo PNG no navegador e fica habilitado exclusivamente quando `tournament.status === 'COMPLETED'` | Escolha explícita do usuário: "(Recommended) PNG gerado no navegador (tema Arcade Bomberman), habilitado apenas quando o torneio é concluído (COMPLETED) com o Pódio 1º ao 4º em destaque" | y |
| Reversão do pódio ao desfazer a vitória final da Grande Final | Quando `undoGrandFinalWin` reverte o torneio de `COMPLETED` para `GRAND_FINAL`, o pódio Top 4 deixa de estar fechado e o botão de download volta a ficar desabilitado | Mantém integridade de transição de estado com a funcionalidade existente de desfazer rodada na Grande Final | y |
| Cobertura das dimensões implícitas (Implicit-Requirement Dimensions) | Integridade de transição de estado (`DRAFT` -> `IN_PROGRESS` -> `GRAND_FINAL` -> `COMPLETED` e undo) e validação de estado para exportação cobertas; demais dimensões N/A para este escopo | A funcionalidade opera sobre os dados do torneio já persistidos e renderizados localmente no navegador | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Aba de Gráfico de Chaveamento em Tempo Real ⭐ MVP

**User Story**: Como organizador ou espectador do torneio, quero acessar uma aba de gráfico de chaveamento para acompanhar visualmente a progressão de todas as rodadas da Winners Bracket, Losers Bracket e Grande Final em uma única tela.

**Why P1**: É a estrutura visual central solicitada para acompanhar o andamento do torneio de ponta a ponta.

**Acceptance Criteria** (each line is one EARS pattern):

1. The system SHALL exibir na barra `#phase-tabs` o botão de aba `data-tab="bracket-graph"` (`6. GRÁFICO DO TORNEIO`) e a respectiva seção `#bracket-graph-section`.
2. WHILE o torneio selecionado estiver no estado `DRAFT`, the system SHALL exibir na seção `#bracket-graph-section` um estado vazio informativo indicando que o gráfico de chaveamento será gerado quando o torneio for iniciado e manter o botão `#download-bracket-image-btn` com atributo `disabled`.
3. WHILE o torneio selecionado estiver nos estados `IN_PROGRESS`, `GRAND_FINAL` ou `COMPLETED`, the system SHALL renderizar no container `#bracket-graph-container` os blocos visuais conectados de todas as rodadas da `Winners Bracket`, todas as rodadas da `Losers Bracket` e da `Grande Final (3x6)`, exibindo os nomes dos jogadores, cores/sprites de Bomberman, indicadores de conexão (`winnerTargets` / `loserTargets`) e status de cada partida.
4. WHEN uma partida da Winners, Losers ou rodada da Grande Final é registrada ou desfeita THEN the system SHALL atualizar o conteúdo de `#bracket-graph-container` refletindo imediatamente os vencedores, perdedores e placares atuais.

**Independent Test**: Criar e iniciar um torneio com 16 jogadores, abrir a aba `6. GRÁFICO DO TORNEIO`, verificar todas as rodadas de Winners, Losers e Grande Final conectadas no gráfico, avançar partidas e confirmar que o gráfico reflete o andamento em tempo real.

---

### P1: Cálculo e Destaque do Pódio (1º, 2º, 3º e 4º Lugar) ⭐ MVP

**User Story**: Como organizador ou participante, quero ver em destaque a classificação final de 1º, 2º, 3º e 4º lugar assim que o torneio é concluído, para celebrar o pódio completo da Grande Final.

**Why P1**: O destaque nominal dos 4 primeiros colocados na tela e na imagem final é requisito essencial pedido pelo usuário.

**Acceptance Criteria**:

1. WHEN o torneio atinge o estado `COMPLETED` na Grande Final THEN the system SHALL calcular a classificação `podium` de 1º, 2º, 3º e 4º lugar onde o 1º lugar é o campeão (`championId`) e os outros 3 finalistas são ordenados por maior número absoluto de vitórias (`wins`) na Grande Final, desempatando por origem (`WINNERS` antes de `LOSERS`) e depois por menor `seed` inicial.
2. WHILE o torneio estiver no estado `COMPLETED`, the system SHALL exibir em destaque na seção `#bracket-graph-section` o pódio (`#bracket-podium-banner`) com a posição (`1º LUGAR`, `2º LUGAR`, `3º LUGAR`, `4º LUGAR`), o nome de cada participante, sua cor/sprite de Bomberman e seu placar na Grande Final (`wins / targetWins`).
3. WHEN a última vitória da Grande Final de um torneio `COMPLETED` é desfeita via `undoGrandFinalWin` retornando o status para `GRAND_FINAL` THEN the system SHALL remover a classificação finalizada de 1º a 4º lugar e desabilitar novamente o botão `#download-bracket-image-btn`.

**Independent Test**: Concluir a Grande Final de um torneio e verificar que os cartões de 1º, 2º, 3º e 4º lugar aparecem em destaque na aba do gráfico respeitando a ordenação por vitórias absolutas, origem (Winners > Losers) e seed inicial.

---

### P1: Exportação de Imagem PNG do Torneio Completo com Pódio em Destaque ⭐ MVP

**User Story**: Como organizador do torneio, quero baixar uma imagem PNG do torneio completo ao final da competição com o chaveamento e os nomes do 1º, 2º, 3º e 4º lugar em destaque, para compartilhar o resultado oficial.

**Why P1**: Entrega o artefato visual exportável exigido no encerramento do torneio.

**Acceptance Criteria**:

1. WHILE o torneio estiver nos estados `DRAFT`, `IN_PROGRESS` ou `GRAND_FINAL`, the system SHALL manter o botão `#download-bracket-image-btn` desabilitado (`disabled`).
2. WHILE o torneio estiver no estado `COMPLETED`, the system SHALL habilitar o botão `#download-bracket-image-btn` na aba `6. GRÁFICO DO TORNEIO`.
3. WHEN o usuário aciona o botão `#download-bracket-image-btn` em um torneio `COMPLETED` THEN the system SHALL gerar uma imagem PNG contendo o nome do torneio, a seção de destaque com os nomes e colocações do 1º, 2º, 3º e 4º lugar e o gráfico completo das chaves (`Winners Bracket`, `Losers Bracket` e `Grande Final`), disparando o download de um arquivo `.png`.

**Independent Test**: Em um torneio concluído (`COMPLETED`), clicar em `BAIXAR IMAGEM DO TORNEIO (.PNG)` na aba do gráfico e verificar que o arquivo `.png` é gerado e baixado contendo o pódio de 1º a 4º lugar em destaque e todas as rodadas do chaveamento.

---

## Edge Cases

- WHEN dois ou mais finalistas não-campeões terminam a Grande Final empatados com o mesmo número absoluto de vitórias (`wins`) e a mesma origem (`WINNERS` ou `LOSERS`) THEN the system SHALL desempatar atribuindo a colocação superior ao jogador com menor número de `seed` inicial (`player.seed`).
- IF o usuário tentar acionar a geração/download de imagem quando não há torneio ativo ou quando `tournament.status !== 'COMPLETED'` THEN the system SHALL impedir a exportação e não disparar download.
- WHEN o torneio possui participantes `BOT/BYE` (ex.: 20 jogadores humanos em chave de 32) THEN the system SHALL exibir os slots e partidas auto-resolvidas (`autoResolved`) corretamente no gráfico e na imagem exportada.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| GRAPH-01 | P1: Aba de Gráfico de Chaveamento em Tempo Real | Execute | Verified |
| GRAPH-02 | P1: Aba de Gráfico de Chaveamento em Tempo Real | Execute | Verified |
| GRAPH-03 | P1: Aba de Gráfico de Chaveamento em Tempo Real | Execute | Verified |
| GRAPH-04 | P1: Aba de Gráfico de Chaveamento em Tempo Real | Execute | Verified |
| GRAPH-05 | P1: Cálculo e Destaque do Pódio (1º, 2º, 3º e 4º Lugar) | Execute | Verified |
| GRAPH-06 | P1: Cálculo e Destaque do Pódio (1º, 2º, 3º e 4º Lugar) | Execute | Verified |
| GRAPH-07 | P1: Cálculo e Destaque do Pódio (1º, 2º, 3º e 4º Lugar) | Execute | Verified |
| GRAPH-08 | P1: Exportação de Imagem PNG do Torneio Completo com Pódio em Destaque | Execute | Verified |
| GRAPH-09 | P1: Exportação de Imagem PNG do Torneio Completo com Pódio em Destaque | Execute | Verified |
| GRAPH-10 | P1: Exportação de Imagem PNG do Torneio Completo com Pódio em Destaque | Execute | Verified |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 10 total, 10 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [x] A aba `6. GRÁFICO DO TORNEIO` exibe o chaveamento completo (Winners, Losers e Grande Final conectados) em tempo real para qualquer torneio iniciado (16 a 64 jogadores).
- [x] Ao concluir o torneio, o pódio de 1º, 2º, 3º e 4º lugar é calculado deterministicamente (vitórias absolutas > origem Winners/Losers > seed inicial) e exibido em destaque na tela.
- [x] O botão de download gera e baixa uma imagem PNG completa com o pódio Top 4 em destaque e todas as chaves do torneio.

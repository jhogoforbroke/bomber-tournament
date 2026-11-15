# Random Player Color Assignment Specification

**Approved**: 2026-11-15 - user: "aprovado"

## Problem Statement

Atualmente, o formulário de inscrição de jogadores exige que o organizador veja um seletor manual de cor/sprite (`#player-color-select`) ao cadastrar cada participante, ou atribui cores em ordem fixa no preenchimento rápido. O organizador deseja agilizar o cadastro informando apenas o nickname do jogador, delegando ao sistema o sorteio aleatório balanceado da cor/sprite entre as 8 cores clássicas de Bomberman.

## Goals

- [ ] Remover o seletor manual de cor/sprite (`#player-color-select`) do formulário de adição de jogador na interface web, mantendo apenas o campo de nickname e o botão de adicionar.
- [ ] Atribuir automaticamente uma cor aleatória balanceada (sorteando entre as cores menos utilizadas no torneio atual antes de repetir) sempre que um jogador for adicionado sem cor informada (tanto no cadastro individual quanto em lote/preenchimento rápido).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Criação de novas cores além das 8 clássicas de Bomberman | As 8 cores oficiais (`white`, `black`, `red`, `blue`, `green`, `yellow`, `pink`, `aqua`) já estão definidas nos sprites SVG do projeto |
| Edição manual de cor após o jogador já estar cadastrado | O objetivo é tornar a atribuição de cor 100% automática por sorteio balanceado no momento da inscrição |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Remoção do seletor de cor no formulário da UI | Remover completamente o `<select id="player-color-select">` do `#add-player-form`, deixando apenas o campo de Nickname e o botão `+ ADICIONAR JOGADOR` | Escolha explícita do usuário: "(Recommended) Remover completamente o seletor de cor do formulário (apenas campo de Nickname + botão Adicionar)" | y |
| Algoritmo de sorteio de cor | Sorteio aleatório balanceado: identificar o menor número de ocorrências entre as 8 cores clássicas nos jogadores humanos atuais do torneio e sortear aleatoriamente entre as cores empatadas com menor uso | Escolha explícita do usuário: "Sorteio aleatório balanceado (priorizando cores menos usadas no torneio antes de repetir)" | y |
| Compatibilidade da API quando `color` é omitida ou enviada | Tornar `color` opcional em `addPlayer` e `POST /api/tournaments/:id/players` (usando sorteio balanceado quando omitida/vazia), mas manter validação HTTP `400` se uma string de cor inválida for enviada explicitamente via API | Preserva integridade de validação de entrada e retrocompatibilidade | y |
| Cobertura das dimensões implícitas (Implicit-Requirement Dimensions) | Validação de entrada (rejeitar cor inválida se enviada explicitamente, manter validação de nome único); demais dimensões N/A para este escopo local | Escopo focado na atribuição de cor em memória/JSON e simplificação do formulário | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Sorteio Aleatório Balanceado de Cor e Cadastro Simplificado sem Seletor ⭐ MVP

**User Story**: Como organizador do torneio, quero cadastrar jogadores informando apenas o nickname (ou usando o preenchimento rápido) sem precisar selecionar cor/sprite manualmente, para que o sistema sorteie automaticamente uma cor de Bomberman priorizando as cores menos usadas no torneio.

**Why P1**: Entrega a experiência completa solicitada pelo usuário tanto na regra de domínio/API quanto no formulário da interface web.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN um jogador humano é adicionado ao torneio sem cor especificada (`color` omitida, `null` ou vazia) THEN the system SHALL sortear aleatoriamente uma cor dentre o subconjunto das 8 cores de Bomberman (`white`, `black`, `red`, `blue`, `green`, `yellow`, `pink`, `aqua`) que possuírem a menor contagem de uso entre os jogadores humanos já inscritos no torneio.
2. WHEN 8 jogadores humanos consecutivos são adicionados sem cor especificada em um torneio vazio THEN the system SHALL atribuir todas as 8 cores de Bomberman exatamente uma vez (em ordem aleatória) antes de repetir qualquer cor no 9º jogador.
3. IF uma chamada à API ou domínio informar explicitamente uma cor que não pertença à lista `BOMBERMAN_COLORS` THEN the system SHALL rejeitar a adição com `ValidationError` e status HTTP `400`.
4. WHILE o torneio estiver na aba de inscrição e seeding (`#seeding-section`), the system SHALL exibir o formulário `#add-player-form` contendo apenas o campo de texto `#player-name-input` e o botão `#add-player-btn`, sem o elemento `#player-color-select`.
5. WHEN o organizador adiciona um jogador pelo formulário `#add-player-form` ou aciona o preenchimento rápido (`#quick-fill-16-btn` / `#quick-fill-20-btn`) THEN the system SHALL enviar a requisição de criação sem fixar cores no cliente para que o servidor atribua cores via sorteio aleatório balanceado.

**Independent Test**: Abrir a tela de inscrição, verificar que o seletor de cor não existe no formulário, adicionar jogadores apenas pelo nickname (e via preenchimento rápido de 16 jogadores) e verificar que cada grupo de 8 jogadores recebe as 8 cores clássicas de Bomberman distribuídas aleatoriamente sem repetição prematura.

---

## Edge Cases

- WHEN um jogador humano é removido do torneio no estado `DRAFT` e um novo jogador é adicionado em seguida sem cor especificada THEN the system SHALL recalcular a contagem de cores atuais e priorizar a cor que ficou com menor frequência após a remoção.
- IF o payload de `POST /api/tournaments/:id/players` enviar `{ "name": "Shirobon" }` sem a propriedade `color` THEN the system SHALL responder com status HTTP `201` e um `color` válido pertencente a `BOMBERMAN_COLORS`.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| COLOR-01 | P1: Sorteio Aleatório Balanceado de Cor e Cadastro Simplificado sem Seletor | Execute | Verified |
| COLOR-02 | P1: Sorteio Aleatório Balanceado de Cor e Cadastro Simplificado sem Seletor | Execute | Verified |
| COLOR-03 | P1: Sorteio Aleatório Balanceado de Cor e Cadastro Simplificado sem Seletor | Execute | Verified |
| COLOR-04 | P1: Sorteio Aleatório Balanceado de Cor e Cadastro Simplificado sem Seletor | Tasks | In Tasks |
| COLOR-05 | P1: Sorteio Aleatório Balanceado de Cor e Cadastro Simplificado sem Seletor | Tasks | In Tasks |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] O formulário `#add-player-form` exibe apenas o campo de Nickname e o botão de adicionar, sem dropdown de cor.
- [ ] Ao cadastrar 8 ou 16 jogadores sem informar cor, as 8 cores de Bomberman são sorteadas de forma balanceada (1 de cada nos primeiros 8; 2 de cada nos primeiros 16) e em ordem aleatória.

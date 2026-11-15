# Bomber Tournament Manager Specification

**Approved**: 2026-11-15 - user: "aprovado"

## Problem Statement

Organizar torneios presenciais ou online de Bomberman para 16 ou mais jogadores com partidas de 4 jogadores em Dupla Eliminação exige controle complexo de subida na Winners Bracket, quedas cruzadas para a Losers Bracket e contagem de handicap na Grande Final (3 vitórias para finalistas da Winners contra 6 vitórias para finalistas da Losers). Controles manuais em planilhas causam erros de chaveamento e não entregam uma experiência visual imersiva temática de Bomberman para jogadores e espectadores.

## Goals

- [ ] Permitir criar, listar, carregar e excluir múltiplos torneios persistidos em arquivos de texto (`.json`) com suporte a 16 ou mais jogadores (múltiplos de 4, com preenchimento automático de `BOT/BYE` quando necessário).
- [ ] Automatizar 100% da progressão das chaves Winners e Losers (4 jogadores por partida, 2 avançam e 2 caem/saem) com suporte a desfazer partidas cujos confrontos seguintes ainda não foram concluídos.
- [ ] Controlar a Grande Final de 4 jogadores com handicap automático (meta de 3 vitórias para finalistas da Winners e 6 vitórias para finalistas da Losers) em uma interface temática de Bomberman.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Autenticação de usuários e login multi-conta | O sistema opera como painel local/repositório único do organizador do torneio |
| Banco de dados relacional ou externo (PostgreSQL, MongoDB) | Persistência definida pelo usuário como arquivos simples de texto nesta fase |
| Emulador ou execução do jogo Bomberman no navegador | O sistema gerencia o torneio, chaves e placares, não a partida jogável em si |
| Integração com APIs externas de streaming (Twitch/YouTube) | Fora do escopo do gerenciador de chaves local |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Expansão do número de jogadores além de 16 | Aceitar qualquer múltiplo de 4 entre 16 e 64 jogadores humanos, preenchendo vagas restantes até a próxima potência de 2 (16, 32 ou 64) com slots `BOT/BYE` | Escolha explícita do usuário para permitir múltiplos de 4 mantendo chaves exatas de 4 jogadores por partida | y |
| Registro de resultados na Winners e Losers | Selecionar exatamente os 2 sobreviventes da partida; os outros 2 são classificados automaticamente como perdedores | Escolha explícita do usuário para agilizar a operação das chaves classificatórias | y |
| Registro de resultados na Grande Final | Contador individual de vitórias (+1 / -1 por mapa) com meta de 3 para origem Winners e 6 para origem Losers | Regra oficial do torneio confirmada pelo usuário | y |
| Cadastro e Seeding de jogadores | Cadastro com escolha de cor/avatar clássico de Bomberman, permitindo sorteio aleatório (shuffle) e reordenação manual antes de iniciar | Escolha explícita do usuário | y |
| Persistência e correção de resultados | Múltiplos torneios salvos em arquivos de texto JSON (`data/tournaments/*.json`) e opção de desfazer resultado de partida se a rodada dependente não tiver iniciado | Escolha explícita do usuário | y |
| Cobertura das dimensões implícitas (Implicit-Requirement Dimensions) | Validação de limites (16..64, múltiplo de 4), gravação atômica em arquivo temporário + rename, bloqueio de edição fora de ordem, log estruturado; Auth e External-dependency = N/A because aplicação local autônoma sem dependências externas ou login | Garante integridade de estado e persistência segura em arquivos texto | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Criação de Torneio, Cadastro de Jogadores e Seeding ⭐ MVP

**User Story**: Como organizador do torneio, quero criar um torneio, cadastrar jogadores com avatares de Bomberman e organizar ou sortear a ordem inicial para gerar as chaves da Rodada 1 com 4 jogadores por arena.

**Why P1**: Sem a criação do torneio, cadastro validado de participantes (múltiplos de 4 a partir de 16) e geração inicial das chaves, nenhuma partida pode ocorrer.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN o organizador cria um novo torneio informando um nome válido THEN the system SHALL criar e persistir um arquivo de texto estruturado em `data/tournaments/` com status inicial `DRAFT`.
2. WHEN o organizador adiciona um jogador no estado `DRAFT` com nome único e cor/avatar de Bomberman (`white`, `black`, `red`, `blue`, `green`, `yellow`, `pink`, `aqua`) THEN the system SHALL registrar o jogador na lista de participantes do torneio.
3. IF o organizador tentar adicionar um jogador com nome vazio ou duplicado no mesmo torneio THEN the system SHALL rejeitar a operação com status HTTP `400` e mensagem de erro descritiva.
4. WHILE o torneio estiver no estado `DRAFT`, WHEN o organizador acionar a função de embaralhar (`shuffle`) ou reordenar jogadores manualmente THEN the system SHALL atualizar e persistir a ordem de seeding dos participantes.
5. WHEN o organizador iniciar o torneio com um número de jogadores humanos $N$ tal que $16 \le N \le 64$ e $N \bmod 4 = 0$ THEN the system SHALL alterar o status para `IN_PROGRESS`, completar os slots até a potência de 2 imediatamente superior ou igual ($P \in \{16, 32, 64\}$) com participantes `BOT/BYE` se $N < P$, e gerar todas as partidas da Winners Bracket, Losers Bracket e Grande Final com 4 slots por partida.
6. IF o organizador tentar iniciar o torneio com menos de 16 jogadores, mais de 64 jogadores ou quantidade que não seja múltiplo de 4 THEN the system SHALL bloquear o início com status HTTP `400` informando a regra de múltiplos de 4 (mínimo 16).

**Independent Test**: Criar um torneio via interface/API, adicionar 16 e 20 jogadores com cores de Bomberman, embaralhar a lista, iniciar o torneio e verificar que as partidas da Rodada 1 da Winners foram geradas com 4 participantes por arena e salvas em disco.

---

### P1: Progressão das Chaves Winners e Losers (Dupla Eliminação de 4 Jogadores) ⭐ MVP

**User Story**: Como organizador do torneio, quero registrar os 2 sobreviventes de cada partida de 4 jogadores nas chaves Winners e Losers para que o sistema avance automaticamente os vencedores, envie os perdedores da Winners para a Losers e elimine os perdedores da Losers até definir os 4 finalistas.

**Why P1**: É o núcleo da regra de negócio do torneio de Bomberman em dupla eliminação.

**Acceptance Criteria**:

1. WHEN o organizador registra o resultado de uma partida pronta (`READY`) da Winners Bracket selecionando exatamente 2 vencedores THEN the system SHALL marcar a partida como `COMPLETED`, avançar os 2 vencedores para a próxima rodada da Winners Bracket (ou para a Grande Final se for a Final da Winners) e enviar os 2 perdedores para a partida correspondente da Losers Bracket.
2. WHEN o organizador registra o resultado de uma partida pronta (`READY`) da Losers Bracket selecionando exatamente 2 vencedores THEN the system SHALL marcar a partida como `COMPLETED`, avançar os 2 vencedores para a próxima rodada da Losers Bracket (ou para a Grande Final se for a Final da Losers) e marcar os 2 perdedores como `ELIMINATED`.
3. WHILE uma partida possuir participantes `BOT/BYE`, the system SHALL impedir que um `BOT/BYE` seja selecionado como vencedor no lugar de um jogador humano e resolver automaticamente o avanço humano caso a partida contenha no máximo 2 jogadores humanos.
4. IF o organizador tentar registrar um resultado selecionando quantidade diferente de 2 vencedores ou para uma partida que ainda não possui os 4 participantes definidos THEN the system SHALL rejeitar a operação com status HTTP `400`.
5. WHEN os 2 finalistas da Winners Bracket e os 2 finalistas da Losers Bracket forem definidos THEN the system SHALL alterar o status do torneio para `GRAND_FINAL` e popular a arena da Grande Final com os 4 finalistas identificados por sua chave de origem (`WINNERS` com meta de 3 vitórias e `LOSERS` com meta de 6 vitórias).

**Independent Test**: Executar todas as partidas da Winners e da Losers de um torneio de 16 jogadores selecionando 2 vencedores por jogo e verificar que exatamente 2 jogadores invictos da Winners e 2 sobreviventes da Losers chegam à Grande Final, enquanto os outros 12 ficam marcados como eliminados.

---

### P1: Grande Final com Handicap (3 vs 6 Vitórias) e Coroação do Campeão ⭐ MVP

**User Story**: Como organizador do torneio, quero registrar cada vitória de mapa (rodada) na Grande Final para que o sistema aplique a vantagem da Winners Bracket (meta de 3 vitórias) sobre a Losers Bracket (meta de 6 vitórias) e declare o Campeão automaticamente ao atingir a meta.

**Why P1**: A regra de handicap na Grande Final é obrigatória para concluir o torneio e determinar o campeão.

**Acceptance Criteria**:

1. WHILE o torneio estiver no estado `GRAND_FINAL`, the system SHALL exibir os 4 finalistas na arena da Grande Final indicando para cada um sua origem (`Winners Bracket` ou `Losers Bracket`), vitórias atuais e meta necessária (`3` para origem Winners, `6` para origem Losers).
2. WHEN o organizador registrar uma vitória de rodada (+1 mapa) para um dos 4 finalistas na Grande Final THEN the system SHALL incrementar o contador de vitórias daquele finalista e registrar a rodada no histórico da Grande Final.
3. WHEN um finalista originário da Winners Bracket atingir `3` vitórias na Grande Final THEN the system SHALL encerrar o torneio imediatamente com status `COMPLETED` e declarar esse jogador como Campeão.
4. WHEN um finalista originário da Losers Bracket atingir `6` vitórias na Grande Final THEN the system SHALL encerrar o torneio imediatamente com status `COMPLETED` (reset de chave concluído) e declarar esse jogador como Campeão.
5. WHILE o torneio estiver em `GRAND_FINAL` ou `COMPLETED`, WHEN o organizador acionar a opção de desfazer a última rodada da Grande Final THEN the system SHALL decrementar a vitória registrada e, caso o torneio estivesse `COMPLETED`, reverter o status para `GRAND_FINAL`.

**Independent Test**: Na Grande Final, testar (a) um jogador da Winners atingindo 3 vitórias e sendo coroado campeão, e (b) após desfazer, um jogador da Losers precisando chegar a 6 vitórias (não encerrando com 3, 4 ou 5) para ser coroado campeão.

---

### P2: Correção de Partidas (Undo), Gestão de Múltiplos Torneios e Interface Temática Bomberman

**User Story**: Como organizador do torneio, quero alternar entre múltiplos torneios salvos em arquivos de texto, desfazer resultados de partidas lançados por engano e visualizar o torneio em um front-end temático do jogo Bomberman.

**Why P2**: Garante segurança operacional contra cliques acidentais, histórico de torneios e a identidade visual exigida pelo usuário.

**Acceptance Criteria**:

1. WHEN o organizador solicitar a listagem ou exclusão de torneios THEN the system SHALL ler ou remover o respectivo arquivo `.json` em `data/tournaments/` refletindo imediatamente na interface.
2. WHEN o organizador solicitar desfazer (`undo`) o resultado de uma partida `COMPLETED` da Winners ou Losers cujas partidas de destino na rodada seguinte ainda não foram concluídas THEN the system SHALL remover os jogadores avançados/rebaixados dos slots de destino, restaurar o status da partida para `READY` e persistir o estado em disco.
3. IF o organizador tentar desfazer o resultado de uma partida cujos jogadores já disputaram e concluíram uma partida subsequente THEN the system SHALL rejeitar a operação com status HTTP `409` informando que a partida dependente precisa ser desfeita primeiro.
4. The system SHALL apresentar uma interface web responsiva com tema visual de Bomberman contendo tipografia estilo arcade/pixel, paleta de cores clássica de Bomberman, ícones/sprites SVG de bombas, blocos e troféu, e visualização clara da Winners Bracket, Losers Bracket, Grande Final e Status dos Jogadores.

**Independent Test**: Concluir uma partida da Rodada 1, desfazer seu resultado e confirmar que os jogadores saem da Rodada 2/Losers e a partida volta para `READY`; tentar desfazer uma partida da Rodada 1 após concluir a Rodada 2 e verificar o bloqueio `409`.

---

## Edge Cases

- IF um arquivo de torneio for salvo em disco THEN the system SHALL gravar primeiro em um arquivo temporário (`.tmp`) e renomear atomicamente para evitar corrupção em caso de falha parcial.
- IF o usuário informar um ID de torneio ou partida inexistente na API THEN the system SHALL retornar status HTTP `404` com mensagem JSON padronizada.
- WHEN um torneio tiver 20, 24 ou 28 jogadores humanos (não potência de 2) THEN the system SHALL distribuir os participantes `BOT/BYE` na Rodada 1 de modo que `BOT/BYE` sempre ocupem as últimas posições de cada partida e sejam automaticamente considerados os primeiros eliminados.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TOURN-01 | P1: Criação de Torneio, Cadastro de Jogadores e Seeding | Execute | Implementing |
| TOURN-02 | P1: Criação de Torneio, Cadastro de Jogadores e Seeding | Execute | Verified |
| TOURN-03 | P1: Criação de Torneio, Cadastro de Jogadores e Seeding | Execute | Verified |
| TOURN-04 | P1: Criação de Torneio, Cadastro de Jogadores e Seeding | Execute | Verified |
| TOURN-05 | P1: Criação de Torneio, Cadastro de Jogadores e Seeding | Execute | Verified |
| TOURN-06 | P1: Criação de Torneio, Cadastro de Jogadores e Seeding | Execute | Verified |
| BRACK-01 | P1: Progressão das Chaves Winners e Losers | Execute | Verified |
| BRACK-02 | P1: Progressão das Chaves Winners e Losers | Execute | Verified |
| BRACK-03 | P1: Progressão das Chaves Winners e Losers | Execute | Verified |
| BRACK-04 | P1: Progressão das Chaves Winners e Losers | Execute | Verified |
| BRACK-05 | P1: Progressão das Chaves Winners e Losers | Execute | Verified |
| FINAL-01 | P1: Grande Final com Handicap (3 vs 6 Vitórias) | Execute | Verified |
| FINAL-02 | P1: Grande Final com Handicap (3 vs 6 Vitórias) | Execute | Verified |
| FINAL-03 | P1: Grande Final com Handicap (3 vs 6 Vitórias) | Execute | Verified |
| FINAL-04 | P1: Grande Final com Handicap (3 vs 6 Vitórias) | Execute | Verified |
| FINAL-05 | P1: Grande Final com Handicap (3 vs 6 Vitórias) | Execute | Verified |
| MGMT-01 | P2: Correção de Partidas (Undo), Múltiplos Torneios e UI | Tasks | In Tasks |
| MGMT-02 | P2: Correção de Partidas (Undo), Múltiplos Torneios e UI | Execute | Verified |
| MGMT-03 | P2: Correção de Partidas (Undo), Múltiplos Torneios e UI | Execute | Verified |
| MGMT-04 | P2: Correção de Partidas (Undo), Múltiplos Torneios e UI | Tasks | In Tasks |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 20 total, 20 mapped to tasks, 0 unmapped ✅

---

## Sources

- Regulamento Oficial fornecido pelo usuário no chat - Define regras da Winners Bracket, Losers Bracket e Grande Final com handicap (3 vs 6 vitórias).
- Respostas de alinhamento do usuário (`context.md`) - Define suporte a múltiplos de 4 com `BOT/BYE`, seleção direta de 2 sobreviventes, seeding manual/aleatório com avatares de Bomberman e múltiplos torneios em arquivos texto com opção de desfazer.

---

## Success Criteria

How we know the feature is successful:

- [ ] Torneios com 16, 20, 24, 28 ou 32 jogadores avançam do estado `DRAFT` até `COMPLETED` com 100% das regras de Winners, Losers e Grande Final (3 vs 6 vitórias) validadas por testes automatizados.
- [ ] Todos os dados de torneios persistem em arquivos simples de texto (`.json`) e sobrevivem ao reinício do servidor Node.js sem perda de estado.
- [ ] A interface web apresenta visual temático de Bomberman (fontes arcade, cores e ícones dos personagens/bombas) e permite operar todo o ciclo do torneio pelo navegador.

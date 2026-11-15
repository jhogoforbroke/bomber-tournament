# Bomber Tournament Manager Context

**Gathered:** 2026-11-15
**Spec:** `.specs/features/bomber-tournament/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Sistema web em Node.js com persistência em arquivos de texto (JSON) e interface temática de Bomberman para criação e gerenciamento completo de torneios de Bomberman no formato Dupla Eliminação de 4 jogadores por partida (Winners Bracket, Losers Bracket e Grande Final com handicap de 3 vs 6 vitórias).

---

## Implementation Decisions

### 1. Expansão do número de jogadores

- User answer: `"Qualquer múltiplo de 4 (16, 20, 24, 28, 32...) preenchendo vagas restantes nas chaves com 'Byes' (avanço automático) ou Bots/CPU"`
- O torneio aceita qualquer quantidade de jogadores humanos que seja múltiplo de 4 a partir de 16 (ex.: 16, 20, 24, 28, 32, até 64).
- Quando o número de inscritos não for uma potência de 2 exata (ex.: 20, 24, 28), o chaveamento é dimensionado para a próxima potência de 2 (ex.: 32 vagas) preenchendo as vagas excedentes com participantes `BOT/BYE` (CPU/folga), distribuídos uniformemente na Rodada 1 para garantir que todas as partidas da Winners e da Losers tenham sempre 4 participantes e que `BOT/BYE` sejam sempre eliminados antes de jogadores humanos.

### 2. Registro de resultados das partidas

- User answer: `"(Recommended) Seleção direta dos 2 vencedores na Winners/Losers (os outros 2 caem/saem automaticamente) e contador de vitórias individual (+1 por mapa vencido, meta 3 ou 6) na Grande Final"`
- Nas partidas da Winners Bracket e da Losers Bracket, o operador seleciona diretamente os 2 sobreviventes (vencedores) entre os 4 jogadores da arena; os outros 2 são automaticamente marcados como perdedores (caindo para a Losers ou sendo eliminados).
- Na Grande Final, cada um dos 4 finalistas possui um contador individual de mapas vencidos (+1/-1 por rodada), encerrando o torneio assim que um finalista vindo da Winners atingir 3 vitórias ou um finalista vindo da Losers atingir 6 vitórias.

### 3. Cadastro de jogadores e formação inicial das chaves (Seeding)

- User answer: `"(Recommended) Permitir tanto sorteio aleatório (shuffle) quanto ordenação manual antes de iniciar, com escolha de avatar/cor clássica do Bomberman para cada jogador"`
- Cada jogador cadastrado possui nome e avatar/cor clássica do Bomberman (White, Black, Red, Blue, Green, Yellow, Pink, Aqua).
- Antes de iniciar o torneio (`DRAFT`), o operador pode embaralhar aleatoriamente (shuffle) ou reordenar manualmente a lista de jogadores para definir as arenas da Rodada 1.

### 4. Gestão de torneios e correção de erros

- User answer: `"(Recommended) Múltiplos torneios salvos em arquivos JSON/texto (criar, listar, carregar e excluir), com opção de desfazer/corrigir resultado de partida caso ainda não tenha avançado a rodada seguinte"`
- Múltiplos torneios são persistidos em arquivos de texto estruturados (`.json`) no diretório de dados, permitindo criar, listar, abrir e excluir torneios.
- Uma partida concluída da Winners ou Losers pode ser reaberta/desfeita enquanto as partidas dependentes na rodada seguinte ainda não tiverem resultado registrado.

### Agent's Discretion

- Estrutura exata dos componentes visuais inspirados em Super Bomberman (sprites/SVGs de bombas, blocos destrutíveis, troféu, tipografia arcade pixelada) e organização das abas/painéis da tela.
- Formato interno dos arquivos de texto `.json` em disco e rotas REST da API Node.js.

### Declined / Undiscussed Gray Areas → Assumptions

- Limite superior prático de 64 jogadores por torneio registrado como premissa explícita na especificação para manter visualização de chaves legível.

---

## Specific References

- Franquia clássica *Bomberman / Super Bomberman* (cores dos personagens Bomberman, ícones de bomba, blocos de arena, estilo arcade retrô com fontes pixeladas).

---

## Deferred Ideas

None - discussion stayed within feature scope

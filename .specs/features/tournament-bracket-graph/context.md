# Tournament Bracket Graph & Podium Export Context

**Gathered:** 2026-11-15
**Spec:** `.specs/features/tournament-bracket-graph/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Adicionar uma nova aba de acompanhamento visual do torneio em formato de gráfico de chaveamento (conectando Winners Bracket, Losers Bracket e Grande Final), exibir em destaque o pódio de 1º, 2º, 3º e 4º lugar ao concluir o torneio e permitir baixar uma imagem PNG completa do torneio com o pódio em destaque.

---

## Implementation Decisions

### Critério de Classificação de 1º, 2º, 3º e 4º Lugar (Pódio da Grande Final)

- Escolha do usuário: `"Total absoluto de vitórias (wins) na Grande Final, desempatando por origem (Winners > Losers) e Seed inicial"`
- O 1º lugar é o campeão (`championId`) que atingiu sua meta de vitórias (`targetWins`: 3 para Winners, 6 para Losers).
- Os 3 demais finalistas da Grande Final ocupam o 2º, 3º e 4º lugares ordenados por:
  1. Maior número absoluto de vitórias (`wins`) na Grande Final;
  2. Origem na chave (`WINNERS` tem prioridade sobre `LOSERS`);
  3. Menor número de `seed` inicial (`player.seed` ascendente).

### Comportamento e Escopo da Aba de Gráfico de Chaveamento

- Escolha do usuário: `"(Recommended) Somente visualização em tempo real (Winners + Losers + Grande Final conectados com linhas e Pódio Top 4) + exportação de imagem"`
- A nova aba (`data-tab="bracket-graph"`, seção `#bracket-graph-section`) é focada em acompanhamento visual panorâmico sem controles de edição de partidas.
- Mostra todas as rodadas da Winners Bracket, todas as rodadas da Losers Bracket e a Arena da Grande Final conectadas visualmente, atualizando automaticamente conforme as partidas avançam ou são desfeitas.

### Exportação da Imagem do Torneio e Destaque do Top 4

- Escolha do usuário: `"(Recommended) PNG gerado no navegador (tema Arcade Bomberman), habilitado apenas quando o torneio é concluído (COMPLETED) com o Pódio 1º ao 4º em destaque"`
- O botão de download (`#download-bracket-image-btn`) permanece desabilitado enquanto o torneio estiver em `DRAFT`, `IN_PROGRESS` ou `GRAND_FINAL`, e é habilitado quando `status === 'COMPLETED'`.
- A imagem PNG gerada no cliente (sem dependências externas) inclui o cabeçalho do torneio, o bloco em destaque com os nomes e cores dos participantes em 1º, 2º, 3º e 4º lugar, e o gráfico completo das chaves (Winners, Losers e Grande Final).

### Agent's Discretion

- Estilização visual das linhas conectoras e cartões compactos dentro do tema Arcade Bomberman existente (`styles.css`).
- Nome do arquivo PNG gerado a partir do nome do torneio (ex.: `<slug-do-torneio>-chaveamento.png`).

### Declined / Undiscussed Gray Areas → Assumptions

- Nenhuma área recusada; todas as decisões de produto foram respondidas pelo usuário.

---

## Specific References

- Seguir o tema visual Super Bomberman Arcade existente em `public/index.html` e `public/styles.css` (fontes `Press Start 2P`, `VT323`, `Chakra Petch` e paleta das 8 cores de Bomberman).

---

## Deferred Ideas

- None - discussion stayed within feature scope.

# 💣 Bomber Tournament Manager

Gerenciador completo de torneios de **Bomberman** para **4 jogadores por partida (Free-For-All / Battle Royal)** em formato de **Dupla Eliminação (Winners Bracket + Losers Bracket)** e **Grande Final com Handicap**, com interface web temática arcade e persistência atômica em arquivos JSON.

---

## 📋 Visão Geral

Organizar campeonatos presenciais ou online de Bomberman (16 a 64 jogadores) com partidas de 4 jogadores exige controle rigoroso de quem avança na **Winners Bracket**, quem cai de forma cruzada para a **Losers Bracket**, quem é eliminado e como funciona a vantagem (*handicap*) na **Grande Final**.

O **Bomber Tournament Manager** automatiza 100% da matemática das chaves, preenchimento inteligente de vagas com `BOT/BYE`, progressão e reversão segura de resultados (*Undo*), além de oferecer um painel visual imersivo inspirado nos clássicos de Bomberman.

---

## ✨ Principais Funcionalidades

### 1. Gestão de Múltiplos Torneios e Persistência Atômica
- Criação, listagem, carregamento e exclusão de múltiplos torneios simultâneos.
- Persistência automática em arquivos JSON individuais na pasta `data/tournaments/<id>.json`.
- **Escrita atômica e serializada**: grava primeiro em um arquivo temporário (`.tmp`) e executa `rename` atômico, evitando corrupção de dados mesmo em requisições concorrentes.

### 2. Cadastro de Jogadores, Avatares e Seeding (`DRAFT`)
- Cadastro individual ou em lote de jogadores com validação de nomes únicos (case-insensitive).
- Escolha entre as **8 cores clássicas de Bomberman**:
  - ⚪ `white` (Shirobon)
  - ⚫ `black` (Kurobon)
  - 🔴 `red` (Akabon)
  - 🔵 `blue` (Aobon)
  - 🟢 `green` (Midoribon)
  - 🟡 `yellow` (Kiirobon)
  - 🩷 `pink` (Momobon)
  - 🩵 `aqua` (Mizubon)
- **Seeding flexível**: embaralhamento aleatório (*Shuffle* via algoritmo Fisher-Yates) ou reordenação manual da lista antes do início do torneio.

### 3. Suporte a 16 até 64 Jogadores e Balanceamento com `BOT/BYE`
- Aceita qualquer quantidade de jogadores humanos $N$ entre **16 e 64** que seja **múltiplo de 4** ($16, 20, 24, 28, 32, \dots, 64$).
- Quando $N$ não é uma potência exata de 2 ($16, 32, 64$), o sistema expande automaticamente o chaveamento para a próxima potência de 2 ($P \in \{16, 32, 64\}$) completando os slots restantes com participantes `BOT/BYE`.
- **Distribuição inteligente na Rodada 1**: os `BOT/BYE` são distribuídos de forma equilibrada entre as arenas da Rodada 1 (no máximo 2 `BOT/BYE` por partida), garantindo que os jogadores humanos avancem sem distorcer o chaveamento.
- Partidas que contenham apenas $\le 2$ jogadores humanos contra `BOT/BYE` têm seu avanço resolvido automaticamente.

### 4. Dupla Eliminação de 4 Jogadores (Winners & Losers Bracket)
- **Arenas de 4 jogadores**: em cada partida pronta (`READY`), o organizador seleciona os **2 sobreviventes (vencedores)**.
- **Winners Bracket**:
  - Os **2 vencedores** avançam para a próxima rodada da Winners Bracket (ou para a Grande Final, no caso da Final da Winners).
  - Os **2 perdedores** caem automaticamente para a rodada correspondente da **Losers Bracket**.
- **Losers Bracket**:
  - Combina sobreviventes da própria Losers com os jogadores recém-caídos da Winners em estágios intercalados (*drop-in* e *consolidação*).
  - Os **2 vencedores** avançam na Losers Bracket (ou para a Grande Final, no caso da Final da Losers).
  - Os **2 perdedores** são marcados definitivamente como `ELIMINATED`.

### 5. Correção Segura de Partidas (*Undo* em Cascata)
- Qualquer partida concluída (`COMPLETED`) da Winners ou Losers pode ser **desfeita** (`undo`), restaurando seu status para `READY` e removendo os jogadores avançados/rebaixados dos slots seguintes.
- **Proteção de integridade (`409 Conflict`)**: o sistema bloqueia a reversão caso alguma partida subsequente para a qual aqueles jogadores avançaram já tenha sido concluída, exigindo que a partida dependente seja desfeita primeiro.

### 6. Grande Final com Handicap (3 vs 6 Vitórias)
- Assim que os **2 finalistas da Winners** e os **2 finalistas da Losers** são definidos, o torneio entra no estágio `GRAND_FINAL`.
- Os 4 finalistas disputam mapas sucessivos na arena final com metas distintas de vitórias (*handicap*):
  - 🏆 **Origem Winners Bracket**: precisa de **3 vitórias** de mapa para ser coroado Campeão.
  - 🔥 **Origem Losers Bracket**: precisa de **6 vitórias** de mapa para ser coroado Campeão.
- Controle de histórico de rodadas da Grande Final com botão de **+1 Vitória** por finalista e opção de **Desfazer última rodada** (inclusive revertendo o status `COMPLETED` para `GRAND_FINAL` se necessário).

### 7. Interface Web Temática Arcade Bomberman
- SPA responsiva em HTML5, CSS3 e JavaScript ES Modules puro (sem necessidade de *build step* ou bundlers).
- Estética retrô arcade com sprites SVG customizados (bombas, blocos, avatares coloridos de Bomberman e troféu), painel lateral de status ao vivo de todos os jogadores (`ACTIVE_WINNERS`, `ACTIVE_LOSERS`, `FINALIST`, `CHAMPION`, `ELIMINATED`) e visualização completa das chaves.

---

## 🏗️ Arquitetura e Estrutura do Projeto

```text
bomber-tournament/
├── data/
│   └── tournaments/               # Arquivos JSON de persistência dos torneios (ignorado pelo Git)
├── public/                        # Front-end SPA temático Bomberman
│   ├── index.html                 # Estrutura principal da interface e templates SVG
│   ├── styles.css                 # Tema visual Arcade/Pixel Bomberman
│   └── app.js                     # Cliente HTTP, estado da UI e renderização das chaves
├── src/
│   ├── domain/                    # Regras de negócio puras (sem dependências de I/O)
│   │   ├── tournament.js          # Criação de torneio, cadastro de jogadores, cores, shuffle e validações
│   │   ├── bracket.js             # Geração do DAG de chaves (16/32/64), progressão Winners/Losers, BYEs e Undo
│   │   └── grand-final.js         # Lógica da Grande Final (handicap 3 vs 6 vitórias, histórico e reversão)
│   ├── storage/
│   │   └── file-repository.js     # Repositório JSON com fila de escrita serializada e rename atômico (.tmp -> .json)
│   └── server/
│       ├── index.js               # Ponto de entrada HTTP (porta padrão 3000)
│       ├── app.js                 # Configuração do Express e rotas de torneios/jogadores
│       └── routes-matches.js      # Rotas de resultados de partidas, Undo e Grande Final
├── tests/
│   ├── unit/                      # Testes unitários de domínio (tournament, bracket, grand-final)
│   └── integration/               # Testes de integração (API REST, persistência atômica e fluxo completo)
├── package.json
└── README.md
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- **Node.js** `>= 18.x` (recomendado `20.x` ou superior, pois utiliza o *test runner* nativo `node --test`).
- **npm** para instalação do `express`.

### 1. Instalar dependências

```bash
npm install
```

### 2. Iniciar o servidor

```bash
npm start
```

Por padrão, o servidor sobe na porta `3000`:
- Acesse no navegador: **http://localhost:3000**
- Para usar outra porta, defina a variável de ambiente `PORT`:
  ```bash
  PORT=8080 npm start
  ```

### 3. Executar os testes automatizados

```bash
# Executar toda a suíte (unitários + integração)
npm test

# Executar apenas os testes unitários
npm run test:unit

# Executar apenas os testes de integração
npm run test:integration
```

---

## 🔌 Documentação da API REST

Todas as rotas da API recebem e retornam JSON (`application/json`). Em caso de erro, o servidor responde com o formato padronizado:

```json
{
  "error": "ValidationError | ConflictError | NotFoundError",
  "message": "Descrição detalhada do motivo do erro."
}
```

### Torneios e Jogadores

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/tournaments` | Lista o resumo de todos os torneios salvos em `data/tournaments/`, ordenados por atualização mais recente. |
| `POST` | `/api/tournaments` | Cria um novo torneio no estado `DRAFT`. Corpo: `{ "name": "Copa Bomberman" }`. |
| `GET` | `/api/tournaments/:id` | Retorna o documento completo de um torneio (jogadores, chaves, partidas e Grande Final). |
| `DELETE` | `/api/tournaments/:id` | Remove o arquivo `.json` do torneio do disco. |
| `POST` | `/api/tournaments/:id/players` | Adiciona um jogador (`{ "name": "Shiro", "color": "white" }`) ou um lote (`{ "players": [...] }`) enquanto em `DRAFT`. |
| `DELETE` | `/api/tournaments/:id/players/:playerId` | Remove um jogador de um torneio em `DRAFT` e reindexa os seeds. |
| `PUT` | `/api/tournaments/:id/players/order` | Reordena manualmente os jogadores em `DRAFT`. Corpo: `{ "playerIds": ["p1", "p2", ...] }`. |
| `POST` | `/api/tournaments/:id/shuffle` | Embaralha aleatoriamente a ordem (seeding) dos jogadores em `DRAFT`. |
| `POST` | `/api/tournaments/:id/start` | Valida a quantidade de jogadores ($16 \le N \le 64$, $N \bmod 4 = 0$), preenche `BOT/BYE` se necessário, gera todas as chaves e muda o status para `IN_PROGRESS`. |

### Partidas e Grande Final

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/tournaments/:id/matches/:matchId/result` | Registra os 2 vencedores de uma partida `READY` da Winners ou Losers. Corpo: `{ "winnerIds": ["p1", "p2"] }`. |
| `POST` | `/api/tournaments/:id/matches/:matchId/undo` | Desfaz o resultado de uma partida `COMPLETED`, desde que as partidas de destino subsequentes ainda não estejam concluídas. |
| `POST` | `/api/tournaments/:id/grand-final/win` | Registra `+1` vitória de mapa para um finalista na Grande Final. Corpo: `{ "playerId": "p1" }`. Coroa o campeão automaticamente ao atingir a meta (`3` para Winners, `6` para Losers). |
| `POST` | `/api/tournaments/:id/grand-final/undo` | Desfaz a última vitória registrada no histórico da Grande Final (revertendo também o título de campeão caso a última rodada tenha encerrado o torneio). |

---

## 💾 Persistência de Dados

- Todos os torneios são gravados em formato JSON legível (indentado com 2 espaços) dentro de:
  ```text
  data/tournaments/<id-do-torneio>.json
  ```
- O caminho é resolvido diretamente a partir da estrutura interna do projeto (`src/storage/file-repository.js`), garantindo que os arquivos fiquem sempre dentro de `bomber-tournament/data/tournaments`, independentemente do diretório de onde o processo Node foi iniciado.
- A pasta `data/` está configurada no `.gitignore` para que os dados locais dos torneios não sejam comitados acidentalmente no repositório.

---

## 📄 Licença

Distribuído sob a licença **GNU General Public License v3.0 (GPL-3.0)**. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

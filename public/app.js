const DEFAULT_BOMBER_NAMES = [
  'Shirobon',
  'Kurobon',
  'Akabon',
  'Aobon',
  'Midoribon',
  'Kiirobon',
  'Momobon',
  'Mizubon',
  'Max',
  'Pretty Bomber',
  'Plasma Bomber',
  'Magnet Bomber',
  'Golem Bomber',
  'Phantom Bomber',
  'Bagura',
  'Mujoe',
  'Hige Hige',
  'Mechadoc',
  'Altair',
  'Regulus',
  'Sirius',
  'Artemis',
  'Orion',
  'Pegasus'
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPlayerMap(tournament) {
  const map = new Map();
  if (tournament && Array.isArray(tournament.players)) {
    for (const p of tournament.players) {
      map.set(p.id, p);
    }
  }
  return map;
}

export function renderSeedingHtml(tournament) {
  if (!tournament) {
    return '<p class="helper-text">Selecione ou crie um torneio na barra lateral para cadastrar jogadores.</p>';
  }
  const humans = (tournament.players || []).filter((p) => !p.isBot);
  if (humans.length === 0) {
    return '<p class="helper-text">Nenhum jogador inscrito ainda. Adicione individualmente ou use os botões de preenchimento rápido.</p>';
  }

  const isDraft = tournament.status === 'DRAFT';

  return humans
    .map(
      (player, idx) => `
      <div class="seed-card" data-player-id="${escapeHtml(player.id)}">
        <div class="seed-player-info">
          <span class="seed-number">#${idx + 1}</span>
          <svg class="bomber-avatar"><use href="#sprite-bomber-${escapeHtml(player.color || 'white')}" /></svg>
          <div>
            <div class="tournament-item-title">${escapeHtml(player.name)}</div>
            <div class="tournament-item-meta">${escapeHtml(player.color?.toUpperCase() || 'WHITE')}</div>
          </div>
        </div>
        ${
          isDraft
            ? `<div class="seed-actions">
                <button type="button" class="icon-btn" data-action="move-up" data-player-id="${escapeHtml(player.id)}" ${idx === 0 ? 'disabled' : ''} title="Subir seed">▲</button>
                <button type="button" class="icon-btn" data-action="move-down" data-player-id="${escapeHtml(player.id)}" ${idx === humans.length - 1 ? 'disabled' : ''} title="Descer seed">▼</button>
                <button type="button" class="icon-btn btn-danger" data-action="remove-player" data-player-id="${escapeHtml(player.id)}" title="Remover jogador">✕</button>
              </div>`
            : ''
        }
      </div>
    `
    )
    .join('');
}

export function renderBracketHtml(tournament, bracketKey = 'winners', matchSelections = {}) {
  if (!tournament || !tournament.brackets) {
    return '<p class="helper-text">Inicie o torneio para visualizar as chaves.</p>';
  }
  const rounds = tournament.brackets[bracketKey] || [];
  if (rounds.length === 0) {
    return '<p class="helper-text">As chaves serão geradas assim que o torneio for iniciado.</p>';
  }

  const playersById = getPlayerMap(tournament);

  return rounds
    .map((round) => {
      const matchesHtml = round.matches
        .map((match) => {
          const selected = matchSelections[match.id] || [];
          const isReady = match.status === 'READY';
          const isCompleted = match.status === 'COMPLETED';

          const slotsHtml = match.slots
            .map((playerId, slotIndex) => {
              const player = playerId ? playersById.get(playerId) : null;
              if (!player) {
                return `
                  <div class="slot-row">
                    <span class="tournament-item-meta">Slot ${slotIndex + 1}: Aguardando definição...</span>
                  </div>
                `;
              }
              const isWinner = isCompleted && match.winnerIds.includes(player.id);
              const isLoser = isCompleted && match.loserIds.includes(player.id);
              const isChecked = selected.includes(player.id);
              const canSelect = isReady && !player.isBot;

              return `
                <div class="slot-row ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}">
                  <label class="slot-label">
                    ${
                      canSelect
                        ? `<input type="checkbox" data-action="toggle-winner" data-match-id="${escapeHtml(match.id)}" data-player-id="${escapeHtml(player.id)}" ${isChecked ? 'checked' : ''} />`
                        : ''
                    }
                    <svg class="bomber-avatar"><use href="#sprite-bomber-${escapeHtml(player.color || 'white')}" /></svg>
                    <span>${escapeHtml(player.name)}</span>
                  </label>
                  <span class="tournament-item-meta">
                    ${isWinner ? '★ AVANÇOU' : isLoser ? (match.bracket === 'WINNERS' ? '↓ LOSERS' : '✕ ELIMINADO') : player.isBot ? 'BOT/BYE' : `Seed #${player.seed}`}
                  </span>
                </div>
              `;
            })
            .join('');

          return `
            <article class="match-card status-${escapeHtml(match.status)}" data-match-id="${escapeHtml(match.id)}">
              <div class="match-header">
                <span>${escapeHtml(match.id)}</span>
                <span>${escapeHtml(match.status)}</span>
              </div>
              <div class="match-slots">
                ${slotsHtml}
              </div>
              <div class="match-actions">
                ${
                  isReady
                    ? `<button type="button" class="btn btn-accent" data-action="submit-match" data-match-id="${escapeHtml(match.id)}" ${selected.length !== 2 ? 'disabled' : ''}>
                        CONFIRMAR 2 VENCEDORES (${selected.length}/2)
                      </button>`
                    : ''
                }
                ${
                  isCompleted
                    ? `<button type="button" class="btn btn-warning" data-action="undo-match" data-match-id="${escapeHtml(match.id)}">
                        DESFAZER PARTIDA
                      </button>`
                    : ''
                }
              </div>
            </article>
          `;
        })
        .join('');

      return `
        <div class="bracket-round">
          <h3 class="round-title">${escapeHtml(round.name)}</h3>
          ${matchesHtml}
        </div>
      `;
    })
    .join('');
}

export function renderGrandFinalHtml(tournament) {
  if (!tournament || !tournament.grandFinal || tournament.grandFinal.finalists.length === 0) {
    return '<p class="helper-text">A Grande Final será liberada automaticamente quando os 2 finalistas da Winners e os 2 finalistas da Losers forem definidos.</p>';
  }

  const playersById = getPlayerMap(tournament);
  const canRecordWin = tournament.status === 'GRAND_FINAL';

  return tournament.grandFinal.finalists
    .map((finalist) => {
      const player = playersById.get(finalist.playerId);
      const isChampion = tournament.championId === finalist.playerId;
      const pips = [];
      for (let i = 1; i <= finalist.targetWins; i++) {
        const filled = i <= finalist.wins;
        pips.push(
          `<span class="win-pip ${filled ? 'filled' : ''}" title="Mapa ${i}/${finalist.targetWins}">${filled ? '💣' : ''}</span>`
        );
      }

      return `
        <article class="finalist-card origin-${escapeHtml(finalist.origin)} ${isChampion ? 'is-champion' : ''}" data-finalist-id="${escapeHtml(finalist.playerId)}">
          <div class="section-header-bar">
            <div class="seed-player-info">
              <svg class="hud-icon"><use href="#sprite-bomber-${escapeHtml(player?.color || 'white')}" /></svg>
              <div>
                <div class="tournament-item-title">${escapeHtml(player?.name || finalist.playerId)}</div>
                <span class="origin-badge">ORIGEM: ${finalist.origin === 'WINNERS' ? 'WINNERS BRACKET' : 'LOSERS BRACKET'}</span>
              </div>
            </div>
            ${isChampion ? '<svg class="hud-icon"><use href="#sprite-trophy" /></svg>' : ''}
          </div>

          <div>
            <div class="tournament-item-meta">META: ${finalist.targetWins} VITÓRIAS • PLACAR ATUAL: ${finalist.wins} / ${finalist.targetWins}</div>
            <div class="win-pip-bar" style="margin-top: 0.5rem;">
              ${pips.join('')}
            </div>
          </div>

          ${
            canRecordWin
              ? `<button type="button" class="btn btn-fire" data-action="gf-win" data-player-id="${escapeHtml(finalist.playerId)}">
                  +1 VITÓRIA DE MAPA
                </button>`
              : isChampion
                ? '<div class="status-badge">★ CAMPEÃO DO TORNEIO ★</div>'
                : ''
          }
        </article>
      `;
    })
    .join('');
}

export function renderPlayersStatusHtml(tournament) {
  if (!tournament || !Array.isArray(tournament.players) || tournament.players.length === 0) {
    return '<p class="helper-text">Nenhum participante registrado neste torneio.</p>';
  }

  const statusLabels = {
    ACTIVE: 'NA WINNERS BRACKET',
    LOSERS: 'NA LOSERS BRACKET',
    FINALIST_WINNERS: 'FINALISTA (WINNERS - META 3)',
    FINALIST_LOSERS: 'FINALISTA (LOSERS - META 6)',
    ELIMINATED: 'ELIMINADO',
    CHAMPION: '★ CAMPEÃO ★'
  };

  return tournament.players
    .map(
      (player) => `
      <div class="seed-card" data-status="${escapeHtml(player.status)}">
        <div class="seed-player-info">
          <svg class="bomber-avatar"><use href="#sprite-bomber-${escapeHtml(player.color || 'white')}" /></svg>
          <div>
            <div class="tournament-item-title">${escapeHtml(player.name)}</div>
            <div class="tournament-item-meta">${escapeHtml(statusLabels[player.status] || player.status)}</div>
          </div>
        </div>
        <span class="seed-number">#${player.seed}</span>
      </div>
    `
    )
    .join('');
}

export function createSpaStore({ baseUrl = '', fetchImpl = globalThis.fetch, onUpdate } = {}) {
  const state = {
    tournaments: [],
    activeTournament: null,
    activeTab: 'seeding',
    matchSelections: {},
    alert: null
  };

  function notify() {
    if (typeof onUpdate === 'function') {
      onUpdate(state);
    }
  }

  async function apiRequest(urlPath, options = {}) {
    const res = await fetchImpl(`${baseUrl}${urlPath}`, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.message || `Erro HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return data;
  }

  function setAlert(message, type = 'error') {
    state.alert = message ? { message, type } : null;
    notify();
  }

  async function refreshList() {
    state.tournaments = await apiRequest('/api/tournaments');
    notify();
    return state.tournaments;
  }

  async function selectTournament(id) {
    state.activeTournament = await apiRequest(`/api/tournaments/${id}`);
    state.matchSelections = {};
    if (state.activeTournament.status === 'DRAFT') {
      state.activeTab = 'seeding';
    } else if (state.activeTournament.status === 'IN_PROGRESS' && state.activeTab === 'seeding') {
      state.activeTab = 'winners';
    } else if (
      (state.activeTournament.status === 'GRAND_FINAL' ||
        state.activeTournament.status === 'COMPLETED') &&
      state.activeTab === 'seeding'
    ) {
      state.activeTab = 'grand-final';
    }
    await refreshList();
    notify();
    return state.activeTournament;
  }

  async function createTournament(name) {
    const created = await apiRequest('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    state.activeTournament = created;
    state.activeTab = 'seeding';
    state.matchSelections = {};
    await refreshList();
    setAlert(`Torneio "${created.name}" criado com sucesso!`, 'info');
    return created;
  }

  async function deleteTournament(id) {
    await apiRequest(`/api/tournaments/${id}`, { method: 'DELETE' });
    if (state.activeTournament?.id === id) {
      state.activeTournament = null;
      state.matchSelections = {};
    }
    await refreshList();
    setAlert('Torneio removido.', 'info');
  }

  async function addSinglePlayer(name) {
    if (!state.activeTournament) return null;
    state.activeTournament = await apiRequest(
      `/api/tournaments/${state.activeTournament.id}/players`,
      {
        method: 'POST',
        body: JSON.stringify({ name })
      }
    );
    await refreshList();
    notify();
    return state.activeTournament;
  }

  async function quickFillPlayers(targetCount = 16) {
    if (!state.activeTournament) return null;
    const existingHumans = state.activeTournament.players.filter((p) => !p.isBot);
    const existingNames = new Set(existingHumans.map((p) => p.name.toLowerCase()));
    const needed = Math.max(0, targetCount - existingHumans.length);
    if (needed === 0) return state.activeTournament;

    const batch = [];
    let index = 1;
    while (batch.length < needed) {
      const baseName = DEFAULT_BOMBER_NAMES[(existingHumans.length + batch.length) % DEFAULT_BOMBER_NAMES.length];
      const candidate = index === 1 && !existingNames.has(baseName.toLowerCase())
        ? baseName
        : `${baseName}_${existingHumans.length + batch.length + 1}`;
      if (!existingNames.has(candidate.toLowerCase())) {
        existingNames.add(candidate.toLowerCase());
        batch.push({
          name: candidate
        });
      }
      index++;
    }

    state.activeTournament = await apiRequest(
      `/api/tournaments/${state.activeTournament.id}/players`,
      {
        method: 'POST',
        body: JSON.stringify({ players: batch })
      }
    );
    await refreshList();
    notify();
    return state.activeTournament;
  }

  async function removePlayerById(playerId) {
    if (!state.activeTournament) return null;
    state.activeTournament = await apiRequest(
      `/api/tournaments/${state.activeTournament.id}/players/${playerId}`,
      { method: 'DELETE' }
    );
    await refreshList();
    notify();
    return state.activeTournament;
  }

  async function shuffleActivePlayers() {
    if (!state.activeTournament) return null;
    state.activeTournament = await apiRequest(
      `/api/tournaments/${state.activeTournament.id}/shuffle`,
      { method: 'POST' }
    );
    notify();
    return state.activeTournament;
  }

  async function movePlayer(playerId, direction) {
    if (!state.activeTournament) return null;
    const ids = state.activeTournament.players.filter((p) => !p.isBot).map((p) => p.id);
    const idx = ids.indexOf(playerId);
    const targetIdx = idx + direction;
    if (idx === -1 || targetIdx < 0 || targetIdx >= ids.length) {
      return state.activeTournament;
    }
    const swapped = [...ids];
    const [item] = swapped.splice(idx, 1);
    swapped.splice(targetIdx, 0, item);

    state.activeTournament = await apiRequest(
      `/api/tournaments/${state.activeTournament.id}/players/order`,
      {
        method: 'PUT',
        body: JSON.stringify({ playerIds: swapped })
      }
    );
    notify();
    return state.activeTournament;
  }

  async function startActiveTournament() {
    if (!state.activeTournament) return null;
    state.activeTournament = await apiRequest(
      `/api/tournaments/${state.activeTournament.id}/start`,
      { method: 'POST' }
    );
    state.activeTab = 'winners';
    await refreshList();
    setAlert('Torneio iniciado! Arenas de 4 jogadores geradas.', 'info');
    return state.activeTournament;
  }

  function toggleMatchWinner(matchId, playerId) {
    const current = state.matchSelections[matchId] ? [...state.matchSelections[matchId]] : [];
    const existingIdx = current.indexOf(playerId);
    if (existingIdx !== -1) {
      current.splice(existingIdx, 1);
    } else if (current.length < 2) {
      current.push(playerId);
    } else {
      current.shift();
      current.push(playerId);
    }
    state.matchSelections[matchId] = current;
    notify();
    return current;
  }

  function getSelectedWinners(matchId) {
    return state.matchSelections[matchId] || [];
  }

  async function submitMatchWinners(matchId) {
    if (!state.activeTournament) return null;
    const winnerIds = state.matchSelections[matchId] || [];
    state.activeTournament = await apiRequest(
      `/api/tournaments/${state.activeTournament.id}/matches/${matchId}/result`,
      {
        method: 'POST',
        body: JSON.stringify({ winnerIds })
      }
    );
    delete state.matchSelections[matchId];
    if (state.activeTournament.status === 'GRAND_FINAL') {
      state.activeTab = 'grand-final';
    }
    await refreshList();
    notify();
    return state.activeTournament;
  }

  async function undoMatch(matchId) {
    if (!state.activeTournament) return null;
    state.activeTournament = await apiRequest(
      `/api/tournaments/${state.activeTournament.id}/matches/${matchId}/undo`,
      { method: 'POST' }
    );
    await refreshList();
    notify();
    return state.activeTournament;
  }

  async function recordFinalistWin(playerId) {
    if (!state.activeTournament) return null;
    state.activeTournament = await apiRequest(
      `/api/tournaments/${state.activeTournament.id}/grand-final/win`,
      {
        method: 'POST',
        body: JSON.stringify({ playerId })
      }
    );
    await refreshList();
    notify();
    return state.activeTournament;
  }

  async function undoLastGrandFinalWin() {
    if (!state.activeTournament) return null;
    state.activeTournament = await apiRequest(
      `/api/tournaments/${state.activeTournament.id}/grand-final/undo`,
      { method: 'POST' }
    );
    await refreshList();
    notify();
    return state.activeTournament;
  }

  function setTab(tabName) {
    state.activeTab = tabName;
    notify();
  }

  return {
    getState: () => state,
    setAlert,
    refreshList,
    selectTournament,
    createTournament,
    deleteTournament,
    addSinglePlayer,
    quickFillPlayers,
    removePlayerById,
    shuffleActivePlayers,
    movePlayer,
    startActiveTournament,
    toggleMatchWinner,
    getSelectedWinners,
    submitMatchWinners,
    undoMatch,
    recordFinalistWin,
    undoLastGrandFinalWin,
    setTab
  };
}

export function mountDomApp(doc = globalThis.document) {
  if (!doc) return null;

  const els = {
    badge: doc.getElementById('active-tournament-badge'),
    alert: doc.getElementById('alert-banner'),
    createForm: doc.getElementById('create-tournament-form'),
    nameInput: doc.getElementById('tournament-name-input'),
    tournamentList: doc.getElementById('tournament-list'),
    championBanner: doc.getElementById('champion-banner'),
    phaseTabs: doc.getElementById('phase-tabs'),
    seedingSection: doc.getElementById('seeding-section'),
    winnersSection: doc.getElementById('winners-section'),
    losersSection: doc.getElementById('losers-section'),
    grandFinalSection: doc.getElementById('grand-final-section'),
    playersSection: doc.getElementById('players-section'),
    seedingCounter: doc.getElementById('seeding-counter'),
    addPlayerForm: doc.getElementById('add-player-form'),
    playerNameInput: doc.getElementById('player-name-input'),
    quickFill16Btn: doc.getElementById('quick-fill-16-btn'),
    quickFill20Btn: doc.getElementById('quick-fill-20-btn'),
    shuffleBtn: doc.getElementById('shuffle-players-btn'),
    startBtn: doc.getElementById('start-tournament-btn'),
    seedingList: doc.getElementById('seeding-players-list'),
    winnersContainer: doc.getElementById('winners-bracket-container'),
    losersContainer: doc.getElementById('losers-bracket-container'),
    grandFinalContainer: doc.getElementById('grand-final-container'),
    undoGrandFinalBtn: doc.getElementById('undo-grand-final-btn'),
    playersStatusContainer: doc.getElementById('players-status-container')
  };

  const store = createSpaStore({
    onUpdate: (state) => renderDom(state)
  });

  function renderDom(state) {
    const t = state.activeTournament;

    if (state.alert) {
      els.alert.textContent = state.alert.message;
      els.alert.className = `alert-banner ${state.alert.type === 'info' ? 'info' : ''}`;
    } else {
      els.alert.className = 'alert-banner hidden';
    }

    els.badge.textContent = t
      ? `${t.name} • [${t.status}]`
      : 'SELECIONE OU CRIE UM TORNEIO';

    // Sidebar tournament list
    els.tournamentList.innerHTML =
      state.tournaments.length === 0
        ? '<p class="helper-text">Nenhum torneio salvo.</p>'
        : state.tournaments
            .map(
              (item) => `
              <div class="tournament-item ${t?.id === item.id ? 'active' : ''}" data-action="select-tournament" data-id="${escapeHtml(item.id)}">
                <div>
                  <div class="tournament-item-title">${escapeHtml(item.name)}</div>
                  <div class="tournament-item-meta">${escapeHtml(item.status)} • ${item.playerCount} jogadores</div>
                </div>
                <button type="button" class="icon-btn btn-danger" data-action="delete-tournament" data-id="${escapeHtml(item.id)}" title="Excluir torneio">✕</button>
              </div>
            `
            )
            .join('');

    // Champion Banner
    if (t && t.status === 'COMPLETED' && t.championId) {
      const champ = t.players.find((p) => p.id === t.championId);
      els.championBanner.className = 'champion-banner';
      els.championBanner.innerHTML = `
        <div class="seed-player-info">
          <svg class="hud-icon"><use href="#sprite-trophy" /></svg>
          <div>
            <h2>CAMPEÃO SUPREMO: ${escapeHtml(champ?.name || t.championId)}</h2>
            <p class="arcade-subtitle">TORNEIO CONCLUÍDO COM SUCESSO!</p>
          </div>
        </div>
        <svg class="hud-icon"><use href="#sprite-bomber-${escapeHtml(champ?.color || 'white')}" /></svg>
      `;
    } else {
      els.championBanner.className = 'champion-banner hidden';
      els.championBanner.innerHTML = '';
    }

    // Active tab visibility
    const tabMap = {
      seeding: els.seedingSection,
      winners: els.winnersSection,
      losers: els.losersSection,
      'grand-final': els.grandFinalSection,
      players: els.playersSection
    };
    for (const [key, section] of Object.entries(tabMap)) {
      if (section) {
        section.classList.toggle('hidden', state.activeTab !== key);
      }
    }
    els.phaseTabs.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
    });

    // Seeding counter & controls state
    const humanCount = t ? t.players.filter((p) => !p.isBot).length : 0;
    els.seedingCounter.textContent = `${humanCount} JOGADORES (MÍN. 16 / MÚLT. DE 4)`;
    const isDraft = Boolean(t && t.status === 'DRAFT');
    els.quickFill16Btn.disabled = !isDraft;
    els.quickFill20Btn.disabled = !isDraft;
    els.shuffleBtn.disabled = !isDraft || humanCount < 2;
    els.startBtn.disabled = !isDraft || humanCount < 16 || humanCount > 64 || humanCount % 4 !== 0;

    els.seedingList.innerHTML = renderSeedingHtml(t);
    els.winnersContainer.innerHTML = renderBracketHtml(t, 'winners', state.matchSelections);
    els.losersContainer.innerHTML = renderBracketHtml(t, 'losers', state.matchSelections);
    els.grandFinalContainer.innerHTML = renderGrandFinalHtml(t);
    els.playersStatusContainer.innerHTML = renderPlayersStatusHtml(t);
    els.undoGrandFinalBtn.disabled = !t || (t.grandFinal?.history?.length || 0) === 0;
  }

  async function safeRun(fn) {
    try {
      store.setAlert(null);
      await fn();
    } catch (err) {
      store.setAlert(err.message || 'Erro na operação.', 'error');
    }
  }

  els.createForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = els.nameInput.value.trim();
    if (!name) return;
    safeRun(async () => {
      await store.createTournament(name);
      els.nameInput.value = '';
    });
  });

  els.tournamentList.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-action="delete-tournament"]');
    if (delBtn) {
      e.stopPropagation();
      safeRun(() => store.deleteTournament(delBtn.dataset.id));
      return;
    }
    const item = e.target.closest('[data-action="select-tournament"]');
    if (item) {
      safeRun(() => store.selectTournament(item.dataset.id));
    }
  });

  els.phaseTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (btn && btn.dataset.tab) {
      store.setTab(btn.dataset.tab);
    }
  });

  els.addPlayerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = els.playerNameInput.value.trim();
    if (!name) return;
    safeRun(async () => {
      await store.addSinglePlayer(name);
      els.playerNameInput.value = '';
    });
  });

  els.quickFill16Btn.addEventListener('click', () => safeRun(() => store.quickFillPlayers(16)));
  els.quickFill20Btn.addEventListener('click', () => safeRun(() => store.quickFillPlayers(20)));
  els.shuffleBtn.addEventListener('click', () => safeRun(() => store.shuffleActivePlayers()));
  els.startBtn.addEventListener('click', () => safeRun(() => store.startActiveTournament()));

  els.seedingList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, playerId } = btn.dataset;
    if (action === 'remove-player') {
      safeRun(() => store.removePlayerById(playerId));
    } else if (action === 'move-up') {
      safeRun(() => store.movePlayer(playerId, -1));
    } else if (action === 'move-down') {
      safeRun(() => store.movePlayer(playerId, 1));
    }
  });

  function handleBracketEvents(container) {
    container.addEventListener('change', (e) => {
      const checkbox = e.target.closest('input[data-action="toggle-winner"]');
      if (checkbox) {
        store.toggleMatchWinner(checkbox.dataset.matchId, checkbox.dataset.playerId);
      }
    });

    container.addEventListener('click', (e) => {
      const submitBtn = e.target.closest('button[data-action="submit-match"]');
      if (submitBtn) {
        safeRun(() => store.submitMatchWinners(submitBtn.dataset.matchId));
        return;
      }
      const undoBtn = e.target.closest('button[data-action="undo-match"]');
      if (undoBtn) {
        safeRun(() => store.undoMatch(undoBtn.dataset.matchId));
      }
    });
  }

  handleBracketEvents(els.winnersContainer);
  handleBracketEvents(els.losersContainer);

  els.grandFinalContainer.addEventListener('click', (e) => {
    const winBtn = e.target.closest('button[data-action="gf-win"]');
    if (winBtn) {
      safeRun(() => store.recordFinalistWin(winBtn.dataset.playerId));
    }
  });

  els.undoGrandFinalBtn.addEventListener('click', () => {
    safeRun(() => store.undoLastGrandFinalWin());
  });

  safeRun(async () => {
    const list = await store.refreshList();
    if (list.length > 0) {
      await store.selectTournament(list[0].id);
    }
  });

  return store;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  mountDomApp(document);
}

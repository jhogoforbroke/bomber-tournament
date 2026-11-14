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

const BOMBER_COLOR_HEX = {
  white: '#f8fafc',
  black: '#334155',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  pink: '#ec4899',
  aqua: '#06b6d4'
};

export function computePodiumFromTournament(tournament) {
  if (
    !tournament ||
    tournament.status !== 'COMPLETED' ||
    !tournament.championId ||
    !Array.isArray(tournament.grandFinal?.finalists) ||
    tournament.grandFinal.finalists.length === 0
  ) {
    return [];
  }

  if (Array.isArray(tournament.grandFinal.podium) && tournament.grandFinal.podium.length === 4) {
    return tournament.grandFinal.podium;
  }

  const playersById = getPlayerMap(tournament);
  const finalists = tournament.grandFinal.finalists;
  const champion = finalists.find((f) => f.playerId === tournament.championId);
  if (!champion) return [];

  const others = finalists
    .filter((f) => f.playerId !== tournament.championId)
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      const originA = a.origin === 'WINNERS' ? 0 : 1;
      const originB = b.origin === 'WINNERS' ? 0 : 1;
      if (originA !== originB) return originA - originB;
      const seedA = playersById.get(a.playerId)?.seed ?? Number.MAX_SAFE_INTEGER;
      const seedB = playersById.get(b.playerId)?.seed ?? Number.MAX_SAFE_INTEGER;
      return seedA - seedB;
    });

  return [champion, ...others].map((f, idx) => {
    const player = playersById.get(f.playerId);
    return {
      place: idx + 1,
      playerId: f.playerId,
      name: player?.name || f.playerId,
      color: player?.color || 'white',
      seed: player?.seed ?? idx + 1,
      origin: f.origin,
      wins: f.wins,
      targetWins: f.targetWins
    };
  });
}

export function renderBracketPodiumHtml(tournament) {
  const podium = computePodiumFromTournament(tournament);
  if (podium.length === 0) {
    return '';
  }

  const medalLabels = ['1º LUGAR • CAMPEÃO', '2º LUGAR • VICE-CAMPEÃO', '3º LUGAR • BRONZE', '4º LUGAR • FINALISTA'];

  const cardsHtml = podium
    .map(
      (entry, idx) => `
      <article class="podium-card podium-place-${entry.place}" data-place="${entry.place}" data-player-id="${escapeHtml(entry.playerId)}">
        <div class="podium-rank-badge">${escapeHtml(medalLabels[idx] || `${entry.place}º LUGAR`)}</div>
        <div class="seed-player-info">
          <svg class="bomber-avatar"><use href="#sprite-bomber-${escapeHtml(entry.color)}" /></svg>
          <div>
            <div class="podium-player-name">${escapeHtml(entry.name)}</div>
            <div class="tournament-item-meta">Seed #${entry.seed} • ${entry.origin === 'WINNERS' ? 'Winners' : 'Losers'}</div>
          </div>
        </div>
        <div class="tournament-item-meta">Placar na Grande Final: ${entry.wins} / ${entry.targetWins} vitórias</div>
      </article>
    `
    )
    .join('');

  return `
    <div class="podium-banner-title">
      <svg class="bomber-avatar"><use href="#sprite-trophy" /></svg>
      <span>CLASSIFICAÇÃO OFICIAL • TOP 4 DO TORNEIO</span>
    </div>
    <div class="podium-grid">
      ${cardsHtml}
    </div>
  `;
}

function renderGraphTrackHtml(title, rounds, playersById) {
  const columnsHtml = rounds
    .map((round) => {
      const nodesHtml = round.matches
        .map((match) => {
          const isCompleted = match.status === 'COMPLETED';
          const slotsHtml = match.slots
            .map((playerId, idx) => {
              const player = playerId ? playersById.get(playerId) : null;
              if (!player) {
                return `
                  <div class="graph-slot">
                    <span class="tournament-item-meta">Slot ${idx + 1}: Aguardando...</span>
                  </div>
                `;
              }
              const isWinner = isCompleted && match.winnerIds.includes(player.id);
              const isLoser = isCompleted && match.loserIds.includes(player.id);
              const badge = isWinner
                ? '★ AVANÇOU'
                : isLoser
                  ? match.bracket === 'WINNERS'
                    ? '↓ LOSERS'
                    : '✕ ELIMINADO'
                  : player.isBot
                    ? 'BOT/BYE'
                    : `#${player.seed}`;
              return `
                <div class="graph-slot ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}">
                  <div class="seed-player-info">
                    <svg class="bomber-avatar"><use href="#sprite-bomber-${escapeHtml(player.color || 'white')}" /></svg>
                    <span>${escapeHtml(player.name)}</span>
                  </div>
                  <span class="tournament-item-meta">${escapeHtml(badge)}</span>
                </div>
              `;
            })
            .join('');

          const winTargets = Array.from(
            new Set((match.winnerTargets || []).map((t) => t.matchId))
          );
          const loseTargets = Array.from(
            new Set((match.loserTargets || []).map((t) => t.matchId))
          );
          const connectors = [
            ...winTargets.map(
              (targetId) =>
                `<span class="graph-connector-badge">Vencedores ➔ ${escapeHtml(targetId)}</span>`
            ),
            ...loseTargets.map(
              (targetId) =>
                `<span class="graph-connector-badge">Perdedores ➔ ${escapeHtml(targetId)}</span>`
            )
          ].join('');

          return `
            <article class="graph-node status-${escapeHtml(match.status)}" data-graph-match-id="${escapeHtml(match.id)}">
              <div class="graph-node-header">
                <span>${escapeHtml(match.id)}${match.autoResolved ? ' • AUTO-BYE' : ''}</span>
                <span>${escapeHtml(match.status)}</span>
              </div>
              <div class="graph-node-slots">
                ${slotsHtml}
              </div>
              ${connectors ? `<div class="graph-node-connectors">${connectors}</div>` : ''}
            </article>
          `;
        })
        .join('');

      return `
        <div class="graph-round-column" data-round-name="${escapeHtml(round.name)}">
          <h4 class="round-title">${escapeHtml(round.name)}</h4>
          ${nodesHtml}
        </div>
      `;
    })
    .join('');

  return `
    <section class="graph-track">
      <h3 class="graph-track-title">${escapeHtml(title)}</h3>
      <div class="graph-rounds-flow">
        ${columnsHtml}
      </div>
    </section>
  `;
}

export function renderBracketGraphHtml(tournament) {
  if (
    !tournament ||
    tournament.status === 'DRAFT' ||
    !tournament.brackets ||
    !Array.isArray(tournament.brackets.winners) ||
    tournament.brackets.winners.length === 0
  ) {
    return '<p class="helper-text">O gráfico de chaveamento será gerado automaticamente assim que o torneio for iniciado.</p>';
  }

  const playersById = getPlayerMap(tournament);
  const winnersTrack = renderGraphTrackHtml(
    'WINNERS BRACKET (CHAVE DOS INVICTOS)',
    tournament.brackets.winners,
    playersById
  );
  const losersTrack = renderGraphTrackHtml(
    'LOSERS BRACKET (CHAVE DE REPESCAGEM)',
    tournament.brackets.losers,
    playersById
  );

  const finalists = tournament.grandFinal?.finalists || [];
  let grandFinalSlotsHtml = '';
  if (finalists.length > 0) {
    grandFinalSlotsHtml = finalists
      .map((f) => {
        const player = playersById.get(f.playerId);
        const isChamp = tournament.championId === f.playerId;
        return `
          <div class="graph-slot ${isChamp ? 'winner' : ''}">
            <div class="seed-player-info">
              <svg class="bomber-avatar"><use href="#sprite-bomber-${escapeHtml(player?.color || 'white')}" /></svg>
              <span>${escapeHtml(player?.name || f.playerId)} (${f.origin === 'WINNERS' ? 'Winners' : 'Losers'})</span>
            </div>
            <span class="tournament-item-meta">${f.wins} / ${f.targetWins}${isChamp ? ' ★ CAMPEÃO' : ''}</span>
          </div>
        `;
      })
      .join('');
  } else {
    grandFinalSlotsHtml = `
      <div class="graph-slot"><span class="tournament-item-meta">Finalista Winners #1: Aguardando Winners Final...</span></div>
      <div class="graph-slot"><span class="tournament-item-meta">Finalista Winners #2: Aguardando Winners Final...</span></div>
      <div class="graph-slot"><span class="tournament-item-meta">Finalista Losers #1: Aguardando Losers Final...</span></div>
      <div class="graph-slot"><span class="tournament-item-meta">Finalista Losers #2: Aguardando Losers Final...</span></div>
    `;
  }

  const grandFinalTrack = `
    <section class="graph-track">
      <h3 class="graph-track-title">GRANDE FINAL • HANDICAP 3 VS 6 VITÓRIAS</h3>
      <div class="graph-rounds-flow">
        <div class="graph-round-column">
          <article class="graph-node status-${escapeHtml(tournament.grandFinal?.status || 'PENDING')}" data-graph-match-id="GRAND_FINAL">
            <div class="graph-node-header">
              <span>GRAND_FINAL</span>
              <span>${escapeHtml(tournament.grandFinal?.status || 'PENDING')}</span>
            </div>
            <div class="graph-node-slots">
              ${grandFinalSlotsHtml}
            </div>
          </article>
        </div>
      </div>
    </section>
  `;

  return `${winnersTrack}${losersTrack}${grandFinalTrack}`;
}

export function buildTournamentBracketSvg(tournament) {
  if (!tournament || tournament.status !== 'COMPLETED') {
    return '';
  }

  const playersById = getPlayerMap(tournament);
  const podium = computePodiumFromTournament(tournament);
  const winnersRounds = tournament.brackets?.winners || [];
  const losersRounds = tournament.brackets?.losers || [];

  const maxColumns = Math.max(winnersRounds.length, losersRounds.length, 1);
  const maxMatchesInCol = Math.max(
    ...winnersRounds.map((r) => r.matches.length),
    ...losersRounds.map((r) => r.matches.length),
    1
  );

  const colWidth = 280;
  const colGap = 50;
  const nodeHeight = 135;
  const nodeGap = 20;

  const width = Math.max(1200, 80 + maxColumns * (colWidth + colGap));
  const trackHeight = Math.max(240, 70 + maxMatchesInCol * (nodeHeight + nodeGap));
  const height = 340 + trackHeight * 2 + 240;

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );
  parts.push(`<rect width="100%" height="100%" fill="#090d16" />`);

  // Header
  parts.push(
    `<rect x="30" y="20" width="${width - 60}" height="70" fill="#1e293b" stroke="#facc15" stroke-width="3" />`
  );
  parts.push(
    `<text x="55" y="52" fill="#facc15" font-family="monospace" font-size="22" font-weight="bold">SUPER BOMBERMAN TOURNAMENT: ${escapeHtml(tournament.name)}</text>`
  );
  parts.push(
    `<text x="55" y="76" fill="#94a3b8" font-family="monospace" font-size="14">CHAVEAMENTO OFICIAL COMPLETO • STATUS: ${escapeHtml(tournament.status)}</text>`
  );

  // Top 4 Podium Highlight Section
  parts.push(
    `<rect x="30" y="105" width="${width - 60}" height="190" fill="#1e1b4b" stroke="#facc15" stroke-width="3" />`
  );
  parts.push(
    `<text x="50" y="135" fill="#facc15" font-family="monospace" font-size="18" font-weight="bold">★ DESTAQUE OFICIAL: 1º, 2º, 3º E 4º LUGAR ★</text>`
  );

  const cardWidth = Math.floor((width - 140) / 4);
  const placeStroke = ['#facc15', '#cbd5e1', '#f97316', '#06b6d4'];
  podium.forEach((entry, idx) => {
    const cx = 50 + idx * (cardWidth + 15);
    const cy = 150;
    const stroke = placeStroke[idx] || '#64748b';
    const bomberHex = BOMBER_COLOR_HEX[entry.color] || '#f8fafc';
    parts.push(
      `<rect x="${cx}" y="${cy}" width="${cardWidth}" height="125" fill="#0f172a" stroke="${stroke}" stroke-width="3" />`
    );
    parts.push(
      `<text x="${cx + 14}" y="${cy + 28}" fill="${stroke}" font-family="monospace" font-size="15" font-weight="bold">${entry.place}º LUGAR</text>`
    );
    parts.push(
      `<circle cx="${cx + 24}" cy="${cy + 58}" r="10" fill="${bomberHex}" stroke="#fff" stroke-width="2" />`
    );
    parts.push(
      `<text x="${cx + 42}" y="${cy + 63}" fill="#ffffff" font-family="monospace" font-size="16" font-weight="bold">${escapeHtml(entry.name)}</text>`
    );
    parts.push(
      `<text x="${cx + 14}" y="${cy + 92}" fill="#94a3b8" font-family="monospace" font-size="13">Seed #${entry.seed} • ${entry.origin === 'WINNERS' ? 'Winners' : 'Losers'} • Cor: ${escapeHtml(entry.color.toUpperCase())}</text>`
    );
    parts.push(
      `<text x="${cx + 14}" y="${cy + 112}" fill="#22c55e" font-family="monospace" font-size="13">Grande Final: ${entry.wins} / ${entry.targetWins} vitórias</text>`
    );
  });

  function renderSvgTrack(trackTitle, rounds, startY) {
    parts.push(
      `<text x="40" y="${startY}" fill="#facc15" font-family="monospace" font-size="17" font-weight="bold">${escapeHtml(trackTitle)}</text>`
    );
    rounds.forEach((round, rIdx) => {
      const rx = 40 + rIdx * (colWidth + colGap);
      const ry = startY + 20;
      parts.push(
        `<text x="${rx}" y="${ry + 16}" fill="#38bdf8" font-family="monospace" font-size="14" font-weight="bold">${escapeHtml(round.name)}</text>`
      );

      round.matches.forEach((match, mIdx) => {
        const my = ry + 30 + mIdx * (nodeHeight + nodeGap);
        parts.push(
          `<rect x="${rx}" y="${my}" width="${colWidth}" height="${nodeHeight}" fill="#1e293b" stroke="#22c55e" stroke-width="2" />`
        );
        const headerLabel = `${match.id}${match.autoResolved ? ' (AUTO-BYE)' : ''} [${match.status}]`;
        parts.push(
          `<text x="${rx + 10}" y="${my + 20}" fill="#facc15" font-family="monospace" font-size="12" font-weight="bold">${escapeHtml(headerLabel)}</text>`
        );

        match.slots.forEach((pid, sIdx) => {
          const p = pid ? playersById.get(pid) : null;
          const sy = my + 42 + sIdx * 22;
          const isWin = match.winnerIds?.includes(pid);
          const pName = p ? p.name : 'Vazio';
          const statusMark = isWin ? '★' : '•';
          const textColor = isWin ? '#4ade80' : '#cbd5e1';
          parts.push(
            `<text x="${rx + 12}" y="${sy}" fill="${textColor}" font-family="monospace" font-size="12">${statusMark} ${escapeHtml(pName)}</text>`
          );
        });
      });
    });
  }

  const winnersStartY = 330;
  renderSvgTrack('WINNERS BRACKET', winnersRounds, winnersStartY);

  const losersStartY = winnersStartY + trackHeight + 20;
  renderSvgTrack('LOSERS BRACKET', losersRounds, losersStartY);

  const gfStartY = losersStartY + trackHeight + 20;
  parts.push(
    `<text x="40" y="${gfStartY}" fill="#facc15" font-family="monospace" font-size="17" font-weight="bold">GRANDE FINAL (HANDICAP 3 VS 6)</text>`
  );
  (tournament.grandFinal?.finalists || []).forEach((f, idx) => {
    const p = playersById.get(f.playerId);
    const gx = 40 + idx * 290;
    const gy = gfStartY + 20;
    const isChamp = tournament.championId === f.playerId;
    parts.push(
      `<rect x="${gx}" y="${gy}" width="275" height="90" fill="#1e293b" stroke="${isChamp ? '#22c55e' : '#64748b'}" stroke-width="2" />`
    );
    parts.push(
      `<text x="${gx + 12}" y="${gy + 28}" fill="#ffffff" font-family="monospace" font-size="14" font-weight="bold">${escapeHtml(p?.name || f.playerId)}</text>`
    );
    parts.push(
      `<text x="${gx + 12}" y="${gy + 52}" fill="#94a3b8" font-family="monospace" font-size="12">Origem: ${f.origin} • Placar: ${f.wins}/${f.targetWins}</text>`
    );
    if (isChamp) {
      parts.push(
        `<text x="${gx + 12}" y="${gy + 74}" fill="#facc15" font-family="monospace" font-size="12" font-weight="bold">★ CAMPEÃO DO TORNEIO ★</text>`
      );
    }
  });

  parts.push(`</svg>`);
  return parts.join('\n');
}

// Minimal valid 1x1 dark arcade PNG base64 fallback when running outside a full browser Canvas 2D runtime
const FALLBACK_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function drawTournamentOnCanvas2D(ctx, canvas, tournament, podium) {
  const playersById = getPlayerMap(tournament);
  const winnersRounds = tournament.brackets?.winners || [];
  const losersRounds = tournament.brackets?.losers || [];
  const maxCols = Math.max(winnersRounds.length, losersRounds.length, 1);
  const maxMatches = Math.max(
    ...winnersRounds.map((r) => r.matches.length),
    ...losersRounds.map((r) => r.matches.length),
    1
  );

  const colW = 270;
  const colGap = 40;
  const nodeH = 128;
  const nodeGap = 16;
  const trackH = Math.max(220, 65 + maxMatches * (nodeH + nodeGap));

  canvas.width = Math.max(1240, 80 + maxCols * (colW + colGap));
  canvas.height = 340 + trackH * 2 + 180;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(28, 20, canvas.width - 56, 70);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 20, canvas.width - 56, 70);

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`SUPER BOMBERMAN TOURNAMENT: ${tournament.name}`, 48, 52);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px monospace';
  ctx.fillText(`CHAVEAMENTO COMPLETO & PÓDIO OFICIAL (1º AO 4º LUGAR)`, 48, 76);

  // Podium Banner
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(28, 104, canvas.width - 56, 175);
  ctx.strokeStyle = '#facc15';
  ctx.strokeRect(28, 104, canvas.width - 56, 175);

  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 17px monospace';
  ctx.fillText('★ DESTAQUE DO PÓDIO: 1º, 2º, 3º E 4º LUGAR ★', 48, 132);

  const cardW = Math.floor((canvas.width - 140) / 4);
  const placeColors = ['#facc15', '#cbd5e1', '#f97316', '#06b6d4'];
  podium.forEach((entry, idx) => {
    const cx = 48 + idx * (cardW + 14);
    const cy = 146;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx, cy, cardW, 118);
    ctx.strokeStyle = placeColors[idx] || '#64748b';
    ctx.strokeRect(cx, cy, cardW, 118);

    ctx.fillStyle = placeColors[idx] || '#facc15';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`${entry.place}º LUGAR`, cx + 14, cy + 26);

    ctx.fillStyle = BOMBER_COLOR_HEX[entry.color] || '#ffffff';
    ctx.fillRect(cx + 14, cy + 40, 16, 16);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(entry.name, cx + 38, cy + 54);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText(
      `Seed #${entry.seed} • ${entry.origin === 'WINNERS' ? 'Winners' : 'Losers'}`,
      cx + 14,
      cy + 80
    );
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`Grande Final: ${entry.wins} / ${entry.targetWins} vitórias`, cx + 14, cy + 102);
  });

  function drawTrack(title, rounds, startY) {
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(title, 40, startY);

    rounds.forEach((round, rIdx) => {
      const rx = 40 + rIdx * (colW + colGap);
      const ry = startY + 22;
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(round.name, rx, ry);

      round.matches.forEach((match, mIdx) => {
        const my = ry + 14 + mIdx * (nodeH + nodeGap);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(rx, my, colW, nodeH);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, my, colW, nodeH);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(
          `${match.id}${match.autoResolved ? ' (AUTO-BYE)' : ''} [${match.status}]`,
          rx + 10,
          my + 18
        );

        match.slots.forEach((pid, sIdx) => {
          const p = pid ? playersById.get(pid) : null;
          const isWin = match.winnerIds?.includes(pid);
          ctx.fillStyle = isWin ? '#4ade80' : '#cbd5e1';
          ctx.font = '12px monospace';
          ctx.fillText(
            `${isWin ? '★' : '•'} ${p ? p.name : 'Vazio'}`,
            rx + 12,
            my + 40 + sIdx * 20
          );
        });
      });
    });
  }

  const wY = 315;
  drawTrack('WINNERS BRACKET', winnersRounds, wY);
  const lY = wY + trackH + 15;
  drawTrack('LOSERS BRACKET', losersRounds, lY);
}

export function exportTournamentBracketPng(tournament, doc = globalThis.document) {
  if (!tournament || tournament.status !== 'COMPLETED') {
    return null;
  }

  const podium = computePodiumFromTournament(tournament);
  const svg = buildTournamentBracketSvg(tournament);
  const slug =
    String(tournament.name || 'torneio')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'torneio';
  const filename = `${slug}-chaveamento.png`;

  let dataUrl = FALLBACK_PNG_DATA_URL;
  if (doc && typeof doc.createElement === 'function') {
    const canvas = doc.createElement('canvas');
    if (canvas && typeof canvas.getContext === 'function') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawTournamentOnCanvas2D(ctx, canvas, tournament, podium);
      }
      if (typeof canvas.toDataURL === 'function') {
        const candidateUrl = canvas.toDataURL('image/png');
        if (typeof candidateUrl === 'string' && candidateUrl.startsWith('data:image/png;base64,')) {
          dataUrl = candidateUrl;
        }
      }
    }

    const link = doc.createElement('a');
    if (link) {
      link.download = filename;
      link.href = dataUrl;
      if (typeof link.click === 'function') {
        link.click();
      }
    }
  }

  return {
    filename,
    dataUrl,
    svg,
    podium
  };
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

export function mountDomApp(doc = globalThis.document, { baseUrl = '', fetchImpl = globalThis.fetch } = {}) {
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
    bracketGraphSection: doc.getElementById('bracket-graph-section'),
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
    playersStatusContainer: doc.getElementById('players-status-container'),
    downloadBracketImageBtn: doc.getElementById('download-bracket-image-btn'),
    bracketPodiumBanner: doc.getElementById('bracket-podium-banner'),
    bracketGraphContainer: doc.getElementById('bracket-graph-container')
  };

  const store = createSpaStore({
    baseUrl,
    fetchImpl,
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
      players: els.playersSection,
      'bracket-graph': els.bracketGraphSection
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

    const isCompleted = Boolean(t && t.status === 'COMPLETED');
    if (els.downloadBracketImageBtn) {
      els.downloadBracketImageBtn.disabled = !isCompleted;
    }
    if (els.bracketPodiumBanner) {
      els.bracketPodiumBanner.classList.toggle('hidden', !isCompleted);
      els.bracketPodiumBanner.innerHTML = renderBracketPodiumHtml(t);
    }
    if (els.bracketGraphContainer) {
      els.bracketGraphContainer.innerHTML = renderBracketGraphHtml(t);
    }
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

  if (els.downloadBracketImageBtn) {
    els.downloadBracketImageBtn.addEventListener('click', () => {
      exportTournamentBracketPng(store.getState().activeTournament, doc);
    });
  }

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

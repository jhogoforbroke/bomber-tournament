import {
  ValidationError,
  ConflictError,
  NotFoundError,
  validateCanStart
} from './tournament.js';

function nextPowerOfTwo(n) {
  let p = 16;
  while (p < n) {
    p *= 2;
  }
  return p;
}

export function findMatch(tournament, matchId) {
  for (const round of tournament.brackets?.winners || []) {
    const found = round.matches.find((m) => m.id === matchId);
    if (found) return found;
  }
  for (const round of tournament.brackets?.losers || []) {
    const found = round.matches.find((m) => m.id === matchId);
    if (found) return found;
  }
  return null;
}

function createEmptyMatch({ id, bracket, roundNumber, matchNumber }) {
  return {
    id,
    bracket,
    roundNumber,
    matchNumber,
    status: 'PENDING',
    slots: [null, null, null, null],
    winnerIds: [],
    loserIds: [],
    winnerTargets: [],
    loserTargets: [],
    autoResolved: false
  };
}

function buildBracketsStructure(bracketSize) {
  const k = Math.log2(bracketSize); // 4 -> 16, 5 -> 32, 6 -> 64
  const winnersRoundsCount = k - 1;
  const winners = [];

  for (let r = 1; r <= winnersRoundsCount; r++) {
    const matchCount = bracketSize / Math.pow(2, r + 1);
    const roundName =
      r === winnersRoundsCount
        ? 'Winners Final'
        : `Winners Round ${r}`;
    const matches = [];
    for (let m = 1; m <= matchCount; m++) {
      matches.push(
        createEmptyMatch({
          id: `W-R${r}-M${m}`,
          bracket: 'WINNERS',
          roundNumber: r,
          matchNumber: m
        })
      );
    }
    winners.push({
      roundNumber: r,
      name: roundName,
      matches
    });
  }

  // Build Losers rounds:
  // LR1 takes losers from WR1 (matchCount = bracketSize / 8).
  // For each WR(w) from w = 2..winnersRoundsCount:
  //   - A Drop-Merge round (same matchCount as previous Losers round, merging previous Losers winners + WR(w) losers)
  //   - If w < winnersRoundsCount, a Survivor-Reduction round (halving matchCount)
  const losers = [];
  let lRoundNum = 1;
  const lr1MatchCount = bracketSize / 8;
  const lr1Matches = [];
  for (let m = 1; m <= lr1MatchCount; m++) {
    lr1Matches.push(
      createEmptyMatch({
        id: `L-R${lRoundNum}-M${m}`,
        bracket: 'LOSERS',
        roundNumber: lRoundNum,
        matchNumber: m
      })
    );
  }
  losers.push({
    roundNumber: lRoundNum,
    name: 'Losers Round 1',
    matches: lr1Matches
  });

  // Wire WR1 losers -> LR1
  winners[0].matches.forEach((wm, idx) => {
    const targetMatchIdx = Math.floor(idx / 2);
    const baseSlot = (idx % 2) * 2;
    const targetMatchId = lr1Matches[targetMatchIdx].id;
    wm.loserTargets = [
      { matchId: targetMatchId, slotIndex: baseSlot },
      { matchId: targetMatchId, slotIndex: baseSlot + 1 }
    ];
  });

  let prevLosersRound = losers[0];

  for (let w = 2; w <= winnersRoundsCount; w++) {
    lRoundNum++;
    const mergeMatchCount = prevLosersRound.matches.length;
    const isLosersFinal = w === winnersRoundsCount;
    const mergeMatches = [];
    for (let m = 1; m <= mergeMatchCount; m++) {
      mergeMatches.push(
        createEmptyMatch({
          id: `L-R${lRoundNum}-M${m}`,
          bracket: 'LOSERS',
          roundNumber: lRoundNum,
          matchNumber: m
        })
      );
    }
    const mergeRound = {
      roundNumber: lRoundNum,
      name: isLosersFinal ? 'Losers Final' : `Losers Round ${lRoundNum}`,
      matches: mergeMatches
    };
    losers.push(mergeRound);

    // Wire prevLosersRound winners -> mergeRound slots 0, 1
    prevLosersRound.matches.forEach((lm, idx) => {
      const targetMatchId = mergeMatches[idx].id;
      lm.winnerTargets = [
        { matchId: targetMatchId, slotIndex: 0 },
        { matchId: targetMatchId, slotIndex: 1 }
      ];
    });

    // Wire WR(w) losers -> mergeRound slots 2, 3
    winners[w - 1].matches.forEach((wm, idx) => {
      const targetMatchId = mergeMatches[idx].id;
      wm.loserTargets = [
        { matchId: targetMatchId, slotIndex: 2 },
        { matchId: targetMatchId, slotIndex: 3 }
      ];
    });

    prevLosersRound = mergeRound;

    if (!isLosersFinal) {
      lRoundNum++;
      const reduceMatchCount = mergeMatchCount / 2;
      const reduceMatches = [];
      for (let m = 1; m <= reduceMatchCount; m++) {
        reduceMatches.push(
          createEmptyMatch({
            id: `L-R${lRoundNum}-M${m}`,
            bracket: 'LOSERS',
            roundNumber: lRoundNum,
            matchNumber: m
          })
        );
      }
      const reduceRound = {
        roundNumber: lRoundNum,
        name: `Losers Round ${lRoundNum}`,
        matches: reduceMatches
      };
      losers.push(reduceRound);

      prevLosersRound.matches.forEach((lm, idx) => {
        const targetMatchIdx = Math.floor(idx / 2);
        const baseSlot = (idx % 2) * 2;
        const targetMatchId = reduceMatches[targetMatchIdx].id;
        lm.winnerTargets = [
          { matchId: targetMatchId, slotIndex: baseSlot },
          { matchId: targetMatchId, slotIndex: baseSlot + 1 }
        ];
      });

      prevLosersRound = reduceRound;
    }
  }

  // Wire Winners rounds winners -> next Winners round
  for (let r = 0; r < winnersRoundsCount - 1; r++) {
    const currRound = winners[r];
    const nextRound = winners[r + 1];
    currRound.matches.forEach((wm, idx) => {
      const targetMatchIdx = Math.floor(idx / 2);
      const baseSlot = (idx % 2) * 2;
      const targetMatchId = nextRound.matches[targetMatchIdx].id;
      wm.winnerTargets = [
        { matchId: targetMatchId, slotIndex: baseSlot },
        { matchId: targetMatchId, slotIndex: baseSlot + 1 }
      ];
    });
  }

  // Wire Winners Final winners -> GRAND_FINAL slots 0, 1
  const winnersFinalMatch = winners[winners.length - 1].matches[0];
  winnersFinalMatch.winnerTargets = [
    { matchId: 'GRAND_FINAL', slotIndex: 0 },
    { matchId: 'GRAND_FINAL', slotIndex: 1 }
  ];

  // Wire Losers Final winners -> GRAND_FINAL slots 2, 3
  const losersFinalMatch = losers[losers.length - 1].matches[0];
  losersFinalMatch.winnerTargets = [
    { matchId: 'GRAND_FINAL', slotIndex: 2 },
    { matchId: 'GRAND_FINAL', slotIndex: 3 }
  ];

  return { winners, losers };
}

function getPlayerMap(tournament) {
  return new Map(tournament.players.map((p) => [p.id, p]));
}

function checkAndInitGrandFinal(tournament) {
  const winnersFinal = tournament.brackets.winners[tournament.brackets.winners.length - 1].matches[0];
  const losersFinal = tournament.brackets.losers[tournament.brackets.losers.length - 1].matches[0];

  if (winnersFinal.status === 'COMPLETED' && losersFinal.status === 'COMPLETED') {
    const winnersFinalists = winnersFinal.winnerIds.map((playerId) => ({
      playerId,
      origin: 'WINNERS',
      wins: 0,
      targetWins: 3
    }));
    const losersFinalists = losersFinal.winnerIds.map((playerId) => ({
      playerId,
      origin: 'LOSERS',
      wins: 0,
      targetWins: 6
    }));

    const playerMap = getPlayerMap(tournament);
    for (const id of winnersFinal.winnerIds) {
      const p = playerMap.get(id);
      if (p) p.status = 'FINALIST_WINNERS';
    }
    for (const id of losersFinal.winnerIds) {
      const p = playerMap.get(id);
      if (p) p.status = 'FINALIST_LOSERS';
    }

    tournament.grandFinal = {
      status: 'READY',
      finalists: [...winnersFinalists, ...losersFinalists],
      history: []
    };
    tournament.status = 'GRAND_FINAL';
  }
}

function refreshMatchReadinessAndAutoResolve(tournament) {
  const playerMap = getPlayerMap(tournament);
  let changed = true;

  while (changed) {
    changed = false;
    const allMatches = [
      ...tournament.brackets.winners.flatMap((r) => r.matches),
      ...tournament.brackets.losers.flatMap((r) => r.matches)
    ];

    for (const match of allMatches) {
      const allFilled = match.slots.every((s) => s !== null);
      if (match.status === 'PENDING' && allFilled) {
        match.status = 'READY';
        changed = true;
      } else if (match.status === 'READY' && !allFilled) {
        match.status = 'PENDING';
        changed = true;
      }

      if (match.status === 'READY') {
        const humans = match.slots.filter((id) => !playerMap.get(id)?.isBot);
        if (humans.length <= 2) {
          // Auto-resolve because at most 2 human players are in this match:
          // all human players advance, and if fewer than 2 humans exist, fill with bots
          const bots = match.slots.filter((id) => playerMap.get(id)?.isBot);
          const autoWinners = [...humans, ...bots].slice(0, 2);
          applyMatchOutcome(tournament, match, autoWinners, true);
          changed = true;
        }
      }
    }
  }

  checkAndInitGrandFinal(tournament);
}

function applyMatchOutcome(tournament, match, winnerIds, isAuto = false) {
  const playerMap = getPlayerMap(tournament);
  const loserIds = match.slots.filter((id) => !winnerIds.includes(id));

  match.winnerIds = [...winnerIds];
  match.loserIds = [...loserIds];
  match.status = 'COMPLETED';
  match.autoResolved = isAuto;

  // Propagate winners
  match.winnerTargets.forEach((target, idx) => {
    if (target.matchId !== 'GRAND_FINAL') {
      const nextMatch = findMatch(tournament, target.matchId);
      if (nextMatch) {
        nextMatch.slots[target.slotIndex] = winnerIds[idx];
      }
    }
  });

  // Propagate losers or mark eliminated
  if (match.bracket === 'WINNERS') {
    match.loserTargets.forEach((target, idx) => {
      const nextMatch = findMatch(tournament, target.matchId);
      if (nextMatch) {
        nextMatch.slots[target.slotIndex] = loserIds[idx];
      }
      const loserPlayer = playerMap.get(loserIds[idx]);
      if (loserPlayer) {
        loserPlayer.status = 'LOSERS';
      }
    });
  } else {
    for (const loserId of loserIds) {
      const loserPlayer = playerMap.get(loserId);
      if (loserPlayer) {
        loserPlayer.status = 'ELIMINATED';
      }
    }
  }
}

export function startTournament(tournament) {
  validateCanStart(tournament);

  const humans = tournament.players.filter((p) => !p.isBot);
  const humanCount = humans.length;
  const bracketSize = nextPowerOfTwo(humanCount);
  const botCount = bracketSize - humanCount;

  const bots = [];
  for (let i = 1; i <= botCount; i++) {
    bots.push({
      id: `bot_${i}`,
      name: `CPU BOT #${i}`,
      color: 'black',
      seed: humanCount + i,
      isBot: true,
      status: 'ACTIVE'
    });
  }

  tournament.players = [...humans, ...bots];
  tournament.bracketSize = bracketSize;
  tournament.brackets = buildBracketsStructure(bracketSize);
  tournament.status = 'IN_PROGRESS';

  // Distribute humans and bots into WR1 matches so that:
  // - Every match gets at least 2 humans in its leading slots
  // - Any BOT/BYE participants are placed exclusively in trailing slots (index 3, or 2 and 3)
  const wr1Matches = tournament.brackets.winners[0].matches;
  const matchCount = wr1Matches.length;

  // Determine how many bots go into each WR1 match (distributed from last match backwards, max 2 per match)
  const botsPerMatch = new Array(matchCount).fill(0);
  for (let b = 0; b < botCount; b++) {
    const mIdx = matchCount - 1 - (b % matchCount);
    botsPerMatch[mIdx]++;
  }

  let humanCursor = 0;
  let botCursor = 0;
  for (let mIdx = 0; mIdx < matchCount; mIdx++) {
    const match = wr1Matches[mIdx];
    const numBots = botsPerMatch[mIdx];
    const numHumans = 4 - numBots;
    for (let s = 0; s < numHumans; s++) {
      match.slots[s] = humans[humanCursor++].id;
    }
    for (let s = numHumans; s < 4; s++) {
      match.slots[s] = bots[botCursor++].id;
    }
  }

  refreshMatchReadinessAndAutoResolve(tournament);
  tournament.updatedAt = new Date().toISOString();
  return tournament;
}

export function recordMatchResult(tournament, matchId, winnerIds) {
  if (!tournament || tournament.status !== 'IN_PROGRESS') {
    throw new ValidationError('O torneio não está em andamento (IN_PROGRESS).');
  }
  const match = findMatch(tournament, matchId);
  if (!match) {
    throw new NotFoundError(`Partida ${matchId} não encontrada.`);
  }
  if (match.status !== 'READY') {
    throw new ValidationError(`A partida ${matchId} não está pronta para receber resultado (status: ${match.status}).`);
  }
  if (!Array.isArray(winnerIds) || winnerIds.length !== 2) {
    throw new ValidationError('Devem ser selecionados exatamente 2 vencedores para a partida.');
  }
  if (winnerIds[0] === winnerIds[1]) {
    throw new ValidationError('Os 2 vencedores selecionados devem ser jogadores distintos.');
  }
  for (const wId of winnerIds) {
    if (!match.slots.includes(wId)) {
      throw new ValidationError(`O jogador ${wId} não pertence à partida ${matchId}.`);
    }
  }

  const playerMap = getPlayerMap(tournament);
  const humanSlots = match.slots.filter((id) => !playerMap.get(id)?.isBot);
  for (const wId of winnerIds) {
    const p = playerMap.get(wId);
    if (p?.isBot && humanSlots.length >= 2) {
      throw new ValidationError('Um participante BOT/BYE não pode vencer no lugar de um jogador humano.');
    }
  }

  applyMatchOutcome(tournament, match, winnerIds, false);
  refreshMatchReadinessAndAutoResolve(tournament);
  tournament.updatedAt = new Date().toISOString();
  return match;
}

function clearAutoResolvedDownstreamMatch(tournament, targetMatch) {
  const playerMap = getPlayerMap(tournament);
  for (const wTarget of targetMatch.winnerTargets) {
    if (wTarget.matchId !== 'GRAND_FINAL') {
      const nextM = findMatch(tournament, wTarget.matchId);
      if (nextM) {
        if (nextM.status === 'COMPLETED' && nextM.autoResolved) {
          clearAutoResolvedDownstreamMatch(tournament, nextM);
        }
        nextM.slots[wTarget.slotIndex] = null;
        if (nextM.status === 'READY') nextM.status = 'PENDING';
      }
    }
  }
  for (const lTarget of targetMatch.loserTargets) {
    const nextM = findMatch(tournament, lTarget.matchId);
    if (nextM) {
      if (nextM.status === 'COMPLETED' && nextM.autoResolved) {
        clearAutoResolvedDownstreamMatch(tournament, nextM);
      }
      nextM.slots[lTarget.slotIndex] = null;
      if (nextM.status === 'READY') nextM.status = 'PENDING';
    }
  }
  for (const lId of targetMatch.loserIds) {
    const lp = playerMap.get(lId);
    if (lp) lp.status = targetMatch.bracket === 'WINNERS' ? 'ACTIVE' : 'LOSERS';
  }
  targetMatch.winnerIds = [];
  targetMatch.loserIds = [];
  targetMatch.autoResolved = false;
  targetMatch.status = 'PENDING';
}

export function undoMatchResult(tournament, matchId) {
  if (!tournament || (tournament.status !== 'IN_PROGRESS' && tournament.status !== 'GRAND_FINAL')) {
    throw new ConflictError('O estado atual do torneio não permite desfazer partidas das chaves.');
  }
  const match = findMatch(tournament, matchId);
  if (!match) {
    throw new NotFoundError(`Partida ${matchId} não encontrada.`);
  }
  if (match.status !== 'COMPLETED') {
    throw new ValidationError(`A partida ${matchId} ainda não foi concluída.`);
  }

  if (
    tournament.status === 'GRAND_FINAL' &&
    tournament.grandFinal?.history &&
    tournament.grandFinal.history.length > 0
  ) {
    throw new ConflictError('A Grande Final já possui rodadas concluídas; desfaça as rodadas da Grande Final primeiro.');
  }

  const allTargets = [...match.winnerTargets, ...match.loserTargets];
  for (const target of allTargets) {
    if (target.matchId === 'GRAND_FINAL') continue;
    const depMatch = findMatch(tournament, target.matchId);
    if (depMatch && depMatch.status === 'COMPLETED' && !depMatch.autoResolved) {
      throw new ConflictError(
        `Não é possível desfazer ${matchId} pois a partida dependente ${depMatch.id} já foi concluída.`
      );
    }
  }

  // Revert any auto-resolved downstream matches first
  for (const target of allTargets) {
    if (target.matchId === 'GRAND_FINAL') continue;
    const depMatch = findMatch(tournament, target.matchId);
    if (depMatch && depMatch.status === 'COMPLETED' && depMatch.autoResolved) {
      clearAutoResolvedDownstreamMatch(tournament, depMatch);
    }
  }

  // Clear slots in target matches
  for (const target of match.winnerTargets) {
    if (target.matchId === 'GRAND_FINAL') continue;
    const depMatch = findMatch(tournament, target.matchId);
    if (depMatch) {
      depMatch.slots[target.slotIndex] = null;
      if (depMatch.status === 'READY') depMatch.status = 'PENDING';
    }
  }

  for (const target of match.loserTargets) {
    const depMatch = findMatch(tournament, target.matchId);
    if (depMatch) {
      depMatch.slots[target.slotIndex] = null;
      if (depMatch.status === 'READY') depMatch.status = 'PENDING';
    }
  }

  const playerMap = getPlayerMap(tournament);
  for (const pId of match.slots) {
    const p = playerMap.get(pId);
    if (p) {
      p.status = match.bracket === 'WINNERS' ? 'ACTIVE' : 'LOSERS';
    }
  }

  match.winnerIds = [];
  match.loserIds = [];
  match.autoResolved = false;
  match.status = 'READY';

  if (tournament.status === 'GRAND_FINAL') {
    tournament.status = 'IN_PROGRESS';
    tournament.grandFinal = {
      status: 'PENDING',
      finalists: [],
      history: []
    };
  }

  refreshMatchReadinessAndAutoResolve(tournament);
  tournament.updatedAt = new Date().toISOString();
  return match;
}

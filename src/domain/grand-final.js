import { ValidationError, ConflictError } from './tournament.js';

export function initGrandFinal(tournament, winnersFinalistIds, losersFinalistIds) {
  if (!Array.isArray(winnersFinalistIds) || winnersFinalistIds.length !== 2) {
    throw new ValidationError('A Grande Final exige exatamente 2 finalistas da Winners Bracket.');
  }
  if (!Array.isArray(losersFinalistIds) || losersFinalistIds.length !== 2) {
    throw new ValidationError('A Grande Final exige exatamente 2 finalistas da Losers Bracket.');
  }

  const finalists = [
    ...winnersFinalistIds.map((playerId) => ({
      playerId,
      origin: 'WINNERS',
      wins: 0,
      targetWins: 3
    })),
    ...losersFinalistIds.map((playerId) => ({
      playerId,
      origin: 'LOSERS',
      wins: 0,
      targetWins: 6
    }))
  ];

  for (const player of tournament.players) {
    if (winnersFinalistIds.includes(player.id)) {
      player.status = 'FINALIST_WINNERS';
    } else if (losersFinalistIds.includes(player.id)) {
      player.status = 'FINALIST_LOSERS';
    }
  }

  tournament.grandFinal = {
    status: 'READY',
    finalists,
    history: []
  };
  tournament.status = 'GRAND_FINAL';
  tournament.championId = null;
  tournament.updatedAt = new Date().toISOString();
  return tournament.grandFinal;
}

export function recordGrandFinalWin(tournament, playerId) {
  if (!tournament || tournament.status === 'COMPLETED') {
    throw new ConflictError('O torneio já foi encerrado. Desfaça a última rodada para alterar o placar.');
  }
  if (tournament.status !== 'GRAND_FINAL' || tournament.grandFinal?.status !== 'READY') {
    throw new ValidationError('O torneio ainda não está na fase da Grande Final.');
  }

  const finalist = tournament.grandFinal.finalists.find((f) => f.playerId === playerId);
  if (!finalist) {
    throw new ValidationError(`O jogador ${playerId} não é um dos 4 finalistas da Grande Final.`);
  }

  finalist.wins += 1;
  const roundNumber = tournament.grandFinal.history.length + 1;
  tournament.grandFinal.history.push({
    round: roundNumber,
    winnerPlayerId: playerId,
    timestamp: new Date().toISOString()
  });

  if (finalist.wins >= finalist.targetWins) {
    tournament.status = 'COMPLETED';
    tournament.grandFinal.status = 'COMPLETED';
    tournament.championId = playerId;

    for (const f of tournament.grandFinal.finalists) {
      const p = tournament.players.find((pl) => pl.id === f.playerId);
      if (p) {
        p.status = f.playerId === playerId ? 'CHAMPION' : 'ELIMINATED';
      }
    }
  }

  tournament.updatedAt = new Date().toISOString();
  return tournament.grandFinal;
}

export function undoGrandFinalWin(tournament) {
  if (!tournament || (tournament.status !== 'GRAND_FINAL' && tournament.status !== 'COMPLETED')) {
    throw new ConflictError('O torneio não está na Grande Final.');
  }
  const history = tournament.grandFinal?.history;
  if (!Array.isArray(history) || history.length === 0) {
    throw new ValidationError('Não há rodadas registradas na Grande Final para desfazer.');
  }

  const lastEntry = history.pop();
  const finalist = tournament.grandFinal.finalists.find(
    (f) => f.playerId === lastEntry.winnerPlayerId
  );
  if (finalist && finalist.wins > 0) {
    finalist.wins -= 1;
  }

  if (tournament.status === 'COMPLETED') {
    tournament.status = 'GRAND_FINAL';
    tournament.grandFinal.status = 'READY';
    tournament.championId = null;

    for (const f of tournament.grandFinal.finalists) {
      const p = tournament.players.find((pl) => pl.id === f.playerId);
      if (p) {
        p.status = f.origin === 'WINNERS' ? 'FINALIST_WINNERS' : 'FINALIST_LOSERS';
      }
    }
  }

  tournament.updatedAt = new Date().toISOString();
  return tournament.grandFinal;
}

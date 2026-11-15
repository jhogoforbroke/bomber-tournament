import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ValidationError,
  ConflictError,
  createTournament,
  addPlayer
} from '../../src/domain/tournament.js';
import { startTournament, recordMatchResult } from '../../src/domain/bracket.js';
import {
  initGrandFinal,
  recordGrandFinalWin,
  undoGrandFinalWin
} from '../../src/domain/grand-final.js';

function createTournamentAtGrandFinal() {
  const t = createTournament({ name: 'Grand Final Cup' });
  const colors = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'aqua'];
  for (let i = 1; i <= 16; i++) {
    addPlayer(t, { name: `Bomber_${i}`, color: colors[(i - 1) % colors.length] });
  }
  startTournament(t);
  while (t.status === 'IN_PROGRESS') {
    const allMatches = [
      ...t.brackets.winners.flatMap((r) => r.matches),
      ...t.brackets.losers.flatMap((r) => r.matches)
    ];
    const ready = allMatches.find((m) => m.status === 'READY');
    recordMatchResult(t, ready.id, [ready.slots[0], ready.slots[1]]);
  }
  return t;
}

describe('T3: Grand Final Handicap Engine', () => {
  it('C12: grand final state exposes 4 finalists with origin, wins and targetWins (3 for WINNERS, 6 for LOSERS)', () => {
    const t = createTournamentAtGrandFinal();
    assert.equal(t.status, 'GRAND_FINAL');
    assert.equal(t.grandFinal.status, 'READY');
    assert.equal(t.grandFinal.finalists.length, 4);

    const winners = t.grandFinal.finalists.filter((f) => f.origin === 'WINNERS');
    const losers = t.grandFinal.finalists.filter((f) => f.origin === 'LOSERS');
    assert.equal(winners.length, 2);
    assert.equal(losers.length, 2);
    assert.deepEqual(winners.map((w) => ({ wins: w.wins, targetWins: w.targetWins })), [
      { wins: 0, targetWins: 3 },
      { wins: 0, targetWins: 3 }
    ]);
    assert.deepEqual(losers.map((l) => ({ wins: l.wins, targetWins: l.targetWins })), [
      { wins: 0, targetWins: 6 },
      { wins: 0, targetWins: 6 }
    ]);
    assert.ok(typeof initGrandFinal === 'function');
  });

  it('C13: recording a grand final win increments finalist wins and appends round history', () => {
    const t = createTournamentAtGrandFinal();
    const wFinalist = t.grandFinal.finalists.find((f) => f.origin === 'WINNERS');
    const lFinalist = t.grandFinal.finalists.find((f) => f.origin === 'LOSERS');

    recordGrandFinalWin(t, wFinalist.playerId);
    assert.equal(wFinalist.wins, 1);
    assert.equal(t.grandFinal.history.length, 1);
    assert.equal(t.grandFinal.history[0].round, 1);
    assert.equal(t.grandFinal.history[0].winnerPlayerId, wFinalist.playerId);
    assert.equal(t.status, 'GRAND_FINAL');

    recordGrandFinalWin(t, lFinalist.playerId);
    assert.equal(lFinalist.wins, 1);
    assert.equal(t.grandFinal.history.length, 2);
    assert.equal(t.grandFinal.history[1].round, 2);
    assert.equal(t.grandFinal.history[1].winnerPlayerId, lFinalist.playerId);

    assert.throws(
      () => recordGrandFinalWin(t, 'non_finalist_id'),
      (err) => err instanceof ValidationError && err.statusCode === 400
    );
  });

  it('C14: Winners Bracket finalist reaching 3 wins immediately completes tournament as champion', () => {
    const t = createTournamentAtGrandFinal();
    const wFinalist = t.grandFinal.finalists.find((f) => f.origin === 'WINNERS');

    recordGrandFinalWin(t, wFinalist.playerId);
    assert.equal(t.status, 'GRAND_FINAL');
    recordGrandFinalWin(t, wFinalist.playerId);
    assert.equal(t.status, 'GRAND_FINAL');
    recordGrandFinalWin(t, wFinalist.playerId);

    assert.equal(wFinalist.wins, 3);
    assert.equal(t.status, 'COMPLETED');
    assert.equal(t.grandFinal.status, 'COMPLETED');
    assert.equal(t.championId, wFinalist.playerId);

    const championPlayer = t.players.find((p) => p.id === wFinalist.playerId);
    assert.equal(championPlayer.status, 'CHAMPION');

    // Recording another win after COMPLETED is blocked
    assert.throws(
      () => recordGrandFinalWin(t, wFinalist.playerId),
      (err) => err instanceof ConflictError && err.statusCode === 409
    );
  });

  it('C15: Losers Bracket finalist requires 6 wins to complete tournament as champion', () => {
    const t = createTournamentAtGrandFinal();
    const lFinalist = t.grandFinal.finalists.find((f) => f.origin === 'LOSERS');

    for (let round = 1; round <= 5; round++) {
      recordGrandFinalWin(t, lFinalist.playerId);
      assert.equal(lFinalist.wins, round);
      assert.equal(t.status, 'GRAND_FINAL', `Should not complete at ${round} wins for Losers finalist`);
      assert.equal(t.championId, null);
    }

    // 6th win resets bracket and wins the title
    recordGrandFinalWin(t, lFinalist.playerId);
    assert.equal(lFinalist.wins, 6);
    assert.equal(t.status, 'COMPLETED');
    assert.equal(t.grandFinal.status, 'COMPLETED');
    assert.equal(t.championId, lFinalist.playerId);
    assert.equal(t.players.find((p) => p.id === lFinalist.playerId).status, 'CHAMPION');
  });

  it('C16: undoing last grand final win decrements score and reverts COMPLETED to GRAND_FINAL', () => {
    const t = createTournamentAtGrandFinal();
    const wFinalist = t.grandFinal.finalists.find((f) => f.origin === 'WINNERS');

    recordGrandFinalWin(t, wFinalist.playerId);
    recordGrandFinalWin(t, wFinalist.playerId);
    recordGrandFinalWin(t, wFinalist.playerId);
    assert.equal(t.status, 'COMPLETED');
    assert.equal(t.championId, wFinalist.playerId);

    undoGrandFinalWin(t);
    assert.equal(wFinalist.wins, 2);
    assert.equal(t.status, 'GRAND_FINAL');
    assert.equal(t.grandFinal.status, 'READY');
    assert.equal(t.championId, null);
    assert.equal(t.grandFinal.history.length, 2);
    assert.equal(t.players.find((p) => p.id === wFinalist.playerId).status, 'FINALIST_WINNERS');

    undoGrandFinalWin(t);
    undoGrandFinalWin(t);
    assert.equal(wFinalist.wins, 0);
    assert.equal(t.grandFinal.history.length, 0);

    assert.throws(
      () => undoGrandFinalWin(t),
      (err) => err instanceof ValidationError && err.statusCode === 400
    );
  });
});

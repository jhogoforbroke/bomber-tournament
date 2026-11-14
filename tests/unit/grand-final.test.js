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
  undoGrandFinalWin,
  computeGrandFinalPodium
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

  it('GRAPH-C5: completing Grand Final computes 1st to 4th place podium ordered by wins, origin, and seed', () => {
    const t = createTournamentAtGrandFinal();
    assert.deepEqual(computeGrandFinalPodium(t), []);

    const [w1, w2] = t.grandFinal.finalists.filter((f) => f.origin === 'WINNERS');
    const [l1, l2] = t.grandFinal.finalists.filter((f) => f.origin === 'LOSERS');

    // l1 gets 4 wins, w2 gets 2 wins, l2 gets 2 wins, w1 gets 3 wins (champion)
    // Between w2 (2 wins, WINNERS) and l2 (2 wins, LOSERS), w2 must take 3rd place and l2 4th place
    for (let i = 0; i < 4; i++) recordGrandFinalWin(t, l1.playerId);
    for (let i = 0; i < 2; i++) recordGrandFinalWin(t, w2.playerId);
    for (let i = 0; i < 2; i++) recordGrandFinalWin(t, l2.playerId);
    for (let i = 0; i < 3; i++) recordGrandFinalWin(t, w1.playerId);

    assert.equal(t.status, 'COMPLETED');
    assert.ok(Array.isArray(t.grandFinal.podium));
    assert.equal(t.grandFinal.podium.length, 4);

    assert.deepEqual(
      t.grandFinal.podium.map((entry) => ({
        place: entry.place,
        playerId: entry.playerId,
        origin: entry.origin,
        wins: entry.wins,
        targetWins: entry.targetWins
      })),
      [
        { place: 1, playerId: w1.playerId, origin: 'WINNERS', wins: 3, targetWins: 3 },
        { place: 2, playerId: l1.playerId, origin: 'LOSERS', wins: 4, targetWins: 6 },
        { place: 3, playerId: w2.playerId, origin: 'WINNERS', wins: 2, targetWins: 3 },
        { place: 4, playerId: l2.playerId, origin: 'LOSERS', wins: 2, targetWins: 6 }
      ]
    );

    for (const entry of t.grandFinal.podium) {
      const player = t.players.find((p) => p.id === entry.playerId);
      assert.equal(entry.name, player.name);
      assert.equal(entry.color, player.color);
      assert.equal(entry.seed, player.seed);
    }
  });

  it('GRAPH-C7: undoing final Grand Final win reverts COMPLETED to GRAND_FINAL and clears podium', () => {
    const t = createTournamentAtGrandFinal();
    const [w1, w2] = t.grandFinal.finalists.filter((f) => f.origin === 'WINNERS');
    recordGrandFinalWin(t, w2.playerId);
    recordGrandFinalWin(t, w1.playerId);
    recordGrandFinalWin(t, w1.playerId);
    recordGrandFinalWin(t, w1.playerId);

    assert.equal(t.status, 'COMPLETED');
    assert.equal(t.grandFinal.podium.length, 4);
    assert.equal(t.grandFinal.podium[0].playerId, w1.playerId);

    undoGrandFinalWin(t);
    assert.equal(t.status, 'GRAND_FINAL');
    assert.deepEqual(t.grandFinal.podium, []);
    assert.deepEqual(computeGrandFinalPodium(t), []);
  });

  it('GRAPH-C11: non-champion finalists tied on wins and origin are ordered by ascending initial seed', () => {
    const t = createTournamentAtGrandFinal();
    const [w1] = t.grandFinal.finalists.filter((f) => f.origin === 'WINNERS');
    const [l1, l2] = t.grandFinal.finalists.filter((f) => f.origin === 'LOSERS');

    // Force l1 to have a larger seed than l2 to verify seed tie-breaker regardless of finalist array order
    const pL1 = t.players.find((p) => p.id === l1.playerId);
    const pL2 = t.players.find((p) => p.id === l2.playerId);
    pL1.seed = 15;
    pL2.seed = 3;

    // Both l1 and l2 get 1 win (tied on wins = 1 and origin = LOSERS); w1 wins 3 rounds to become champion
    recordGrandFinalWin(t, l1.playerId);
    recordGrandFinalWin(t, l2.playerId);
    recordGrandFinalWin(t, w1.playerId);
    recordGrandFinalWin(t, w1.playerId);
    recordGrandFinalWin(t, w1.playerId);

    const podium = computeGrandFinalPodium(t);
    assert.equal(podium.length, 4);
    // 1st is w1 (champion), 2nd is l2 (1 win, LOSERS, seed 3), 3rd is l1 (1 win, LOSERS, seed 15), 4th is w2 (0 wins, WINNERS)
    assert.equal(podium[0].playerId, w1.playerId);
    assert.equal(podium[1].playerId, l2.playerId);
    assert.equal(podium[1].seed, 3);
    assert.equal(podium[2].playerId, l1.playerId);
    assert.equal(podium[2].seed, 15);
  });
});

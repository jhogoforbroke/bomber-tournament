import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ValidationError,
  ConflictError,
  createTournament,
  addPlayer
} from '../../src/domain/tournament.js';
import {
  startTournament,
  recordMatchResult,
  undoMatchResult,
  findMatch
} from '../../src/domain/bracket.js';

function createSeededTournament(playerCount, name = `Cup ${playerCount}`) {
  const t = createTournament({ name });
  const colors = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'aqua'];
  for (let i = 1; i <= playerCount; i++) {
    addPlayer(t, { name: `Player_${i}`, color: colors[(i - 1) % colors.length] });
  }
  return t;
}

describe('T2: 4-Player Double Elimination Bracket Engine', () => {
  it('C5: starting a tournament with 16 or 20 players sets IN_PROGRESS, pads BOT/BYE to power of 2 and generates 4-slot matches', () => {
    const t16 = createSeededTournament(16);
    startTournament(t16);

    assert.equal(t16.status, 'IN_PROGRESS');
    assert.equal(t16.bracketSize, 16);
    assert.equal(t16.players.length, 16);
    assert.equal(t16.brackets.winners.length, 3); // WR1 (4), WR2 (2), WR3 (1)
    assert.equal(t16.brackets.winners[0].matches.length, 4);
    assert.equal(t16.brackets.winners[1].matches.length, 2);
    assert.equal(t16.brackets.winners[2].matches.length, 1);
    assert.equal(t16.brackets.losers.length, 4); // LR1 (2), LR2 (2), LR3 (1), LR4 (1)

    for (const round of [...t16.brackets.winners, ...t16.brackets.losers]) {
      for (const match of round.matches) {
        assert.equal(match.slots.length, 4);
      }
    }

    const t20 = createSeededTournament(20);
    startTournament(t20);
    assert.equal(t20.status, 'IN_PROGRESS');
    assert.equal(t20.bracketSize, 32);
    assert.equal(t20.players.filter((p) => !p.isBot).length, 20);
    assert.equal(t20.players.filter((p) => p.isBot).length, 12);
    assert.equal(t20.brackets.winners[0].matches.length, 8);
  });

  it('C7: recording a Winners match advances 2 winners to next Winners round and drops 2 losers to Losers bracket', () => {
    const t = createSeededTournament(16);
    startTournament(t);

    const wr1m1 = findMatch(t, 'W-R1-M1');
    const [p1, p2, p3, p4] = wr1m1.slots;

    recordMatchResult(t, 'W-R1-M1', [p1, p2]);

    assert.equal(wr1m1.status, 'COMPLETED');
    assert.deepEqual(wr1m1.winnerIds, [p1, p2]);
    assert.deepEqual(wr1m1.loserIds, [p3, p4]);

    const wr2m1 = findMatch(t, 'W-R2-M1');
    assert.equal(wr2m1.slots[0], p1);
    assert.equal(wr2m1.slots[1], p2);

    const lr1m1 = findMatch(t, 'L-R1-M1');
    assert.equal(lr1m1.slots[0], p3);
    assert.equal(lr1m1.slots[1], p4);

    const player3 = t.players.find((p) => p.id === p3);
    const player4 = t.players.find((p) => p.id === p4);
    assert.equal(player3.status, 'LOSERS');
    assert.equal(player4.status, 'LOSERS');
  });

  it('C8: recording a Losers match advances 2 winners and marks 2 losers as ELIMINATED', () => {
    const t = createSeededTournament(16);
    startTournament(t);

    const m1 = findMatch(t, 'W-R1-M1');
    const m2 = findMatch(t, 'W-R1-M2');
    recordMatchResult(t, 'W-R1-M1', [m1.slots[0], m1.slots[1]]);
    recordMatchResult(t, 'W-R1-M2', [m2.slots[0], m2.slots[1]]);

    const lr1m1 = findMatch(t, 'L-R1-M1');
    assert.equal(lr1m1.status, 'READY');
    const [l1, l2, l3, l4] = lr1m1.slots;

    recordMatchResult(t, 'L-R1-M1', [l1, l2]);
    assert.equal(lr1m1.status, 'COMPLETED');

    const lr2m1 = findMatch(t, 'L-R2-M1');
    assert.equal(lr2m1.slots[0], l1);
    assert.equal(lr2m1.slots[1], l2);

    assert.equal(t.players.find((p) => p.id === l3).status, 'ELIMINATED');
    assert.equal(t.players.find((p) => p.id === l4).status, 'ELIMINATED');
  });

  it('C9: matches with BOT/BYE forbid selecting BOT over human and auto-eliminate BOT/BYE first', () => {
    const t28 = createSeededTournament(28);
    startTournament(t28);

    // In 28-player tournament (bracketSize 32, 8 WR1 matches), 4 matches have 3 humans + 1 BOT
    const matchWithOneBot = t28.brackets.winners[0].matches.find((m) => {
      const bots = m.slots.filter((id) => t28.players.find((p) => p.id === id)?.isBot);
      return bots.length === 1;
    });
    assert.ok(matchWithOneBot);
    assert.equal(matchWithOneBot.status, 'READY');

    const botId = matchWithOneBot.slots.find((id) => t28.players.find((p) => p.id === id)?.isBot);
    const humanIds = matchWithOneBot.slots.filter((id) => !t28.players.find((p) => p.id === id)?.isBot);

    assert.throws(
      () => recordMatchResult(t28, matchWithOneBot.id, [humanIds[0], botId]),
      (err) => err instanceof ValidationError && err.statusCode === 400 && /BOT/i.test(err.message)
    );

    // Selecting 2 humans succeeds and puts the BOT in loserIds
    recordMatchResult(t28, matchWithOneBot.id, [humanIds[0], humanIds[1]]);
    assert.equal(matchWithOneBot.status, 'COMPLETED');
    assert.ok(matchWithOneBot.loserIds.includes(botId));
  });

  it('C10: recording a match with winner count != 2 or not READY throws ValidationError 400', () => {
    const t = createSeededTournament(16);
    startTournament(t);

    const wr1m1 = findMatch(t, 'W-R1-M1');
    assert.throws(
      () => recordMatchResult(t, 'W-R1-M1', [wr1m1.slots[0]]),
      (err) => err instanceof ValidationError && err.statusCode === 400
    );
    assert.throws(
      () => recordMatchResult(t, 'W-R1-M1', [wr1m1.slots[0], wr1m1.slots[0]]),
      (err) => err instanceof ValidationError && err.statusCode === 400
    );
    assert.throws(
      () => recordMatchResult(t, 'W-R2-M1', ['invalid_1', 'invalid_2']),
      (err) => err instanceof ValidationError && err.statusCode === 400
    );
  });

  it('C11: completing Winners Final and Losers Final transitions tournament to GRAND_FINAL with 2 WINNERS (target 3) and 2 LOSERS (target 6)', () => {
    const t = createSeededTournament(16);
    startTournament(t);

    // Play all matches round by round until GRAND_FINAL
    let safety = 0;
    while (t.status === 'IN_PROGRESS' && safety < 50) {
      safety++;
      const allMatches = [
        ...t.brackets.winners.flatMap((r) => r.matches),
        ...t.brackets.losers.flatMap((r) => r.matches)
      ];
      const readyMatch = allMatches.find((m) => m.status === 'READY');
      assert.ok(readyMatch, 'Expected at least one READY match while IN_PROGRESS');
      const humans = readyMatch.slots.filter((id) => !t.players.find((p) => p.id === id)?.isBot);
      recordMatchResult(t, readyMatch.id, [humans[0], humans[1]]);
    }

    assert.equal(t.status, 'GRAND_FINAL');
    assert.equal(t.grandFinal.status, 'READY');
    assert.equal(t.grandFinal.finalists.length, 4);
    const winnersFinalists = t.grandFinal.finalists.filter((f) => f.origin === 'WINNERS');
    const losersFinalists = t.grandFinal.finalists.filter((f) => f.origin === 'LOSERS');
    assert.equal(winnersFinalists.length, 2);
    assert.equal(losersFinalists.length, 2);
    assert.ok(winnersFinalists.every((f) => f.targetWins === 3 && f.wins === 0));
    assert.ok(losersFinalists.every((f) => f.targetWins === 6 && f.wins === 0));

    const eliminatedCount = t.players.filter((p) => !p.isBot && p.status === 'ELIMINATED').length;
    assert.equal(eliminatedCount, 12);
  });

  it('C18: undoing a completed match with unplayed target matches clears target slots and restores READY', () => {
    const t = createSeededTournament(16);
    startTournament(t);

    const m1 = findMatch(t, 'W-R1-M1');
    const m2 = findMatch(t, 'W-R1-M2');
    recordMatchResult(t, 'W-R1-M1', [m1.slots[0], m1.slots[1]]);
    recordMatchResult(t, 'W-R1-M2', [m2.slots[0], m2.slots[1]]);

    assert.equal(findMatch(t, 'W-R2-M1').status, 'READY');
    assert.equal(findMatch(t, 'L-R1-M1').status, 'READY');

    undoMatchResult(t, 'W-R1-M1');

    assert.equal(m1.status, 'READY');
    assert.deepEqual(m1.winnerIds, []);
    assert.deepEqual(m1.loserIds, []);
    assert.equal(findMatch(t, 'W-R2-M1').slots[0], null);
    assert.equal(findMatch(t, 'W-R2-M1').slots[1], null);
    assert.equal(findMatch(t, 'W-R2-M1').status, 'PENDING');
    assert.equal(findMatch(t, 'L-R1-M1').slots[0], null);
    assert.equal(findMatch(t, 'L-R1-M1').slots[1], null);
    assert.equal(findMatch(t, 'L-R1-M1').status, 'PENDING');
  });

  it('C19: undoing a match whose dependent match is already COMPLETED throws ConflictError 409', () => {
    const t = createSeededTournament(16);
    startTournament(t);

    const m1 = findMatch(t, 'W-R1-M1');
    const m2 = findMatch(t, 'W-R1-M2');
    recordMatchResult(t, 'W-R1-M1', [m1.slots[0], m1.slots[1]]);
    recordMatchResult(t, 'W-R1-M2', [m2.slots[0], m2.slots[1]]);

    const wr2m1 = findMatch(t, 'W-R2-M1');
    recordMatchResult(t, 'W-R2-M1', [wr2m1.slots[0], wr2m1.slots[1]]);

    assert.throws(
      () => undoMatchResult(t, 'W-R1-M1'),
      (err) => err instanceof ConflictError && err.statusCode === 409 && /dependente|concluída/i.test(err.message)
    );
  });

  it('C23: 20, 24 and 28 player tournaments distribute BOT/BYE in trailing slots and eliminate them first', () => {
    for (const count of [20, 24, 28]) {
      const t = createSeededTournament(count);
      startTournament(t);

      for (const m of t.brackets.winners[0].matches) {
        const isBotFlags = m.slots.map((id) => Boolean(t.players.find((p) => p.id === id)?.isBot));
        // No false after true: humans always occupy leading slots, bots occupy trailing slots
        const firstBotIdx = isBotFlags.indexOf(true);
        if (firstBotIdx !== -1) {
          for (let i = firstBotIdx; i < 4; i++) {
            assert.equal(isBotFlags[i], true, `Expected trailing slot ${i} to be BOT in ${count}-player tournament`);
          }
        }
      }

      // Run tournament to GRAND_FINAL and verify all 4 finalists are human players
      let safety = 0;
      while (t.status === 'IN_PROGRESS' && safety < 100) {
        safety++;
        const allMatches = [
          ...t.brackets.winners.flatMap((r) => r.matches),
          ...t.brackets.losers.flatMap((r) => r.matches)
        ];
        const readyMatch = allMatches.find((m) => m.status === 'READY');
        assert.ok(readyMatch);
        const humans = readyMatch.slots.filter((id) => !t.players.find((p) => p.id === id)?.isBot);
        recordMatchResult(t, readyMatch.id, [humans[0], humans[1]]);
      }

      assert.equal(t.status, 'GRAND_FINAL');
      for (const finalist of t.grandFinal.finalists) {
        const p = t.players.find((pl) => pl.id === finalist.playerId);
        assert.equal(p.isBot, false);
      }
    }
  });
});

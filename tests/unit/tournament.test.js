import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOMBERMAN_COLORS,
  ValidationError,
  ConflictError,
  NotFoundError,
  createTournament,
  addPlayer,
  removePlayer,
  shufflePlayers,
  reorderPlayers,
  validateCanStart
} from '../../src/domain/tournament.js';

describe('T1: Tournament & Player Seeding Domain', () => {
  it('creates a tournament in DRAFT status with empty players and bracket structures (TOURN-01)', () => {
    const t = createTournament({ name: 'Super Bomberman Cup' });
    assert.equal(t.name, 'Super Bomberman Cup');
    assert.equal(t.status, 'DRAFT');
    assert.equal(t.championId, null);
    assert.equal(t.bracketSize, null);
    assert.deepEqual(t.players, []);
    assert.deepEqual(t.brackets, { winners: [], losers: [] });
    assert.equal(t.grandFinal.status, 'PENDING');
    assert.deepEqual(t.grandFinal.finalists, []);
    assert.ok(t.id.startsWith('tourn_'));
  });

  it('C2: adding a player in DRAFT with valid Bomberman color registers the player', () => {
    const t = createTournament({ name: 'Arena 1' });
    for (let i = 0; i < BOMBERMAN_COLORS.length; i++) {
      const color = BOMBERMAN_COLORS[i];
      addPlayer(t, { name: `Bomber_${color}`, color });
    }
    assert.equal(t.players.length, 8);
    assert.equal(t.players[0].name, 'Bomber_white');
    assert.equal(t.players[0].color, 'white');
    assert.equal(t.players[0].seed, 1);
    assert.equal(t.players[0].isBot, false);
    assert.equal(t.players[0].status, 'ACTIVE');
    assert.equal(t.players[7].color, 'aqua');
    assert.equal(t.players[7].seed, 8);
  });

  it('C3: adding a player with empty or duplicate name throws ValidationError 400', () => {
    const t = createTournament({ name: 'Arena Validacao' });
    addPlayer(t, { name: 'Shirobon', color: 'white' });

    assert.throws(
      () => addPlayer(t, { name: '   ', color: 'black' }),
      (err) => err instanceof ValidationError && err.statusCode === 400 && /nome/i.test(err.message)
    );

    assert.throws(
      () => addPlayer(t, { name: 'shirobon', color: 'red' }),
      (err) => err instanceof ValidationError && err.statusCode === 400 && /duplicado|já existe/i.test(err.message)
    );

    assert.throws(
      () => addPlayer(t, { name: 'Kurobon', color: 'invalid_color' }),
      (err) => err instanceof ValidationError && err.statusCode === 400 && /cor/i.test(err.message)
    );
  });

  it('C4: shuffling or manually reordering players in DRAFT updates seed order', () => {
    const t = createTournament({ name: 'Arena Seeding' });
    const p1 = addPlayer(t, { name: 'Player 1', color: 'white' });
    const p2 = addPlayer(t, { name: 'Player 2', color: 'black' });
    const p3 = addPlayer(t, { name: 'Player 3', color: 'red' });
    const p4 = addPlayer(t, { name: 'Player 4', color: 'blue' });

    // Manual reorder: reverse order
    reorderPlayers(t, [p4.id, p3.id, p2.id, p1.id]);
    assert.deepEqual(
      t.players.map((p) => ({ id: p.id, seed: p.seed })),
      [
        { id: p4.id, seed: 1 },
        { id: p3.id, seed: 2 },
        { id: p2.id, seed: 3 },
        { id: p1.id, seed: 4 }
      ]
    );

    // Deterministic shuffle using custom RNG that always picks index 0
    shufflePlayers(t, () => 0);
    assert.equal(t.players.length, 4);
    assert.deepEqual(t.players.map((p) => p.seed), [1, 2, 3, 4]);

    // Removing a player re-normalizes seeds
    removePlayer(t, p3.id);
    assert.equal(t.players.length, 3);
    assert.deepEqual(t.players.map((p) => p.seed), [1, 2, 3]);
  });

  it('C6: starting a tournament with invalid player count (<16, >64, or not multiple of 4) throws ValidationError 400', () => {
    const tTooFew = createTournament({ name: 'Too Few' });
    for (let i = 1; i <= 12; i++) {
      addPlayer(tTooFew, { name: `P${i}`, color: 'white' });
    }
    assert.throws(
      () => validateCanStart(tTooFew),
      (err) => err instanceof ValidationError && err.statusCode === 400 && /16/.test(err.message)
    );

    const tNotMultipleOf4 = createTournament({ name: 'Not Multiple of 4' });
    for (let i = 1; i <= 18; i++) {
      addPlayer(tNotMultipleOf4, { name: `P${i}`, color: 'red' });
    }
    assert.throws(
      () => validateCanStart(tNotMultipleOf4),
      (err) => err instanceof ValidationError && err.statusCode === 400 && /múltiplo de 4/i.test(err.message)
    );

    const tTooMany = createTournament({ name: 'Too Many' });
    for (let i = 1; i <= 68; i++) {
      addPlayer(tTooMany, { name: `P${i}`, color: 'blue' });
    }
    assert.throws(
      () => validateCanStart(tTooMany),
      (err) => err instanceof ValidationError && err.statusCode === 400 && /64/.test(err.message)
    );

    const tValid20 = createTournament({ name: 'Valid 20' });
    for (let i = 1; i <= 20; i++) {
      addPlayer(tValid20, { name: `P${i}`, color: 'green' });
    }
    assert.equal(validateCanStart(tValid20), true);
    assert.ok(ConflictError);
    assert.ok(NotFoundError);
  });
});

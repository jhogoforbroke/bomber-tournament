import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../../src/server/app.js';

async function startTestServer(dataDir) {
  const app = createApp({ dataDir });
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}`
      });
    });
  });
}

async function createStarted16PlayerTournament(baseUrl) {
  const created = await (
    await fetch(`${baseUrl}/api/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bomber Match Routes Cup' })
    })
  ).json();

  const colors = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'aqua'];
  const players = [];
  for (let i = 1; i <= 16; i++) {
    players.push({ name: `Bomber_${i}`, color: colors[(i - 1) % 8] });
  }
  await fetch(`${baseUrl}/api/tournaments/${created.id}/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ players })
  });

  const startRes = await fetch(`${baseUrl}/api/tournaments/${created.id}/start`, {
    method: 'POST'
  });
  assert.equal(startRes.status, 200);
  return startRes.json();
}

describe('T6: Express Match Progression, Undo & Grand Final Routes', () => {
  let tempDir;
  let server;
  let baseUrl;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bomber-api-t6-'));
    const started = await startTestServer(path.join(tempDir, 'tournaments'));
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('records match results and rejects invalid winner selection with 400', async () => {
    const t = await createStarted16PlayerTournament(baseUrl);
    const m1 = t.brackets.winners[0].matches[0];

    const badRes = await fetch(
      `${baseUrl}/api/tournaments/${t.id}/matches/${m1.id}/result`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerIds: [m1.slots[0]] })
      }
    );
    assert.equal(badRes.status, 400);

    const okRes = await fetch(
      `${baseUrl}/api/tournaments/${t.id}/matches/${m1.id}/result`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerIds: [m1.slots[0], m1.slots[1]] })
      }
    );
    assert.equal(okRes.status, 200);
    const updated = await okRes.json();
    assert.equal(updated.brackets.winners[0].matches[0].status, 'COMPLETED');
  });

  it('supports match undo (200) and blocks undo with 409 when dependent match is completed', async () => {
    const t = await createStarted16PlayerTournament(baseUrl);
    const m1 = t.brackets.winners[0].matches[0];
    const m2 = t.brackets.winners[0].matches[1];

    await fetch(`${baseUrl}/api/tournaments/${t.id}/matches/${m1.id}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerIds: [m1.slots[0], m1.slots[1]] })
    });
    const afterM2 = await (
      await fetch(`${baseUrl}/api/tournaments/${t.id}/matches/${m2.id}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerIds: [m2.slots[0], m2.slots[1]] })
      })
    ).json();

    // Undo m1 before WR2-M1 is played -> 200
    const undoOk = await fetch(
      `${baseUrl}/api/tournaments/${t.id}/matches/${m1.id}/undo`,
      { method: 'POST' }
    );
    assert.equal(undoOk.status, 200);

    // Re-record m1 and complete WR2-M1
    const reDone = await (
      await fetch(`${baseUrl}/api/tournaments/${t.id}/matches/${m1.id}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerIds: [m1.slots[0], m1.slots[1]] })
      })
    ).json();
    const wr2m1 = reDone.brackets.winners[1].matches[0];
    await fetch(`${baseUrl}/api/tournaments/${t.id}/matches/${wr2m1.id}/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerIds: [wr2m1.slots[0], wr2m1.slots[1]] })
    });

    // Undo m1 now must return 409 Conflict
    const undoConflict = await fetch(
      `${baseUrl}/api/tournaments/${t.id}/matches/${m1.id}/undo`,
      { method: 'POST' }
    );
    assert.equal(undoConflict.status, 409);
    assert.ok(afterM2);
  });

  it('progresses full tournament to Grand Final and crowns Winners finalist at 3 wins', async () => {
    let t = await createStarted16PlayerTournament(baseUrl);

    while (t.status === 'IN_PROGRESS') {
      const allMatches = [
        ...t.brackets.winners.flatMap((r) => r.matches),
        ...t.brackets.losers.flatMap((r) => r.matches)
      ];
      const ready = allMatches.find((m) => m.status === 'READY');
      const res = await fetch(
        `${baseUrl}/api/tournaments/${t.id}/matches/${ready.id}/result`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ winnerIds: [ready.slots[0], ready.slots[1]] })
        }
      );
      assert.equal(res.status, 200);
      t = await res.json();
    }

    assert.equal(t.status, 'GRAND_FINAL');
    const winnersFinalist = t.grandFinal.finalists.find((f) => f.origin === 'WINNERS');

    for (let i = 1; i <= 3; i++) {
      const winRes = await fetch(`${baseUrl}/api/tournaments/${t.id}/grand-final/win`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: winnersFinalist.playerId })
      });
      assert.equal(winRes.status, 200);
      t = await winRes.json();
    }

    assert.equal(t.status, 'COMPLETED');
    assert.equal(t.championId, winnersFinalist.playerId);
  });

  it('supports Grand Final undo and requires 6 wins for Losers Bracket finalist via API', async () => {
    let t = await createStarted16PlayerTournament(baseUrl);

    while (t.status === 'IN_PROGRESS') {
      const allMatches = [
        ...t.brackets.winners.flatMap((r) => r.matches),
        ...t.brackets.losers.flatMap((r) => r.matches)
      ];
      const ready = allMatches.find((m) => m.status === 'READY');
      t = await (
        await fetch(`${baseUrl}/api/tournaments/${t.id}/matches/${ready.id}/result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ winnerIds: [ready.slots[0], ready.slots[1]] })
        })
      ).json();
    }

    const losersFinalist = t.grandFinal.finalists.find((f) => f.origin === 'LOSERS');

    for (let i = 1; i <= 6; i++) {
      const winRes = await fetch(`${baseUrl}/api/tournaments/${t.id}/grand-final/win`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: losersFinalist.playerId })
      });
      assert.equal(winRes.status, 200);
      t = await winRes.json();
      if (i < 6) {
        assert.equal(t.status, 'GRAND_FINAL');
      }
    }

    assert.equal(t.status, 'COMPLETED');
    assert.equal(t.championId, losersFinalist.playerId);

    // Undo 6th win -> reverts to GRAND_FINAL with 5 wins
    const undoRes = await fetch(`${baseUrl}/api/tournaments/${t.id}/grand-final/undo`, {
      method: 'POST'
    });
    assert.equal(undoRes.status, 200);
    t = await undoRes.json();
    assert.equal(t.status, 'GRAND_FINAL');
    assert.equal(t.championId, null);
    assert.equal(
      t.grandFinal.finalists.find((f) => f.playerId === losersFinalist.playerId).wins,
      5
    );
  });
});

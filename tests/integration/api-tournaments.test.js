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

describe('T5: Express App & Tournament Setup REST Endpoints', () => {
  let tempDir;
  let server;
  let baseUrl;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bomber-api-t5-'));
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

  it('creates, lists, loads, and deletes tournaments via Express REST endpoints', async () => {
    const createRes = await fetch(`${baseUrl}/api/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Super Bomberman 4P' })
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    assert.equal(created.name, 'Super Bomberman 4P');
    assert.equal(created.status, 'DRAFT');

    const listRes = await fetch(`${baseUrl}/api/tournaments`);
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, created.id);

    const getRes = await fetch(`${baseUrl}/api/tournaments/${created.id}`);
    assert.equal(getRes.status, 200);
    const loaded = await getRes.json();
    assert.equal(loaded.id, created.id);

    const delRes = await fetch(`${baseUrl}/api/tournaments/${created.id}`, {
      method: 'DELETE'
    });
    assert.equal(delRes.status, 200);
    const afterList = await (await fetch(`${baseUrl}/api/tournaments`)).json();
    assert.equal(afterList.length, 0);
  });

  it('registers players, supports batch add, shuffles, reorders, and removes players in DRAFT', async () => {
    const t = await (
      await fetch(`${baseUrl}/api/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Seeding Test Cup' })
      })
    ).json();

    const p1Res = await fetch(`${baseUrl}/api/tournaments/${t.id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'White Bomber', color: 'white' })
    });
    assert.equal(p1Res.status, 201);

    // Duplicate player returns 400
    const dupRes = await fetch(`${baseUrl}/api/tournaments/${t.id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'white bomber', color: 'black' })
    });
    assert.equal(dupRes.status, 400);

    const p2Res = await fetch(`${baseUrl}/api/tournaments/${t.id}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Black Bomber', color: 'black' })
    });
    assert.equal(p2Res.status, 201);
    const updated = await p2Res.json();
    assert.equal(updated.players.length, 2);

    // Reorder players
    const reversedIds = [updated.players[1].id, updated.players[0].id];
    const reorderRes = await fetch(`${baseUrl}/api/tournaments/${t.id}/players/order`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerIds: reversedIds })
    });
    assert.equal(reorderRes.status, 200);
    const reordered = await reorderRes.json();
    assert.equal(reordered.players[0].id, reversedIds[0]);

    // Shuffle players
    const shuffleRes = await fetch(`${baseUrl}/api/tournaments/${t.id}/shuffle`, {
      method: 'POST'
    });
    assert.equal(shuffleRes.status, 200);

    // Delete one player
    const delPlayerRes = await fetch(
      `${baseUrl}/api/tournaments/${t.id}/players/${reversedIds[0]}`,
      { method: 'DELETE' }
    );
    assert.equal(delPlayerRes.status, 200);
    const afterDel = await delPlayerRes.json();
    assert.equal(afterDel.players.length, 1);
  });

  it('validates 16..64 multiples of 4 when starting tournament and starts when valid', async () => {
    const t = await (
      await fetch(`${baseUrl}/api/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Start Validation Cup' })
      })
    ).json();

    // Attempt start with 0 players -> 400
    const badStart = await fetch(`${baseUrl}/api/tournaments/${t.id}/start`, {
      method: 'POST'
    });
    assert.equal(badStart.status, 400);

    // Add 16 players via batch or individual calls
    const colors = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'aqua'];
    for (let i = 1; i <= 16; i++) {
      const r = await fetch(`${baseUrl}/api/tournaments/${t.id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Bomber_${i}`, color: colors[(i - 1) % 8] })
      });
      assert.equal(r.status, 201);
    }

    const okStart = await fetch(`${baseUrl}/api/tournaments/${t.id}/start`, {
      method: 'POST'
    });
    assert.equal(okStart.status, 200);
    const started = await okStart.json();
    assert.equal(started.status, 'IN_PROGRESS');
    assert.equal(started.brackets.winners[0].matches.length, 4);
  });

  it('C22: requesting non-existent tournament or match ID returns HTTP 404 JSON error', async () => {
    const resTournament = await fetch(`${baseUrl}/api/tournaments/tourn_missing`);
    assert.equal(resTournament.status, 404);
    const bodyTournament = await resTournament.json();
    assert.ok(bodyTournament.error);

    const t = await (
      await fetch(`${baseUrl}/api/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Cup 404 Match' })
      })
    ).json();
    for (let i = 1; i <= 16; i++) {
      await fetch(`${baseUrl}/api/tournaments/${t.id}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `P_${i}`, color: 'white' })
      });
    }
    await fetch(`${baseUrl}/api/tournaments/${t.id}/start`, { method: 'POST' });

    const resMatch = await fetch(
      `${baseUrl}/api/tournaments/${t.id}/matches/W-R99-M99/result`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerIds: ['p1', 'p2'] })
      }
    );
    assert.equal(resMatch.status, 404);
    const bodyMatch = await resMatch.json();
    assert.ok(bodyMatch.error);
  });
});

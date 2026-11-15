import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createApp } from '../../src/server/app.js';
import {
  renderSeedingHtml,
  renderBracketHtml,
  renderGrandFinalHtml,
  renderPlayersStatusHtml,
  createSpaStore
} from '../../public/app.js';

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

describe('T8: Interactive Bomberman SPA Client Controller', () => {
  let tempDir;
  let server;
  let baseUrl;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bomber-ui-t8-'));
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

  it('C20: web interface serves Bomberman arcade theme, SVG sprites for 8 colors, and interactive SPA controller', async () => {
    const [htmlRes, cssRes, jsRes] = await Promise.all([
      fetch(`${baseUrl}/`),
      fetch(`${baseUrl}/styles.css`),
      fetch(`${baseUrl}/app.js`)
    ]);

    assert.equal(htmlRes.status, 200);
    assert.equal(cssRes.status, 200);
    assert.equal(jsRes.status, 200);
    assert.match(jsRes.headers.get('content-type') || '', /javascript/i);

    const html = await htmlRes.text();
    const css = await cssRes.text();
    const js = await jsRes.text();

    // Verify 8 Bomberman SVG sprites in HTML and arcade tokens in CSS
    for (const color of ['white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'aqua']) {
      assert.ok(html.includes(`id="sprite-bomber-${color}"`));
      assert.ok(css.includes(`--bomber-${color}`));
    }
    assert.ok(js.includes('/api/tournaments'));

    // Exercise the interactive SPA controller store against the live Express server
    const store = createSpaStore({ baseUrl, fetchImpl: fetch });

    // 1. Create tournament in DRAFT
    await store.createTournament('Copa Bomberman Arcade');
    assert.equal(store.getState().activeTournament.name, 'Copa Bomberman Arcade');
    assert.equal(store.getState().activeTournament.status, 'DRAFT');

    // 2. Quick-fill 16 players and render seeding view
    await store.quickFillPlayers(16);
    assert.equal(store.getState().activeTournament.players.length, 16);
    const seedingMarkup = renderSeedingHtml(store.getState().activeTournament);
    assert.ok(seedingMarkup.includes('#1'));
    assert.ok(seedingMarkup.includes('#16'));
    assert.ok(seedingMarkup.includes('#sprite-bomber-white'));

    // 3. Shuffle and reorder players via controller actions
    const firstBeforeMove = store.getState().activeTournament.players[0].id;
    const secondBeforeMove = store.getState().activeTournament.players[1].id;
    await store.movePlayer(firstBeforeMove, 1);
    assert.equal(store.getState().activeTournament.players[0].id, secondBeforeMove);
    assert.equal(store.getState().activeTournament.players[1].id, firstBeforeMove);

    // 4. Start tournament -> transitions to IN_PROGRESS and renders Winners & Losers brackets
    await store.startActiveTournament();
    assert.equal(store.getState().activeTournament.status, 'IN_PROGRESS');

    const winnersMarkup = renderBracketHtml(
      store.getState().activeTournament,
      'winners',
      store.getState().matchSelections
    );
    assert.ok(winnersMarkup.includes('W-R1-M1'));
    assert.ok(winnersMarkup.includes('CONFIRMAR 2 VENCEDORES'));
  });

  it('drives interactive match selection, undo, and Grand Final 3 vs 6 handicap through to Champion banner', async () => {
    const store = createSpaStore({ baseUrl, fetchImpl: fetch });
    await store.createTournament('Torneio Final 3x6');
    await store.quickFillPlayers(16);
    await store.startActiveTournament();

    // Select 2 survivors in W-R1-M1 using toggleMatchWinner gesture
    const m1 = store.getState().activeTournament.brackets.winners[0].matches[0];
    store.toggleMatchWinner(m1.id, m1.slots[0]);
    store.toggleMatchWinner(m1.id, m1.slots[1]);
    assert.deepEqual(store.getSelectedWinners(m1.id), [m1.slots[0], m1.slots[1]]);

    // Submit match result via controller action
    await store.submitMatchWinners(m1.id);
    assert.equal(
      store.getState().activeTournament.brackets.winners[0].matches[0].status,
      'COMPLETED'
    );

    const completedMatchHtml = renderBracketHtml(
      store.getState().activeTournament,
      'winners',
      store.getState().matchSelections
    );
    assert.ok(completedMatchHtml.includes('DESFAZER PARTIDA'));

    // Undo match result via controller action and verify it returns to READY
    await store.undoMatch(m1.id);
    assert.equal(
      store.getState().activeTournament.brackets.winners[0].matches[0].status,
      'READY'
    );

    // Complete all matches to reach GRAND_FINAL
    while (store.getState().activeTournament.status === 'IN_PROGRESS') {
      const t = store.getState().activeTournament;
      const allMatches = [
        ...t.brackets.winners.flatMap((r) => r.matches),
        ...t.brackets.losers.flatMap((r) => r.matches)
      ];
      const nextReady = allMatches.find((m) => m.status === 'READY');
      const humanSlots = nextReady.slots.filter((pid) => {
        const p = t.players.find((pl) => pl.id === pid);
        return p && !p.isBot;
      });
      store.toggleMatchWinner(nextReady.id, humanSlots[0]);
      store.toggleMatchWinner(nextReady.id, humanSlots[1]);
      await store.submitMatchWinners(nextReady.id);
    }

    assert.equal(store.getState().activeTournament.status, 'GRAND_FINAL');
    const gfMarkupBefore = renderGrandFinalHtml(store.getState().activeTournament);
    assert.ok(gfMarkupBefore.includes('META: 3 VITÓRIAS'));
    assert.ok(gfMarkupBefore.includes('META: 6 VITÓRIAS'));

    // Record 3 wins for a Winners Bracket finalist -> crowns Champion
    const winnersFinalist = store
      .getState()
      .activeTournament.grandFinal.finalists.find((f) => f.origin === 'WINNERS');
    await store.recordFinalistWin(winnersFinalist.playerId);
    await store.recordFinalistWin(winnersFinalist.playerId);
    await store.recordFinalistWin(winnersFinalist.playerId);

    assert.equal(store.getState().activeTournament.status, 'COMPLETED');
    assert.equal(store.getState().activeTournament.championId, winnersFinalist.playerId);

    const statusMarkup = renderPlayersStatusHtml(store.getState().activeTournament);
    assert.ok(statusMarkup.includes('CAMPEÃO'));

    // Undo last Grand Final win -> reverts to GRAND_FINAL with 2 wins
    await store.undoLastGrandFinalWin();
    assert.equal(store.getState().activeTournament.status, 'GRAND_FINAL');
    const updatedFinalist = store
      .getState()
      .activeTournament.grandFinal.finalists.find(
        (f) => f.playerId === winnersFinalist.playerId
      );
    assert.equal(updatedFinalist.wins, 2);
  });
});

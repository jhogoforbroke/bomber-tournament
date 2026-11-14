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
  computePodiumFromTournament,
  renderBracketPodiumHtml,
  renderBracketGraphHtml,
  buildTournamentBracketSvg,
  exportTournamentBracketPng,
  createSpaStore,
  mountDomApp
} from '../../public/app.js';

function createTestDomHarness() {
  const elements = new Map();
  const downloadedLinks = [];

  function makeClassList(initialHidden = false) {
    const set = new Set(initialHidden ? ['hidden'] : []);
    return {
      toggle(cls, force) {
        const shouldHave = force === undefined ? !set.has(cls) : Boolean(force);
        if (shouldHave) set.add(cls);
        else set.delete(cls);
      },
      contains(cls) {
        return set.has(cls);
      }
    };
  }

  function makeElement(id, initialHidden = false) {
    const listeners = {};
    const el = {
      id,
      value: '',
      textContent: '',
      innerHTML: '',
      className: initialHidden ? 'hidden' : '',
      disabled: id === 'download-bracket-image-btn',
      dataset: {},
      classList: makeClassList(initialHidden),
      addEventListener(type, fn) {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      dispatch(type, eventObj = {}) {
        for (const fn of listeners[type] || []) {
          fn({
            preventDefault() {},
            stopPropagation() {},
            target: { closest: () => null },
            ...eventObj
          });
        }
      },
      querySelectorAll() {
        return tabButtons;
      }
    };
    elements.set(id, el);
    return el;
  }

  const tabButtons = [
    'seeding',
    'winners',
    'losers',
    'grand-final',
    'players',
    'bracket-graph'
  ].map((tab) => ({
    dataset: { tab },
    classList: makeClassList(false)
  }));

  const ids = [
    ['active-tournament-badge', false],
    ['alert-banner', true],
    ['create-tournament-form', false],
    ['tournament-name-input', false],
    ['tournament-list', false],
    ['champion-banner', true],
    ['phase-tabs', false],
    ['seeding-section', false],
    ['winners-section', true],
    ['losers-section', true],
    ['grand-final-section', true],
    ['players-section', true],
    ['bracket-graph-section', true],
    ['seeding-counter', false],
    ['add-player-form', false],
    ['player-name-input', false],
    ['quick-fill-16-btn', false],
    ['quick-fill-20-btn', false],
    ['shuffle-players-btn', false],
    ['start-tournament-btn', false],
    ['seeding-players-list', false],
    ['winners-bracket-container', false],
    ['losers-bracket-container', false],
    ['grand-final-container', false],
    ['undo-grand-final-btn', false],
    ['players-status-container', false],
    ['download-bracket-image-btn', false],
    ['bracket-podium-banner', true],
    ['bracket-graph-container', false]
  ];
  for (const [id, hidden] of ids) {
    makeElement(id, hidden);
  }

  const doc = {
    getElementById(id) {
      return elements.get(id) || null;
    },
    createElement(tag) {
      if (tag === 'canvas') {
        const ctxCalls = [];
        return {
          width: 0,
          height: 0,
          getContext() {
            return {
              fillStyle: '',
              strokeStyle: '',
              lineWidth: 1,
              font: '',
              fillRect(...args) {
                ctxCalls.push(['fillRect', ...args]);
              },
              strokeRect(...args) {
                ctxCalls.push(['strokeRect', ...args]);
              },
              fillText(...args) {
                ctxCalls.push(['fillText', ...args]);
              }
            };
          }
        };
      }
      if (tag === 'a') {
        return {
          download: '',
          href: '',
          click() {
            downloadedLinks.push({ download: this.download, href: this.href });
          }
        };
      }
      return {};
    }
  };

  return { doc, elements, tabButtons, downloadedLinks };
}

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

  it('COLOR-C5: addSinglePlayer and quickFillPlayers omit client color and receive balanced random colors', async () => {
    const capturedBodies = [];
    const wrappedFetch = async (url, options = {}) => {
      if (String(url).endsWith('/players') && options.method === 'POST' && options.body) {
        capturedBodies.push(JSON.parse(options.body));
      }
      return fetch(url, options);
    };

    const store = createSpaStore({ baseUrl, fetchImpl: wrappedFetch });
    await store.createTournament('Copa Cores Aleatorias');

    // Add 1 player via addSinglePlayer(name) without color argument
    await store.addSinglePlayer('Shirobon');
    assert.equal(capturedBodies.length, 1);
    assert.deepEqual(capturedBodies[0], { name: 'Shirobon' });

    // Quick-fill remaining 15 players to reach 16
    await store.quickFillPlayers(16);
    assert.equal(capturedBodies.length, 2);
    assert.equal(Array.isArray(capturedBodies[1].players), true);
    assert.equal(capturedBodies[1].players.length, 15);
    for (const item of capturedBodies[1].players) {
      assert.equal(Object.prototype.hasOwnProperty.call(item, 'color'), false);
    }

    // Verify all 16 players received balanced random colors (exactly 2 of each of the 8 colors)
    const players = store.getState().activeTournament.players;
    assert.equal(players.length, 16);
    const allowedColors = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'aqua'];
    const colorCounts = Object.fromEntries(allowedColors.map((c) => [c, 0]));
    for (const p of players) {
      assert.ok(allowedColors.includes(p.color));
      colorCounts[p.color]++;
    }
    for (const c of allowedColors) {
      assert.equal(colorCounts[c], 2);
    }
  });

  it('GRAPH-C2: DRAFT tournament renders empty state in bracket graph and keeps download button disabled', async () => {
    const { doc, elements } = createTestDomHarness();
    const store = mountDomApp(doc, { baseUrl, fetchImpl: fetch });
    await store.createTournament('Copa Draft Graph');

    // Click the bracket-graph tab button in #phase-tabs
    const graphTabBtn = { dataset: { tab: 'bracket-graph' } };
    elements.get('phase-tabs').dispatch('click', {
      target: { closest: (sel) => (sel === '.tab-btn' ? graphTabBtn : null) }
    });

    assert.equal(store.getState().activeTab, 'bracket-graph');
    assert.equal(elements.get('bracket-graph-section').classList.contains('hidden'), false);
    assert.ok(
      elements
        .get('bracket-graph-container')
        .innerHTML.includes('O gráfico de chaveamento será gerado')
    );
    assert.equal(elements.get('bracket-podium-banner').classList.contains('hidden'), true);
    assert.equal(elements.get('download-bracket-image-btn').disabled, true);
  });

  it('GRAPH-C3: active tournament renders Winners, Losers, and Grand Final nodes with connectors in bracket graph', async () => {
    const store = createSpaStore({ baseUrl, fetchImpl: fetch });
    await store.createTournament('Copa Graph Ativa');
    await store.quickFillPlayers(16);
    await store.startActiveTournament();

    const t = store.getState().activeTournament;
    assert.equal(t.status, 'IN_PROGRESS');
    const graphHtml = renderBracketGraphHtml(t);

    // Must contain Winners Bracket rounds, Losers Bracket rounds, and Grand Final track
    assert.ok(graphHtml.includes('WINNERS BRACKET'));
    assert.ok(graphHtml.includes('LOSERS BRACKET'));
    assert.ok(graphHtml.includes('GRANDE FINAL'));
    assert.ok(graphHtml.includes('W-R1-M1'));
    assert.ok(graphHtml.includes('Winners Final'));
    assert.ok(graphHtml.includes('L-R1-M1'));
    assert.ok(graphHtml.includes('Losers Final'));

    // Must contain player names, Bomberman sprites, and connector badges
    for (const p of t.players) {
      assert.ok(graphHtml.includes(p.name), `Expected player ${p.name} in bracket graph`);
    }
    assert.ok(graphHtml.includes('#sprite-bomber-'));
    assert.ok(graphHtml.includes('graph-connector-badge'));
    assert.ok(graphHtml.includes('W-R2-M1'));
  });

  it('GRAPH-C4: recording or undoing matches and Grand Final rounds updates bracket graph in real time', async () => {
    const store = createSpaStore({ baseUrl, fetchImpl: fetch });
    await store.createTournament('Copa Tempo Real');
    await store.quickFillPlayers(16);
    await store.startActiveTournament();

    const m1 = store.getState().activeTournament.brackets.winners[0].matches[0];
    const wA = m1.slots[0];
    const wB = m1.slots[1];
    store.toggleMatchWinner(m1.id, wA);
    store.toggleMatchWinner(m1.id, wB);
    await store.submitMatchWinners(m1.id);

    const graphAfterMatch = renderBracketGraphHtml(store.getState().activeTournament);
    assert.ok(graphAfterMatch.includes('status-COMPLETED'));
    assert.ok(graphAfterMatch.includes('★ AVANÇOU'));
    assert.ok(graphAfterMatch.includes('↓ LOSERS'));

    // Undo match -> reverts node in bracket graph back to READY
    await store.undoMatch(m1.id);
    const graphAfterUndo = renderBracketGraphHtml(store.getState().activeTournament);
    assert.equal(graphAfterUndo.includes('★ AVANÇOU'), false);

    // Advance all bracket matches to GRAND_FINAL
    while (store.getState().activeTournament.status === 'IN_PROGRESS') {
      const curr = store.getState().activeTournament;
      const all = [
        ...curr.brackets.winners.flatMap((r) => r.matches),
        ...curr.brackets.losers.flatMap((r) => r.matches)
      ];
      const ready = all.find((m) => m.status === 'READY');
      store.toggleMatchWinner(ready.id, ready.slots[0]);
      store.toggleMatchWinner(ready.id, ready.slots[1]);
      await store.submitMatchWinners(ready.id);
    }

    const wf = store.getState().activeTournament.grandFinal.finalists[0];
    await store.recordFinalistWin(wf.playerId);
    const graphInGf = renderBracketGraphHtml(store.getState().activeTournament);
    assert.ok(graphInGf.includes('1 / 3'));

    await store.undoLastGrandFinalWin();
    const graphAfterGfUndo = renderBracketGraphHtml(store.getState().activeTournament);
    assert.ok(graphAfterGfUndo.includes('0 / 3'));
  });

  it('GRAPH-C6: COMPLETED tournament renders 1st, 2nd, 3rd, and 4th place podium highlight banner', async () => {
    const store = createSpaStore({ baseUrl, fetchImpl: fetch });
    await store.createTournament('Copa Podio Top 4');
    await store.quickFillPlayers(16);
    await store.startActiveTournament();

    while (store.getState().activeTournament.status === 'IN_PROGRESS') {
      const curr = store.getState().activeTournament;
      const all = [
        ...curr.brackets.winners.flatMap((r) => r.matches),
        ...curr.brackets.losers.flatMap((r) => r.matches)
      ];
      const ready = all.find((m) => m.status === 'READY');
      store.toggleMatchWinner(ready.id, ready.slots[0]);
      store.toggleMatchWinner(ready.id, ready.slots[1]);
      await store.submitMatchWinners(ready.id);
    }

    const finalists = store.getState().activeTournament.grandFinal.finalists;
    const [w1, w2] = finalists.filter((f) => f.origin === 'WINNERS');
    const [l1, l2] = finalists.filter((f) => f.origin === 'LOSERS');

    // l1 scores 5 wins (2nd place), w2 scores 2 wins (3rd place), l2 scores 1 win (4th place), w1 scores 3 wins (1st place Champion)
    for (let i = 0; i < 5; i++) await store.recordFinalistWin(l1.playerId);
    for (let i = 0; i < 2; i++) await store.recordFinalistWin(w2.playerId);
    await store.recordFinalistWin(l2.playerId);
    for (let i = 0; i < 3; i++) await store.recordFinalistWin(w1.playerId);

    const completed = store.getState().activeTournament;
    assert.equal(completed.status, 'COMPLETED');

    const podium = computePodiumFromTournament(completed);
    assert.equal(podium.length, 4);
    assert.deepEqual(
      podium.map((p) => p.playerId),
      [w1.playerId, l1.playerId, w2.playerId, l2.playerId]
    );

    const podiumHtml = renderBracketPodiumHtml(completed);
    assert.ok(podiumHtml.includes('1º LUGAR'));
    assert.ok(podiumHtml.includes('2º LUGAR'));
    assert.ok(podiumHtml.includes('3º LUGAR'));
    assert.ok(podiumHtml.includes('4º LUGAR'));
    for (const entry of podium) {
      assert.ok(podiumHtml.includes(entry.name), `Expected ${entry.name} in podium banner`);
      assert.ok(podiumHtml.includes(`#sprite-bomber-${entry.color}`));
      assert.ok(podiumHtml.includes(`${entry.wins} / ${entry.targetWins}`));
    }
  });

  it('GRAPH-C8: download bracket image button remains disabled during DRAFT, IN_PROGRESS, and GRAND_FINAL', async () => {
    const { doc, elements, downloadedLinks } = createTestDomHarness();
    const store = mountDomApp(doc, { baseUrl, fetchImpl: fetch });
    await store.createTournament('Copa Estados Botao');

    const downloadBtn = elements.get('download-bracket-image-btn');
    const podiumBanner = elements.get('bracket-podium-banner');

    // DRAFT
    assert.equal(store.getState().activeTournament.status, 'DRAFT');
    assert.equal(downloadBtn.disabled, true);
    assert.equal(podiumBanner.classList.contains('hidden'), true);

    // IN_PROGRESS
    await store.quickFillPlayers(16);
    await store.startActiveTournament();
    assert.equal(store.getState().activeTournament.status, 'IN_PROGRESS');
    assert.equal(downloadBtn.disabled, true);
    assert.equal(podiumBanner.classList.contains('hidden'), true);

    // GRAND_FINAL
    while (store.getState().activeTournament.status === 'IN_PROGRESS') {
      const curr = store.getState().activeTournament;
      const all = [
        ...curr.brackets.winners.flatMap((r) => r.matches),
        ...curr.brackets.losers.flatMap((r) => r.matches)
      ];
      const ready = all.find((m) => m.status === 'READY');
      store.toggleMatchWinner(ready.id, ready.slots[0]);
      store.toggleMatchWinner(ready.id, ready.slots[1]);
      await store.submitMatchWinners(ready.id);
    }
    assert.equal(store.getState().activeTournament.status, 'GRAND_FINAL');
    assert.equal(downloadBtn.disabled, true);
    assert.equal(podiumBanner.classList.contains('hidden'), true);
    assert.equal(downloadedLinks.length, 0);
  });

  it('GRAPH-C9: download bracket image button is enabled when tournament reaches COMPLETED', async () => {
    const { doc, elements, downloadedLinks } = createTestDomHarness();
    const store = mountDomApp(doc, { baseUrl, fetchImpl: fetch });
    await store.createTournament('Copa Habilita Download');
    await store.quickFillPlayers(16);
    await store.startActiveTournament();

    while (store.getState().activeTournament.status === 'IN_PROGRESS') {
      const curr = store.getState().activeTournament;
      const all = [
        ...curr.brackets.winners.flatMap((r) => r.matches),
        ...curr.brackets.losers.flatMap((r) => r.matches)
      ];
      const ready = all.find((m) => m.status === 'READY');
      store.toggleMatchWinner(ready.id, ready.slots[0]);
      store.toggleMatchWinner(ready.id, ready.slots[1]);
      await store.submitMatchWinners(ready.id);
    }

    const downloadBtn = elements.get('download-bracket-image-btn');
    const podiumBanner = elements.get('bracket-podium-banner');
    assert.equal(downloadBtn.disabled, true);

    const wf = store.getState().activeTournament.grandFinal.finalists[0];
    await store.recordFinalistWin(wf.playerId);
    await store.recordFinalistWin(wf.playerId);
    await store.recordFinalistWin(wf.playerId);

    assert.equal(store.getState().activeTournament.status, 'COMPLETED');
    assert.equal(downloadBtn.disabled, false);
    assert.equal(podiumBanner.classList.contains('hidden'), false);
    assert.ok(podiumBanner.innerHTML.includes('1º LUGAR'));
    assert.ok(podiumBanner.innerHTML.includes('4º LUGAR'));

    // Perform click gesture on #download-bracket-image-btn
    downloadBtn.dispatch('click');
    assert.equal(downloadedLinks.length, 1);
    assert.equal(downloadedLinks[0].download, 'copa-habilita-download-chaveamento.png');

    // Undo reverts to GRAND_FINAL, disables download button again, and hides podium banner
    await store.undoLastGrandFinalWin();
    assert.equal(store.getState().activeTournament.status, 'GRAND_FINAL');
    assert.equal(downloadBtn.disabled, true);
    assert.equal(podiumBanner.classList.contains('hidden'), true);
    assert.equal(podiumBanner.innerHTML, '');
  });

  it('GRAPH-C10: exporting bracket image on COMPLETED tournament downloads PNG with Top 4 podium and full brackets', async () => {
    const store = createSpaStore({ baseUrl, fetchImpl: fetch });
    await store.createTournament('Copa Export PNG');
    await store.quickFillPlayers(16);
    await store.startActiveTournament();

    while (store.getState().activeTournament.status === 'IN_PROGRESS') {
      const curr = store.getState().activeTournament;
      const all = [
        ...curr.brackets.winners.flatMap((r) => r.matches),
        ...curr.brackets.losers.flatMap((r) => r.matches)
      ];
      const ready = all.find((m) => m.status === 'READY');
      store.toggleMatchWinner(ready.id, ready.slots[0]);
      store.toggleMatchWinner(ready.id, ready.slots[1]);
      await store.submitMatchWinners(ready.id);
    }

    const finalists = store.getState().activeTournament.grandFinal.finalists;
    const [w1, w2] = finalists.filter((f) => f.origin === 'WINNERS');
    const [l1] = finalists.filter((f) => f.origin === 'LOSERS');
    await store.recordFinalistWin(l1.playerId);
    await store.recordFinalistWin(l1.playerId);
    await store.recordFinalistWin(w2.playerId);
    await store.recordFinalistWin(w1.playerId);
    await store.recordFinalistWin(w1.playerId);
    await store.recordFinalistWin(w1.playerId);

    const completed = store.getState().activeTournament;
    const triggeredLinks = [];
    const fakeDoc = {
      createElement(tag) {
        if (tag === 'a') {
          return {
            download: '',
            href: '',
            click() {
              triggeredLinks.push({ download: this.download, href: this.href });
            }
          };
        }
        return {};
      }
    };

    const exported = exportTournamentBracketPng(completed, fakeDoc);
    assert.ok(exported);
    assert.equal(exported.filename, 'copa-export-png-chaveamento.png');
    assert.equal(triggeredLinks.length, 1);
    assert.equal(triggeredLinks[0].download, 'copa-export-png-chaveamento.png');
    assert.match(triggeredLinks[0].href, /^data:image\/png;base64,/);

    // Decode base64 and verify valid PNG file signature (\x89PNG\r\n\x1a\n)
    const base64Data = exported.dataUrl.replace(/^data:image\/png;base64,/, '');
    const pngBuffer = Buffer.from(base64Data, 'base64');
    assert.equal(pngBuffer[0], 0x89);
    assert.equal(pngBuffer[1], 0x50); // P
    assert.equal(pngBuffer[2], 0x4e); // N
    assert.equal(pngBuffer[3], 0x47); // G

    // Verify SVG / visual scene contains tournament name, 1st..4th place names, and all bracket matches
    assert.ok(exported.svg.includes('Copa Export PNG'));
    assert.ok(exported.svg.includes('1º LUGAR'));
    assert.ok(exported.svg.includes('2º LUGAR'));
    assert.ok(exported.svg.includes('3º LUGAR'));
    assert.ok(exported.svg.includes('4º LUGAR'));
    for (const pEntry of exported.podium) {
      assert.ok(exported.svg.includes(pEntry.name), `Expected podium player ${pEntry.name} in exported graphic`);
    }
    assert.ok(exported.svg.includes('W-R1-M1'));
    assert.ok(exported.svg.includes('Winners Final'));
    assert.ok(exported.svg.includes('L-R1-M1'));
    assert.ok(exported.svg.includes('Losers Final'));
  });

  it('GRAPH-C12: exportTournamentBracketPng blocks image generation when tournament is not COMPLETED', () => {
    let clicked = false;
    const fakeDoc = {
      createElement() {
        return {
          click() {
            clicked = true;
          }
        };
      }
    };

    assert.equal(exportTournamentBracketPng(null, fakeDoc), null);
    assert.equal(exportTournamentBracketPng({ status: 'DRAFT' }, fakeDoc), null);
    assert.equal(exportTournamentBracketPng({ status: 'IN_PROGRESS' }, fakeDoc), null);
    assert.equal(exportTournamentBracketPng({ status: 'GRAND_FINAL' }, fakeDoc), null);
    assert.equal(clicked, false);
  });

  it('GRAPH-C13: 20-player tournament with BOT/BYE renders auto-resolved matches in graph and exported image', async () => {
    const store = createSpaStore({ baseUrl, fetchImpl: fetch });
    await store.createTournament('Copa 20 Bots');
    await store.quickFillPlayers(20);
    await store.startActiveTournament();

    while (store.getState().activeTournament.status === 'IN_PROGRESS') {
      const curr = store.getState().activeTournament;
      const all = [
        ...curr.brackets.winners.flatMap((r) => r.matches),
        ...curr.brackets.losers.flatMap((r) => r.matches)
      ];
      const ready = all.find((m) => m.status === 'READY');
      const humanIds = ready.slots.filter((pid) => {
        const pl = curr.players.find((p) => p.id === pid);
        return pl && !pl.isBot;
      });
      store.toggleMatchWinner(ready.id, humanIds[0]);
      store.toggleMatchWinner(ready.id, humanIds[1]);
      await store.submitMatchWinners(ready.id);
    }

    const wf = store.getState().activeTournament.grandFinal.finalists[0];
    await store.recordFinalistWin(wf.playerId);
    await store.recordFinalistWin(wf.playerId);
    await store.recordFinalistWin(wf.playerId);

    const completed = store.getState().activeTournament;
    const graphHtml = renderBracketGraphHtml(completed);
    assert.ok(graphHtml.includes('CPU BOT #1'));
    assert.ok(graphHtml.includes('AUTO-BYE'));

    const svg = buildTournamentBracketSvg(completed);
    assert.ok(svg.includes('CPU BOT #1'));
    assert.ok(svg.includes('AUTO-BYE'));
  });
});

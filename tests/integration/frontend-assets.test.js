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

describe('T7: Bomberman Arcade HTML Layout, Retro Pixel CSS and SVG Sprites', () => {
  let tempDir;
  let server;
  let baseUrl;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bomber-ui-t7-'));
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

  it('serves index.html with SVG sprites for all 8 Bomberman colors, bomb, explosion, brick, and trophy plus phase containers', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/i);

    const html = await res.text();

    // Verify all 8 classic Bomberman character SVG sprites exist
    const colors = ['white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'aqua'];
    for (const color of colors) {
      assert.ok(
        html.includes(`id="sprite-bomber-${color}"`),
        `Expected SVG sprite #sprite-bomber-${color} in index.html`
      );
    }

    // Verify iconic Bomberman props SVG sprites exist
    for (const icon of ['sprite-bomb', 'sprite-explosion', 'sprite-brick', 'sprite-trophy']) {
      assert.ok(html.includes(`id="${icon}"`), `Expected SVG sprite #${icon} in index.html`);
    }

    // Verify accessible containers for Tournaments, Seeding (DRAFT), Winners, Losers, Grand Final, and Player Status
    const requiredIds = [
      'create-tournament-form',
      'tournament-name-input',
      'tournament-list',
      'seeding-section',
      'add-player-form',
      'player-name-input',
      'add-player-btn',
      'quick-fill-16-btn',
      'quick-fill-20-btn',
      'shuffle-players-btn',
      'start-tournament-btn',
      'winners-bracket-container',
      'losers-bracket-container',
      'grand-final-container',
      'players-status-container'
    ];
    for (const id of requiredIds) {
      assert.ok(html.includes(`id="${id}"`), `Expected container/control #${id} in index.html`);
    }
  });

  it('COLOR-C4: add-player-form contains nickname input and submit button without player-color-select', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();

    const formMatch = html.match(/<form[^>]*id="add-player-form"[^>]*>([\s\S]*?)<\/form>/i);
    assert.ok(formMatch, 'Expected #add-player-form in index.html');
    const formContent = formMatch[1];

    assert.ok(formContent.includes('id="player-name-input"'));
    assert.ok(formContent.includes('id="add-player-btn"'));
    assert.equal(html.includes('id="player-color-select"'), false);
    assert.equal(formContent.includes('<select'), false);
  });

  it('GRAPH-C1: index.html includes bracket-graph tab button, section, podium banner, and download button', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const html = await res.text();

    assert.match(
      html,
      /<button[^>]*class="tab-btn"[^>]*data-tab="bracket-graph"[^>]*>6\.\s*GRÁFICO DO TORNEIO<\/button>/i
    );
    assert.ok(html.includes('id="bracket-graph-section"'));
    assert.ok(html.includes('id="download-bracket-image-btn"'));
    assert.ok(html.includes('id="bracket-podium-banner"'));
    assert.ok(html.includes('id="bracket-graph-container"'));
  });

  it('serves styles.css with Bomberman arcade pixel typography, 8-color palette tokens, and responsive rules', async () => {
    const res = await fetch(`${baseUrl}/styles.css`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/css/i);

    const css = await res.text();

    // Verify arcade pixel typography and color palette tokens
    assert.ok(css.includes('--font-arcade'), 'Expected --font-arcade CSS custom property');
    const colorTokens = [
      '--bomber-white',
      '--bomber-black',
      '--bomber-red',
      '--bomber-blue',
      '--bomber-green',
      '--bomber-yellow',
      '--bomber-pink',
      '--bomber-aqua',
      '--arena-grass',
      '--brick-orange',
      '--blast-gold'
    ];
    for (const token of colorTokens) {
      assert.ok(css.includes(token), `Expected CSS token ${token} in styles.css`);
    }

    // Verify responsive layout rules and bracket/grand-final classes
    assert.ok(css.includes('@media'), 'Expected responsive @media query in styles.css');
    assert.ok(css.includes('.match-card'), 'Expected .match-card styling in styles.css');
    assert.ok(css.includes('.finalist-card'), 'Expected .finalist-card styling in styles.css');
  });

  it('serves bracket graph tree and Top 4 podium highlight CSS rules in styles.css', async () => {
    const res = await fetch(`${baseUrl}/styles.css`);
    assert.equal(res.status, 200);
    const css = await res.text();

    const requiredSelectors = [
      '.podium-banner',
      '.podium-grid',
      '.podium-card',
      '.podium-place-1',
      '.podium-place-2',
      '.podium-place-3',
      '.podium-place-4',
      '.bracket-graph-tree',
      '.graph-track',
      '.graph-round-column',
      '.graph-node',
      '.graph-connector-badge'
    ];
    for (const selector of requiredSelectors) {
      assert.ok(css.includes(selector), `Expected CSS selector ${selector} in styles.css`);
    }
  });
});

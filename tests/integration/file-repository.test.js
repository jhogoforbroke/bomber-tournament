import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createTournament, addPlayer, NotFoundError } from '../../src/domain/tournament.js';
import { createFileRepository } from '../../src/storage/file-repository.js';

describe('T4: Atomic JSON Text-File Repository', () => {
  let tempDir;
  let tournamentsDir;
  let repo;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bomber-repo-test-'));
    tournamentsDir = path.join(tempDir, 'data', 'tournaments');
    repo = createFileRepository(tournamentsDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('C1: creating a tournament persists a JSON file in data/tournaments with DRAFT status', async () => {
    const t = createTournament({ name: 'Copa Bomberman JSON' });
    addPlayer(t, { name: 'Shirobon', color: 'white' });

    await repo.save(t);

    const filePath = path.join(tournamentsDir, `${t.id}.json`);
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    assert.equal(parsed.id, t.id);
    assert.equal(parsed.name, 'Copa Bomberman JSON');
    assert.equal(parsed.status, 'DRAFT');
    assert.equal(parsed.players.length, 1);
    assert.equal(parsed.players[0].name, 'Shirobon');

    const loaded = await repo.getById(t.id);
    assert.deepEqual(loaded, parsed);
  });

  it('C17: listing and deleting tournaments reads and removes the JSON file in data/tournaments', async () => {
    const t1 = createTournament({ name: 'Torneio Alpha' });
    const t2 = createTournament({ name: 'Torneio Beta' });
    await repo.save(t1);
    await repo.save(t2);

    const listBefore = await repo.list();
    assert.equal(listBefore.length, 2);
    assert.ok(listBefore.some((item) => item.id === t1.id && item.name === 'Torneio Alpha'));
    assert.ok(listBefore.some((item) => item.id === t2.id && item.name === 'Torneio Beta'));

    await repo.remove(t1.id);

    const listAfter = await repo.list();
    assert.equal(listAfter.length, 1);
    assert.equal(listAfter[0].id, t2.id);

    await assert.rejects(
      () => repo.getById(t1.id),
      (err) => err instanceof NotFoundError && err.statusCode === 404
    );

    await assert.rejects(
      () => repo.remove('non_existent_id'),
      (err) => err instanceof NotFoundError && err.statusCode === 404
    );
  });

  it('C21: file repository writes atomically via temp file rename leaving no .tmp artifacts', async () => {
    const t = createTournament({ name: 'Atomic Save Test' });

    // Perform concurrent saves on the same tournament to verify write serialization & atomic .tmp rename
    await Promise.all([
      repo.save({ ...t, name: 'Save 1' }),
      repo.save({ ...t, name: 'Save 2' }),
      repo.save({ ...t, name: 'Save Final' })
    ]);

    const files = await fs.readdir(tournamentsDir);
    const tmpFiles = files.filter((f) => f.endsWith('.tmp'));
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    assert.deepEqual(tmpFiles, []);
    assert.deepEqual(jsonFiles, [`${t.id}.json`]);

    const finalDoc = await repo.getById(t.id);
    assert.equal(finalDoc.name, 'Save Final');
  });
});

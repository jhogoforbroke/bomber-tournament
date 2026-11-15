import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { NotFoundError, ValidationError } from '../domain/tournament.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = path.resolve(__dirname, '..', '..', 'data', 'tournaments');

function sanitizeId(id) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new ValidationError('ID de torneio inválido.');
  }
  return id;
}

export function createFileRepository(
  dataDir = DEFAULT_DATA_DIR
) {
  const writeQueues = new Map();

  async function ensureDir() {
    await fs.mkdir(dataDir, { recursive: true });
  }

  function enqueueWrite(id, fn) {
    const prev = writeQueues.get(id) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    const tracked = next.then(
      () => {
        if (writeQueues.get(id) === tracked) {
          writeQueues.delete(id);
        }
      },
      () => {
        if (writeQueues.get(id) === tracked) {
          writeQueues.delete(id);
        }
      }
    );
    writeQueues.set(id, tracked);
    return next;
  }

  async function save(tournament) {
    if (!tournament || !tournament.id) {
      throw new ValidationError('Documento de torneio inválido para persistência.');
    }
    const safeId = sanitizeId(tournament.id);
    return enqueueWrite(safeId, async () => {
      await ensureDir();
      const targetPath = path.join(dataDir, `${safeId}.json`);
      const tempPath = path.join(
        dataDir,
        `${safeId}.${process.pid}.${crypto.randomUUID().slice(0, 8)}.tmp`
      );
      const serialized = JSON.stringify(tournament, null, 2) + '\n';
      await fs.writeFile(tempPath, serialized, 'utf-8');
      await fs.rename(tempPath, targetPath);
      return tournament;
    });
  }

  async function getById(id) {
    const safeId = sanitizeId(id);
    await ensureDir();
    const targetPath = path.join(dataDir, `${safeId}.json`);
    try {
      const raw = await fs.readFile(targetPath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundError(`Torneio ${safeId} não encontrado.`);
      }
      throw err;
    }
  }

  async function list() {
    await ensureDir();
    const entries = await fs.readdir(dataDir);
    const jsonFiles = entries.filter((f) => f.endsWith('.json'));
    const tournaments = [];
    for (const file of jsonFiles) {
      try {
        const raw = await fs.readFile(path.join(dataDir, file), 'utf-8');
        const doc = JSON.parse(raw);
        tournaments.push({
          id: doc.id,
          name: doc.name,
          status: doc.status,
          playerCount: Array.isArray(doc.players)
            ? doc.players.filter((p) => !p.isBot).length
            : 0,
          bracketSize: doc.bracketSize,
          championId: doc.championId,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        });
      } catch {
        // Ignore unreadable transient files
      }
    }
    tournaments.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return tournaments;
  }

  async function remove(id) {
    const safeId = sanitizeId(id);
    return enqueueWrite(safeId, async () => {
      await ensureDir();
      const targetPath = path.join(dataDir, `${safeId}.json`);
      try {
        await fs.unlink(targetPath);
        return { deleted: true, id: safeId };
      } catch (err) {
        if (err.code === 'ENOENT') {
          throw new NotFoundError(`Torneio ${safeId} não encontrado.`);
        }
        throw err;
      }
    });
  }

  return {
    dataDir,
    save,
    getById,
    list,
    remove
  };
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  createTournament,
  addPlayer,
  removePlayer,
  shufflePlayers,
  reorderPlayers
} from '../domain/tournament.js';
import { startTournament } from '../domain/bracket.js';
import { createFileRepository } from '../storage/file-repository.js';
import { registerMatchRoutes } from './routes-matches.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', '..', 'public');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createApp({ dataDir, matchRoutesRegistrar } = {}) {
  const repo = createFileRepository(dataDir);
  const app = express();

  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.get(
    '/api/tournaments',
    asyncHandler(async (_req, res) => {
      const list = await repo.list();
      res.json(list);
    })
  );

  app.post(
    '/api/tournaments',
    asyncHandler(async (req, res) => {
      const tournament = createTournament({ name: req.body?.name });
      await repo.save(tournament);
      res.status(201).json(tournament);
    })
  );

  app.get(
    '/api/tournaments/:id',
    asyncHandler(async (req, res) => {
      const tournament = await repo.getById(req.params.id);
      res.json(tournament);
    })
  );

  app.delete(
    '/api/tournaments/:id',
    asyncHandler(async (req, res) => {
      const result = await repo.remove(req.params.id);
      res.json(result);
    })
  );

  app.post(
    '/api/tournaments/:id/players',
    asyncHandler(async (req, res) => {
      const tournament = await repo.getById(req.params.id);
      if (Array.isArray(req.body?.players)) {
        for (const p of req.body.players) {
          addPlayer(tournament, { name: p.name, color: p.color });
        }
      } else {
        addPlayer(tournament, { name: req.body?.name, color: req.body?.color });
      }
      await repo.save(tournament);
      res.status(201).json(tournament);
    })
  );

  app.delete(
    '/api/tournaments/:id/players/:playerId',
    asyncHandler(async (req, res) => {
      const tournament = await repo.getById(req.params.id);
      removePlayer(tournament, req.params.playerId);
      await repo.save(tournament);
      res.json(tournament);
    })
  );

  app.put(
    '/api/tournaments/:id/players/order',
    asyncHandler(async (req, res) => {
      const tournament = await repo.getById(req.params.id);
      reorderPlayers(tournament, req.body?.playerIds);
      await repo.save(tournament);
      res.json(tournament);
    })
  );

  app.post(
    '/api/tournaments/:id/shuffle',
    asyncHandler(async (req, res) => {
      const tournament = await repo.getById(req.params.id);
      shufflePlayers(tournament);
      await repo.save(tournament);
      res.json(tournament);
    })
  );

  app.post(
    '/api/tournaments/:id/start',
    asyncHandler(async (req, res) => {
      const tournament = await repo.getById(req.params.id);
      startTournament(tournament);
      await repo.save(tournament);
      res.json(tournament);
    })
  );

  if (typeof matchRoutesRegistrar === 'function') {
    matchRoutesRegistrar(app, repo);
  } else {
    registerMatchRoutes(app, repo);
  }

  // Centralized JSON error handler
  app.use((err, _req, res, _next) => {
    const status = err.statusCode || 500;
    res.status(status).json({
      error: err.name || 'ServerError',
      message: err.message || 'Erro interno no servidor.'
    });
  });

  return app;
}

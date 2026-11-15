import { recordMatchResult, undoMatchResult } from '../domain/bracket.js';
import { recordGrandFinalWin, undoGrandFinalWin } from '../domain/grand-final.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function registerMatchRoutes(app, repo) {
  app.post(
    '/api/tournaments/:id/matches/:matchId/result',
    asyncHandler(async (req, res) => {
      const tournament = await repo.getById(req.params.id);
      recordMatchResult(tournament, req.params.matchId, req.body?.winnerIds);
      await repo.save(tournament);
      res.json(tournament);
    })
  );

  app.post(
    '/api/tournaments/:id/matches/:matchId/undo',
    asyncHandler(async (req, res) => {
      const tournament = await repo.getById(req.params.id);
      undoMatchResult(tournament, req.params.matchId);
      await repo.save(tournament);
      res.json(tournament);
    })
  );

  app.post(
    '/api/tournaments/:id/grand-final/win',
    asyncHandler(async (req, res) => {
      const tournament = await repo.getById(req.params.id);
      recordGrandFinalWin(tournament, req.body?.playerId);
      await repo.save(tournament);
      res.json(tournament);
    })
  );

  app.post(
    '/api/tournaments/:id/grand-final/undo',
    asyncHandler(async (req, res) => {
      const tournament = await repo.getById(req.params.id);
      undoGrandFinalWin(tournament);
      await repo.save(tournament);
      res.json(tournament);
    })
  );
}

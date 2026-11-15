import crypto from 'node:crypto';

export const BOMBERMAN_COLORS = Object.freeze([
  'white',
  'black',
  'red',
  'blue',
  'green',
  'yellow',
  'pink',
  'aqua'
]);

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

export function createTournament({ name }) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    throw new ValidationError('O nome do torneio é obrigatório.');
  }
  const now = new Date().toISOString();
  return {
    id: `tourn_${crypto.randomUUID().slice(0, 8)}`,
    name: trimmed,
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now,
    bracketSize: null,
    championId: null,
    players: [],
    brackets: {
      winners: [],
      losers: []
    },
    grandFinal: {
      status: 'PENDING',
      finalists: [],
      history: []
    }
  };
}

function assertDraftState(tournament) {
  if (!tournament || tournament.status !== 'DRAFT') {
    throw new ConflictError('Apenas torneios no estado DRAFT permitem alterar jogadores ou seeding.');
  }
}

function normalizeSeeds(tournament) {
  const humans = tournament.players.filter((p) => !p.isBot);
  humans.forEach((player, index) => {
    player.seed = index + 1;
  });
  tournament.updatedAt = new Date().toISOString();
}

export function addPlayer(tournament, { name, color = 'white' }) {
  assertDraftState(tournament);
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    throw new ValidationError('O nome do jogador não pode ser vazio.');
  }
  const normalizedColor = typeof color === 'string' ? color.trim().toLowerCase() : 'white';
  if (!BOMBERMAN_COLORS.includes(normalizedColor)) {
    throw new ValidationError(
      `Cor de Bomberman inválida (${color}). Cores permitidas: ${BOMBERMAN_COLORS.join(', ')}.`
    );
  }
  const duplicate = tournament.players.some(
    (p) => !p.isBot && p.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    throw new ValidationError(`Nome de jogador duplicado: "${trimmedName}" já existe no torneio.`);
  }
  const humanPlayers = tournament.players.filter((p) => !p.isBot);

  const player = {
    id: `p_${crypto.randomUUID().slice(0, 8)}`,
    name: trimmedName,
    color: normalizedColor,
    seed: humanPlayers.length + 1,
    isBot: false,
    status: 'ACTIVE'
  };
  tournament.players.push(player);
  tournament.updatedAt = new Date().toISOString();
  return player;
}

export function removePlayer(tournament, playerId) {
  assertDraftState(tournament);
  const idx = tournament.players.findIndex((p) => p.id === playerId && !p.isBot);
  if (idx === -1) {
    throw new NotFoundError(`Jogador ${playerId} não encontrado.`);
  }
  const [removed] = tournament.players.splice(idx, 1);
  normalizeSeeds(tournament);
  return removed;
}

export function shufflePlayers(tournament, rng = Math.random) {
  assertDraftState(tournament);
  const humans = tournament.players.filter((p) => !p.isBot);
  for (let i = humans.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = humans[i];
    humans[i] = humans[j];
    humans[j] = temp;
  }
  tournament.players = humans;
  normalizeSeeds(tournament);
  return tournament.players;
}

export function reorderPlayers(tournament, orderedPlayerIds) {
  assertDraftState(tournament);
  const humans = tournament.players.filter((p) => !p.isBot);
  if (!Array.isArray(orderedPlayerIds) || orderedPlayerIds.length !== humans.length) {
    throw new ValidationError('A lista de reordenação deve conter exatamente todos os jogadores inscritos.');
  }
  const byId = new Map(humans.map((p) => [p.id, p]));
  const reordered = [];
  for (const id of orderedPlayerIds) {
    const player = byId.get(id);
    if (!player) {
      throw new ValidationError(`Jogador ${id} inválido na reordenação.`);
    }
    byId.delete(id);
    reordered.push(player);
  }
  tournament.players = reordered;
  normalizeSeeds(tournament);
  return tournament.players;
}

export function validateCanStart(tournament) {
  assertDraftState(tournament);
  const count = tournament.players.filter((p) => !p.isBot).length;
  if (count < 16 || count > 64 || count % 4 !== 0) {
    throw new ValidationError(
      `O torneio exige um número de jogadores múltiplo de 4 entre 16 e 64 (atual: ${count}).`
    );
  }
  return true;
}

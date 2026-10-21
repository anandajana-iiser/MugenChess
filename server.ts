import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, UserRecord } from './server/db';
import {
  hashPassword,
  verifyPassword,
  createSession,
  sanitizeUser,
  authMiddleware,
  AuthenticatedRequest,
} from './server/auth';
import { initWebSocketServer } from './server/socket';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // Attach WebSocket Server
  initWebSocketServer(server);

  // --- REST API ROUTES ---

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { username, displayName, password, avatarId } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanUsername = username.trim();
    if (db.findUserByUsername(cleanUsername)) {
      return res.status(409).json({ error: 'Username is already taken. Please pick another.' });
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { hash, salt } = hashPassword(password);

    const newUser: UserRecord = {
      id: userId,
      username: cleanUsername,
      displayName: (displayName && displayName.trim()) || cleanUsername,
      avatarId: avatarId || 'avatar_knight',
      passwordHash: hash,
      salt,
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
      },
      createdAt: Date.now(),
    };

    db.saveUser(newUser);
    const token = createSession(newUser.id);

    return res.status(201).json({
      token,
      user: sanitizeUser(newUser),
    });
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = db.findUserByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = createSession(user.id);
    return res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  // Auth: Current User
  app.get('/api/auth/me', authMiddleware, (req: AuthenticatedRequest, res) => {
    return res.json({ user: req.user });
  });

  // Auth: Update Profile
  app.put('/api/auth/profile', authMiddleware, (req: AuthenticatedRequest, res) => {
    const { displayName, avatarId } = req.body;
    const user = db.findUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (displayName && typeof displayName === 'string') {
      user.displayName = displayName.trim();
    }
    if (avatarId && typeof avatarId === 'string') {
      user.avatarId = avatarId;
    }

    db.saveUser(user);
    return res.json({ user: sanitizeUser(user) });
  });

  // Players: Search / Discovery
  app.get('/api/players', authMiddleware, (req: AuthenticatedRequest, res) => {
    const query = ((req.query.q as string) || '').toLowerCase().trim();
    const currentUserId = req.user!.id;

    const results = Array.from(db.users.values())
      .filter((u) => u.id !== currentUserId)
      .filter((u) => !query || u.username.toLowerCase().includes(query) || u.displayName.toLowerCase().includes(query))
      .map(sanitizeUser)
      .slice(0, 20);

    return res.json({ players: results });
  });

  // Challenges: List active
  app.get('/api/challenges', authMiddleware, (req: AuthenticatedRequest, res) => {
    const currentUserId = req.user!.id;
    const now = Date.now();

    const incoming = Array.from(db.challenges.values()).filter(
      (c) => c.challenged.userId === currentUserId && c.status === 'pending' && c.expiresAt > now
    );

    const outgoing = Array.from(db.challenges.values()).filter(
      (c) => c.challenger.userId === currentUserId && c.status === 'pending' && c.expiresAt > now
    );

    return res.json({ incoming, outgoing });
  });

  // Matches: List active or recent
  app.get('/api/matches', authMiddleware, (req: AuthenticatedRequest, res) => {
    const currentUserId = req.user!.id;
    const userMatches = Array.from(db.matches.values())
      .filter((m) => m.whitePlayer.userId === currentUserId || m.blackPlayer.userId === currentUserId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20);

    return res.json({ matches: userMatches });
  });

  // Matches: Get by ID
  app.get('/api/matches/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    const match = db.matches.get(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found.' });
    }

    const currentUserId = req.user!.id;
    if (match.whitePlayer.userId !== currentUserId && match.blackPlayer.userId !== currentUserId) {
      return res.status(403).json({ error: 'You are not a participant in this match.' });
    }

    return res.json({ match });
  });

  // --- VITE DEV OR PRODUCTION STATIC SERVING ---
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`> Custom Multiplayer Dice Chess server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

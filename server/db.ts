import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MatchState, Challenge, UserProfile } from '../src/types/game';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface UserRecord extends UserProfile {
  passwordHash: string;
  salt: string;
}

export class FileDatabase {
  private usersFile = path.join(DATA_DIR, 'users.json');
  private challengesFile = path.join(DATA_DIR, 'challenges.json');
  private matchesFile = path.join(DATA_DIR, 'matches.json');

  public users = new Map<string, UserRecord>(); // key: userId
  public usernameIndex = new Map<string, string>(); // key: lowercase username -> userId
  public challenges = new Map<string, Challenge>(); // key: challengeId
  public matches = new Map<string, MatchState>(); // key: matchId
  public sessions = new Map<string, string>(); // token -> userId

  constructor() {
    this.loadAll();
  }

  private safeReadJson<T>(filePath: string, fallback: T): T {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error(`Failed to read ${filePath}:`, err);
    }
    return fallback;
  }

  private safeWriteJson(filePath: string, data: any) {
    try {
      const tempPath = `${filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      console.error(`Failed to write ${filePath}:`, err);
    }
  }

  private loadAll() {
    const rawUsers = this.safeReadJson<UserRecord[]>(this.usersFile, []);
    for (const u of rawUsers) {
      this.users.set(u.id, u);
      this.usernameIndex.set(u.username.toLowerCase(), u.id);
    }

    const rawChallenges = this.safeReadJson<Challenge[]>(this.challengesFile, []);
    for (const c of rawChallenges) {
      this.challenges.set(c.id, c);
    }

    const rawMatches = this.safeReadJson<MatchState[]>(this.matchesFile, []);
    for (const m of rawMatches) {
      this.matches.set(m.id, m);
    }
  }

  public saveUsers() {
    this.safeWriteJson(this.usersFile, Array.from(this.users.values()));
  }

  public saveChallenges() {
    this.safeWriteJson(this.challengesFile, Array.from(this.challenges.values()));
  }

  public saveMatches() {
    this.safeWriteJson(this.matchesFile, Array.from(this.matches.values()));
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }

  public findUserByUsername(username: string): UserRecord | undefined {
    const id = this.usernameIndex.get(username.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }

  public saveUser(user: UserRecord) {
    this.users.set(user.id, user);
    this.usernameIndex.set(user.username.toLowerCase(), user.id);
    this.saveUsers();
  }

  public saveChallenge(challenge: Challenge) {
    this.challenges.set(challenge.id, challenge);
    this.saveChallenges();
  }

  public saveMatch(match: MatchState) {
    this.matches.set(match.id, match);
    this.saveMatches();
  }

  public deleteMatch(matchId: string) {
    if (this.matches.has(matchId)) {
      this.matches.delete(matchId);
      this.saveMatches();
    }
  }

  public cleanupOldChallenges() {
    const now = Date.now();
    let changed = false;
    for (const [id, c] of this.challenges.entries()) {
      // Delete completed, declined, cancelled, or expired challenges older than 10 minutes
      if (c.status !== 'pending' || c.expiresAt < now) {
        this.challenges.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.saveChallenges();
    }
  }
}

export const db = new FileDatabase();


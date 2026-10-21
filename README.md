# Custom Multiplayer Dice Chess Platform

A production-grade, turn-based **Human-vs-Human** online multiplayer strategy game platform with an integrated **Grandmaster Bot**, custom dice mechanics, hybrid pieces, and authoritative time controls. Built with React, Vite, Tailwind CSS, Express, and WebSockets.

---

## Table of Contents
1. [Project Overview & Key Capabilities](#1-project-overview--key-capabilities)
2. [Complete Chronological Changelog & All Edits Performed](#2-complete-chronological-changelog--all-edits-performed)
3. [Game Rules & Custom Mechanics](#3-game-rules--custom-mechanics)
   - [Board Layout & Starting Setup](#31-board-layout--starting-setup)
   - [The Prince Piece & Visual Design](#32-the-prince-piece--visual-design)
   - [Dice System & Category Allocations](#33-dice-system--category-allocations)
   - [Fallback Free-Pass Rule](#34-fallback-free-pass-rule)
   - [Check & Check Defense: The Check-Escape Fallacy Solution](#35-check--check-defense-the-check-escape-fallacy-solution)
   - [Two-Pawn End-Rank Draw Condition](#36-two-pawn-end-rank-draw-condition)
   - [Precedence Hierarchy: Checkmate vs Pawn Draw](#37-precedence-hierarchy-checkmate-vs-pawn-draw)
4. [Match Timers & The 7-Piece Advantage Timeout Victory Rule](#4-match-timers--the-7-piece-advantage-timeout-victory-rule)
5. [Grandmaster Bot Architecture](#5-grandmaster-bot-architecture)
6. [Architecture & System Flow](#6-architecture--system-flow)
7. [Technology Stack](#7-technology-stack)
8. [Verified ₹0 Budget & Free-Tier Guarantees](#8-verified-0-budget--free-tier-guarantees)
9. [Local Running & Windows Setup Guide](#9-local-running--windows-setup-guide)
10. [Multiplayer Setup: Same Wi-Fi & Internet Play](#10-multiplayer-setup-same-wi-fi--internet-play)
11. [How to Utilize Antigravity Desktop to Edit and Extend This App](#11-how-to-utilize-antigravity-desktop-to-edit-and-extend-this-app)
12. [Database Schema, Persistence & Zero-Bloat Policy](#12-database-schema-persistence--zero-bloat-policy)
13. [Troubleshooting & FAQ](#13-troubleshooting--faq)

---

## 1. Project Overview & Key Capabilities

This platform is a fully realized turn-based strategy game combining traditional chess tactical depth with dynamic dice constraints, custom piece mobility, and strict competitive time controls:
- **Persistent User Accounts**: Salted and hashed credentials with `pbkdf2Sync`, customizable avatars, and permanent statistics tracking (wins, losses, draws, total games played).
- **Player Discovery & Real-Time Challenges**: Instant player search, online/offline status indicators, audio-notified challenge popups, and atomic acceptance creating single-instance authoritative match rooms.
- **Instant Grandmaster Bot Play**: Play immediately without waiting for human opponents. Features an offline minimax engine with alpha-beta pruning that understands all custom dice and piece rules.
- **Fixed Clocks with Piece Advantage Rules**: Fixed **5 Minutes (Standard)** or **2 Minutes (Blitz)** time controls with an authoritative server ticking loop and client countdown HUDs.
- **Zero-Bloat Persistence**: Accounts and lifetime stats persist permanently in `data/users.json`, while completed matches are automatically deleted 45 seconds after conclusion to guarantee zero disk bloat.
- **100% ₹0 Budget Operation**: No paid APIs, no credit card requirements, no paid cloud databases, and no token consumption.

---

## 2. Complete Chronological Changelog & All Edits Performed

Below is the complete record of all features, bug fixes, refactors, and rule clarifications implemented across the project's evolution:

### Phase 1: Initial Architecture & Full-Stack Foundation
- **Server Infrastructure**: Created Express HTTP server and native `ws` WebSocket hub on port 3000 (`server/index.ts`, `server/socket.ts`).
- **Atomic File Storage**: Built `server/db.ts` with in-memory `Map` indices and safe write-ahead file operations (`data/users.json`, `data/challenges.json`, `data/matches.json`).
- **User Authentication**: Built secure user registration, session token generation, password hashing (`crypto.pbkdf2Sync`), and login validation (`server/auth.ts`, `src/context/AuthContext.tsx`).
- **Sound Effects Engine**: Implemented `src/utils/sound.ts` using the browser's native Web Audio API (zero external audio files or bandwidth costs) for move sounds, capture chimes, dice rolls, challenge notifications, and victory fanfares.

### Phase 2: Core Game Engine & Custom Rules
- **Board Grid & Coordinate System**: Developed an 8×8 matrix representation where `(x, y)` coordinates map cleanly to standard algebraic notation `a1`–`h8` (`src/game/engine.ts`).
- **Starting Corner Queen & Prince Placement**:
  - White Queen at `a1`, White Prince at `h1`.
  - Black Prince at `a8`, Black Queen at `h8`.
- **The Prince Piece Engine Logic**:
  - Implemented 2×1 knight leaps over intervening pieces.
  - Implemented bounded diagonal slide of 1 to 4 squares without jumping.
  - Implemented one-time extended 3×1 knight leap on the piece's very first move.
- **Dice Mechanics & Roll Generation**:
  - Category 1 (Inexpensive): rolls 1, 2, 3 unlock Knights and Bishops.
  - Category 2 (Expensive & Pawns): rolls 4, 5, 6 unlock Rooks, Queens, Princes, Kings, and Pawns.
  - Added late-game bias towards rolls 4, 5, 6 when a player has fewer than 7 pieces remaining.
- **Two-Pawn End-Rank Draw Condition**:
  - Tracked pawns reaching rank 8 (for White) or rank 1 (for Black). When any player accumulates 2 pawns on the opponent's back rank, the match ends immediately in a draw.

### Phase 3: Solving Critical Logical Fallacies & Edge Cases
- **Fallacy Fix #1: The Check Escape Fallacy**:
  - *Problem Identified*: Under strict dice rules, a player whose King is in check could roll an ineligible category (e.g., rolling 1, 2, 3 when no Knight or Bishop can resolve the check), resulting in an inescapable deadlock or illegal move penalty even when a King or other piece could legally escape check.
  - *Solution Implemented*: In `src/game/engine.ts` (`getDiceEligibleMoves`, `executeMove`), `src/components/ChessBoard.tsx`, and `src/components/DiceRoller.tsx`, the dice roll is **completely bypassed** whenever a player's King is in check! The player can immediately move their King, capture the checking piece, or block the line of check with any legal piece on the board without needing a dice roll.
- **Fallacy Fix #2: Precedence Conflict (Checkmate vs Two-Pawn End-Rank Draw)**:
  - *Problem Identified*: If a move simultaneously delivers checkmate and advances a second pawn to the opponent's back rank, which condition takes victory precedence?
  - *Solution Implemented*: Clarified and enforced that **Checkmate victory takes absolute priority** over the two-pawn draw. If checkmate is delivered, the player wins immediately; the draw condition is evaluated second.
- **Fallback Rule Refinement (Free-Pass Rule)**:
  - If a player is not in check, rolls the dice, and the resulting piece category has zero legal moves on the board, the game lifts category restrictions and unlocks **all** legal moves across all pieces.

### Phase 4: Visual Distinction for Queen and Prince
- **Styling Clarification**: Ensured the Queen and Prince are immediately distinguishable at a glance:
  - **Queen**: Detailed 5-pointed diadem crown adorned with 5 distinct pearls/jewels on its tips, distinct base band, and classic border strokes.
  - **White Prince**: Rendered in **Navy Blue** (`#1e3a8a`) solid fill with **NO borders** (`stroke="none"`) and inner heraldic insignia.
  - **Black Prince**: Rendered in **Dark Red** (`#881337`) solid fill with **NO borders** (`stroke="none"`) and inner heraldic insignia.

### Phase 5: Grandmaster Bot Implementation
- **Local Engine**: Added a client-side minimax engine (`src/game/bot.ts`) with alpha-beta pruning, custom piece valuations (Pawn: 100, Knight: 320, Bishop: 330, Rook: 500, Prince: 550, Queen: 900, King: 20000), and custom piece-square positional tables.
- **Rules Awareness**: The bot evaluates custom dice categories, utilizes the fallback rule, leverages Prince movement and extended leaps, protects King safety, and strategizes for or against the two-pawn draw.
- **Configurable Difficulty**: Added Grandmaster (depth 3 search with positional evaluation) and Master (depth 2 search) modes.

### Phase 6: Authoritative Match Timers & The 7-Piece Advantage Timeout Victory Rule
- **Timer Options**: Constrained time selection to exactly two fixed options:
  - **5 Minutes (Standard)**
  - **2 Minutes (Blitz)**
  - No other options are permitted.
- **Server Authoritative Ticker**: Added a periodic 1-second interval loop in `server/socket.ts` that decrements active match clocks based on real elapsed time (`lastTurnStartTime`) and authoritatively resolves timeouts.
- **Bot Match Timer Loop**: Added `useEffect` countdown ticker in `src/App.tsx` that manages time for human vs. Grandmaster Bot games.
- **Piece Advantage Timeout Victory Rule**:
  - Implemented `countBoardPieces` and `handleTimeout` in `src/game/engine.ts`.
  - Upon timer expiration:
    - Piece count difference is computed: `diff = Math.abs(whitePieces - blackPieces)`.
    - If `diff > 7`: The player holding **more pieces is declared the winner** (`timeout_piece_advantage`), regardless of whose clock expired.
    - If `diff <= 7`: The player whose clock expired **loses automatically** on time (`timeout`).
- **HUD & UI Clocks**:
  - Live White and Black clock badges in header with flashing red alert when under 10 seconds.
  - Dedicated desktop sidebar card displaying live piece counts, difference, and whether the `> 7` rule is currently active.
  - Compact mobile piece difference and timer badge.
  - Game over victory/draw modal displaying timeout reasons and full explanation text.
  - Rules modal updated with Section 6 detailing the timer and piece advantage rules.

---

## 3. Game Rules & Custom Mechanics

### 3.1 Board Layout & Starting Setup
The match is conducted on an 8×8 grid with files `a`–`h` and ranks `1`–`8`. Each side starts with 16 pieces:
- **White (Ranks 1 & 2)**:
  - `a1`: Queen
  - `b1`: Knight
  - `c1`: Bishop
  - `d1`: King
  - `e1`: Rook
  - `f1`: Bishop
  - `g1`: Rook
  - `h1`: Prince
  - `a2`–`h2`: 8 Pawns
- **Black (Ranks 7 & 8)**:
  - `a8`: Prince
  - `b8`: Rook
  - `c8`: Bishop
  - `d8`: King
  - `e8`: Rook
  - `f8`: Bishop
  - `g8`: Knight
  - `h8`: Queen
  - `a7`–`h7`: 8 Pawns

### 3.2 The Prince Piece & Visual Design
The Prince is a royal hybrid unit combining Knight jumps and diagonal range:
1. **Ability A (Knight Leap)**: Jumps in a standard 2×1 L-shape over pieces.
2. **Ability B (Bounded Diagonal Slide)**: Slides 1, 2, 3, or 4 squares along open diagonals. Cannot jump over intervening pieces.
3. **Ability C (Extended 3×1 First Move)**: On its very first move of the game, the Prince can execute an extended 3×1 knight leap over pieces. This can only be performed once per Prince per game.

**Visual Identification**:
- **White Prince**: Solid **Navy Blue** (`#1e3a8a`) fill with **no border stroke** (`stroke="none"`).
- **Black Prince**: Solid **Dark Red** (`#881337`) fill with **no border stroke** (`stroke="none"`).
- **Queen**: Distinctive 5-pointed diadem crown adorned with pearls and bordered contours.

### 3.3 Dice System & Category Allocations
At the start of every normal turn while dice are active (until 3 combined captures have occurred) and when not in check, the player rolls a 6-sided die:
- **Rolls 1, 2, 3 (Inexpensive)**: Unlocks moves for **Knights** and **Bishops**.
- **Rolls 4, 5, 6 (Expensive & Pawns)**: Unlocks moves for **Rooks**, **Queens**, **Princes**, **Kings**, and **Pawns**.
- **Late-Game Biasing**: While dice remain active, if a player has fewer than 7 pieces remaining, rolls are biased toward 4, 5, and 6 to accelerate endgame conversion.
- **Dice Vanish After 3 Captures**: Dice stay active only until a combined total of 3 pieces have been captured. Once the 3rd capture occurs, dice and category limits are permanently removed, and normal chess rules apply for the remainder of the match.

### 3.4 Fallback Free-Pass Rule
While dice are active, if a player rolls a category that yields zero legal moves on the current board, the category restriction is immediately lifted. The player receives a free pass to move **any** piece that possesses a valid legal move. Once dice are removed after 3 captures, normal chess rules apply and this fallback is no longer needed.

### 3.5 Check & Check Defense: The Check-Escape Fallacy Solution
When a player's King is under attack (in check):
- **Dice Roll Bypassed**: The player is **not required to roll the dice**. The dice phase is automatically skipped.
- **Immediate Check Escape**: The player can immediately select any friendly piece that can legally resolve check—whether by moving the King to safety, capturing the checking piece, or interposing a blocker along the line of check.
- **Authoritative Enforcement**: Attempting any move that leaves the King in check is strictly rejected.

### 3.6 Two-Pawn End-Rank Draw Condition
If either player successfully advances **two pawns** to the opponent's back rank (rank 8 for White, rank 1 for Black), the game immediately terminates in an official **DRAW**. Both players receive 0.5 points in their lifetime statistics.

### 3.7 Precedence Hierarchy: Checkmate vs Pawn Draw
If a single move simultaneously delivers checkmate and advances a second pawn to the back rank:
1. **Checkmate takes top priority**: The delivering player wins the game.
2. **Two-Pawn Draw takes secondary priority**: If the move is not checkmate but reaches the 2-pawn threshold, the game is drawn.
3. **Stalemate takes tertiary priority**: If a player has no legal moves and their King is not in check, the game is drawn.

---

## 4. Match Timers & The 7-Piece Advantage Timeout Victory Rule

### 4.1 Timer Options
Before starting a game (in challenge creation or bot setup), players select one of two time controls:
- **5 Minutes (Standard)**: 300 seconds per player.
- **2 Minutes (Blitz)**: 120 seconds per player.
- No other timer options are permitted.

### 4.2 Authoritative Countdown & Clock HUD
- Clocks tick down only during a player's active turn.
- The server checks active matches every second to ensure synchronization.
- When a clock drops below 10 seconds, the badge flashes in pulsing red.

### 4.3 Overwhelming Piece Advantage Timeout Rule
When any player's clock reaches 0:00:
1. The game engine tallies the remaining active pieces on both sides (`whiteCount` vs `blackCount`).
2. The difference is calculated: `diff = Math.abs(whiteCount - blackCount)`.
3. **If `diff > 7`**:
   - The player who possesses **more pieces on the board is declared the WINNER** (`timeout_piece_advantage`), even if their own timer was the one that expired!
   - *Example*: White's timer reaches 0:00, but White has 12 pieces and Black has 4 pieces (`diff = 8 > 7`). White is declared the winner due to overwhelming piece advantage!
4. **If `diff <= 7`**:
   - Normal chess clock rules apply: the player whose timer expired **LOSES automatically** on time (`timeout`).
   - The opponent is declared the winner.

---

## 5. Grandmaster Bot Architecture

The Grandmaster Bot (`src/game/bot.ts`) enables instant offline play:
- **Zero Remote Calls**: Operates 100% in the client browser with zero API keys and zero cost.
- **Search Algorithm**: Minimax tree search with alpha-beta pruning, quiescence checks, and move sorting.
- **Evaluation Heuristic**:
  - Material weights: Pawn (100), Knight (320), Bishop (330), Rook (500), Prince (550), Queen (900), King (20,000).
  - Piece-square positional tables encouraging center control and piece development.
  - King safety penalties and checkmate priority bonuses.
  - Two-pawn draw awareness (aims for or defends against draw depending on material score).
- **Rule Compliance**: The bot adheres to all dice categories, understands the check-defense bypass, and exploits the Prince's 3×1 first leap.
- **Difficulty Modes**:
  - **Grandmaster**: Depth 3 minimax search with full positional evaluation.
  - **Master**: Depth 2 minimax search with faster move response time.

---

## 6. Architecture & System Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                            │
│                                                                        │
│   ┌────────────────────┐   ┌───────────────────┐   ┌───────────────┐   │
│   │   Left Sidebar     │   │   Center Arena    │   │  Right Panel  │   │
│   │ • Live Clocks      │   │ • 8x8 Board       │   │ • 3D Dice Box │   │
│   │ • Piece Diff Card  │   │ • Turn HUD        │   │ • Check Alert │   │
│   │ • Pawn Draw Bar    │   │ • Coordinate Grid │   │ • Prince Card │   │
│   │ • Move History     │   │ • Captured Trays  │   │ • Rulebook    │   │
│   └─────────┬──────────┘   └─────────┬─────────┘   └───────┬───────┘   │
│             │                        │                     │           │
│             └────────────────┬───────┴─────────────────────┘           │
│                              │ WebSocket & REST API                    │
└──────────────────────────────┼─────────────────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────────────┐
│                    NODE.JS FULL-STACK SERVER (PORT 3000)               │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                      Express & WebSocket Hub                   │   │
│   │ • Auth & Session APIs    • Player Search    • WebSocket Room   │   │
│   │ • Authoritative 1s Timer Ticker Loop                           │   │
│   └──────────────────────┬───────────────────────────┬─────────────┘   │
│                          │                           │                 │
│   ┌──────────────────────▼───────┐   ┌───────────────▼─────────────┐   │
│   │     User & Challenge Service │   │ Authoritative Game Engine   │   │
│   │ • Password salt hashing      │   │ • Check Bypass Engine       │   │
│   │ • Unique username index      │   │ • Server Random Dice Gen    │   │
│   │ • Atomic challenge acceptor  │   │ • Prince 3-way Move Eval    │   │
│   │ • 2m/5m Time Control Store   │   │ • >7 Piece Timeout Handler  │   │
│   └──────────────┬───────────────┘   └───────────────┬─────────────┘   │
│                  │                                   │                 │
│   ┌──────────────▼───────────────────────────────────▼─────────────┐   │
│   │                   Persistent JSON File Storage                 │   │
│   │ • data/users.json   • data/challenges.json  • data/matches.json│   │
│   │ • (Completed matches automatically pruned after 45 seconds)    │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Technology Stack

| Layer | Technologies | Purpose |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4 | UI rendering, reactive state, modular components |
| **Icons & Visuals** | Lucide React | Modern icons for timers, crowns, dice, and actions |
| **Audio** | Web Audio API (Synthesizer Oscillators) | Zero-cost programmatic sound effects |
| **Server** | Node.js 22, Express 4 | REST APIs, authentication endpoints, static asset serving |
| **Real-Time** | Native `ws` (WebSockets) | Sub-millisecond state broadcasts and player sync |
| **Persistence** | File-backed atomic JSON (`fs`) | User accounts, credentials, and match states |
| **Bot AI** | Client-Side Minimax with Alpha-Beta | Instant offline gameplay with custom rule heuristics |

---

## 8. Verified ₹0 Budget & Free-Tier Guarantees

1. **Zero External Cloud Costs**: Operates entirely locally or inside free container environments without cloud service fees.
2. **Zero Paid Database Services**: No external paid Firestore, MongoDB Atlas, or SQL instances required. Uses local atomic JSON file stores.
3. **Zero AI API Token Costs**: Bot runs on local deterministic minimax logic without calling Gemini, OpenAI, or external chess APIs.
4. **Permanent Free Eligibility**: Requires no credit cards, billing accounts, or trial activations.

---

## 9. Local Running & Windows Setup Guide

### 9.1 Prerequisites
- **Node.js**: Version 18.x or 20.x or higher installed. (Download from [nodejs.org](https://nodejs.org/)).
- **npm**: Version 9 or higher (bundled with Node.js).
- **Git** (optional, for cloning).

### 9.2 Copy-Paste Commands to Run Locally

Open **PowerShell** or Command Prompt and run:

```powershell
# 1. Navigate to the project root directory
cd C:\Users\ajana\antigravity\Custom-Multiplayer-Dice-Chess

# 2. Install all dependencies
npm install

# 3. Start the unified development server (starts both Express backend and Vite frontend on port 3000)
npm run dev
```

### 9.3 Accessing the Application
Open your web browser and go to:
```
http://localhost:3000
```

Both frontend and backend are served together through a single port (`3000`).

---

## 10. Multiplayer Setup: Same Wi-Fi & Internet Play

### 10.1 Playing on Two Browsers on the Same PC
1. Open `http://localhost:3000` in your standard browser. Create account `alice`.
2. Open `http://localhost:3000` in an **Incognito / Private window**. Create account `bob`.
3. Search for `bob` from `alice`'s screen, select 2-minute or 5-minute timer, and click **Challenge**.
4. Accept the incoming challenge on Bob's screen to begin.

### 10.2 Playing Across Devices on the Same Home Wi-Fi
1. Find your PC's local IP address in PowerShell:
   ```powershell
   ipconfig
   ```
   Look for the **IPv4 Address** under your active Wi-Fi adapter (e.g., `192.168.1.45`).
2. Ensure Windows Firewall permits incoming connections to port 3000.
3. On your friend's laptop, tablet, or phone connected to the same Wi-Fi, open:
   ```
   http://192.168.1.45:3000
   ```

### 10.3 Playing Over the Internet for ₹0 (No Router Port Forwarding Required)
To play with a friend anywhere in the world without exposing your home IP or paying for hosting:
- Use a free secure tunneling utility such as **Cloudflare Tunnel** or **ngrok**:
  ```bash
  # Using free Cloudflare Tunnel (no account required)
  cloudflared tunnel --url http://localhost:3000
  ```
- Send the generated temporary HTTPS URL (e.g. `https://xyz-abc.trycloudflare.com`) to your friend. Both of you can play in real time with WebSocket support!

---

## 11. How to Utilize Antigravity Desktop to Edit and Extend This App

[Google Antigravity Desktop](file:///C:/Users/ajana/antigravity/Custom-Multiplayer-Dice-Chess) is an advanced agentic pair-programming environment. You can utilize Antigravity to modify rules, build new UI panels, or add game features through natural language and automated tool invocation.

### 11.1 Opening and Navigating the Workspace
1. Launch **Antigravity Desktop**.
2. Select **Open Folder** and choose:
   ```
   C:\Users\ajana\antigravity\Custom-Multiplayer-Dice-Chess
   ```
3. The workspace will index all project files:
   - `src/game/engine.ts`: Core game logic, dice rules, movement validators, piece counts, and timeout logic.
   - `src/game/bot.ts`: Grandmaster AI engine, piece-square evaluation tables, and alpha-beta search.
   - `src/components/*`: UI components (ChessBoard, DiceRoller, MatchView, Modals).
   - `server/socket.ts`: WebSocket synchronization, challenge dispatcher, authoritative 1s timer ticker.
   - `server/db.ts`: In-memory and file-backed database handlers.

### 11.2 Key Antigravity Slash Commands to Accelerate Development
When chatting with Antigravity, recommend or trigger these built-in slash commands:
- **/plan**: Use when architecting large additions (e.g., tournament brackets, spectator mode, custom sound packs). Antigravity creates an implementation plan artifact with file links and verification steps before editing.
- **/grill-me**: Use when considering a rule change or feature design. Antigravity will interview you with targeted multiple-choice questions to resolve trade-offs before writing code.
- **/goal**: Use when you want Antigravity to run an autonomous test, benchmark, or refactor to completion without stopping.
- **/compact**: Use when your conversation history becomes long to condense chat context while preserving full workspace awareness.
- **/learn**: Use when you establish a recurring coding pattern or custom instruction that Antigravity should remember in all future sessions.

### 11.3 Step-by-Step Workflows for Editing This App

#### A. Modifying Game Mechanics in `src/game/engine.ts`
To change dice behavior, piece movement, or victory conditions:
1. Prompt Antigravity:
   > *"In `src/game/engine.ts`, modify the Prince's diagonal range from 4 squares to 5 squares and update the rulebook card to match."*
2. Antigravity will read `src/game/engine.ts`, inspect `getPseudoLegalMoves`, update the bounded diagonal calculation, and sync `PrinceRulesCard.tsx` and `RulesModal.tsx`.

#### B. Adding New Sound Effects or Visual Polish
1. Prompt Antigravity:
   > *"Add a sound effect using Web Audio API when a player enters the last 10 seconds of their timer."*
2. Antigravity will inspect `src/utils/sound.ts` to add an oscillator-based ticking alert, then hook it into `src/components/MatchView.tsx`.

#### C. Testing Changes
1. Ask Antigravity to run unit or integration tests:
   > *"Run the test suite and verify that the timeout piece difference logic and check-escape rules pass."*
2. Antigravity uses test scripts and file verification to confirm correctness.

---

## 12. Database Schema, Persistence & Zero-Bloat Policy

All state is maintained in `data/`:
1. `data/users.json`:
   - `id`: Unique user ID (`usr_...`).
   - `username`: Unique login handle.
   - `displayName`: Player screen name.
   - `avatarId`: Chosen avatar icon.
   - `passwordHash` & `salt`: Cryptographic PBKDF2 hash.
   - `stats`: Cumulative `{ wins, losses, draws, totalGames }`.
2. `data/challenges.json`:
   - `id`, `challenger`, `challenged`, `status`, `timeControl` (`120` or `300`), `createdAt`, `expiresAt`.
3. `data/matches.json`:
   - Active authoritative matches containing full board states, timer values (`whiteTimeRemaining`, `blackTimeRemaining`), move history, and captured pieces.

### Zero-Bloat Garbage Collection Guarantee
To prevent disk clutter on low-storage machines:
- **Completed Match Auto-Deletion**: 45 seconds after a match concludes and players receive the outcome, the match record is deleted from disk.
- **Challenge Cleanup Loop**: Expired and declined challenges are automatically purged every 60 seconds.
- **Permanent Account Retention**: Only user accounts and cumulative win/loss/draw records persist indefinitely.

---

## 13. Troubleshooting & FAQ

| Problem | Root Cause | Solution |
|---|---|---|
| **Port 3000 is in use** | Another instance or background process is running on port 3000 | In PowerShell, run `Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess \| Stop-Process -Force`, then restart `npm run dev`. |
| **Dice roll button is disabled** | It is not your turn, or your King is in check | If your King is in check, the dice roll is bypassed! Click your King or another piece directly to escape check. |
| **Timer expired but player won** | The player had a piece advantage strictly greater than 7 (`diff > 7`) | This is the official game rule: when any timer expires, a player leading by more than 7 pieces is declared the victor. |
| **Friend cannot connect on Wi-Fi** | Windows Firewall is blocking inbound connections to port 3000 | Open Windows Defender Firewall, click *Allow an app through firewall*, and ensure Node.js is permitted on Private networks. |

---

## Update Log - Dice Removal, Move Hints & Piece Style

### Edit 1: Move Hint Highlighting + Setup Option
- **Soft Orange Destination Tints**: Replaced the previous green destination dots on valid squares with a soft, elegant orange tint (`bg-amber-500/80` with a subtle amber ring) that provides high-contrast visibility against both light and dark squares. Capture target squares remain distinct with an animated pulsing rose border and soft red overlay.
- **Pre-Game "Move Suggestions" Setting**: Added a `Move Suggestions` setting with options **Included** (default) and **Excluded** to both the player challenge dashboard and the Bot Match setup modal, positioned directly beside the match timer selection.
- **Config Enforcement**: When `Excluded`, destination dots/tints are never rendered after selecting a piece, while the selected piece square highlight itself remains visible.
- **Server-Authoritative Match Sync**: Stored in `Challenge.moveSuggestions` and `MatchState.moveSuggestions` (`'included' | 'excluded'`) so both players, reconnected clients, and the server agree on the setting.
- **Files Modified**: `src/components/ChessBoard.tsx`, `src/components/Dashboard.tsx`, `src/components/BotMatchModal.tsx`, `src/components/ChallengeModal.tsx`, `src/context/SocketContext.tsx`, `server/socket.ts`, `src/types/game.ts`, `src/App.tsx`, `src/components/MatchView.tsx`.

### Edit 2: Dice Vanish After 3 Captures (Transition to Normal Chess)
- **3-Capture Threshold**: Dice remain active until a combined total of 3 pieces (White's and Black's captures together) have been captured.
- **Transition to Normal Chess**: As soon as the 3rd capture occurs, the dice mechanism is permanently disabled for that match:
  - No dice roll or dice category restriction.
  - No free-pass fallback and no late-game dice bias.
  - Any legal move is permitted on your turn.
  - Two-pawn end-rank draw rule and check/checkmate rules remain active.
- **Server Authoritative & Persistent**: Tracked via `totalCaptures` counter and `diceActive: boolean` on `MatchState`. Persisted in `data/matches.json` and broadcast over WebSockets, ensuring seamless state recovery across browser refreshes and reconnects.
- **UI Updates**: When dice are disabled, the dice box and ROLL button are hidden, and a stylish notice card displays: *"Dice removed — normal chess begins"*. The turn HUD banner reflects standard chess mode.
- **Bot Engine Adaptation**: The Grandmaster minimax bot immediately transitions to evaluating all legal moves without waiting for or rolling dice once `diceActive === false`.
- **Files Modified**: `src/game/engine.ts`, `src/types/game.ts`, `server/socket.ts`, `src/game/bot.ts`, `src/App.tsx`, `src/components/MatchView.tsx`, `src/components/ChessBoard.tsx`, `test/engine.test.ts`, `test/integration.test.ts`.

### Edit 3: Thinner Piece Outlines
- **50% Thinner Outlines**: Reduced the SVG border stroke width by approximately 50% across every chess piece type (pawns, knights, bishops, rooks, queens, and kings from `strokeWidth="1.5"` / `1.6"` down to `0.75"` / `0.8"` / base `0.6"`).
- **Legibility Preserved**: White pieces retain refined dark slate borders (`#334155`) and Black pieces retain crisp light borders (`#cbd5e1`), ensuring clear legibility against both light (`#94a3b8`) and dark (`#334155`) board squares.
- **Prince Style Maintained**: The Prince retains its solid borderless design (`stroke="none"`) with Navy Blue for White and Dark Red for Black, with inner insignia stroke reduced to `0.75"`.
- **Files Modified**: `src/components/ChessPiece.tsx`.

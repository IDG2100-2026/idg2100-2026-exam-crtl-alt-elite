# Leave below any info you want examiners to see

## Starter code

This project is built on top of code from the individual mandatory assignments (Obligs 1–3). 

All reused code has been significantly modified to fit the new shared architecture, extended with new features, and integrated into the group project.


## Code reuse

We reused and modified parts of the following:

- **Oblig 3 (Nora) - Backend**: Authentication flow (register/login/JWT), user model, and basic game/tournament structure were adapted from this submission. All code has been reworked to fit the new architecture and requirements.

- **Oblig 1 (Sanna)**: The dice web components (`dice-poker-die`, `dice-poker-board`, `dice-poker-monitor`) were reused and adapted from the individual Oblig 1 submission.

- **Oblig 3 (Sanna)**: The static pages (About Us, How to Play, Terms & Conditions, Privacy Policy) were reused and adapted from the individual Oblig 3 submission.

- **In-class examples (IDG2100 Fullstack 2026)**: The auto-generated custom ID pattern (pre-validate Mongoose hook) and the core fetch wrapper (apiFetch with automatic token refresh) were adapted from in-class code. This is noted in comments in the relevant files (`game.js`, `api.js`).

All reused code has been modified to fit the new architecture. Sources are noted in code comments where applicable.


## Work distribution

All team members contributed to both backend and frontend. Rough feature ownership:

- **Nora**: Backend architecture (auth, JWT, email verification, models, validators, WebSocket game and comment socket, admin backend, seed script), individual tournament page, login/register frontend fixes
- **Sanna**: Static pages, user profile page, styling/dark mode/settings panel/responsive layout, game board frontend, dice web components, admin frontend pages, leaderboard page, homepage activity section, bug fixes
- **Sabrina**: Create game page, AuthContext setup, frontend tree structure, admin page structure, tournament page restructure and styling


## Notes on running the project

### Prerequisites
- Node.js v18 or higher
- npm
- MongoDB running locally (e.g. via MongoDB Compass or `mongod`)
- A mail service for email verification - we used [Ethereal](https://ethereal.email) for local testing (free fake SMTP)

### Backend setup

1. Navigate to the backend folder:
```bash
cd backend/project
npm install
```

2. Create a `.env` file in `backend/` with the following variables:
```
BACKEND_PORT=9000
DB_HOSTNAME=localhost
DB_PORT=27017
DB_NAME=gameApp
ACCESS_TOKEN_SECRET=any_long_random_string_here
REFRESH_TOKEN_SECRET=any_other_long_random_string_here
FRONTEND_URL=http://localhost:5173
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=your_ethereal_user
EMAIL_PASS=your_ethereal_pass
```

3. Seed the database:
```bash
npm run seed
```

The seed script creates:
- 15 sample users, including 2 admins and users with various Elo ratings and points
- 162 game variants (all combinations of rounds × time control × straights × players × buy-in)
- Sample games in various states (room, ongoing, finished)
- Sample tournaments (upcoming, ongoing, finished, cancelled)
- Sample comments on games and tournaments
- Sample security incidents (rate limit hits, IP mismatches)

4. Start the backend:
```bash
npm run dev
```
The API will be available at `http://localhost:9000/api`.
WebSocket connects on the same port.

### Frontend setup

1. Navigate to the frontend folder:
```bash
cd frontend
npm install
```

2. Create a `.env` file in `frontend/` (it is gitignored and must be created manually):
```
VITE_API_PROTOCOL=http
VITE_API_HOSTNAME=localhost
VITE_API_PORT=9000
```

3. Start the frontend:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

### Admin access
Log in with one of the seeded admin accounts:
- `alice@example.com` / username: `admin_alice` / password: `password12345`
- `bob@example.com` / username: `admin_bob` / password: `password123`


## What is implemented

### Authentication & Authorization
- Register with email verification (token expires in 15 min, resend option available)
- Login with access token (JWT, short-lived) + refresh token (httpOnly cookie)
- Automatic token refresh on 401 - transparent to the user
- IP mismatch detection on token use (security incident logged)
- Rate limiting: 100 req/min general, 10 req/15min on auth endpoints
- Banned users cannot log in
- Anonymous users can spectate but cannot join games or tournaments

### User Profile
- View and edit profile (username, email, about me, password)
- Avatar upload (profile picture)
- Points balance shown on profile
- Elo rating with weekly change (colour coded green/red)
- Recent games list with load-more pagination
- Wins and losses in the last month

### Homepage
- Hero section with Create Game button
- Live lobby preview (configurable number of games shown via settings)
- Top games section
- Platform activity (active players this week, games played, available games now)

### Lobby & Games
- Lobby page with filters (straights, rounds, time control) and pagination
- Create game page (choose variant from all 162 combinations)
- Live game board using Web Components (`dice-poker-die`, `dice-poker-monitor`)
- Turn-based rolling: up to 3 rolls per turn, hold dice between rolls
- Rolls generated on the backend - frontend only sends held dice indexes
- Betting phase: bet, raise, match, fold with pot tracking
- Reveal phase: all dice revealed, round winner determined
- Multiple rounds → game end screen with final scores and winner
- Game monitor in sidebar (live turn/roll/round updates via custom events)
- Live comments via WebSocket (new comments appear without page reload)
- Waiting room with Join button and Leave room button
- Auto-roll for timed-out players (random dice, no re-rolls)
- ELO re-estimation at game end (pair-based algorithm adapted for 2–5 players)
- Points deducted on join (buy-in), returned at game end based on final stack
- Leaderboard (top 10, sortable by ELO / wins / win% / games played)

### Tournaments
- Tournament list page with pagination, sorting (date/title/players), and search
- Individual tournament page with description, trophy, player list, standings, comments
- Join and leave a tournament (with ELO range check if set)
- Cancel and delete tournament (admin only)
- Tournament cards show host username (not raw user ID)

### Admin Pages
- Admin dashboard: platform activity, security incidents, links to other admin pages
- User administration: search, list, ban/unban, make admin
- Comment administration: view recent comments, delete
- Admin-only nav (no footer, only logo + admin links in header)

### Styling & UX
- Light/dark theme toggle (persisted in localStorage)
- Color picker for game board background
- Sound on/off toggle (setting exists in UI)
- Slider to configure number of lobby games shown on homepage
- Responsive layout with hamburger menu (mobile-friendly)
- Anonymous users redirected to login when trying to join a game or tournament

### Static Pages
- About Us, How to Play (About Dice), Terms & Conditions, Privacy Policy, 404 Not Found

### Database & Seed
- Full seed script with 15 users, 162 variants, games, tournaments, comments, incidents


## Unfinished parts and known deviations

### Missing features
- **Forgot password**: No backend reset email flow and no frontend page. Users must contact an admin to reset passwords.
- **Elo per time control**: The spec requires 3 separate Elo values (one per time control). Currently only a single `eloRating` is tracked.
- **Points weekly reset**: The spec says players receive 100 points each week. This is not implemented - points are only awarded and deducted through games.
- **Homepage tournament preview**: The 5 upcoming tournaments section on the homepage is not implemented.
- **Tournament round logic**: Tournaments can be created, joined, and cancelled, but rounds do not progress automatically. There is no random-pairing or auto-start of games between tournament rounds.
- **Tournament ELO/points after tournament end**: End-of-tournament standings and point awards are not calculated.
- **Admin tournament creation/edit page**: The backend endpoints exist and work, but the admin frontend form for creating and editing tournaments is not built.
- **Redirect players to game during tournament rounds**: The frontend listens for `tournament_game_ready` and navigates automatically, but the backend never emits this event since tournament round logic is not implemented.

### Known deviations from spec
- **Time control**: The spec says total time for all rounds (10/30/90 seconds total). Currently the time control is per-turn (stored as seconds per turn on the game variant). The game enforces the timer correctly per turn, but the total-time interpretation is not implemented.
- **Other players' holds**: The spec says other players should see held dice *positions* (not values). Currently the backend broadcasts hold counts and the frontend shows "Player X is holding N dice." The specific positions are tracked but not visually rendered as dice placeholders for other players.
- **Sounds**: The sound on/off toggle exists in the settings panel, but no sounds are wired to game events (roll, hold, round start/end, game end).
- **Game state on page reload**: Current round, phase, pot, and turn are restored on reconnect, but dice already rolled in the current turn may not reappear after a full page reload.
- **Abandoned players in betting**: If a player abandons during the betting phase, they do not automatically match the highest bet as per spec. The auto-roll on turn timeout during rolling is implemented.
- **Loading states and error handling**: Most data-fetching pages show a plain text loading message rather than a spinner. There is no graceful UI when the backend is unreachable.

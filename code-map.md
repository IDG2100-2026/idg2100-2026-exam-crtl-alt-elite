# Code Map — Where Things Are

## What Each File Does

### Models
**`models/user.js`**
Defines the User document stored in MongoDB. Contains all user fields (userId, username, pwd, email, age, role, eloRating, points, recentGames, trophies, refreshToken, emailVerified etc.). Has a `pre("validate")` hook that auto-generates userId and hashes the password before saving. The `toJSON` transform strips sensitive fields before the data is sent to the client.

**`models/game.js`**
Defines the Game document stored in MongoDB. Tracks everything about a single game — the players array, which variant is being played, the pot, current status (room/ongoing/finished/cancelled), current round, current phase (rolling/betting/reveal), whose turn it is, how many rolls have been used, and the winner. Also has a `pre("validate")` hook that auto-generates gameId.

**`models/gameVariant.js`**
Defines the GameVariant document. Each variant is a combination of rules — number of rounds, number of players, time control, and buy-in cost. There are 162 variants in total.

---

### Controllers
**`controllers/auth.controller.js`**
Handles all auth-related HTTP endpoints: register, login, logout, refresh token, verify email, and resend verification email. Checks credentials, calls auth services for token logic, sets/clears the refresh token cookie, and sends responses.

**`controllers/game.controller.js`**
Handles all game-related HTTP endpoints: get all games (with filtering and pagination), get a single game, create a room, join a room, and leave a room. Checks buy-in points, deducts/returns points, starts the game when the room fills up, and triggers the first round via the roll handler.

**`controllers/gameVariant.controller.js`**
Handles the endpoint for fetching game variants, with optional filtering support.

---

### Services
**`services/auth.services.js`**
Contains the business logic for authentication. Generates and sets email verification tokens, verifies email tokens, issues access and refresh token pairs, rotates refresh tokens (with token reuse detection), and revokes refresh tokens on logout.

**`services/game.services.js`**
Contains the business logic for games. Rolls dice, filters other players' dice until reveal, enriches game data with usernames and ELO from the User model, determines the winner, returns points to player profiles after a game, calculates ELO ratings using the standard chess ELO formula, and updates ELO for all players after a game ends.

**`services/user.services.js`**
Contains business logic related to user data (profile updates, etc.).

**`services/comment.services.js`**
Contains business logic for comments.

---

### Middleware
**`middleware/validate.js`**
Runs after express-validator checks the request data. If there are validation errors it returns 400 with the error list. If everything is valid it puts the clean data on `req.validData` so the controller can use it safely.

**`middleware/errorhandler.js`**
Global error handler. Catches any unhandled errors passed via `next(err)` and sends a clean JSON response with the error message and status code. Prevents raw error stack traces from leaking to the client.

**`middleware/auth.js`**
Checks the access token on protected routes. Verifies the JWT and attaches the decoded user (userId, role) to `req.user` so controllers know who is making the request.

**`middleware/uploads.js`**
Handles file uploads (e.g. avatar images) using multer.

---

### WebSocket Handlers
**`websocket/gameSocket.js`**
Registers all real-time Socket.io event listeners for a game. Handles: joining a game room, rolling dice, ending a turn, holding dice, placing bets, and disconnecting. On disconnect it waits 30 seconds before marking the player as abandoned, in case they reconnect. Sends filtered game state to players when they join.

**`websocket/handlers/rollHandler.js`**
Handles everything related to the rolling phase. Starts the rolling phase at the beginning of a round, performs individual dice rolls (keeping held dice), ends a player's turn and moves to the next player, and starts the betting phase when all players have rolled. If a player times out without rolling, they get a random hand.

**`websocket/handlers/betHandler.js`**
Handles all betting actions during the betting phase: bet (open), raise, match, and fold. Validates each action, updates the player's points and the pot, broadcasts the result to all players, and checks if betting is complete after each action. If a player can't afford to match, they are force-folded.

**`websocket/handlers/roundHandler.js`**
Handles the end of a round. Reveals all dice, determines the round winner, awards the pot, resets bets, and either starts the next round or ends the game if all rounds are done.

---

### Utils
**`utils/hash.js`**
Contains `hashPwd` (hashes a plain text password using scrypt) and `checkPwd` (checks a plain text password against a stored hash).

**`utils/jwt.js`**
Contains functions to sign and verify JWTs — `signAccessToken`, `signRefreshToken`, and `verifyRefreshToken`.

**`utils/email.js`**
Sends emails — used for sending the email verification link to new users.

**`utils/gameTimer.js`**
Manages countdown timers for the game. Has a turn timer (counts down during the rolling phase — if a player doesn't roll in time their turn is ended automatically) and a betting timer (counts down during the betting phase — if it expires the round ends). Each active game has its own timer stored in a Map.

---

### Routers
**`routers/routes/game.routes.js`**
Maps game-related URLs to controller functions and defines which middleware (auth, validation) runs on each route.

**`routers/routes/auth.routes.js`**
Maps auth-related URLs to controller functions.

---

## What Each Folder Does

**Models** (`models/`)
Defines the shape of the data stored in MongoDB. Each model is a schema that describes what fields a document has, what type they are, and any rules (required, min, max etc.). The model is what you use to read and write to the database.
Example: `models/user.js` defines what a user document looks like in the database.

**Controllers** (`controllers/`)
Handles incoming HTTP requests from the frontend. A controller function receives the request, does some checks, calls services or the database, and sends back a response. Controllers are the entry point for the API.
Example: `controllers/auth.controller.js` handles POST /api/auth/login — it checks the password, and sends back a token.

**Services** (`services/`)
Contains the business logic — the actual "thinking" of the application. Controllers are kept simple by moving complex logic into services. Services don't know about HTTP requests or responses, they just do a job and return a result.
Example: `services/auth.services.js` handles token generation and rotation. `services/game.services.js` handles ELO calculations and dice rolling.

**Middleware** (`middleware/`)
Code that runs between the request arriving and the controller handling it. Used for things like checking if the user is logged in, or validating the request body before it reaches the controller.
Example: the auth middleware checks the access token on protected routes. The validate middleware checks that the request data is valid.

**Routers** (`routers/`)
Maps URLs to controller functions. Defines which HTTP method and path triggers which controller, and which middleware runs first.
Example: `routers/routes/game.routes.js` maps POST /api/games to the `createRoom` controller.

**Utils** (`utils/`)
Small reusable helper functions that don't belong to any specific feature. Things like hashing passwords, signing JWTs, or managing timers.
Example: `utils/hash.js` has the hashPwd and checkPwd functions. `utils/jwt.js` has the signAccessToken function.

**WebSocket** (`websocket/`)
Handles real-time communication using Socket.io. Unlike HTTP which is request/response, WebSocket keeps a connection open so the server can push updates to the client instantly. Used for live game events like rolling dice and placing bets.
Example: `websocket/gameSocket.js` listens for events like `roll_dice` and `place_bet` from players.

---

## Auth

| What | Where |
|------|-------|
| Register, login, logout, refresh, email verification endpoints | `controllers/auth.controller.js` |
| Token generation, token rotation, email verification logic | `services/auth.services.js` |
| Password hashing function | `utils/hash.js` |
| Password hashing hook (when it runs) | `models/user.js` — `pre("validate")` |
| Refresh token sent as httpOnly cookie | `controllers/auth.controller.js` — `login` and `refresh` |
| Refresh token cleared on logout (server-side) | `services/auth.services.js` — `revokeRefreshToken` |
| Refresh token cookie cleared on logout (client-side) | `controllers/auth.controller.js` — `logout` |
| Cookie security options (httpOnly, secure, sameSite) | `controllers/auth.controller.js` — `_refreshTokenCookieOptions` |
| Email verification token generation | `services/auth.services.js` — `generateVerificationToken` |

## User Model

| What | Where |
|------|-------|
| User schema (all fields) | `models/user.js` |
| Auto-generated userId | `models/user.js` — `pre("validate")` |
| Fields hidden from queries by default (select: false) | `models/user.js` — `pwd`, `refreshToken`, `emailVerificationToken`, `emailVerificationExpiry` |
| Fields removed before sending to client | `models/user.js` — `toJSON` transform |

## Game

| What | Where |
|------|-------|
| Game schema (all fields) | `models/game.js` |
| Auto-generated gameId | `models/game.js` — `pre("validate")` |
| Create a game room | `controllers/game.controller.js` — `createRoom` |
| Join a game room | `controllers/game.controller.js` — `joinRoom` |
| Leave a game room | `controllers/game.controller.js` — `leaveRoom` |
| Check user has enough points before joining | `controllers/game.controller.js` — `createRoom` and `joinRoom` |
| Deduct buy-in points when joining | `controllers/game.controller.js` — `joinRoom` and `createRoom` |
| Return buy-in points when leaving | `controllers/game.controller.js` — `leaveRoom` |
| Game starts automatically when room is full | `controllers/game.controller.js` — `joinRoom` |
| Get all games (paginated, filterable) | `controllers/game.controller.js` — `getAllGames` |
| Get a single game | `controllers/game.controller.js` — `getGame` |
| Filter out other players' dice until reveal | `services/game.services.js` — `filterRollsForUser` |
| Add username and ELO to player data in responses | `services/game.services.js` — `enrichGameWithUserInfo` |

## Game Logic (Services)

| What | Where |
|------|-------|
| Poker dice faces defined | `services/game.services.js` — `POKER_FACES` |
| Roll 5 dice | `services/game.services.js` — `rollDice` |
| Determine round/game winner | `services/game.services.js` — `determineWinners` |
| Return remaining points to player profiles after game | `services/game.services.js` — `returnPointsToProfiles` |
| ELO rating update after game | `services/game.services.js` — `updateELORatings` |
| ELO calculation formula | `services/game.services.js` — `calculateNewELO` |

## WebSocket (Real-time)

| What | Where |
|------|-------|
| All real-time game events | `websocket/gameSocket.js` |
| Player joins a game socket room | `websocket/gameSocket.js` — `join_game` event |
| Player rolls dice | `websocket/gameSocket.js` — `roll_dice` event |
| Player ends turn early | `websocket/gameSocket.js` — `end_turn` event |
| Player holds dice (position shared, not values) | `websocket/gameSocket.js` — `hold_dice` event |
| Player places a bet | `websocket/gameSocket.js` — `place_bet` event |
| Player disconnects — 30 second grace period | `websocket/gameSocket.js` — `disconnect` event |
| Player marked as abandoned after disconnect | `websocket/gameSocket.js` — `disconnect` event |
| Reconnecting player gets their game state restored | `websocket/gameSocket.js` — `sendCurrentRollToReconnectingPlayer` |

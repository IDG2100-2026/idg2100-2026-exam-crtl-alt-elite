# Exam Study Guide - Backend and Architecture

For when they ask about code you didn't write.

---

## System Architecture (know this cold)

```
Browser (React + Vite)
    |
    |--- HTTP (REST) -------> Express (port 9000)
    |                              |
    |--- WebSocket (Socket.io) --> Express (same port)
                                   |
                              Mongoose (ODM)
                                   |
                              MongoDB (local)
```

**HTTP** is used for: login, register, profile, leaderboard, tournaments, admin, avatar upload

**WebSocket** is used for: everything that happens live during a game (rolling, holding, betting, phase changes, round results, game end) + live comments

---

## JWT Authentication Flow

### How tokens work

Two tokens exist:

| | Access Token | Refresh Token |
|---|---|---|
| Where stored | In memory (JS variable) | httpOnly cookie (browser only) |
| Lifespan | Short (~15 min) | Long (~7 days) |
| Sent with | Every API request in `Authorization: Bearer ...` header | Automatically by browser on cookie requests |
| Why this way | In memory = safe from XSS. Cookie = safe from JS access |

### Step by step on login

1. User posts credentials to `POST /api/auth/login`
2. Backend verifies password (scrypt hash comparison)
3. Backend creates access token: `jwt.sign({ userId, role, ip }, SECRET)`
4. Backend creates refresh token: `jwt.sign({ userId }, REFRESH_SECRET)`
5. Refresh token saved to user document in DB, sent as httpOnly cookie
6. Access token returned in response body → stored in `accessToken` variable in `api.js`

### Automatic token refresh (transparent to user)

When a request gets a 401 response, `apiFetch` in `api.js` automatically:
1. Calls `POST /api/auth/refresh` (browser sends cookie automatically)
2. Backend verifies refresh token, issues new access token
3. New access token stored, original request retried
4. If refresh also fails → user is logged out

```js
// In api.js
if (resp.status === 401 && !retry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
        return apiFetch(endpoint, options, true); // retry with new token
    }
    accessToken = null;
    throw new Error("Session expired");
}
```

### Why not localStorage for the access token?

localStorage is readable by any JS on the page. If there is an XSS vulnerability, an attacker can read the token. Storing it in a JS variable means it only exists in memory and is gone on page reload.

### IP mismatch detection

The access token includes the user's IP at login time. On every request, `identifyUser` checks if the current request IP matches the token IP. If not, a `SecurityIncident` is logged and the request is rejected. This catches stolen tokens used from different locations.

---

## Auth Middleware Chain

Every protected route passes through middleware in order:

```
identifyUser → requireUser → (requireAdmin) → controller
```

**`identifyUser`** (runs on every route):
- Reads `Authorization: Bearer <token>` header
- If no token: sets `req.user = { role: "anonymous" }` and continues
- If invalid token: 401
- If IP mismatch: logs incident, 401
- Looks up user in DB, checks they exist and aren't banned
- Sets `req.user` to the full user document

**`requireUser`**:
- Blocks anonymous users (401 if `req.user.role === "anonymous"`)

**`requireAdmin`**:
- Blocks non-admins (403 if `req.user.role !== "admin"`)

**`requireVerified`**:
- Blocks unverified users (403 if `!req.user.emailVerified`)

### Example route
```js
router.put("/:id", identifyUser, requireUser, validate, userController.update);
//         ^reads token  ^blocks anon  ^validates body  ^controller
```

---

## WebSocket Architecture

### Connection setup

Socket connects when user logs in (in `AuthProvider`):
```js
// socket.js
socket = io(SOCKET_URL, {
    auth: { token: getAccessToken() }, // backend reads this to authenticate the socket
    reconnectionAttempts: 5,
    reconnectionDelay: 2000
});
```

The backend authenticates the socket using the same JWT verification as HTTP routes.

### Rooms

Socket.io uses "rooms" to send events only to relevant clients:

```js
socket.join(`game:${gameId}`);   // join a game room
io.to(`game:${gameId}`).emit(…); // send to everyone in that game
socket.emit(…);                   // send to only this socket (private, e.g. roll_result)
```

### Full game event flow

```
CLIENT emits:          SERVER responds with:           Goes to:
join_game           -> game_state                    -> just you (current state)
roll_dice           -> roll_result                   -> just you (your dice)
                    -> turn_update                   -> everyone (whose turn now)
hold_dice           -> holds_update                  -> everyone (how many dice held)
place_bet           -> bet_update                    -> everyone (action + new pot)
                    -> (if betting done) round_end   -> everyone (reveal all dice)
                    -> (if game done) game_end       -> everyone (final scores)
```

---

## Betting Logic (betHandler.js)

Four actions a player can take during betting phase:

### bet
- Opens the betting, first action of the round
- Only valid when `highestBet === 0` (nobody has bet yet)
- Deducts full `amount` from player points

### raise
- Increases the bet above the current highest
- Player already paid some earlier - only charges the **difference**: `amount - player.currentBet`
- Example: highestBet=10, you already bet 5 → raise to 20 → you only pay 15 more

### match
- Pays the difference to reach the current highest bet: `highestBet - player.currentBet`
- If player can't afford it → forced fold (their existing bet stays in pot)

### fold
- Exits the round. Points already bet stay in the pot.

### When does betting end?
```js
const bettingComplete = activePlayers.every(p => {
    const round = p.rounds.find(r => r.roundNumber === game.currentRound);
    return round?.folded || p.currentBet === currentHighestBet;
});
```
Betting ends when every active (non-abandoned) player has either folded or matched the highest bet.

---

## Round Flow

```
Round starts
    -> handleRoll: first player rolls dice
    -> turn_update emitted: next player's turn
    -> (repeat until all players have rolled)
    -> phase_change: "betting"
    -> players place bets
    -> (when betting complete) handleRoundEnd:
        -> all dice revealed
        -> round winner determined (best poker hand)
        -> pot split among winners
        -> round_end emitted
        -> if more rounds: start next round after 3s delay
        -> if last round: handleGameEnd
```

### Determining the round winner (`roundHandler.js`)

1. Filter to active players (not folded, not abandoned)
2. If only 1 active player: they win
3. If 0 active players (everyone folded): player with highest `currentBet` wins
4. Otherwise: evaluate each player's hand, sort by score, return all tied for highest

Hand scoring uses a single number: `handScore * 1000000 + tiebreaker`
Higher = better hand. Tiebreaker encodes face ranks so pair of Aces beats pair of 7s.

---

## Database Models

### User model (user.js)
Key fields:
- `userId`: auto-generated random number (NOT MongoDB `_id`)
- `pwd`: stored as `"salt:hash"` (scrypt), never plain text
- `role`: `"anonymous"` | `"user"` | `"admin"`
- `refreshToken`: current valid refresh token (replaced on every refresh)
- `emailVerified`: must be true to join games
- `select: false` on pwd, refreshToken, emailVerification fields - these are never returned in queries unless explicitly asked for

**Auto-ID hook** (pre-validate):
```js
userSchema.pre("validate", function() {
    if (this.isNew) {
        this.userId = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
    }
    if (this.isModified("pwd")) {
        this.pwd = hashPwd(this.pwd); // hash on save
    }
});
```

**toJSON transform**: strips `_id`, `pwd`, `refreshToken` from every response automatically.

### Game model (game.js)
Key fields:
- `gameId`: auto-generated (same pattern as userId)
- `players`: array of sub-documents (each has their own rounds, bets, dice state)
- `variantId`: reference to GameVariant (populated with `.populate("variantId")`)
- `status`: `"room"` | `"ongoing"` | `"finished"` | `"cancelled"`
- `currentPhase`: `"rolling"` | `"betting"` | `"reveal"`
- `pot`: total points currently in the pot

### Sub-schemas
Mongoose supports nested schemas (sub-documents):
```js
// player sub-schema embedded in game
players: [playerSchema]

// round sub-schema embedded in player
rounds: [roundSchema]
```
This means round data lives inside the game document, not a separate collection.

---

## apiFetch - The HTTP Wrapper (api.js)

All HTTP calls go through `apiFetch`:

```js
async function apiFetch(endpoint, options, retry = false) {
    // 1. Build headers (add Content-Type and Authorization)
    // 2. Call fetch()
    // 3. If 401 and not retried: refresh token and retry
    // 4. Parse JSON, throw on error
}
```

Why it skips `Content-Type: application/json` for FormData:
```js
if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
}
```
FormData (file uploads) sets its own `Content-Type: multipart/form-data; boundary=...` automatically. Setting it manually would break the upload.

`credentials: "include"` is required so the browser sends the httpOnly refresh token cookie on cross-origin requests.

---

## Express Middleware Pattern

Middleware is a function with `(req, res, next)`. It either sends a response or calls `next()` to pass to the next middleware.

```js
// A simple middleware
function checkSomething(req, res, next) {
    if (bad) return res.status(400).json({ msg: "Bad" });
    next(); // pass to next middleware or controller
}

// Used in a route
router.get("/path", checkSomething, controller);
```

Routes in this project:
- `GET /api/users/:id` - get user profile (public)
- `PUT /api/users/:id` - update profile (requires login + own account)
- `PUT /api/users/:id/avatar` - upload avatar (requires login + multer)
- `PUT /api/users/:id/ban` - ban user (requires admin)
- `GET /api/leaderboard` - get leaderboard (public)
- `POST /api/auth/login` - login
- `POST /api/auth/refresh` - get new access token

---

## Validation Pattern (express-validator)

Routes use validators before controllers:
```js
router.put("/:id", requireUser, userValidator.validateUpdate(), validate, controller);
//                              ^express-validator rules        ^runs the rules
```

`validate` middleware checks `validationResult(req)` and returns 422 if anything failed. Validated data is available at `req.validData` (set by a custom sanitizer) rather than the raw `req.body` or `req.params`.

This is why in controllers you see `req.validData.id` not `req.params.id`.

---

## Multer - File Uploads

Multer is middleware that handles `multipart/form-data` requests (file uploads):

```js
// Route order matters:
router.put("/:id/avatar",
    requireUser,
    validateUserId(), validate,   // validate BEFORE multer
    uploadMiddleware.single("avatar"),  // multer parses the file
    controller                    // controller reads req.file
);
```

Multer puts the uploaded file info in `req.file`. The controller then saves the file path to the user document.

If validators run after multer, the file is already saved to disk even if validation fails. So validators must come first.

---

## Email Verification Flow

1. User registers → backend generates a random token, stores it on user with 15min expiry, sends email via Ethereal SMTP
2. Email contains link: `frontend/verify-email?token=abc123`
3. Frontend calls `GET /api/auth/email-verification?token=abc123`
4. Backend finds user by token, checks expiry, sets `emailVerified: true`, clears token
5. User can now join games

Ethereal is a fake SMTP service for development - emails don't actually arrive, but you can view them on the Ethereal website.

---

## Quick Answers to Likely Questions

**Q: Why use WebSockets for the game instead of HTTP polling?**
WebSockets keep a persistent connection so the server can push events instantly. HTTP polling would require the client to ask "anything new?" every second, which wastes bandwidth and adds latency.

**Q: Why is the access token stored in memory and not localStorage?**
localStorage is readable by any JavaScript on the page. If there's an XSS attack, the token gets stolen. Memory is wiped on page reload and can't be accessed by injected scripts.

**Q: What is `select: false` on a Mongoose field?**
The field won't be included in query results unless you explicitly request it with `.select("+pwd")`. Used for sensitive fields like passwords and tokens so they're never accidentally returned in API responses.

**Q: What does `.populate("variantId")` do?**
Replaces the stored ObjectId reference with the full document from the referenced collection. Without it you get the raw ID; with it you get the full game variant object.

**Q: Why does `match` sometimes force a fold instead of matching?**
If `highestBet - player.currentBet > player.points`, the player can't afford to match. Rather than erroring, the game forces a fold so the round can continue. Their already-bet points stay in the pot.

**Q: What is `io.to(...).emit` vs `socket.emit`?**
`socket.emit` sends to one client only (the one who triggered the event). `io.to("room").emit` sends to everyone in a room. Roll results go to just you; bet updates go to everyone in the game.

**Q: What's a Mongoose pre-validate hook?**
Code that runs automatically before Mongoose validates a document. Used here to auto-generate IDs and hash passwords so it's impossible to save a user without those steps happening.

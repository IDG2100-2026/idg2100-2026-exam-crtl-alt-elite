# Exam Study Guide - Sanna's Code

## Quick Summary of What You Built

| Area | Files |
|------|-------|
| Dice web components | `frontend/src/components/Dice/dice-poker-board.js`, `dice-poker-die.js`, `dice-poker-monitor.js` |
| Live game board | `frontend/src/components/Game/GameBoard.jsx` |
| User profile page | `frontend/src/pages/Profile/ProfilePage.jsx` |
| Leaderboard | `frontend/src/pages/Leaderboard/LeaderboardPage.jsx` |
| Settings panel | `frontend/src/components/Settings/SettingsPanel.jsx` |
| Admin pages | `frontend/src/pages/Admin/AdminUsers.jsx`, `AdminComments.jsx`, `AdminDashboard.jsx` |
| Static pages | `frontend/src/pages/StaticPages/` (About, HowToPlay, Terms, Privacy, 404) |
| Styling/theme | CSS modules, `SettingsContext.jsx`, dark/light mode via `data-theme` attribute |
| Hooks | `useCountdown.js`, contributed to settings/auth hooks usage |

---

## 1. Web Components (Oblig 1 reuse)

### What are Web Components?
Web Components are a browser-native standard for creating reusable custom HTML elements. No framework needed.

Three key APIs:
- **Custom Elements**: define a new HTML tag with a JS class
- **Shadow DOM**: encapsulated DOM and CSS inside the element
- **HTML Templates**: reusable markup (not used here, but exists)

### How `dice-poker-board` works

```js
class DicePokerBoard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" }); // creates isolated shadow DOM
    }

    connectedCallback() {   // called when element is added to the page
        this.render();       // writes HTML+CSS into shadowRoot
        this.createDice("player1");
    }

    attributeChangedCallback(name, oldValue, newValue) { // called when attribute changes
        if (name === "player1") { /* update label */ }
    }

    static observedAttributes = ["player1", "player2", "bestof", "include-straight"];
}

customElements.define("dice-poker-board", DicePokerBoard);
```

**Why `mode: "open"`?**  
Means external JS can access `element.shadowRoot`. `"closed"` would return null.

**Why `static observedAttributes`?**  
Only attributes listed here will trigger `attributeChangedCallback`. Without this, attribute changes are silently ignored.

### Custom Events
The board talks to the React app by dispatching custom events upward:
```js
this.dispatchEvent(new CustomEvent("dp:round-start", {
    bubbles: true,    // event travels up the DOM tree
    composed: true,   // event crosses shadow DOM boundaries
    detail: { round: this.currentRound }
}));
```
React listens with `document.addEventListener("dp:round-start", handler)`.

The events dispatched:
- `dp:round-start` - a new round began
- `dp:turn-changed` - whose turn it is and rolls remaining
- `dp:roll-executed` - a roll happened (faces + holds)
- `dp:round-decided` - round winner and hand types
- `dp:match-decided` - overall game winner

### Hand ranking logic
Faces in order: `A > K > Q > J > 8 > 7` (stored in `FACE_ORDER` array, lower index = better)

Ranks (lower = better):
1. Five of a kind (Repóker)
2. Four of a kind (Póker)
3. Full house (Full)
4. Straight (Escalera) - only when `include-straight="true"`
5. Three of a kind (Trío)
6. Two pair (Doble Pareja)
7. One pair (Pareja)
8. High card (Carta Alta)

Tie-breaking uses `tieBreakers` array: compare element by element until one wins.

---

## 2. Game Board - GameBoard.jsx

This is the main React component players use during a live game. It communicates entirely via **WebSockets**.

### Socket event flow

```
Frontend emits:       Backend responds with:
join_game          -> game_state (current state on reconnect)
roll_dice          -> roll_result (your dice faces)
hold_dice          -> holds_update (broadcast to others)
place_bet          -> bet_update (broadcast to all)
```

Backend also pushes unprompted:
- `turn_update` - whose turn it is now
- `round_start` - new round began (with fresh state)
- `phase_change` - switched from rolling to betting
- `round_end` - round finished, reveals all dice
- `game_end` - game over, final scores

### The stale closure problem (important!)

A stale closure happens when a `useEffect` captures a variable at mount time, and that variable later changes but the closure still holds the old value.

```jsx
// PROBLEM: if socket handler is set up once, it captures myUserId from mount
// If the user loads after mount, myUserId is undefined forever inside the handler

// SOLUTION: use a ref - refs are objects, always point to latest value
const myUserIdRef = useRef(myUserId);
useEffect(() => { myUserIdRef.current = myUserId; }, [myUserId]); // keep ref updated

// Now inside socket handlers:
const me = data.players?.find(p => p.userId === myUserIdRef.current); // always fresh
```

That is why `myUserId` is NOT in the socket effect's dependency array - intentionally.

### Rolling phase state
```
canRoll = isMyTurn && rollsUsed < 3
```
- `isMyTurn`: `currentTurnUserId === myUserId && phase === 'rolling'`
- `myRolls`: dice faces I currently have (from `roll_result`)
- `myHolds`: indexes of dice I'm holding
- `myLockedRolls`: my final dice after my turn ends (shown while waiting)

### Betting phase
Four actions: **bet**, **raise**, **match**, **fold**

- `bet`: opens betting, only valid when `highestBet === 0`
- `raise`: sets a higher amount than current highest
- `match`: pays `highestBet - myCurrentBet` (the difference)
- `fold`: exit the round, forfeit current bet

### Why dispatch events to `document` instead of the web component?
The React `GameBoard` and `dice-poker-monitor` web component are siblings in the DOM. They can't communicate directly. Using `document` as a shared event bus lets them talk without a direct reference.

---

## 3. Profile Page - ProfilePage.jsx

### Key patterns

**`/me` route shortcut:**
```jsx
const resolvedId = id === 'me' && currentUser ? currentUser.userId : id;
```
So `/profile/me` redirects to your own profile without needing to know your ID.

**Own profile detection:**
```jsx
const isOwnProfile = currentUser && String(currentUser.userId) === String(resolvedId);
```
String comparison because one might be a number and the other a string.

**Avatar upload with hidden file input:**
```jsx
<button onClick={() => fileInputRef.current?.click()}>Change avatar</button>
<input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleAvatarChange} />
```
The button triggers the hidden `<input type="file">`. Then:
```jsx
const formData = new FormData();
formData.append('avatar', file);
await userApi.uploadAvatar(resolvedId, formData);
```
`FormData` is needed because file uploads are `multipart/form-data`, not JSON.

**ELO change with color coding:**
```jsx
const eloChange = user.eloRating - user.eloRatingLastWeek;
// In JSX:
className={eloChange > 0 ? styles.positive : eloChange < 0 ? styles.negative : ''}
```

**Load more pagination (frontend-only):**
```jsx
const [gamesShown, setGamesShown] = useState(5);
const visibleGames = (user.recentGames || []).slice(0, gamesShown);
// Button:
onClick={() => setGamesShown(n => n + 5)}
```
All games are fetched at once, just sliced for display.

---

## 4. Leaderboard - LeaderboardPage.jsx

### useCallback pattern
```jsx
const fetchLeaderboard = useCallback(async () => {
    const data = await leaderboardApi.get({ sort, page, limit: PAGE_SIZE });
    setEntries(data.leaderboard?.leaderboard || []);
}, [sort, page]); // re-created only when sort or page changes

useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);
```
`useCallback` memoizes the function. Without it, a new function reference would be created every render, causing the `useEffect` to re-run every render.

### Sort tabs pattern
```jsx
const SORT_OPTIONS = [
    { value: 'elo', label: 'ELO' },
    { value: 'wins', label: 'Wins' },
    ...
];

{SORT_OPTIONS.map(opt => (
    <button
        className={`${styles.tab} ${sort === opt.value ? styles.tabActive : ''}`}
        onClick={() => handleSort(opt.value)}
    >
        {opt.label}
    </button>
))}
```
Active tab gets an extra CSS class. `handleSort` also resets `page` to 1 so you don't end up on page 5 of a different sort.

---

## 5. Settings Panel - SettingsPanel.jsx

### Close on outside click
```jsx
const panelRef = useRef(null);

useEffect(() => {
    function handleClick(e) {
        if (panelRef.current && !panelRef.current.contains(e.target)) {
            onClose(); // click was outside the panel
        }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick); // cleanup
}, [onClose]);
```
`contains()` checks if the clicked element is inside the panel. If not, close it. Cleanup removes the listener when the panel unmounts.

### SettingsContext
Settings are stored in context so any component can read them:
```jsx
const { theme, toggleTheme, boardColor, setBoardColor, soundEnabled, setSoundEnabled, lobbyGamesCount, setLobbyGamesCount } = useSettings();
```
Context values are persisted to `localStorage` so they survive page reload.

---

## 6. Admin Pages - AdminUsers.jsx

### Search + paginate pattern
```jsx
const [search, setSearch] = useState('');
const [searchInput, setSearchInput] = useState('');

function handleSearch(e) {
    e.preventDefault();
    setPage(1);            // go back to first page on new search
    setSearch(searchInput.trim()); // commit the search term
}
```
Two separate state values: `searchInput` is what's typed live, `search` is what's actually sent to the API. This prevents an API call on every keystroke.

### Optimistic UI update
```jsx
async function handleBan(userId) {
    await userApi.ban(userId);
    // Update local state immediately without refetching all users
    setUsers(prev => prev.map(u =>
        u.userId === userId ? { ...u, isBanned: true } : u
    ));
}
```
Instead of re-fetching the entire user list after a ban, just update the affected user in state.

---

## 7. useCountdown Hook

```jsx
export function useCountdown(targetDate) {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        if (!targetDate) return;

        function tick() {
            const diff = new Date(targetDate) - new Date();
            if (diff <= 0) { setTimeLeft(null); return; }
            const days = Math.floor(diff / 1000 / 60 / 60 / 24);
            const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setTimeLeft({ days, hours, minutes, seconds });
        }

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval); // cleanup on unmount or targetDate change
    }, [targetDate]);

    return timeLeft; // null when expired or no date given
}
```

Used in `TournamentPage.jsx`:
```jsx
const countdown = useCountdown(
    tournament?.status === "upcoming" ? tournament?.scheduledAt :
    tournament?.status === "ongoing" ? tournament?.nextRoundAt : null
);
```

---

## Hooks Reference - What They Are and Where They Appear

A **hook** is a function that lets you use React features (state, lifecycle, context) inside a function component. All hooks start with `use`. You cannot call them inside loops, conditions, or regular functions.

### useState

**What it does:** Stores a value that, when changed, causes the component to re-render.

```jsx
const [value, setValue] = useState(initial);
```

**In the code:**

| File | What it stores |
|------|---------------|
| `ProfilePage.jsx` | `user`, `loading`, `error`, `editing`, `editEmail`, `editAbout`, `editPwd`, `saving`, `avatarUploading`, `gamesShown` |
| `LeaderboardPage.jsx` | `entries`, `total`, `page`, `sort`, `loading`, `error` |
| `AdminUsers.jsx` | `users`, `total`, `page`, `search`, `searchInput`, `loading`, `error`, `actionError` |
| `GameBoard.jsx` | `myRolls`, `myHolds`, `myLockedRolls`, `phase`, `pot`, `betActions`, `gameOver`, `betAmount`, `myFolded`, and more |
| `useCountdown.js` | `timeLeft` (the `{ days, hours, minutes, seconds }` object) |

---

### useEffect

**What it does:** Runs code after render - for fetching data, setting up listeners, timers. The return value is a cleanup function that runs before the next effect or on unmount.

```jsx
useEffect(() => {
    // runs after render
    return () => { /* cleanup */ };
}, [dep]); // runs again when dep changes. [] = only on mount.
```

**In the code:**

| File | What it does |
|------|-------------|
| `ProfilePage.jsx` | Fetches user data when `resolvedId` changes |
| `LeaderboardPage.jsx` | Calls `fetchLeaderboard` whenever sort or page changes |
| `AdminUsers.jsx` | Fetches user list when page or search changes |
| `GameBoard.jsx` | (1) Joins the socket room on mount. (2) Registers all socket event listeners. (3) Runs the countdown timer when `turnExpiresAt` changes. (4) Keeps refs in sync with latest userId/players. |
| `SettingsPanel.jsx` | Adds `mousedown` listener to `document` for outside-click detection, removes it on unmount |
| `useCountdown.js` | Starts a `setInterval` that ticks every second, clears it when `targetDate` changes or component unmounts |

---

### useRef

**What it does:** Holds a mutable value that does NOT cause a re-render when changed. Also used to get a direct reference to a DOM element.

```jsx
const ref = useRef(initialValue);
ref.current = newValue; // no re-render

// DOM usage:
<input ref={inputRef} />
inputRef.current.focus();
```

**In the code:**

| File | Ref name | What it holds |
|------|----------|--------------|
| `ProfilePage.jsx` | `fileInputRef` | The hidden `<input type="file">` - button click triggers it via `.click()` |
| `GameBoard.jsx` | `myUserIdRef` | Latest `myUserId` - used inside socket handlers to avoid stale closures |
| `GameBoard.jsx` | `gamePlayersRef` | Latest `game.players` array - same reason |
| `GameBoard.jsx` | `roundWinsRef` | Round win counts per player - updated without needing a re-render |
| `SettingsPanel.jsx` | `panelRef` | The panel DOM element - checked with `.contains()` to detect outside clicks |

---

### useCallback

**What it does:** Returns a memoized version of a function. The same function reference is returned on every render unless the dependencies change.

Why it matters: if you pass a function to `useEffect`'s dependency array, a new function reference every render would cause the effect to re-run on every render.

```jsx
const fn = useCallback(() => {
    doThing(a, b);
}, [a, b]); // same reference until a or b changes
```

**In the code:**

| File | Function | Why |
|------|----------|-----|
| `LeaderboardPage.jsx` | `fetchLeaderboard` | Passed to `useEffect([fetchLeaderboard])` - without this, effect runs on every render |
| `AdminUsers.jsx` | `fetchUsers` | Same reason |
| `GameBoard.jsx` | `getUsername` | Passed to child components, memoized so they don't re-render unnecessarily |

---

### useContext

**What it does:** Reads the value from the nearest matching Context Provider above in the tree.

```jsx
const value = useContext(MyContext);
```

**In the code** (always via custom hooks, not called directly):

| Custom hook | Context it reads | Used in |
|-------------|-----------------|---------|
| `useAuth()` | `AuthContext` (from `AuthProvider.jsx`) | `GameBoard.jsx`, `ProfilePage.jsx`, `Navbar.jsx`, `AdminUsers.jsx`, `TournamentPage.jsx`, and more |
| `useSettings()` | `SettingsContext` (from `SettingsContext.jsx`) | `SettingsPanel.jsx`, and any component reading theme/boardColor |

---

### Custom Hooks

A custom hook is a plain function starting with `use` that calls other hooks inside. You extract them to reuse logic across components.

**`useCountdown(targetDate)`** - defined in `hooks/useCountdown.js`
- What: counts down to a date, returns `{ days, hours, minutes, seconds }` or `null` when expired
- Uses: `useState` + `useEffect` with `setInterval`
- Used in: `TournamentPage.jsx` to show the start countdown

**`useAuth()`** - defined in `hooks/useAuth.js`, reads `AuthContext`
- What: returns `{ user, login, logout }` - the currently logged in user and auth actions
- Used in: almost every page that needs to know who is logged in or if the user is an admin

**`useSettings()`** - defined in `SettingsContext.jsx`
- What: returns `{ theme, toggleTheme, boardColor, setBoardColor, soundEnabled, setSoundEnabled, lobbyGamesCount, setLobbyGamesCount }`
- All settings are stored in `localStorage` so they survive page reload
- Used in: `SettingsPanel.jsx` to read and update settings

---

## Basic Concepts You Need to Know

### React Hooks

**useState**
```jsx
const [value, setValue] = useState(initialValue);
setValue(newValue);               // set directly
setValue(prev => prev + 1);       // functional update (safe for async)
```

**useEffect**
```jsx
useEffect(() => {
    // runs after render
    return () => { /* cleanup */ }; // runs on unmount / before next effect
}, [dependency]); // re-runs when dependency changes
// [] = run once on mount only
// no array = run after every render (almost never what you want)
```

**useRef**
```jsx
const ref = useRef(initialValue);
ref.current = newValue; // mutate without causing re-render
// Also used to reference DOM elements:
<input ref={inputRef} />
inputRef.current.focus();
```

**useCallback**
```jsx
const fn = useCallback(() => { doThing(a, b); }, [a, b]);
// Returns the same function reference unless a or b changes
// Prevents child re-renders when passing a function as prop
```

**useContext**
```jsx
// In a provider:
const ThemeContext = createContext(null);
<ThemeContext.Provider value={{ theme, setTheme }}>...</ThemeContext.Provider>

// In any child:
const { theme } = useContext(ThemeContext);
```

---

### Custom Hooks

A custom hook is just a function starting with `use` that calls other hooks:
```jsx
function useCountdown(targetDate) {
    const [timeLeft, setTimeLeft] = useState(null);
    useEffect(() => { /* ... */ }, [targetDate]);
    return timeLeft;
}
```
Why: reuse stateful logic across multiple components without copy-pasting.

---

### WebSockets vs HTTP

| HTTP | WebSocket |
|------|-----------|
| Request/response, client initiates | Persistent connection, both sides can send anytime |
| New connection per request | One connection stays open |
| Good for: fetching data, submitting forms | Good for: live game state, chat, notifications |

In this project: HTTP for all CRUD (login, profile, leaderboard), WebSocket for everything that happens live during a game.

Socket.io usage:
```js
// Connect
const socket = io("http://localhost:9000");

// Send
socket.emit("event_name", { data: "here" });

// Listen
socket.on("event_name", (data) => { /* handle */ });

// Cleanup
socket.off("event_name", handler); // must pass same function reference
```

---

### JWT Auth Flow

1. User logs in → backend returns `accessToken` (short-lived, ~15min) + sets `refreshToken` in httpOnly cookie
2. Frontend stores `accessToken` in memory (not localStorage - XSS risk)
3. Every API request: `Authorization: Bearer <accessToken>`
4. On 401 response: frontend calls `POST /auth/refresh` with the cookie → gets new accessToken
5. Original request retried with new token (transparent to user)
6. httpOnly cookie: JS cannot read it, only browser sends it automatically

---

### Context API Pattern (SettingsContext)

```jsx
// 1. Create context
const SettingsContext = createContext(null);

// 2. Provider holds state and exposes it
export function SettingsProvider({ children }) {
    const [theme, setTheme] = useState('dark');
    return (
        <SettingsContext.Provider value={{ theme, setTheme }}>
            {children}
        </SettingsContext.Provider>
    );
}

// 3. Custom hook for easy access
export function useSettings() {
    return useContext(SettingsContext);
}

// 4. Wrap app in provider (in main.jsx or App.jsx)
<SettingsProvider>
    <App />
</SettingsProvider>

// 5. Use anywhere
const { theme, setTheme } = useSettings();
```

---

### CSS Modules

```jsx
import styles from './MyComponent.module.css';

// In JSX:
<div className={styles.container}>
<div className={`${styles.btn} ${isActive ? styles.active : ''}`}>
```
CSS class names are scoped to the file - no global name collisions.

---

### FormData (file uploads)

```jsx
const formData = new FormData();
formData.append('avatar', file);         // file from input[type=file]
formData.append('username', 'sanna');    // can mix text fields

fetch('/api/upload', {
    method: 'POST',
    body: formData,
    // Do NOT set Content-Type header - browser sets multipart/form-data boundary automatically
});
```

---

### Optional chaining and nullish coalescing

```js
user?.profile?.avatar        // returns undefined instead of throwing if user is null
user?.name ?? 'Anonymous'    // use 'Anonymous' if left side is null or undefined
user?.scores?.[0]            // also works with array index
```

---

### Common React Patterns Used in This Project

**Conditional rendering:**
```jsx
{isMyTurn && <button>Roll</button>}
{error ? <p>{error}</p> : <div>Content</div>}
```

**List rendering (always needs key):**
```jsx
{items.map(item => <div key={item.id}>{item.name}</div>)}
```

**Controlled inputs:**
```jsx
<input value={search} onChange={e => setSearch(e.target.value)} />
```

**Spreading props:**
```jsx
<dice-poker-die
    face={face}
    {...(held ? { held: '' } : {})}  // conditionally add attribute
/>
```

**Functional state update (safe when update depends on previous state):**
```jsx
setMessages(prev => [...prev, newMessage]);
setCount(prev => prev + 1);
```

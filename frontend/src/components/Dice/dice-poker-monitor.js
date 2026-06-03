// Monitor component, displays live game state by listening to board events
class DicePokerMonitor extends HTMLElement {
  static observedAttributes = ["player1", "player2"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.currentRound = 0;
    this.activePlayer = "";
    this.remainingRolls = 0;
    this.lastFaces = [];
    this.lastHeld = [];
    this.roundWinner = "";
    this.roundHands = {};
    this.matchScore = { player1: 0, player2: 0 };
    this.matchChampion = "";
    this.player1Name = "Player 1";
    this.player2Name = "Player 2";

    // Keep references so listeners can be removed in disconnectedCallback
    this._handlers = {
      roundStart:    (e) => { this.currentRound = e.detail.round; this.roundWinner = ""; this.matchChampion = ""; this.render(); },
      turnChanged:   (e) => { this.activePlayer = e.detail.player; this.remainingRolls = e.detail.remainingRolls; this.render(); },
      rollExecuted:  (e) => { this.lastFaces = e.detail.faces; this.lastHeld = e.detail.held; this.activePlayer = e.detail.player; this.render(); },
      roundDecided:  (e) => { this.roundWinner = e.detail.winner; this.roundHands = e.detail.hands; this.render(); },
      matchDecided:  (e) => { this.matchChampion = e.detail.champion; this.matchScore = e.detail.scoreline; this.render(); },
    };
  }

  connectedCallback() {
    this.player1Name = this.getAttribute("player1") || "Player 1";
    this.player2Name = this.getAttribute("player2") || "Player 2";
    this.render();

    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
    document.addEventListener("dp:round-start",   this._handlers.roundStart);
    document.addEventListener("dp:turn-changed",  this._handlers.turnChanged);
    document.addEventListener("dp:roll-executed", this._handlers.rollExecuted);
    document.addEventListener("dp:round-decided", this._handlers.roundDecided);
    document.addEventListener("dp:match-decided", this._handlers.matchDecided);
  }

  // Remove listeners when unmounted to prevent accumulation on React re-renders
  disconnectedCallback() {
    document.removeEventListener("dp:round-start",   this._handlers.roundStart);
    document.removeEventListener("dp:turn-changed",  this._handlers.turnChanged);
    document.removeEventListener("dp:roll-executed", this._handlers.rollExecuted);
    document.removeEventListener("dp:round-decided", this._handlers.roundDecided);
    document.removeEventListener("dp:match-decided", this._handlers.matchDecided);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "player1") this.player1Name = newValue || "Player 1";
    if (name === "player2") this.player2Name = newValue || "Player 2";
    this.render();
  }

  getPlayerName(player) {
    if (player === "player1") return this.player1Name;
    if (player === "player2") return this.player2Name;
    return "";
  }

  render() {
    const playerDisplay = this.getPlayerName(this.activePlayer);

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        .monitor {
          padding: 1rem 1.25rem;
          background: #1a3a2a;
          border-radius: 12px;
          color: #e8f0eb;
          font-size: 0.9rem;
        }

        h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #7fbb98;
        }

        .row {
          display: flex;
          justify-content: space-between;
          padding: 0.35rem 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .row:last-child { border-bottom: none; }

        .label { color: rgba(255,255,255,0.55); }
        .value { font-weight: 600; }
        .highlight { color: #7fbb98; }

        .score-box {
          display: flex;
          justify-content: space-around;
          margin: 0.75rem 0 0.25rem;
          gap: 0.5rem;
        }

        .score-card {
          flex: 1;
          text-align: center;
          background: rgba(255,255,255,0.07);
          border-radius: 8px;
          padding: 0.4rem 0.5rem;
        }

        .score-card .name {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .score-card .pts {
          font-size: 1.4rem;
          font-weight: 800;
        }

        .champion-box {
          background: #2e7d4f;
          color: white;
          padding: 0.75rem;
          border-radius: 8px;
          text-align: center;
          font-weight: 700;
          margin-top: 0.75rem;
        }

        .no-data {
          color: rgba(255,255,255,0.4);
          text-align: center;
          padding: 1rem 0;
        }
      </style>

      <div class="monitor">
        <h3>Game Monitor</h3>

        <div class="score-box">
          <div class="score-card">
            <div class="name">${this.player1Name}</div>
            <div class="pts">${this.matchScore.player1}</div>
          </div>
          <div style="align-self:center;color:rgba(255,255,255,0.3);font-weight:700;">VS</div>
          <div class="score-card">
            <div class="name">${this.player2Name}</div>
            <div class="pts">${this.matchScore.player2}</div>
          </div>
        </div>

        ${this.currentRound > 0 ? `
          <div class="row">
            <span class="label">Round</span>
            <span class="value">${this.currentRound}</span>
          </div>

          ${this.activePlayer ? `
            <div class="row">
              <span class="label">Active Player</span>
              <span class="value highlight">${playerDisplay}</span>
            </div>
            <div class="row">
              <span class="label">Rerolls Left</span>
              <span class="value">${this.remainingRolls}</span>
            </div>
          ` : ""}

          ${this.lastFaces.length > 0 ? `
            <div class="row">
              <span class="label">Last Roll</span>
              <span class="value">${this.lastFaces.join(" ")}</span>
            </div>
            <div class="row">
              <span class="label">Held</span>
              <span class="value">${this.lastHeld.filter(Boolean).length} / 5</span>
            </div>
          ` : ""}

          ${this.roundWinner && !this.matchChampion ? `
            <div class="row">
              <span class="label">Round Winner</span>
              <span class="value highlight">${this.getPlayerName(this.roundWinner)}</span>
            </div>
            ${this.roundHands.player1 ? `
              <div class="row">
                <span class="label">${this.player1Name}</span>
                <span class="value">${this.roundHands.player1.handType}</span>
              </div>
            ` : ""}
            ${this.roundHands.player2 ? `
              <div class="row">
                <span class="label">${this.player2Name}</span>
                <span class="value">${this.roundHands.player2.handType}</span>
              </div>
            ` : ""}
          ` : ""}

          ${this.matchChampion ? `
            <div class="champion-box">
              ${this.getPlayerName(this.matchChampion)} wins the match!
            </div>
          ` : ""}
        ` : `
          <div class="no-data">Waiting for game to start...</div>
        `}
      </div>
    `;
  }
}

customElements.define("dice-poker-monitor", DicePokerMonitor);

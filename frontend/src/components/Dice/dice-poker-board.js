// Main game board component
class DicePokerBoard extends HTMLElement {
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements#responding_to_attribute_changes
  static observedAttributes = ["player1", "player2", "bestof", "include-straight"];

  // Face ranking
  static FACE_ORDER = ["A", "K", "Q", "J", "8", "7"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.diceByPlayer = { player1: [], player2: [] };

    this.currentRound = 0;
    this.activePlayer = null;
    // Each turn: 1 automatic roll + 2 optional rerolls = 3 total
    this.rollsRemaining = 0;
    this.scores = { player1: 0, player2: 0 };
    this.gameOver = false;
    this.player1Name = this.getAttribute("player1") || "Player 1";
    this.player2Name = this.getAttribute("player2") || "Player 2";
  }

  connectedCallback() {
    this.render();
    this.createDice("player1");
    this.createDice("player2");
    this.setupClickListeners();
    // All dice start disabled until a turn begins
    this.setDiceDisabled("player1", true);
    this.setDiceDisabled("player2", true);
  }

  // Update player name labels and re-read variant settings when attributes change
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "player1") {
      this.player1Name = newValue || "Player 1";
      const el = this.shadowRoot?.querySelector(".player1-heading");
      if (el) el.textContent = this.player1Name;
    } else if (name === "player2") {
      this.player2Name = newValue || "Player 2";
      const el = this.shadowRoot?.querySelector(".player2-heading");
      if (el) el.textContent = this.player2Name;
    }
    // bestof and include-straight are read via getAttribute() when needed
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .inner {
          padding: 1.25rem;
          color: white;
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
        }

        .player-section {
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 0.75rem;
          background: rgba(255,255,255,0.06);
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        h2 { margin: 0; font-size: 1rem; }

        .dice-container {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 0.75rem;
        }

        .controls {
          display: flex;
          gap: 6px;
          justify-content: center;
          flex-wrap: wrap;
        }

        button {
          padding: 0.4rem 0.9rem;
          font-size: 0.85rem;
          font-weight: 600;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          background: #5c1a1a;
          color: white;
        }

        button:hover:not([disabled]) { background: #7a2020; }

        button[disabled] {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.3);
          cursor: not-allowed;
        }

        .btn-clear  { background: rgba(255,255,255,0.12); }
        .btn-clear:hover:not([disabled]) { background: rgba(255,255,255,0.2); }

        .btn-endturn { background: #7a5500; }
        .btn-endturn:hover:not([disabled]) { background: #9a6d00; }

        #start-game-btn, #next-round-btn {
          display: block;
          margin: 0 auto 0.75rem;
          padding: 0.5rem 2rem;
          font-size: 0.9rem;
          background: #2e7d4f;
          border-radius: 8px;
        }
        #start-game-btn:hover, #next-round-btn:hover { background: #3a9e63; }

        .player1-heading { color: #90c4f5; }
        .player2-heading { color: #f59090; }
      </style>

      <div class="inner">
        <button id="start-game-btn" type="button">Start Game</button>

        <div id="section-player1" class="player-section" style="display:none">
          <div class="section-header">
            <h2 class="player1-heading">${this.player1Name}</h2>
          </div>
          <div id="player1-dice" class="dice-container"></div>
          <div class="controls">
            <button id="player1-roll" type="button" disabled>Roll</button>
            <button id="player1-clear" class="btn-clear" type="button" disabled>Clear Holds</button>
            <button id="player1-endturn" class="btn-endturn" type="button" disabled>End Turn</button>
          </div>
        </div>

        <div id="section-player2" class="player-section" style="display:none">
          <div class="section-header">
            <h2 class="player2-heading">${this.player2Name}</h2>
          </div>
          <div id="player2-dice" class="dice-container"></div>
          <div class="controls">
            <button id="player2-roll" type="button" disabled>Roll</button>
            <button id="player2-clear" class="btn-clear" type="button" disabled>Clear Holds</button>
            <button id="player2-endturn" class="btn-endturn" type="button" disabled>End Turn</button>
          </div>
        </div>

        <button id="next-round-btn" type="button" style="display: none;">Next Round</button>
      </div>
    `;
  }

  // Create 5 dice for a player, all start disabled
  createDice(playerKey) {
    const container = this.shadowRoot.getElementById(`${playerKey}-dice`);
    for (let i = 0; i < 5; i++) {
      const die = document.createElement("dice-poker-die");
      die.setAttribute("face", "7");
      die.setAttribute("die-id", `${playerKey}-die-${i}`);
      die.setAttribute("owner", playerKey);
      die.setAttribute("disabled", "");
      container.appendChild(die);
      this.diceByPlayer[playerKey].push(die);
    }
  }

  // Enable or disable all dice for a player
  setDiceDisabled(playerKey, disabled) {
    this.diceByPlayer[playerKey].forEach(die => {
      if (disabled) {
        die.setAttribute("disabled", "");
      } else {
        die.removeAttribute("disabled");
      }
    });
  }

  // Reset all dice faces to default and remove holds
  resetDiceFaces(playerKey) {
    this.diceByPlayer[playerKey].forEach(die => {
      die.removeAttribute("held");
      die.setAttribute("face", "7");
    });
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
  setupClickListeners() {
    this.shadowRoot.getElementById("start-game-btn").addEventListener("click", () => {
      this.startRound();
    });

    this.shadowRoot.getElementById("next-round-btn").addEventListener("click", () => {
      this.startRound();
    });

    this.shadowRoot.getElementById("player1-roll").addEventListener("click", () => {
      if (this.activePlayer === "player1" && this.rollsRemaining > 0) {
        this.executeReroll("player1");
      }
    });

    this.shadowRoot.getElementById("player1-clear").addEventListener("click", () => {
      if (this.activePlayer === "player1") {
        this.clearHolds(this.diceByPlayer.player1);
      }
    });

    this.shadowRoot.getElementById("player1-endturn").addEventListener("click", () => {
      if (this.activePlayer === "player1") {
        this.endTurn("player1");
      }
    });

    this.shadowRoot.getElementById("player2-roll").addEventListener("click", () => {
      if (this.activePlayer === "player2" && this.rollsRemaining > 0) {
        this.executeReroll("player2");
      }
    });

    this.shadowRoot.getElementById("player2-clear").addEventListener("click", () => {
      if (this.activePlayer === "player2") {
        this.clearHolds(this.diceByPlayer.player2);
      }
    });

    this.shadowRoot.getElementById("player2-endturn").addEventListener("click", () => {
      if (this.activePlayer === "player2") {
        this.endTurn("player2");
      }
    });
  }

  // Start a new round, reset both players' dice faces
  startRound() {
    if (this.gameOver) return;

    this.currentRound++;

    // Reset faces AND holds for both players so old results aren't shown
    this.resetDiceFaces("player1");
    this.resetDiceFaces("player2");

    this.shadowRoot.getElementById("next-round-btn").style.display = "none";
    this.shadowRoot.getElementById("start-game-btn").style.display = "none";

    // Show only player 1 at the start of each round
    this.showSection("player1");
    this.hideSection("player2");

    this.dispatchEvent(new CustomEvent("dp:round-start", {
      bubbles: true, composed: true,
      detail: { round: this.currentRound }
    }));

    this.startTurn("player1");
  }

  showSection(playerKey) {
    const el = this.shadowRoot.getElementById(`section-${playerKey}`);
    if (el) el.style.display = "block";
  }

  hideSection(playerKey) {
    const el = this.shadowRoot.getElementById(`section-${playerKey}`);
    if (el) el.style.display = "none";
  }

  // Start a player's turn, player must click Roll up to 3 times manually
  startTurn(playerKey) {
    this.activePlayer = playerKey;
    this.rollsRemaining = 3;
    this.hasRolled = false;

    const other = playerKey === "player1" ? "player2" : "player1";
    this.setDiceDisabled(other, true);
    // Dice start disabled until first roll so player can't hold unheld dice
    this.setDiceDisabled(playerKey, true);

    this.updateButtonStates();

    this.dispatchEvent(new CustomEvent("dp:turn-changed", {
      bubbles: true, composed: true,
      detail: { player: playerKey, remainingRolls: this.rollsRemaining }
    }));
  }

  // Handle each roll click
  executeReroll(playerKey) {
    this.rollDice(this.diceByPlayer[playerKey]);
    this.rollsRemaining--;
    this.hasRolled = true;
    // Enable dice holding after first roll
    this.setDiceDisabled(playerKey, false);
    this.emitRollExecuted(playerKey);
    this.updateButtonStates();

    if (this.rollsRemaining === 0) {
      this.endTurn(playerKey);
    }
  }

  endTurn(playerKey) {
    this.setDiceDisabled("player1", true);
    this.setDiceDisabled("player2", true);
    this.updateButtonStates();

    if (playerKey === "player1") {
      // Switch view to player 2
      this.hideSection("player1");
      this.showSection("player2");
      this.startTurn("player2");
    } else {
      // Both turns done, reveal both sections for round result
      this.showSection("player1");
      this.showSection("player2");
      this.evaluateRound();
    }
  }

  // Evaluate a poker hand and return rank info
  evaluateHand(faces) {
    const faceOrder = DicePokerBoard.FACE_ORDER;
    const freq = {};
    faces.forEach(f => { freq[f] = (freq[f] || 0) + 1; });
    const counts = Object.values(freq).sort((a, b) => b - a);
    const faceValues = faces.map(f => faceOrder.indexOf(f));

    function facesWithCount(n) {
      const result = [];
      for (const face in freq) {
        if (freq[face] === n) result.push(face);
      }
      result.sort((a, b) => faceOrder.indexOf(a) - faceOrder.indexOf(b));
      return result;
    }

    if (counts[0] === 5) {
      return { handType: "Repóker (Five of a Kind)", rank: 1, faces, tieBreakers: [faceOrder.indexOf(faces[0])] };
    }
    if (counts[0] === 4) {
      const quad = facesWithCount(4)[0];
      const kicker = facesWithCount(1)[0];
      return { handType: "Póker (Four of a Kind)", rank: 2, faces, tieBreakers: [faceOrder.indexOf(quad), faceOrder.indexOf(kicker)] };
    }
    if (counts[0] === 3 && counts[1] === 2) {
      const trip = facesWithCount(3)[0];
      const pair = facesWithCount(2)[0];
      return { handType: "Full (Full House)", rank: 3, faces, tieBreakers: [faceOrder.indexOf(trip), faceOrder.indexOf(pair)] };
    }

    // Check straights only when the attribute allows it
    if (counts[0] === 1) {
      const sortedFaces = [...faces].sort((a, b) => faceOrder.indexOf(a) - faceOrder.indexOf(b));
      const straight1 = ["7", "8", "J", "Q", "K"];
      const straight2 = ["8", "J", "Q", "K", "A"];
      const isStraight = sortedFaces.join(",") === straight1.join(",") || sortedFaces.join(",") === straight2.join(",");
      const includeStraight = this.getAttribute("include-straight") === "true";

      if (includeStraight && isStraight) {
        return { handType: "Escalera (Straight)", rank: 4, faces, tieBreakers: faceValues.sort((a, b) => a - b) };
      }
      return { handType: "Carta Alta (High Card)", rank: 8, faces, tieBreakers: faceValues.sort((a, b) => a - b) };
    }

    if (counts[0] === 3) {
      const trip = facesWithCount(3)[0];
      const kickers = facesWithCount(1).map(f => faceOrder.indexOf(f));
      return { handType: "Trío (Three of a Kind)", rank: 5, faces, tieBreakers: [faceOrder.indexOf(trip), ...kickers] };
    }
    if (counts[0] === 2 && counts[1] === 2) {
      const pairs = facesWithCount(2).map(f => faceOrder.indexOf(f));
      const kicker = facesWithCount(1).map(f => faceOrder.indexOf(f));
      return { handType: "Doble Pareja (Two Pair)", rank: 6, faces, tieBreakers: [...pairs, ...kicker] };
    }
    if (counts[0] === 2) {
      const pair = facesWithCount(2)[0];
      const kickers = facesWithCount(1).map(f => faceOrder.indexOf(f));
      return { handType: "Pareja (One Pair)", rank: 7, faces, tieBreakers: [faceOrder.indexOf(pair), ...kickers] };
    }

    return { handType: "Carta Alta (High Card)", rank: 8, faces, tieBreakers: faceValues.sort((a, b) => a - b) };
  }

  // Compare two hands, return "player1", "player2", or "tie"
  compareHands(hand1, hand2) {
    if (hand1.rank !== hand2.rank) {
      return hand1.rank < hand2.rank ? "player1" : "player2";
    }
    const len = Math.max(hand1.tieBreakers.length, hand2.tieBreakers.length);
    for (let i = 0; i < len; i++) {
      const v1 = hand1.tieBreakers[i] ?? 999;
      const v2 = hand2.tieBreakers[i] ?? 999;
      if (v1 !== v2) return v1 < v2 ? "player1" : "player2";
    }
    return "tie";
  }

  // Evaluate both players' hands and determine round winner
  evaluateRound() {
    this.activePlayer = null;
    this.updateButtonStates();

    const faces1 = this.diceByPlayer.player1.map(d => d.getAttribute("face"));
    const faces2 = this.diceByPlayer.player2.map(d => d.getAttribute("face"));

    const hand1 = this.evaluateHand(faces1);
    const hand2 = this.evaluateHand(faces2);
    const result = this.compareHands(hand1, hand2);
    const roundWinner = result === "tie" ? "player1" : result;

    this.scores[roundWinner]++;

    const breakdown = result === "tie"
      ? `Tie, both had ${hand1.handType}. ${this.player1Name} wins the round.`
      : `${roundWinner === "player1" ? this.player1Name : this.player2Name} wins with ${roundWinner === "player1" ? hand1.handType : hand2.handType}`;

    this.dispatchEvent(new CustomEvent("dp:round-decided", {
      bubbles: true, composed: true,
      detail: {
        winner: roundWinner,
        hands: {
          player1: { faces: faces1, handType: hand1.handType },
          player2: { faces: faces2, handType: hand2.handType }
        },
        breakdown
      }
    }));

    // Read bestof from attribute, supports 3, 5, or 7
    const bestOf = parseInt(this.getAttribute("bestof")) || 3;
    const winsNeeded = Math.ceil(bestOf / 2);

    if (this.scores[roundWinner] >= winsNeeded) {
      this.gameOver = true;

      this.dispatchEvent(new CustomEvent("dp:match-decided", {
        bubbles: true, composed: true,
        detail: { champion: roundWinner, scoreline: { ...this.scores } }
      }));

      const btn = this.shadowRoot.getElementById("next-round-btn");
      btn.textContent = "Play Again";
      btn.style.display = "inline-block";

      btn.onclick = () => {
        this.scores = { player1: 0, player2: 0 };
        this.currentRound = 0;
        this.gameOver = false;
        btn.textContent = "Next Round";
        // Reset both players' dice faces before starting fresh
        this.resetDiceFaces("player1");
        this.resetDiceFaces("player2");
        this.startRound();
      };
    } else {
      this.shadowRoot.getElementById("next-round-btn").style.display = "inline-block";
    }
  }

  emitRollExecuted(playerKey) {
    const faces = this.diceByPlayer[playerKey].map(d => d.getAttribute("face"));
    const held = this.diceByPlayer[playerKey].map(d => d.hasAttribute("held"));
    this.dispatchEvent(new CustomEvent("dp:roll-executed", {
      bubbles: true, composed: true,
      detail: { player: playerKey, faces, held }
    }));
  }

  updateButtonStates() {
    const p1Roll = this.shadowRoot.getElementById("player1-roll");
    const p1Clear = this.shadowRoot.getElementById("player1-clear");
    const p1End = this.shadowRoot.getElementById("player1-endturn");
    const p2Roll = this.shadowRoot.getElementById("player2-roll");
    const p2Clear = this.shadowRoot.getElementById("player2-clear");
    const p2End = this.shadowRoot.getElementById("player2-endturn");

    const p1Active = this.activePlayer === "player1";
    const p2Active = this.activePlayer === "player2";

    p1Roll.disabled  = !(p1Active && this.rollsRemaining > 0);
    p1Clear.disabled = !(p1Active && this.hasRolled);
    p1End.disabled   = !(p1Active && this.hasRolled);

    p2Roll.disabled  = !(p2Active && this.rollsRemaining > 0);
    p2Clear.disabled = !(p2Active && this.hasRolled);
    p2End.disabled   = !(p2Active && this.hasRolled);

    if (p1Active) {
      p1Roll.textContent = this.hasRolled
        ? `Re-roll (${this.rollsRemaining} left)`
        : "Roll";
    } else {
      p1Roll.textContent = "Roll";
    }
    if (p2Active) {
      p2Roll.textContent = this.hasRolled
        ? `Re-roll (${this.rollsRemaining} left)`
        : "Roll";
    } else {
      p2Roll.textContent = "Roll";
    }
  }

  rollDice(diceList) {
    diceList.forEach(die => { die.roll(); });
  }

  clearHolds(diceList) {
    diceList.forEach(die => { die.removeAttribute("held"); });
  }
}

if (!customElements.get("dice-poker-board")) {
  customElements.define("dice-poker-board", DicePokerBoard);
}

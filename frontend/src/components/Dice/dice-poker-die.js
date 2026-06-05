class DicePokerDie extends HTMLElement {
  static faces = ["A", "K", "Q", "J", "8", "7"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static get observedAttributes() {
    return ["face", "held", "owner", "die-id", "disabled"];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) this.render();
  }

  roll() {
    if (this.hasAttribute("held")) return;
    const randomIndex = Math.floor(Math.random() * DicePokerDie.faces.length);
    this.setAttribute("face", DicePokerDie.faces[randomIndex]);

    this.dispatchEvent(new CustomEvent("dp:die-rolled", {
      bubbles: true, composed: true,
      detail: {
        dieId: this.getAttribute("die-id"),
        face: this.getAttribute("face"),
        owner: this.getAttribute("owner"),
      }
    }));
  }

  toggleHeld() {
    if (this.hasAttribute("disabled")) return;

    if (this.hasAttribute("held")) {
      this.removeAttribute("held");
    } else {
      this.setAttribute("held", "");
    }

    this.dispatchEvent(new CustomEvent("dp:die-held-changed", {
      bubbles: true, composed: true,
      detail: {
        dieId: this.getAttribute("die-id"),
        held: this.hasAttribute("held"),
        owner: this.getAttribute("owner"),
      }
    }));
  }

  render() {
    const face = this.getAttribute("face") || "7";
    const isHeld = this.hasAttribute("held");
    const isDisabled = this.hasAttribute("disabled");

    this.shadowRoot.innerHTML = `
      <style>
        .die {
          width: 60px;
          height: 60px;
          border-radius: 8px;
          border: 2px solid ${isHeld ? "#c8a000" : "rgba(0,0,0,0.12)"};
          background: ${isHeld ? "#ffd700" : "#f5f0e4"};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          font-weight: 800;
          color: #2a1a1a;
          font-family: Georgia, serif;
          cursor: ${isDisabled ? "default" : "pointer"};
          opacity: ${isDisabled ? "0.35" : "1"};
          user-select: none;
          transition: transform 0.1s, background 0.15s;
        }

        .die:hover:not(.disabled) {
          transform: ${isDisabled ? "none" : "scale(1.07)"};
        }
      </style>
      <div class="die ${isDisabled ? "disabled" : ""}">${face}</div>
    `;

    this.shadowRoot.querySelector(".die").addEventListener("click", () => {
      this.toggleHeld();
    });
  }
}

if (!customElements.get("dice-poker-die")) {
  customElements.define("dice-poker-die", DicePokerDie);
}

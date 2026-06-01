// copied from oblig 3 
import styles from './StaticPage.module.css';

const VARIANTS = [
  { rounds: 3, straights: false, time: 3 },
  { rounds: 3, straights: false, time: 10 },
  { rounds: 3, straights: false, time: 30 },
  { rounds: 3, straights: true, time: 3 },
  { rounds: 3, straights: true, time: 10 },
  { rounds: 3, straights: true, time: 30 },
  { rounds: 5, straights: false, time: 3 },
  { rounds: 5, straights: false, time: 10 },
  { rounds: 5, straights: false, time: 30 },
  { rounds: 5, straights: true, time: 3 },
  { rounds: 5, straights: true, time: 10 },
  { rounds: 5, straights: true, time: 30 },
  { rounds: 7, straights: false, time: 3 },
  { rounds: 7, straights: false, time: 10 },
  { rounds: 7, straights: false, time: 30 },
  { rounds: 7, straights: true, time: 3 },
  { rounds: 7, straights: true, time: 10 },
  { rounds: 7, straights: true, time: 30 },
];

// Hand rankings from constants.js
const HANDS = [
  { name: 'Repóker', desc: 'Five of a kind - the best possible hand.' },
  { name: 'Póker', desc: 'Four of a kind.' },
  { name: 'Full', desc: 'Three of a kind plus a pair.' },
  { name: 'Trío', desc: 'Three of a kind.' },
  { name: 'Doble Pareja', desc: 'Two different pairs.' },
  { name: 'Pareja', desc: 'One pair.' },
  { name: 'Escalera', desc: 'A straight (only counts when straights are enabled).' },
  { name: 'Carta Alta', desc: 'Highest single die - the lowest hand.' },
];

export default function AboutDicePage() {
  return (
    <div className={`container ${styles.page}`}>
      <h1 className="page-title">About Spanish Poker Dice</h1>

      <div className={styles.content}>

        <section className={styles.section}>
          <h2>What is Spanish Poker Dice?</h2>
          <p>
            Spanish Poker Dice - known in Spain as <em>Póquer de Dados</em> - is a
            traditional Iberian dice game played with five custom dice. Unlike standard
            six-sided dice, each die shows six card-inspired faces: <strong>A, K, Q, J,
              8, and 7</strong>. The goal is to assemble the best poker-style hand from
            your rolls across one or more rounds.
          </p>
          <p>
            The game is won by the player who claims the most rounds. On each roll you
            may <em>hold</em> any number of dice and re-roll the rest, similar to video
            poker. Strategy lies in knowing when to chase a high hand versus settling
            early for a guaranteed win.
          </p>
        </section>

        <section className={styles.section}>
          <h2>The Dice Faces</h2>
          <p>
            Each die has six faces representing playing card ranks, from highest to lowest:
          </p>
          <div className={styles.diceRow}>
            {['A', 'K', 'Q', 'J', '8', '7'].map(face => (
              <div key={face} className={styles.die}>{face}</div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Hand Rankings</h2>
          <p>Hands are ranked from best to worst:</p>
          <ol className={styles.handList}>
            {HANDS.map((h, i) => (
              <li key={h.name}>
                <strong className={styles.handName}>{i + 1}. {h.name}</strong>
                <span> - {h.desc}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section}>
          <h2>Game Variants</h2>
          <p>
            Our platform offers <strong>18 different variants</strong>, combining three
            settings:
          </p>
          <ul className={styles.variantPoints}>
            <li><strong>Rounds:</strong> Best of 3, 5, or 7 - how many rounds determine the winner.</li>
            <li><strong>Straights:</strong> Whether the Escalera (straight) hand is counted.</li>
            <li><strong>Time Control:</strong> 3, 10, or 30 seconds per roll decision.</li>
          </ul>
          <table className={styles.variantTable}>
            <thead>
              <tr><th>Best of</th><th>Straights</th><th>Seconds/Round</th></tr>
            </thead>
            <tbody>
              {VARIANTS.map((v, i) => (
                <tr key={i}>
                  <td>{v.rounds}</td>
                  <td>{v.straights ? 'Yes' : 'No'}</td>
                  <td>{v.time}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2>Elo Rating</h2>
          <p>
            All registered players receive an Elo rating, starting at <strong>1000</strong>.
            After each game the winner gains points and the loser loses the same amount,
            adjusted by the difference in ratings - beating a stronger player earns more.
            Your Elo reflects your skill across each of the three time-control categories.
          </p>
        </section>

      </div>
    </div>
  );
}

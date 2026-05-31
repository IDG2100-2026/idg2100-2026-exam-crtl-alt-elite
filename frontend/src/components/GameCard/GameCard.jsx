import { useNavigate } from "react-router";
import styles from "./GameCard.module.css";

export default function GameCard({ game, showJoin = false, onJoin }) {
    const navigate = useNavigate();
    const variant = game.variantId;

    const p0Name = game.playerOne?.username ?? "Player 1";
    const p1Name = game.playerTwo?.username ?? "Waiting";

    const variantText = variant
        ? `Best of ${variant.rounds} - ${variant.straightsAllowed ? "straights" : "no straights"} - ${variant.timeControl}s`
        : "Unknown variant";

    const avgElo = (() => {
        const elos = [game.playerOne?.eloRating, game.playerTwo?.eloRating].filter(Boolean);
        if (elos.length === 0) return 1000;
        return Math.round(elos.reduce((a, b) => a + b, 0) / elos.length);
    })();

    function handleJoin() {
        if (onJoin) onJoin(game);
        else navigate(`/games/${game.gameId}`);
    }

    return (
        <div className={styles.card}>
            <div className={styles.players}>
                {p0Name} VS {p1Name}
            </div>

            <div className={styles.variant}>
                <span>{variantText}</span>
            </div>

            <div className={styles.elo}>
                AVG ELO: {avgElo}
            </div>

            <button className={styles.joinBtn} onClick={handleJoin}>
                {showJoin && game.status === "waiting" ? "JOIN" : "VIEW"}
            </button>
        </div>
    );
}

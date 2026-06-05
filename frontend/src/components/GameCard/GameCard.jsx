import { useNavigate } from "react-router";
import styles from "./GameCard.module.css";

export default function GameCard({ game, showJoin = false, onJoin, index = 0 }) {
    const navigate = useNavigate();
    const variant = game.variantId;

    const p0Name = game.players?.[0]?.username ?? "Unknown";
    const p1Name = game.players?.[1]?.username ?? "Waiting...";

    const variantText = variant
        ? `Best of ${variant.rounds} - ${variant.straightsAllowed ? "straights" : "no straights"} - ${variant.timeControl}s`
        : "Unknown variant";

    const avgElo = (() => {
        const elos = game.players?.map(p => p.eloRating).filter(Boolean) ?? [];
        if (elos.length === 0) return 1000;
        return Math.round(elos.reduce((a, b) => a + b, 0) / elos.length);
    })();

    function handleJoin() {
        if (onJoin) onJoin(game);
        else navigate(`/games/${game.gameId}`);
    }

    return (
        <div className={`${styles.card} ${index % 2 === 1 ? styles.cardDark : ""}`}>
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
                {showJoin && game.status === "room" ? "JOIN" : "VIEW"}
            </button>
        </div>
    );
}

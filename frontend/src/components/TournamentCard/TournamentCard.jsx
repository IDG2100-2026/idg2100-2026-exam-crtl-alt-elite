import { Link } from "react-router";
import styles from "./TournamentCard.module.css";

const STATUS_LABEL = {
    upcoming: "Upcoming",
    ongoing: "Ongoing",
    finished: "Finished",
    cancelled: "Cancelled",
};

const STATUS_CLASS = {
    upcoming: styles.statusUpcoming,
    ongoing: styles.statusOngoing,
    finished: styles.statusFinished,
    cancelled: styles.statusCancelled,
};

export default function TournamentCard({ tournament }) {
    const statusClass = STATUS_CLASS[tournament.status] ?? styles.statusUpcoming;
    const statusLabel = STATUS_LABEL[tournament.status] ?? tournament.status;

    return (
        <Link className={styles.card} to={`/tournaments/${tournament.tournamentId}`}>
            <div className={styles.cardHeader}>
                <h3>{tournament.title}</h3>
                <span className={`${styles.status} ${statusClass}`}>{statusLabel}</span>
            </div>

            <div className={styles.meta}>
                <span>{new Date(tournament.scheduledAt).toLocaleDateString("nb-NO")}</span>
                <span>Hosted by {tournament.createdBy}</span>
                <span>{tournament.numRounds} rounds · {tournament.variantId?.buyIn ?? 0} pts buy-in</span>
                {tournament.eloMin != null && (
                    <span>Elo {tournament.eloMin}–{tournament.eloMax}</span>
                )}
            </div>
        </Link>
    );
}

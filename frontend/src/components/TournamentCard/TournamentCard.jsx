import { Link } from "react-router";
import styles from "./TournamentCard.module.css";

export default function TournamentCard({ tournament }) {
  return (
    <Link
      className={styles.card}
      to={`/tournaments/${tournament.tournamentId}`}
    >
      <div className={styles.cardHeader}>
        <h3>{tournament.title}</h3>
        <span>{tournament.status}</span>
      </div>

      <div>
        <p>
          {new Date(tournament.scheduledAt).toLocaleDateString("no-NO")}
        </p>

        <p>Hosted by: {tournament.createdBy}</p>

        <p>
          {tournament.numRounds} rounds
        </p>

        <p>
          Buy in: {tournament.variantId?.buyIn} points
        </p>

        {tournament.eloMin !== null && (
          <p>
            Elo: {tournament.eloMin} - {tournament.eloMax}
          </p>
        )}
      </div>
    </Link>
  );
}
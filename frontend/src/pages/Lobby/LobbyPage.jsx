import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";
import GameCard from "@/components/GameCard/GameCard";
import styles from "./LobbyPage.module.css";

export default function LobbyPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterRounds, setFilterRounds] = useState("");
    const [filterTime, setFilterTime] = useState("");

    useEffect(() => {
        async function fetchGames() {
            try {
                setLoading(true);
                setError(null);

                const params = new URLSearchParams({ status: "room", limit: 20 });
                if (filterRounds) params.append("rounds", filterRounds);
                if (filterTime) params.append("timeControl", filterTime);

                const res = await fetch(`http://localhost:9000/api/games?${params}`);
                const data = await res.json();
                setGames(data.games ?? []);
            } catch {
                setError("Failed to load games. Is the backend running?");
            } finally {
                setLoading(false);
            }
        }
        fetchGames();
    }, [filterRounds, filterTime]);

    return (
        <div className={styles.page}>
            <h1>Game Lobby</h1>

            {!user && (
                <p className={styles.anonNote}>
                    Browsing as a guest. <Link to="/register">Register</Link> to join games.
                </p>
            )}

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label>Rounds</label>
                    <select value={filterRounds} onChange={e => setFilterRounds(e.target.value)}>
                        <option value="">Any</option>
                        <option value="3">Best of 3</option>
                        <option value="5">Best of 5</option>
                        <option value="7">Best of 7</option>
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label>Time per Round</label>
                    <select value={filterTime} onChange={e => setFilterTime(e.target.value)}>
                        <option value="">Any</option>
                        <option value="3">3 seconds</option>
                        <option value="10">10 seconds</option>
                        <option value="30">30 seconds</option>
                    </select>
                </div>

                {user && (
                    <button className="button button-secondary" onClick={() => navigate("/createGame")}>
                        + Create Game
                    </button>
                )}
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {loading && <p>Loading games...</p>}

            {!loading && !error && (
                games.length === 0 ? (
                    <div className={styles.empty}>
                        <p>No games waiting right now.</p>
                        {user && (
                            <button className="button button-secondary" onClick={() => navigate("/createGame")}>
                                Create the First Game
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {games.map(game => (
                            <GameCard
                                key={game.gameId ?? game._id}
                                game={game}
                                showJoin
                                onJoin={g => navigate(`/games/${g.gameId}`)}
                            />
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

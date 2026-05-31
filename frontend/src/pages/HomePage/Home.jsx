import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Link } from "react-router";
import GameCard from "@/components/GameCard/GameCard";
import Styles from "./Home.module.css";
import mainImg from "@/assets/mainPokerDice-bk.png";

export default function Home() {
    const navigate = useNavigate();

    const [lobbyGames, setLobbyGames] = useState([]);
    const [topGames, setTopGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                const lobbyRes = await fetch("http://localhost:9000/api/games?status=room&limit=5");
                const lobbyData = await lobbyRes.json();
                setLobbyGames(lobbyData.games ?? []);

                const ongoingRes = await fetch("http://localhost:9000/api/games?status=ongoing&limit=5");
                const ongoingData = await ongoingRes.json();
                setTopGames(ongoingData.games ?? []);
            } catch {
                setError("Failed to load games. Is the backend running?");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    return (
        <div className={Styles.homeContainer}>

            {/* Hero - unchanged from your original */}
            <section className={Styles.hero}>
                <img className={Styles.mainImg} src={mainImg} alt="spanish poker dice" />
                <div className={Styles.heroContent}>
                    <h1 className={Styles.heroTitle}>Spanish poker Dice</h1>
                    <p className={Styles.heroSubtitle}>Play games for all over the world</p>
                    <button
                        onClick={() => navigate("/createGame")}
                        className={`button ${Styles.btnCreate}`}
                    >
                        Create Game
                    </button>
                </div>
            </section>

            {error && <p style={{ padding: "1rem", color: "red" }}>{error}</p>}

            {/* Lobby preview */}
            <section className={Styles.lobbySection}>
                <div className={Styles.sectionHeader}>
                    <h2>Lobby</h2>
                    <Link to="/lobby" className={Styles.seeAll}>See all</Link>
                </div>
                <p className={Styles.sectionSubtitle}>Join an existing game or create your own</p>
                {loading ? <p className={Styles.emptyMsg}>Loading...</p> : lobbyGames.length === 0 ? (
                    <p className={Styles.emptyMsg}>No games waiting right now.</p>
                ) : (
                    <div className={Styles.grid}>
                        {lobbyGames.map(game => (
                            <GameCard key={game.gameId ?? game._id} game={game} showJoin onJoin={g => navigate(`/games/${g.gameId}`)} />
                        ))}
                    </div>
                )}
            </section>

            {/* Top games */}
            <section className={Styles.topGamesSection}>
                <div className={Styles.sectionHeader}>
                    <h2>Top Games</h2>
                </div>
                <p className={Styles.sectionSubtitle}>Most popular games right now</p>
                {loading ? <p className={Styles.emptyMsg}>Loading...</p> : topGames.length === 0 ? (
                    <p className={Styles.emptyMsg}>No active games at the moment.</p>
                ) : (
                    <div className={Styles.grid}>
                        {topGames.map(game => (
                            <GameCard key={game.gameId ?? game._id} game={game} />
                        ))}
                    </div>
                )}
            </section>

        </div>
    );
}

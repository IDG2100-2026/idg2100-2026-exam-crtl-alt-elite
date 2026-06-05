import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useAuth } from "../../../hooks/useAuth.js";
import { useCountdown } from "../../../hooks/useCountdown.js";
import { tournamentApi, commentApi } from "../../../api/api.js";
import { getSocket } from "../../../api/socket.js";
import styles from "./TournamentPage.module.css";

function CommentSection({ tournamentId, user }) {
    const [comments, setComments] = useState([]);
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        async function fetchComments() {
            try {
                const data = await commentApi.getAll(tournamentId, "tournament");
                setComments(data.comments ?? []);
            } catch {
            }
        }
        fetchComments();
    }, [tournamentId]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        socket.emit("join_comments", { targetType: "tournament", targetId: Number(tournamentId) });

        socket.on("new_comment", (newComment) => {
            setComments(prev => [...prev, newComment]);
        });

        socket.on("comment_deleted", ({ commentId }) => {
            setComments(prev => prev.filter(c => c._id !== commentId));
        });

        socket.on("error", ({ msg }) => {
            setError(msg);
        });

        return () => {
            socket.off("new_comment");
            socket.off("comment_deleted");
            socket.off("error");
        };
    }, [tournamentId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [comments]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!content.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const socket = getSocket();
            if (!socket) throw new Error("Not connected to server.");

            socket.emit("post_comment", {
                targetType: "tournament",
                targetId: Number(tournamentId),
                content: content.trim()
            });

            setContent("");
        } catch (err) {
            setError(err.message || "Failed to post comment.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className={styles.comments}>
            <h2>Comments</h2>
            <div className={styles.commentList}>
                {comments.length === 0 && <p className={styles.empty}>No comments yet.</p>}
                {comments.map((c, i) => (
                    <div key={c._id || i} className={styles.comment}>
                        <strong>{c.username || c.userId || "Anonymous"}</strong>
                        <span className={styles.commentDate}>{new Date(c.createdAt).toLocaleString()}</span>
                        <p>{c.content}</p>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            {user ? (
                <form onSubmit={handleSubmit} className={styles.commentForm}>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Leave a comment..."
                        maxLength={500}
                        rows={3}
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <button type="submit" className="button button-secondary" disabled={submitting}>
                        {submitting ? "Posting..." : "Post Comment"}
                    </button>
                </form>
            ) : (
                <p><Link to="/login">Log in</Link> to leave a comment.</p>
            )}
        </section>
    );
}

function OngoingGames({ tournamentId }) {
    const [games, setGames] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchGames() {
            try {
                const data = await tournamentApi.getGames(tournamentId);
                setGames(data.games ?? []);
            } catch {
            }
        }
        fetchGames();
    }, [tournamentId]);

    if (games.length === 0) return <p>No games in progress.</p>;

    return (
        <ul className={styles.gameList}>
            {games.map(game => (
                <li key={game.gameId}>
                    <button
                        className="button button-secondary"
                        onClick={() => navigate(`/games/${game.gameId}`)}
                    >
                        Game {game.gameId} - {game.status}
                    </button>
                </li>
            ))}
        </ul>
    );
}

export default function TournamentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [tournament, setTournament] = useState(null);
    const [standings, setStandings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);

    const countdown = useCountdown(
        tournament?.status === "upcoming" ? tournament?.scheduledAt :
        tournament?.status === "ongoing" ? tournament?.nextRoundAt : null
    );

    const isPlayer = tournament?.players?.includes(user?.userId);
    const isAdmin = user?.role === "admin";
    const canJoin = tournament?.status === "upcoming" && !isPlayer && user;
    const canLeave = isPlayer && user;

    useEffect(() => {
        async function fetchTournament() {
            try {
                const data = await tournamentApi.getById(id);
                setTournament(data.tournament ?? data);
            } catch (err) {
                setError(err.message || "Failed to load tournament.");
            } finally {
                setLoading(false);
            }
        }
        fetchTournament();
    }, [id]);

    useEffect(() => {
        if (tournament?.status !== "ongoing" && tournament?.status !== "finished") return;

        async function fetchStandings() {
            try {
                const data = await tournamentApi.getStandings(id);
                setStandings(data.standings ?? []);
            } catch {
            }
        }
        fetchStandings();
    }, [id, tournament?.status]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket || !isPlayer) return;

        socket.on("tournament_game_ready", ({ gameId }) => {
            navigate(`/games/${gameId}`);
        });

        return () => socket.off("tournament_game_ready");
    }, [isPlayer, navigate]);

    async function handleJoin() {
        setActionLoading(true);
        setActionError(null);
        try {
            await tournamentApi.join(id);
            const data = await tournamentApi.getById(id);
            setTournament(data.tournament ?? data);
        } catch (err) {
            setActionError(err.message || "Failed to join tournament.");
        } finally {
            setActionLoading(false);
        }
    }

    async function handleLeave() {
        setActionLoading(true);
        setActionError(null);
        try {
            await tournamentApi.leave(id, user.userId);
            const data = await tournamentApi.getById(id);
            setTournament(data.tournament ?? data);
        } catch (err) {
            setActionError(err.message || "Failed to leave tournament.");
        } finally {
            setActionLoading(false);
        }
    }

    async function handleCancel() {
        if (!confirm("Are you sure you want to cancel this tournament?")) return;
        setActionLoading(true);
        setActionError(null);
        try {
            await tournamentApi.cancel(id);
            const data = await tournamentApi.getById(id);
            setTournament(data.tournament ?? data);
        } catch (err) {
            setActionError(err.message || "Failed to cancel tournament.");
        } finally {
            setActionLoading(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Are you sure you want to permanently delete this tournament?")) return;
        setActionLoading(true);
        setActionError(null);
        try {
            await tournamentApi.delete(id);
            navigate("/tournaments");
        } catch (err) {
            setActionError(err.message || "Failed to delete tournament.");
        } finally {
            setActionLoading(false);
        }
    }

    if (loading) return <p style={{ padding: "2rem" }}>Loading tournament...</p>;
    if (error) return <p style={{ padding: "2rem", color: "red" }}>{error}</p>;
    if (!tournament) return null;

    const variant = tournament.variantId;
    const isCancelled = tournament.status === "cancelled";
    const isFinished = tournament.status === "finished";
    const isOngoing = tournament.status === "ongoing";
    const isUpcoming = tournament.status === "upcoming";

    return (
        <div className={styles.page}>

            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <h1>{tournament.title}</h1>
                    <span className={`${styles.badge} ${styles[tournament.status]}`}>
                        {tournament.status}
                    </span>
                </div>
                <p className={styles.description}>{tournament.description}</p>
            </div>

            <div className={styles.layout}>
                <div className={styles.main}>

                    {tournament.trophyId?.imageUrl && (
                        <section className={styles.trophy}>
                            <img
                                src={tournament.trophyId.imageUrl}
                                alt="Tournament trophy"
                                className={styles.trophyImage}
                            />
                        </section>
                    )}

                    {countdown && (
                        <section className={styles.countdown}>
                            <h2>
                                {isUpcoming ? "Tournament starts in" : "Next round starts in"}
                            </h2>
                            <div className={styles.countdownTimer}>
                                <span>{String(countdown.days).padStart(2, "0")}d</span>
                                <span>{String(countdown.hours).padStart(2, "0")}h</span>
                                <span>{String(countdown.minutes).padStart(2, "0")}m</span>
                                <span>{String(countdown.seconds).padStart(2, "0")}s</span>
                            </div>
                        </section>
                    )}

                    <section className={styles.rules}>
                        <h2>Tournament Rules</h2>
                        <ul>
                            <li>Rounds: {tournament.numRounds}</li>
                            <li>Max players: {tournament.maxPlayers}</li>
                            {variant && (
                                <>
                                    <li>Game variant: Best of {variant.rounds} · {variant.timeControl}s total · Straights {variant.straightsAllowed ? "on" : "off"}</li>
                                    <li>Buy-in: {variant.buyIn} points</li>
                                    <li>Players per game: {variant.numPlayers}</li>
                                </>
                            )}
                            {tournament.eloMin != null && tournament.eloMax != null && (
                                <li>ELO requirement: {tournament.eloMin} – {tournament.eloMax}</li>
                            )}
                            <li>Break between rounds: {tournament.breakDuration} minutes</li>
                        </ul>
                    </section>

                    {(isOngoing || isFinished) && standings.length > 0 && (
                        <section className={styles.standings}>
                            <h2>Standings</h2>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Player</th>
                                        <th>Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {standings.map((s, i) => (
                                        <tr key={s.userId} className={isFinished && i === 0 ? styles.winner : ""}>
                                            <td>{i + 1}</td>
                                            <td>{s.username ?? s.userId}</td>
                                            <td>{s.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}

                    {isOngoing && !isPlayer && (
                        <section className={styles.ongoingGames}>
                            <h2>Ongoing Games</h2>
                            <OngoingGames tournamentId={id} />
                        </section>
                    )}

                    <CommentSection tournamentId={id} user={user} />
                </div>

                <aside className={styles.sidebar}>

                    <section className={styles.players}>
                        <h2>
                            Players ({tournament.players?.length ?? 0}/{tournament.maxPlayers})
                        </h2>
                        {tournament.players?.length === 0 && (
                            <p className={styles.empty}>No players yet.</p>
                        )}
                        <ul className={styles.playerList}>
                            {(tournament.playerDetails ?? tournament.players ?? []).map((player, i) => (
                                <li key={player.userId ?? player ?? i}>
                                    {player.username ?? player}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className={styles.actions}>
                        {actionError && <p className={styles.error}>{actionError}</p>}

                        {canJoin && !isCancelled && (
                            <button
                                className="button button-secondary"
                                onClick={handleJoin}
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Joining..." : "Join Tournament"}
                            </button>
                        )}

                        {canLeave && !isCancelled && (
                            <button
                                className="button"
                                onClick={handleLeave}
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Leaving..." : "Leave Tournament"}
                            </button>
                        )}

                        {isAdmin && (
                            <>
                                <Link
                                    to={`/admin/tournaments/${id}/edit`}
                                    className="button button-secondary"
                                >
                                    Edit Tournament
                                </Link>

                                {!isCancelled && !isFinished && (
                                    <button
                                        className="button"
                                        onClick={handleCancel}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? "Cancelling..." : "Cancel Tournament"}
                                    </button>
                                )}

                                <button
                                    className="button"
                                    onClick={handleDelete}
                                    disabled={actionLoading}
                                    style={{ background: "#8b0000" }}
                                >
                                    {actionLoading ? "Deleting..." : "Delete Tournament"}
                                </button>
                            </>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
}

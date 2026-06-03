import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from "../../hooks/useAuth.js";
import { gameApi, commentApi } from "../../api/api.js";
import { getSocket } from "../../api/socket.js";
import { useSettings } from '@/context/SettingsContext';
import GameBoard from '@/components/Game/GameBoard';
import '@/components/Dice/dice-poker-monitor.js';
import styles from './GamePage.module.css';

function CommentList({ comments }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    if (!comments || comments.length === 0) {
        return <p className={styles.noComments}>No comments yet. Be the first!</p>;
    }

    const sorted = [...comments].reverse();

    return (
        <ul className={styles.commentList}>
            {sorted.map((c, i) => (
                <li key={c._id || i} className={styles.comment}>
                    <div className={styles.commentMeta}>
                        <strong>{c.username || c.userId || 'Anonymous'}</strong>
                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p>{c.content}</p>
                </li>
            ))}
            <li ref={bottomRef} />
        </ul>
    );
}

export default function GamePage() {
    const { id } = useParams();
    const { user } = useAuth();
    const { boardColor } = useSettings();

    const [game, setGame] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [commentErr, setCommentErr] = useState(null);
    const [joining, setJoining] = useState(false);
    const [joinErr, setJoinErr] = useState(null);
    const pollRef = useRef(null);

    useEffect(() => {
        async function fetchGame() {
            try {
                const data = await gameApi.getById(id);
                setGame(data);
                setError(null);
                // Stop polling once game has started or finished
                if (data.status !== 'room') {
                    console.log('Stopping poll, game status:', data.status);
                    clearInterval(pollRef.current);
                }
            } catch (err) {
                setError(err.message || 'Failed to load game.');
            } finally {
                setLoading(false);
            }
        }

        async function fetchComments() {
            try {
                const data = await commentApi.getAll(id, 'game');
                setComments(data.comments ?? []);
            } catch {
                // silently fail
            }
        }

        fetchGame();
        fetchComments();

        // Poll every 15 seconds while game is in room status
        pollRef.current = setInterval(fetchGame, 15000);
        return () => clearInterval(pollRef.current);
    }, [id]);

    // Join WebSocket comment room for live comments
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        // Join the comment room for this game
        socket.emit('join_comments', { targetType: 'game', targetId: Number(id) });

        // Listen for new comments
        socket.on('new_comment', (newComment) => {
            setComments(prev => [...prev, newComment]);
        });

        // Listen for deleted comments
        socket.on('comment_deleted', ({ commentId }) => {
            setComments(prev => prev.filter(c => c._id !== commentId));
        });

        return () => {
            socket.off('new_comment');
            socket.off('comment_deleted');
        };
    }, [id]);

    async function joinGame() {
        setJoining(true);
        setJoinErr(null);
        try {
            await gameApi.joinRoom(id);
            const data = await gameApi.getById(id);
            setGame(data);
        } catch (err) {
            setJoinErr(err.message || 'Failed to join game.');
        } finally {
            setJoining(false);
        }
    }

    async function handleCommentSubmit(e) {
        e.preventDefault();
        if (!comment.trim()) return;
        setSubmitting(true);
        setCommentErr(null);
        try {
            const socket = getSocket();
            if (!socket) throw new Error("Not connected to server.");

            // Post via WebSocket so the broadcast fires to all users in the room
            // REST endpoint doesn't trigger the broadcast
            socket.emit("post_comment", {
                targetType: "game",
                targetId: Number(id),
                content: comment.trim()
            });

            setComment("");
        } catch (err) {
            setCommentErr(err.message || "Failed to post comment.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <p style={{ padding: '2rem' }}>Loading game...</p>;
    if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;
    if (!game) return null;

    // New game model uses players array instead of playerOne/playerTwo
    const p0 = game.players?.[0];
    const p1 = game.players?.[1];
    const p0Name = p0?.username || 'Unknown';
    const p1Name = p1?.username || (game.status === 'room' ? 'Waiting...' : 'Unknown');
    const p0Elo = p0?.eloRating || '-';
    const p1Elo = p1?.eloRating || '-';

    const variant = game.variantId;

    return (
        <div className={styles.page}>

            <div className={styles.gameHeader}>
                <h1>{p0Name} <span className={styles.vs}>vs</span> {p1Name}</h1>
                <span className={`${styles.statusBadge} ${styles[game.status]}`}>{game.status}</span>
                {variant && (
                    <div className={styles.variantChips}>
                        <span className={styles.chip}>Best of {variant.rounds}</span>
                        <span className={styles.chip}>{variant.timeControl}s per turn</span>
                        <span className={`${styles.chip} ${variant.straightsAllowed ? styles.chipOn : styles.chipOff}`}>
                            Straights {variant.straightsAllowed ? 'on' : 'off'}
                        </span>
                        <span className={styles.chip}>{variant.numPlayers} players</span>
                        <span className={styles.chip}>{variant.buyIn} pt buy-in</span>
                    </div>
                )}
            </div>

            <div className={styles.layout}>

                {/* Game board */}
                <div className={styles.boardArea}>
                    <div className={styles.board} style={{ background: boardColor }}>
                        <div className={styles.players}>
                            <div className={styles.playerCard}>
                                <span className={styles.playerName}>{p0Name}</span>
                                <span className={styles.playerElo}>Elo {p0Elo}</span>
                            </div>
                            <span className={styles.vsSmall}>vs</span>
                            <div className={styles.playerCard}>
                                <span className={styles.playerName}>{p1Name}</span>
                                <span className={styles.playerElo}>Elo {p1Elo}</span>
                            </div>
                        </div>
                        {game.status === 'room' && (() => {
                            const alreadyIn = game.players?.some(p => p.userId === user?.userId);
                            const isFull = game.players?.length >= variant?.numPlayers;
                            return (
                                <div className={styles.waitingOverlay}>
                                    <div className={styles.waitingBox}>
                                        <p>{alreadyIn ? 'Waiting for other players...' : 'Join this game?'}</p>
                                        <p className={styles.pollNote}>
                                            {game.players?.length}/{variant?.numPlayers} players joined
                                        </p>
                                        {!alreadyIn && !isFull && user && (
                                            <>
                                                <button
                                                    className="button button-secondary"
                                                    onClick={joinGame}
                                                    disabled={joining}
                                                    style={{ marginTop: '1rem' }}
                                                >
                                                    {joining ? 'Joining...' : `Join (${variant?.buyIn} pt buy-in)`}
                                                </button>
                                                {joinErr && <p style={{ color: 'red', marginTop: '0.5rem', fontSize: '0.85rem' }}>{joinErr}</p>}
                                            </>
                                        )}
                                        {alreadyIn && (
                                            <p className={styles.pollNote}>Page refreshes automatically every 15 seconds.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                        {game.status === 'ongoing' && (
                            <GameBoard game={game} />
                        )}
                        {game.status === 'finished' && (
                            <div className={styles.placeholderMsg}>
                                Game finished
                                {game.winnerId?.length > 0 && (
                                    <p>Winner: {game.winnerId.map(id =>
                                        game.players?.find(p => p.userId === id)?.username || `Player ${id}`
                                    ).join(', ')}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Comments sidebar */}
                <aside className={styles.sidebar}>
                    <h2 className={styles.sidebarTitle}>Comments</h2>
                    <CommentList comments={comments} />

                    {user ? (
                        <form onSubmit={handleCommentSubmit} className={styles.commentForm}>
                            <textarea
                                className={styles.commentInput}
                                placeholder="Leave a comment..."
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                maxLength={500}
                                rows={3}
                            />
                            {commentErr && <p style={{ color: 'red', fontSize: '0.9rem' }}>{commentErr}</p>}
                            <button type="submit" className="button button-secondary" disabled={submitting}>
                                {submitting ? 'Posting...' : 'Post Comment'}
                            </button>
                        </form>
                    ) : (
                        <p className={styles.loginPrompt}>
                            <Link to="/login">Log in</Link> to leave a comment.
                        </p>
                    )}

                    {game.status === 'ongoing' && (
                        <div className={styles.monitorSection}>
                            <dice-poker-monitor player1={p0Name} player2={p1Name} />
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
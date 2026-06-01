import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from "../../hooks/useAuth.js";
import { useSettings } from '@/context/SettingsContext';
import GameBoard from '@/components/Dice/GameBoard';
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
                        <strong>{c.userId?.username || 'Anonymous'}</strong>
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
    const pollRef = useRef(null);

    useEffect(() => {
        async function fetchGame() {
            try {
                const res = await fetch(`http://localhost:9000/api/games/${id}`, {
                    headers: user ? { 'x-user-id': user.userId } : {}
                });
                const data = await res.json();
                if (!res.ok) { setError(data.msg || 'Failed to load game.'); return; }
                setGame(data);
                setError(null);
                if (data.status !== 'waiting') clearInterval(pollRef.current);
            } catch {
                setError('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        }

        async function fetchComments() {
            try {
                const res = await fetch(`http://localhost:9000/api/comments?targetId=${id}&targetType=game`);
                const data = await res.json();
                setComments(data.comments ?? []);
            } catch {
                // silently fail
            }
        }

        fetchGame();
        fetchComments();

        pollRef.current = setInterval(fetchGame, 15000);
        return () => clearInterval(pollRef.current);
    }, [id, user]);

    async function handleCommentSubmit(e) {
        e.preventDefault();
        if (!comment.trim()) return;
        setSubmitting(true);
        setCommentErr(null);
        try {
            const res = await fetch('http://localhost:9000/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.userId
                },
                body: JSON.stringify({ targetId: id, targetType: 'game', content: comment.trim() })
            });
            const data = await res.json();
            if (!res.ok) { setCommentErr(data.msg || 'Failed to post comment.'); return; }
            setComment('');
            // Refetch comments to show the new one
            const updated = await fetch(`http://localhost:9000/api/comments?targetId=${id}&targetType=game`);
            const updatedData = await updated.json();
            setComments(updatedData.comments ?? []);
        } catch {
            setCommentErr('Could not connect to the server.');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <p style={{ padding: '2rem' }}>Loading game...</p>;
    if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;
    if (!game) return null;

    const p0 = game.playerOne;
    const p1 = game.playerTwo;
    const p0Name = p0?.username || 'Anonymous';
    const p1Name = p1?.username || 'Waiting...';
    const p0Elo = p0?.eloRating || '-';
    const p1Elo = p1?.eloRating || '-';

    const variant = game.variantId;
    const variantLabel = variant
        ? `Best of ${variant.rounds} · ${variant.timeControl}s/round · Straights ${variant.straightsAllowed ? 'on' : 'off'}`
        : 'Unknown variant';

    return (
        <div className={styles.page}>

            <div className={styles.gameHeader}>
                <h1>{p0Name} <span className={styles.vs}>vs</span> {p1Name}</h1>
                <p className={styles.variant}>{variantLabel}</p>
                <span className={`${styles.statusBadge} ${styles[game.status]}`}>{game.status}</span>
            </div>

            <div className={styles.layout}>

                {/* Game board */}
                <div className={styles.boardArea}>
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

                    <div className={styles.board} style={{ background: boardColor }}>
                        {game.status === 'waiting' && (
                            <div className={styles.waitingOverlay}>
                                <div className={styles.waitingBox}>
                                    <p>Waiting for another player to join...</p>
                                    <p className={styles.pollNote}>Page refreshes automatically every 15 seconds.</p>
                                </div>
                            </div>
                        )}
                        {game.status === 'ongoing' && (
                            <GameBoard game={game} />
                        )}
                        {game.status === 'finished' && (
                            <div className={styles.placeholderMsg}>Game finished</div>
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

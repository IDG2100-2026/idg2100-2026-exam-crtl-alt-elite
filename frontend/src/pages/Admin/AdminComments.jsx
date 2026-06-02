import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { commentApi } from '../../api/api.js';
import styles from './AdminComments.module.css';

const PAGE_SIZE = 12;

export default function AdminComments() {
    const [comments, setComments] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchComments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await commentApi.getRecent({ page, limit: PAGE_SIZE });
            setComments(data.comments || []);
            setTotal(data.total || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchComments(); }, [fetchComments]);

    async function handleDelete(commentId) {
        try {
            await commentApi.delete(commentId);
            setComments(prev => prev.map(c => c._id === commentId ? { ...c, isDeleted: true } : c));
        } catch (err) {
            alert(err.message);
        }
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div>
            <div className={styles.pageHeader}>
                <h1 className={styles.title}>Comment Administration</h1>
                {!loading && (
                    <div className={styles.countBadge}>
                        <span className={styles.countNum}>{total}</span>
                        <span className={styles.countLabel}>comments</span>
                    </div>
                )}
            </div>

            {loading ? (
                <p className={styles.status}>Loading...</p>
            ) : error ? (
                <p className={styles.error}>{error}</p>
            ) : (
                <>
                    <div className={styles.list}>
                        {comments.length === 0 ? (
                            <p className={styles.empty}>No comments found.</p>
                        ) : comments.map(c => (
                            <div key={c._id} className={`${styles.commentCard} ${c.isDeleted ? styles.deleted : ''}`}>
                                <div className={styles.cardHeader}>
                                    <Link to={`/profile/${c.userId}`} className={styles.authorLink}>
                                        {c.username || `User ${c.userId}`}
                                    </Link>
                                    <div className={styles.headerRight}>
                                        {c.isDeleted && <span className={styles.deletedBadge}>Deleted</span>}
                                        <button
                                            className={styles.btnDelete}
                                            onClick={() => handleDelete(c._id)}
                                            disabled={c.isDeleted}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                <p className={styles.commentBody}>{c.content}</p>

                                <div className={styles.cardFooter}>
                                    {c.targetType === 'game' ? (
                                        <Link to={`/games/${c.targetId}`} className={styles.targetPill}>
                                            Game
                                        </Link>
                                    ) : (
                                        <Link to={`/tournaments/${c.targetId}`} className={styles.targetPill}>
                                            Tournament
                                        </Link>
                                    )}
                                    <span className={styles.date}>{new Date(c.createdAt).toLocaleDateString('nb-NO')}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.pageBtn}>
                                Previous
                            </button>
                            <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.pageBtn}>
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

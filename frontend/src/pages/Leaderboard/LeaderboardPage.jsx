import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { leaderboardApi } from '../../api/api.js';
import styles from './LeaderboardPage.module.css';

const SORT_OPTIONS = [
    { value: 'elo', label: 'ELO' },
    { value: 'wins', label: 'Wins' },
    { value: 'winPercentage', label: 'Win %' },
    { value: 'totalGames', label: 'Games' },
];

const PAGE_SIZE = 10;

export default function LeaderboardPage() {
    const [entries, setEntries] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState('elo');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await leaderboardApi.get({ sort, page, limit: PAGE_SIZE });
            setEntries(data.leaderboard?.leaderboard || []);
            setTotal(data.leaderboard?.total || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [sort, page]);

    useEffect(() => { fetchLeaderboard(); }, [fetchLeaderboard]);

    function handleSort(value) {
        setSort(value);
        setPage(1);
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const offset = (page - 1) * PAGE_SIZE;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Leaderboard</h1>
                <p className={styles.subtitle}>{total} players ranked</p>
            </div>

            <div className={styles.sortTabs}>
                {SORT_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        className={`${styles.tab} ${sort === opt.value ? styles.tabActive : ''}`}
                        onClick={() => handleSort(opt.value)}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            {loading ? (
                <p className={styles.status}>Loading...</p>
            ) : (
                <>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Player</th>
                                    <th>ELO</th>
                                    <th>W</th>
                                    <th>L</th>
                                    <th>D</th>
                                    <th>Win %</th>
                                    <th>Games</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e, i) => {
                                    const rank = offset + i + 1;
                                    const eloChange = e.eloChangeThisWeek ?? 0;
                                    return (
                                        <tr key={e.userId} className={rank <= 3 ? styles[`top${rank}`] : ''}>
                                            <td className={styles.rank}>
                                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                                            </td>
                                            <td>
                                                <Link to={`/profile/${e.userId}`} className={styles.playerLink}>
                                                    {e.username}
                                                </Link>
                                            </td>
                                            <td className={styles.elo}>
                                                <span className={styles.eloVal}>{e.eloRating}</span>
                                                {eloChange !== 0 && (
                                                    <span className={eloChange > 0 ? styles.eloUp : styles.eloDown}>
                                                        {eloChange > 0 ? `+${eloChange}` : eloChange}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={styles.win}>{e.wins}</td>
                                            <td className={styles.loss}>{e.losses}</td>
                                            <td>{e.draws}</td>
                                            <td>{e.winPercentage}%</td>
                                            <td>{e.totalGames}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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

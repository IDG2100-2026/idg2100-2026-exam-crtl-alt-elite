import { useState, useEffect } from 'react';
import { adminApi } from '../../api/api.js';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        adminApi.getDashboard()
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className={styles.status}>Loading...</p>;
    if (error) return <p className={styles.error}>{error}</p>;

    const { platformActivity, securityIncidents } = data;
    const { newProfilesThisWeek, ongoingGames, activePlayersThisWeek, gamesPlayedThisWeek } = platformActivity || {};
    const { recent: recentIncidents, ipMismatchCount, rateLimitCount } = securityIncidents || {};

    return (
        <div>
            <h1 className={styles.title}>Dashboard</h1>

            <div className={styles.statsGrid}>
                <StatCard label="New users this week" value={newProfilesThisWeek} />
                <StatCard label="Ongoing games" value={ongoingGames} />
                <StatCard label="Active players this week" value={activePlayersThisWeek} />
                <StatCard label="Games played this week" value={gamesPlayedThisWeek} />
                <StatCard label="IP mismatch incidents" value={ipMismatchCount ?? 0} />
                <StatCard label="Rate limit incidents" value={rateLimitCount ?? 0} />
            </div>


        </div>
    );
}

function StatCard({ label, value, warn }) {
    return (
        <div className={`${styles.card} ${warn && value > 0 ? styles.cardWarn : ''}`}>
            <span className={styles.cardValue}>{value ?? 0}</span>
            <span className={styles.cardLabel}>{label}</span>
        </div>
    );
}

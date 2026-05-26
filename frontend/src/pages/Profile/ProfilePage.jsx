import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import styles from '../Profile/ProfilePage.module.css';

export default function ProfilePage() {
    const { id } = useParams();
    const { user: currentUser, login } = useAuth();

    // Is this the logged-in user viewing their own profile?
    const resolvedId = id === 'me' && currentUser ? currentUser.userId : id;
    const isOwnProfile = currentUser && String(currentUser.userId) === String(resolvedId);

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit form state
    const [editing, setEditing] = useState(false);
    const [editEmail, setEditEmail] = useState('');
    const [editAbout, setEditAbout] = useState('');
    const [editPwd, setEditPwd] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveOk, setSaveOk] = useState(false);

    useEffect(() => {
        async function fetchUser() {
            try {
                setLoading(true);
                const res = await fetch(`http://localhost:9000/api/users/${resolvedId}`, {
                    headers: currentUser ? { 'x-user-id': currentUser.userId } : {}
                });
                const data = await res.json();
                if (!res.ok) {
                    setError(data.msg || 'Failed to load profile.');
                    return;
                }
                setUser(data);
                setEditEmail(data.email || '');
                setEditAbout(data.aboutMe || '');
            } catch {
                setError('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        }
        fetchUser();
    }, [resolvedId, currentUser]);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setSaveError(null);
        setSaveOk(false);

        const updates = {};
        if (editEmail.trim()) updates.email = editEmail.trim();
        if (editAbout.trim()) updates.aboutMe = editAbout.trim();
        if (editPwd.trim()) updates.pwd = editPwd.trim();

        try {
            const res = await fetch(`http://localhost:9000/api/users/${resolvedId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': currentUser.userId
                },
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (!res.ok) {
                setSaveError(data.msg || 'Failed to save.');
                return;
            }
            setUser(data);
            // Update username in auth context if it was somehow changed
            login(data.userId, data.username);
            setSaveOk(true);
            setEditing(false);
            setEditPwd('');
        } catch {
            setSaveError('Could not connect to the server.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <p style={{ padding: '2rem' }}>Loading profile...</p>;
    if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;
    if (!user) return <p style={{ padding: '2rem' }}>User not found.</p>;

    return (
        <div className={styles.page}>

            {/* Profile header */}
            <div className={styles.profileHeader}>
                <div className={styles.avatar}>
                    {user.username?.[0]?.toUpperCase() || '?'}
                </div>

                <div className={styles.userInfo}>
                    <h1 className={styles.username}>{user.username}</h1>
                    {isOwnProfile && <p className={styles.email}>{user.email}</p>}
                    <p className={styles.about}>{user.aboutMe || 'No bio yet.'}</p>

                    {isOwnProfile && (
                        <button className="button button-secondary" onClick={() => setEditing(v => !v)}>
                            {editing ? 'Cancel' : 'Edit Profile'}
                        </button>
                    )}
                </div>
            </div>

            {/* Edit form */}
            {editing && isOwnProfile && (
                <form onSubmit={handleSave} className={styles.editForm}>
                    <h2>Edit Profile</h2>

                    <div className={styles.formGroup}>
                        <label>Email</label>
                        <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                    </div>

                    <div className={styles.formGroup}>
                        <label>About Me</label>
                        <textarea
                            value={editAbout}
                            onChange={e => setEditAbout(e.target.value)}
                            rows={3}
                            placeholder="Tell other players about yourself..."
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>New Password <span className={styles.optional}>(leave blank to keep current)</span></label>
                        <input
                            type="password"
                            value={editPwd}
                            onChange={e => setEditPwd(e.target.value)}
                            placeholder="New password..."
                            autoComplete="new-password"
                        />
                    </div>

                    {saveError && <p className={styles.error}>{saveError}</p>}
                    {saveOk && <p className={styles.success}>Profile updated!</p>}

                    <button type="submit" className="button button-secondary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            )}

            {/* Stats */}
            <section className={styles.section}>
                <h2>Stats</h2>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{user.eloRating ?? 1000}</span>
                        <span className={styles.statLabel}>Elo Rating</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{user.recentGames?.length ?? 0}</span>
                        <span className={styles.statLabel}>Games Played</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>
                            {user.eloRating != null && user.eloRatingLastWeek != null
                                ? (user.eloRating - user.eloRatingLastWeek > 0 ? '+' : '')
                                + (user.eloRating - user.eloRatingLastWeek)
                                : '-'}
                        </span>
                        <span className={styles.statLabel}>Elo change (week)</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{user.trophies?.length ?? 0}</span>
                        <span className={styles.statLabel}>Trophies</span>
                    </div>
                </div>
            </section>

            {/* Trophies */}
            {user.trophies && user.trophies.length > 0 && (
                <section className={styles.section}>
                    <h2>Trophies</h2>
                    <div className={styles.trophyList}>
                        {user.trophies.map((t, i) => (
                            <div key={i} className={styles.trophy}>
                                <img
                                    src={`http://localhost:9000/uploads/${t.trophyId?.imageFilename}`}
                                    alt={t.trophyId?.title}
                                    className={styles.trophyImg}
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                                <span className={styles.trophyTitle}>{t.trophyId?.title}</span>
                                <span className={styles.trophyDate}>
                                    {new Date(t.awardedAt).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Recent Games */}
            <section className={styles.section}>
                <h2>Recent Games</h2>
                {!user.recentGames || user.recentGames.length === 0 ? (
                    <p className={styles.empty}>No games played yet.</p>
                ) : (
                    <div className={styles.gamesList}>
                        {user.recentGames.map((game, i) => (
                            <Link
                                key={i}
                                to={`/games/${game._id || game}`}
                                className={styles.gameLink}
                            >
                                Game {String(game._id || game).slice(-6)}
                            </Link>
                        ))}
                    </div>
                )}
            </section>

        </div>
    );
}

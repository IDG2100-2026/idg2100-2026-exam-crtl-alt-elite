import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { useAuth } from "../../hooks/useAuth.js";
import { userApi } from "../../api/api.js";
import styles from '../Profile/ProfilePage.module.css';

const GAMES_PER_PAGE = 5;

export default function ProfilePage() {
    const { id } = useParams();
    const { user: currentUser, login } = useAuth();

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

    // Avatar upload state
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState(null);
    const fileInputRef = useRef(null);

    // Recent games pagination
    const [gamesShown, setGamesShown] = useState(GAMES_PER_PAGE);

    useEffect(() => {
        async function fetchUser() {
            try {
                setLoading(true);
                const data = await userApi.getById(resolvedId);
                setUser(data);
                setEditEmail(data.email || '');
                setEditAbout(data.aboutMe || '');
            } catch (err) {
                setError(err.message || 'Could not connect to the server.');
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
            const data = await userApi.update(resolvedId, updates);
            setUser(data);
            login(data.userId, data.username);
            setSaveOk(true);
            setEditing(false);
            setEditPwd('');
        } catch (err) {
            setSaveError(err.message || 'Could not connect to the server.');
        } finally {
            setSaving(false);
        }
    }

    async function handleAvatarChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        setAvatarUploading(true);
        setAvatarError(null);

        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const data = await userApi.uploadAvatar(resolvedId, formData);
            setUser(prev => ({ ...prev, avatar: data.avatar }));
        } catch (err) {
            setAvatarError(err.message || 'Failed to upload avatar.');
        } finally {
            setAvatarUploading(false);
        }
    }

    if (loading) return <p style={{ padding: '2rem' }}>Loading profile...</p>;
    if (error) return <p style={{ padding: '2rem', color: 'red' }}>{error}</p>;
    if (!user) return <p style={{ padding: '2rem' }}>User not found.</p>;

    const eloChange = user.eloRating != null && user.eloRatingLastWeek != null
        ? user.eloRating - user.eloRatingLastWeek
        : null;

    const visibleGames = (user.recentGames || []).slice(0, gamesShown);

    return (
        <div className={styles.page}>

            {/* Profile header */}
            <div className={styles.profileHeader}>
                <div className={styles.avatarWrapper}>
                    {user.avatar ? (
                        <img
                            src={`http://localhost:9000/${user.avatar}`}
                            alt={user.username}
                            className={styles.avatarImg}
                        />
                    ) : (
                        <div className={styles.avatar}>
                            {user.username?.[0]?.toUpperCase() || '?'}
                        </div>
                    )}
                    {isOwnProfile && (
                        <>
                            <button
                                className={styles.avatarEditBtn}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={avatarUploading}
                                title="Change avatar"
                            >
                                {avatarUploading ? '...' : '✎'}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleAvatarChange}
                            />
                        </>
                    )}
                    {avatarError && <p className={styles.error}>{avatarError}</p>}
                </div>

                <div className={styles.userInfo}>
                    <h1 className={styles.username}>{user.username}</h1>
                    {isOwnProfile && <p className={styles.email}>{user.email}</p>}
                    <p className={styles.about}>{user.aboutMe || 'No bio yet.'}</p>
                    {isOwnProfile && (
                        <div className={styles.pointsBadge}>
                            {user.points ?? 0} pts
                        </div>
                    )}
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
                        <span className={`${styles.statValue} ${eloChange > 0 ? styles.positive : eloChange < 0 ? styles.negative : ''}`}>
                            {eloChange != null ? (eloChange > 0 ? `+${eloChange}` : eloChange) : '-'}
                        </span>
                        <span className={styles.statLabel}>Elo change (week)</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{user.trophies?.length ?? 0}</span>
                        <span className={styles.statLabel}>Trophies</span>
                    </div>
                    {isOwnProfile && (
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{user.points ?? 0}</span>
                            <span className={styles.statLabel}>Points</span>
                        </div>
                    )}
                </div>
            </section>

            {/* Last 30 days */}
            <section className={styles.section}>
                <h2>Last 30 days</h2>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <span className={`${styles.statValue} ${styles.positive}`}>{user.winsLastMonth ?? 0}</span>
                        <span className={styles.statLabel}>Wins</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={`${styles.statValue} ${styles.negative}`}>{user.lossesLastMonth ?? 0}</span>
                        <span className={styles.statLabel}>Losses</span>
                    </div>
                    <div className={styles.statCard}>
                        <span className={styles.statValue}>{user.drawsLastMonth ?? 0}</span>
                        <span className={styles.statLabel}>Draws</span>
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
                {visibleGames.length === 0 ? (
                    <p className={styles.empty}>No games played yet.</p>
                ) : (
                    <>
                        <div className={styles.gamesList}>
                            {visibleGames.map((game, i) => (
                                <Link
                                    key={i}
                                    to={`/games/${game.gameId || game._id || game}`}
                                    className={styles.gameLink}
                                >
                                    <span>Game #{game.gameId || String(game._id || game).slice(-6)}</span>
                                    <span className={styles.gameStatus}>{game.status || ''}</span>
                                </Link>
                            ))}
                        </div>
                        {gamesShown < (user.recentGames?.length || 0) && (
                            <button
                                className={`button button-secondary ${styles.loadMore}`}
                                onClick={() => setGamesShown(n => n + GAMES_PER_PAGE)}
                            >
                                Load more
                            </button>
                        )}
                    </>
                )}
            </section>

        </div>
    );
}

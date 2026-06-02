import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { userApi } from '../../api/api.js';
import styles from './AdminUsers.module.css';

const PAGE_SIZE = 20;

export default function AdminUsers() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await userApi.getAll({ page, limit: PAGE_SIZE, search: search || undefined });
            setUsers(data.users || []);
            setTotal(data.total || 0);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    function handleSearch(e) {
        e.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    }

    async function handleBan(userId) {
        setActionError(null);
        try {
            await userApi.ban(userId);
            setUsers(prev => prev.map(u => u.userId === userId ? { ...u, isBanned: true } : u));
        } catch (err) {
            setActionError(err.message);
        }
    }

    async function handleUnban(userId) {
        setActionError(null);
        try {
            await userApi.unban(userId);
            setUsers(prev => prev.map(u => u.userId === userId ? { ...u, isBanned: false } : u));
        } catch (err) {
            setActionError(err.message);
        }
    }

    async function handleMakeAdmin(userId) {
        setActionError(null);
        try {
            await userApi.makeAdmin(userId);
            setUsers(prev => prev.map(u => u.userId === userId ? { ...u, role: 'admin' } : u));
        } catch (err) {
            setActionError(err.message);
        }
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div>
            <h1 className={styles.title}>User Administration</h1>

            <form className={styles.searchBar} onSubmit={handleSearch}>
                <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="Search by username or email..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                />
                <button className={styles.searchBtn} type="submit">Search</button>
                {search && (
                    <button className={styles.clearBtn} type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}>
                        Clear
                    </button>
                )}
            </form>

            {actionError && <p className={styles.error}>{actionError}</p>}

            {loading ? (
                <p className={styles.status}>Loading...</p>
            ) : error ? (
                <p className={styles.error}>{error}</p>
            ) : (
                <>
                    <p className={styles.count}>{total} user{total !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}</p>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Points</th>
                                    <th>ELO</th>
                                    <th>Banned</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.userId} className={u.isBanned ? styles.bannedRow : ''}>
                                        <td className={styles.mono}>{u.userId}</td>
                                        <td className={styles.username}>{u.username}</td>
                                        <td className={styles.email}>{u.email}</td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${styles[u.role]}`}>{u.role}</span>
                                        </td>
                                        <td>{u.points}</td>
                                        <td>{u.eloRating}</td>
                                        <td>{u.isBanned ? <span className={styles.bannedTag}>Banned</span> : '—'}</td>
                                        <td className={styles.actions}>
                                            {!u.isBanned && u.userId !== currentUser?.userId && (
                                                <button className={styles.btnDanger} onClick={() => handleBan(u.userId)}>
                                                    Ban
                                                </button>
                                            )}
                                            {u.isBanned && (
                                                <button className={styles.btnSuccess} onClick={() => handleUnban(u.userId)}>
                                                    Unban
                                                </button>
                                            )}
                                            {u.role !== 'admin' && u.userId !== currentUser?.userId && (
                                                <button className={styles.btnNeutral} onClick={() => handleMakeAdmin(u.userId)}>
                                                    Make Admin
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
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

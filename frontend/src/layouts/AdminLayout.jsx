import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router';
import { useAuth } from '../hooks/useAuth.js';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            navigate('/', { replace: true });
        }
    }, [user, loading, navigate]);

    if (loading || !user || user.role !== 'admin') return null;

    return (
        <div className={styles.layout}>
            <header className={styles.header}>
                <Link to="/" className={styles.logo}>DicePoker Admin</Link>
                <nav className={styles.nav}>
                    <NavLink to="/admin" end className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
                        Dashboard
                    </NavLink>
                    <NavLink to="/admin/users" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
                        Users
                    </NavLink>
                    <NavLink to="/admin/comments" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
                        Comments
                    </NavLink>
                </nav>
                <Link to="/" className={styles.backLink}>Back to site</Link>
            </header>
            <main className={styles.content}>
                <Outlet />
            </main>
        </div>
    );
}

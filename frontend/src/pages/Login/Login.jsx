import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";
import styles from "./Login.module.css";

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const [emailOrUsername, setEmailOrUsername] = useState("");
    const [pwd, setPwd] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const from = location.state?.from?.pathname || "/";

    const message = location.state?.message || null;

    async function handleSubmit(e) {
        e.preventDefault();

        if (!emailOrUsername.trim() || !pwd.trim()) {
            setError("Please fill in all fields.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await login(emailOrUsername.trim(), pwd);
            navigate(from, { replace: true });

        } catch (err) {
            setError(err.message || "Login failed.");
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Log In</h1>
                <p className={styles.sub}>Welcome back to Spanish Poker Dice.</p>

                {message && <p className={styles.message}>{message}</p>}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="emailOrUsername">Email or username</label>
                        <input
                            id="emailOrUsername"
                            type="text"
                            value={emailOrUsername}
                            onChange={e => setEmailOrUsername(e.target.value)}
                            placeholder="your_username or email@example.com"
                            autoComplete="username"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="pwd">Password</label>
                        <input
                            id="pwd"
                            type="password"
                            value={pwd}
                            onChange={e => setPwd(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit" className="button button-secondary" disabled={submitting}>
                        {submitting ? "Logging in..." : "Log In"}
                    </button>
                </form>

                <p className={styles.switchLink}>
                    Don&apos;t have an account? <Link to="/register">Register here</Link>
                </p>
            </div>
        </div>
    );
}

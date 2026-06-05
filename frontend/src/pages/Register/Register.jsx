import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { authApi } from "../../api/api.js";
import styles from "./Register.module.css";

export default function Register() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [pwd, setPwd] = useState("");
    const [age, setAge] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();

        if (!username.trim() || !email.trim() || !pwd.trim() || !age) {
            setError("Please fill in all fields.");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await authApi.register({
                username: username.trim(),
                email: email.trim(),
                pwd,
                age: Number(age)
            });

            navigate("/login", {
                state: { message: "Registration successful! Please check your email to verify your account before logging in." }
            });

        } catch (err) {
            setError(err.message || "Registration failed.");
            setSubmitting(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Create Account</h1>
                <p className={styles.sub}>Join the Spanish Poker Dice platform.</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="your_username"
                            autoComplete="username"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="email@example.com"
                            autoComplete="email"
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
                            autoComplete="new-password"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="age">Age</label>
                        <input
                            id="age"
                            type="number"
                            value={age}
                            onChange={e => setAge(e.target.value)}
                            placeholder="18"
                            min="18"
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit" className="button button-secondary" disabled={submitting}>
                        {submitting ? "Registering..." : "Create Account"}
                    </button>
                </form>

                <p className={styles.switchLink}>
                    Already have an account? <Link to="/login">Log in here</Link>
                </p>
            </div>
        </div>
    );
}

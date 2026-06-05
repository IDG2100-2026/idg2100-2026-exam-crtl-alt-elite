import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { authApi } from "../../api/api.js";
import styles from "./VerifyEmail.module.css";

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("verifying");
    const [message, setMessage] = useState("");
    const [resendEmail, setResendEmail] = useState("");
    const [resendStatus, setResendStatus] = useState(null);

    const token = searchParams.get("token");

    useEffect(() => {
        async function verify() {
            if (!token) {
                setStatus("error");
                setMessage("No verification token found. Please check your email link.");
                return;
            }

            try {
                const data = await authApi.verifyEmail(token);
                setStatus("success");
                setMessage(data.msg || "Email verified successfully! You can now log in.");
            } catch (err) {
                setStatus("error");
                setMessage(err.message || "Verification failed. The link may be invalid or expired.");
            }
        }

        verify();
    }, [token]);

    async function handleResend(e) {
        e.preventDefault();

        if (!resendEmail.trim()) return;

        try {
            await authApi.resendVerification(resendEmail.trim());
            setResendStatus("A new verification email has been sent if that address exists and is unverified.");
        } catch (err) {
            setResendStatus(err.message || "Failed to resend verification email.");
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>Email Verification</h1>

                {status === "verifying" && (
                    <p className={styles.message}>Verifying your email...</p>
                )}

                {status === "success" && (
                    <>
                        <p className={styles.success}>{message}</p>
                        <Link to="/login" className="button button-secondary">
                            Go to Login
                        </Link>
                    </>
                )}

                {status === "error" && (
                    <>
                        <p className={styles.error}>{message}</p>

                        <div className={styles.resend}>
                            <p>Need a new verification link?</p>
                            <form onSubmit={handleResend} className={styles.form}>
                                <input
                                    type="email"
                                    value={resendEmail}
                                    onChange={e => setResendEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    autoComplete="email"
                                />
                                <button type="submit" className="button button-secondary">
                                    Resend Verification Email
                                </button>
                            </form>
                            {resendStatus && (
                                <p className={styles.message}>{resendStatus}</p>
                            )}
                        </div>
                    </>
                )}

                <p className={styles.switchLink}>
                    <Link to="/login">Back to Login</Link>
                </p>
            </div>
        </div>
    );
}

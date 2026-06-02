import { useNavigate } from 'react-router';
import styles from './LoginPrompt.module.css';

export default function LoginPrompt({ message = 'You need to be logged in to do this.', onClose, from }) {
    const navigate = useNavigate();

    function goToLogin() {
        navigate('/login', { state: { from } });
    }

    function goToRegister() {
        navigate('/register', { state: { from } });
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.close} onClick={onClose}>✕</button>
                <h3 className={styles.title}>Login required</h3>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <button className="button button-secondary" onClick={goToLogin}>
                        Log in
                    </button>
                    <button className={styles.registerLink} onClick={goToRegister}>
                        Register
                    </button>
                </div>
            </div>
        </div>
    );
}

import { Link } from "react-router";
import styles from "./Footer.module.css";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.links}>
                <Link to="/about">About us</Link>
                <Link to="/privacy">Privacy policy</Link>
                <Link to="/terms">Terms & Conditions</Link>
            </div>
            <p className={styles.copyright}>© Spanish Poker Dice 2026</p>
        </footer>
    );
}

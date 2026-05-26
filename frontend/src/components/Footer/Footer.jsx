import { Link } from "react-router";
import Styles from "./Footer.module.css";

export default function Footer() {
    return(
        <footer>
            <div className={Styles["container"]}>
                <div className={Styles["links"]}>
                    <Link to="/about">About us</Link>
                    <Link to="/privacy">Privacy policy</Link>
                    <Link to="/terms">Terms & Conditions</Link>
                </div>
            <p className={Styles.footer}>© Spanish Poker Dice 2026</p>
            </div>
        </footer>
    );
}
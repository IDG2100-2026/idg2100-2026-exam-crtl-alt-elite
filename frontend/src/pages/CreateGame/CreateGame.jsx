// Reused on code from Nora Storro (Fullstack assignment 3)
import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useFetch } from "../../hooks/useFetch.js";
import { gameApi, variantApi } from "../../api/api.js";
import { useAuth } from "../../hooks/useAuth.js";
import styles from "./CreateGame.module.css";

// Page for creating a new game room
// Allows selecting all game variant options before creating the room

export default function CreateGame() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Selected variant options
    const [selectedRounds, setSelectedRounds] = useState(null);
    const [selectedStraights, setSelectedStraights] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [selectedNumPlayers, setSelectedNumPlayers] = useState(null);
    const [selectedBuyIn, setSelectedBuyIn] = useState(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch all variants to get the available options
    const { data: variants } = useFetch(() => variantApi.getAll());

    // Get unique sorted options from variants
    const roundOptions = [...new Set(variants?.map(v => v.rounds) ?? [])].sort((a, b) => a - b);
    const timeOptions = [...new Set(variants?.map(v => v.timeControl) ?? [])].sort((a, b) => a - b);
    const numPlayersOptions = [...new Set(variants?.map(v => v.numPlayers) ?? [])].sort((a, b) => a - b);
    const buyInOptions = [...new Set(variants?.map(v => v.buyIn) ?? [])].sort((a, b) => a - b);

    // Find the variant that matches all selected options
    // Memoized to avoid recalculating on every render
    // (inspired by: https://www.youtube.com/watch?v=vpE9I_eqHdM&t=592s)
    const selectedVariant = useMemo(() => {
        if (!variants) return null;

        return variants.find(v =>
            v.rounds === selectedRounds &&
            v.straightsAllowed === selectedStraights &&
            v.timeControl === selectedTime &&
            v.numPlayers === selectedNumPlayers &&
            v.buyIn === selectedBuyIn
        );
    }, [variants, selectedRounds, selectedStraights, selectedTime, selectedNumPlayers, selectedBuyIn]);

    const isFormComplete =
        selectedRounds !== null &&
        selectedStraights !== null &&
        selectedTime !== null &&
        selectedNumPlayers !== null &&
        selectedBuyIn !== null;

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError(null);

        if (!user) {
            setError("You must be logged in to create a game.");
            return;
        }

        if (!selectedVariant) {
            setError("Please select all game options.");
            return;
        }

        setLoading(true);

        try {
            // createRoom only needs variantId - identity comes from the JWT token
            const result = await gameApi.createRoom(selectedVariant._id);

            // Navigate to the game room after creating it
            navigate(`/games/${result.game.gameId}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedVariant, user, navigate]);

    return (
        <div className={styles.createGameContainer}>
            <div className={styles.container}>
                <h1 className={styles.title}>Create Game</h1>
                <p className={styles.subtitle}>Choose your game settings and create a room</p>

                <form onSubmit={handleSubmit} className={styles.form}>

                    {/* Rounds selector */}
                    <div className={styles.section}>
                        <div className={styles.label}>Number of rounds</div>
                        <div className={styles.toggleGroup}>
                            {roundOptions.map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    className={`${styles.toggleBtn} ${selectedRounds === r ? styles.toggleBtnActive : ""}`}
                                    onClick={() => setSelectedRounds(r)}
                                >
                                    Best of {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Straights selector */}
                    <div className={styles.section}>
                        <div className={styles.label}>Straights</div>
                        <div className={styles.toggleGroup}>
                            <button
                                type="button"
                                className={`${styles.toggleBtn} ${selectedStraights === true ? styles.toggleBtnActive : ""}`}
                                onClick={() => setSelectedStraights(true)}
                            >
                                Allowed
                            </button>
                            <button
                                type="button"
                                className={`${styles.toggleBtn} ${selectedStraights === false ? styles.toggleBtnActive : ""}`}
                                onClick={() => setSelectedStraights(false)}
                            >
                                Not allowed
                            </button>
                        </div>
                    </div>

                    {/* Time control selector */}
                    <div className={styles.section}>
                        <div className={styles.label}>Total time (seconds)</div>
                        <div className={styles.toggleGroup}>
                            {timeOptions.map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`${styles.toggleBtn} ${selectedTime === t ? styles.toggleBtnActive : ""}`}
                                    onClick={() => setSelectedTime(t)}
                                >
                                    {t}s
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Number of players selector */}
                    <div className={styles.section}>
                        <div className={styles.label}>Number of players</div>
                        <div className={styles.toggleGroup}>
                            {numPlayersOptions.map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    className={`${styles.toggleBtn} ${selectedNumPlayers === n ? styles.toggleBtnActive : ""}`}
                                    onClick={() => setSelectedNumPlayers(n)}
                                >
                                    {n} players
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Buy-in selector */}
                    <div className={styles.section}>
                        <div className={styles.label}>Buy-in (points)</div>
                        <div className={styles.toggleGroup}>
                            {buyInOptions.map(b => (
                                <button
                                    key={b}
                                    type="button"
                                    className={`${styles.toggleBtn} ${selectedBuyIn === b ? styles.toggleBtnActive : ""}`}
                                    onClick={() => setSelectedBuyIn(b)}
                                >
                                    {b} pts
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <p className={styles.error} role="alert">{error}</p>}

                    <button
                        type="submit"
                        className={`${styles.submitBtn} button`}
                        disabled={!isFormComplete || loading}
                    >
                        {loading ? "Creating room..." : "Create Room"}
                    </button>

                </form>
            </div>
        </div>
    );
}
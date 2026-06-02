import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { getSocket } from '../../api/socket.js';
import '../Dice/dice-poker-die.js';
import styles from './GameBoard.module.css';

const ROLLS_PER_TURN = 3;

function handName(dice) {
    if (!dice || dice.length !== 5) return '?';
    const counts = {};
    for (const d of dice) counts[d] = (counts[d] || 0) + 1;
    const vals = Object.values(counts).sort((a, b) => b - a);
    const sorted = [...dice].sort((a, b) => a - b);
    if (vals[0] === 5) return 'Five of a kind';
    if (vals[0] === 4) return 'Four of a kind';
    if (vals[0] === 3 && vals[1] === 2) return 'Full house';
    if (sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1)) return 'Straight';
    if (vals[0] === 3) return 'Three of a kind';
    if (vals[0] === 2 && vals[1] === 2) return 'Two pair';
    if (vals[0] === 2) return 'One pair';
    return 'High card';
}

function Die({ face, held, disabled, onClick }) {
    return (
        <dice-poker-die
            face={face || '1'}
            {...(held ? { held: '' } : {})}
            {...(disabled ? { disabled: '' } : {})}
            onClick={disabled ? undefined : onClick}
            style={{ cursor: disabled ? 'default' : 'pointer' }}
        />
    );
}

export default function GameBoard({ game }) {
    const { user } = useAuth();
    const socket = getSocket();
    const gameId = game.gameId;
    const myUserId = user?.userId;
    const isPlayer = game.players?.some(p => p.userId === myUserId);

    // Ref to always have the latest myUserId inside socket handlers
    // Prevents stale closure problem where handlers capture undefined userId
    const myUserIdRef = useRef(myUserId);
    useEffect(() => {
        myUserIdRef.current = myUserId;
    }, [myUserId]);

    // Turn / rolling state
    const [myRolls, setMyRolls] = useState([]);
    const [myHolds, setMyHolds] = useState([]);
    const [myLockedRolls, setMyLockedRolls] = useState([]); // after my turn ends, show locked dice
    const [currentTurnUserId, setCurrentTurnUserId] = useState(game.currentTurnUserId || null);
    const [rollsUsed, setRollsUsed] = useState(game.rollsUsed || 0);
    const [turnExpiresAt, setTurnExpiresAt] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(0);

    // Round / game state
    const [phase, setPhase] = useState(game.currentPhase || 'rolling');
    const [roundNumber, setRoundNumber] = useState(game.currentRound || 1);
    const [pot, setPot] = useState(game.pot || 0);
    const [betActions, setBetActions] = useState([]);
    const [revealData, setRevealData] = useState(null);
    const [roundWinners, setRoundWinners] = useState([]);
    const [gameOver, setGameOver] = useState(false);
    const [gameResult, setGameResult] = useState(null);

    // Betting state
    const [betAmount, setBetAmount] = useState('');
    const [betError, setBetError] = useState(null);
    const [socketError, setSocketError] = useState(null);
    const [myCurrentBet, setMyCurrentBet] = useState(0);
    const [myPoints, setMyPoints] = useState(() => game.players?.find(p => p.userId === myUserId)?.points || 0);
    const [highestBet, setHighestBet] = useState(0);
    const [myFolded, setMyFolded] = useState(false);

    // Round wins tracked for the monitor (doesn't trigger re-renders)
    const roundWinsRef = useRef({ player1: 0, player2: 0 });

    const isMyTurn = currentTurnUserId === myUserId && phase === 'rolling';
    // Only count rolls when it's actually my turn — ignore rollsUsed from other players' turns
    const myRollsUsed = isMyTurn ? rollsUsed : 0;
    const canRoll = isMyTurn && myRollsUsed < ROLLS_PER_TURN;

    // Countdown timer
    useEffect(() => {
        if (!turnExpiresAt) return;
        const tick = () => {
            const left = Math.max(0, Math.ceil((turnExpiresAt - Date.now()) / 1000));
            setSecondsLeft(left);
        };
        tick();
        const interval = setInterval(tick, 500);
        return () => clearInterval(interval);
    }, [turnExpiresAt]);

    // Join the game's socket room
    useEffect(() => {
        if (!socket || !gameId) return;
        socket.emit('join_game', gameId);
    }, [socket, gameId]);

    // Socket event listeners
    // myUserId is NOT in the dependency array - we use myUserIdRef instead
    // to avoid stale closures when user loads after component mounts
    useEffect(() => {
        if (!socket) return;

        function onGameState(data) {
            setPhase(data.currentPhase || 'rolling');
            setRoundNumber(data.currentRound || 1);
            setPot(data.pot || 0);
            setCurrentTurnUserId(data.currentTurnUserId || null);
            setRollsUsed(data.rollsUsed || 0);
            // Use ref to get latest userId
            const me = data.players?.find(p => p.userId === myUserIdRef.current);
            if (me) {
                setMyPoints(me.points);
                setMyCurrentBet(me.currentBet || 0);
            }
            // Seed the monitor with current game state on join/reconnect
            if (data.currentRound > 0) {
                document.dispatchEvent(new CustomEvent('dp:round-start', { detail: { round: data.currentRound } }));
                if (data.currentTurnUserId) {
                    const tidx = data.players?.findIndex(p => p.userId === data.currentTurnUserId);
                    const tkey = tidx === 0 ? 'player1' : 'player2';
                    document.dispatchEvent(new CustomEvent('dp:turn-changed', { detail: { player: tkey, remainingRolls: ROLLS_PER_TURN - (data.rollsUsed || 0) } }));
                }
            }
        }

        function onRollResult({ roundNumber, rolls, holds, rollsUsed: used }) {
            setRoundNumber(roundNumber);
            setMyRolls(rolls);
            setMyHolds(holds || []);
            setRollsUsed(used);
            const myIdx = game.players?.findIndex(p => p.userId === myUserId);
            const myKey = myIdx === 0 ? 'player1' : 'player2';
            const heldBools = Array.from({ length: 5 }, (_, i) => (holds || []).includes(i));
            document.dispatchEvent(new CustomEvent('dp:roll-executed', { detail: { player: myKey, faces: rolls, held: heldBools } }));
        }

        function onMyRollsLocked({ rolls, holds }) {
            setMyLockedRolls(rolls);
            setMyHolds(holds || []);
            setMyRolls([]);
        }

        function onTurnUpdate({ currentTurnUserId: tid, rollsUsed: used, roundNumber: rn, expiresAt }) {
            // If the turn just moved away from me, lock my current dice
            // Use ref to get latest userId to avoid stale closure
            setCurrentTurnUserId(prev => {
                if (prev === myUserIdRef.current && tid !== myUserIdRef.current) {
                    setMyRolls(currentDice => {
                        if (currentDice.length > 0) setMyLockedRolls(currentDice);
                        return [];
                    });
                }
                return tid;
            });
            setRollsUsed(used);
            setRoundNumber(rn);
            // Only update the countdown when it's my turn — prevents re-renders on waiting player
            if (expiresAt && tid === myUserId) setTurnExpiresAt(expiresAt);
            if (tid) {
                const tidx = game.players?.findIndex(p => p.userId === tid);
                const tkey = tidx === 0 ? 'player1' : 'player2';
                document.dispatchEvent(new CustomEvent('dp:turn-changed', { detail: { player: tkey, remainingRolls: ROLLS_PER_TURN - used } }));
            }
        }

        function onRoundStart({ roundNumber: rn, currentTurnUserId: tid, expiresAt, players }) {
            setRoundNumber(rn);
            setCurrentTurnUserId(tid);
            setRollsUsed(0);
            setPhase('rolling');
            setMyRolls([]);
            setMyHolds([]);
            setMyLockedRolls([]);
            setRevealData(null);
            setRoundWinners([]);
            setBetActions([]);
            setMyFolded(false);
            setMyCurrentBet(0);
            setHighestBet(0);
            if (expiresAt) setTurnExpiresAt(expiresAt);

            // Sync points from backend to avoid frontend drift
            // Use ref to get latest userId
            if (players) {
                const me = players.find(p => p.userId === myUserIdRef.current);
                if (me) setMyPoints(me.points);
            }
            document.dispatchEvent(new CustomEvent('dp:round-start', { detail: { round: rn } }));
            const tidx = game.players?.findIndex(p => p.userId === tid);
            const tkey = tidx === 0 ? 'player1' : 'player2';
            document.dispatchEvent(new CustomEvent('dp:turn-changed', { detail: { player: tkey, remainingRolls: ROLLS_PER_TURN } }));
        }

        function onPhaseChange({ phase: p }) {
            setPhase(p);
            if (p === 'betting') {
                setCurrentTurnUserId(null);
                setTurnExpiresAt(null);
                // Last player to roll: their dice are in myRolls but not yet in myLockedRolls
                setMyRolls(current => {
                    if (current.length > 0) setMyLockedRolls(current);
                    return [];
                });
            }
        }

        function onBetUpdate({ userId, action, amount, pot: newPot }) {
            setPot(newPot);
            setBetActions(prev => [...prev, { userId, action, amount }]);
            setHighestBet(prev => Math.max(prev, amount || 0));
            if (userId === myUserIdRef.current) {
                if (action === 'fold') setMyFolded(true);
                else {
                    setMyCurrentBet(amount);
                }
            }
        }

        function onRoundEnd({ roundNumber: rn, reveal, roundWinners: winners, pot: split }) {
            setPhase('reveal');
            setRoundNumber(rn);
            setRevealData(reveal);
            setRoundWinners(winners);
            setPot(split);
            // Update round wins and dispatch to monitor
            const wins = roundWinsRef.current;
            for (const uid of winners) {
                const idx = game.players?.findIndex(p => p.userId === uid);
                const key = idx === 0 ? 'player1' : 'player2';
                if (key) wins[key] = (wins[key] || 0) + 1;
            }
            const hands = {};
            for (const p of reveal || []) {
                const idx = game.players?.findIndex(pl => pl.userId === p.userId);
                const key = idx === 0 ? 'player1' : 'player2';
                if (key && p.rolls?.length > 0) hands[key] = { handType: p.folded ? 'Folded' : handName(p.rolls) };
            }
            const winKey = (() => { const i = game.players?.findIndex(p => p.userId === winners[0]); return i === 0 ? 'player1' : 'player2'; })();
            document.dispatchEvent(new CustomEvent('dp:round-decided', { detail: { winner: winKey, hands } }));
            document.dispatchEvent(new CustomEvent('dp:turn-changed', { detail: { player: '', remainingRolls: 0 } }));
        }

        function onGameEnd({ winnerId, players }) {
            setGameOver(true);
            setGameResult({ winnerId, players });
            setPhase('finished');
            const idx = game.players?.findIndex(p => p.userId === winnerId[0]);
            const champKey = idx === 0 ? 'player1' : 'player2';
            document.dispatchEvent(new CustomEvent('dp:match-decided', {
                detail: { champion: champKey, scoreline: { ...roundWinsRef.current } }
            }));
        }

        function onError({ msg }) {
            setSocketError(msg);
            setTimeout(() => setSocketError(null), 4000);
        }

        socket.on('error', onError);
        socket.on('game_state', onGameState);
        socket.on('roll_result', onRollResult);
        socket.on('my_rolls_locked', onMyRollsLocked);
        socket.on('turn_update', onTurnUpdate);
        socket.on('round_start', onRoundStart);
        socket.on('phase_change', onPhaseChange);
        socket.on('bet_update', onBetUpdate);
        socket.on('round_end', onRoundEnd);
        socket.on('game_end', onGameEnd);

        return () => {
            socket.off('error', onError);
            socket.off('game_state', onGameState);
            socket.off('roll_result', onRollResult);
            socket.off('my_rolls_locked', onMyRollsLocked);
            socket.off('turn_update', onTurnUpdate);
            socket.off('round_start', onRoundStart);
            socket.off('phase_change', onPhaseChange);
            socket.off('bet_update', onBetUpdate);
            socket.off('round_end', onRoundEnd);
            socket.off('game_end', onGameEnd);
        };
    }, [socket]); // myUserId removed - handled via ref

    function toggleHold(index) {
        if (!isMyTurn || rollsUsed === 0) return;
        setMyHolds(prev =>
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    }

    function roll() {
        if (!canRoll) return;
        socket.emit('roll_dice', { gameId, holds: myHolds });
    }

    function placeBet(action) {
        setBetError(null);
        const amount = action === 'fold' ? 0 : parseInt(betAmount);
        if ((action === 'bet' || action === 'raise') && (!amount || amount <= 0)) {
            setBetError('Enter a valid amount.');
            return;
        }
        socket.emit('place_bet', { gameId, action, amount: amount || 0 });
        setBetAmount('');
    }

    const getUsername = useCallback((userId) => {
        return game.players?.find(p => p.userId === userId)?.username || `Player ${userId}`;
    }, [game.players]);

    if (gameOver && gameResult) {
        const winners = gameResult.winnerId.map(id => getUsername(id)).join(', ');
        return (
            <div className={styles.board}>
                <div className={styles.gameOver}>
                    <h2>Game Over</h2>
                    <p className={styles.winner}>{winners} wins!</p>
                    <div className={styles.finalScores}>
                        {gameResult.players.map(p => (
                            <div key={p.userId} className={styles.finalScore}>
                                <span>{getUsername(p.userId)}</span>
                                <span>{p.finalPoints} pts</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const opponentName = currentTurnUserId ? getUsername(currentTurnUserId) : null;

    return (
        <div className={styles.board}>

            {socketError && (
                <div className={styles.socketError}>{socketError}</div>
            )}

            {/* Header: round, pot, phase, my points */}
            <div className={styles.info}>
                <span>Round {roundNumber}</span>
                <span>Pot: {pot} pts</span>
                <span className={styles.phase}>{phase}</span>
                {isPlayer && (
                    <span className={styles.myPoints}>Your stack: {myPoints} pts</span>
                )}
            </div>

            {/* Rolling phase */}
            {phase === 'rolling' && (
                <>
                    {/* Current player indicator */}
                    <div className={styles.turnBanner}>
                        {isMyTurn ? (
                            <>
                                <span className={styles.yourTurn}>Your turn</span>
                                <span className={styles.rollCount}>Roll {myRollsUsed} of {ROLLS_PER_TURN}</span>
                                {turnExpiresAt && (
                                    <span className={`${styles.countdown} ${secondsLeft <= 5 ? styles.urgent : ''}`}>
                                        {secondsLeft}s
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <span className={styles.waitingTurn}>
                                    {opponentName ? `${opponentName} is rolling` : 'Waiting...'}
                                </span>
                                {rollsUsed > 0 && (
                                    <span className={styles.rollCount}>Roll {rollsUsed} of {ROLLS_PER_TURN}</span>
                                )}
                            </>
                        )}
                    </div>

                    {/* My dice — shown when it is my turn */}
                    {isMyTurn && (
                        <div className={styles.mySection}>
                            <p className={styles.sectionLabel}>
                                {myRolls.length > 0 ? 'Click dice to hold' : 'Your dice'}
                            </p>
                            <div className={styles.dice}>
                                {(myRolls.length > 0 ? myRolls : [7, 7, 7, 7, 7]).map((face, i) => (
                                    <Die
                                        key={i}
                                        face={face}
                                        held={myRolls.length > 0 && myHolds.includes(i)}
                                        disabled={myRolls.length === 0}
                                        onClick={myRolls.length > 0 ? () => toggleHold(i) : undefined}
                                    />
                                ))}
                            </div>
                            <div className={styles.rollActions}>
                                {canRoll && (
                                    <button className={styles.btnRollAgain} onClick={roll}>
                                        {myRollsUsed === 0 ? 'Roll Dice' : `Roll Again (${ROLLS_PER_TURN - myRollsUsed} left)`}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Waiting player — show placeholder dice if not rolled yet, locked dice if done */}
                    {!isMyTurn && isPlayer && (
                        <div className={styles.mySection}>
                            <p className={styles.sectionLabel}>
                                {myLockedRolls.length > 0 ? 'Your dice (locked in)' : 'Your dice'}
                            </p>
                            <div className={styles.dice}>
                                {(myLockedRolls.length > 0 ? myLockedRolls : [7, 7, 7, 7, 7]).map((face, i) => (
                                    <Die
                                        key={i}
                                        face={face}
                                        held={myLockedRolls.length > 0 && myHolds.includes(i)}
                                        disabled
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Betting phase — show own dice but not opponents' */}
            {phase === 'betting' && (
                <>
                    {isPlayer && myLockedRolls.length > 0 && (
                        <div className={styles.mySection}>
                            <p className={styles.sectionLabel}>Your dice</p>
                            <div className={styles.dice}>
                                {myLockedRolls.map((face, i) => (
                                    <Die key={i} face={face} held={myHolds.includes(i)} disabled />
                                ))}
                            </div>
                        </div>
                    )}

                    {isPlayer && !myFolded && (
                        <div className={styles.betting}>
                            <p className={styles.sectionLabel}>
                                Pot: <strong>{pot} pts</strong> · Your bet: <strong>{myCurrentBet} pts</strong> · To match: <strong>{Math.max(0, highestBet - myCurrentBet)} pts</strong>
                            </p>
                            <div className={styles.betActions}>
                                <input
                                    type="number" min="1" value={betAmount}
                                    onChange={e => setBetAmount(e.target.value)}
                                    placeholder="Amount" className={styles.betInput}
                                />
                                <button className={styles.btnBet} onClick={() => placeBet('bet')}>Bet</button>
                                <button className={styles.btnRaise} onClick={() => placeBet('raise')}>Raise</button>
                                <button className={styles.btnMatch} onClick={() => placeBet('match')}>Match</button>
                                <button className={styles.btnFold} onClick={() => placeBet('fold')}>Fold</button>
                            </div>
                            {betError && <p className={styles.betError}>{betError}</p>}
                        </div>
                    )}

                    {myFolded && <p className={styles.folded}>You folded this round.</p>}
                </>
            )}

            {/* Recent bet log */}
            {betActions.length > 0 && (
                <div className={styles.betLog}>
                    {betActions.slice(-4).map((b, i) => (
                        <p key={i} className={styles.betLogItem}>
                            {getUsername(b.userId)}: <strong>{b.action}</strong>{b.amount ? ` ${b.amount} pts` : ''}
                        </p>
                    ))}
                </div>
            )}

            {/* Reveal phase */}
            {phase === 'reveal' && revealData && (
                <div className={styles.reveal}>
                    <p className={styles.sectionLabel}>Round {roundNumber} results</p>
                    {revealData.map(p => (
                        <div key={p.userId} className={`${styles.revealPlayer} ${roundWinners.includes(p.userId) ? styles.roundWinner : ''}`}>
                            <span className={styles.revealName}>
                                {getUsername(p.userId)}{roundWinners.includes(p.userId) ? ' 🏆' : ''}
                            </span>
                            {p.folded ? (
                                <span className={styles.folded}>Folded</span>
                            ) : (
                                <div className={styles.dice}>
                                    {p.rolls.map((face, i) => (
                                        <Die key={i} face={face} held={p.holds?.includes(i)} disabled />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {!isPlayer && <p className={styles.spectator}>You are spectating this game.</p>}
        </div>
    );
}
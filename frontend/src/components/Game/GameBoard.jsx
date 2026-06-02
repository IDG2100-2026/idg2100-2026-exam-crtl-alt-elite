import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { getSocket } from '../../api/socket.js';
import '../Dice/dice-poker-die.js';
import styles from './GameBoard.module.css';

const ROLLS_PER_TURN = 3;

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
    const isPlayerFinal = isPlayer;

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

    // isPlayerFinal: check both the initial game prop AND current userId (handles auth loading delay)
    const isPlayerFinalFinal = isPlayerFinal || (myUserId && game.players?.some(p => p.userId === myUserId));
    const isMyTurn = currentTurnUserId === myUserId && phase === 'rolling';
    // Only count rolls when it's actually my turn — ignore rollsUsed from other players' turns
    const myRollsUsed = isMyTurn ? rollsUsed : 0;
    const canRoll = isMyTurn && myRollsUsed < ROLLS_PER_TURN;
    const canEndTurn = isMyTurn && myRollsUsed >= 1;

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
    useEffect(() => {
        if (!socket) return;

        function onGameState(data) {
            setPhase(data.currentPhase || 'rolling');
            setRoundNumber(data.currentRound || 1);
            setPot(data.pot || 0);
            setCurrentTurnUserId(data.currentTurnUserId || null);
            setRollsUsed(data.rollsUsed || 0);
            const me = data.players?.find(p => p.userId === myUserId);
            if (me) {
                setMyPoints(me.points);
                setMyCurrentBet(me.currentBet || 0);
            }
        }

        function onRollResult({ roundNumber, rolls, holds, rollsUsed: used, rollsTotal }) {
            setRoundNumber(roundNumber);
            setMyRolls(rolls);
            setMyHolds(holds || []);
            setRollsUsed(used);
        }

        function onMyRollsLocked({ rolls, holds }) {
            setMyLockedRolls(rolls);
            setMyHolds(holds || []);
            setMyRolls([]);
        }

        function onTurnUpdate({ currentTurnUserId: tid, rollsUsed: used, roundNumber: rn, expiresAt }) {
            // If the turn just moved away from me, lock my current dice
            setCurrentTurnUserId(prev => {
                if (prev === myUserId && tid !== myUserId) {
                    setMyRolls(currentDice => {
                        if (currentDice.length > 0) setMyLockedRolls(currentDice);
                        return [];
                    });
                }
                return tid;
            });
            setRollsUsed(used);
            setRoundNumber(rn);
            if (expiresAt) setTurnExpiresAt(expiresAt);
        }

        function onRoundStart({ roundNumber: rn, currentTurnUserId: tid, expiresAt }) {
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
            if (userId === myUserId) {
                if (action === 'fold') setMyFolded(true);
                else {
                    setMyCurrentBet(amount);
                    setMyPoints(p => p - (amount || 0));
                }
            }
        }

        function onRoundEnd({ roundNumber: rn, reveal, roundWinners: winners, pot: split }) {
            setPhase('reveal');
            setRevealData(reveal);
            setRoundWinners(winners);
            setPot(split);
        }

        function onGameEnd({ winnerId, players }) {
            setGameOver(true);
            setGameResult({ winnerId, players });
            setPhase('finished');
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
    }, [socket, myUserId]);

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

    function handleEndTurn() {
        if (!canEndTurn) return;
        socket.emit('end_turn', { gameId });
        setMyLockedRolls(myRolls);
        setMyRolls([]);
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
    const iHaveRolled = myLockedRolls.length > 0 || (phase === 'rolling' && myRolls.length > 0 && !isMyTurn);

    return (
        <div className={styles.board}>

            {socketError && (
                <div className={styles.socketError}>{socketError}</div>
            )}

            {/* Header: round, pot, phase */}
            <div className={styles.info}>
                <span>Round {roundNumber}</span>
                <span>Pot: {pot} pts</span>
                <span className={styles.phase}>{phase}</span>
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
                                    <span className={styles.rollCount}>Roll {myRollsUsed} of {ROLLS_PER_TURN}</span>
                                )}
                            </>
                        )}
                    </div>

                    {/* My dice — always shown during rolling phase */}
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
                                {canEndTurn && (
                                    <button className={styles.btnDone} onClick={handleEndTurn}>
                                        Done
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Waiting player — show placeholder dice if not rolled yet, locked dice if done */}
                    {!isMyTurn && isPlayerFinal && (
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
                    {isPlayerFinal && myLockedRolls.length > 0 && (
                        <div className={styles.mySection}>
                            <p className={styles.sectionLabel}>Your dice</p>
                            <div className={styles.dice}>
                                {myLockedRolls.map((face, i) => (
                                    <Die key={i} face={face} held={myHolds.includes(i)} disabled />
                                ))}
                            </div>
                        </div>
                    )}

                    {isPlayerFinal && !myFolded && (
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

            {!isPlayerFinal && <p className={styles.spectator}>You are spectating this game.</p>}
        </div>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { getSocket } from '../../api/socket.js';
import '../Dice/dice-poker-die.js';
import styles from './GameBoard.module.css';

function Die({ face, held, disabled, onClick }) {
    return (
        <dice-poker-die
            face={face || '7'}
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

    const [myRolls, setMyRolls] = useState([]);
    const [myHolds, setMyHolds] = useState([]);
    const [phase, setPhase] = useState(game.currentPhase || 'rolling');
    const [roundNumber, setRoundNumber] = useState(game.currentRound || 1);
    const [pot, setPot] = useState(game.pot || 0);
    const [betActions, setBetActions] = useState([]);
    const [revealData, setRevealData] = useState(null);
    const [roundWinners, setRoundWinners] = useState([]);
    const [gameOver, setGameOver] = useState(false);
    const [gameResult, setGameResult] = useState(null);
    const [otherHolds, setOtherHolds] = useState({});
    const [betAmount, setBetAmount] = useState('');
    const [betError, setBetError] = useState(null);
    const [waitingMsg, setWaitingMsg] = useState('Waiting for round to start...');
    const [myCurrentBet, setMyCurrentBet] = useState(0);
    const [myPoints, setMyPoints] = useState(() => game.players?.find(p => p.userId === myUserId)?.points || 0);
    const [highestBet, setHighestBet] = useState(0);
    const [myFolded, setMyFolded] = useState(false);

    useEffect(() => {
        if (!socket || !gameId) return;
        socket.emit('join_game', gameId);
    }, [socket, gameId]);

    useEffect(() => {
        if (!socket) return;

        function onGameState(data) {
            setPhase(data.currentPhase || 'rolling');
            setRoundNumber(data.currentRound || 1);
            setPot(data.pot || 0);
            const me = data.players?.find(p => p.userId === myUserId);
            if (me) {
                setMyPoints(me.points);
                setMyCurrentBet(me.currentBet || 0);
                const currentRound = me.rounds?.find(r => r.roundNumber === data.currentRound);
                if (currentRound?.rolls?.length) {
                    setMyRolls(currentRound.rolls);
                    setMyHolds(currentRound.holds || []);
                }
            }
        }

        function onRollResult({ roundNumber, rolls, holds }) {
            setRoundNumber(roundNumber);
            setMyRolls(rolls);
            setMyHolds(holds || []);
            setRevealData(null);
            setRoundWinners([]);
            setBetActions([]);
            setOtherHolds({});
            setMyFolded(false);
            setMyCurrentBet(0);
            setHighestBet(0);
            setWaitingMsg('');
            setPhase('rolling');
        }

        function onRoundStart({ roundNumber, phase }) {
            setRoundNumber(roundNumber);
            setPhase(phase);
            setWaitingMsg('Waiting for roll...');
        }

        function onHoldsUpdate({ userId, holds }) {
            if (userId !== myUserId) {
                setOtherHolds(prev => ({ ...prev, [userId]: holds }));
            }
        }

        function onBetUpdate({ userId, action, amount, pot }) {
            setPot(pot);
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

        function onRoundEnd({ roundNumber, reveal, roundWinners, pot: splitAmount }) {
            setPhase('reveal');
            setRevealData(reveal);
            setRoundWinners(roundWinners);
            setPot(splitAmount);
            setWaitingMsg('Round over — next round starting soon...');
        }

        function onGameEnd({ winnerId, players }) {
            setGameOver(true);
            setGameResult({ winnerId, players });
            setPhase('finished');
        }

        socket.on('game_state', onGameState);
        socket.on('roll_result', onRollResult);
        socket.on('round_start', onRoundStart);
        socket.on('holds_update', onHoldsUpdate);
        socket.on('bet_update', onBetUpdate);
        socket.on('round_end', onRoundEnd);
        socket.on('game_end', onGameEnd);

        return () => {
            socket.off('game_state', onGameState);
            socket.off('roll_result', onRollResult);
            socket.off('round_start', onRoundStart);
            socket.off('holds_update', onHoldsUpdate);
            socket.off('bet_update', onBetUpdate);
            socket.off('round_end', onRoundEnd);
            socket.off('game_end', onGameEnd);
        };
    }, [socket, myUserId]);

    function toggleHold(index) {
        if (!isPlayer || phase !== 'rolling' || myFolded) return;
        const newHolds = myHolds.includes(index)
            ? myHolds.filter(i => i !== index)
            : [...myHolds, index];
        setMyHolds(newHolds);
        socket.emit('hold_dice', { gameId, holds: newHolds });
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
        return game.players?.find(p => p.userId === userId)?.username || `User ${userId}`;
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

    return (
        <div className={styles.board}>
            <div className={styles.info}>
                <span className={styles.round}>Round {roundNumber}</span>
                <span className={styles.pot}>Pot: {pot} pts</span>
                <span className={styles.phase}>{phase}</span>
            </div>

            {isPlayer && myRolls.length > 0 && !myFolded && (
                <div className={styles.mySection}>
                    <p className={styles.sectionLabel}>Your dice {phase === 'rolling' ? '— click to hold' : ''}</p>
                    <div className={styles.dice}>
                        {myRolls.map((face, i) => (
                            <Die key={i} face={face} held={myHolds.includes(i)} disabled={phase !== 'rolling'} onClick={() => toggleHold(i)} />
                        ))}
                    </div>
                </div>
            )}

            {myFolded && <p className={styles.folded}>You folded this round.</p>}

            {Object.keys(otherHolds).length > 0 && phase === 'rolling' && (
                <div className={styles.othersSection}>
                    {Object.entries(otherHolds).map(([uid, holds]) => (
                        <p key={uid} className={styles.otherHold}>
                            {getUsername(Number(uid))} is holding {holds.length} dice
                        </p>
                    ))}
                </div>
            )}

            {isPlayer && phase === 'betting' && !myFolded && (
                <div className={styles.betting}>
                    <p className={styles.sectionLabel}>
                        Pot: <strong>{pot} pts</strong> · Your bet: <strong>{myCurrentBet} pts</strong> · To match: <strong>{Math.max(0, highestBet - myCurrentBet)} pts</strong>
                    </p>
                    <div className={styles.betActions}>
                        <input type="number" min="1" value={betAmount} onChange={e => setBetAmount(e.target.value)} placeholder="Amount" className={styles.betInput} />
                        <button className={styles.btnBet} onClick={() => placeBet('bet')}>Bet</button>
                        <button className={styles.btnRaise} onClick={() => placeBet('raise')}>Raise</button>
                        <button className={styles.btnMatch} onClick={() => placeBet('match')}>Match</button>
                        <button className={styles.btnFold} onClick={() => placeBet('fold')}>Fold</button>
                    </div>
                    {betError && <p className={styles.betError}>{betError}</p>}
                </div>
            )}

            {betActions.length > 0 && (
                <div className={styles.betLog}>
                    {betActions.slice(-4).map((b, i) => (
                        <p key={i} className={styles.betLogItem}>
                            {getUsername(b.userId)}: <strong>{b.action}</strong>{b.amount ? ` ${b.amount} pts` : ''}
                        </p>
                    ))}
                </div>
            )}

            {phase === 'reveal' && revealData && (
                <div className={styles.reveal}>
                    <p className={styles.sectionLabel}>Round {roundNumber} results</p>
                    {revealData.map(p => (
                        <div key={p.userId} className={`${styles.revealPlayer} ${roundWinners.includes(p.userId) ? styles.roundWinner : ''}`}>
                            <span className={styles.revealName}>{getUsername(p.userId)}{roundWinners.includes(p.userId) ? ' 🏆' : ''}</span>
                            {p.folded ? <span className={styles.folded}>Folded</span> : (
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

            {waitingMsg && myRolls.length === 0 && !revealData && (
                <p className={styles.waiting}>{waitingMsg}</p>
            )}

            {!isPlayer && <p className={styles.spectator}>You are spectating this game.</p>}
        </div>
    );
}

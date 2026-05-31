import { useEffect, useRef } from "react";
import "./dice-poker-die.js";
import "./dice-poker-board.js";

export default function GameBoard({ game }) {
    const boardRef = useRef(null);

    const p1 = game.playerOne?.username ?? "Player 1";
    const p2 = game.playerTwo?.username ?? "Player 2";
    const variant = game.variantId;
    const bestOf = variant?.rounds ?? 3;
    const includeStraight = variant?.straightsAllowed !== false ? "true" : "false";

    useEffect(() => {
        const board = boardRef.current;
        if (!board) return;
        board.setAttribute("player1", p1);
        board.setAttribute("player2", p2);
        board.setAttribute("bestof", String(bestOf));
        board.setAttribute("include-straight", includeStraight);
    }, [p1, p2, bestOf, includeStraight]);

    return (
        <dice-poker-board
            ref={boardRef}
            player1={p1}
            player2={p2}
            bestof={bestOf}
            include-straight={includeStraight}
            style={{ display: "block", width: "100%" }}
        />
    );
}

import { useState, useEffect } from "react";

export function useCountdown(targetDate) {
    const [timeLeft, setTimeLeft] = useState(null);

    useEffect(() => {
        if (!targetDate) return;

        function tick() {
            const diff = new Date(targetDate) - new Date();
            if (diff <= 0) {
                setTimeLeft(null);
                return;
            }
            const days = Math.floor(diff / 1000 / 60 / 60 / 24);
            const hours = Math.floor((diff / 1000 / 60 / 60) % 24);
            const minutes = Math.floor((diff / 1000 / 60) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setTimeLeft({ days, hours, minutes, seconds });
        }

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    return timeLeft;
}
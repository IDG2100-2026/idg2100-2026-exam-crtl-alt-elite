import { createContext, useContext, useState, useEffect } from 'react';

const DEFAULTS = {
    theme: 'light',
    boardColor: '#1e3d2f',
    soundEnabled: true,
    lobbyGamesCount: 5,
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || DEFAULTS.theme);
    const [boardColor, setBoardColor] = useState(() => localStorage.getItem('boardColor') || DEFAULTS.boardColor);
    const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') !== 'false');
    const [lobbyGamesCount, setLobbyGamesCount] = useState(() => Number(localStorage.getItem('lobbyGamesCount')) || DEFAULTS.lobbyGamesCount);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('boardColor', boardColor);
    }, [boardColor]);

    useEffect(() => {
        localStorage.setItem('soundEnabled', soundEnabled);
    }, [soundEnabled]);

    useEffect(() => {
        localStorage.setItem('lobbyGamesCount', lobbyGamesCount);
    }, [lobbyGamesCount]);

    function toggleTheme() {
        setTheme(t => t === 'light' ? 'dark' : 'light');
    }

    return (
        <SettingsContext.Provider value={{
            theme, toggleTheme,
            boardColor, setBoardColor,
            soundEnabled, setSoundEnabled,
            lobbyGamesCount, setLobbyGamesCount,
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}

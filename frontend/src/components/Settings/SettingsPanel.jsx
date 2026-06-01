import { useRef, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import styles from './SettingsPanel.module.css';

const BOARD_COLORS = [
    { label: 'Forest Green', value: '#1e3d2f' },
    { label: 'Navy Blue', value: '#1a2a4a' },
    { label: 'Deep Purple', value: '#2d1b4e' },
    { label: 'Dark Red', value: '#4a1a1a' },
    { label: 'Charcoal', value: '#2a2a2a' },
];

const IconMoon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const IconSun = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const IconSoundOn = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
);

const IconSoundOff = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
);

const IconClose = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export default function SettingsPanel({ onClose }) {
    const { theme, toggleTheme, boardColor, setBoardColor, soundEnabled, setSoundEnabled, lobbyGamesCount, setLobbyGamesCount } = useSettings();
    const panelRef = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [onClose]);

    return (
        <div className={styles.panel} ref={panelRef}>
            <div className={styles.header}>
                <h3>Settings</h3>
                <button className={styles.close} onClick={onClose}><IconClose /></button>
            </div>

            <div className={styles.setting}>
                <span className={styles.label}>Theme</span>
                <button className={styles.toggle} onClick={toggleTheme}>
                    {theme === 'light' ? <><IconMoon /> Dark</> : <><IconSun /> Light</>}
                </button>
            </div>

            <div className={styles.setting}>
                <span className={styles.label}>Sound</span>
                <button
                    className={`${styles.toggle} ${soundEnabled ? '' : styles.off}`}
                    onClick={() => setSoundEnabled(s => !s)}
                >
                    {soundEnabled ? <><IconSoundOn /> On</> : <><IconSoundOff /> Off</>}
                </button>
            </div>

            <div className={styles.settingColumn}>
                <span className={styles.label}>Board Color</span>
                <div className={styles.colorPicker}>
                    {BOARD_COLORS.map(c => (
                        <button
                            key={c.value}
                            className={`${styles.colorSwatch} ${boardColor === c.value ? styles.selected : ''}`}
                            style={{ background: c.value }}
                            title={c.label}
                            onClick={() => setBoardColor(c.value)}
                        />
                    ))}
                </div>
            </div>

            <div className={styles.settingColumn}>
                <span className={styles.label}>Games shown on homepage: <strong>{lobbyGamesCount}</strong></span>
                <input
                    type="range"
                    min={3}
                    max={10}
                    step={1}
                    value={lobbyGamesCount}
                    onChange={e => setLobbyGamesCount(Number(e.target.value))}
                    className={styles.slider}
                />
                <div className={styles.sliderLabels}>
                    <span>3</span><span>10</span>
                </div>
            </div>
        </div>
    );
}

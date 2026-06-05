import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth.js";
import SettingsPanel from "@/components/Settings/SettingsPanel";
import Styles from "./Navbar.module.css";

const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export default function NavBar() {
  const itemCss = Styles["nav-element"];
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function styleIt({ isActive }) {
    return isActive ? `${itemCss} ${Styles.active}` : itemCss;
  }

  function handleLogout() {
    logout();
    navigate("/");
    setOpen(false);
  }

  function close() {
    setOpen(false);
  }

  return (
    <nav className={Styles.nav}>
      <Link to="/" className={Styles.icon} onClick={close}>
        Spanish Poker Dice
      </Link>

      <div className={Styles.links}>
        <NavLink className={styleIt} to="/tournaments">Tournaments</NavLink>
        <NavLink className={styleIt} to="/lobby">Lobby</NavLink>
        <NavLink className={styleIt} to="/leaderboard">Leaderboard</NavLink>
        <NavLink className={styleIt} to="/howToPlay">How to play</NavLink>
        {user ? (
          <>
            {user.role === 'admin' && (
              <NavLink className={Styles.adminBtn} to="/admin">Admin</NavLink>
            )}
            <Link to={`/profile/${user.userId}`} className={Styles["nav-element"]}>Hi, {user.username}</Link>
            <button className={Styles["nav-element"]} onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <NavLink className={Styles.loginBtn} to="/login">Log in</NavLink>
            <NavLink className={Styles.registerBtn} to="/register">Register</NavLink>
          </>
        )}
      </div>

      <button
        className={Styles.gearBtn}
        onClick={() => setSettingsOpen(o => !o)}
        aria-label="Settings"
      >
        <GearIcon />
      </button>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      <button
        className={Styles.hamburger}
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle menu"
      >
        <span className={`${Styles.bar} ${open ? Styles.bar1Open : ""}`} />
        <span className={`${Styles.bar} ${open ? Styles.bar2Open : ""}`} />
        <span className={`${Styles.bar} ${open ? Styles.bar3Open : ""}`} />
      </button>

      {open && (
        <div className={Styles.mobileMenu}>
          <NavLink className={styleIt} to="/tournaments" onClick={close}>Tournaments</NavLink>
          <NavLink className={styleIt} to="/lobby" onClick={close}>Lobby</NavLink>
          <NavLink className={styleIt} to="/leaderboard" onClick={close}>Leaderboard</NavLink>
          <NavLink className={styleIt} to="/howToPlay" onClick={close}>How to play</NavLink>
          {user ? (
            <>
              {user.role === 'admin' && (
                <NavLink className={Styles.adminBtn} to="/admin" onClick={close}>Admin</NavLink>
              )}
              <Link to={`/profile/${user.userId}`} className={Styles["nav-element"]} onClick={close}>Hi, {user.username}</Link>
              <button className={Styles["nav-element"]} onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink className={Styles.loginBtn} to="/login" onClick={close}>Log in</NavLink>
              <NavLink className={Styles.registerBtn} to="/register" onClick={close}>Register</NavLink>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

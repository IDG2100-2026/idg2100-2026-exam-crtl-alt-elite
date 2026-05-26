import { NavLink, Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import Styles from "./Navbar.module.css";

export default function NavBar() {
  const itemCss = Styles["nav-element"];
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function styleIt({ isActive }) {
    return isActive
      ? `${itemCss} ${Styles.active}`
      : itemCss;
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <nav className={Styles.nav}>
      <Link to="/" className={Styles.icon}>
        Spanish-Poker-Dice
      </Link>

      <div className={Styles.links}>
        <NavLink className={styleIt} to="/tournaments">Tournaments</NavLink>
        <NavLink className={styleIt} to="/lobby">Lobby</NavLink>
        <NavLink className={styleIt} to="/howToPlay">How to play</NavLink>
        <NavLink className={styleIt} to="/about">About</NavLink>

        {user ? (
          <>
            <Link to={`/profile/${user.userId}`} className={Styles["nav-element"]}>Hi, {user.username}</Link>
            <button className={Styles["nav-element"]} onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <NavLink className={styleIt} to="/login">Log in</NavLink>
            <NavLink className={styleIt} to="/register">Register</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
import Styles from "./Home.module.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import mainImg from "@/assets/mainPokerDice-bk.png";


export default function Home(){
  const [games, setGames] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError ] = useState(null);
  
  const navigate = useNavigate();

//   if (loading) return <p>Loader...</p>;
//   if (error) return <p>Error: {error}</p>;

const goToNewPage = () => {
  navigate("/createGame");
};

return (
  <div className={Styles["homeContainer"]}>  
    <section className={Styles["hero"]}>
      <img className={Styles["mainImg"]} 
          src={mainImg} 
          alt="spanish poker dice" 
      />

      <div className={Styles["heroContent"]}>
          <h1 className={Styles["heroTitle"]}>Spanish poker Dice</h1>
          <p className={Styles["heroSubtitle"]}>
            Play games for all over the world
          </p>
          
          <button 
          onClick={() => goToNewPage()}
          className={`button ${Styles["btnCreate"]}`}
          >
              Create Game
          </button>
      </div>
      
    </section>
  
    {/* lobby */}
    <section className={Styles["lobbySection"]}>
      <h2>Lobby</h2>
      <p>Join an exisitng game or create your own</p>
    </section>

  {/* Top Games */}
    <section className={Styles["topGamesSection"]}>
      <h2>Top Games</h2>
      <p>Most popular games right now</p>
    </section>
  
  </div>
  
);
}
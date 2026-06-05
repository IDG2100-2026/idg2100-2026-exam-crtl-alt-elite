import styles from './Tournaments.module.css';
import { useEffect, useState } from "react";
import { tournamentApi } from '../../../api/api';
import TournamentCard from '../../../components/TournamentCard/TournamentCard';

export default function TournamentList() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("scheduledAt");
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
  if (search.trim().length > 0 && search.trim().length < 3) return;

  async function load() {
    const res = await tournamentApi.getAll({
      sort: sortBy,
      search: search.trim() || undefined,
      page
    });

    setData(res);
  }

  load();
}, [search, sortBy, page]);


  const tournaments = data?.tournaments ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Failed: {error}</p>;

  const upcoming = tournaments.filter(t => t.status === "upcoming" || t.status === "ongoing");
  const past = tournaments.filter(t => t.status === "finished");
  const cancelled = tournaments.filter(t => t.status === "cancelled");

 return (
  <div className={styles.tournamentListPage}>
    <h2 className={styles.title}>Tournaments</h2>

    <div className={styles.controls}>
      <input
        className={styles.searchInput}
        type="text"
        placeholder="Search tournaments..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <select
        className={styles.sortSelect}
        value={sortBy}
        onChange={(e) => {
          setSortBy(e.target.value);
          setPage(1);
        }}
      >
        <option value="scheduledAt">Date</option>
        <option value="title">Title</option>
        <option value="players">Players</option>
      </select>
    </div>

    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Upcoming & Ongoing</h3>

      {upcoming.length === 0
        ? <p className={styles.empty}>No upcoming tournaments.</p>
        : <div className={styles.cardGrid}>
            {upcoming.map(t => <TournamentCard key={t._id} tournament={t} />)}
          </div>
      }
    </section>

    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Finished</h3>

      {past.length === 0
        ? <p className={styles.empty}>No finished tournaments yet.</p>
        : <div className={styles.cardGrid}>
            {past.map(t => <TournamentCard key={t._id} tournament={t} />)}
          </div>
      }
    </section>

    {cancelled.length > 0 && (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Cancelled</h3>
        <div className={styles.cardGrid}>
          {cancelled.map(t => <TournamentCard key={t._id} tournament={t} />)}
        </div>
      </section>
    )}

    {page < totalPages && (
      <button className={styles.loadMore} onClick={() => setPage(p => p + 1)}>
        Load more
      </button>
    )}
  </div>
);

};

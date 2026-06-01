// copied from oblig 3 

import styles from './StaticPage.module.css';

export default function AboutPage() {
  return (
    <div className={`container ${styles.page}`}>
      <h1 className="page-title">About Us</h1>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>Our Story</h2>
          <p>
            Spanish Poker Dice was founded in 2022 by a small group of friends in
            Barcelona who grew up playing <em>póquer de dados</em> at their grandparents'
            kitchen table. After years of searching for a faithful online version of the
            game and finding nothing, they decided to build one themselves.
          </p>
          <p>
            What began as a weekend hackathon project became a full-time passion.
            Today we are a distributed team of six developers and designers spread
            across Spain, Norway, and Brazil - connected by our love of dice, strategy,
            and a well-earned cup of café con leche.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Our Mission</h2>
          <p>
            We believe every classic game deserves a modern, accessible home on the web.
            Our platform is built to honour the original rules of Spanish Poker Dice while
            bringing new features - tournaments, Elo ratings, and live spectating - that
            the kitchen table never could.
          </p>
        </section>

        <section className={styles.section}>
          <h2>The Team</h2>
          <div className={styles.teamGrid}>
            {[
              { name: 'Elena Vázquez', role: 'Founder & Lead Developer' },
              { name: 'Mikel Arrizabalaga', role: 'Game Logic & Backend' },
              { name: 'Sofía Nascimento', role: 'Frontend & UX Design' },
              { name: 'Lars Bergström', role: 'Infrastructure & DevOps' },
            ].map(m => (
              <div key={m.name} className={styles.memberCard}>
                <div className={styles.memberAvatar}>{m.name[0]}</div>
                <strong>{m.name}</strong>
                <span>{m.role}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            Questions or feedback? Reach us at{' '}
            <a href="mailto:hello@spanishpokerdice.example">hello@spanishpokerdice.example</a>.
          </p>
        </section>
      </div>
    </div>
  );
}

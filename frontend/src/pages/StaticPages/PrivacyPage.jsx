import styles from './StaticPage.module.css';

export default function PrivacyPage() {
  return (
    <div className={`container ${styles.page}`}>
      <h1 className="page-title">Privacy Policy</h1>
      <p className={styles.updated}>Last updated: January 2025</p>
      <div className={styles.content}>

        <section className={styles.section}>
          <h2>1. Information We Collect</h2>
          <p>
            When you register, we collect your username, email address, and date of birth.
            We also record game activity (results, Elo changes) associated with your account.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. How We Use Your Information</h2>
          <p>
            Your data is used to: provide and improve the Platform; calculate Elo ratings;
            send account-related emails; and moderate the community.
            We do not sell your personal data to third parties.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Data Storage</h2>
          <p>
            Data is stored on servers located within the European Union. Passwords are
            hashed using PBKDF2 before storage and are never stored in plain text.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Cookies and Local Storage</h2>
          <p>
            We use browser local storage to remember your appearance preferences (theme,
            board colour, sound settings) and login session. We do not use third-party
            tracking cookies.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Your Rights</h2>
          <p>
            Under GDPR you have the right to access, correct, or delete your personal data.
            Contact us at{' '}
            <a href="mailto:privacy@spanishpokerdice.example">privacy@spanishpokerdice.example</a>
            {' '}to make a request.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Changes to This Policy</h2>
          <p>
            We may update this policy periodically. We will notify registered users of
            significant changes by email.
          </p>
        </section>

      </div>
    </div>
  );
}

// copied from oblig 3 

import styles from './StaticPage.module.css';

export default function TermsPage() {
  return (
    <div className={`container ${styles.page}`}>
      <h1 className="page-title">Terms &amp; Conditions</h1>
      <p className={styles.updated}>Last updated: January 2025</p>
      <div className={styles.content}>

        <section className={styles.section}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Spanish Poker Dice ("the Platform"), you agree to be bound
            by these Terms and Conditions. If you do not agree, do not use the Platform.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years of age to register for an account. By registering,
            you confirm that you meet this requirement.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials.
            You must not share your account with others. We reserve the right to suspend or
            terminate accounts that violate these terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Acceptable Use</h2>
          <p>
            You agree not to: use cheating software or exploits; harass other players;
            post offensive or illegal content in comments; attempt to access parts of the
            Platform you are not authorised to access.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Intellectual Property</h2>
          <p>
            All platform content, branding, and code are the property of Spanish Poker Dice
            and may not be reproduced without prior written consent.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Limitation of Liability</h2>
          <p>
            The Platform is provided "as is". We make no warranties about availability or
            accuracy. Our liability to you for any claim is limited to the fees you have paid
            us in the preceding 12 months.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Changes to Terms</h2>
          <p>
            We may update these terms at any time. Continued use of the Platform after
            changes constitutes acceptance.
          </p>
        </section>

      </div>
    </div>
  );
}

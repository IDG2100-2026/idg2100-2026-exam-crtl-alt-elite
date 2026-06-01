import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1>404 - Page Not Found</h1>
      <p>Looks like that page rolled off the table.</p>
      <Link to="/">Back to Home</Link>
    </div>
  );
}

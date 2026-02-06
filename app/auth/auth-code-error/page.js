import Link from 'next/link';

export default function AuthCodeError() {
  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <div className="pendulum-icon" aria-hidden="true" />
        </div>
        <h1 className="title">Pendulum</h1>
        <p className="subtitle">Personal Myth Engine</p>
      </header>

      <main className="main-content login-content">
        <div className="login-card">
          <p className="login-intro">
            Something went wrong during sign in.
          </p>
          
          <Link href="/login" className="google-login-btn" style={{ textDecoration: 'none' }}>
            <span>Try again</span>
          </Link>

          <p className="login-note">
            If this keeps happening, try clearing your browser cookies and signing in again.
          </p>
        </div>
      </main>

      <footer className="footer">
        <p className="entry-count">Technology with Empathy</p>
      </footer>
    </div>
  );
}

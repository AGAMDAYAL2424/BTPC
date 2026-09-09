import Link from 'next/link';
import { logoutAction } from './actions';

/**
 * Chrome shared by every admin page. Not a security boundary: each page and
 * each action checks the session itself.
 */
export default function AdminShell({
  current,
  username,
  children,
}: {
  current: 'queue' | 'faqs' | 'analytics';
  username: string;
  children: React.ReactNode;
}) {
  return (
    <div className="admin">
      <div className="admin-bar">
        <h1>Help desk admin</h1>
        <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{username}</span>
        <nav className="admin-nav" aria-label="Admin sections">
          <Link href="/admin" aria-current={current === 'queue' ? 'page' : undefined}>
            Queue
          </Link>
          <Link href="/admin/faqs" aria-current={current === 'faqs' ? 'page' : undefined}>
            Answer library
          </Link>
          <Link
            href="/admin/analytics"
            aria-current={current === 'analytics' ? 'page' : undefined}
          >
            Analytics
          </Link>
          <form action={logoutAction}>
            <button type="submit">Sign out</button>
          </form>
        </nav>
      </div>
      <main className="admin-main">{children}</main>
    </div>
  );
}

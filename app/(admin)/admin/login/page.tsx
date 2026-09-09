import { redirect } from 'next/navigation';
import { currentSession } from '../../../../lib/server/auth/session';
import LoginForm from './LoginForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await currentSession()) redirect('/admin');
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Help desk admin</h1>
        <p>Delhi Traffic Police, BRICS Summit 2026</p>
        <LoginForm />
      </div>
    </div>
  );
}

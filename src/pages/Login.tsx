import { useAuth } from '../hooks/useAuth';
import { LogIn } from 'lucide-react';

export function Login() {
  const { login } = useAuth();

  return (
    <div className="flex items-center justify-center h-screen bg-surface px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-secondary mb-8">Sign in to view your projects</p>
        <button
          onClick={login}
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-light text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

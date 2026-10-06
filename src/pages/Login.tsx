import { useAuth } from '../hooks/useAuth';
import { LayoutGrid } from 'lucide-react';
import { KmetaMark, KrokyMark } from '../components/BrandMarks';
import { GOLD, stagger } from '../lib/theme';

export function Login() {
  const { login } = useAuth();

  return (
    <div className="theme-pine relative flex items-center justify-center h-full px-4 overflow-hidden">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[640px] h-[640px] rounded-full blur-3xl opacity-[0.09]" style={{ background: GOLD }} />

      <div className="relative w-full max-w-sm text-center">
        <span className="k-rise mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-accent text-[#1d1503] shadow-[0_14px_40px_-10px_var(--k-gold-glow)] mb-7">
          <LayoutGrid className="w-7 h-7" />
        </span>
        <h1 className="k-rise text-4xl font-extrabold tracking-tight text-text-primary mb-2" style={stagger(1)}>
          Dashboard
        </h1>
        <p className="k-rise text-text-muted mb-9" style={stagger(2)}>
          Аналітика твоїх проєктів в одному місці
        </p>

        <button
          onClick={login}
          className="k-rise k-btn-gold w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-[15px]"
          style={stagger(3)}
        >
          <GoogleIcon />
          Увійти через Google
        </button>

        <div className="k-rise flex items-center justify-center gap-5 mt-10 text-sm font-bold text-text-secondary" style={stagger(4)}>
          <span className="inline-flex items-center gap-2"><KmetaMark className="w-5 h-5" /> kmeta</span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="inline-flex items-center gap-2"><KrokyMark className="w-5 h-5" /> kroky</span>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden>
      <path fill="#1d1503" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.75 12 2.75 6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25c5.34 0 8.88-3.75 8.88-9.04 0-.6-.07-1.06-.15-1.51z" />
    </svg>
  );
}

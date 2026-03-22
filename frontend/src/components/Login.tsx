import { useState } from 'react';

interface LoginProps {
  onLogin: (name: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-headline font-extrabold tracking-tighter text-primary uppercase">
            The Obsidian Lounge
          </h1>
          <p className="mt-2 text-on-surface-variant font-label text-xs uppercase tracking-[0.2em]">
            Private Poker Experience
          </p>
        </div>

        {/* Login card */}
        <form onSubmit={handleSubmit} className="bg-surface-container-low rounded-xl p-8">
          <h2 className="font-headline font-bold text-2xl text-on-surface tracking-tight mb-6">
            Enter the Lounge
          </h2>

          <div className="mb-6">
            <label className="block font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-2">
              Display Name
            </label>
            <input
              type="text"
              placeholder="Your name at the table"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-on-surface font-body placeholder:text-outline focus:ring-1 focus:ring-primary/40 focus:outline-none transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 bg-primary text-on-primary font-headline font-bold text-sm uppercase tracking-wider rounded-lg hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Take Your Seat
          </button>

          <p className="mt-4 text-center text-on-surface-variant/50 font-label text-[10px] uppercase tracking-[0.15em]">
            Starting balance: $1,000
          </p>
        </form>
      </div>
    </div>
  );
}

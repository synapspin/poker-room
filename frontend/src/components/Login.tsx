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
    <form onSubmit={handleSubmit} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      alignItems: 'center',
      padding: 40,
      background: '#16213e',
      borderRadius: 12,
      minWidth: 320,
    }}>
      <h2 style={{ color: '#e94560', marginBottom: 8 }}>Welcome to Poker Room</h2>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ width: '100%' }}
        autoFocus
      />
      <button
        type="submit"
        disabled={!name.trim()}
        style={{ width: '100%', background: '#e94560', color: '#fff', padding: 12 }}
      >
        Enter
      </button>
    </form>
  );
}

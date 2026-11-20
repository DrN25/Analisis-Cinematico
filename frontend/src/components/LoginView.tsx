import React, { useState } from 'react';
import { Lock, LogIn, User as UserIcon } from 'lucide-react';
import { apiJson, setToken } from '../api';
import { User } from '../types';

interface Props {
  onSuccess: (user: User) => void;
}

export const LoginView: React.FC<Props> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiJson<{ access_token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username_or_email: username.trim(), password }),
      });
      setToken(res.access_token);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 border-t-4 border-t-[#881337]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200/70 flex items-center justify-center shrink-0">
            <svg width="26" height="26" viewBox="0 0 38 38" fill="none" aria-hidden="true">
              <circle cx="19" cy="19" r="16.5" stroke="#18202A" strokeWidth="2" />
              <path d="M2.5 19 C 8 27, 30 27, 35.5 19" stroke="#881337" strokeWidth="2" />
              <circle cx="19" cy="9" r="2.3" fill="#B91C1C" />
              <circle cx="14.5" cy="11.5" r="2.3" fill="#B91C1C" />
              <circle cx="25" cy="27" r="1.9" fill="#94A3B8" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-slate-900 leading-tight">
              Análisis Cinemático
            </h1>
            <p className="text-xs text-slate-500">GEMA · Criterios Dips (Rocscience)</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Usuario o correo electrónico
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. ADMIN"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#881337]/20 focus:border-[#881337]"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#881337] hover:bg-[#6F0F2C] disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Verificando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-5 text-[11px] text-slate-400 text-center">
          Acceso auditado · Rotura planar, cuña, toppling flexural y directo
        </p>
      </div>
    </div>
  );
};

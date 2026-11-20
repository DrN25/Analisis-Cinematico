import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, User as UserIcon } from 'lucide-react';
import { apiJson, setToken } from '../api';
import { User } from '../types';

interface Props {
  onSuccess: (user: User) => void;
}

export const LoginView: React.FC<Props> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-[#E5E9EE] px-4 select-none">
      {/* Ventana de diálogo estilo escritorio */}
      <div className="w-full max-w-[360px] bg-white border border-slate-300 rounded shadow-lg overflow-hidden">
        {/* Barra de título de la ventana */}
        <div className="h-8 bg-slate-800 text-slate-200 px-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-rose-300" />
            <span className="font-semibold text-[11px] tracking-wide text-white">
              Iniciar sesión · Análisis Cinemático
            </span>
          </div>
        </div>

        {/* Cuerpo del diálogo */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Usuario o correo electrónico
              </label>
              <div className="relative">
                <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. ADMIN"
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded p-2 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded bg-[#881337] hover:bg-[#6F0F2C] disabled:opacity-60 text-white text-xs font-semibold transition-colors shadow-sm mt-1 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{loading ? 'Iniciando sesión…' : 'Iniciar sesión'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

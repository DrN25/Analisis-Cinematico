import React, { useEffect, useState } from 'react';
import {
  Activity,
  Download,
  RefreshCw,
  Search,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { apiBlob, apiJson, triggerDownload } from '../api';
import { LogsResponse, Role, User } from '../types';

interface Props {
  currentUser: User;
  onClose: () => void;
}

function shortBrowser(ua?: string | null): string {
  if (!ua) return '—';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/')) return 'Safari';
  if (ua.includes('curl')) return 'curl';
  return ua.slice(0, 20);
}

function actionBadge(accion: string): string {
  if (accion === 'LOGIN_OK') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (accion === 'LOGIN_FAIL') return 'bg-red-50 text-red-700 border-red-200';
  if (accion === 'ANALISIS') return 'bg-rose-50 text-[#881337] border-rose-200';
  if (accion.startsWith('EXPORT_')) return 'bg-slate-100 text-slate-700 border-slate-300';
  if (accion.startsWith('USER_') || accion === 'PASSWORD_CHANGE') {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export const AdminModal: React.FC<Props> = ({ currentUser, onClose }) => {
  const [tab, setTab] = useState<'usuarios' | 'logs'>('usuarios');
  const [logsData, setLogsData] = useState<LogsResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [fUsuario, setFUsuario] = useState('');
  const [fAccion, setFAccion] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userStatusFilter, setUserStatusFilter] = useState<'TODOS' | 'A' | 'I' | '*'>('TODOS');
  const [userSearch, setUserSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [newUser, setNewUser] = useState({
    usuario: '',
    email: '',
    nombre_completo: '',
    rol_id: 0,
    password: '',
  });
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ email: '', nombre_completo: '', rol_id: 0, password: '' });

  const buildLogsQuery = () => {
    const p = new URLSearchParams();
    if (fUsuario.trim()) p.set('usuario', fUsuario.trim());
    if (fAccion) p.set('accion', fAccion);
    if (fDesde) p.set('desde', fDesde);
    if (fHasta) p.set('hasta', fHasta);
    const qs = p.toString();
    return qs ? `?${qs}` : '';
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    setError(null);
    try {
      const res = await apiJson<LogsResponse>(`/api/admin/logs${buildLogsQuery()}`);
      setLogsData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setError(null);
    try {
      const [uList, rList] = await Promise.all([
        apiJson<User[]>('/api/admin/usuarios?estado=all'),
        apiJson<Role[]>('/api/admin/roles'),
      ]);
      setUsers(uList);
      setRoles(rList);
      if (rList.length > 0 && newUser.rol_id === 0) {
        const def = rList.find((r) => r.nombre !== 'admin') || rList[0];
        setNewUser((prev) => ({ ...prev, rol_id: def.rol_id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando usuarios.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportLogsCsv = async () => {
    try {
      const { blob, filename } = await apiBlob(`/api/admin/logs/csv${buildLogsQuery()}`);
      triggerDownload(blob, filename || 'cinematico_logs.csv');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error exportando CSV.');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiJson<User>('/api/admin/usuarios', {
        method: 'POST',
        body: JSON.stringify(newUser),
      });
      setNewUser((prev) => ({ ...prev, usuario: '', email: '', nombre_completo: '', password: '' }));
      await loadUsers();
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        nombre_completo: editForm.nombre_completo,
      };
      if (!editTarget.protegido) {
        payload.email = editForm.email;
        payload.rol_id = editForm.rol_id;
        if (editForm.password.trim()) payload.password = editForm.password.trim();
      }
      await apiJson<User>(`/api/admin/usuarios/${editTarget.usuario_id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setEditTarget(null);
      await loadUsers();
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar.');
    }
  };

  const handleSetStatus = async (u: User, newEstado: 'A' | 'I' | '*') => {
    if (newEstado === '*') {
      const confirmDelete = window.confirm(
        `¿Confirmas eliminar al usuario "${u.usuario}"?\n\nEl usuario pasará a la lista de Eliminados y no podrá iniciar sesión. Podrás restaurarlo más adelante si lo requieres.`
      );
      if (!confirmDelete) return;
    }
    setError(null);
    try {
      await apiJson<User>(`/api/admin/usuarios/${u.usuario_id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: newEstado }),
      });
      await loadUsers();
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado del usuario.');
    }
  };

  const kpis = logsData?.kpis;

  const countTodos = users.length;
  const countActivos = users.filter((u) => u.estado === 'A').length;
  const countInactivos = users.filter((u) => u.estado === 'I').length;
  const countEliminados = users.filter((u) => u.estado === '*').length;

  const filteredUsers = users.filter((u) => {
    if (userStatusFilter !== 'TODOS' && u.estado !== userStatusFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      const matchUser = u.usuario.toLowerCase().includes(q);
      const matchName = (u.nombre_completo || '').toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchRole = u.rol_nombre.toLowerCase().includes(q);
      if (!matchUser && !matchName && !matchEmail && !matchRole) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-2 sm:p-3 select-none">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-7xl h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-3 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Shield className="w-5 h-5 text-[#881337] shrink-0" />
            <h2 className="font-display font-semibold text-base text-slate-900">
              Panel de Administración
            </h2>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setTab('usuarios')}
                className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${tab === 'usuarios' ? 'bg-white text-[#881337] shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                Usuarios ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('logs')}
                className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${tab === 'logs' ? 'bg-white text-[#881337] shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Logs de acceso
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-800 text-xs px-5 py-2 border-b border-red-200 flex justify-between font-mono">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-700 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Pestaña Usuarios */}
        {tab === 'usuarios' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-3 sm:p-5 overflow-y-auto lg:overflow-hidden">
            <div className="lg:col-span-8 flex flex-col min-h-[260px] lg:min-h-0">
              {/* Barra superior de filtros de estado y búsqueda */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('TODOS')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${userStatusFilter === 'TODOS'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Todos ({countTodos})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('A')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${userStatusFilter === 'A'
                        ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Activos ({countActivos})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('I')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${userStatusFilter === 'I'
                        ? 'bg-white text-amber-800 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Inactivos ({countInactivos})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('*')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${userStatusFilter === '*'
                        ? 'bg-white text-rose-700 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Eliminados ({countEliminados})
                  </button>
                </div>

                <div className="relative flex items-center w-full sm:w-auto">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar usuario o correo…"
                    className="pl-8 pr-6 py-1 text-xs border border-slate-300 rounded-lg w-full sm:w-52 focus:outline-none focus:border-[#881337] bg-white"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      onClick={() => setUserSearch('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla de usuarios */}
              <div className="border border-slate-200 rounded-xl overflow-auto flex-1 min-h-0 bg-white">
                <table className="w-full min-w-[700px] text-xs border-separate border-spacing-0">
                  <thead>
                    <tr className="text-slate-700">
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 py-2 text-left">Usuario</th>
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 py-2 text-left">Nombre / Correo</th>
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2 py-2 text-left">Rol</th>
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2 py-2 text-left whitespace-nowrap">Último acceso</th>
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left">Estado</th>
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 py-2 text-right whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const locked = u.protegido || u.usuario_id === currentUser.usuario_id;
                      return (
                        <tr key={u.usuario_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2 font-semibold text-slate-800 border-b border-slate-100 truncate">
                            <span title={u.usuario}>{u.usuario}</span>
                            {u.protegido && (
                              <span className="ml-1 text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                                Protegido
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 border-b border-slate-100">
                            <div className="text-slate-800 truncate" title={u.nombre_completo || ''}>
                              {u.nombre_completo || '—'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate" title={u.email}>
                              {u.email}
                            </div>
                          </td>
                          <td className="px-2 py-2 capitalize border-b border-slate-100 truncate">{u.rol_nombre}</td>
                          <td className="px-2 py-2 text-[11px] text-slate-500 border-b border-slate-100 truncate" title={u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString() : 'Nunca'}>
                            {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString() : 'Nunca'}
                          </td>
                          <td className="px-2.5 py-2 border-b border-slate-100">
                            {u.estado === 'A' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Activo
                              </span>
                            ) : u.estado === 'I' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                Inactivo
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Eliminado
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right border-b border-slate-100 whitespace-nowrap">
                            {locked ? (
                              <span className="text-[10.5px] text-slate-400 italic px-2 py-0.5 bg-slate-50 border border-slate-200 rounded">
                                {u.protegido ? 'Protegido' : 'Tu sesión'}
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                {u.estado !== '*' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditTarget(u);
                                      setEditForm({
                                        email: u.email,
                                        nombre_completo: u.nombre_completo || '',
                                        rol_id: u.rol_id,
                                        password: '',
                                      });
                                    }}
                                    className="px-2 py-1 text-[11px] font-medium border border-slate-300 rounded hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                                  >
                                    Editar
                                  </button>
                                )}

                                {u.estado === 'A' && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetStatus(u, 'I')}
                                    className="px-2 py-1 text-[11px] font-medium border border-amber-300 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors cursor-pointer"
                                  >
                                    Inactivar
                                  </button>
                                )}

                                {u.estado === 'I' && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetStatus(u, 'A')}
                                    className="px-2 py-1 text-[11px] font-medium border border-emerald-300 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                                  >
                                    Activar
                                  </button>
                                )}

                                {u.estado === '*' && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetStatus(u, 'A')}
                                    className="px-2 py-1 text-[11px] font-medium border border-emerald-300 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                                  >
                                    Restaurar
                                  </button>
                                )}

                                {u.estado !== '*' && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetStatus(u, '*')}
                                    className="px-2 py-1 text-[11px] font-medium border border-rose-300 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 transition-colors cursor-pointer"
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          {usersLoading ? 'Cargando usuarios…' : 'No hay usuarios que coincidan con los filtros.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel lateral: Crear / Editar usuario */}
            <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 h-fit overflow-y-auto max-h-full">
              {editTarget ? (
                <form onSubmit={handleSaveEdit} className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800">
                      Editar cuenta: {editTarget.usuario}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditTarget(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Nombre completo</label>
                    <input
                      value={editForm.nombre_completo}
                      onChange={(e) => setEditForm({ ...editForm, nombre_completo: e.target.value })}
                      placeholder="Nombre y apellido"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#881337]"
                    />
                  </div>
                  {!editTarget.protegido && (
                    <>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Correo electrónico</label>
                        <input
                          type="email"
                          required
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#881337]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Rol</label>
                        <select
                          value={editForm.rol_id}
                          onChange={(e) => setEditForm({ ...editForm, rol_id: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#881337]"
                        >
                          {roles.map((r) => (
                            <option key={r.rol_id} value={r.rol_id}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                          Nueva contraseña (opcional)
                        </label>
                        <input
                          type="password"
                          value={editForm.password}
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                          placeholder="Dejar vacío para mantener actual"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#881337]"
                        />
                      </div>
                    </>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#881337] hover:bg-[#6F0F2C] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Guardar cambios
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 pb-2 border-b border-slate-200">
                    <UserPlus className="w-4 h-4 text-[#881337]" />
                    <span>Nuevo usuario</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Usuario</label>
                    <input
                      required
                      value={newUser.usuario}
                      onChange={(e) => setNewUser({ ...newUser, usuario: e.target.value })}
                      placeholder="Ej. JPEREZ"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#881337]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Correo electrónico</label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="usuario@cinematico.com"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#881337]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Nombre completo</label>
                    <input
                      value={newUser.nombre_completo}
                      onChange={(e) => setNewUser({ ...newUser, nombre_completo: e.target.value })}
                      placeholder="Nombre y apellido"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#881337]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Rol</label>
                    <select
                      value={newUser.rol_id}
                      onChange={(e) => setNewUser({ ...newUser, rol_id: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#881337]"
                    >
                      {roles.map((r) => (
                        <option key={r.rol_id} value={r.rol_id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Contraseña inicial</label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#881337]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#881337] hover:bg-[#6F0F2C] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Crear cuenta
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Pestaña Logs */}
        {tab === 'logs' && (
          <div className="flex-1 min-h-0 flex flex-col p-5 gap-4">
            {kpis && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Accesos hoy</div>
                  <div className="font-display text-2xl font-semibold text-slate-900">
                    {kpis.accesos_hoy}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Accesos (últimos 7 días)</div>
                  <div className="font-display text-2xl font-semibold text-slate-900">
                    {kpis.accesos_7d}
                    <span className="text-xs font-normal text-red-700 ml-2">
                      ({kpis.logins_fallidos_7d} fallidos)
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Cuentas únicas (7 días)</div>
                  <div className="font-display text-2xl font-semibold text-[#881337]">
                    {kpis.usuarios_unicos_7d}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] text-slate-500">Análisis / Descargas (7d)</div>
                  <div className="font-display text-2xl font-semibold text-slate-900">
                    {kpis.analisis_7d}{' '}
                    <span className="text-sm font-normal text-slate-500">
                      / {kpis.descargas_7d} exp.
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-end gap-2 shrink-0">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Usuario</label>
                <input
                  type="text"
                  value={fUsuario}
                  onChange={(e) => setFUsuario(e.target.value)}
                  placeholder="Ej. ADMIN"
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg w-36 focus:outline-none focus:border-[#881337]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Acción</label>
                <select
                  value={fAccion}
                  onChange={(e) => setFAccion(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#881337]"
                >
                  <option value="">Todas</option>
                  <option value="LOGIN_OK">LOGIN_OK</option>
                  <option value="LOGIN_FAIL">LOGIN_FAIL</option>
                  <option value="ANALISIS">ANALISIS</option>
                  <option value="EXPORT_EXCEL">EXPORT_EXCEL</option>
                  <option value="EXPORT_PNG">EXPORT_PNG</option>
                  <option value="EXPORT_ZIP">EXPORT_ZIP</option>
                  <option value="USER_CREATE">USER_CREATE</option>
                  <option value="USER_UPDATE">USER_UPDATE</option>
                  <option value="USER_STATUS">USER_STATUS</option>
                  <option value="PASSWORD_CHANGE">PASSWORD_CHANGE</option>
                  <option value="LOGOUT">LOGOUT</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Desde</label>
                <input
                  type="date"
                  value={fDesde}
                  onChange={(e) => setFDesde(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Hasta</label>
                <input
                  type="date"
                  value={fHasta}
                  onChange={(e) => setFHasta(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <button
                type="button"
                onClick={loadLogs}
                disabled={logsLoading}
                className="px-3 py-1.5 text-xs font-medium bg-[#881337] hover:bg-[#6F0F2C] text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                Filtrar
              </button>
              <button
                type="button"
                onClick={handleExportLogsCsv}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 ml-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#881337]" />
                Exportar CSV
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="text-slate-700">
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 py-2 text-left whitespace-nowrap">Fecha y hora</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 py-2 text-left">Usuario</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 py-2 text-left">Acción</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 py-2 text-left">Detalle</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 py-2 text-left">IP</th>
                    <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-3 py-2 text-left">Navegador</th>
                  </tr>
                </thead>
                <tbody>
                  {logsData?.items.map((row) => (
                    <tr key={row.log_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap border-b border-slate-100">
                        {new Date(row.fecha_hora).toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 font-medium text-slate-800 border-b border-slate-100">
                        {row.usuario}
                      </td>
                      <td className="px-3 py-1.5 border-b border-slate-100">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10.5px] font-semibold rounded-full border ${actionBadge(
                            row.accion,
                          )}`}
                        >
                          {row.accion}
                        </span>
                      </td>
                      <td
                        className="px-3 py-1.5 text-slate-600 max-w-sm truncate border-b border-slate-100"
                        title={row.detalle || ''}
                      >
                        {row.detalle || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-slate-500 font-mono text-[11px] border-b border-slate-100">
                        {row.direccion_ip || '—'}
                      </td>
                      <td className="px-3 py-1.5 text-slate-500 border-b border-slate-100" title={row.user_agent || ''}>
                        {shortBrowser(row.user_agent)}
                      </td>
                    </tr>
                  ))}
                  {(!logsData || logsData.items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Sin registros con estos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

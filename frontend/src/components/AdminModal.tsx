import React, { useEffect, useState } from 'react';
import {
  Activity,
  Download,
  RefreshCw,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  UserX,
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
  const [tab, setTab] = useState<'logs' | 'usuarios'>('logs');
  const [logsData, setLogsData] = useState<LogsResponse | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [fUsuario, setFUsuario] = useState('');
  const [fAccion, setFAccion] = useState('');
  const [fDesde, setFDesde] = useState('');
  const [fHasta, setFHasta] = useState('');

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
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
        apiJson<User[]>('/api/admin/usuarios'),
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

  const toggleStatus = async (u: User) => {
    const next = u.estado === 'A' ? 'I' : 'A';
    setError(null);
    try {
      await apiJson<User>(`/api/admin/usuarios/${u.usuario_id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: next }),
      });
      await loadUsers();
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado.');
    }
  };

  const kpis = logsData?.kpis;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-7xl h-[88vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#881337]" />
            <h2 className="font-display font-semibold text-base text-slate-900">
              Administración y Auditoría
            </h2>
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs ml-2">
              <button
                type="button"
                onClick={() => setTab('logs')}
                className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 ${
                  tab === 'logs' ? 'bg-white text-[#881337] shadow-sm' : 'text-slate-600'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Logs de acceso
              </button>
              <button
                type="button"
                onClick={() => setTab('usuarios')}
                className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 ${
                  tab === 'usuarios' ? 'bg-white text-[#881337] shadow-sm' : 'text-slate-600'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Usuarios ({users.length})
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
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
                  <option value="EXPORT_CSV">EXPORT_CSV</option>
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
                className="px-3 py-1.5 text-xs font-medium bg-[#881337] hover:bg-[#6F0F2C] text-white rounded-lg flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                Filtrar
              </button>
              <button
                type="button"
                onClick={handleExportLogsCsv}
                className="px-3 py-1.5 text-xs font-medium border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 ml-auto"
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
                    <tr key={row.log_id} className="hover:bg-slate-50/70">
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

        {/* Pestaña Usuarios (sin scroll horizontal) */}
        {tab === 'usuarios' && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 overflow-hidden">
            <div className="lg:col-span-8 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cuentas de Acceso
                </h3>
                {usersLoading && <span className="text-xs text-slate-400">Cargando…</span>}
              </div>
              <div className="border border-slate-200 rounded-xl overflow-y-auto overflow-x-hidden flex-1 min-h-0">
                <table className="w-full text-xs border-separate border-spacing-0 table-fixed">
                  <thead>
                    <tr className="text-slate-700">
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left w-[20%]">Usuario</th>
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-left w-[28%]">Nombre / Correo</th>
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2 py-2 text-left w-[10%]">Rol</th>
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2 py-2 text-left w-[17%]">Último acceso</th>
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2 py-2 text-left w-[10%]">Estado</th>
                      <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 px-2.5 py-2 text-right w-[15%]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const locked = u.protegido || u.usuario_id === currentUser.usuario_id;
                      return (
                        <tr key={u.usuario_id} className="hover:bg-slate-50/70">
                          <td className="px-2.5 py-2 font-semibold text-slate-800 border-b border-slate-100 truncate">
                            <span title={u.usuario}>{u.usuario}</span>
                            {u.protegido && (
                              <span className="ml-1 text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                                Protegido
                              </span>
                            )}
                          </td>
                          <td className="px-2.5 py-2 border-b border-slate-100">
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
                          <td className="px-2 py-2 border-b border-slate-100">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                                u.estado === 'A'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {u.estado === 'A' ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-2.5 py-2 text-right border-b border-slate-100 whitespace-nowrap space-x-1">
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
                              className="px-2 py-1 text-[11px] border border-slate-200 rounded hover:bg-slate-100 text-slate-700"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => toggleStatus(u)}
                              title={locked ? 'Cuenta protegida o sesión propia' : u.estado === 'A' ? 'Desactivar' : 'Activar'}
                              className="p-1 text-[11px] border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-35 inline-flex items-center align-middle"
                            >
                              {u.estado === 'A' ? (
                                <UserX className="w-3.5 h-3.5 text-red-700" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 h-fit overflow-y-auto max-h-full">
              {editTarget ? (
                <form onSubmit={handleSaveEdit} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-800">
                      Editar: {editTarget.usuario}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditTarget(null)}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Nombre completo</label>
                    <input
                      value={editForm.nombre_completo}
                      onChange={(e) => setEditForm({ ...editForm, nombre_completo: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  {!editTarget.protegido && (
                    <>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">Correo</label>
                        <input
                          type="email"
                          required
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">Rol</label>
                        <select
                          value={editForm.rol_id}
                          onChange={(e) => setEditForm({ ...editForm, rol_id: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        >
                          {roles.map((r) => (
                            <option key={r.rol_id} value={r.rol_id}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-600 mb-0.5">
                          Nueva contraseña (opcional)
                        </label>
                        <input
                          type="password"
                          value={editForm.password}
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                          placeholder="Dejar vacío para mantener"
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </>
                  )}
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#881337] hover:bg-[#6F0F2C] text-white text-xs font-semibold rounded-lg"
                  >
                    Guardar cambios
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <UserPlus className="w-4 h-4 text-[#881337]" />
                    Nuevo usuario
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Usuario</label>
                    <input
                      required
                      value={newUser.usuario}
                      onChange={(e) => setNewUser({ ...newUser, usuario: e.target.value })}
                      placeholder="Ej. JPEREZ"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Correo</label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="usuario@correo.com"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Nombre completo</label>
                    <input
                      value={newUser.nombre_completo}
                      onChange={(e) => setNewUser({ ...newUser, nombre_completo: e.target.value })}
                      placeholder="Nombre y apellido"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Rol</label>
                    <select
                      value={newUser.rol_id}
                      onChange={(e) => setNewUser({ ...newUser, rol_id: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {roles.map((r) => (
                        <option key={r.rol_id} value={r.rol_id}>
                          {r.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Contraseña inicial</label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#881337] hover:bg-[#6F0F2C] text-white text-xs font-semibold rounded-lg"
                  >
                    Crear cuenta
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

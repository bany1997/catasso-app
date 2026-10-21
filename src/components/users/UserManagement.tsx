import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { User, UserRole, Warehouse } from '../../types';
import {
  Users,
  UserPlus,
  Shield,
  Edit2,
  Trash2,
  Lock,
  Building2,
  Eye,
  EyeOff,
  CheckCircle,
  Plus,
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // New User Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('1234');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('atendente');
  const [targetWarehouseId, setTargetWarehouseId] = useState('wh-luanda');
  const [phone, setPhone] = useState('+244 923 000 000');
  const [companyOrDept, setCompanyOrDept] = useState('');

  // New Warehouse Form State (Superadmin only)
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whProvince, setWhProvince] = useState('Cabinda');
  const [whCity, setWhCity] = useState('');
  const [whAddress, setWhAddress] = useState('');
  const [whCapacity, setWhCapacity] = useState(5000);

  const currentUser = erpStore.currentUser;
  const isSuperadmin = currentUser?.role === 'superadmin';
  const isGestorGeral = currentUser?.role === 'gestor_geral';
  const isResponsavel = currentUser?.role === 'responsavel_armazem';

  // Role visibility rules for users list
  const visibleUsers = erpStore.users.filter(u => {
    if (isSuperadmin) return true;
    if (isGestorGeral) {
      // Gestor Geral sees their warehouse's users + fleet managers + suppliers
      return u.warehouseId === currentUser?.warehouseId || u.warehouseId === 'all';
    }
    if (isResponsavel) {
      // Responsável de armazém sees users in their warehouse
      return u.warehouseId === currentUser?.warehouseId || u.warehouseId === 'all';
    }
    return false;
  });

  // Password visibility rule: "Um responsável de armazém não pode ver a senha de um gestor geral"
  const canSeePassword = (targetUser: User): boolean => {
    if (!currentUser) return false;
    if (currentUser.id === targetUser.id) return true;
    if (isSuperadmin) return true;
    if (isGestorGeral && targetUser.role !== 'superadmin') return true;
    if (isResponsavel) {
      // Responsável cannot see gestor_geral or superadmin password
      if (targetUser.role === 'gestor_geral' || targetUser.role === 'superadmin') {
        return false;
      }
      return true;
    }
    return false;
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) return;

    erpStore.addUser({
      username: username.trim().toLowerCase(),
      password,
      name,
      email,
      role,
      warehouseId: role === 'superadmin' || role === 'gestor_frotas' || role === 'fornecedor' ? 'all' : targetWarehouseId,
      phone,
      isActive: true,
      supplierCompanyName: role === 'fornecedor' ? companyOrDept : undefined,
      clientDepartment: role === 'cliente' ? companyOrDept : undefined,
    });

    setIsAddUserOpen(false);
    setUsername('');
    setName('');
    setEmail('');
    alert('Utilizador cadastrado com sucesso!');
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    erpStore.updateUser(editingUser.id, editingUser);
    setEditingUser(null);
    alert('Dados do utilizador atualizados!');
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Tem certeza de que deseja excluir este utilizador do sistema?')) {
      erpStore.deleteUser(userId);
    }
  };

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim() || !whCode.trim()) return;

    erpStore.addWarehouse({
      name: whName,
      code: whCode.toUpperCase(),
      province: whProvince,
      city: whCity || whProvince,
      address: whAddress,
      generalManagerId: 'user-gestor-luanda',
      totalCapacityM2: whCapacity,
      contactPhone: '+244 923 000 000',
      contactEmail: 'armazem@catasso.co.ao',
      isActive: true,
    });

    setIsAddWarehouseOpen(false);
    setWhName('');
    setWhCode('');
    alert('Novo armazém criado com sucesso pelo Superadministrador!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <span>Gestão de Utilizadores & Credenciais de Acesso</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Administração dos 7 níveis de acesso corporativos, atribuição de armazéns e controle de senhas com proteção hierárquica.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSuperadmin && (
            <button
              type="button"
              onClick={() => setIsAddWarehouseOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Criar Novo Armazém (Superadmin)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cadastrar Novo Utilizador</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Contas de Acesso Cadastradas ({visibleUsers.length})
          </h2>
          <span className="text-xs text-slate-400">
            Senha padrão de teste para todas as contas: <strong className="text-sky-400 font-mono">1234</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-2.5 px-3">Nome Completo</th>
                <th className="py-2.5 px-3">Utilizador (Login)</th>
                <th className="py-2.5 px-3">Nível de Acesso</th>
                <th className="py-2.5 px-3">Armazém Vinculado</th>
                <th className="py-2.5 px-3">Correio Eletrónico</th>
                <th className="py-2.5 px-3">Palavra-passe</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {visibleUsers.map(u => {
                const wh = erpStore.warehouses.find(w => w.id === u.warehouseId);
                const isPasswordVisible = showPasswords[u.id];
                const canSee = canSeePassword(u);

                const roleBadges: Record<string, string> = {
                  superadmin: 'bg-purple-950 text-purple-300 border-purple-800',
                  gestor_geral: 'bg-indigo-950 text-indigo-300 border-indigo-800',
                  responsavel_armazem: 'bg-sky-950 text-sky-300 border-sky-800',
                  gestor_frotas: 'bg-amber-950 text-amber-300 border-amber-800',
                  atendente: 'bg-blue-950 text-blue-300 border-blue-800',
                  cliente: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                  fornecedor: 'bg-orange-950 text-orange-300 border-orange-800',
                };

                return (
                  <tr key={u.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {u.name}
                      {u.supplierCompanyName && (
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {u.supplierCompanyName}
                        </span>
                      )}
                      {u.clientDepartment && (
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {u.clientDepartment}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-sky-400 font-bold">
                      {u.username}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${
                          roleBadges[u.role] || 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                      {u.warehouseId === 'all' ? (
                        <span className="text-slate-400 font-mono">Todos os Armazéns</span>
                      ) : (
                        <span>{wh?.name} ({wh?.province})</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-400 font-mono">
                      {u.email}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {canSee ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-300">
                            {isPasswordVisible ? u.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords({ ...showPasswords, [u.id]: !isPasswordVisible })
                            }
                            className="text-slate-500 hover:text-slate-300"
                          >
                            {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-600" />
                          <span>Confidencial</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingUser({ ...u })}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded"
                          title="Editar Utilizador"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {isSuperadmin && u.username !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"
                            title="Eliminar Utilizador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Cadastrar Novo Utilizador</h3>
                <p className="text-xs text-slate-400">Atribuição de papel e credenciais.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: João Baptista"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome de Utilizador (Login) *</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Ex: j.baptista"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Palavra-passe *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Correio Eletrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="exemplo@catasso.co.ao"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nível de Acesso (Papel) *</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    {isSuperadmin && <option value="superadmin">Superadministrador</option>}
                    {(isSuperadmin || isGestorGeral) && <option value="gestor_geral">Gestor Geral</option>}
                    {(isSuperadmin || isGestorGeral) && <option value="gestor_frotas">Gestor de Frotas</option>}
                    <option value="responsavel_armazem">Responsável de Armazém</option>
                    <option value="atendente">Atendente</option>
                    <option value="cliente">Cliente</option>
                    <option value="fornecedor">Fornecedor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Armazém de Atribuição</label>
                  <select
                    disabled={role === 'superadmin' || role === 'gestor_frotas' || role === 'fornecedor'}
                    value={targetWarehouseId}
                    onChange={e => setTargetWarehouseId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white disabled:opacity-50"
                  >
                    {erpStore.warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.province})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(role === 'fornecedor' || role === 'cliente') && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {role === 'fornecedor' ? 'Empresa Fornecedora' : 'Departamento do Cliente'}
                  </label>
                  <input
                    type="text"
                    value={companyOrDept}
                    onChange={e => setCompanyOrDept(e.target.value)}
                    placeholder={role === 'fornecedor' ? 'Ex: Total Supply Angola Lda' : 'Ex: Manutenção Offshore'}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                >
                  Criar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-sky-400 font-mono font-bold">{editingUser.username}</span>
                <h3 className="font-bold text-base text-white">Editar Conta de Utilizador</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Palavra-passe</label>
                  <input
                    type="text"
                    value={editingUser.password || ''}
                    onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nível de Acesso</label>
                  <select
                    disabled={!isSuperadmin && editingUser.username === 'admin'}
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="superadmin">Superadministrador</option>
                    <option value="gestor_geral">Gestor Geral</option>
                    <option value="responsavel_armazem">Responsável de Armazém</option>
                    <option value="gestor_frotas">Gestor de Frotas</option>
                    <option value="atendente">Atendente</option>
                    <option value="cliente">Cliente</option>
                    <option value="fornecedor">Fornecedor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Armazém</label>
                  <select
                    value={editingUser.warehouseId}
                    onChange={e => setEditingUser({ ...editingUser, warehouseId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="all">Global (Todos os Armazéns)</option>
                    {erpStore.warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.province})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Warehouse Modal (Superadmin only) */}
      {isAddWarehouseOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Criar Nova Unidade de Armazém</h3>
                <p className="text-xs text-slate-400">Expansão de infraestrutura logística de Angola.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWarehouseOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nome do Armazém *</label>
                  <input
                    type="text"
                    required
                    value={whName}
                    onChange={e => setWhName(e.target.value)}
                    placeholder="Ex: Polo Industrial Cabinda"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código da Unidade *</label>
                  <input
                    type="text"
                    required
                    value={whCode}
                    onChange={e => setWhCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ARM-CAB-05"
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Província de Angola *</label>
                  <select
                    value={whProvince}
                    onChange={e => setWhProvince(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                  >
                    <option value="Cabinda">Cabinda</option>
                    <option value="Luanda">Luanda</option>
                    <option value="Benguela">Benguela</option>
                    <option value="Huambo">Huambo</option>
                    <option value="Zaire">Zaire</option>
                    <option value="Namibe">Namibe</option>
                    <option value="Cuanza Sul">Cuanza Sul</option>
                    <option value="Huíla">Huíla</option>
                    <option value="Uíge">Uíge</option>
                    <option value="Malanje">Malanje</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Capacidade (m²)</label>
                  <input
                    type="number"
                    min="500"
                    value={whCapacity}
                    onChange={e => setWhCapacity(parseInt(e.target.value, 10) || 5000)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Endereço / Localização</label>
                <input
                  type="text"
                  value={whAddress}
                  onChange={e => setWhAddress(e.target.value)}
                  placeholder="Ex: Zona Franca de Fútila, Lote 3"
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddWarehouseOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                >
                  Criar Armazém
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

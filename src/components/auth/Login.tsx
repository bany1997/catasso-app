import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { translations } from '../../services/i18n';
import { Language, UserRole } from '../../types';
import { Lock, User as UserIcon, Warehouse as WarehouseIcon, Globe, Shield, ArrowRight, CheckCircle2, Building2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('wh-luanda');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDemoProfiles, setShowDemoProfiles] = useState(false);

  const t = translations[erpStore.language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const res = erpStore.login(username, password, selectedWarehouseId);
    if (res.success) {
      onLoginSuccess();
    } else {
      setErrorMessage(res.message || 'Erro ao efetuar login.');
    }
  };

  const handleQuickDemoSelect = (u: { username: string; warehouseId: string }) => {
    setUsername(u.username);
    setPassword('1234');
    setSelectedWarehouseId(u.warehouseId);
    setErrorMessage('');
  };

  const changeLanguage = (lang: Language) => {
    erpStore.setLanguage(lang);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-sky-600 selection:text-white">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600" />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-sky-600 p-3 rounded-xl text-white shadow-lg shadow-sky-600/30">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">CATASSO ERP</h1>
              <p className="text-xs text-slate-400">Logística Industrial & Supply Chain</p>
            </div>
          </div>

          <button
            onClick={() => changeLanguage(erpStore.language === 'pt' ? 'en' : 'pt')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          >
            <Globe size={14} className="text-sky-400" />
            <span className="uppercase font-medium">{erpStore.language}</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Utilizador</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <UserIcon size={16} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Insira o seu utilizador"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Palavra-passe</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Armazém Operacional</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <WarehouseIcon size={16} />
              </span>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors appearance-none"
              >
                {erpStore.warehouses.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                    {w.name} ({w.province})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 text-sm mt-2"
          >
            <span>Entrar no Sistema</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800 text-center">
          <button
            onClick={() => setShowDemoProfiles(!showDemoProfiles)}
            className="text-xs text-sky-400 hover:underline"
          >
            {showDemoProfiles ? 'Ocultar Perfis de Demonstração' : 'Ver Perfis de Demonstração Rápida'}
          </button>

          {showDemoProfiles && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoSelect({ username: 'admin', warehouseId: 'wh-luanda' })}
                className="bg-slate-800 hover:bg-slate-700 text-left p-2.5 rounded-lg border border-slate-700 transition-colors text-xs"
              >
                <div className="font-semibold text-white">Admin Geral</div>
                <div className="text-[10px] text-slate-400">Luanda Hub</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoSelect({ username: 'logistica', warehouseId: 'wh-lobito' })}
                className="bg-slate-800 hover:bg-slate-700 text-left p-2.5 rounded-lg border border-slate-700 transition-colors text-xs"
              >
                <div className="font-semibold text-white">Logística</div>
                <div className="text-[10px] text-slate-400">Lobito Port</div>
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-[10px] text-slate-500">
          República de Angola · Desenvolvido por Albano Catasso
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { erpStore } from '../../services/store';
import { translations } from '../../services/i18n';
import { Language } from '../../types';
import {
  Warehouse as WarehouseIcon,
  LogOut,
  Globe,
  Shield,
  User as UserIcon,
  Bell,
  ChevronDown,
  Info,
  CheckCircle,
} from 'lucide-react';

interface HeaderProps {
  onLogout: () => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, activeTab }) => {
  const [showWarehouseMenu, setShowWarehouseMenu] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);

  const currentUser = erpStore.currentUser;
  const activeWarehouse = erpStore.getActiveWarehouse();
  const t = translations[erpStore.language];

  const canSwitchWarehouse =
    currentUser?.role === 'superadmin' ||
    currentUser?.role === 'gestor_frotas' ||
    currentUser?.role === 'fornecedor';

  const roleLabels: Record<string, string> = {
    superadmin: 'Superadministrador',
    gestor_geral: 'Gestor Geral',
    responsavel_armazem: 'Responsável de Armazém',
    gestor_frotas: 'Gestor de Frotas & Equipamentos',
    atendente: 'Atendente de Armazém',
    cliente: 'Cliente / Solicitante',
    fornecedor: 'Fornecedor Homologado',
  };

  const handleWarehouseChange = (whId: string) => {
    erpStore.switchWarehouse(whId);
    setShowWarehouseMenu(false);
  };

  const toggleLanguage = () => {
    const nextLang: Language = erpStore.language === 'pt' ? 'en' : 'pt';
    erpStore.setLanguage(nextLang);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
      {/* Brand & System Identifier */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-sky-500 to-blue-700 p-2.5 rounded-xl text-white font-bold tracking-wider shadow-lg shadow-sky-500/20">
          CATASSO
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-white leading-none tracking-wide">CATASSO ERP</h1>
            <button
              onClick={() => setShowCreatorModal(true)}
              className="text-slate-400 hover:text-sky-400 transition-colors"
              title="Informações do Sistema & Autor"
            >
              <Info size={14} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {t?.appSubtitle || 'Logística Industrial & Supply Chain · Angola'}
          </p>
        </div>
      </div>

      {/* Control Actions & User Info */}
      <div className="flex items-center gap-3">
        {/* Seletor de Armazém Operacional */}
        <div className="relative">
          <button
            onClick={() => canSwitchWarehouse && setShowWarehouseMenu(!showWarehouseMenu)}
            disabled={!canSwitchWarehouse}
            className={`flex items-center gap-2 text-xs px-3.5 py-2 rounded-xl border transition-colors ${
              canSwitchWarehouse
                ? 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 border-slate-700 cursor-pointer'
                : 'bg-slate-900/50 text-slate-400 border-slate-800 cursor-not-allowed'
            }`}
          >
            <WarehouseIcon size={14} className="text-sky-400" />
            <span className="font-medium">{activeWarehouse ? activeWarehouse.name : 'Selecionar Armazém'}</span>
            {canSwitchWarehouse && <ChevronDown size={12} className="text-slate-400" />}
          </button>

          {showWarehouseMenu && canSwitchWarehouse && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50">
              <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Unidades Operacionais
              </div>
              {erpStore.warehouses.map(w => (
                <button
                  key={w.id}
                  onClick={() => handleWarehouseChange(w.id)}
                  className={`w-full text-left px-3 py-2.5 text-xs hover:bg-slate-800/80 transition-colors flex items-center justify-between ${
                    activeWarehouse?.id === w.id ? 'text-sky-400 font-medium bg-slate-800/50' : 'text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-medium">{w.name}</div>
                    <div className="text-[10px] text-slate-500">{w.province}</div>
                  </div>
                  {activeWarehouse?.id === w.id && <CheckCircle size={14} className="text-sky-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Seletor de Idioma */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 px-3 py-2 rounded-xl border border-slate-700 transition-colors"
          title="Alternar Idioma"
        >
          <Globe size={14} className="text-sky-400" />
          <span className="uppercase font-medium">{erpStore.language}</span>
        </button>

        {/* Perfil do Utilizador */}
        {currentUser && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/50 px-3.5 py-2 rounded-xl border border-slate-800">
            <UserIcon size={14} className="text-sky-400" />
            <span className="font-medium">{currentUser.name}</span>
            <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded uppercase font-semibold">
              {roleLabels[currentUser.role] || currentUser.role}
            </span>
          </div>
        )}

        {/* Sair */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 rounded-xl border border-rose-500/20 transition-all font-medium"
        >
          <LogOut size={14} />
          <span className="hidden md:inline">Sair</span>
        </button>
      </div>

      {/* Modal de Créditos / Autor */}
      {showCreatorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2">CATASSO ERP</h3>
            <p className="text-xs text-slate-400 mb-4">
              Sistema Integrado de Logística, Armazéns e Cadeia de Suprimentos para operações industriais em Angola.
            </p>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs text-slate-300 mb-6">
              <div><strong>Conceção & Desenvolvimento:</strong> Albano Luana do Nascimento Catasso</div>
              <div><strong>Contacto:</strong> alncatasso@gmail.com</div>
              <div><strong>Versão:</strong> 1.0.0 (Production Release)</div>
            </div>
            <button
              onClick={() => setShowCreatorModal(false)}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 rounded-xl text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

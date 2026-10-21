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

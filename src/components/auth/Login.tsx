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

import React, { useState, useEffect } from 'react';
import { erpStore } from './services/store';
import { Login } from './components/auth/Login';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { GeneralDashboard } from './components/dashboard/GeneralDashboard';
import { ProductCatalog } from './components/inventory/ProductCatalog';
import { StockMovements } from './components/inventory/StockMovements';
import { ChemicalAndCalibration } from './components/inventory/ChemicalAndCalibration';
import { WarehouseLayout } from './components/inventory/WarehouseLayout';
import { Transfers } from './components/inventory/Transfers';
import { PurchaseOrders } from './components/purchases/PurchaseOrders';
import { ReceivingInspection } from './components/purchases/ReceivingInspection';
import { SupplierPortal } from './components/supplier/SupplierPortal';
import { FleetManagement } from './components/fleet/FleetManagement';
import { RncManagement } from './components/rnc/RncManagement';
import { AnalyticsAndReports } from './components/reports/AnalyticsAndReports';
import { UserManagement } from './components/users/UserManagement';

export default function App() {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    // Subscribe to central reactive store
    const unsubscribe = erpStore.subscribe(() => {
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, []);

  // Set default tab based on user role when user changes
  useEffect(() => {
    if (erpStore.currentUser?.role === 'fornecedor') {
      setActiveTab('supplierPortal');
    } else if (erpStore.currentUser?.role === 'gestor_frotas') {
      setActiveTab('fleet');
    }
  }, [erpStore.currentUser]);

  // If not authenticated, render Login
  if (!erpStore.currentUser) {
    return <Login onLoginSuccess={() => setActiveTab('dashboard')} />;
  }

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <GeneralDashboard onNavigate={tabId => setActiveTab(tabId)} />;
      case 'catalog':
        return <ProductCatalog />;
      case 'movements':
        return <StockMovements />;
      case 'purchases':
        return <PurchaseOrders onNavigateToInspection={() => setActiveTab('receiving')} />;
      case 'receiving':
        return <ReceivingInspection />;
      case 'supplierPortal':
        return <SupplierPortal />;
      case 'chemicals_calibration':
        return <ChemicalAndCalibration />;
      case 'transfers':
        return <Transfers />;
      case 'fleet':
        return <FleetManagement />;
      case 'locations':
        return <WarehouseLayout />;
      case 'rnc':
        return <RncManagement />;
      case 'reports':
        return <AnalyticsAndReports />;
      case 'users':
        return <UserManagement />;
      default:
        return <GeneralDashboard onNavigate={tabId => setActiveTab(tabId)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-sky-600 selection:text-white">
      {/* Top Header */}
      <Header onLogout={() => erpStore.logout()} activeTab={activeTab} />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderActiveModule()}

            {/* Bottom System Creator Badge */}
            <div className="pt-8 pb-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
              <div>
                <strong>CATASSO</strong> ERP de Logística Industrial & Gestão Integrada · República de Angola
              </div>
              <div>
                Sistema concebido por: <strong className="text-slate-400">Albano Luana do Nascimento Catasso</strong> (
                <a href="mailto:alncatasso@gmail.com" className="text-sky-500 hover:underline">
                  alncatasso@gmail.com
                </a>
                )
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

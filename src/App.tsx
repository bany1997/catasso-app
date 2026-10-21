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

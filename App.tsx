import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { OrderProvider } from "./contexts/OrderContext";
import { CustomerProvider } from "./contexts/CustomerContext";
import { AuthProvider } from "./contexts/AuthContext";
import OfflineDetector from "./components/OfflineDetector";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardPage from "./pages/Dashboard/index";
import OrdersPage from "./pages/Orders/index";
import TransactionsPage from "./pages/Transactions/index";
import InventoryPage from "./pages/Inventory/index";
import StoragePage from "./pages/Storage/index";
import CustomersPage from "./pages/Customers/index";
import UsersPage from "./pages/Users/index";
import SettingsPage from "./pages/Settings/index";
import LoginPage from "./pages/Login/index";
import { Toaster } from "react-hot-toast";

const App: React.FC = () => {
  return (
    <OfflineDetector>
      <HashRouter>
        <AuthProvider>
          <LanguageProvider>
            <OrderProvider>
              <CustomerProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<DashboardPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="transactions" element={<TransactionsPage />} />
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="storage" element={<StoragePage />} />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </CustomerProvider>
            </OrderProvider>
          </LanguageProvider>
        </AuthProvider>
      </HashRouter>
      <Toaster position="top-center" reverseOrder={false} />
    </OfflineDetector>
  );
};

export default App;
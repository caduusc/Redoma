import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChatProvider } from './context/ChatContext';
import { ProviderProvider } from './context/ProviderContext';
import ClientStart from './pages/ClientStart';
import ClientChat from './pages/ClientChat';
import ClientProviders from './pages/ClientProviders';
import AgentLogin from './pages/AgentLogin';
import AgentInbox from './pages/AgentInbox';
import AgentChat from './pages/AgentChat';
import AdminLogin from './pages/AdminLogin';
import AdminProviders from './pages/AdminProviders';
import AdminGuard from './components/AdminGuard';

const App: React.FC = () => {
  return (
    <ChatProvider>
      <ProviderProvider>
        <Router>
          <Routes>
            {/* Client Routes */}
            <Route path="/client/start" element={<ClientStart />} />
            <Route path="/client/chat" element={<ClientChat />} />
            <Route path="/client/providers" element={<ClientProviders />} />

            {/* Agent Routes */}
            <Route path="/agent/login" element={<AgentLogin />} />
            <Route
              path="/agent/inbox"
              element={
                <AdminGuard redirectTo="/agent/login">
                  <AgentInbox />
                </AdminGuard>
              }
            />
            <Route
              path="/agent/chat/:conversationId"
              element={
                <AdminGuard redirectTo="/agent/login">
                  <AgentChat />
                </AdminGuard>
              }
            />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/providers" element={<AdminProviders />} />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/client/start" replace />} />
            <Route path="*" element={<Navigate to="/client/start" replace />} />
          </Routes>
        </Router>
      </ProviderProvider>
    </ChatProvider>
  );
};

export default App;

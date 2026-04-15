// App.tsx
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { ChatProvider } from './context/ChatContext';
import { ProviderProvider } from './context/ProviderContext';
import { CommunityProvider } from './context/CommunityContext';

import ClientStart from './pages/ClientStart';
import ClientChat from './pages/ClientChat';
import ClientProviders from './pages/ClientProviders';
import ClientCommunities from './pages/ClientCommunities';

import AgentLogin from './pages/AgentLogin';
import AgentInbox from './pages/AgentInbox';
import AgentChat from './pages/AgentChat';

import AdminLogin from './pages/AdminLogin';
import AdminProviders from './pages/AdminProviders';
import AdminCommunities from './pages/AdminCommunities';

import { ImpactPointsPage } from './src/features/ImpactPoints';

import AdminGuard from './components/AdminGuard';
import SupportGuard from './components/SupportGuard';
import AgentToastContainer from './components/AgentToastContainer';

const App: React.FC = () => {
  return (
    <ChatProvider>
      <ProviderProvider>
        <CommunityProvider>
          <Router>
            <AgentToastContainer />
            <Routes>
              {/* Client Routes (sem atrito) */}
              <Route path="/client/start" element={<ClientStart />} />
              <Route path="/client/chat" element={<ClientChat />} />
              <Route path="/client/providers" element={<ClientProviders />} />
              <Route path="/client/communities" element={<ClientCommunities />} />
              <Route
                path="/client/impact-points"
                element={<ImpactPointsPage onBack={() => window.history.back()} />}
              />

              {/* Support (com atrito / login) */}
              <Route path="/agent/login" element={<AgentLogin />} />
              <Route
                path="/agent/inbox"
                element={
                  <SupportGuard redirectTo="/agent/login">
                    <AgentInbox />
                  </SupportGuard>
                }
              />
              <Route
                path="/agent/chat/:conversationId"
                element={
                  <SupportGuard redirectTo="/agent/login">
                    <AgentChat />
                  </SupportGuard>
                }
              />

              {/* Master (com atrito / login) */}
              <Route path="/admin/login" element={<AdminLogin />} />

              <Route
                path="/admin/providers"
                element={
                  <AdminGuard redirectTo="/admin/login">
                    <AdminProviders />
                  </AdminGuard>
                }
              />

              <Route
                path="/admin/communities"
                element={
                  <AdminGuard redirectTo="/admin/login">
                    <AdminCommunities />
                  </AdminGuard>
                }
              />

              {/* Redirects */}
              <Route path="/" element={<Navigate to="/client/start" replace />} />
              <Route path="*" element={<Navigate to="/client/start" replace />} />
            </Routes>
          </Router>
        </CommunityProvider>
      </ProviderProvider>
    </ChatProvider>
  );
};

export default App;
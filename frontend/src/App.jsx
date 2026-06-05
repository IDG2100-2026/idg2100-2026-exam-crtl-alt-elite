import './App.css';
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from './providers/AuthProvider.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import MainLayout from './layouts/MainLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import AboutPage from './pages/StaticPages/AboutPage.jsx';
import AboutDicePage from './pages/StaticPages/AboutDicePage.jsx';
import TermsPage from './pages/StaticPages/TermsPage.jsx';
import PrivacyPage from './pages/StaticPages/PrivacyPage.jsx';
import NotFoundPage from './pages/StaticPages/NotFoundPage.jsx';

import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import VerifyEmail from './pages/VerifyEmail/VerifyEmail.jsx';

import Home from './pages/HomePage/Home.jsx';
import LobbyPage from './pages/Lobby/LobbyPage.jsx';
import GamePage from './pages/GamePage/GamePage.jsx';
import ProfilePage from './pages/Profile/ProfilePage.jsx';
import CreateGame from './pages/CreateGame/CreateGame.jsx';

import TournamentListPage from './pages/Tournament/TournamentList/TournamentList.jsx';
import TournamentPage from './pages/Tournament/TournamentPage/TournamentPage.jsx';

import LeaderboardPage from './pages/Leaderboard/LeaderboardPage.jsx';

import AdminLayout from './layouts/AdminLayout.jsx';
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import AdminUsers from './pages/Admin/AdminUsers.jsx';
import AdminComments from './pages/Admin/AdminComments.jsx';

function AppRoutes() {
    const { loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    return (
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="howToPlay" element={<AboutDicePage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />

          <Route path="lobby" element={<LobbyPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="tournaments" element={<TournamentListPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="createGame" element={<CreateGame />} />
            <Route path="games/:id" element={<GamePage />} />
            <Route path="tournaments/:id" element={<TournamentPage />} />
          </Route>

          <Route path="profile/:id" element={<ProfilePage />} />
        </Route>

        <Route element={<ProtectedRoute requireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/comments" element={<AdminComments />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
    </Routes>
    );
}

function App() {
    return (
        <SettingsProvider>
            <AuthProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </AuthProvider>
        </SettingsProvider>
    );
}

export default App;

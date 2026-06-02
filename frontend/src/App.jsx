import './App.css';
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from './providers/AuthProvider.jsx';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import MainLayout from './layouts/MainLayout.jsx';

// Static pages
import AboutPage from './pages/StaticPages/AboutPage.jsx';
import AboutDicePage from './pages/StaticPages/AboutDicePage.jsx';
import TermsPage from './pages/StaticPages/TermsPage.jsx';
import PrivacyPage from './pages/StaticPages/PrivacyPage.jsx';
import NotFoundPage from './pages/StaticPages/NotFoundPage.jsx';

// Auth pages
import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import VerifyEmail from './pages/VerifyEmail/VerifyEmail.jsx';

// Main pages
import Home from './pages/HomePage/Home.jsx';
import LobbyPage from './pages/Lobby/LobbyPage.jsx';
import GamePage from './pages/GamePage/GamePage.jsx';
import ProfilePage from './pages/Profile/ProfilePage.jsx';
import CreateGame from './pages/CreateGame/CreateGame.jsx';

// Tournament pages - uncomment when created
import TournamentListPage from './pages/Tournament/TournamentList/TournamentList.jsx';
import TournamentPage from './pages/Tournament/TournamentPage/TournamentPage.jsx';

// Leaderboard
import LeaderboardPage from './pages/Leaderboard/LeaderboardPage.jsx';

// Admin pages
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
          {/* Public routes */}
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="howToPlay" element={<AboutDicePage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />

          {/* Game routes */}
          
          <Route path="createGame" element={<CreateGame />} />
          <Route path="lobby" element={<LobbyPage />} />
          <Route path="games/:id" element={<GamePage />} />

          {/* Tournament routes. uncomment when created */}
          <Route path="tournaments" element={<TournamentListPage />} />
          <Route path="tournaments/:id" element={<TournamentPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />

          {/* Profile routes */}
          <Route path="profile/:id" element={<ProfilePage />} />
        </Route>

        <Route element={<AdminLayout />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/comments" element={<AdminComments />} />
        </Route>

        {/* 404 */}
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
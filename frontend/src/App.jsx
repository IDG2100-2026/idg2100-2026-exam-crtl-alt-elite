import './App.css';
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from './context/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import AdminLayout from "./layouts/AdminLayout";

// Protected auth
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Home from './pages/HomePage/Home';
import LobbyPage from "./pages/Lobby/LobbyPage";
import CreateGame from './pages/CreateGame/CreateGame';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ProfilePage from './pages/Profile/ProfilePage';
import TournamentList from './pages/Tournaments/TournamentList';
// import TournamentDetail from './pages/Tournaments/TournamentDetail';
import AboutPage from './pages/StaticPages/AboutPage';
import AboutDicePage from './pages/StaticPages/AboutDicePage';
import TermsPage from './pages/StaticPages/TermsPage';
import PrivacyPage from './pages/StaticPages/PrivacyPage';
import NotFoundPage from './pages/StaticPages/NotFoundPage';

// Admin pages
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminUsers from "./pages/Admin/AdminUsers";
import AdminComments from "./pages/Admin/AdminComments";
import AdminTournaments from "./pages/Admin/AdminTournaments";


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="tournaments" element={<TournamentList />} />
            {/* <Route path="tournaments/:id" element={<TournamentDetail />} /> */}
            <Route path="lobby" element={<LobbyPage />} />
            <Route path="createGame" element={<CreateGame />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="howToPlay" element={<AboutDicePage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="profile/:id" element={<ProfilePage />} />
          </Route>

          <Route element={<ProtectedRoute requireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/comments" element={<AdminComments />} />
              <Route path="admin/tournaments" element={<AdminTournaments />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

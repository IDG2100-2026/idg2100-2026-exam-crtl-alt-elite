import './App.css'
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/HomePage/Home';
import CreateGame from './pages/CreateGame/CreateGame';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import AboutPage from './pages/StaticPages/AboutPage';
import AboutDicePage from './pages/StaticPages/AboutDicePage';
import TermsPage from './pages/StaticPages/TermsPage';
import PrivacyPage from './pages/StaticPages/PrivacyPage';
import NotFoundPage from './pages/StaticPages/NotFoundPage';
import ProfilePage from './pages/Profile/ProfilePage';
import LobbyPage from './pages/Lobby/LobbyPage';
import GamePage from './pages/GamePage/GamePage';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="createGame" element={<CreateGame />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="howToPlay" element={<AboutDicePage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="profile/:id" element={<ProfilePage />} />
            <Route path="lobby" element={<LobbyPage />} />
            <Route path="games/:id" element={<GamePage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App;

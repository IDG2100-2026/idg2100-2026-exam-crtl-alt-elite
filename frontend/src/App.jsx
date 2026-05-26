import './App.css'
import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/HomePage/Home';
import CreateGame from './pages/CreateGame/CreateGame';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/createGame" element={<CreateGame />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App;

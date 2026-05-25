import './App.css'
import { BrowserRouter, Routes, Route } from "react-router";
import MainLayout from './layouts/MainLayout';
import Home from './pages/HomePage/Home';
import CreateGame from './pages/CreateGame/CreateGame';


function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home/>}/>
            <Route path="/createGame" element={<CreateGame/>}/>
          </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import KandinskyCanvas from './components/KandinskyCanvas';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Packages from './pages/Packages';
import Order from './pages/Order';
import Success from './pages/Success';
import Login from './pages/Login';
import Admin from './pages/Admin';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <KandinskyCanvas />
        <Navigation />
        <main className="page-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/order/:packageId" element={<Order />} />
            <Route path="/success" element={<Success />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

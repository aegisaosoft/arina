import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

export default function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="nav">
      <Link to="/" className="nav-logo">
        <span className="logo-text">IS</span>
      </Link>
      
      <div className="nav-links">
        <Link 
          to="/" 
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          Home
        </Link>
        <Link 
          to="/packages" 
          className={`nav-link ${location.pathname.includes('/packages') ? 'active' : ''}`}
        >
          Packages
        </Link>
        <Link 
          to="/admin" 
          className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
        >
          Admin
        </Link>
      </div>
      
      <Link to="/packages" className="nav-cta">
        Start Project
      </Link>
    </nav>
  );
}

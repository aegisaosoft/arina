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
          to="/donate" 
          className={`nav-link donate-link ${location.pathname.includes('/donate') ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Donate
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

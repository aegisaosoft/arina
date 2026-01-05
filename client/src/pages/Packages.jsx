import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Packages.css';

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/packages');
      if (!response.ok) throw new Error('Failed to fetch packages');
      const data = await response.json();
      setPackages(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (packageId) => {
    navigate(`/order/${packageId}`);
  };

  if (loading) {
    return (
      <div className="packages-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading packages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="packages-page">
        <div className="error">
          <p>Error: {error}</p>
          <button onClick={fetchPackages} className="btn btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="packages-page">
      <header className="packages-header">
        <h1 className="page-title">Design Packages</h1>
        <p className="page-subtitle">
          Choose the perfect package for your project. All packages include 
          dedicated support and satisfaction guarantee.
        </p>
      </header>

      <div className="packages-grid">
        {packages.map((pkg, index) => (
          <div 
            key={pkg.id} 
            className={`package-card ${index === 1 ? 'featured' : ''}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {index === 1 && <div className="featured-badge">Most Popular</div>}
            
            <div className="package-header">
              <h2 className="package-name">{pkg.name}</h2>
              <p className="package-description">{pkg.description}</p>
            </div>
            
            <div className="package-price">
              <span className="price-amount">{pkg.priceFormatted}</span>
              <span className="price-note">one-time</span>
            </div>
            
            <ul className="package-features">
              {pkg.features.map((feature, i) => (
                <li key={i}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            
            <div className="package-delivery">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              {pkg.delivery_days}-day delivery
            </div>
            
            <button 
              className={`btn ${index === 1 ? 'btn-accent' : 'btn-primary'} package-cta`}
              onClick={() => handleSelectPackage(pkg.id)}
            >
              Get Started
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12H19M19 12L12 5M19 12L12 19"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="packages-footer">
        <h3>Need something custom?</h3>
        <p>
          Contact me directly for enterprise solutions and custom requirements.
        </p>
        <a href="mailto:irene.skvorzowa@crystalprismsoftware.com" className="btn btn-secondary">
          Get in Touch
        </a>
      </div>
    </div>
  );
}

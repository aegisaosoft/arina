import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import './Order.css';

// Dynamic Stripe loading
let stripePromise = null;
const getStripe = async () => {
  if (!stripePromise) {
    try {
      const response = await fetch('/api/settings/stripe-publishable-key');
      const data = await response.json();
      const key = data.key || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here';
      stripePromise = loadStripe(key);
    } catch {
      stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here');
    }
  }
  return stripePromise;
};

export default function Order() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    projectDescription: ''
  });

  useEffect(() => {
    fetchPackage();
  }, [packageId]);

  const fetchPackage = async () => {
    try {
      const response = await fetch(`/api/packages/${packageId}`);
      if (!response.ok) throw new Error('Package not found');
      const data = await response.json();
      setPkg(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          ...formData
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="order-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !pkg) {
    return (
      <div className="order-page">
        <div className="error">
          <p>Error: {error}</p>
          <button onClick={() => navigate('/packages')} className="btn btn-secondary">
            Back to Packages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="order-page">
      <div className="order-container">
        <div className="order-summary">
          <h2>Order Summary</h2>
          
          <div className="summary-card">
            <h3>{pkg.name} Package</h3>
            <p className="summary-description">{pkg.description}</p>
            
            <ul className="summary-features">
              {pkg.features.map((feature, i) => (
                <li key={i}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            
            <div className="summary-delivery">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              Delivery in {pkg.delivery_days} days
            </div>
            
            <div className="summary-price">
              <span className="price-label">Total</span>
              <span className="price-amount">{pkg.priceFormatted}</span>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/packages')} 
            className="btn btn-secondary change-btn"
          >
            ← Change Package
          </button>
        </div>
        
        <div className="order-form-container">
          <h2>Your Details</h2>
          
          <form onSubmit={handleSubmit} className="order-form">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                className="form-input"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleInputChange}
                className="form-input"
                placeholder="john@example.com"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleInputChange}
                className="form-input"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Project Description</label>
              <textarea
                name="projectDescription"
                value={formData.projectDescription}
                onChange={handleInputChange}
                className="form-input form-textarea"
                placeholder="Tell me about your project, goals, and any specific requirements..."
                rows={5}
              />
            </div>
            
            {error && (
              <div className="form-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              className="btn btn-accent submit-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="btn-spinner"></span>
                  Processing...
                </>
              ) : (
                <>
                  Proceed to Payment
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19"/>
                  </svg>
                </>
              )}
            </button>
            
            <p className="payment-note">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Secure payment powered by Stripe
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './Success.css';

export default function Success() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (err) {
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="success-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-container animate-fadeInUp">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="9,12 12,15 16,10"/>
          </svg>
        </div>
        
        <h1>Payment Successful!</h1>
        <p className="success-message">
          Thank you for your order. We're excited to start working on your project!
        </p>
        
        {order && (
          <div className="order-details">
            <h2>Order Details</h2>
            
            <div className="detail-row">
              <span className="detail-label">Order ID</span>
              <span className="detail-value">{order.id.slice(0, 8)}...</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Package</span>
              <span className="detail-value">{order.package_name}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Amount</span>
              <span className="detail-value">${(order.price / 100).toLocaleString()}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value status-badge">{order.status}</span>
            </div>
          </div>
        )}
        
        <div className="next-steps">
          <h3>What's Next?</h3>
          <ul>
            <li>
              <span className="step-number">1</span>
              <span>You'll receive a confirmation email shortly</span>
            </li>
            <li>
              <span className="step-number">2</span>
              <span>I'll review your project details and reach out within 24 hours</span>
            </li>
            <li>
              <span className="step-number">3</span>
              <span>We'll schedule a kickoff call to discuss your vision</span>
            </li>
          </ul>
        </div>
        
        <div className="success-actions">
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
          <a href="mailto:irene.skvorzowa@crystalprismsoftware.com" className="btn btn-secondary">
            Contact Me
          </a>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './DonateSuccess.css';

export default function DonateSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionId) {
      fetchDonation();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const fetchDonation = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec timeout
      
      const response = await fetch(`/api/donations/session/${sessionId}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error('Donation fetch failed:', response.status);
        throw new Error('Donation not found');
      }
      const data = await response.json();
      setDonation(data);
    } catch (err) {
      console.error('Error fetching donation:', err);
      setError(err.name === 'AbortError' ? 'Request timed out' : err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="donate-success-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show success page even if we couldn't fetch donation details
  return (
    <div className="donate-success-page">
      <div className="success-container">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <div className="success-checkmark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
        </div>
        
        <h1>Thank You!</h1>
        <p className="success-message">
          Your generous donation means the world to me. 
          Your support helps me continue creating and pursuing my passion.
        </p>

        {error && (
          <p className="error-note">Could not load donation details, but your payment was successful!</p>
        )}

        {donation && (
          <div className="donation-details">
            <div className="detail-row">
              <span className="detail-label">Amount</span>
              <span className="detail-value amount">{donation.amountFormatted}</span>
            </div>
            
            <div className="detail-row">
              <span className="detail-label">From</span>
              <span className="detail-value">{donation.donor_name || 'Anonymous'}</span>
            </div>
            
            {donation.message && (
              <div className="detail-row message-row">
                <span className="detail-label">Your Message</span>
                <span className="detail-value message">"{donation.message}"</span>
              </div>
            )}
            
            <div className="detail-row">
              <span className="detail-label">Receipt sent to</span>
              <span className="detail-value">{donation.donor_email}</span>
            </div>
          </div>
        )}

        <div className="success-actions">
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
          <Link to="/donate" className="btn btn-secondary">
            Donate Again
          </Link>
        </div>

        <p className="share-message">
          💜 Share your support and inspire others!
        </p>
      </div>
    </div>
  );
}

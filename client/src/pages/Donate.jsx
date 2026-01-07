import { useState } from 'react';
import './Donate.css';

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000]; // в центах

export default function Donate() {
  const [amount, setAmount] = useState(1000); // $10 по умолчанию
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handlePresetClick = (preset) => {
    setAmount(preset);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setCustomAmount(value);
    setIsCustom(true);
    if (value) {
      setAmount(Math.round(parseFloat(value) * 100));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (amount < 100) {
      setError('Minimum donation amount is $1.00');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/create-donation-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          donorName: isAnonymous ? 'Anonymous' : donorName,
          donorEmail,
          message,
          isAnonymous
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create donation session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const formatAmount = (cents) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  return (
    <div className="donate-page">
      <div className="donate-container">
        <div className="donate-header">
          <div className="donate-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <h1>Support My Work</h1>
          <p className="donate-subtitle">
            Your support helps me continue creating beautiful designs 
            and pursuing creative projects. Every contribution makes a difference!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="donate-form">
          <div className="amount-section">
            <label className="form-label">Select Amount</label>
            
            <div className="preset-amounts">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`preset-btn ${amount === preset && !isCustom ? 'active' : ''}`}
                  onClick={() => handlePresetClick(preset)}
                >
                  {formatAmount(preset)}
                </button>
              ))}
            </div>

            <div className="custom-amount">
              <span className="currency-symbol">$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Custom amount"
                value={customAmount}
                onChange={handleCustomAmountChange}
                className={`form-input custom-input ${isCustom ? 'active' : ''}`}
              />
            </div>

            <div className="selected-amount">
              You're donating: <strong>{formatAmount(amount)}</strong>
            </div>
          </div>

          <div className="donor-section">
            <div className="anonymous-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <span className="toggle-switch"></span>
                Donate anonymously
              </label>
            </div>

            {!isAnonymous && (
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="form-input"
                  placeholder="John Doe"
                  required={!isAnonymous}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="form-input"
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Leave a Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="form-input form-textarea"
                placeholder="Share some kind words or let me know why you're supporting..."
                rows={3}
              />
            </div>
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
            className="btn btn-accent donate-btn"
            disabled={submitting || amount < 100}
          >
            {submitting ? (
              <>
                <span className="btn-spinner"></span>
                Processing...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Donate {formatAmount(amount)}
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
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Admin.css';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem('admin_token');

  useEffect(() => {
    verifyAuth();
  }, []);

  const verifyAuth = async () => {
    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('/api/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        localStorage.removeItem('admin_token');
        navigate('/login');
        return;
      }
      fetchOrders();
      fetchDonations();
    } catch {
      navigate('/login');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/login');
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDonations = async () => {
    try {
      const response = await fetch('/api/donations', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.status === 401) return;
      if (!response.ok) throw new Error('Failed to fetch donations');
      const data = await response.json();
      setDonations(data);
    } catch (err) {
      console.error('Error fetching donations:', err);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.status === 401) {
        localStorage.removeItem('admin_token');
        navigate('/login');
        return;
      }
      if (!response.ok) throw new Error('Failed to update order');
      
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      alert('Error updating order: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#66ff99';
      case 'pending': return '#ffff66';
      case 'in_progress': return '#00ffff';
      case 'completed': return '#ff33cc';
      case 'cancelled': return '#ff6464';
      default: return '#ffffff';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-actions">
          <button onClick={() => { fetchOrders(); fetchDonations(); }} className="btn btn-secondary refresh-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
          <button onClick={handleLogout} className="btn btn-secondary logout-btn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          Error: {error}
        </div>
      )}

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => { setActiveTab('orders'); setSelectedDonation(null); }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
          </svg>
          Orders ({orders.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'donations' ? 'active' : ''}`}
          onClick={() => { setActiveTab('donations'); setSelectedOrder(null); }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          Donations ({donations.length})
        </button>
      </div>

      {activeTab === 'orders' ? (
        <>
          <div className="admin-stats">
            <div className="stat-card">
              <div className="stat-value">{orders.length}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{orders.filter(o => o.status === 'paid').length}</div>
              <div className="stat-label">Paid</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{orders.filter(o => o.status === 'in_progress').length}</div>
              <div className="stat-label">In Progress</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                ${(orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.price, 0) / 100).toLocaleString()}
              </div>
              <div className="stat-label">Revenue</div>
            </div>
          </div>

          <div className="admin-content">
            <div className="orders-table-container">
              {orders.length === 0 ? (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                  </svg>
                  <p>No orders yet</p>
                </div>
              ) : (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Package</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className={selectedOrder?.id === order.id ? 'selected' : ''}
                      >
                        <td className="order-id">{order.id.slice(0, 8)}...</td>
                        <td>
                          <div className="customer-info">
                            <span className="customer-name">{order.customer_name}</span>
                            <span className="customer-email">{order.customer_email}</span>
                          </div>
                        </td>
                        <td>{order.package_name}</td>
                        <td className="amount">${(order.price / 100).toLocaleString()}</td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(order.status) }}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="date">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {selectedOrder && (
              <div className="order-detail-panel">
                <div className="panel-header">
                  <h2>Order Details</h2>
                  <button 
                    className="close-btn"
                    onClick={() => setSelectedOrder(null)}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="detail-section">
                  <h3>Customer</h3>
                  <p><strong>Name:</strong> {selectedOrder.customer_name}</p>
                  <p><strong>Email:</strong> {selectedOrder.customer_email}</p>
                  {selectedOrder.customer_phone && (
                    <p><strong>Phone:</strong> {selectedOrder.customer_phone}</p>
                  )}
                </div>
                
                <div className="detail-section">
                  <h3>Order</h3>
                  <p><strong>ID:</strong> {selectedOrder.id}</p>
                  <p><strong>Package:</strong> {selectedOrder.package_name}</p>
                  <p><strong>Amount:</strong> ${(selectedOrder.price / 100).toLocaleString()}</p>
                  <p><strong>Created:</strong> {formatDate(selectedOrder.created_at)}</p>
                  {selectedOrder.stripe_payment_intent && (
                    <p><strong>Stripe:</strong> {selectedOrder.stripe_payment_intent}</p>
                  )}
                </div>
                
                {selectedOrder.project_description && (
                  <div className="detail-section">
                    <h3>Project Description</h3>
                    <p className="description-text">{selectedOrder.project_description}</p>
                  </div>
                )}
                
                <div className="detail-section">
                  <h3>Update Status</h3>
                  <div className="status-buttons">
                    {['pending', 'paid', 'in_progress', 'completed', 'cancelled'].map(status => (
                      <button
                        key={status}
                        className={`status-btn ${selectedOrder.status === status ? 'active' : ''}`}
                        style={{ 
                          borderColor: getStatusColor(status),
                          backgroundColor: selectedOrder.status === status ? getStatusColor(status) : 'transparent',
                          color: selectedOrder.status === status ? '#1a1a2e' : getStatusColor(status)
                        }}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="admin-stats">
            <div className="stat-card">
              <div className="stat-value">{donations.length}</div>
              <div className="stat-label">Total Donations</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{donations.filter(d => d.status === 'completed').length}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                ${(donations.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.amount, 0) / 100).toLocaleString()}
              </div>
              <div className="stat-label">Total Received</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                ${donations.length > 0 
                  ? (donations.filter(d => d.status === 'completed').reduce((sum, d) => sum + d.amount, 0) / donations.filter(d => d.status === 'completed').length / 100).toFixed(2)
                  : '0'}
              </div>
              <div className="stat-label">Avg Donation</div>
            </div>
          </div>

          <div className="admin-content">
            <div className="orders-table-container">
              {donations.length === 0 ? (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <p>No donations yet</p>
                </div>
              ) : (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Donor</th>
                      <th>Amount</th>
                      <th>Message</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map(donation => (
                      <tr 
                        key={donation.id} 
                        onClick={() => setSelectedDonation(donation)}
                        className={selectedDonation?.id === donation.id ? 'selected' : ''}
                      >
                        <td className="order-id">{donation.id.slice(0, 8)}...</td>
                        <td>
                          <div className="customer-info">
                            <span className="customer-name">{donation.donor_name || 'Anonymous'}</span>
                            <span className="customer-email">{donation.donor_email}</span>
                          </div>
                        </td>
                        <td className="amount donation-amount">{donation.amountFormatted}</td>
                        <td className="message-preview">
                          {donation.message ? donation.message.substring(0, 30) + (donation.message.length > 30 ? '...' : '') : '-'}
                        </td>
                        <td>
                          <span 
                            className="status-badge"
                            style={{ backgroundColor: donation.status === 'completed' ? '#66ff99' : '#ffff66' }}
                          >
                            {donation.status}
                          </span>
                        </td>
                        <td className="date">{formatDate(donation.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {selectedDonation && (
              <div className="order-detail-panel">
                <div className="panel-header">
                  <h2>Donation Details</h2>
                  <button 
                    className="close-btn"
                    onClick={() => setSelectedDonation(null)}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="detail-section">
                  <h3>Donor</h3>
                  <p><strong>Name:</strong> {selectedDonation.donor_name || 'Anonymous'}</p>
                  <p><strong>Email:</strong> {selectedDonation.donor_email}</p>
                </div>
                
                <div className="detail-section">
                  <h3>Donation</h3>
                  <p><strong>ID:</strong> {selectedDonation.id}</p>
                  <p><strong>Amount:</strong> <span className="highlight-amount">{selectedDonation.amountFormatted}</span></p>
                  <p><strong>Status:</strong> {selectedDonation.status}</p>
                  <p><strong>Date:</strong> {formatDate(selectedDonation.created_at)}</p>
                  {selectedDonation.stripe_payment_intent && (
                    <p><strong>Stripe:</strong> {selectedDonation.stripe_payment_intent}</p>
                  )}
                </div>
                
                {selectedDonation.message && (
                  <div className="detail-section">
                    <h3>Message</h3>
                    <p className="description-text donation-message">"{selectedDonation.message}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

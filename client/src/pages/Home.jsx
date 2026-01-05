import { Link } from 'react-router-dom';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      <header className="hero">
        <div className="hero-content">
          <div className="hero-top">
            <h1 className="hero-title animate-slideInLeft">
              <span>&nbsp;Multi-</span>
              <span>disciplinary</span>
              <span>&nbsp;Design</span>
            </h1>
            <p className="hero-credit animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              done by Irene Skvorzowa
            </p>
          </div>
          
          <div className="hero-bottom animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
            <p className="hero-description">
              Crafting thoughtful digital experiences through web design, UI/UX, 
              branding, and creative direction. Focused on simplicity, elegance, 
              and meaningful interactions.
            </p>
          </div>
        </div>
        
        <div className="hero-footer animate-fadeIn" style={{ animationDelay: '0.7s' }}>
          <Link to="/packages" className="scroll-hint">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          
          <div className="contact-info">
            <a href="mailto:irene.skvorzowa@crystalprismsoftware.com">
              irene.skvorzowa@crystalprismsoftware.com
            </a>
            <div>+1 (201) 914-4028</div>
          </div>
        </div>
      </header>
      
      <section className="services-section">
        <div className="container">
          <h2 className="section-title">What I Do</h2>
          
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
              </div>
              <h3>Web Design</h3>
              <p>Creating stunning, responsive websites that captivate and convert.</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v4m0 12v4m-8-10h4m12 0h4"/>
                  <path d="M5.6 5.6l2.8 2.8m7.2 7.2l2.8 2.8M5.6 18.4l2.8-2.8m7.2-7.2l2.8-2.8"/>
                </svg>
              </div>
              <h3>UI/UX</h3>
              <p>Designing intuitive interfaces that users love to interact with.</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3>Branding</h3>
              <p>Building memorable brand identities that tell your unique story.</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <h3>Creative Direction</h3>
              <p>Guiding visual strategy to achieve impactful, cohesive results.</p>
            </div>
          </div>
          
          <div className="cta-section">
            <h2>Ready to Start Your Project?</h2>
            <p>Let's create something extraordinary together.</p>
            <Link to="/packages" className="btn btn-primary">
              View Packages
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12H19M19 12L12 5M19 12L12 19"/>
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

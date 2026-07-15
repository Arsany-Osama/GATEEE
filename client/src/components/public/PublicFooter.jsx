import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicSettings } from '../../api/settingsApi';
import { contactInfo } from '../../data/contact';

const SocialIcon = ({ type }) => {
  if (type === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M14 8.4V6.7c0-.8.3-1.2 1.3-1.2H17V2.2c-.8-.1-1.6-.2-2.4-.2-2.7 0-4.5 1.6-4.5 4.6v1.8H7v3.7h3.1V22H14v-9.9h2.9l.5-3.7H14Z" />
      </svg>
    );
  }

  if (type === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 2.2A9.7 9.7 0 0 0 3.5 16.6L2.3 21.8l5.3-1.2A9.7 9.7 0 1 0 12 2.2Zm0 17.6a7.8 7.8 0 0 1-4-1.1l-.3-.2-3.1.7.7-3-.2-.3a7.8 7.8 0 1 1 6.9 3.9Zm4.4-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.6.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.2.1 1.7.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.3-.2-.5-.3Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7.6 2h8.8A5.6 5.6 0 0 1 22 7.6v8.8a5.6 5.6 0 0 1-5.6 5.6H7.6A5.6 5.6 0 0 1 2 16.4V7.6A5.6 5.6 0 0 1 7.6 2Zm0 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9 2.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7.1A4.9 4.9 0 1 1 12 17a4.9 4.9 0 0 1 0-9.9Zm0 2A2.9 2.9 0 1 0 12 15a2.9 2.9 0 0 0 0-5.9Z" />
    </svg>
  );
};

const PublicFooter = ({ className = '' }) => {
  const [settings, setSettings] = useState({});
  const platformName = settings.platform_name || 'GATE';
  const facebookUrl = settings.facebook_url || 'https://www.facebook.com/share/1Ph9fSQUkJ/';
  const instagramUrl = settings.instagram_url || 'https://www.instagram.com/ahmed_gamal_elghawy?igsh=MWdhb2hod3R5MGc1dw==';
  const whatsappNumber = String(settings.whatsapp_number || contactInfo.whatsappNumber).replace(/[^\d]/g, '');
  const whatsappUrl = `https://wa.me/${whatsappNumber || contactInfo.whatsappNumber}`;
  const phoneDisplay = settings.whatsapp_display || settings.whatsapp_number || contactInfo.phoneDisplay;
  const contactEmail = settings.contact_email || contactInfo.email;
  const footerLocation = settings.footer_location || contactInfo.location || 'Alexandria, Egypt';

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      try {
        const data = await getPublicSettings();
        if (active) setSettings(data || {});
      } catch {
        if (active) setSettings({});
      }
    };
    loadSettings();
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className={`home-footer public-footer ${className}`.trim()}>
      <div className="footer-brand">
        <Link className="home-brand" to="/" aria-label="GATE home">
          <span className="brand-mark" aria-hidden="true">G</span>
          <span className="brand-name">{platformName}</span>
        </Link>
        <p>Empowering professionals with world-class safety training, certified courses, and practical training paths.</p>
        <div className="footer-socials" aria-label="GATE social and contact channels">
          <a href={facebookUrl} target="_blank" rel="noreferrer" title="Facebook"><SocialIcon type="facebook" /></a>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" title="WhatsApp"><SocialIcon type="whatsapp" /></a>
          <a href={instagramUrl} target="_blank" rel="noreferrer" title="Instagram"><SocialIcon type="instagram" /></a>
        </div>
      </div>
      <div>
        <h2>Quick Links</h2>
        <Link to="/">Home</Link>
        <Link to="/learning">Courses</Link>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </div>
      <div>
        <h2>Contact Us</h2>
        <p>Have questions? We're here to help!</p>
        <p className="footer-phone">{phoneDisplay}</p>
        <p>{contactEmail}</p>
        <p>{footerLocation}</p>
      </div>
    </footer>
  );
};

export default PublicFooter;

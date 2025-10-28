import { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import './TopNav.css';

const TopNav = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);
  const selectorRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  // Проверка роли модератора
  useEffect(() => {
    const checkModeratorRole = async () => {
      if (!user) {
        setIsModerator(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setIsModerator(profile?.role === 'moderator' || profile?.role === 'admin');
      } catch (error) {
        console.error('Ошибка проверки роли:', error);
        setIsModerator(false);
      }
    };

    checkModeratorRole();
  }, [user]);

  // Формируем список навигации
  const navItems = user
    ? [
        { label: t('nav.home'), href: '/', icon: 'fas fa-home' },
        { label: t('nav.events'), href: '/events', icon: 'fas fa-calendar-alt' },
        { label: t('nav.profile'), href: '/profile', icon: 'fas fa-user' },
        { label: t('nav.chats'), href: '/chats', icon: 'fas fa-comments' },
        { label: t('nav.support'), href: '/support', icon: 'fas fa-question-circle' },
        ...(isModerator ? [{ label: t('nav.admin'), href: '/admin', icon: 'fas fa-shield-alt' }] : [])
      ]
    : [
        { label: t('nav.home'), href: '/', icon: 'fas fa-home' },
        { label: t('nav.events'), href: '/events', icon: 'fas fa-calendar-alt' },
        { label: t('nav.support'), href: '/support', icon: 'fas fa-question-circle' },
        { label: t('nav.login'), href: '/login', icon: 'fas fa-sign-in-alt' },
        { label: t('nav.register'), href: '/register', icon: 'fas fa-user-plus' }
      ];

  // Функция обновления позиции селектора
  const updateSelectorPosition = () => {
    if (!navRef.current || !selectorRef.current) return;

    const activeItem = navRef.current.querySelector('li.active');
    if (!activeItem) return;

    const activeHeight = activeItem.offsetHeight;
    const activeWidth = activeItem.offsetWidth;
    const itemPosTop = activeItem.offsetTop;
    const itemPosLeft = activeItem.offsetLeft;

    selectorRef.current.style.top = itemPosTop + 'px';
    selectorRef.current.style.left = itemPosLeft + 'px';
    selectorRef.current.style.height = activeHeight + 'px';
    selectorRef.current.style.width = activeWidth + 'px';
  };

  // Обновление при изменении маршрута
  useEffect(() => {
    setTimeout(updateSelectorPosition, 0);
  }, [location.pathname, isModerator, user, navItems]);

  // Обновление при resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(updateSelectorPosition, 500);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = (e, href) => {
    e.preventDefault();

    const clickedLi = e.currentTarget.parentElement;
    navRef.current?.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    clickedLi.classList.add('active');

    updateSelectorPosition();
    setIsMobileMenuOpen(false);

    setTimeout(() => {
      navigate(href);
    }, 300);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    setTimeout(updateSelectorPosition, 300);
  };

  return (
    <nav className="navbar navbar-expand-custom navbar-mainbg">
      <a className="navbar-brand navbar-logo" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
        {t('app.name')}
      </a>

      <div className="navbar-controls">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <button
        className="navbar-toggler"
        type="button"
        onClick={toggleMobileMenu}
        aria-controls="navbarSupportedContent"
        aria-expanded={isMobileMenuOpen}
        aria-label="Toggle navigation"
      >
        <i className="fas fa-bars text-white"></i>
      </button>

      <div className={`navbar-collapse ${isMobileMenuOpen ? 'show' : ''}`} id="navbarSupportedContent">
        <ul className="navbar-nav ml-auto" ref={navRef}>
          <div className="hori-selector" ref={selectorRef}>
            <div className="left"></div>
            <div className="right"></div>
          </div>
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={index} className={`nav-item ${isActive ? 'active' : ''}`}>
                <a className="nav-link" href={item.href} onClick={(e) => handleNavClick(e, item.href)}>
                  <i className={item.icon}></i>{item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default TopNav;

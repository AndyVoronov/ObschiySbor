import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import './TopNav.css';

const TopNav = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const navRef = useRef(null);
  const filterRef = useRef(null);
  const textRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
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

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Ошибка выхода:', error.message);
    }
  };

  // Формируем список навигации в зависимости от роли пользователя
  const navItems = user
    ? [
        { label: 'Главная', href: '/' },
        { label: 'События', href: '/events' },
        { label: 'Профиль', href: '/profile' },
        { label: 'Чаты', href: '/chats' },
        ...(isModerator ? [{ label: 'Админ', href: '/admin' }] : [])
      ]
    : [
        { label: 'Главная', href: '/' },
        { label: 'События', href: '/events' },
        { label: 'Вход', href: '/login' },
        { label: 'Регистрация', href: '/register' }
      ];

  const noise = (n = 1) => n / 2 - Math.random() * n;

  const getXY = (distance, pointIndex, totalPoints) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i, particleCount, colors) => {
    const animationTime = 600;
    const timeVariance = 300;
    const particleR = 100;
    const particleDistances = [90, 10];

    let rotate = noise(particleR / 10);
    return {
      start: getXY(particleDistances[0], particleCount - i, particleCount),
      end: getXY(particleDistances[1] + noise(7), particleCount - i, particleCount),
      time: animationTime * 2 + noise(timeVariance * 2),
      scale: 1 + noise(0.2),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + particleR / 20) * 10 : (rotate - particleR / 20) * 10
    };
  };

  const makeParticles = element => {
    const particleCount = 15;
    const colors = [1, 2, 3, 4];
    const animationTime = 600;
    const timeVariance = 300;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);

    for (let i = 0; i < particleCount; i++) {
      const p = createParticle(i, particleCount, colors);
      element.classList.remove('active');

      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', `${p.scale}`);
        particle.style.setProperty('--color', `var(--color-${p.color}, white)`);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);

        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => {
          element.classList.add('active');
        });
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch {
            // Do nothing
          }
        }, p.time);
      }, 30);
    }
  };

  const updateEffectPosition = element => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();

    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText = element.innerText;
  };

  const handleClick = (e, index, href, onClick) => {
    e.preventDefault();
    const liEl = e.currentTarget;

    // Закрываем мобильное меню при клике на пункт
    setIsMobileMenuOpen(false);

    if (activeIndex === index) {
      if (onClick) {
        onClick(e);
      } else if (href) {
        // Принудительный переход через window.location
        window.location.href = href;
      }
      return;
    }

    setActiveIndex(index);
    updateEffectPosition(liEl);

    if (filterRef.current) {
      const particles = filterRef.current.querySelectorAll('.particle');
      particles.forEach(p => filterRef.current.removeChild(p));
    }

    if (textRef.current) {
      textRef.current.classList.remove('active');
      void textRef.current.offsetWidth;
      textRef.current.classList.add('active');
    }

    if (filterRef.current) {
      makeParticles(filterRef.current);
    }

    // Небольшая задержка для анимации, затем переход
    setTimeout(() => {
      if (onClick) {
        onClick(e);
      } else if (href) {
        // Принудительный переход через window.location
        window.location.href = href;
      }
    }, 300);
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;
    const activeLi = navRef.current.querySelectorAll('li')[activeIndex];
    if (activeLi) {
      updateEffectPosition(activeLi);
      // Не добавляем класс 'active' автоматически при монтировании
      // textRef.current?.classList.add('active');
    }

    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex];
      if (currentActiveLi) {
        updateEffectPosition(currentActiveLi);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeIndex]);

  return (
    <header className="top-nav-header">
      <div className="top-nav-content">
        <a href="/" className="top-nav-logo">
          ObschiySbor
        </a>

        {/* Кнопка гамбургер для мобильной версии */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Меню"
        >
          <span className={isMobileMenuOpen ? 'open' : ''}></span>
          <span className={isMobileMenuOpen ? 'open' : ''}></span>
          <span className={isMobileMenuOpen ? 'open' : ''}></span>
        </button>

        <div className={`top-nav-gooey-container ${isMobileMenuOpen ? 'mobile-open' : ''}`} ref={containerRef}>
          <nav>
            <ul ref={navRef}>
              {navItems.map((item, index) => (
                <li key={index} className={activeIndex === index ? 'active' : ''}>
                  <a
                    href={item.href}
                    onClick={e => handleClick(e, index, item.href, item.onClick)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <span className="effect filter" ref={filterRef} />
          <span className="effect text" ref={textRef} />
        </div>
      </div>
    </header>
  );
};

export default TopNav;

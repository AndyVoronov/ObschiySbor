import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import GooeyNav from './GooeyNav';
import './Layout.css';

const Layout = () => {
  const footerItems = [
    { label: 'О нас', href: '/about' },
    { label: 'Контакты', href: '/contacts' },
    { label: 'Правила', href: '/rules' }
  ];

  return (
    <div className="layout-container">
      {/* TopNav Header */}
      <TopNav />

      {/* Main Content */}
      <main className="layout-main">
        <Outlet />
      </main>

      {/* GooeyNav Footer */}
      <footer className="layout-footer">
        <div className="footer-content">
          <GooeyNav
            items={footerItems}
            particleCount={15}
            particleDistances={[90, 10]}
            particleR={100}
            initialActiveIndex={0}
            animationTime={600}
            timeVariance={300}
            colors={[1, 2, 3, 1, 2, 3, 1, 4]}
          />
        </div>
      </footer>
    </div>
  );
};

export default Layout;

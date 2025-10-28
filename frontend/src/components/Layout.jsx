import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import './Layout.css';

const Layout = () => {
  return (
    <div className="layout-container">
      {/* TopNav Header */}
      <TopNav />

      {/* Main Content */}
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

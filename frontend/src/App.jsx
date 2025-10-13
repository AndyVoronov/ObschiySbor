import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useTelegramAuth } from './hooks/useTelegramAuth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Events from './pages/Events';
import CreateEvent from './pages/CreateEvent';
import EventDetails from './pages/EventDetails';
import BoardGameDetails from './pages/BoardGameDetails';
import Profile from './pages/Profile';
import Chats from './pages/Chats';
import Login from './pages/Login';
import Register from './pages/Register';
import About from './pages/About';
import Contacts from './pages/Contacts';
import Rules from './pages/Rules';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function AppContent() {
  // Автоматическая авторизация через Telegram Mini App
  const { isLoading, error, isTelegramApp } = useTelegramAuth();

  // Показываем индикатор загрузки во время авторизации в Telegram Mini App
  if (isTelegramApp && isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner"></div>
        <p>Авторизация через Telegram...</p>
      </div>
    );
  }

  // Показываем ошибку если авторизация не удалась
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem'
      }}>
        <p style={{ color: 'red' }}>Ошибка авторизации: {error}</p>
        <button onClick={() => window.location.reload()}>
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetails />} />
            <Route path="board-games/:id" element={<BoardGameDetails />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route
              path="create-event"
              element={
                <ProtectedRoute>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="chats"
              element={
                <ProtectedRoute>
                  <Chats />
                </ProtectedRoute>
              }
            />
            <Route path="about" element={<About />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="rules" element={<Rules />} />
          </Route>
        </Routes>
      </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

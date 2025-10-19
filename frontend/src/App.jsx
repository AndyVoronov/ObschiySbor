import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
import { useTelegramAuth } from './hooks/useTelegramAuth';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import './App.css';

// Lazy loading для страниц - разделение кода
const Home = lazy(() => import('./pages/Home'));
const Events = lazy(() => import('./pages/Events'));
const CreateEvent = lazy(() => import('./pages/CreateEvent'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const BoardGameDetails = lazy(() => import('./pages/BoardGameDetails'));
const Profile = lazy(() => import('./pages/Profile'));
const Chats = lazy(() => import('./pages/Chats'));
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const About = lazy(() => import('./pages/About'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Rules = lazy(() => import('./pages/Rules'));

// Компонент загрузки
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '1.2rem'
  }}>
    <div className="spinner"></div>
    <span style={{ marginLeft: '1rem' }}>Загрузка...</span>
  </div>
);

// Создаём QueryClient с оптимизированными настройками
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
      gcTime: 10 * 60 * 1000, // 10 минут - время жизни кэша (было cacheTime)
      retry: 1, // 1 повторная попытка при ошибке
      refetchOnWindowFocus: false, // Не перезагружать при фокусе окна
      refetchOnReconnect: true, // Перезагружать при восстановлении соединения
    },
  },
});

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
      <Suspense fallback={<LoadingFallback />}>
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
            <Route
              path="admin"
              element={
                <ProtectedAdminRoute>
                  <Admin />
                </ProtectedAdminRoute>
              }
            />
            <Route path="about" element={<About />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="rules" element={<Rules />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      {/* DevTools для отладки React Query (только в development) */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;

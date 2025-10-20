import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BlockUserModal from '../components/BlockUserModal';
import './Admin.css';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState(null);

  // Проверка прав доступа
  useEffect(() => {
    const checkModeratorAccess = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'moderator') {
        navigate('/');
        return;
      }

      loadReports();
    };

    checkModeratorAccess();
  }, [user, navigate, filterStatus]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          event:events(id, title, status),
          reporter:profiles!reports_reporter_id_fkey(id, username, email)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setReports(data || []);
    } catch (err) {
      console.error('Ошибка загрузки жалоб:', err);
      setError('Не удалось загрузить жалобы');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReport = async (reportId, newStatus) => {
    setProcessing(reportId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      // Обновляем локальное состояние
      setReports(reports.map(report =>
        report.id === reportId
          ? { ...report, status: newStatus, updated_at: new Date().toISOString() }
          : report
      ));
    } catch (err) {
      console.error('Ошибка обновления жалобы:', err);
      setError('Не удалось обновить жалобу');
    } finally {
      setProcessing(null);
    }
  };

  const handleBlockEvent = async (eventId) => {
    if (!confirm('Вы уверены, что хотите заблокировать это событие?')) {
      return;
    }

    setProcessing(eventId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({ status: 'cancelled' })
        .eq('id', eventId);

      if (updateError) throw updateError;

      alert('Событие успешно заблокировано');
      loadReports(); // Перезагружаем список
    } catch (err) {
      console.error('Ошибка блокировки события:', err);
      setError('Не удалось заблокировать событие');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Ожидает', color: '#ffc107' },
      reviewed: { label: 'Просмотрено', color: '#17a2b8' },
      resolved: { label: 'Решено', color: '#28a745' },
      rejected: { label: 'Отклонено', color: '#6c757d' },
    };

    const badge = badges[status] || badges.pending;

    return (
      <span
        className="status-badge"
        style={{ backgroundColor: badge.color }}
      >
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading">Загрузка жалоб...</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Панель модератора</h1>
        <p>Управление жалобами, пользователями и обжалованиями</p>
      </div>

      {/* Вкладки */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📋 Жалобы
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Пользователи
        </button>
        <button
          className={`tab-button ${activeTab === 'appeals' ? 'active' : ''}`}
          onClick={() => setActiveTab('appeals')}
        >
          ⚖️ Обжалования
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {/* Вкладка Жалобы */}
      {activeTab === 'reports' && (
        <>
          <div className="admin-filters">
            <label htmlFor="status-filter">Фильтр по статусу:</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Все</option>
              <option value="pending">Ожидает</option>
              <option value="reviewed">Просмотрено</option>
              <option value="resolved">Решено</option>
              <option value="rejected">Отклонено</option>
            </select>
            <span className="reports-count">
              Найдено жалоб: {reports.length}
            </span>
          </div>

          {reports.length === 0 ? (
        <div className="empty-state">
          <p>Нет жалоб с выбранным статусом</p>
        </div>
      ) : (
        <div className="reports-list">
          {reports.map((report) => (
            <div key={report.id} className="report-card">
              <div className="report-header">
                <div className="report-id">ID: {report.id.slice(0, 8)}</div>
                {getStatusBadge(report.status)}
              </div>

              <div className="report-content">
                <div className="report-section">
                  <strong>Событие:</strong>
                  {report.event ? (
                    <>
                      <a
                        href={`/events/${report.event_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="event-link"
                      >
                        {report.event.title}
                      </a>
                      {report.event.status === 'cancelled' && (
                        <span className="blocked-badge">Заблокировано</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted">Событие удалено</span>
                  )}
                </div>

                <div className="report-section">
                  <strong>Причина жалобы:</strong>
                  <p className="report-reason">{report.reason}</p>
                </div>

                <div className="report-section">
                  <strong>Отправитель:</strong>
                  {report.reporter ? (
                    <span>
                      {report.reporter.username || report.reporter.email}
                    </span>
                  ) : (
                    <span className="text-muted">Пользователь удалён</span>
                  )}
                </div>

                <div className="report-meta">
                  <span>Создано: {formatDate(report.created_at)}</span>
                  {report.updated_at !== report.created_at && (
                    <span>Обновлено: {formatDate(report.updated_at)}</span>
                  )}
                </div>
              </div>

              <div className="report-actions">
                {report.status === 'pending' && (
                  <>
                    <button
                      className="btn btn-info"
                      onClick={() => handleUpdateReport(report.id, 'reviewed')}
                      disabled={processing === report.id}
                    >
                      Просмотрено
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => handleUpdateReport(report.id, 'resolved')}
                      disabled={processing === report.id}
                    >
                      Решено
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleUpdateReport(report.id, 'rejected')}
                      disabled={processing === report.id}
                    >
                      Отклонить
                    </button>
                  </>
                )}

                {report.status === 'reviewed' && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => handleUpdateReport(report.id, 'resolved')}
                      disabled={processing === report.id}
                    >
                      Решено
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleUpdateReport(report.id, 'rejected')}
                      disabled={processing === report.id}
                    >
                      Отклонить
                    </button>
                  </>
                )}

                {report.event && report.event.status !== 'cancelled' && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleBlockEvent(report.event_id)}
                    disabled={processing === report.event_id}
                  >
                    Заблокировать событие
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {/* Вкладка Пользователи */}
      {activeTab === 'users' && <UsersTab />}

      {/* Вкладка Обжалования */}
      {activeTab === 'appeals' && <AppealsTab />}
    </div>
  );
};

// ===========================================
// Компонент UsersTab - Управление пользователями
// ===========================================
const UsersTab = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBlocked, setFilterBlocked] = useState('all');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [filterBlocked]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterBlocked === 'blocked') {
        query = query.eq('is_blocked', true);
      } else if (filterBlocked === 'active') {
        query = query.eq('is_blocked', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId, userName) => {
    if (!confirm(`Разблокировать пользователя "${userName}"?`)) return;

    try {
      const { error } = await supabase.rpc('unblock_user', {
        p_user_id: userId,
        p_unblocked_by: user.id,
        p_reason: 'Разблокирован администратором'
      });

      if (error) throw error;
      alert('Пользователь разблокирован');
      loadUsers();
    } catch (err) {
      alert('Ошибка разблокировки: ' + err.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const search = searchTerm.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return <div className="loading">Загрузка пользователей...</div>;
  }

  return (
    <>
      <div className="admin-filters">
        <input
          type="text"
          placeholder="Поиск по имени или email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={filterBlocked}
          onChange={(e) => setFilterBlocked(e.target.value)}
          className="filter-select"
        >
          <option value="all">Все пользователи</option>
          <option value="active">Активные</option>
          <option value="blocked">Заблокированные</option>
        </select>
        <span className="reports-count">
          Найдено: {filteredUsers.length}
        </span>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Email</th>
              <th>Статус</th>
              <th>Дата регистрации</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} className={u.is_blocked ? 'blocked-row' : ''}>
                <td>{u.full_name || '—'}</td>
                <td>{u.email}</td>
                <td>
                  {u.is_blocked ? (
                    <span className="status-badge" style={{ backgroundColor: '#e74c3c' }}>
                      Заблокирован
                    </span>
                  ) : (
                    <span className="status-badge" style={{ backgroundColor: '#28a745' }}>
                      Активен
                    </span>
                  )}
                </td>
                <td>{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                <td>
                  {u.is_blocked ? (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleUnblock(u.id, u.full_name || u.email)}
                    >
                      Разблокировать
                    </button>
                  ) : (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        setSelectedUser(u);
                        setShowBlockModal(true);
                      }}
                    >
                      Заблокировать
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showBlockModal && (
        <BlockUserModal
          isOpen={showBlockModal}
          onClose={() => {
            setShowBlockModal(false);
            setSelectedUser(null);
          }}
          targetUser={selectedUser}
          onSuccess={() => {
            loadUsers();
            setSelectedUser(null);
          }}
        />
      )}
    </>
  );
};

// ===========================================
// Компонент AppealsTab - Обжалования блокировок
// ===========================================
const AppealsTab = () => {
  const { user } = useAuth();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadAppeals();
  }, []);

  const loadAppeals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('block_appeals')
        .select(`
          *,
          user:user_id(id, full_name, email, avatar_url),
          block:block_id(reason, blocked_at, blocked_until)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppeals(data || []);
    } catch (err) {
      console.error('Ошибка загрузки обжалований:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appealId) => {
    if (!confirm('Одобрить обжалование и разблокировать пользователя?')) return;

    setProcessing(appealId);
    try {
      const { error } = await supabase.rpc('approve_block_appeal', {
        p_appeal_id: appealId,
        p_reviewed_by: user.id,
        p_admin_comment: 'Обжалование одобрено'
      });

      if (error) throw error;
      alert('Обжалование одобрено, пользователь разблокирован');
      loadAppeals();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (appealId) => {
    const adminComment = prompt('Укажите причину отклонения обжалования:');
    if (!adminComment) return;

    setProcessing(appealId);
    try {
      const { error } = await supabase.rpc('reject_block_appeal', {
        p_appeal_id: appealId,
        p_reviewed_by: user.id,
        p_admin_comment: adminComment
      });

      if (error) throw error;
      alert('Обжалование отклонено');
      loadAppeals();
    } catch (err) {
      alert('Ошибка: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка обжалований...</div>;
  }

  return (
    <>
      <div className="appeals-header">
        <h2>Обжалования блокировок</h2>
        <span className="reports-count">Ожидают рассмотрения: {appeals.length}</span>
      </div>

      {appeals.length === 0 ? (
        <div className="empty-state">
          <p>Нет обжалований, ожидающих рассмотрения</p>
        </div>
      ) : (
        <div className="appeals-list">
          {appeals.map(appeal => (
            <div key={appeal.id} className="appeal-card">
              <div className="appeal-header">
                <div className="user-info-appeal">
                  {appeal.user.avatar_url && (
                    <img src={appeal.user.avatar_url} alt="Avatar" className="appeal-avatar" />
                  )}
                  <div>
                    <h3>{appeal.user.full_name || 'Имя не указано'}</h3>
                    <p>{appeal.user.email}</p>
                  </div>
                </div>
                <div className="appeal-date">
                  {new Date(appeal.created_at).toLocaleString('ru-RU')}
                </div>
              </div>

              <div className="appeal-block-info">
                <h4>📋 Информация о блокировке:</h4>
                <p><strong>Причина блокировки:</strong> {appeal.block.reason}</p>
                <p><strong>Дата блокировки:</strong> {new Date(appeal.block.blocked_at).toLocaleString('ru-RU')}</p>
                {appeal.block.blocked_until && (
                  <p><strong>Блокировка до:</strong> {new Date(appeal.block.blocked_until).toLocaleString('ru-RU')}</p>
                )}
              </div>

              <div className="appeal-reason-box">
                <h4>💬 Обжалование пользователя:</h4>
                <p className="appeal-reason-text">{appeal.reason}</p>
              </div>

              <div className="appeal-actions">
                <button
                  className="btn btn-success"
                  onClick={() => handleApprove(appeal.id)}
                  disabled={processing === appeal.id}
                >
                  ✓ Одобрить
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleReject(appeal.id)}
                  disabled={processing === appeal.id}
                >
                  ✗ Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Admin;

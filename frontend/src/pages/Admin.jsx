import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BlockUserModal from '../components/BlockUserModal';
import { useTranslation } from 'react-i18next';
import './Admin.css';

const Admin = () => {
  const { t } = useTranslation('common');
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
      setError(t('admin.errorUpdatingReport'));
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
      setError(t('admin.errorUpdatingReport'));
    } finally {
      setProcessing(null);
    }
  };

  const handleBlockEvent = async (eventId) => {
    if (!confirm(t('admin.confirmBlockEvent'))) {
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

      alert(t('admin.eventBlocked'));
      loadReports(); // Перезагружаем список
    } catch (err) {
      console.error('Ошибка блокировки события:', err);
      setError(t('admin.errorBlockingEvent'));
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: t('admin.statusPending'), color: '#ffc107' },
      reviewed: { label: t('admin.statusReviewed'), color: '#17a2b8' },
      resolved: { label: t('admin.statusResolved'), color: '#28a745' },
      rejected: { label: t('admin.statusRejected'), color: '#6c757d' },
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
        <div className="loading">{t('admin.loadingReports')}</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>{t('admin.title')}</h1>
        <p>{t('admin.subtitle')}</p>
      </div>

      {/* Вкладки */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📋 {t('admin.tabReports')}
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 {t('admin.tabUsers')}
        </button>
        <button
          className={`tab-button ${activeTab === 'appeals' ? 'active' : ''}`}
          onClick={() => setActiveTab('appeals')}
        >
          ⚖️ {t('admin.tabAppeals')}
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
            <label htmlFor="status-filter">{t('admin.filterByStatus')}</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">{t('admin.allStatuses')}</option>
              <option value="pending">{t('admin.statusPending')}</option>
              <option value="reviewed">{t('admin.statusReviewed')}</option>
              <option value="resolved">{t('admin.statusResolved')}</option>
              <option value="rejected">{t('admin.statusRejected')}</option>
            </select>
            <span className="reports-count">
              {t('admin.reportsFound')} {reports.length}
            </span>
          </div>

          {reports.length === 0 ? (
        <div className="empty-state">
          <p>{t('admin.noReportsFound')}</p>
        </div>
      ) : (
        <div className="reports-list">
          {reports.map((report) => (
            <div key={report.id} className="report-card">
              <div className="report-header">
                <div className="report-id">{t('admin.reportId')} {report.id.slice(0, 8)}</div>
                {getStatusBadge(report.status)}
              </div>

              <div className="report-content">
                <div className="report-section">
                  <strong>{t('admin.reportEvent')}</strong>
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
                        <span className="blocked-badge">{t('admin.reportBlocked')}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted">{t('admin.reportDeleted')}</span>
                  )}
                </div>

                <div className="report-section">
                  <strong>{t('admin.reportReason')}</strong>
                  <p className="report-reason">{report.reason}</p>
                </div>

                <div className="report-section">
                  <strong>{t('admin.reportSender')}</strong>
                  {report.reporter ? (
                    <span>
                      {report.reporter.username || report.reporter.email}
                    </span>
                  ) : (
                    <span className="text-muted">{t('admin.reportUserDeleted')}</span>
                  )}
                </div>

                <div className="report-meta">
                  <span>{t('admin.reportCreated')} {formatDate(report.created_at)}</span>
                  {report.updated_at !== report.created_at && (
                    <span>{t('admin.reportUpdated')} {formatDate(report.updated_at)}</span>
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
                      {t('admin.actionReviewed')}
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => handleUpdateReport(report.id, 'resolved')}
                      disabled={processing === report.id}
                    >
                      {t('admin.actionResolved')}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleUpdateReport(report.id, 'rejected')}
                      disabled={processing === report.id}
                    >
                      {t('admin.actionReject')}
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
                      {t('admin.actionResolved')}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleUpdateReport(report.id, 'rejected')}
                      disabled={processing === report.id}
                    >
                      {t('admin.actionReject')}
                    </button>
                  </>
                )}

                {report.event && report.event.status !== 'cancelled' && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleBlockEvent(report.event_id)}
                    disabled={processing === report.event_id}
                  >
                    {t('admin.actionBlockEvent')}
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
  const { t } = useTranslation('common');
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
    if (!confirm(`${t('admin.confirmUnblock')} "${userName}"?`)) return;

    try {
      const { error } = await supabase.rpc('unblock_user', {
        p_user_id: userId,
        p_unblocked_by: user.id,
        p_reason: 'Разблокирован администратором'
      });

      if (error) throw error;
      alert(t('admin.userUnblocked'));
      loadUsers();
    } catch (err) {
      alert(t('admin.errorUnblocking') + ' ' + err.message);
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
    return <div className="loading">{t('admin.loadingUsers')}</div>;
  }

  return (
    <>
      <div className="admin-filters">
        <input
          type="text"
          placeholder={t('admin.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={filterBlocked}
          onChange={(e) => setFilterBlocked(e.target.value)}
          className="filter-select"
        >
          <option value="all">{t('admin.filterAll')}</option>
          <option value="active">{t('admin.filterActive')}</option>
          <option value="blocked">{t('admin.filterBlocked')}</option>
        </select>
        <span className="reports-count">
          {t('admin.usersFound')} {filteredUsers.length}
        </span>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>{t('admin.userName')}</th>
              <th>{t('admin.userEmail')}</th>
              <th>{t('admin.userStatus')}</th>
              <th>{t('admin.userRegistration')}</th>
              <th>{t('admin.userActions')}</th>
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
                      {t('admin.statusBlocked')}
                    </span>
                  ) : (
                    <span className="status-badge" style={{ backgroundColor: '#28a745' }}>
                      {t('admin.statusActive')}
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
                      {t('admin.actionUnblock')}
                    </button>
                  ) : (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        setSelectedUser(u);
                        setShowBlockModal(true);
                      }}
                    >
                      {t('admin.actionBlock')}
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
  const { t } = useTranslation('common');
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
    if (!confirm(t('admin.confirmApproveAppeal'))) return;

    setProcessing(appealId);
    try {
      const { error } = await supabase.rpc('approve_block_appeal', {
        p_appeal_id: appealId,
        p_reviewed_by: user.id,
        p_admin_comment: 'Обжалование одобрено'
      });

      if (error) throw error;
      alert(t('admin.appealApproved'));
      loadAppeals();
    } catch (err) {
      alert(t('admin.appealError') + ' ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (appealId) => {
    const adminComment = prompt(t('admin.appealRejectReason'));
    if (!adminComment) return;

    setProcessing(appealId);
    try {
      const { error } = await supabase.rpc('reject_block_appeal', {
        p_appeal_id: appealId,
        p_reviewed_by: user.id,
        p_admin_comment: adminComment
      });

      if (error) throw error;
      alert(t('admin.appealRejected'));
      loadAppeals();
    } catch (err) {
      alert(t('admin.appealError') + ' ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="loading">{t('admin.loadingAppeals')}</div>;
  }

  return (
    <>
      <div className="appeals-header">
        <h2>{t('admin.appealsTitle')}</h2>
        <span className="reports-count">{t('admin.appealsWaiting')} {appeals.length}</span>
      </div>

      {appeals.length === 0 ? (
        <div className="empty-state">
          <p>{t('admin.noAppeals')}</p>
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
                    <h3>{appeal.user.full_name || t('profile.noNameProvided')}</h3>
                    <p>{appeal.user.email}</p>
                  </div>
                </div>
                <div className="appeal-date">
                  {new Date(appeal.created_at).toLocaleString('ru-RU')}
                </div>
              </div>

              <div className="appeal-block-info">
                <h4>📋 {t('admin.appealBlockInfo')}</h4>
                <p><strong>{t('admin.appealBlockReason')}</strong> {appeal.block.reason}</p>
                <p><strong>{t('admin.appealBlockDate')}</strong> {new Date(appeal.block.blocked_at).toLocaleString('ru-RU')}</p>
                {appeal.block.blocked_until && (
                  <p><strong>{t('admin.appealBlockUntil')}</strong> {new Date(appeal.block.blocked_until).toLocaleString('ru-RU')}</p>
                )}
              </div>

              <div className="appeal-reason-box">
                <h4>💬 {t('admin.appealUserReason')}</h4>
                <p className="appeal-reason-text">{appeal.reason}</p>
              </div>

              <div className="appeal-actions">
                <button
                  className="btn btn-success"
                  onClick={() => handleApprove(appeal.id)}
                  disabled={processing === appeal.id}
                >
                  ✓ {t('admin.appealApprove')}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleReject(appeal.id)}
                  disabled={processing === appeal.id}
                >
                  ✗ {t('admin.appealReject')}
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

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Admin.css';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        <p>Управление жалобами и модерация контента</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

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
    </div>
  );
};

export default Admin;

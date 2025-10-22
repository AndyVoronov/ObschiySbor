import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getCategoryName } from '../constants/categories';
import './OrganizerDashboard.css';

function OrganizerDashboard({ userId }) {
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalParticipants: 0,
    totalRevenue: 0,
    avgRating: 0,
    completedEvents: 0,
    activeEvents: 0,
    cancelledEvents: 0
  });
  const [eventsByCategory, setEventsByCategory] = useState([]);
  const [participantsTrend, setParticipantsTrend] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [topEvents, setTopEvents] = useState([]);
  const [categoryPopularity, setCategoryPopularity] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Загрузка всех событий организатора
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          event_participants(count),
          reviews(rating)
        `)
        .eq('creator_id', userId);

      if (eventsError) throw eventsError;

      // Общая статистика
      const totalEvents = events.length;
      const completedEvents = events.filter(e => e.lifecycle_status === 'completed').length;
      const activeEvents = events.filter(e => e.lifecycle_status === 'upcoming' || e.lifecycle_status === 'ongoing').length;
      const cancelledEvents = events.filter(e => e.lifecycle_status === 'cancelled').length;

      let totalParticipants = 0;
      let totalRevenue = 0;
      let totalRating = 0;
      let ratingCount = 0;

      events.forEach(event => {
        // Подсчёт участников
        const participantsCount = event.event_participants?.[0]?.count || 0;
        totalParticipants += participantsCount;

        // Подсчёт доходов
        const eventRevenue = (event.price || 0) * participantsCount;
        totalRevenue += eventRevenue;

        // Подсчёт рейтинга
        if (event.reviews && event.reviews.length > 0) {
          event.reviews.forEach(review => {
            totalRating += review.rating;
            ratingCount++;
          });
        }
      });

      const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;

      setStats({
        totalEvents,
        totalParticipants,
        totalRevenue: totalRevenue.toFixed(2),
        avgRating,
        completedEvents,
        activeEvents,
        cancelledEvents
      });

      // События по категориям
      const categoryCounts = {};
      events.forEach(event => {
        categoryCounts[event.category] = (categoryCounts[event.category] || 0) + 1;
      });

      const categoryData = Object.entries(categoryCounts).map(([category, count]) => ({
        name: getCategoryName(category, t),
        value: count
      }));
      setEventsByCategory(categoryData);

      // Популярность категорий (по участникам)
      const categoryPopularityData = {};
      events.forEach(event => {
        const participantsCount = event.event_participants?.[0]?.count || 0;
        if (!categoryPopularityData[event.category]) {
          categoryPopularityData[event.category] = { count: 0, participants: 0 };
        }
        categoryPopularityData[event.category].count++;
        categoryPopularityData[event.category].participants += participantsCount;
      });

      const popularityData = Object.entries(categoryPopularityData).map(([category, data]) => ({
        category: getCategoryName(category, t),
        avgParticipants: (data.participants / data.count).toFixed(1)
      }));
      setCategoryPopularity(popularityData);

      // Топ события по посещаемости
      const sortedByParticipants = [...events]
        .map(event => ({
          ...event,
          participantsCount: event.event_participants?.[0]?.count || 0
        }))
        .sort((a, b) => b.participantsCount - a.participantsCount)
        .slice(0, 5);

      setTopEvents(sortedByParticipants);

      // Тренд участников по месяцам
      const participantsByMonth = {};
      events.forEach(event => {
        const month = new Date(event.event_date).toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'short'
        });
        const participantsCount = event.event_participants?.[0]?.count || 0;
        participantsByMonth[month] = (participantsByMonth[month] || 0) + participantsCount;
      });

      const trendData = Object.entries(participantsByMonth)
        .map(([month, count]) => ({ month, participants: count }))
        .slice(-6);
      setParticipantsTrend(trendData);

      // Тренд доходов по месяцам
      const revenueByMonth = {};
      events.forEach(event => {
        const month = new Date(event.event_date).toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'short'
        });
        const participantsCount = event.event_participants?.[0]?.count || 0;
        const revenue = (event.price || 0) * participantsCount;
        revenueByMonth[month] = (revenueByMonth[month] || 0) + revenue;
      });

      const revData = Object.entries(revenueByMonth)
        .map(([month, revenue]) => ({ month, revenue: revenue.toFixed(2) }))
        .slice(-6);
      setRevenueTrend(revData);

    } catch (error) {
      console.error('Ошибка загрузки данных дашборда:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return <div className="dashboard-loading">{t('dashboard.loading')}</div>;
  }

  return (
    <div className="organizer-dashboard">
      {/* Общая статистика */}
      <div className="stats-cards">
        <div className="stat-card">
          <h3>{t('dashboard.totalEvents')}</h3>
          <p className="stat-value">{stats.totalEvents}</p>
          <div className="stat-breakdown">
            <span>{t('dashboard.activeEvents')}: {stats.activeEvents}</span>
            <span>{t('dashboard.completedEvents')}: {stats.completedEvents}</span>
            <span>{t('dashboard.cancelledEvents')}: {stats.cancelledEvents}</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>{t('dashboard.totalParticipants')}</h3>
          <p className="stat-value">{stats.totalParticipants}</p>
        </div>
        <div className="stat-card">
          <h3>{t('dashboard.totalRevenue')}</h3>
          <p className="stat-value">{stats.totalRevenue} ₽</p>
        </div>
        <div className="stat-card">
          <h3>{t('dashboard.averageRating')}</h3>
          <p className="stat-value">{stats.avgRating} ⭐</p>
        </div>
      </div>

      {/* Графики */}
      <div className="charts-grid">
        {/* События по категориям */}
        {eventsByCategory.length > 0 && (
          <div className="chart-card">
            <h3>{t('dashboard.eventsByCategory')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventsByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {eventsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Тренд участников */}
        {participantsTrend.length > 0 && (
          <div className="chart-card">
            <h3>{t('dashboard.attendanceTrend')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={participantsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="participants" stroke="#8884d8" name={t('dashboard.participants')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Тренд доходов */}
        {revenueTrend.length > 0 && (
          <div className="chart-card">
            <h3>{t('dashboard.revenueTrend')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#82ca9d" name={t('dashboard.revenue')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Популярность категорий */}
        {categoryPopularity.length > 0 && (
          <div className="chart-card">
            <h3>{t('dashboard.categoryPopularity')}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryPopularity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgParticipants" fill="#0088FE" name={t('dashboard.averageParticipants')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Топ события */}
      {topEvents.length > 0 && (
        <div className="top-events">
          <h3>{t('dashboard.topEvents')}</h3>
          <table className="events-table">
            <thead>
              <tr>
                <th>{t('dashboard.eventName')}</th>
                <th>{t('dashboard.category')}</th>
                <th>{t('dashboard.date')}</th>
                <th>{t('dashboard.participants')}</th>
                <th>{t('dashboard.status')}</th>
              </tr>
            </thead>
            <tbody>
              {topEvents.map(event => (
                <tr key={event.id}>
                  <td>{event.title}</td>
                  <td>{getCategoryName(event.category, t)}</td>
                  <td>{new Date(event.event_date).toLocaleDateString('ru-RU')}</td>
                  <td>{event.participantsCount} / {event.max_participants}</td>
                  <td>
                    <span className={`status-badge status-${event.lifecycle_status}`}>
                      {event.lifecycle_status === 'upcoming' ? t('dashboard.upcoming') :
                       event.lifecycle_status === 'ongoing' ? t('dashboard.ongoing') :
                       event.lifecycle_status === 'completed' ? t('dashboard.completed') : t('dashboard.cancelled')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OrganizerDashboard;

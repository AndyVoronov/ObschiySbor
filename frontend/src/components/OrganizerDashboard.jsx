import { useState, useEffect } from 'react';
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
      const completedEvents = events.filter(e => e.status === 'completed').length;
      const activeEvents = events.filter(e => e.status === 'active').length;
      const cancelledEvents = events.filter(e => e.status === 'cancelled').length;

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
        name: getCategoryName(category),
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
        category: getCategoryName(category),
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
    return <div className="dashboard-loading">Загрузка статистики...</div>;
  }

  return (
    <div className="organizer-dashboard">
      <h2>Дашборд организатора</h2>

      {/* Общая статистика */}
      <div className="stats-cards">
        <div className="stat-card">
          <h3>Всего событий</h3>
          <p className="stat-value">{stats.totalEvents}</p>
          <div className="stat-breakdown">
            <span>Активные: {stats.activeEvents}</span>
            <span>Завершённые: {stats.completedEvents}</span>
            <span>Отменённые: {stats.cancelledEvents}</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>Участники</h3>
          <p className="stat-value">{stats.totalParticipants}</p>
        </div>
        <div className="stat-card">
          <h3>Доходы</h3>
          <p className="stat-value">{stats.totalRevenue} ₽</p>
        </div>
        <div className="stat-card">
          <h3>Средний рейтинг</h3>
          <p className="stat-value">{stats.avgRating} ⭐</p>
        </div>
      </div>

      {/* Графики */}
      <div className="charts-grid">
        {/* События по категориям */}
        {eventsByCategory.length > 0 && (
          <div className="chart-card">
            <h3>События по категориям</h3>
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
            <h3>Посещаемость по месяцам</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={participantsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="participants" stroke="#8884d8" name="Участники" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Тренд доходов */}
        {revenueTrend.length > 0 && (
          <div className="chart-card">
            <h3>Доходы по месяцам</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#82ca9d" name="Доход (₽)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Популярность категорий */}
        {categoryPopularity.length > 0 && (
          <div className="chart-card">
            <h3>Средняя посещаемость по категориям</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryPopularity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgParticipants" fill="#0088FE" name="Среднее кол-во участников" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Топ события */}
      {topEvents.length > 0 && (
        <div className="top-events">
          <h3>Топ-5 событий по посещаемости</h3>
          <table className="events-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Категория</th>
                <th>Дата</th>
                <th>Участники</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {topEvents.map(event => (
                <tr key={event.id}>
                  <td>{event.title}</td>
                  <td>{getCategoryName(event.category)}</td>
                  <td>{new Date(event.event_date).toLocaleDateString('ru-RU')}</td>
                  <td>{event.participantsCount} / {event.max_participants}</td>
                  <td>
                    <span className={`status-badge status-${event.status}`}>
                      {event.status === 'active' ? 'Активно' :
                       event.status === 'completed' ? 'Завершено' : 'Отменено'}
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

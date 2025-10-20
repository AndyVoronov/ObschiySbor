# Система блокировки - Следующие шаги

## ✅ Создано

1. **BlockedUserNotice.jsx + CSS** - компонент уведомления о блокировке
2. **AppealBlockModal.jsx + CSS** - модальное окно обжалования
3. **Миграция БД** - полностью применена

## 📋 Осталось создать

### 1. BlockUserModal.jsx (Модальное окно блокировки админом)

```jsx
// Файл: frontend/src/components/BlockUserModal.jsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const BlockUserModal = ({ isOpen, onClose, targetUser, onSuccess }) => {
  const { user } = useAuth();
  const [blockType, setBlockType] = useState('temporary'); // 'temporary' | 'permanent'
  const [reason, setReason] = useState('');
  const [blockedUntil, setBlockedUntil] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBlock = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const until = blockType === 'permanent' ? null : new Date(blockedUntil).toISOString();

      // Вызываем функцию БД block_user
      const { data, error } = await supabase.rpc('block_user', {
        p_user_id: targetUser.id,
        p_blocked_by: user.id,
        p_reason: reason,
        p_blocked_until: until
      });

      if (error) throw error;

      alert(`Пользователь ${targetUser.full_name || targetUser.email} успешно заблокирован`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      alert('Ошибка блокировки: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... остальной JSX
};

export default BlockUserModal;
```

### 2. Обновить Admin.jsx - Разделить на вкладки

```jsx
// Добавить состояние вкладок
const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'users' | 'appeals'

// В JSX
<div className="admin-tabs">
  <button
    className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
    onClick={() => setActiveTab('reports')}
  >
    Жалобы
  </button>
  <button
    className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
    onClick={() => setActiveTab('users')}
  >
    Пользователи
  </button>
  <button
    className={`tab-button ${activeTab === 'appeals' ? 'active' : ''}`}
    onClick={() => setActiveTab('appeals')}
  >
    Обжалования
  </button>
</div>

{activeTab === 'reports' && <ReportsTab />}
{activeTab === 'users' && <UsersTab />}
{activeTab === 'appeals' && <AppealsTab />}
```

### 3. Создать компонент UsersTab

```jsx
// В Admin.jsx или отдельный файл
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBlocked, setFilterBlocked] = useState('all'); // 'all' | 'blocked' | 'active'
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [filterBlocked]);

  const loadUsers = async () => {
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
    if (!error) setUsers(data || []);
  };

  const handleUnblock = async (userId) => {
    if (!confirm('Разблокировать этого пользователя?')) return;

    const { error } = await supabase.rpc('unblock_user', {
      p_user_id: userId,
      p_unblocked_by: user.id,
      p_reason: 'Разблокирован администратором'
    });

    if (!error) {
      alert('Пользователь разблокирован');
      loadUsers();
    }
  };

  // ... JSX с таблицей пользователей
};
```

### 4. Создать компонент AppealsTab

```jsx
const AppealsTab = () => {
  const [appeals, setAppeals] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState(null);

  useEffect(() => {
    loadAppeals();
  }, []);

  const loadAppeals = async () => {
    const { data, error } = await supabase
      .from('block_appeals')
      .select(`
        *,
        user:user_id(id, full_name, email),
        block:block_id(reason, blocked_at, blocked_until)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error) setAppeals(data || []);
  };

  const handleApprove = async (appealId) => {
    const { error } = await supabase.rpc('approve_block_appeal', {
      p_appeal_id: appealId,
      p_reviewed_by: user.id,
      p_admin_comment: 'Обжалование одобрено'
    });

    if (!error) {
      alert('Обжалование одобрено, пользователь разблокирован');
      loadAppeals();
    }
  };

  const handleReject = async (adminComment) => {
    const { error } = await supabase.rpc('reject_block_appeal', {
      p_appeal_id: selectedAppeal.id,
      p_reviewed_by: user.id,
      p_admin_comment: adminComment
    });

    if (!error) {
      alert('Обжалование отклонено');
      loadAppeals();
      setShowRejectModal(false);
    }
  };

  // ... JSX с карточками обжалований
};
```

### 5. Добавить проверку блокировки в CreateEvent.jsx

```jsx
import BlockedUserNotice from '../components/BlockedUserNotice';

// В useEffect
useEffect(() => {
  const checkBlockStatus = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_blocked, block_reason, blocked_at, blocked_until')
      .eq('id', user.id)
      .single();

    setBlockInfo(profile);
  };

  if (user) checkBlockStatus();
}, [user]);

// В JSX перед формой
{blockInfo?.is_blocked && <BlockedUserNotice blockInfo={blockInfo} />}
{!blockInfo?.is_blocked && (
  <form onSubmit={handleSubmit}>
    {/* Форма создания события */}
  </form>
)}
```

### 6. Добавить проверку блокировки в EventDetails.jsx

```jsx
// Аналогично CreateEvent, но блокировать кнопку "Участвовать"
const [blockInfo, setBlockInfo] = useState(null);

useEffect(() => {
  if (user) {
    checkBlockStatus();
  }
}, [user]);

const checkBlockStatus = async () => {
  const { data } = await supabase
    .from('profiles')
    .select('is_blocked, block_reason, blocked_at, blocked_until')
    .eq('id', user.id)
    .single();

  setBlockInfo(data);
};

// В JSX
{blockInfo?.is_blocked ? (
  <BlockedUserNotice blockInfo={blockInfo} />
) : (
  <button onClick={handleJoin}>Участвовать</button>
)}
```

### 7. Обновить Rules.jsx

```jsx
// Добавить новый раздел после существующих правил
<section className="rules-section">
  <div className="rule-icon">⚖️</div>
  <h2>6. Модерация и санкции</h2>

  <h3>Блокировка аккаунта</h3>
  <ul className="rules-list">
    <li>За нарушение правил ваш аккаунт может быть заблокирован</li>
    <li>Блокировка может быть временной (на определённый срок) или постоянной</li>
    <li>При блокировке вы <strong>не сможете</strong>:
      <ul>
        <li>Создавать новые события</li>
        <li>Участвовать в существующих событиях</li>
      </ul>
    </li>
    <li>Вы получите уведомление с указанием причины и срока блокировки</li>
  </ul>

  <h3>Обжалование блокировки</h3>
  <ul className="rules-list">
    <li>Если вы считаете блокировку несправедливой, можете подать обжалование</li>
    <li>Обжалование рассматривается администрацией в течение 48 часов</li>
    <li>Вы получите уведомление о решении по вашему обжалованию</li>
    <li>При одобрении обжалования блокировка будет снята немедленно</li>
    <li>Вы можете подать только одно обжалование на каждую блокировку</li>
  </ul>

  <h3>Виды нарушений и санкции</h3>
  <ul className="rules-list">
    <li><strong>Первое нарушение:</strong> предупреждение или блокировка на 7 дней</li>
    <li><strong>Повторное нарушение:</strong> блокировка на 30 дней</li>
    <li><strong>Серьёзные нарушения:</strong> немедленная постоянная блокировка
      <ul>
        <li>Оскорбления, угрозы, дискриминация</li>
        <li>Мошенничество</li>
        <li>Спам и реклама</li>
        <li>Незаконная деятельность</li>
      </ul>
    </li>
  </ul>
</section>

// Обновить дату
<p className="update-date">
  Последнее обновление: 20 октября 2025
</p>
```

## 🚀 Порядок внедрения

1. ✅ BlockedUserNotice + AppealBlockModal (СДЕЛАНО)
2. Создать BlockUserModal.jsx + CSS
3. Обновить Admin.jsx - добавить вкладки
4. Создать UsersTab + AppealsTab
5. Добавить проверки в CreateEvent.jsx
6. Добавить проверки в EventDetails.jsx
7. Обновить Rules.jsx
8. Протестировать весь flow
9. Закоммитить и задеплоить

## 💡 Советы

- Используйте существующие стили из Admin.css
- Копируйте паттерны модальных окон из InviteFriendsModal
- Проверяйте роль админа перед вызовом функций БД
- Добавьте loading состояния везде

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверка текущей сессии
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Подписка на изменения аутентификации
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    if (error) throw error;

    // После успешной регистрации проверяем, что профиль создался корректно
    if (data.user) {
      // Даем задержку для работы триггера, затем проверяем и при необходимости исправляем профиль
      setTimeout(async () => {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, city')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile || !profile.full_name || !profile.city) {
            console.warn('Профиль не заполнен корректно, создаем/обновляем вручную');

            // Создаем/обновляем профиль с правильными данными
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: userData.full_name || '',
              city: userData.city || '',
              interests: userData.interests || '',
              gender: userData.gender && ['male', 'female', 'other'].includes(userData.gender)
                ? userData.gender
                : null,
              updated_at: new Date().toISOString(),
            });
          }
        } catch (profileError) {
          console.warn('Ошибка проверки/создания профиля при регистрации:', profileError);
        }
      }, 1500); // 1.5 секунды задержки для работы триггера
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithProvider = async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
    });
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithProvider,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

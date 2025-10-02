/**
 * Автоматическое применение SQL схемы через Supabase Dashboard
 * Использует Playwright для автоматизации браузера
 */

import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';

const SUPABASE_PROJECT_URL = 'https://supabase.com/dashboard/project/wrfcpsljchyetbmupqgc';
const SQL_FILE_PATH = './database/quick-schema.sql';

async function applySQLAutomatically() {
  console.log('🚀 Автоматическое применение SQL схемы через браузер...\n');

  let browser;
  try {
    // Читаем SQL
    const sql = readFileSync(SQL_FILE_PATH, 'utf8');
    console.log('📄 SQL схема загружена');
    console.log(`📊 Размер: ${(sql.length / 1024).toFixed(2)} KB\n`);

    // Запускаем браузер
    console.log('🌐 Открываю браузер...');
    browser = await chromium.launch({
      headless: false, // Показываем браузер
      slowMo: 500, // Замедляем для наглядности
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Переходим на страницу входа Supabase
    console.log('📱 Открываю Supabase Dashboard...');
    await page.goto(`${SUPABASE_PROJECT_URL}/sql/new`);

    // Ждём загрузки страницы
    await page.waitForTimeout(3000);

    console.log('\n⚠️  ТРЕБУЕТСЯ ВХОД В АККАУНТ');
    console.log('👉 Пожалуйста, войдите в ваш аккаунт Supabase в открывшемся браузере');
    console.log('👉 После входа вы будете перенаправлены в SQL Editor');
    console.log('👉 Скрипт продолжит работу автоматически...\n');

    // Ждём пока пользователь войдёт (проверяем наличие SQL editor)
    try {
      await page.waitForSelector('[data-testid="sql-editor"]', { timeout: 120000 });
      console.log('✅ SQL Editor загружен!\n');
    } catch {
      // Если нет data-testid, пробуем другие селекторы
      try {
        await page.waitForSelector('.monaco-editor', { timeout: 10000 });
        console.log('✅ Monaco Editor обнаружен!\n');
      } catch {
        console.log('⚠️  Не удалось найти SQL Editor');
        console.log('📝 Пожалуйста, убедитесь что вы на странице SQL Editor');
        await page.waitForTimeout(5000);
      }
    }

    // Копируем SQL в буфер обмена
    console.log('📋 Копирую SQL в буфер обмена...');
    await page.evaluate((sqlContent) => {
      navigator.clipboard.writeText(sqlContent);
    }, sql);

    console.log('✅ SQL скопирован в буфер обмена!\n');
    console.log('📝 Инструкция:');
    console.log('   1. Нажмите Ctrl+A в SQL Editor (выделить всё)');
    console.log('   2. Нажмите Ctrl+V (вставить SQL из буфера)');
    console.log('   3. Нажмите "Run" или F5');
    console.log('   4. Дождитесь "Success"');
    console.log('\n💡 После выполнения закройте браузер или нажмите Ctrl+C\n');

    // Ждём пока пользователь выполнит SQL
    console.log('⏳ Ожидаю выполнения SQL (нажмите Ctrl+C когда закончите)...');
    await page.waitForTimeout(300000); // 5 минут

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    if (browser) {
      console.log('\n🔒 Закрываю браузер...');
      await browser.close();
    }
  }

  console.log('\n✅ Готово! Запустите "node init-db.js" для проверки\n');
}

// Запуск
applySQLAutomatically();

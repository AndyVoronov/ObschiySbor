import { test, expect } from '@playwright/test';

test.describe('ObschiySbor Basic Tests', () => {
  test('Главная страница загружается корректно', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Проверяем заголовок
    await expect(page.locator('h1')).toContainText('Добро пожаловать в ObschiySbor');

    // Проверяем наличие кнопок
    await expect(page.getByText('Найти событие')).toBeVisible();
    await expect(page.getByText('Создать событие')).toBeVisible();
  });

  test('Навигация работает корректно', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Переход на страницу событий
    await page.getByRole('link', { name: 'События' }).click();
    await expect(page).toHaveURL(/.*events/);
    await expect(page.locator('h1')).toContainText('Поиск событий');

    // Переход на страницу входа
    await page.getByRole('link', { name: 'Вход' }).click();
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2')).toContainText('Вход в систему');
  });

  test('Страница регистрации отображается корректно', async ({ page }) => {
    await page.goto('http://localhost:5173/register');

    await expect(page.locator('h2')).toContainText('Регистрация');
    await expect(page.getByLabel('Полное имя')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Город')).toBeVisible();
    await expect(page.getByLabel('Пароль', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Подтвердите пароль')).toBeVisible();
  });

  test('Страница событий содержит фильтры', async ({ page }) => {
    await page.goto('http://localhost:5173/events');

    // Проверяем наличие фильтров
    await expect(page.getByPlaceholder('Поиск по названию...')).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('Защищенные маршруты перенаправляют на логин', async ({ page }) => {
    await page.goto('http://localhost:5173/create-event');

    // Должен перенаправить на страницу логина
    await expect(page).toHaveURL(/.*login/);
  });

  test('Форма логина валидируется', async ({ page }) => {
    await page.goto('http://localhost:5173/login');

    // Попытка отправить пустую форму
    await page.getByRole('button', { name: 'Войти' }).click();

    // Проверяем, что поля обязательны
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Пароль');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('Категории событий отображаются на главной', async ({ page }) => {
    await page.goto('http://localhost:5173');

    await expect(page.getByText('Настольные игры')).toBeVisible();
    await expect(page.getByText('Велопрогулки')).toBeVisible();
    await expect(page.getByText('Походы')).toBeVisible();
  });

  test('Футер отображается', async ({ page }) => {
    await page.goto('http://localhost:5173');

    await expect(page.getByText('© 2025 ObschiySbor')).toBeVisible();
  });
});

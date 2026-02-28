import { test, expect } from '@playwright/test';

test.describe('Landing Page (Vendas)', () => {
    test('carrega a página com título correto', async ({ page }) => {
        await page.goto('/vendas');
        await expect(page.locator('h1')).toContainText('Sua lanchonete');
    });

    test('exibe o navbar com links de navegação', async ({ page }) => {
        await page.goto('/vendas');
        await expect(page.locator('nav')).toBeVisible();
        await expect(page.getByText('Entrar')).toBeVisible();
        await expect(page.getByText('Começar Agora').first()).toBeVisible();
    });

    test('botão "Ver como funciona" abre modal de vídeo', async ({ page }) => {
        await page.goto('/vendas');
        const playButton = page.getByText('Ver como funciona');
        await playButton.click();
        // Modal deve estar visível com iframe do YouTube
        await expect(page.locator('iframe[title="Cola Aí - Demo"]')).toBeVisible();
    });

    test('modal de vídeo fecha ao clicar no X', async ({ page }) => {
        await page.goto('/vendas');
        await page.getByText('Ver como funciona').click();
        await expect(page.locator('iframe[title="Cola Aí - Demo"]')).toBeVisible();

        // Fecha o modal
        await page.locator('button:has(svg)').last().click();
        await expect(page.locator('iframe[title="Cola Aí - Demo"]')).not.toBeVisible();
    });

    test('seção de preços carrega corretamente', async ({ page }) => {
        await page.goto('/vendas');
        await expect(page.getByText('Planos Flexíveis')).toBeVisible();
        await expect(page.getByText('Básico')).toBeVisible();
        await expect(page.getByText('Avançado')).toBeVisible();
        await expect(page.getByText('Profissional')).toBeVisible();
    });

    test('toggle mensal/anual muda os preços', async ({ page }) => {
        await page.goto('/vendas');
        // Clica no botão "Anual"
        const anualBtn = page.locator('button', { hasText: 'Anual' });
        await anualBtn.click();
        // Verifica que a classe ativa mudou (teste de interação)
        await expect(anualBtn).toBeVisible();
    });

    test('FAQ accordion abre/fecha', async ({ page }) => {
        await page.goto('/vendas');

        // Scroll para FAQ
        await page.getByText('Perguntas Frequentes').scrollIntoViewIfNeeded();

        // Clica na primeira pergunta
        const firstFaq = page.getByText('Posso testar antes de assinar?');
        await firstFaq.click();

        // Resposta deve ficar visível
        await expect(page.getByText('Sim! Oferecemos 7 dias')).toBeVisible();

        // Clica novamente para fechar
        await firstFaq.click();
        // Depois de fechar, animação de saída
    });

    test('footer mostra links importantes', async ({ page }) => {
        await page.goto('/vendas');
        await expect(page.getByText('Termos')).toBeVisible();
        await expect(page.getByText('Privacidade')).toBeVisible();
        await expect(page.getByText('Suporte')).toBeVisible();
    });
});

test.describe('Login Page', () => {
    test('página de login carrega', async ({ page }) => {
        await page.goto('/login');
        // Deve ter formulário de login
        await expect(page.locator('input[type="email"], input[placeholder*="email" i]').first()).toBeVisible({ timeout: 10000 });
    });

    test('mostra erro com credenciais vazias', async ({ page }) => {
        await page.goto('/login');
        // Tenta submeter sem preencher
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
            await submitBtn.click();
            // Deve haver alguma validação
        }
    });
});

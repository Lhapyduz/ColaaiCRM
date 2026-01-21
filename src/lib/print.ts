// Print Utility Functions
// Handles printing receipts and kitchen tickets

import { createRoot } from 'react-dom/client';
import React from 'react';
import OrderReceipt from '@/components/print/OrderReceipt';
import KitchenReceipt from '@/components/print/KitchenReceipt';
import { formatCurrency } from '@/hooks/useFormatters';

interface OrderItem {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string | null;
}

interface OrderData {
    id: string;
    order_number: number;
    customer_name: string;
    customer_phone: string | null;
    customer_address: string | null;
    status: string;
    payment_method: string;
    payment_status: string;
    subtotal: number;
    delivery_fee: number;
    total: number;
    notes: string | null;
    is_delivery: boolean;
    created_at: string;
    items: OrderItem[];
    coupon_discount?: number;
}

interface PrintOptions {
    copies?: number;
    type?: 'customer' | 'kitchen' | 'both';
    appName?: string;
}

/**
 * Creates a hidden print container and renders the component
 */
function createPrintContainer(): HTMLDivElement {
    // Remove existing print container if any
    const existing = document.getElementById('print-container');
    if (existing) {
        existing.remove();
    }

    const container = document.createElement('div');
    container.id = 'print-container';
    container.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 80mm;
        background: white;
        z-index: -1;
    `;
    document.body.appendChild(container);
    return container;
}

/**
 * Print using a new window (more reliable for thermal printers)
 */
function printWithNewWindow(html: string, title: string): Promise<void> {
    return new Promise((resolve) => {
        const printWindow = window.open('', '_blank', 'width=350,height=600');

        if (!printWindow) {
            alert('Por favor, permita pop-ups para imprimir.');
            resolve();
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: 'Courier New', Courier, monospace;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .receipt {
                        width: 80mm;
                        max-width: 302px;
                        padding: 10px;
                        background: #fff;
                        color: #000;
                    }
                    /* Basic styles for receipts */
                    .header { text-align: center; margin-bottom: 10px; }
                    .businessName { font-size: 18px; font-weight: bold; margin: 0 0 5px 0; }
                    .receiptType { font-size: 14px; font-weight: bold; padding: 4px 8px; background: #000; color: #fff; display: inline-block; }
                    .orderNumber { font-size: 36px; font-weight: bold; margin: 8px 0; }
                    .divider { border: none; border-top: 1px dashed #000; margin: 8px 0; }
                    .dividerDouble { border: none; border-top: 2px solid #000; margin: 8px 0; }
                    .sectionTitle { font-size: 11px; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; }
                    .customerName { font-weight: bold; font-size: 13px; }
                    .itemsTable { width: 100%; border-collapse: collapse; }
                    .itemsTable th, .itemsTable td { padding: 4px 2px; text-align: left; }
                    .itemNotes { font-size: 10px; color: #555; font-style: italic; }
                    .grandTotal { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-top: 1px solid #000; padding-top: 6px; }
                    .footer { text-align: center; margin-top: 10px; }
                    .copyLabel { font-size: 10px; font-weight: bold; letter-spacing: 2px; }
                </style>
            </head>
            <body>
                ${html}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.close();
                        }, 250);
                    };
                </script>
            </body>
            </html>
        `);

        printWindow.document.close();

        // Resolve after a delay to ensure print dialog appeared
        setTimeout(resolve, 1000);
    });
}

/**
 * Generate customer receipt HTML
 */
function generateCustomerReceiptHTML(order: OrderData, appName: string): string {
    const formatDate = (date: string) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
        }).format(new Date(date));
    };

    const getPaymentLabel = (method: string) => {
        const labels: Record<string, string> = { money: 'Dinheiro', credit: 'Crédito', debit: 'Débito', pix: 'PIX' };
        return labels[method] || method;
    };

    return `
        <div class="receipt">
            <div class="header">
                <h1 class="businessName">${appName}</h1>
                <div class="receiptType">${order.is_delivery ? '🚚 ENTREGA' : '🏪 BALCÃO'}</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin: 10px 0;">
                <div>
                    <div style="font-size: 10px; color: #666;">PEDIDO</div>
                    <div style="font-size: 20px; font-weight: bold;">#${order.order_number}</div>
                </div>
                <div style="font-size: 11px; text-align: right;">${formatDate(order.created_at)}</div>
            </div>
            
            <div class="divider"></div>
            
            <div class="sectionTitle">CLIENTE</div>
            <div class="customerName">${order.customer_name}</div>
            ${order.customer_phone ? `<div style="font-size: 11px;">Tel: ${order.customer_phone}</div>` : ''}
            ${order.is_delivery && order.customer_address ? `<div style="font-size: 11px; margin-top: 4px; padding: 4px; background: #f5f5f5; border-left: 3px solid #000;"><strong>Endereço:</strong> ${order.customer_address}</div>` : ''}
            
            <div class="divider"></div>
            
            <div class="sectionTitle">ITENS</div>
            <table class="itemsTable">
                <thead>
                    <tr><th style="width: 30px;">Qtd</th><th>Item</th><th style="width: 60px; text-align: right;">Valor</th></tr>
                </thead>
                <tbody>
                    ${order.items.map(item => `
                        <tr>
                            <td style="font-weight: bold; text-align: center;">${item.quantity}x</td>
                            <td>${item.product_name}</td>
                            <td style="text-align: right;">${formatCurrency(item.total)}</td>
                        </tr>
                        ${item.notes ? `<tr><td></td><td colspan="2" class="itemNotes">Obs: ${item.notes}</td></tr>` : ''}
                    `).join('')}
                </tbody>
            </table>
            
            ${order.notes ? `<div class="divider"></div><div style="font-size: 11px; padding: 6px; background: #f9f9f9; border: 1px dashed #999;"><strong>Observações:</strong> ${order.notes}</div>` : ''}
            
            <div class="dividerDouble"></div>
            
            <div style="margin: 6px 0;">
                <div style="display: flex; justify-content: space-between; font-size: 12px;"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
                ${order.delivery_fee > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 12px;"><span>Taxa de Entrega</span><span>${formatCurrency(order.delivery_fee)}</span></div>` : ''}
                ${(order.coupon_discount && order.coupon_discount > 0) ? `<div style="display: flex; justify-content: space-between; font-size: 12px; color: green;"><span>Desconto</span><span>-${formatCurrency(order.coupon_discount)}</span></div>` : ''}
                <div class="grandTotal"><span>TOTAL</span><span>${formatCurrency(order.total)}</span></div>
            </div>
            
            <div class="divider"></div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div><span style="font-size: 11px;">Pagamento:</span> <strong>${getPaymentLabel(order.payment_method)}</strong></div>
                <div style="font-weight: bold; padding: 2px 8px; background: #000; color: #fff;">${order.payment_status === 'paid' ? '✓ PAGO' : '⏳ PENDENTE'}</div>
            </div>
            
            <div class="dividerDouble"></div>
            
            <div class="footer">
                <p style="margin: 0 0 4px 0;">Obrigado pela preferência!</p>
                <p style="margin: 0; font-size: 10px; color: #666;">${appName}</p>
            </div>
            
            <div style="text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #000;">
                <span class="copyLabel">VIA DO CLIENTE</span>
            </div>
        </div>
    `;
}

/**
 * Generate kitchen receipt HTML
 */
function generateKitchenReceiptHTML(order: OrderData): string {
    const formatTime = (date: string) => {
        return new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
        }).format(new Date(date));
    };

    return `
        <div class="receipt" style="font-size: 14px;">
            <div class="header">
                <div class="receiptType" style="font-size: 16px; padding: 6px 12px;">${order.is_delivery ? '🚚 ENTREGA' : '🏪 BALCÃO'}</div>
                <div class="orderNumber">#${order.order_number}</div>
                <div style="font-size: 14px; color: #666;">${formatTime(order.created_at)}</div>
            </div>
            
            <div class="divider"></div>
            
            <div style="font-size: 18px; font-weight: bold; text-align: center; padding: 6px 0; text-transform: uppercase;">
                ${order.customer_name}
            </div>
            
            <div class="dividerDouble" style="border-top-width: 3px;"></div>
            
            <div style="margin: 10px 0;">
                ${order.items.map((item, index) => `
                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; align-items: baseline; gap: 8px;">
                            <span style="font-size: 24px; font-weight: bold; min-width: 50px;">${item.quantity}x</span>
                            <span style="font-size: 18px; font-weight: bold;">${item.product_name}</span>
                        </div>
                        ${item.notes ? `<div style="margin-top: 4px; margin-left: 58px; font-size: 14px; font-style: italic; background: #f5f5f5; padding: 4px 8px; border-left: 4px solid #000;">★ ${item.notes}</div>` : ''}
                        ${index < order.items.length - 1 ? '<div style="border-top: 1px dotted #999; margin: 8px 0;"></div>' : ''}
                    </div>
                `).join('')}
            </div>
            
            ${order.notes ? `
                <div class="dividerDouble" style="border-top-width: 3px;"></div>
                <div style="padding: 8px; background: #ffeb3b; border: 2px solid #000;">
                    <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">⚠️ OBSERVAÇÕES</div>
                    <div style="font-size: 14px; font-weight: bold;">${order.notes}</div>
                </div>
            ` : ''}
            
            <div class="dividerDouble" style="border-top-width: 3px;"></div>
            
            <div style="text-align: center; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #000;">
                <span style="font-size: 14px; font-weight: bold; letter-spacing: 4px; padding: 4px 16px; background: #000; color: #fff;">COZINHA</span>
            </div>
        </div>
    `;
}

/**
 * Print order receipt
 */
export async function printOrder(order: OrderData, options: PrintOptions = {}): Promise<void> {
    const { copies = 1, type = 'both', appName = 'Cola Aí' } = options;

    let html = '';

    if (type === 'customer' || type === 'both') {
        for (let i = 0; i < copies; i++) {
            html += generateCustomerReceiptHTML(order, appName);
            if (type === 'both' || i < copies - 1) {
                html += '<div style="page-break-after: always;"></div>';
            }
        }
    }

    if (type === 'kitchen' || type === 'both') {
        html += generateKitchenReceiptHTML(order);
    }

    await printWithNewWindow(html, `Pedido #${order.order_number}`);
}

/**
 * Quick print just customer receipt
 */
export async function printCustomerReceipt(order: OrderData, appName: string = 'Cola Aí'): Promise<void> {
    await printOrder(order, { type: 'customer', appName });
}

/**
 * Quick print just kitchen ticket
 */
export async function printKitchenTicket(order: OrderData): Promise<void> {
    await printOrder(order, { type: 'kitchen' });
}

/**
 * Print both receipts
 */
export async function printBothReceipts(order: OrderData, appName: string = 'Cola Aí'): Promise<void> {
    await printOrder(order, { type: 'both', appName });
}


import { ReturnRecord, NCRRecord } from '../types';

/**
 * Telegram Bot Service
 * Handles sending notifications to Telegram groups/chats
 */

// NOTE: In a production environment, these should be handled via a secure backend or Firebase Functions.
// For this implementation, we use direct fetch calls as per the project's strategy to keep it serverless/free-tier.

export interface TelegramConfig {
    botToken: string;
    chatId: string;
    enabled: boolean;
}

export const sendTelegramMessage = async (token: string, chatId: string, message: string) => {
    if (!token || !chatId) return false;

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        return false;
    }
};

/**
 * Formats a notification message for a new Return Request
 */
export const formatReturnRequestMessage = (record: ReturnRecord) => {
    return `
📦 <b>มีรายการขอคืนสินค้าใหม่ (Step 1)</b>
----------------------------------
<b>เลขที่เอกสาร:</b> ${record.documentNo || record.refNo || '-'}
<b>สาขา:</b> ${record.branch}
<b>ลูกค้า:</b> ${record.customerName}
<b>สินค้า:</b> ${record.productName}
<b>จำนวน:</b> ${record.quantity} ${record.unit}
<b>ผู้แจ้ง:</b> ${record.founder || '-'}
<b>สาเหตุ:</b> ${record.reason || '-'}
----------------------------------
📅 <i>${new Date().toLocaleString('th-TH')}</i>
  `.trim();
};

/**
 * Formats a notification message for a new NCR
 */
export const formatNCRMessage = (record: NCRRecord) => {
    const item = record.item;
    return `
⚠️ <b>มีแจ้งปัญหา NCR ใหม่!</b>
----------------------------------
<b>เลขที่ NCR:</b> ${record.ncrNo}
<b>สินค้า:</b> ${item.productName}
<b>จำนวน:</b> ${item.quantity} ${item.unit}
<b>สาขา:</b> ${item.branch}
<b>ลูกค้า:</b> ${item.customerName}
<b>ผู้พบปัญหา:</b> ${record.founder}
<b>รายละเอียด:</b> ${record.problemDetail || '-'}
----------------------------------
📅 <i>${new Date().toLocaleString('th-TH')}</i>
  `.trim();
};

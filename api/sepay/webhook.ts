/**
 * SePay Webhook API
 * POST /api/sepay/webhook
 */

interface ApiRequest {
  method?: string;
  body?: any;
}

interface ApiResponse {
  status: (code: number) => { json: (data: any) => void };
  json: (data: any) => void;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const webhookData = req.body;

    // Validate
    if (!webhookData || !webhookData.id) {
      return res.status(400).json({ error: 'Invalid webhook data' });
    }

    // Lưu vào Firebase
    const { collection, addDoc, Timestamp } = await import('firebase/firestore');
    const { db } = await import('../../config/firebase');

    const transactionData = {
      sepayId: webhookData.id,
      gateway: webhookData.gateway || '',
      transactionDate: webhookData.transactionDate || '',
      accountNumber: webhookData.accountNumber || '',
      code: webhookData.code || null,
      content: webhookData.content || '',
      transferType: webhookData.transferType || 'in',
      transferAmount: Number(webhookData.transferAmount) || 0,
      accumulated: Number(webhookData.accumulated) || 0,
      subAccount: webhookData.subAccount || null,
      referenceCode: webhookData.referenceCode || '',
      description: webhookData.description || '',
      receivedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    const transactionsRef = collection(db, 'transaction');
    await addDoc(transactionsRef, transactionData);

    console.log('✅ Webhook saved:', webhookData.id);

    return res.status(200).json({
      success: true,
      message: 'Webhook received',
      transactionId: webhookData.id,
    });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

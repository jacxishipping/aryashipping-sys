import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeAccessCode } from './session';
import {
  escapeHtml,
  formatProgressBar,
  formatShipmentCard,
  formatStatusBadge,
  type TelegramShipmentSummary,
} from './services';
import { getWebhookUrl } from './config';

describe('Telegram Utilities & Sanitization', () => {
  it('should sanitize 8-digit access codes correctly', () => {
    assert.strictEqual(sanitizeAccessCode('  abcd-1234 '), 'ABCD1234');
    assert.strictEqual(sanitizeAccessCode('1234 5678'), '12345678');
    assert.strictEqual(sanitizeAccessCode('JACX_9999'), 'JACX9999');
    assert.strictEqual(sanitizeAccessCode(''), '');
  });

  it('should generate correct webhook URL from app URL', () => {
    assert.strictEqual(
      getWebhookUrl('https://jacxishipping.com'),
      'https://jacxishipping.com/api/telegram/webhook'
    );
    assert.strictEqual(
      getWebhookUrl('https://jacxishipping.com/'),
      'https://jacxishipping.com/api/telegram/webhook'
    );
  });

  it('should format progress bar properly', () => {
    assert.strictEqual(formatProgressBar(0), '░░░░░░░░░░ 0%');
    assert.strictEqual(formatProgressBar(50), '█████░░░░░ 50%');
    assert.strictEqual(formatProgressBar(100), '██████████ 100%');
  });

  it('should format status badge properly', () => {
    assert.strictEqual(formatStatusBadge('ON_HAND'), '🟡 Yard On-Hand');
    assert.strictEqual(formatStatusBadge('IN_TRANSIT'), '🌊 Ocean Transit');
    assert.strictEqual(formatStatusBadge('DELIVERED'), '✅ Released & Delivered');
    assert.strictEqual(formatStatusBadge('RELEASED'), '✅ Released & Delivered');
  });

  it('should escape HTML safely', () => {
    assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert("xss")&lt;/script&gt;');
    assert.strictEqual(escapeHtml('BMW & Audi'), 'BMW &amp; Audi');
  });

  it('should format shipment card with vehicle info and photo count', () => {
    const mockShipment: TelegramShipmentSummary = {
      id: 'ship-123',
      vehicleLabel: '2023 BMW X5',
      vehicleYear: 2023,
      vehicleMake: 'BMW',
      vehicleModel: 'X5',
      vehicleVIN: '5UXCR6C00N1234567',
      vehicleColor: 'Alpine White',
      lotNumber: '78291024',
      auctionName: 'Copart Atlanta',
      status: 'IN_TRANSIT',
      statusLabel: '🌊 Ocean Transit',
      paymentStatus: 'COMPLETED',
      price: 1850,
      containerNumber: 'MSCU9876543',
      vesselName: 'MSC GULSUN',
      voyageNumber: '240W',
      shippingLine: 'MSC',
      loadingPort: 'Savannah, GA',
      destinationPort: 'Jebel Ali, UAE',
      departureDate: '10/15/2026',
      estimatedArrival: '11/05/2026',
      actualArrival: null,
      currentLocation: 'Atlantic Ocean',
      progress: 60,
      arrivalPhotos: ['https://jacxishipping.com/photos/1.jpg'],
      vehiclePhotos: ['https://jacxishipping.com/photos/2.jpg'],
      totalPhotosCount: 2,
      createdAt: '10/01/2026',
    };

    const card = formatShipmentCard(mockShipment);
    assert.ok(card.includes('2023 BMW X5'));
    assert.ok(card.includes('5UXCR6C00N1234567'));
    assert.ok(card.includes('MSCU9876543'));
    assert.ok(card.includes('MSC GULSUN'));
    assert.ok(card.includes('2</b> inspection/yard photo(s)'));
    assert.ok(card.includes('✅ Paid'));
  });

  it('should build Mini App launch URLs with bridge tokens for linked users', async () => {
    const { buildTelegramMiniAppUrl } = await import('./auth');
    const mockUser = {
      id: 'usr-999',
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '+15551234567',
      loginCode: 'JACX9999',
      role: 'user',
    };

    const urlWithUser = buildTelegramMiniAppUrl('/dashboard/shipments/ship-123', mockUser, 'https://jacxishipping.com');
    assert.ok(urlWithUser.startsWith('https://jacxishipping.com/telegram-app?target='));
    assert.ok(urlWithUser.includes('token=jacxi-mobile.'));

    const urlWithoutUser = buildTelegramMiniAppUrl('/dashboard', undefined, 'https://jacxishipping.com');
    assert.strictEqual(urlWithoutUser, 'https://jacxishipping.com/telegram-app?target=%2Fdashboard');
  });

  it('should verify Telegram WebApp initData HMAC signatures correctly', async () => {
    const crypto = await import('node:crypto');
    const { verifyTelegramWebAppData } = await import('./auth');
    const testBotToken = '8606925942:AAE-uHg7b4wUfG3dcqv8uvnhQpOQDEvysfM';

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(testBotToken).digest();
    const userPayload = JSON.stringify({ id: 987654321, first_name: 'Alex', username: 'alex99' });
    const now = Math.floor(Date.now() / 1000);

    const testParams = new URLSearchParams({
      auth_date: String(now),
      query_id: 'AAHfkQ...',
      user: userPayload,
    });

    const entries = Array.from(testParams.entries()).sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    testParams.set('hash', hash);

    const validResult = verifyTelegramWebAppData(testParams.toString(), testBotToken);
    assert.strictEqual(validResult.ok, true);
    if (validResult.ok) {
      assert.strictEqual(validResult.user.id, 987654321);
      assert.strictEqual(validResult.user.username, 'alex99');
    }

    // Tampered data should fail
    testParams.set('hash', 'deadbeef00000000deadbeef');
    const invalidResult = verifyTelegramWebAppData(testParams.toString(), testBotToken);
    assert.strictEqual(invalidResult.ok, false);
  });
});


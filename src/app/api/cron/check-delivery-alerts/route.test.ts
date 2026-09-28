import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDeliveryAlertNotifications } from './notifications';

describe('buildDeliveryAlertNotifications', () => {
  it('only includes warning or overdue alerts and deduplicates user IDs within a container', () => {
    const notifications = buildDeliveryAlertNotifications([
      {
        containerId: 'c-1',
        containerNumber: 'CONT-1',
        estimatedArrival: new Date('2026-09-12T00:00:00.000Z'),
        alertStatus: 'WARNING',
        userIds: ['user-1', 'user-1', 'user-2'],
      },
      {
        containerId: 'c-2',
        containerNumber: 'CONT-2',
        estimatedArrival: new Date('2026-09-08T00:00:00.000Z'),
        alertStatus: 'OVERDUE',
        userIds: ['user-2'],
      },
      {
        containerId: 'c-3',
        containerNumber: 'CONT-3',
        estimatedArrival: new Date('2026-09-30T00:00:00.000Z'),
        alertStatus: 'ON_TIME',
        userIds: ['user-3'],
      },
    ] as any);

    assert.equal(notifications.length, 3);
    assert.deepEqual(
      notifications.map((notification) => notification.userId).sort(),
      ['user-1', 'user-2', 'user-2'],
    );
    assert.ok(notifications.every((notification) => notification.type === 'WARNING'));
    assert.ok(notifications.every((notification) => typeof notification.link === 'string' && notification.link.includes('/dashboard/containers/')));
    assert.ok(notifications.every((notification) => notification.title.includes('ETA')));
  });
});

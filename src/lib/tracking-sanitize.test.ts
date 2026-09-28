import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTrackNumber } from './tracking-sanitize';

describe('sanitizeTrackNumber', () => {
  it('handles clean 17-char VINs', () => {
    assert.equal(sanitizeTrackNumber('1HGCR2F83HA123456'), '1HGCR2F83HA123456');
    assert.equal(sanitizeTrackNumber('  1hgcr2f83ha123456  '), '1HGCR2F83HA123456');
  });

  it('extracts VIN from full tracking URL with ?vin=', () => {
    const url = 'https://jacxishipping.com/tracking?vin=1HGCR2F83HA123456';
    assert.equal(sanitizeTrackNumber(url), '1HGCR2F83HA123456');
  });

  it('extracts cuid shipment ID from ?vin= in QR url', () => {
    const url = 'https://jacxishipping.com/tracking?vin=clyabcdef123456789012345';
    assert.equal(sanitizeTrackNumber(url), 'clyabcdef123456789012345');
  });

  it('extracts container from ?container= URL', () => {
    const url = 'https://jacxishipping.com/tracking?container=MSCU1234567';
    assert.equal(sanitizeTrackNumber(url), 'MSCU1234567');
  });

  it('extracts query param from ?q=, ?trackNumber=, ?trackingNumber=', () => {
    assert.equal(sanitizeTrackNumber('https://jacxishipping.com/tracking?q=TR-9988'), 'TR-9988');
    assert.equal(sanitizeTrackNumber('https://jacxishipping.com/tracking?trackNumber=UETU6059142'), 'UETU6059142');
    assert.equal(sanitizeTrackNumber('https://jacxishipping.com/tracking?trackingNumber=MEDU1234567'), 'MEDU1234567');
  });

  it('extracts last segment from shipment or container path', () => {
    assert.equal(sanitizeTrackNumber('https://jacxishipping.com/dashboard/shipments/clyabcdef123456789012345'), 'clyabcdef123456789012345');
    assert.equal(sanitizeTrackNumber('/dashboard/containers/MSCU1234567'), 'MSCU1234567');
  });

  it('strips label prefixes', () => {
    assert.equal(sanitizeTrackNumber('VIN: 1HGCR2F83HA123456'), '1HGCR2F83HA123456');
    assert.equal(sanitizeTrackNumber('Container # MSCU1234567'), 'MSCU1234567');
    assert.equal(sanitizeTrackNumber('Tracking: TR-54321'), 'TR-54321');
  });

  it('handles empty and null inputs safely', () => {
    assert.equal(sanitizeTrackNumber(''), '');
    assert.equal(sanitizeTrackNumber('   '), '');
  });
});

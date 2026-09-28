
import { test, describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { exportToCSV, exportToCSVWithHeaders, exportToExcel, formatDataForExport } from './export.ts';

describe('Export Utilities', () => {
  let originalDocument: any;
  let originalURL: any;
  let createdBlob: Blob | null = null;
  let createdLink: any = null;
  let clickedLink = false;
  let appendedLink = false;
  let removedLink = false;
  let revokedUrl: string | null = null;

  before(() => {
    originalDocument = global.document;
    originalURL = global.URL;

    // Mock document
    global.document = {
      createElement: (tag: string) => {
        if (tag === 'a') {
          createdLink = {
            setAttribute: (name: string, value: string) => {
              createdLink[name] = value;
            },
            style: {},
            click: () => {
              clickedLink = true;
            },
          };
          return createdLink;
        }
        return {};
      },
      body: {
        appendChild: (node: any) => {
          if (node === createdLink) appendedLink = true;
        },
        removeChild: (node: any) => {
          if (node === createdLink) removedLink = true;
        },
      },
    } as any;

    // Mock URL
    global.URL.createObjectURL = (blob: Blob) => {
      createdBlob = blob;
      return 'blob:url';
    };
    global.URL.revokeObjectURL = (url: string) => {
      revokedUrl = url;
    };
  });

  after(() => {
    global.document = originalDocument;
    global.URL = originalURL;
  });

  it('exportToCSV should create a CSV file and download it', async () => {
    const data = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
    const filename = 'users';

    // Reset mocks
    createdBlob = null;
    createdLink = null;
    clickedLink = false;
    appendedLink = false;
    removedLink = false;
    revokedUrl = null;

    exportToCSV(data, filename);

    assert.ok(createdBlob, 'Blob should be created');
    const csvBlob = createdBlob as Blob;
    assert.strictEqual(csvBlob.type, 'text/csv;charset=utf-8;');

    const text = await csvBlob.text();
    assert.ok(text.includes('name,age'), 'Header should be present');
    assert.ok(text.includes('John,30'), 'Data row 1 should be present');
    assert.ok(text.includes('Jane,25'), 'Data row 2 should be present');

    assert.ok(createdLink, 'Link element should be created');
    assert.strictEqual(createdLink.href, 'blob:url');
    assert.ok(createdLink.download.startsWith('users-'), 'Download filename should start with provided filename');
    assert.ok(createdLink.download.endsWith('.csv'), 'Download filename should end with .csv');

    assert.ok(appendedLink, 'Link should be appended to body');
    assert.ok(clickedLink, 'Link should be clicked');
    assert.ok(removedLink, 'Link should be removed from body');
    assert.strictEqual(revokedUrl, 'blob:url', 'URL should be revoked');
  });

  it('exportToCSVWithHeaders should use custom headers', async () => {
    const data = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
    const headers: Array<{ key: 'name' | 'age'; label: string }> = [
      { key: 'name', label: 'Full Name' },
      { key: 'age', label: 'Years' },
    ];
    const filename = 'users-custom';

    exportToCSVWithHeaders(data, headers, filename);

    const text = await createdBlob!.text();
    assert.ok(text.includes('Full Name,Years'), 'Custom headers should be used');
    assert.ok(text.includes('John,30'), 'Data should be present');
  });

  it('exportToExcel should create a CSV with BOM', async () => {
    const data = [{ name: 'John', age: 30 }];
    const filename = 'users-excel';

    exportToExcel(data, filename);

    const buffer = await createdBlob!.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check for UTF-8 BOM: EF BB BF
    assert.strictEqual(bytes[0], 0xEF, 'First byte should be 0xEF');
    assert.strictEqual(bytes[1], 0xBB, 'Second byte should be 0xBB');
    assert.strictEqual(bytes[2], 0xBF, 'Third byte should be 0xBF');

    const text = await createdBlob!.text();
    assert.ok(text.includes('name,age'), 'Header should be present');
  });

  it('formatDataForExport should format dates and booleans', () => {
    const date = new Date('2023-01-01T00:00:00.000Z');
    const data = [
      { id: 1, active: true, created: date, details: { a: 1 } }
    ];

    const formatted = formatDataForExport(data);

    assert.strictEqual(formatted[0].active, 'Yes');
    assert.strictEqual(formatted[0].created, '2023-01-01');
    assert.strictEqual(formatted[0].details, '{"a":1}');
  });

  it('should handle empty data', () => {
    assert.throws(() => exportToCSV([], 'test'), /No data to export/);
  });

  it('should handle special characters in CSV', async () => {
    const data = [{ note: 'Hello, "World"' }];
    exportToCSV(data, 'test');

    const text = await createdBlob!.text();
    assert.ok(text.includes('"Hello, ""World"""'), 'Quotes and commas should be escaped');
  });
});

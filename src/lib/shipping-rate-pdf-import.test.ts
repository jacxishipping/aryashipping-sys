import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { jsPDF } from 'jspdf';
import { extractAuctionRatesFromPdf } from './shipping-rate-pdf-import.ts';

describe('company price-list PDF parsing', () => {
  it('extracts auction lane rows from a generated PDF', async () => {
    const doc = new jsPDF({ unit: 'pt' });
    doc.text('CALIFORNIA(CA)', 60, 60);
    doc.text('Los Angeles Branch', 20, 90);
    doc.text('Los Angeles', 220, 90);
    doc.text('$1300', 500, 90);
    doc.text('TEXAS(TX)', 60, 130);
    doc.text('Houston Branch', 20, 160);
    doc.text('Houston', 220, 160);
    doc.text('$1250', 500, 160);

    const buffer = Buffer.from(doc.output('arraybuffer'));
    const result = await extractAuctionRatesFromPdf(buffer);

    assert.equal(result.entries.length, 2);
    assert.deepEqual(
      result.entries.map((entry) => ({ stateCode: entry.stateCode, total: entry.total })),
      [
        { stateCode: 'CA', total: 1300 },
        { stateCode: 'TX', total: 1250 },
      ],
    );
    assert.match(result.text, /CALIFORNIA/);
    assert.equal(result.parserStats.confidence, 'medium');
    assert.equal(result.parserStats.columnRows, 2);
  });

  it('extracts rows from comma-delimited city/state/branch PDFs', async () => {
    const doc = new jsPDF({ unit: 'pt' });
    doc.text('City, State, Branch, Total', 30, 60);
    doc.text('Los Angeles, CA, Los Angeles Branch, $1300', 30, 90);
    doc.text('Houston, TX, Houston Branch, 1250', 30, 120);

    const result = await extractAuctionRatesFromPdf(Buffer.from(doc.output('arraybuffer')));

    assert.deepEqual(
      result.entries.map((entry) => ({
        stateCode: entry.stateCode,
        city: entry.city,
        branch: entry.branch,
        total: entry.total,
      })),
      [
        { stateCode: 'CA', city: 'Los Angeles', branch: 'Los Angeles Branch', total: 1300 },
        { stateCode: 'TX', city: 'Houston', branch: 'Houston Branch', total: 1250 },
      ],
    );
    assert.equal(result.parserStats.confidence, 'medium');
    assert.equal(result.parserStats.directRows, 2);
  });

  it('extracts labeled branch/city/state/total rows', async () => {
    const doc = new jsPDF({ unit: 'pt' });
    doc.text('Branch: Seattle Yard City: Seattle State: WA Total: $1450', 30, 60);
    doc.text('Branch: Atlanta Auction City: Atlanta State: Georgia Rate: 1000', 30, 90);

    const result = await extractAuctionRatesFromPdf(Buffer.from(doc.output('arraybuffer')));

    assert.deepEqual(
      result.entries.map((entry) => ({
        stateCode: entry.stateCode,
        city: entry.city,
        branch: entry.branch,
        total: entry.total,
      })),
      [
        { stateCode: 'WA', city: 'Seattle', branch: 'Seattle Yard', total: 1450 },
        { stateCode: 'GA', city: 'Atlanta', branch: 'Atlanta Auction', total: 1000 },
      ],
    );
    assert.equal(result.parserStats.confidence, 'medium');
    assert.equal(result.parserStats.directRows, 2);
  });
});

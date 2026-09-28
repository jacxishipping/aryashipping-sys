import { describe, test } from 'node:test';
import assert from 'node:assert';
import { parseBankOfAmericaCsv } from './bankOfAmericaCsv.ts';

describe('parseBankOfAmericaCsv', () => {
  test('parses signed amount exports with common Bank of America columns', () => {
    const csv = [
      'Posted Date,Reference Number,Payee,Address,Amount',
      '05/01/2026,1234,ACH CREDIT ACME PAYROLL,NEW YORK NY,2500.50',
      '05/02/2026,9876,ONLINE PAYMENT CREDIT CARD,,(120.99)',
    ].join('\n');

    const transactions = parseBankOfAmericaCsv(csv);

    assert.strictEqual(transactions.length, 2);
    assert.deepStrictEqual(transactions[0], {
      transactionDate: '2026-05-01',
      description: 'ACH CREDIT ACME PAYROLL',
      amount: 2500.5,
      type: 'DEBIT',
      reference: '1234',
      notes: 'NEW YORK NY',
      rawRow: {
        'Posted Date': '05/01/2026',
        'Reference Number': '1234',
        Payee: 'ACH CREDIT ACME PAYROLL',
        Address: 'NEW YORK NY',
        Amount: '2500.50',
      },
    });
    assert.strictEqual(transactions[1].type, 'CREDIT');
    assert.strictEqual(transactions[1].amount, 120.99);
  });

  test('parses debit and credit columns when amount is split', () => {
    const csv = [
      'Date,Description,Debit,Credit',
      '2026-05-03,Wire transfer fee,15.00,',
      '2026-05-04,Incoming wire,,300.00',
    ].join('\n');

    const transactions = parseBankOfAmericaCsv(csv);

    assert.strictEqual(transactions[0].type, 'CREDIT');
    assert.strictEqual(transactions[0].amount, 15);
    assert.strictEqual(transactions[1].type, 'DEBIT');
    assert.strictEqual(transactions[1].amount, 300);
  });

  test('handles quoted fields with commas', () => {
    const csv = [
      'Posted Date,Description,Amount',
      '05/05/2026,"PAYMENT, CLIENT REF 88",100.00',
    ].join('\n');

    const transactions = parseBankOfAmericaCsv(csv);

    assert.strictEqual(transactions[0].description, 'PAYMENT, CLIENT REF 88');
  });

  test('parses statement exports with summary rows before the transaction header', () => {
    const csv = [
      'Description,,Summary Amt.',
      'Beginning balance as of 05/01/2026,,"0.00"',
      'Total credits,,"16,666.00"',
      'Total debits,,"-10,407.00"',
      'Ending balance as of 05/22/2026,,"6,259.00"',
      '',
      'Date,Description,Amount,Running Bal.',
      '05/01/2026,Beginning balance as of 05/01/2026,,"0.00"',
      '05/18/2026,"Agent Assisted transfer from CHK 5346 Confirmation# 1190lp28y","100.00","100.00"',
      '05/19/2026,"Zelle payment from AZIZ MARANJANI for "Car payment"; Conf# svSbs7iik","2,503.00","2,603.00"',
      '05/19/2026,"Zelle payment from AZIZ MARANJANI Conf# S37Is7fRZ","1.00","2,604.00"',
      '05/20/2026,"Zelle payment from MOHAMMAD IDREES SHADAN Conf# st9y8z9sd","2,000.00","4,604.00"',
      '05/20/2026,"Zelle payment from Reshad Mahmoodzai Conf# ahUCs7ygD","1,120.00","5,724.00"',
      '05/20/2026,"Zelle payment from ABDUL HILAL for "Naqarar"; Conf# bzhk16dbm","1,000.00","6,724.00"',
      '05/20/2026,"Zelle payment from AZIZ MARANJANI Conf# tlExs7A2G","502.00","7,226.00"',
      '05/20/2026,"Online Banking transfer to CHK 5346 Confirmation# 1831073051","-4,490.00","2,736.00"',
      '05/21/2026,"Online Banking transfer to CHK 5346 Confirmation# 1834130792","-2,600.00","136.00"',
      '05/22/2026,"Zelle payment from ZADRAN CARRIER LLC Conf# o109xgf4h","2,090.00","2,226.00"',
      '05/22/2026,"Zelle payment from MOHAMMAD IDREES SHADAN Conf# tzofeu8gn","1,900.00","4,126.00"',
      '05/22/2026,"Zelle payment from BAITULLAH MASOOM Conf# AA0aPS63d","1,400.00","5,526.00"',
      '05/22/2026,"Zelle payment from HIKMATULLAH KHAKSAR Conf# kethbq0zs","1,225.00","6,751.00"',
      '05/22/2026,"Zelle payment from SHAFIULLAH QARAR Conf# eomevfp8o","1,156.00","7,907.00"',
      '05/22/2026,"Zelle payment from ALI MANGAL Conf# p066fjpuu","1,000.00","8,907.00"',
      '05/22/2026,"Zelle payment from FAHIMULLAH SHERZAI Conf# jwhkfpr0d","525.00","9,432.00"',
      '05/22/2026,"Zelle payment from AIMAL DURANI for "b"; Conf# 99chzdd0x","144.00","9,576.00"',
      '05/22/2026,"Online Banking transfer to CHK 5346 Confirmation# 1347169529","-1,900.00","7,676.00"',
      '05/22/2026,"Online Banking transfer to CHK 5346 Confirmation# 1547408700","-1,417.00","6,259.00"',
    ].join('\n');

    const transactions = parseBankOfAmericaCsv(csv);

    assert.strictEqual(transactions.length, 19);
    assert.deepStrictEqual(transactions[0], {
      transactionDate: '2026-05-18',
      description: 'Agent Assisted transfer from CHK 5346 Confirmation# 1190lp28y',
      amount: 100,
      type: 'DEBIT',
      reference: undefined,
      notes: undefined,
      rawRow: {
        Date: '05/18/2026',
        Description: 'Agent Assisted transfer from CHK 5346 Confirmation# 1190lp28y',
        Amount: '100.00',
        'Running Bal.': '100.00',
      },
    });
    assert.strictEqual(transactions[1].description.includes('Car payment'), true);
    assert.strictEqual(transactions[7].type, 'CREDIT');
    assert.strictEqual(transactions[7].amount, 4490);
    assert.strictEqual(transactions[18].transactionDate, '2026-05-22');
    assert.strictEqual(transactions[18].amount, 1417);
    assert.strictEqual(transactions[18].type, 'CREDIT');
  });

  test('throws for unsupported files', () => {
    assert.throws(
      () => parseBankOfAmericaCsv('Description,Amount\nNo date,50'),
      /supported date column/
    );
  });
});
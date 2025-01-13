const {escapeXML, generateZUGFeRDInvoiceXML} = require('../src/cii')

describe('escapeXML', () => {
    it('should return an empty string when input is null or undefined', () => {
        expect(escapeXML(null)).toBe('');
        expect(escapeXML(undefined)).toBe('');
    });

    it('should escape ampersands (&) to &amp;', () => {
        expect(escapeXML('&')).toBe('&amp;');
        expect(escapeXML('Hello & Goodbye')).toBe('Hello &amp; Goodbye');
    });

    it('should escape less-than signs (<) to &lt;', () => {
        expect(escapeXML('<')).toBe('&lt;');
        expect(escapeXML('<tag>')).toBe('&lt;tag&gt;');
    });

    it('should escape greater-than signs (>) to &gt;', () => {
        expect(escapeXML('>')).toBe('&gt;');
        expect(escapeXML('value > 10')).toBe('value &gt; 10');
    });

    it('should escape double quotes (\") to &quot;', () => {
        expect(escapeXML('"')).toBe('&quot;');
        expect(escapeXML('He said "Hello"')).toBe('He said &quot;Hello&quot;');
    });

    it('should escape single quotes (\') to &apos;', () => {
        expect(escapeXML("'")).toBe('&apos;');
        expect(escapeXML("It's a test")).toBe('It&apos;s a test');
    });

    it('should escape multiple special characters in the correct order', () => {
        const input = `& < > " '`;
        const expectedOutput = `&amp; &lt; &gt; &quot; &apos;`;
        expect(escapeXML(input)).toBe(expectedOutput);
    });

    it('should handle strings without special characters unchanged', () => {
        expect(escapeXML('simple string')).toBe('simple string');
        expect(escapeXML('1234567980')).toBe('1234567980');
        expect(escapeXML('')).toBe('');
    });
});

describe('generateZUGFeRDInvoiceXML', () => {
    it('should generate a valid XML string with complete invoice details', () => {
        const invoice = {
            id: 'INV-001',
            issueDate: '2024-01-01',
            dueDate: '2024-01-15',
            currency: 'EUR',
            supplier: {
                name: 'Supplier GmbH',
                street: 'Musterstraße 1',
                city: 'Berlin',
                postalCode: '10115',
                country: 'DE',
            },
            customer: {
                name: 'Customer AG',
                street: 'Kundenweg 5',
                city: 'Hamburg',
                postalCode: '20095',
                country: 'DE',
            },
            paymentDetails: {
                paymentMeansCode: '31',
                paymentID: 'PMT-123456',
                bankDetails: {
                    accountName: 'Supplier GmbH Account',
                    iban: 'DE12345678901234567890',
                    bic: 'GENODEF1S01',
                    bankName: 'Musterbank',
                }
            },
            taxTotal: {
                taxAmount: 19.00,
                taxPercentage: 19.00,
            },
            totalAmount: 119.00,
            lineItems: [
                {
                    id: 'ITEM-001',
                    description: 'Product A',
                    quantity: 1,
                    unitPrice: 100.00,
                    lineTotal: 100.00,
                },
            ],
        };

        const xml = generateZUGFeRDInvoiceXML(invoice);
        const xmlRegex = /^\s*(<\?xml\s+[^\s?>]+(.*?)\?>)?\s*(<([a-zA-Z_][\w.\-:]*?)\b[^>]*>(.*?)<\/\4>|<([a-zA-Z_][\w.\-:]*?)\b[^>]*\/?>)+\s*$/s;
        expect(xmlRegex.test(xml)).toBeTruthy();

        expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(xml).toContain('<ram:ID>INV-001</ram:ID>');
        expect(xml).toContain('<udt:DateTimeString format="102">2024-01-01</udt:DateTimeString>');
        expect(xml).toContain('<ram:GrandTotalAmount currencyID="EUR">119.00</ram:GrandTotalAmount>');
        expect(xml).toContain('<ram:SellerTradeParty>');
        expect(xml).toContain('<ram:Name>Supplier GmbH</ram:Name>');
        expect(xml).toContain('<ram:LineOne>Musterstraße 1</ram:LineOne>');
        expect(xml).toContain('<ram:PostcodeCode>10115</ram:PostcodeCode>');
        expect(xml).toContain('<ram:CityName>Berlin</ram:CityName>');
        expect(xml).toContain('<ram:CountryID>DE</ram:CountryID>');
        expect(xml).toContain('<ram:BuyerTradeParty>');
        expect(xml).toContain('<ram:Name>Customer AG</ram:Name>');
        expect(xml).toContain('<ram:LineOne>Kundenweg 5</ram:LineOne>');
        expect(xml).toContain('<ram:TaxAmount currencyID="EUR">19.00</ram:TaxAmount>');
        expect(xml).toContain('<ram:Percent>19.00</ram:Percent>');
        expect(xml).toContain('<ram:ChargeAmount>100.00</ram:ChargeAmount>');
        expect(xml).toContain('<ram:LineTotalAmount currencyID="EUR">100.00</ram:LineTotalAmount>');
        expect(xml).toContain('<ram:AccountName>Supplier GmbH Account</ram:AccountName>');
        expect(xml).toContain('<ram:IBANID>DE12345678901234567890</ram:IBANID>');
    });

    it('should handle invoices with missing optional fields', () => {
        const invoice = {
            id: 'INV-002',
            issueDate: '2024-02-01',
            currency: 'USD',
            supplier: {
                name: 'Supplier Ltd.',
                country: 'US',
            },
            customer: {
                name: 'Customer Corp.',
                country: 'US',
            },
            taxTotal: {
                taxAmount: 0.00,
                taxPercentage: 0.00,
            },
            totalAmount: 100.00,
            lineItems: [
                {
                    id: 'ITEM-002',
                    description: 'Service B',
                    quantity: 1,
                    unitPrice: 100.00,
                    lineTotal: 100.00,
                },
            ],
        };

        const xml = generateZUGFeRDInvoiceXML(invoice);

        expect(xml).toContain('<ram:ID>INV-002</ram:ID>');
        expect(xml).not.toContain('<ram:LineOne>'); // Keine Straße angegeben
        expect(xml).not.toContain('<ram:PostcodeCode>'); // Keine PLZ angegeben
        expect(xml).not.toContain('<ram:CityName>'); // Keine Stadt angegeben
        expect(xml).toContain('<ram:TaxAmount currencyID="USD">0.00</ram:TaxAmount>');
        expect(xml).toContain('<ram:Percent>0.00</ram:Percent>');
    });

    it('should handle invoices with multiple line items', () => {
        const invoice = {
            id: 'INV-003',
            issueDate: '2024-03-01',
            currency: 'GBP',
            supplier: {
                name: 'Supplier A',
                country: 'GB',
            },
            customer: {
                name: 'Customer A',
                country: 'GB',
            },
            taxTotal: {
                taxAmount: 10.00,
                taxPercentage: 10.00,
            },
            totalAmount: 110.00,
            lineItems: [
                {
                    id: 'ITEM-001',
                    description: 'Item 1',
                    quantity: 1,
                    unitPrice: 50.00,
                    lineTotal: 50.00,
                },
                {
                    id: 'ITEM-002',
                    description: 'Item 2',
                    quantity: 1,
                    unitPrice: 60.00,
                    lineTotal: 60.00,
                },
            ],
        };

        const xml = generateZUGFeRDInvoiceXML(invoice);

        expect(xml).toContain('<ram:LineID>ITEM-001</ram:LineID>');
        expect(xml).toContain('<ram:Name>Item 1</ram:Name>');
        expect(xml).toContain('<ram:ChargeAmount>50.00</ram:ChargeAmount>');
        expect(xml).toContain('<ram:LineTotalAmount currencyID="GBP">50.00</ram:LineTotalAmount>');

        expect(xml).toContain('<ram:LineID>ITEM-002</ram:LineID>');
        expect(xml).toContain('<ram:Name>Item 2</ram:Name>');
        expect(xml).toContain('<ram:ChargeAmount>60.00</ram:ChargeAmount>');
        expect(xml).toContain('<ram:LineTotalAmount currencyID="GBP">60.00</ram:LineTotalAmount>');
    });
});

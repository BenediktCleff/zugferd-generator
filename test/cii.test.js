const {escapeXML, formatDate, generateZUGFeRDInvoiceXML} = require('../src/cii')

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
        expect(xml).toContain('<ram:ID>urn:cen.eu:en16931:2017</ram:ID>');
        expect(xml).toContain('<udt:DateTimeString format="102">20240101</udt:DateTimeString>');
        expect(xml).toContain('<udt:DateTimeString format="102">20240115</udt:DateTimeString>');
        expect(xml).toContain('<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>');
        expect(xml).toContain('<ram:GrandTotalAmount>119.00</ram:GrandTotalAmount>');
        expect(xml).toContain('<ram:DuePayableAmount>119.00</ram:DuePayableAmount>');
        expect(xml).toContain('<ram:TaxBasisTotalAmount>100.00</ram:TaxBasisTotalAmount>');
        expect(xml).toContain('<ram:SellerTradeParty>');
        expect(xml).toContain('<ram:Name>Supplier GmbH</ram:Name>');
        expect(xml).toContain('<ram:LineOne>Musterstraße 1</ram:LineOne>');
        expect(xml).toContain('<ram:PostcodeCode>10115</ram:PostcodeCode>');
        expect(xml).toContain('<ram:CityName>Berlin</ram:CityName>');
        expect(xml).toContain('<ram:CountryID>DE</ram:CountryID>');
        expect(xml).toContain('<ram:BuyerTradeParty>');
        expect(xml).toContain('<ram:Name>Customer AG</ram:Name>');
        expect(xml).toContain('<ram:LineOne>Kundenweg 5</ram:LineOne>');
        expect(xml).toContain('<ram:TaxTotalAmount currencyID="EUR">19.00</ram:TaxTotalAmount>');
        expect(xml).toContain('<ram:CalculatedAmount>19.00</ram:CalculatedAmount>');
        expect(xml).toContain('<ram:CategoryCode>S</ram:CategoryCode>');
        expect(xml).toContain('<ram:RateApplicablePercent>19.00</ram:RateApplicablePercent>');
        expect(xml).toContain('<ram:ChargeAmount>100.00</ram:ChargeAmount>');
        expect(xml).toContain('<ram:BilledQuantity unitCode="C62">1.00</ram:BilledQuantity>');
        expect(xml).toContain('<ram:LineTotalAmount>100.00</ram:LineTotalAmount>');
        expect(xml).toContain('<ram:PaymentReference>PMT-123456</ram:PaymentReference>');
        expect(xml).toContain('<ram:TypeCode>31</ram:TypeCode>');
        expect(xml).toContain('<ram:AccountName>Supplier GmbH Account</ram:AccountName>');
        expect(xml).toContain('<ram:IBANID>DE12345678901234567890</ram:IBANID>');
        expect(xml).toContain('<ram:BICID>GENODEF1S01</ram:BICID>');
        // The bank name is not part of EN 16931
        expect(xml).not.toContain('Musterbank');

        // Line items have to precede the header trade agreement
        expect(xml.indexOf('<ram:IncludedSupplyChainTradeLineItem>')).toBeLessThan(xml.indexOf('<ram:ApplicableHeaderTradeAgreement>'));
        // Postcode has to precede the street
        expect(xml.indexOf('<ram:PostcodeCode>10115')).toBeLessThan(xml.indexOf('<ram:LineOne>Musterstraße 1'));
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
        expect(xml).toContain('<ram:CountryID>US</ram:CountryID>'); // Adresse mit Land ist Pflicht
        expect(xml).not.toContain('<ram:SpecifiedTradeSettlementPaymentMeans>');
        expect(xml).not.toContain('<ram:SpecifiedTradePaymentTerms>');
        expect(xml).toContain('<ram:ApplicableHeaderTradeDelivery/>');
        expect(xml).toContain('<ram:TaxTotalAmount currencyID="USD">0.00</ram:TaxTotalAmount>');
        expect(xml).toContain('<ram:CategoryCode>Z</ram:CategoryCode>');
        expect(xml).toContain('<ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>');
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
        expect(xml).toContain('<ram:LineTotalAmount>50.00</ram:LineTotalAmount>');

        expect(xml).toContain('<ram:LineID>ITEM-002</ram:LineID>');
        expect(xml).toContain('<ram:Name>Item 2</ram:Name>');
        expect(xml).toContain('<ram:ChargeAmount>60.00</ram:ChargeAmount>');
        expect(xml).toContain('<ram:LineTotalAmount>60.00</ram:LineTotalAmount>');

        // Header totals are calculated from the line items
        expect(xml).toContain('<ram:BasisAmount>110.00</ram:BasisAmount>');
        expect(xml).toContain('<ram:LineTotalAmount>110.00</ram:LineTotalAmount>');
    });

    it('should export optional fields', () => {
        const invoice = {
            id: 'INV-004',
            issueDate: '2024-04-01',
            deliveryDate: '2024-03-28',
            paymentTerms: 'Zahlbar innerhalb von 14 Tagen',
            buyerReference: '04011000-12345-67',
            currency: 'EUR',
            supplier: {
                id: 'SUP-1',
                name: 'Kleinunternehmer',
                country: 'DE',
                legalEntityID: '201/113/40209',
                email: 'billing@example.com',
            },
            customer: {
                name: 'Customer AG',
                country: 'DE',
                taxNumber: 'DE987654321',
            },
            taxTotal: {
                taxAmount: 0,
                taxPercentage: 0,
                categoryCode: 'E',
                exemptionReason: 'Kleinunternehmer gemäß § 19 UStG',
            },
            totalAmount: 37.5,
            lineItems: [
                { id: '1', description: 'Beratung', quantity: 0.5, unitPrice: 75, lineTotal: 37.5, unitCode: 'HUR' },
            ],
        };

        const xml = generateZUGFeRDInvoiceXML(invoice);

        expect(xml).toContain('<ram:BuyerReference>04011000-12345-67</ram:BuyerReference>');
        expect(xml).toContain('<ram:ID>SUP-1</ram:ID>');
        expect(xml).toContain('<ram:URIID schemeID="EM">billing@example.com</ram:URIID>');
        expect(xml).toContain('<ram:ID schemeID="FC">201/113/40209</ram:ID>');
        expect(xml).toContain('<ram:ID schemeID="VA">DE987654321</ram:ID>');
        expect(xml).toContain('<udt:DateTimeString format="102">20240328</udt:DateTimeString>');
        expect(xml).toContain('<ram:Description>Zahlbar innerhalb von 14 Tagen</ram:Description>');
        expect(xml).toContain('<ram:ExemptionReason>Kleinunternehmer gemäß § 19 UStG</ram:ExemptionReason>');
        expect(xml).toContain('<ram:CategoryCode>E</ram:CategoryCode>');
        expect(xml).toContain('<ram:BilledQuantity unitCode="HUR">0.50</ram:BilledQuantity>');
    });
    describe('additional fields', () => {
        const createInvoice = (overrides = {}) => ({
            id: 'INV-005',
            issueDate: '2024-01-01',
            dueDate: '2024-01-15',
            deliveryDate: '2023-12-20',
            currency: 'EUR',
            totalAmount: 100,
            supplier: { name: 'Supplier GmbH', country: 'DE', taxNumber: 'DE123456789', email: 'billing@supplier.de' },
            customer: { name: 'Customer AG', street: 'Kundenweg 5', city: 'Hamburg', postalCode: '20095', country: 'DE' },
            taxTotal: { taxAmount: 0, taxPercentage: 0 },
            lineItems: [{ id: '1', description: 'Product A', quantity: 1, unitPrice: 100, lineTotal: 100 }],
            ...overrides,
        });

        it('should add the seller contact', () => {
            const invoice = createInvoice();
            invoice.supplier = { ...invoice.supplier, contactName: 'Max Mustermann', phone: '+49 30 123456' };

            const xml = generateZUGFeRDInvoiceXML(invoice);

            expect(xml).toContain('<ram:DefinedTradeContact>\n          <ram:PersonName>Max Mustermann</ram:PersonName>');
            expect(xml).toContain('<ram:CompleteNumber>+49 30 123456</ram:CompleteNumber>');
            expect(xml).toContain('<ram:EmailURIUniversalCommunication>\n            <ram:URIID>billing@supplier.de</ram:URIID>');
            // The contact has to precede the address
            expect(xml.indexOf('<ram:DefinedTradeContact>')).toBeLessThan(xml.indexOf('<ram:PostalTradeAddress>'));
        });

        it('should not add a seller contact without contact name or phone', () => {
            expect(generateZUGFeRDInvoiceXML(createInvoice())).not.toContain('<ram:DefinedTradeContact>');
        });

        it('should use a custom electronic address if given', () => {
            const invoice = createInvoice();
            invoice.customer = { ...invoice.customer, electronicAddress: '04011000-12345-34', electronicAddressScheme: '0204' };

            const xml = generateZUGFeRDInvoiceXML(invoice);

            expect(xml).toContain('<ram:URIID schemeID="0204">04011000-12345-34</ram:URIID>');
        });

        it('should add the customer address as delivery address for tax category K', () => {
            const xml = generateZUGFeRDInvoiceXML(createInvoice({
                taxTotal: { taxAmount: 0, taxPercentage: 0, categoryCode: 'K', exemptionReason: 'Intra-community supply' },
            }));

            expect(xml).toContain('<ram:ShipToTradeParty>\n        <ram:PostalTradeAddress>\n          <ram:PostcodeCode>20095</ram:PostcodeCode>');
            expect(xml.indexOf('<ram:ShipToTradeParty>')).toBeLessThan(xml.indexOf('<ram:ActualDeliverySupplyChainEvent>'));
        });

        it('should add a custom delivery address', () => {
            const xml = generateZUGFeRDInvoiceXML(createInvoice({
                deliveryAddress: { city: 'Köln', postalCode: '50667', country: 'DE' },
            }));

            expect(xml).toContain('<ram:ShipToTradeParty>\n        <ram:PostalTradeAddress>\n          <ram:PostcodeCode>50667</ram:PostcodeCode>');
        });

        it('should omit the line tax rate but add a rate of 0 to the VAT breakdown for tax category O', () => {
            const xml = generateZUGFeRDInvoiceXML(createInvoice({
                taxTotal: { taxAmount: 0, taxPercentage: 0, categoryCode: 'O', exemptionReason: 'Not subject to VAT' },
            }));

            expect(xml.match(/<ram:RateApplicablePercent>/g)).toHaveLength(1);
            expect(xml).toContain('<ram:CategoryCode>O</ram:CategoryCode>\n        <ram:RateApplicablePercent>0.00</ram:RateApplicablePercent>');
        });

        it('should calculate the grand total from the rounded amounts', () => {
            const xml = generateZUGFeRDInvoiceXML(createInvoice({
                totalAmount: 181.03,
                taxTotal: { taxAmount: 28.9, taxPercentage: 19 },
                lineItems: [
                    { id: '1', description: 'Consulting', quantity: 1.5, unitPrice: 80.5, lineTotal: 120.75 },
                    { id: '2', description: 'Material', quantity: 3, unitPrice: 10.4567, lineTotal: 31.37 },
                ],
            }));

            expect(xml).toContain('<ram:GrandTotalAmount>181.02</ram:GrandTotalAmount>');
            expect(xml).toContain('<ram:DuePayableAmount>181.02</ram:DuePayableAmount>');
        });
    });
});

describe('formatDate', () => {
    it('should convert dates into the format YYYYMMDD', () => {
        expect(formatDate('2024-01-31')).toBe('20240131');
        expect(formatDate('20240131')).toBe('20240131');
        expect(formatDate('2024-01-31T12:00:00Z')).toBe('20240131');
        expect(formatDate(new Date(2024, 0, 31))).toBe('20240131');
    });

    it('should format Date objects in local time', () => {
        expect(formatDate(new Date(2024, 0, 1, 0, 30))).toBe('20240101');
        expect(formatDate(new Date(2024, 11, 31, 23, 30))).toBe('20241231');
    });

    it('should throw on unsupported date formats', () => {
        expect(() => formatDate('31.01.2024')).toThrow('Invalid date');
    });
});

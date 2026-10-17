const { PDFDocument, PDFDict, PDFName, PDFArray, PDFStream, decodePDFRawStream } = require('pdf-lib');
const ZUGFeRDGenerator = require('../src');
const { GUIDELINE_ID } = require('../src/cii');

// Runs validation, XML generation and PDF embedding together, without mocks
describe('ZUGFeRDGenerator (integration)', () => {
    const createInvoice = (overrides = {}) => ({
        id: 'INV-001',
        issueDate: '2024-01-01',
        dueDate: '2024-01-15',
        deliveryDate: '2023-12-20',
        buyerReference: '04011000-12345-34',
        currency: 'EUR',
        totalAmount: 119,
        supplier: {
            name: 'Supplier GmbH',
            street: 'Musterstraße 1',
            country: 'DE',
            city: 'Berlin',
            postalCode: '10115',
            email: 'billing@supplier.de',
            phone: '+49 30 123456',
            taxNumber: 'DE123456789',
        },
        customer: {
            name: 'Customer AG',
            street: 'Kundenweg 5',
            country: 'DE',
            city: 'Hamburg',
            postalCode: '20095',
            email: 'invoice@customer.de',
        },
        taxTotal: { taxAmount: 19, taxPercentage: 19 },
        paymentDetails: { bankDetails: { iban: 'DE02120300000000202051', bic: 'BYLADEM1001' } },
        lineItems: [
            { id: 'ITEM-001', description: 'Product A', quantity: 1, unitPrice: 100, lineTotal: 100 },
        ],
        ...overrides,
    });

    it('should create a ZUGFeRD invoice from a valid invoice', () => {
        const xml = new ZUGFeRDGenerator(createInvoice()).toXMLString();

        expect(xml).toContain(`<ram:ID>${GUIDELINE_ID}</ram:ID>`);
        expect(xml).toContain('<ram:BuyerReference>04011000-12345-34</ram:BuyerReference>');
        expect(xml).toContain('<udt:DateTimeString format="102">20231220</udt:DateTimeString>');
        expect(xml).toContain('<ram:CompleteNumber>+49 30 123456</ram:CompleteNumber>');
        expect(xml).toContain('<ram:TypeCode>58</ram:TypeCode>');
        expect(xml).toContain('<ram:BasisAmount>100.00</ram:BasisAmount>');
        expect(xml).toContain('<ram:DuePayableAmount>119.00</ram:DuePayableAmount>');
    });

    it('should accept Date objects', () => {
        const xml = new ZUGFeRDGenerator(createInvoice({
            issueDate: new Date(2024, 0, 1),
            dueDate: new Date(2024, 0, 15),
            deliveryDate: new Date(2023, 11, 20),
        })).toXMLString();

        expect(xml).toContain('<udt:DateTimeString format="102">20240101</udt:DateTimeString>');
        expect(xml).toContain('<udt:DateTimeString format="102">20240115</udt:DateTimeString>');
        expect(xml).toContain('<udt:DateTimeString format="102">20231220</udt:DateTimeString>');
    });

    it('should reject an invoice with missing fields', () => {
        expect(() => new ZUGFeRDGenerator(createInvoice({ deliveryDate: undefined }))).toThrow(
            'Missing required field(s): deliveryDate'
        );
    });

    it('should reject an invoice that violates business rules', () => {
        expect(() => new ZUGFeRDGenerator(createInvoice({ totalAmount: 120 }))).toThrow(
            'Invalid invoice: totalAmount must equal 119.00 (sum of line totals + taxAmount)'
        );
    });

    const exempt = (categoryCode) => ({ taxAmount: 0, taxPercentage: 0, categoryCode, exemptionReason: 'Reason' });
    const sellerWithoutVatId = { name: 'Supplier GmbH', country: 'DE', id: 'SUP-001', legalEntityID: '12/345/67890' };

    it.each([
        ['S', { totalAmount: 119, taxTotal: { taxAmount: 19, taxPercentage: 19 } }],
        ['Z', { totalAmount: 100, taxTotal: { taxAmount: 0, taxPercentage: 0 } }],
        ['E', { totalAmount: 100, taxTotal: exempt('E'), supplier: sellerWithoutVatId }],
        ['AE', { totalAmount: 100, taxTotal: exempt('AE'), customer: { ...createInvoice().customer, taxNumber: 'DE987654321' } }],
        ['K', { totalAmount: 100, taxTotal: exempt('K'), customer: { ...createInvoice().customer, country: 'FR', taxNumber: 'FR12345678901' } }],
        ['G', { totalAmount: 100, taxTotal: exempt('G'), customer: { ...createInvoice().customer, country: 'US' } }],
        ['O', { totalAmount: 100, taxTotal: exempt('O'), supplier: sellerWithoutVatId }],
        ['L', { totalAmount: 107, taxTotal: { taxAmount: 7, taxPercentage: 7, categoryCode: 'L' } }],
        ['M', { totalAmount: 107, taxTotal: { taxAmount: 7, taxPercentage: 7, categoryCode: 'M' } }],
    ])('should create an invoice with tax category %s', (categoryCode, overrides) => {
        const xml = new ZUGFeRDGenerator(createInvoice(overrides)).toXMLString();

        // Once in the invoice line and once in the VAT breakdown
        expect(xml.match(new RegExp(`<ram:CategoryCode>${categoryCode}</ram:CategoryCode>`, 'g'))).toHaveLength(2);
        expect(xml).toContain(`<ram:GrandTotalAmount>${overrides.totalAmount.toFixed(2)}</ram:GrandTotalAmount>`);
    });

    it('should provide the same XML as string and buffer', () => {
        const generator = new ZUGFeRDGenerator(createInvoice());

        expect(generator.toBuffer().toString('utf8')).toBe(generator.toXMLString());
    });

    it('should embed the generated XML into a PDF', async () => {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([400, 400]).drawText('Invoice INV-001');
        const pdfBytes = await pdfDoc.save();

        const generator = new ZUGFeRDGenerator(createInvoice());
        const resultPdfDoc = await PDFDocument.load(await generator.embedInPDF(pdfBytes));

        const efnames = resultPdfDoc.catalog
            .lookup(PDFName.of('Names'), PDFDict)
            .lookup(PDFName.of('EmbeddedFiles'), PDFDict)
            .lookup(PDFName.of('Names'), PDFArray);

        expect(efnames.size()).toBe(2);
        expect(efnames.lookup(0).decodeText()).toBe('factur-x.xml');

        const stream = efnames.lookup(1, PDFDict)
            .lookup(PDFName.of('EF'), PDFDict)
            .lookup(PDFName.of('F'), PDFStream);
        expect(Buffer.from(decodePDFRawStream(stream).decode()).toString('utf8')).toBe(generator.toXMLString());
    });
});

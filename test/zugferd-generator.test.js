const { PDFDocument, PDFDict, PDFName, PDFArray, PDFStream, PDFHexString, decodePDFRawStream } = require('pdf-lib');
const ZUGFeRDGenerator = require('../src/zugferd-generator');
const validateInvoice = require('../src/validation');
const { generateZUGFeRDInvoiceXML } = require('../src/cii');

jest.mock('../src/validation');
jest.mock('../src/cii');
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
    },
}));

describe('ZUGFeRDGenerator', () => {
    const mockInvoice = {
        id: 'INV-001',
        issueDate: '2024-01-01',
        currency: 'EUR',
        supplier: { name: 'Supplier Ltd.', country: 'DE' },
        customer: { name: 'Customer Ltd.', country: 'DE' },
        taxTotal: { taxAmount: 19, taxPercentage: 19 },
        lineItems: [
            {
                id: 'ITEM-001',
                description: 'Product A',
                quantity: 1,
                unitPrice: 100,
                lineTotal: 100,
            },
        ],
    };

    const mockXML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"></Invoice>`;

    beforeEach(() => {
        validateInvoice.mockClear();
        generateZUGFeRDInvoiceXML.mockClear();
        validateInvoice.mockImplementation(() => true);
        generateZUGFeRDInvoiceXML.mockImplementation(() => mockXML);
    });

    describe('constructor', () => {
        it('should validate the invoice upon creation', () => {
            new ZUGFeRDGenerator(mockInvoice);

            expect(validateInvoice).toHaveBeenCalledWith(mockInvoice);
        });

        it('should generate XML from the invoice', () => {
            new ZUGFeRDGenerator(mockInvoice);

            expect(generateZUGFeRDInvoiceXML).toHaveBeenCalledWith(mockInvoice);
        });
    });

    describe('toXMLString', () => {
        it('should return the generated XML string', () => {
            const generator = new ZUGFeRDGenerator(mockInvoice);

            expect(generator.toXMLString()).toBe(mockXML);
        });
    });

    describe('toBuffer', () => {
        it('should return the XML string as a buffer', () => {
            const generator = new ZUGFeRDGenerator(mockInvoice);

            const buffer = generator.toBuffer();

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.toString('utf8')).toBe(mockXML);
        });
    });

    describe('toBlob', () => {
        it('should return the XML string as a Blob', () => {
            global.Blob = jest.fn().mockImplementation((content, options) => ({
                content,
                options,
            }));

            const generator = new ZUGFeRDGenerator(mockInvoice);
            const blob = generator.toBlob();

            expect(global.Blob).toHaveBeenCalledWith([mockXML], { type: 'application/xml;charset=utf-8;' });
            expect(blob.content[0]).toBe(mockXML);
        });
    });

    it('should embed ZUGFeRD XML into the PDF file', async () => {
        // Beispielrechnung
        const exampleInvoice = {
            id: 'INV-001',
            issueDate: '2024-01-01',
            currency: 'EUR',
            supplier: { name: 'Supplier GmbH', country: 'DE' },
            customer: { name: 'Customer AG', country: 'DE' },
            taxTotal: { taxAmount: 19.00, taxPercentage: 19.00 },
            totalAmount: 119.00,
            lineItems: [
                { id: 'ITEM-001', description: 'Product A', quantity: 1, unitPrice: 100.00, lineTotal: 100.00 },
            ],
        };

        const mockedXML = '<?xml version="1.0"?><ZUGFeRDInvoice>Example</ZUGFeRDInvoice>';
        generateZUGFeRDInvoiceXML.mockReturnValue(mockedXML);

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([400, 400]);
        page.drawText('Test PDF');
        const pdfBytes = await pdfDoc.save();

        const generator = new ZUGFeRDGenerator(exampleInvoice);
        const resultPdfBytes = await generator.embedInPDF(pdfBytes);

        const resultPdfDoc = await PDFDocument.load(resultPdfBytes);
        const names = resultPdfDoc.catalog.lookup(PDFName.of('Names'), PDFDict);

        const embeddedFiles = names.lookup(PDFName.of('EmbeddedFiles'), PDFDict);
        const efnames = embeddedFiles.lookup(PDFName.of('Names'), PDFArray);

        const rawAttachments = [];
        for (let idx = 0, len = efnames.size(); idx < len; idx += 2) {
            const fileName = efnames.lookup(idx);
            const fileSpec = efnames.lookup(idx + 1, PDFDict);
            rawAttachments.push({ fileName, fileSpec });
        }

        const attachments = {};

        rawAttachments.forEach(({ fileName, fileSpec }) => {
            const stream = fileSpec
                .lookup(PDFName.of('EF'), PDFDict)
                .lookup(PDFName.of('F'), PDFStream);

            attachments[fileName.decodeText()] = {
                data: Buffer.from(decodePDFRawStream(stream).decode()),
                description: fileSpec.lookup(PDFName.of('Desc'), PDFHexString).decodeText(),
            };
        });

        const attachment = attachments['ZUGFeRD-invoice.xml'];
        expect(attachment).toBeDefined();
        expect(attachment.description).toBe('ZUGFeRD XML Invoice for electronic processing');
        expect(attachment.data.toString('utf8')).toBe(mockedXML);
    });
});

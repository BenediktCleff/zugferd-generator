const validateInvoice = require('../src/validation')

describe('validateInvoice', () => {
    it('should validate a correct invoice without throwing an error', () => {
        const validInvoice = {
            id: 'INV-001',
            issueDate: '2024-01-01',
            deliveryDate: '2023-12-20',
            dueDate: '2024-01-15',
            currency: 'EUR',
            totalAmount: 1200,
            supplier: {
                name: 'Example Supplier Ltd.',
                country: 'DE',
                taxNumber: 'DE123456789',
            },
            customer: {
                name: 'Example Customer Ltd.',
                country: 'US',
            },
            taxTotal: {
                taxAmount: 200,
                taxPercentage: 20,
            },
            lineItems: [
                {
                    id: 'ITEM-001',
                    description: 'Product A',
                    quantity: 5,
                    unitPrice: 200,
                    lineTotal: 1000,
                },
            ],
        };

        expect(() => validateInvoice(validInvoice)).not.toThrow();
    });

    it('should throw an error if required invoice fields are missing', () => {
        const invalidInvoice = {};

        expect(() => validateInvoice(invalidInvoice)).toThrow(
            'Missing required field(s): id, issueDate, deliveryDate, currency, totalAmount, supplier.name, supplier.country, customer.name, customer.country, taxTotal.taxAmount, taxTotal.taxPercentage, lineItems (at least one line item is required)'
        );
    });

    it('should throw an error if supplier information is incomplete', () => {
        const incompleteInvoice = {
            id: 'INV-002',
            issueDate: '2024-01-01',
            deliveryDate: '2023-12-20',
            currency: 'EUR',
            totalAmount: 500,
            supplier: {},
            customer: {
                name: 'Customer Ltd.',
                country: 'US',
            },
            taxTotal: {
                taxAmount: 100,
                taxPercentage: 20,
            },
            lineItems: [
                {
                    id: 'ITEM-002',
                    description: 'Service B',
                    quantity: 2,
                    unitPrice: 250,
                    lineTotal: 500,
                },
            ],
        };

        expect(() => validateInvoice(incompleteInvoice)).toThrow(
            'Missing required field(s): supplier.name, supplier.country'
        );
    });

    it('should throw an error if customer information is incomplete', () => {
        const incompleteInvoice = {
            id: 'INV-003',
            issueDate: '2024-01-01',
            deliveryDate: '2023-12-20',
            currency: 'EUR',
            totalAmount: 300,
            supplier: {
                name: 'Supplier Ltd.',
                country: 'DE',
            },
            customer: {},
            taxTotal: {
                taxAmount: 50,
                taxPercentage: 20,
            },
            lineItems: [
                {
                    id: 'ITEM-003',
                    description: 'Service C',
                    quantity: 3,
                    unitPrice: 100,
                    lineTotal: 300,
                },
            ],
        };

        expect(() => validateInvoice(incompleteInvoice)).toThrow(
            'Missing required field(s): customer.name, customer.country'
        );
    });

    it('should throw an error if line items are missing or invalid', () => {
        const invoiceWithoutLineItems = {
            id: 'INV-004',
            issueDate: '2024-01-01',
            deliveryDate: '2023-12-20',
            currency: 'EUR',
            totalAmount: 0,
            supplier: {
                name: 'Supplier Inc.',
                country: 'DE',
            },
            customer: {
                name: 'Customer Inc.',
                country: 'US',
            },
            taxTotal: {
                taxAmount: 0,
                taxPercentage: 0,
            },
        };

        expect(() => validateInvoice(invoiceWithoutLineItems)).toThrow(
            'Missing required field(s): lineItems (at least one line item is required)'
        );

        const invoiceWithInvalidLineItems = {
            id: 'INV-005',
            issueDate: '2024-01-01',
            deliveryDate: '2023-12-20',
            currency: 'EUR',
            totalAmount: 100,
            supplier: {
                name: 'Supplier Inc.',
                country: 'DE',
            },
            customer: {
                name: 'Customer Inc.',
                country: 'US',
            },
            taxTotal: {
                taxAmount: 20,
                taxPercentage: 20,
            },
            lineItems: [
                {
                    id: 'ITEM-005',
                    description: '',
                    quantity: undefined,
                    unitPrice: 100,
                    lineTotal: undefined,
                },
            ],
        };

        expect(() => validateInvoice(invoiceWithInvalidLineItems)).toThrow(
            'Missing required field(s): lineItems[0].description, lineItems[0].quantity, lineItems[0].lineTotal'
        );
    });

    it('should throw an error if tax information is missing', () => {
        const invoiceWithoutTax = {
            id: 'INV-006',
            issueDate: '2024-01-01',
            deliveryDate: '2023-12-20',
            currency: 'EUR',
            totalAmount: 100,
            supplier: {
                name: 'Supplier Inc.',
                country: 'DE',
            },
            customer: {
                name: 'Customer Inc.',
                country: 'US',
            },
            lineItems: [
                {
                    id: 'ITEM-006',
                    description: 'Service D',
                    quantity: 1,
                    unitPrice: 100,
                    lineTotal: 100,
                },
            ],
        };

        expect(() => validateInvoice(invoiceWithoutTax)).toThrow(
            'Missing required field(s): taxTotal.taxAmount, taxTotal.taxPercentage'
        );
    });

    describe('business rules', () => {
        const createInvoice = (overrides = {}) => ({
            id: 'INV-007',
            issueDate: '2024-01-01',
            deliveryDate: '2023-12-20',
            dueDate: '2024-01-15',
            currency: 'EUR',
            totalAmount: 119,
            supplier: { name: 'Supplier GmbH', country: 'DE', taxNumber: 'DE123456789' },
            customer: { name: 'Customer AG', country: 'DE' },
            taxTotal: { taxAmount: 19, taxPercentage: 19 },
            lineItems: [
                { id: '1', description: 'Product A', quantity: 2, unitPrice: 50, lineTotal: 100 },
            ],
            ...overrides,
        });

        it('should accept a valid invoice', () => {
            expect(() => validateInvoice(createInvoice())).not.toThrow();
        });

        it('should require a seller identifier (BR-CO-26)', () => {
            const invoice = createInvoice({ supplier: { name: 'Supplier GmbH', country: 'DE', legalEntityID: '201/113/40209' } });
            expect(() => validateInvoice(invoice)).toThrow('BR-CO-26');

            invoice.supplier.id = 'SUPPLIER-1';
            expect(() => validateInvoice(invoice)).not.toThrow();
        });

        it('should require a VAT ID or tax number of the seller (BR-S-02)', () => {
            const invoice = createInvoice({ supplier: { name: 'Supplier GmbH', country: 'DE', id: 'SUPPLIER-1' } });
            expect(() => validateInvoice(invoice)).toThrow('BR-S-02');
        });

        it('should require a due date or payment terms (BR-CO-25)', () => {
            expect(() => validateInvoice(createInvoice({ dueDate: undefined }))).toThrow('BR-CO-25');
            expect(() => validateInvoice(createInvoice({ dueDate: undefined, paymentTerms: '14 Tage netto' }))).not.toThrow();
        });

        it('should reject invalid dates', () => {
            expect(() => validateInvoice(createInvoice({ issueDate: '01.01.2024' }))).toThrow('issueDate must be a Date');
        });

        it('should require an exemption reason for tax exempt invoices', () => {
            const invoice = createInvoice({
                totalAmount: 100,
                taxTotal: { taxAmount: 0, taxPercentage: 0, categoryCode: 'E' },
            });
            expect(() => validateInvoice(invoice)).toThrow('taxTotal.exemptionReason is required');

            invoice.taxTotal.exemptionReason = 'Kleinunternehmer gemäß § 19 UStG';
            expect(() => validateInvoice(invoice)).not.toThrow();
        });

        it('should require a delivery date', () => {
            expect(() => validateInvoice(createInvoice({ deliveryDate: undefined }))).toThrow(
                'Missing required field(s): deliveryDate'
            );
        });

        it('should require a VAT rate of 0 for exempt tax categories', () => {
            const invoice = createInvoice({
                taxTotal: { taxAmount: 19, taxPercentage: 19, categoryCode: 'E', exemptionReason: 'Kleinunternehmer gemäß § 19 UStG' },
            });
            expect(() => validateInvoice(invoice)).toThrow('taxTotal.taxPercentage must be 0 for tax category E');
        });

        it('should require the buyer VAT ID for reverse charge (BR-AE-02)', () => {
            const invoice = createInvoice({
                totalAmount: 100,
                taxTotal: { taxAmount: 0, taxPercentage: 0, categoryCode: 'AE', exemptionReason: 'Reverse charge' },
            });
            expect(() => validateInvoice(invoice)).toThrow('BR-AE-02');

            invoice.customer.taxNumber = 'DE987654321';
            expect(() => validateInvoice(invoice)).not.toThrow();
        });

        it('should require VAT IDs for intra-community supplies (BR-IC-02)', () => {
            const invoice = createInvoice({
                totalAmount: 100,
                taxTotal: { taxAmount: 0, taxPercentage: 0, categoryCode: 'K', exemptionReason: 'Intra-community supply' },
            });
            expect(() => validateInvoice(invoice)).toThrow('BR-IC-02');

            invoice.customer = { name: 'Customer SARL', country: 'FR', taxNumber: 'FR12345678901' };
            expect(() => validateInvoice(invoice)).not.toThrow();
        });

        it('should reject VAT IDs for invoices not subject to VAT (BR-O-02)', () => {
            const invoice = createInvoice({
                totalAmount: 100,
                taxTotal: { taxAmount: 0, taxPercentage: 0, categoryCode: 'O', exemptionReason: 'Not subject to VAT' },
            });
            expect(() => validateInvoice(invoice)).toThrow('BR-O-02');

            invoice.supplier = { name: 'Supplier GmbH', country: 'DE', id: 'SUPPLIER-1' };
            expect(() => validateInvoice(invoice)).not.toThrow();
        });

        it('should require city, postal code and country of a delivery address', () => {
            expect(() => validateInvoice(createInvoice({ deliveryAddress: { country: 'DE' } }))).toThrow(
                'deliveryAddress.city is required if a delivery address is given; deliveryAddress.postalCode is required if a delivery address is given'
            );
        });

        it('should require an IBAN for SEPA credit transfers (BR-61)', () => {
            expect(() => validateInvoice(createInvoice({ paymentDetails: { paymentMeansCode: '58' } }))).toThrow('BR-61');
            expect(() => validateInvoice(createInvoice({ paymentDetails: { paymentID: 'INV-007' } }))).not.toThrow();
            expect(() => validateInvoice(createInvoice({ paymentDetails: { bankDetails: { iban: 'DE02120300000000202051' } } }))).not.toThrow();
        });

        it('should reject inconsistent line totals', () => {
            const invoice = createInvoice({
                lineItems: [{ id: '1', description: 'Product A', quantity: 3, unitPrice: 50, lineTotal: 100 }],
            });
            expect(() => validateInvoice(invoice)).toThrow('lineItems[0].lineTotal must equal quantity * unitPrice');
        });

        it('should reject an inconsistent tax amount', () => {
            const invoice = createInvoice({ taxTotal: { taxAmount: 20, taxPercentage: 19 }, totalAmount: 120 });
            expect(() => validateInvoice(invoice)).toThrow('taxTotal.taxAmount must equal 19.00');
        });

        it('should reject an inconsistent total amount (BR-CO-15)', () => {
            expect(() => validateInvoice(createInvoice({ totalAmount: 100 }))).toThrow('totalAmount must equal 119.00');
        });
    });
});

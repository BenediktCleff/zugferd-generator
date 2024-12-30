const validateInvoice = require('../src/validation')

describe('validateInvoice', () => {
    it('should validate a correct invoice without throwing an error', () => {
        const validInvoice = {
            id: 'INV-001',
            issueDate: '2024-01-01',
            currency: 'EUR',
            totalAmount: 1000,
            supplier: {
                name: 'Example Supplier Ltd.',
                country: 'DE',
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
            'Missing required field(s): id, issueDate, currency, totalAmount, supplier.name, supplier.country, customer.name, customer.country, taxTotal.taxAmount, taxTotal.taxPercentage, lineItems (at least one line item is required)'
        );
    });

    it('should throw an error if supplier information is incomplete', () => {
        const incompleteInvoice = {
            id: 'INV-002',
            issueDate: '2024-01-01',
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
});

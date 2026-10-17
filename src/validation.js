/*!
 * zugferd-generator
 * Copyright(c) 2024 Benedikt Cleff (info@pixelpal.io)
 * MIT Licensed
 */

// Tax categories that require an exemption reason (BR-E-10, BR-AE-10, BR-IC-10, BR-G-10, BR-O-10)
const CATEGORIES_REQUIRING_EXEMPTION_REASON = ['E', 'AE', 'K', 'G', 'O'];
const TAX_CATEGORIES = ['S', 'Z', 'E', 'AE', 'K', 'G', 'O', 'L', 'M'];

function isValidDate(value) {
    if (value instanceof Date) return !isNaN(value.getTime());
    return /^\d{4}-?\d{2}-?\d{2}/.test(String(value).trim());
}

function round(value) {
    return Math.round(Number(value) * 100) / 100;
}

function differs(a, b) {
    return Math.abs(round(a) - round(b)) > 0.01;
}

function validateRequiredFields(invoice) {
    const missingFields = [];

    // Validate required info fields
    if (!invoice.id) missingFields.push('id');
    if (!invoice.issueDate) missingFields.push('issueDate');
    if (!invoice.currency) missingFields.push('currency');
    if (typeof invoice.totalAmount === 'undefined') missingFields.push('totalAmount');

    // Validate required fields for supplier
    if (!invoice.supplier || !invoice.supplier.name) {
        missingFields.push('supplier.name');
    }
    if (!invoice.supplier || !invoice.supplier.country) {
        missingFields.push('supplier.country');
    }

    // Validate required fields for customer
    if (!invoice.customer || !invoice.customer.name) {
        missingFields.push('customer.name');
    }
    if (!invoice.customer || !invoice.customer.country) {
        missingFields.push('customer.country');
    }

    // Validate required fields for tax
    if (!invoice.taxTotal || typeof invoice.taxTotal.taxAmount === 'undefined') {
        missingFields.push('taxTotal.taxAmount');
    }
    if (!invoice.taxTotal || typeof invoice.taxTotal.taxPercentage === 'undefined') {
        missingFields.push('taxTotal.taxPercentage');
    }

    // Validate required fields for lineItems
    if (!invoice.lineItems || invoice.lineItems.length === 0) {
        missingFields.push('lineItems (at least one line item is required)');
    } else {
        invoice.lineItems.forEach((item, index) => {
            if (!item.id) {
                missingFields.push(`lineItems[${index}].id`);
            }
            if (!item.description) {
                missingFields.push(`lineItems[${index}].description`);
            }
            if (typeof item.quantity === 'undefined') {
                missingFields.push(`lineItems[${index}].quantity`);
            }
            if (typeof item.unitPrice === 'undefined') {
                missingFields.push(`lineItems[${index}].unitPrice`);
            }
            if (typeof item.lineTotal === 'undefined') {
                missingFields.push(`lineItems[${index}].lineTotal`);
            }
        });
    }

    // Throw error if required fields are missing
    if (missingFields.length > 0) {
        throw new Error(
            `Missing required field(s): ${missingFields.join(', ')}`
        );
    }
}

/**
 * Checks the EN 16931 business rules that cannot be satisfied by the generator itself.
 */
function validateBusinessRules(invoice) {
    const errors = [];
    const { supplier, taxTotal } = invoice;
    const categoryCode = taxTotal.categoryCode || (Number(taxTotal.taxPercentage) > 0 ? 'S' : 'Z');

    ['issueDate', 'dueDate', 'deliveryDate'].forEach((field) => {
        if (invoice[field] && !isValidDate(invoice[field])) {
            errors.push(`${field} must be a Date or a string in the format YYYY-MM-DD`);
        }
    });

    // BR-CO-26
    if (!supplier.id && !supplier.taxNumber) {
        errors.push('supplier.taxNumber (VAT ID) or supplier.id is required to identify the seller (BR-CO-26)');
    }

    if (!TAX_CATEGORIES.includes(categoryCode)) {
        errors.push(`taxTotal.categoryCode must be one of ${TAX_CATEGORIES.join(', ')}`);
    }

    // BR-S-02, BR-Z-02, BR-E-02, ...
    if (categoryCode !== 'O' && !supplier.taxNumber && !supplier.legalEntityID) {
        errors.push('supplier.taxNumber (VAT ID) or supplier.legalEntityID (tax number) is required (BR-S-02)');
    }

    if (CATEGORIES_REQUIRING_EXEMPTION_REASON.includes(categoryCode) && !taxTotal.exemptionReason) {
        errors.push(`taxTotal.exemptionReason is required for tax category ${categoryCode}`);
    }

    // BR-CO-25
    if (Number(invoice.totalAmount) > 0 && !invoice.dueDate && !invoice.paymentTerms) {
        errors.push('dueDate or paymentTerms is required if the invoice amount is positive (BR-CO-25)');
    }

    // Arithmetic checks
    let lineTotalSum = 0;
    invoice.lineItems.forEach((item, index) => {
        lineTotalSum += Number(item.lineTotal);
        if (differs(Number(item.quantity) * Number(item.unitPrice), item.lineTotal)) {
            errors.push(`lineItems[${index}].lineTotal must equal quantity * unitPrice`);
        }
    });

    const expectedTaxAmount = round(lineTotalSum * Number(taxTotal.taxPercentage) / 100);
    if (differs(taxTotal.taxAmount, expectedTaxAmount)) {
        errors.push(`taxTotal.taxAmount must equal ${expectedTaxAmount.toFixed(2)} (sum of line totals * taxPercentage)`);
    }

    // BR-CO-15
    const expectedTotalAmount = round(lineTotalSum + Number(taxTotal.taxAmount));
    if (differs(invoice.totalAmount, expectedTotalAmount)) {
        errors.push(`totalAmount must equal ${expectedTotalAmount.toFixed(2)} (sum of line totals + taxAmount)`);
    }

    if (errors.length > 0) {
        throw new Error(`Invalid invoice: ${errors.join('; ')}`);
    }
}

function validateInvoice(invoice) {
    validateRequiredFields(invoice);
    validateBusinessRules(invoice);
}

module.exports = validateInvoice;

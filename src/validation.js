/*!
 * zugferd-generator
 * Copyright(c) 2024 Benedikt Cleff (info@pixelpal.io)
 * MIT Licensed
 */

function validateInvoice(invoice) {
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

module.exports = validateInvoice;

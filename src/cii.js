/*!
 * zugferd-generator
 * Copyright(c) 2024 Benedikt Cleff (info@pixelpal.io)
 * MIT Licensed
 */

// ZUGFeRD 2.x / Factur-X profile "EN 16931" (a.k.a. COMFORT)
const GUIDELINE_ID = 'urn:cen.eu:en16931:2017';

function escapeXML(value) {
    if (value === null || value === undefined || value === '') return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Converts a date (Date object, "YYYY-MM-DD" or "YYYYMMDD") into the CII date format 102 (YYYYMMDD).
 */
function formatDate(value) {
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10).replace(/-/g, '');
    }
    const match = String(value).trim().match(/^(\d{4})-?(\d{2})-?(\d{2})/);
    if (!match) {
        throw new Error(`Invalid date "${value}", expected format YYYY-MM-DD`);
    }
    return `${match[1]}${match[2]}${match[3]}`;
}

function formatAmount(value) {
    return Number(value).toFixed(2);
}

// Prices and quantities may carry up to 4 decimals
function formatDecimal(value) {
    return Number(value).toFixed(4).replace(/0{1,2}$/, '');
}

function getTaxCategoryCode(taxTotal) {
    if (taxTotal.categoryCode) return taxTotal.categoryCode;
    return Number(taxTotal.taxPercentage) > 0 ? 'S' : 'Z';
}

function getLineTotalSum(invoice) {
    return invoice.lineItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
}

function generateAddressXML(party, indent) {
    let xml = `${indent}<ram:PostalTradeAddress>\n`;
    if (party.postalCode) {
        xml += `${indent}  <ram:PostcodeCode>${escapeXML(party.postalCode)}</ram:PostcodeCode>\n`;
    }
    if (party.street) {
        xml += `${indent}  <ram:LineOne>${escapeXML(party.street)}</ram:LineOne>\n`;
    }
    if (party.city) {
        xml += `${indent}  <ram:CityName>${escapeXML(party.city)}</ram:CityName>\n`;
    }
    xml += `${indent}  <ram:CountryID>${escapeXML(party.country)}</ram:CountryID>\n`;
    xml += `${indent}</ram:PostalTradeAddress>\n`;
    return xml;
}

function generateTaxRegistrationXML(id, schemeID, indent) {
    let xml = `${indent}<ram:SpecifiedTaxRegistration>\n`;
    xml += `${indent}  <ram:ID schemeID="${schemeID}">${escapeXML(id)}</ram:ID>\n`;
    xml += `${indent}</ram:SpecifiedTaxRegistration>\n`;
    return xml;
}

function generatePartyXML(tagName, party, indent) {
    const inner = `${indent}  `;
    let xml = `${indent}<ram:${tagName}>\n`;
    if (party.id) {
        xml += `${inner}<ram:ID>${escapeXML(party.id)}</ram:ID>\n`;
    }
    xml += `${inner}<ram:Name>${escapeXML(party.name)}</ram:Name>\n`;
    xml += generateAddressXML(party, inner);
    if (party.email) {
        xml += `${inner}<ram:URIUniversalCommunication>\n`;
        xml += `${inner}  <ram:URIID schemeID="EM">${escapeXML(party.email)}</ram:URIID>\n`;
        xml += `${inner}</ram:URIUniversalCommunication>\n`;
    }
    // FC = tax number (Steuernummer), VA = VAT identification number (USt-IdNr.)
    if (party.legalEntityID) {
        xml += generateTaxRegistrationXML(party.legalEntityID, 'FC', inner);
    }
    if (party.taxNumber) {
        xml += generateTaxRegistrationXML(party.taxNumber, 'VA', inner);
    }
    xml += `${indent}</ram:${tagName}>\n`;
    return xml;
}

function generateLineItemXML(item, invoice) {
    const categoryCode = getTaxCategoryCode(invoice.taxTotal);
    let xml = `    <ram:IncludedSupplyChainTradeLineItem>\n`;
    xml += `      <ram:AssociatedDocumentLineDocument>\n`;
    xml += `        <ram:LineID>${escapeXML(item.id)}</ram:LineID>\n`;
    xml += `      </ram:AssociatedDocumentLineDocument>\n`;
    xml += `      <ram:SpecifiedTradeProduct>\n`;
    xml += `        <ram:Name>${escapeXML(item.description)}</ram:Name>\n`;
    xml += `      </ram:SpecifiedTradeProduct>\n`;
    xml += `      <ram:SpecifiedLineTradeAgreement>\n`;
    xml += `        <ram:NetPriceProductTradePrice>\n`;
    xml += `          <ram:ChargeAmount>${formatDecimal(item.unitPrice)}</ram:ChargeAmount>\n`;
    xml += `        </ram:NetPriceProductTradePrice>\n`;
    xml += `      </ram:SpecifiedLineTradeAgreement>\n`;
    xml += `      <ram:SpecifiedLineTradeDelivery>\n`;
    xml += `        <ram:BilledQuantity unitCode="${escapeXML(item.unitCode || 'C62')}">${formatDecimal(item.quantity)}</ram:BilledQuantity>\n`;
    xml += `      </ram:SpecifiedLineTradeDelivery>\n`;
    xml += `      <ram:SpecifiedLineTradeSettlement>\n`;
    xml += `        <ram:ApplicableTradeTax>\n`;
    xml += `          <ram:TypeCode>VAT</ram:TypeCode>\n`;
    xml += `          <ram:CategoryCode>${escapeXML(categoryCode)}</ram:CategoryCode>\n`;
    if (categoryCode !== 'O') {
        xml += `          <ram:RateApplicablePercent>${formatAmount(invoice.taxTotal.taxPercentage)}</ram:RateApplicablePercent>\n`;
    }
    xml += `        </ram:ApplicableTradeTax>\n`;
    xml += `        <ram:SpecifiedTradeSettlementLineMonetarySummation>\n`;
    xml += `          <ram:LineTotalAmount>${formatAmount(item.lineTotal)}</ram:LineTotalAmount>\n`;
    xml += `        </ram:SpecifiedTradeSettlementLineMonetarySummation>\n`;
    xml += `      </ram:SpecifiedLineTradeSettlement>\n`;
    xml += `    </ram:IncludedSupplyChainTradeLineItem>\n`;
    return xml;
}

function generateZUGFeRDInvoiceXML(invoice) {
    const currency = escapeXML(invoice.currency);
    const categoryCode = getTaxCategoryCode(invoice.taxTotal);
    const lineTotalSum = getLineTotalSum(invoice);

    let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xmlString += `<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"\n`;
    xmlString += `                          xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"\n`;
    xmlString += `                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"\n`;
    xmlString += `                          xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">\n`;

    // Document context (profile)
    xmlString += `  <rsm:ExchangedDocumentContext>\n`;
    xmlString += `    <ram:GuidelineSpecifiedDocumentContextParameter>\n`;
    xmlString += `      <ram:ID>${GUIDELINE_ID}</ram:ID>\n`;
    xmlString += `    </ram:GuidelineSpecifiedDocumentContextParameter>\n`;
    xmlString += `  </rsm:ExchangedDocumentContext>\n`;

    // Document header
    xmlString += `  <rsm:ExchangedDocument>\n`;
    xmlString += `    <ram:ID>${escapeXML(invoice.id)}</ram:ID>\n`;
    xmlString += `    <ram:TypeCode>380</ram:TypeCode>\n`; // 380 = Standard-Rechnung
    xmlString += `    <ram:IssueDateTime>\n`;
    xmlString += `      <udt:DateTimeString format="102">${formatDate(invoice.issueDate)}</udt:DateTimeString>\n`;
    xmlString += `    </ram:IssueDateTime>\n`;

    // Notes
    if (invoice.notes && invoice.notes.length > 0) {
        invoice.notes.forEach((note) => {
            xmlString += `    <ram:IncludedNote>\n`;
            xmlString += `      <ram:Content>${escapeXML(note)}</ram:Content>\n`;
            xmlString += `    </ram:IncludedNote>\n`;
        });
    }

    xmlString += `  </rsm:ExchangedDocument>\n`;

    xmlString += `  <rsm:SupplyChainTradeTransaction>\n`;

    // Line items (must precede the header trade elements)
    invoice.lineItems.forEach((item) => {
        xmlString += generateLineItemXML(item, invoice);
    });

    // Supplier & customer
    xmlString += `    <ram:ApplicableHeaderTradeAgreement>\n`;
    if (invoice.buyerReference) {
        xmlString += `      <ram:BuyerReference>${escapeXML(invoice.buyerReference)}</ram:BuyerReference>\n`;
    }
    xmlString += generatePartyXML('SellerTradeParty', invoice.supplier, '      ');
    xmlString += generatePartyXML('BuyerTradeParty', invoice.customer, '      ');
    xmlString += `    </ram:ApplicableHeaderTradeAgreement>\n`;

    // Delivery
    if (invoice.deliveryDate) {
        xmlString += `    <ram:ApplicableHeaderTradeDelivery>\n`;
        xmlString += `      <ram:ActualDeliverySupplyChainEvent>\n`;
        xmlString += `        <ram:OccurrenceDateTime>\n`;
        xmlString += `          <udt:DateTimeString format="102">${formatDate(invoice.deliveryDate)}</udt:DateTimeString>\n`;
        xmlString += `        </ram:OccurrenceDateTime>\n`;
        xmlString += `      </ram:ActualDeliverySupplyChainEvent>\n`;
        xmlString += `    </ram:ApplicableHeaderTradeDelivery>\n`;
    } else {
        xmlString += `    <ram:ApplicableHeaderTradeDelivery/>\n`;
    }

    // Settlement
    xmlString += `    <ram:ApplicableHeaderTradeSettlement>\n`;
    if (invoice.paymentDetails && invoice.paymentDetails.paymentID) {
        xmlString += `      <ram:PaymentReference>${escapeXML(invoice.paymentDetails.paymentID)}</ram:PaymentReference>\n`;
    }
    xmlString += `      <ram:InvoiceCurrencyCode>${currency}</ram:InvoiceCurrencyCode>\n`;

    // Payment means
    if (invoice.paymentDetails && (invoice.paymentDetails.paymentMeansCode || invoice.paymentDetails.bankDetails)) {
        const bankDetails = invoice.paymentDetails.bankDetails;
        xmlString += `      <ram:SpecifiedTradeSettlementPaymentMeans>\n`;
        // Defaults to 58 = SEPA credit transfer
        xmlString += `        <ram:TypeCode>${escapeXML(invoice.paymentDetails.paymentMeansCode || '58')}</ram:TypeCode>\n`;
        if (bankDetails && bankDetails.iban) {
            xmlString += `        <ram:PayeePartyCreditorFinancialAccount>\n`;
            xmlString += `          <ram:IBANID>${escapeXML(bankDetails.iban.replace(/\s/g, ''))}</ram:IBANID>\n`;
            if (bankDetails.accountName) {
                xmlString += `          <ram:AccountName>${escapeXML(bankDetails.accountName)}</ram:AccountName>\n`;
            }
            xmlString += `        </ram:PayeePartyCreditorFinancialAccount>\n`;
        }
        // Note: The bank name is not part of the EN 16931 data model and is therefore not exported
        if (bankDetails && bankDetails.bic) {
            xmlString += `        <ram:PayeeSpecifiedCreditorFinancialInstitution>\n`;
            xmlString += `          <ram:BICID>${escapeXML(bankDetails.bic)}</ram:BICID>\n`;
            xmlString += `        </ram:PayeeSpecifiedCreditorFinancialInstitution>\n`;
        }
        xmlString += `      </ram:SpecifiedTradeSettlementPaymentMeans>\n`;
    }

    // VAT breakdown
    xmlString += `      <ram:ApplicableTradeTax>\n`;
    xmlString += `        <ram:CalculatedAmount>${formatAmount(invoice.taxTotal.taxAmount)}</ram:CalculatedAmount>\n`;
    xmlString += `        <ram:TypeCode>VAT</ram:TypeCode>\n`;
    if (invoice.taxTotal.exemptionReason) {
        xmlString += `        <ram:ExemptionReason>${escapeXML(invoice.taxTotal.exemptionReason)}</ram:ExemptionReason>\n`;
    }
    xmlString += `        <ram:BasisAmount>${formatAmount(lineTotalSum)}</ram:BasisAmount>\n`;
    xmlString += `        <ram:CategoryCode>${escapeXML(categoryCode)}</ram:CategoryCode>\n`;
    if (categoryCode !== 'O') {
        xmlString += `        <ram:RateApplicablePercent>${formatAmount(invoice.taxTotal.taxPercentage)}</ram:RateApplicablePercent>\n`;
    }
    xmlString += `      </ram:ApplicableTradeTax>\n`;

    // Payment terms
    if (invoice.dueDate || invoice.paymentTerms) {
        xmlString += `      <ram:SpecifiedTradePaymentTerms>\n`;
        if (invoice.paymentTerms) {
            xmlString += `        <ram:Description>${escapeXML(invoice.paymentTerms)}</ram:Description>\n`;
        }
        if (invoice.dueDate) {
            xmlString += `        <ram:DueDateDateTime>\n`;
            xmlString += `          <udt:DateTimeString format="102">${formatDate(invoice.dueDate)}</udt:DateTimeString>\n`;
            xmlString += `        </ram:DueDateDateTime>\n`;
        }
        xmlString += `      </ram:SpecifiedTradePaymentTerms>\n`;
    }

    // Totals
    xmlString += `      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n`;
    xmlString += `        <ram:LineTotalAmount>${formatAmount(lineTotalSum)}</ram:LineTotalAmount>\n`;
    xmlString += `        <ram:TaxBasisTotalAmount>${formatAmount(lineTotalSum)}</ram:TaxBasisTotalAmount>\n`;
    xmlString += `        <ram:TaxTotalAmount currencyID="${currency}">${formatAmount(invoice.taxTotal.taxAmount)}</ram:TaxTotalAmount>\n`;
    xmlString += `        <ram:GrandTotalAmount>${formatAmount(invoice.totalAmount)}</ram:GrandTotalAmount>\n`;
    xmlString += `        <ram:DuePayableAmount>${formatAmount(invoice.totalAmount)}</ram:DuePayableAmount>\n`;
    xmlString += `      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>\n`;
    xmlString += `    </ram:ApplicableHeaderTradeSettlement>\n`;

    // Closing tag
    xmlString += `  </rsm:SupplyChainTradeTransaction>\n`;
    xmlString += `</rsm:CrossIndustryInvoice>\n`;

    return xmlString;
}

module.exports = {
    generateZUGFeRDInvoiceXML,
    escapeXML,
    formatDate,
    GUIDELINE_ID,
};

/*!
 * zugferd-generator
 * Copyright(c) 2024 Benedikt Cleff (info@pixelpal.io)
 * MIT Licensed
 */

function escapeXML(value) {
    if (!value) return '';
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function generateZUGFeRDInvoiceXML(invoice) {
    let xmlString = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xmlString += `<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" \n`;
    xmlString += `                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" \n`;
    xmlString += `                          xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100" \n`;
    xmlString += `                          xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">\n`;

    // Root CII invoice element
    xmlString += `  <rsm:ExchangedDocumentContext>\n`;
    xmlString += `    <ram:GuidelineSpecifiedDocumentContextParameter>\n`;
    xmlString += `      <ram:ID>ZUGFeRD</ram:ID>\n`;
    xmlString += `    </ram:GuidelineSpecifiedDocumentContextParameter>\n`;
    xmlString += `  </rsm:ExchangedDocumentContext>\n`;

    xmlString += `  <rsm:ExchangedDocument>\n`;
    xmlString += `    <ram:ID>${escapeXML(invoice.id)}</ram:ID>\n`;
    xmlString += `    <ram:TypeCode>380</ram:TypeCode>\n`; // 380 = Standard-Rechnung
    xmlString += `    <ram:IssueDateTime>\n`;
    xmlString += `      <udt:DateTimeString format="102">${escapeXML(invoice.issueDate)}</udt:DateTimeString>\n`;
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

    // Supplier
    xmlString += `  <rsm:SupplyChainTradeTransaction>\n`;
    xmlString += `    <ram:ApplicableHeaderTradeAgreement>\n`;
    xmlString += `      <ram:SellerTradeParty>\n`;
    xmlString += `        <ram:Name>${escapeXML(invoice.supplier.name)}</ram:Name>\n`;
    if (invoice.supplier.taxNumber) {
        xmlString += `        <ram:SpecifiedTaxRegistration>\n`;
        xmlString += `                <ram:ID schemaId="VA">${invoice.supplier.taxNumber}</ram:ID>\n`;
        xmlString += `        </ram:SpecifiedTaxRegistration>\n`;
    }
    if (invoice.supplier.legalEntityID) {
        xmlString += `        <ram:SpecifiedTaxRegistration>\n`;
        xmlString += `                <ram:ID schemaId="FC">${invoice.supplier.legalEntityID}</ram:ID>\n`;
        xmlString += `        </ram:SpecifiedTaxRegistration>\n`;
    }
    if (invoice.supplier.street || invoice.supplier.city || invoice.supplier.postalCode) {
        xmlString += `        <ram:PostalTradeAddress>\n`;
        if (invoice.supplier.street) {
            xmlString += `          <ram:LineOne>${escapeXML(invoice.supplier.street)}</ram:LineOne>\n`;
        }
        if (invoice.supplier.postalCode) {
            xmlString += `          <ram:PostcodeCode>${escapeXML(invoice.supplier.postalCode)}</ram:PostcodeCode>\n`;
        }
        if (invoice.supplier.city) {
            xmlString += `          <ram:CityName>${escapeXML(invoice.supplier.city)}</ram:CityName>\n`;
        }
        xmlString += `          <ram:CountryID>${escapeXML(invoice.supplier.country)}</ram:CountryID>\n`;
        xmlString += `        </ram:PostalTradeAddress>\n`;
    }
    xmlString += `      </ram:SellerTradeParty>\n`;

    // Customer
    xmlString += `      <ram:BuyerTradeParty>\n`;
    xmlString += `        <ram:Name>${escapeXML(invoice.customer.name)}</ram:Name>\n`;
    if (invoice.customer.taxNumber) {
        xmlString += `        <ram:SpecifiedTaxRegistration>\n`;
        xmlString += `                <ram:ID schemaId="VA">${invoice.customer.taxNumber}</ram:ID>\n`;
        xmlString += `        </ram:SpecifiedTaxRegistration>\n`;
    }
    if (invoice.customer.street || invoice.customer.city || invoice.customer.postalCode) {
        xmlString += `        <ram:PostalTradeAddress>\n`;
        if (invoice.customer.street) {
            xmlString += `          <ram:LineOne>${escapeXML(invoice.customer.street)}</ram:LineOne>\n`;
        }
        if (invoice.customer.postalCode) {
            xmlString += `          <ram:PostcodeCode>${escapeXML(invoice.customer.postalCode)}</ram:PostcodeCode>\n`;
        }
        if (invoice.customer.city) {
            xmlString += `          <ram:CityName>${escapeXML(invoice.customer.city)}</ram:CityName>\n`;
        }
        xmlString += `          <ram:CountryID>${escapeXML(invoice.customer.country)}</ram:CountryID>\n`;
        xmlString += `        </ram:PostalTradeAddress>\n`;
    }
    xmlString += `      </ram:BuyerTradeParty>\n`;
    xmlString += `    </ram:ApplicableHeaderTradeAgreement>\n`;

    // Payment details
    if (invoice.paymentDetails) {
        xmlString += `      <ram:SpecifiedTradeSettlementPaymentMeans>\n`;
        if (invoice.paymentDetails.paymentMeansCode) {
            xmlString += `        <ram:TypeCode>${escapeXML(invoice.paymentDetails.paymentMeansCode)}</ram:TypeCode>\n`;
        }
        if (invoice.paymentDetails.paymentID) {
            xmlString += `        <ram:ID>${escapeXML(invoice.paymentDetails.paymentID)}</ram:ID>\n`;
        }
        // Bank details
        if (invoice.paymentDetails.bankDetails) {
            xmlString += `        <ram:PayeePartyCreditorFinancialAccount>\n`;
            if (invoice.paymentDetails.bankDetails.iban) {
                xmlString += `          <ram:IBANID>${escapeXML(invoice.paymentDetails.bankDetails.iban)}</ram:IBANID>\n`;
            }
            if (invoice.paymentDetails.bankDetails.accountName) {
                xmlString += `          <ram:AccountName>${escapeXML(invoice.paymentDetails.bankDetails.accountName)}</ram:AccountName>\n`;
            }
            xmlString += `        </ram:PayeePartyCreditorFinancialAccount>\n`;

            xmlString += `        <ram:PayeeSpecifiedCreditorFinancialInstitution>\n`;
            if (invoice.paymentDetails.bankDetails.bic) {
                xmlString += `          <ram:BICID>${escapeXML(invoice.paymentDetails.bankDetails.bic)}</ram:BICID>\n`;
            }
            if (invoice.paymentDetails.bankDetails.bankName) {
                xmlString += `          <ram:Name>${escapeXML(invoice.paymentDetails.bankDetails.bankName)}</ram:Name>\n`;
            }
            xmlString += `        </ram:PayeeSpecifiedCreditorFinancialInstitution>\n`;
        }
        xmlString += `      </ram:SpecifiedTradeSettlementPaymentMeans>\n`;
    }

    // Tax details
    xmlString += `    <ram:ApplicableHeaderTradeSettlement>\n`;
    xmlString += `      <ram:TaxTotal>\n`;
    xmlString += `        <ram:TaxAmount currencyID="${escapeXML(invoice.currency)}">${invoice.taxTotal.taxAmount.toFixed(2)}</ram:TaxAmount>\n`;
    xmlString += `        <ram:TaxSubtotal>\n`;
    xmlString += `          <ram:Percent>${invoice.taxTotal.taxPercentage.toFixed(2)}</ram:Percent>\n`;
    xmlString += `        </ram:TaxSubtotal>\n`;
    xmlString += `      </ram:TaxTotal>\n`;

    if (invoice.dueDate) {
        xmlString += `      <ram:SpecifiedTradePaymentTerms>\n`;
        xmlString += `        <ram:DueDateDateTime>\n`;
        xmlString += `          <udt:DateTimeString format="102">${escapeXML(invoice.dueDate)}</udt:DateTimeString>\n`;
        xmlString += `        </ram:DueDateDateTime>\n`;
        xmlString += `      </ram:SpecifiedTradePaymentTerms>\n`;
    }

    xmlString += `      <ram:GrandTotalAmount currencyID="${escapeXML(invoice.currency)}">${invoice.totalAmount.toFixed(2)}</ram:GrandTotalAmount>\n`;
    xmlString += `    </ram:ApplicableHeaderTradeSettlement>\n`;

    // Line items
    invoice.lineItems.forEach((item) => {
        xmlString += `      <ram:IncludedSupplyChainTradeLineItem>\n`;
        xmlString += `        <ram:AssociatedDocumentLineDocument>\n`;
        xmlString += `          <ram:LineID>${escapeXML(item.id)}</ram:LineID>\n`;
        xmlString += `        </ram:AssociatedDocumentLineDocument>\n`;
        xmlString += `        <ram:SpecifiedTradeProduct>\n`;
        xmlString += `          <ram:Name>${escapeXML(item.description)}</ram:Name>\n`;
        xmlString += `        </ram:SpecifiedTradeProduct>\n`;
        xmlString += `        <ram:SpecifiedLineTradeAgreement>\n`;
        xmlString += `          <ram:GrossPriceProductTradePrice>\n`;
        xmlString += `            <ram:ChargeAmount>${item.unitPrice.toFixed(2)}</ram:ChargeAmount>\n`;
        xmlString += `          </ram:GrossPriceProductTradePrice>\n`;
        xmlString += `        </ram:SpecifiedLineTradeAgreement>\n`;
        xmlString += `        <ram:SpecifiedLineSupplyChainTradeSettlement>\n`;
        xmlString += `          <ram:LineTotalAmount currencyID="${escapeXML(invoice.currency)}">${item.lineTotal.toFixed(2)}</ram:LineTotalAmount>\n`;
        xmlString += `        </ram:SpecifiedLineSupplyChainTradeSettlement>\n`;
        xmlString += `      </ram:IncludedSupplyChainTradeLineItem>\n`;
    });

    // Closing tag
    xmlString += `  </rsm:SupplyChainTradeTransaction>\n`;
    xmlString += `</rsm:CrossIndustryInvoice>\n`;

    return xmlString;
}

module.exports = {
    generateZUGFeRDInvoiceXML,
    escapeXML,
};

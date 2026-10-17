// Compatible with the InvoiceData type of xrechnung-generator, so the same invoice data can be used for both.
declare interface InvoiceData {
    id: string;
    issueDate: string | Date; // YYYY-MM-DD
    dueDate?: string | Date; // optional, YYYY-MM-DD (dueDate or paymentTerms is required)
    deliveryDate: string | Date; // YYYY-MM-DD, date of delivery or service (Leistungsdatum)
    deliveryAddress?: { // optional, defaults to the customer address for tax category K
        street?: string; // optional
        postalCode: string;
        city: string;
        country: string;
    };
    paymentTerms?: string; // optional, e.g. "Zahlbar innerhalb von 14 Tagen"
    buyerReference?: string; // optional, e.g. Leitweg-ID
    currency: string;
    totalAmount: number; // gross amount (sum of line totals + taxAmount)
    supplier: {
        name: string;
        country: string;
        id?: string; // optional, seller identifier
        street?: string; // optional
        postalCode?: string; // optional
        city?: string; // optional
        email?: string; // optional
        phone?: string; // optional
        contactName?: string; // optional, contact person or department, defaults to name
        electronicAddress?: string; // optional, defaults to email
        electronicAddressScheme?: string; // optional, EAS code of the electronic address, defaults to EM (email)
        taxNumber?: string; // optional, VAT ID (USt-IdNr.)
        legalEntityID?: string; // optional, tax number (Steuernummer)
    };
    customer: {
        name: string;
        country: string;
        street?: string; // optional
        postalCode?: string; // optional
        city?: string; // optional
        email?: string; // optional
        electronicAddress?: string; // optional, defaults to email
        electronicAddressScheme?: string; // optional, EAS code of the electronic address, defaults to EM (email), e.g. 0204 for a Leitweg-ID
        taxNumber?: string; // optional, VAT ID (USt-IdNr.)
    };
    taxTotal: {
        taxAmount: number;
        taxPercentage: number;
        categoryCode?: 'S' | 'Z' | 'E' | 'AE' | 'K' | 'G' | 'O' | 'L' | 'M'; // optional, defaults to S (or Z for 0%)
        exemptionReason?: string; // optional, required for E, AE, K, G and O
    };
    paymentDetails?: { // optional
        paymentMeansCode?: string; // optional, defaults to 58 (SEPA credit transfer)
        paymentID?: string; // optional, payment reference
        bankDetails?: { // optional (iban is required for payment means code 30 and 58)
            accountName?: string; // optional
            iban?: string; // optional
            bic?: string; // optional
            bankName?: string; // optional, not part of EN 16931 and therefore not exported
        }
    };
    notes?: string[]; // optional
    lineItems: {
        id: string;
        description: string;
        quantity: number;
        unitPrice: number; // net price
        lineTotal: number; // quantity * unitPrice
        unitCode?: string; // optional, UN/ECE Rec 20 unit code, defaults to C62 (piece)
    }[];
}

declare class ZUGFeRDGenerator {
    constructor(invoice: InvoiceData);

    embedInPDF(pdfBuffer: Buffer): Promise<Buffer>;
    toBlob(): Blob;
    toBuffer(): Buffer;
    toXMLString(): string;
}

export = ZUGFeRDGenerator;

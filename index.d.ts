declare interface InvoiceData {
    id: string;
    issueDate: string;
    dueDate?: string; // optional
    currency: string;
    totalAmount: number;
    supplier: {
        name: string;
        country: string;
        street?: string; // optional
        postalCode?: string; // optional
        city?: string; // optional
        taxNumber?: string; // optional
        legalEntityID?: string; // optional
    };
    customer: {
        name: string;
        country: string;
        street?: string; // optional
        postalCode?: string; // optional
        city?: string; // optional
        taxNumber?: string; // optional
        legalEntityID?: string; // optional
    };
    taxTotal: {
        taxAmount: number;
        taxPercentage: number;
    };
    paymentDetails?: { // optional
        paymentMeansCode?: string; // optional
        paymentID?: string; // optional
        bankDetails?: {
            accountName?: string; // optional
            iban?: string; // optional
            bic?: string; // optional
            bankName?: string; // optional
        }
    };
    notes?: string[]; // optional
    lineItems: {
        id: string;
        description: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
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

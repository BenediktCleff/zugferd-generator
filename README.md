# ZUGFeRD Generator

<div>
   <img src="https://badgen.now.sh/npm/v/zugferd-generator" alt="Version" />
   <img src="https://badgen.now.sh/npm/license/zugferd-generator" alt="MIT License" />
   <img src="https://badgen.now.sh/npm/dt/zugferd-generator" alt="Total downloads" />
   <img src="https://badgen.now.sh/npm/types/zugferd-generator" alt="Types included" />
</div>

ZUGFeRD (short for **"Zentraler User Guide des Forums elektronische Rechnung Deutschland"**) is a standard for electronic invoicing in Germany. It combines structured invoice data (in XML format) with a visual representation (typically a PDF), allowing businesses to automate invoice processing while maintaining a human-readable version.

A lightweight Node.js module for creating ZUGFeRD-compliant invoices.

The generated invoices follow ZUGFeRD 2.x / Factur-X in the profile **EN 16931** (COMFORT). When embedding into a PDF, the XML is attached as `factur-x.xml` and the PDF is marked as PDF/A-3B including the required XMP metadata and output intent.

> **Note:** For the resulting PDF to pass a PDF/A-3 validation, the source PDF must otherwise be PDF/A compatible (e.g. all fonts embedded, no encryption).

## Installation

Install the module via npm:

```bash
npm install zugferd-generator
```

## Usage

### Import the Module

```javascript
import ZUGFeRDGenerator from 'zugferd-generator'
```

### Example: Using the Functions

```javascript
const invoiceData = {
    id: 'INV-001',
    issueDate: '2024-01-01',
    dueDate: '2024-01-15',
    deliveryDate: '2023-12-20',
    currency: 'EUR',
    totalAmount: 119,
    supplier: { name: 'Supplier Ltd.', country: 'DE', taxNumber: 'DE123456789' },
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

// Create a new invoice
const zugferd = new ZUGFeRDGenerator(invoiceData);
const invoicePdf = await fs.readFile('invoice.pdf');
const pdfWithEmbeddedEInvoice = await zugferd.embedInPDF(invoicePdf);
```

## API

### `ZUGFeRDGenerator`

```javascript
const zugferd = new ZUGFeRDGenerator(invoiceData);
```

- **`invoiceData` (InvoiceData)**: The invoice to convert (see example above).

The constructor throws an error if required fields are missing or the invoice would violate EN 16931 business rules, e.g.:

- the seller needs a VAT ID (`supplier.taxNumber`) or an identifier (`supplier.id`) and a VAT ID or tax number (`supplier.legalEntityID`)
- the date of delivery or service (`deliveryDate`) is required according to § 14 UStG
- either `dueDate` or `paymentTerms` has to be provided
- an IBAN (`paymentDetails.bankDetails.iban`) is required for credit transfers (payment means code `58`, the default, and `30`)
- `lineTotal` = `quantity` × `unitPrice`, `taxAmount` = sum of line totals × `taxPercentage`, `totalAmount` = sum of line totals + `taxAmount`
- `taxTotal.exemptionReason` is required for tax exempt invoices (e.g. `categoryCode: 'E'` for small businesses according to § 19 UStG) and `taxPercentage` has to be 0 for the categories Z, E, AE, K, G and O
- reverse charge (`AE`) requires the buyer's VAT ID, intra-community supplies (`K`) require the VAT IDs of seller and buyer, and invoices not subject to VAT (`O`) must not contain any VAT IDs

```typescript
interface InvoiceData {
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
```


#### Methods

1. **`toXMLString()`**
    - Returns the XML representation of the invoice as a string.

   ```javascript
   const xmlString = zugferd.toXMLString();
   ```

2. **`toBuffer()`**
    - Returns the XML representation as a `Buffer` object.

   ```javascript
   const buffer = zugferd.toBuffer();
   ```

3. **`toBlob()`**
    - Returns the XML representation as a `Blob` object (useful for browser environments).

   ```javascript
   const blob = zugferd.toBlob();
   console.log(blob.content);
   ```

4. **`embedInPDF(pdfBuffer)`**
    - Embeds the ZUGFeRD XML invoice into a given PDF file (as `factur-x.xml`, PDF/A-3B).
    - **Parameters**:
        - `pdfBuffer` (Buffer): The pdf file that the e-invoice should be attached to
    - Returns a `Promise<Buffer>`.

   ```javascript
   const invoicePdf = await fs.readFile('invoice.pdf');
   const pdfWithEmbeddedEInvoice = await zugferd.embedInPDF(invoicePdf);
   ```

## Contribution

Contributions in the form of bug reports, feature requests, or pull requests are welcome! Please ensure you run the tests and cover new functionality when contributing.

## License

This project is licensed under the [MIT License](LICENSE).

## Hire Me

Looking for a developer with expertise in **Node.js**? Feel free to reach out to me for freelance projects, collaborations, or full-time opportunities!

Contact me [hello@pixelpal.io](mailto:hello@pixelpal.io)

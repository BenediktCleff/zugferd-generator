# ZUGFeRD Generator

<div>
   <img src="https://badgen.now.sh/npm/v/zugferd-generator" alt="Version" />
   <img src="https://badgen.now.sh/npm/license/zugferd-generator" alt="MIT License" />
   <img src="https://badgen.now.sh/npm/types/zugferd-generator" alt="Types included" />
</div>

ZUGFeRD (short for **"Zentraler User Guide des Forums elektronische Rechnung Deutschland"**) is a standard for electronic invoicing in Germany. It combines structured invoice data (in XML format) with a visual representation (typically a PDF), allowing businesses to automate invoice processing while maintaining a human-readable version.

A lightweight Node.js module for creating ZUGFeRD-compliant invoices.

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

```typescript
interface InvoiceData {
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
    - Embeds the ZUGFeRD XML invoice into a given PDF file.
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

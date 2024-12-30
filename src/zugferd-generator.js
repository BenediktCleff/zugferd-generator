/*!
 * zugferd-generator
 * Copyright(c) 2024 Benedikt Cleff (info@pixelpal.io)
 * MIT Licensed
 */

const { PDFDocument } = require('pdf-lib');
const validateInvoice = require('./validation');
const { generateZUGFeRDInvoiceXML } = require('./cii');

class ZUGFeRDGenerator {
    _xmlString = '';

    constructor(invoice) {
        validateInvoice(invoice);
        this._xmlString = generateZUGFeRDInvoiceXML(invoice);
    }

    /**
     * Embeds the ZUGFeRD XML invoice into a given PDF file.
     *
     * @param {Buffer} pdfBuffer - The pdf file that the e-invoice should be attached to.
     * @return {Promise<Buffer>}
     */
    async embedInPDF(pdfBuffer) {
        const pdfDoc = await PDFDocument.load(pdfBuffer);

        // Embed the ZUGFeRD XML as a file attachment
        const xmlAttachmentName = 'ZUGFeRD-invoice.xml';
        const xmlBytes = Buffer.from(this._xmlString, 'utf8');

        await pdfDoc.attach(xmlBytes, xmlAttachmentName, {
            mimeType: 'application/xml',
            description: 'ZUGFeRD XML Invoice for electronic processing',
            creationDate: new Date(),
            modificationDate: new Date()
        });

        const pdfDocWithAttachedXml = await pdfDoc.save();
        return Buffer.from(pdfDocWithAttachedXml.buffer);
    }

    /**
     * Converts the ZUGFeRD invoice into a Blob object with the appropriate MIME type.
     * @return {Blob}
     */
    toBlob() {
        return new Blob([this._xmlString], { type: 'application/xml;charset=utf-8;' });
    }

    /**
     * Convert the ZUGFeRD invoice into a Buffer object using UTF-8 encoding.
     * @return {Buffer}
     */
    toBuffer() {
        return Buffer.from(this._xmlString, 'utf8');
    }

    /**
     * Convert the ZUGFeRD invoice into an XML string
     * @return {string}
     */
    toXMLString() {
        return this._xmlString;
    }
}

module.exports = ZUGFeRDGenerator;

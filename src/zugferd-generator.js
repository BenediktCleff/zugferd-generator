/*!
 * zugferd-generator
 * Copyright(c) 2024 Benedikt Cleff (info@pixelpal.io)
 * MIT Licensed
 */

const validateInvoice = require('./validation');
const { generateZUGFeRDInvoiceXML } = require('./cii');
const { embedFacturX } = require('./pdf');

class ZUGFeRDGenerator {
    _xmlString = '';

    constructor(invoice) {
        validateInvoice(invoice);
        this._xmlString = generateZUGFeRDInvoiceXML(invoice);
    }

    /**
     * Embeds the ZUGFeRD XML invoice into a given PDF file (as factur-x.xml, PDF/A-3B).
     *
     * @param {Buffer} pdfBuffer - The pdf file that the e-invoice should be attached to.
     * @return {Promise<Buffer>}
     */
    async embedInPDF(pdfBuffer) {
        const pdfWithAttachedXml = await embedFacturX(pdfBuffer, this._xmlString);
        return Buffer.from(pdfWithAttachedXml);
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

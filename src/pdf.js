/*!
 * zugferd-generator
 * Copyright(c) 2024 Benedikt Cleff (info@pixelpal.io)
 * MIT Licensed
 */

const crypto = require('crypto');
const { PDFDocument, PDFName, PDFString, PDFHexString, PDFArray, PDFDict } = require('pdf-lib');
const { escapeXML } = require('./cii');
const sRGBProfile = require('./srgb-icc');

// The attachment name is mandatory for ZUGFeRD 2.1+ / Factur-X
const XML_FILE_NAME = 'factur-x.xml';
const CONFORMANCE_LEVEL = 'EN 16931';
const PRODUCER = 'zugferd-generator';

function formatXMPDate(date) {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function generateXMPMetadata({ title, author, subject, keywords, creator, producer, creationDate, modificationDate }) {
    const facturXProperty = (name, description) => `
              <rdf:li rdf:parseType="Resource">
                <pdfaProperty:name>${name}</pdfaProperty:name>
                <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                <pdfaProperty:category>external</pdfaProperty:category>
                <pdfaProperty:description>${description}</pdfaProperty:description>
              </rdf:li>`;

    return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>3</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>${title ? `
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapeXML(title)}</rdf:li></rdf:Alt></dc:title>` : ''}${author ? `
      <dc:creator><rdf:Seq><rdf:li>${escapeXML(author)}</rdf:li></rdf:Seq></dc:creator>` : ''}${subject ? `
      <dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXML(subject)}</rdf:li></rdf:Alt></dc:description>` : ''}
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>${escapeXML(producer)}</pdf:Producer>${keywords ? `
      <pdf:Keywords>${escapeXML(keywords)}</pdf:Keywords>` : ''}
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">${creator ? `
      <xmp:CreatorTool>${escapeXML(creator)}</xmp:CreatorTool>` : ''}
      <xmp:CreateDate>${formatXMPDate(creationDate)}</xmp:CreateDate>
      <xmp:ModifyDate>${formatXMPDate(modificationDate)}</xmp:ModifyDate>
      <xmp:MetadataDate>${formatXMPDate(modificationDate)}</xmp:MetadataDate>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>${XML_FILE_NAME}</fx:DocumentFileName>
      <fx:Version>1.0</fx:Version>
      <fx:ConformanceLevel>${CONFORMANCE_LEVEL}</fx:ConformanceLevel>
    </rdf:Description>
    <rdf:Description rdf:about=""
        xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
        xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
        xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>fx</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>${facturXProperty('DocumentFileName', 'The name of the embedded XML document')}${facturXProperty('DocumentType', 'The type of the hybrid document in capital letters, e.g. INVOICE or ORDER')}${facturXProperty('Version', 'The actual version of the standard applying to the embedded XML document')}${facturXProperty('ConformanceLevel', 'The conformance level of the embedded XML document')}
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

function getOrCreateDict(context, parent, key) {
    let dict = parent.lookupMaybe(PDFName.of(key), PDFDict);
    if (!dict) {
        dict = context.obj({});
        parent.set(PDFName.of(key), dict);
    }
    return dict;
}

function getOrCreateArray(context, parent, key) {
    let array = parent.lookupMaybe(PDFName.of(key), PDFArray);
    if (!array) {
        array = context.obj([]);
        parent.set(PDFName.of(key), array);
    }
    return array;
}

function addToEmbeddedFiles(pdfDoc, fileName, fileSpecRef) {
    const { context, catalog } = pdfDoc;
    const names = getOrCreateDict(context, catalog, 'Names');
    const embeddedFiles = getOrCreateDict(context, names, 'EmbeddedFiles');
    const namesArray = getOrCreateArray(context, embeddedFiles, 'Names');

    // Name trees must be sorted by key
    const entries = [];
    for (let i = 0; i + 1 < namesArray.size(); i += 2) {
        const key = namesArray.lookup(i);
        const keyText = key.decodeText ? key.decodeText() : String(key);
        if (keyText !== fileName) {
            entries.push([keyText, key, namesArray.get(i + 1)]);
        }
    }
    entries.push([fileName, PDFString.of(fileName), fileSpecRef]);
    entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

    embeddedFiles.set(PDFName.of('Names'), context.obj(entries.flatMap(([, key, value]) => [key, value])));
    return entries.map(([, , value]) => value);
}

// PDF/A-3 requires every embedded file to declare an AFRelationship and to be listed in the catalog's AF array
function normalizeAssociatedFiles(pdfDoc, fileSpecRefs) {
    const { context, catalog } = pdfDoc;
    const af = context.obj([]);
    fileSpecRefs.forEach((ref) => {
        const fileSpec = context.lookup(ref, PDFDict);
        if (!fileSpec.get(PDFName.of('AFRelationship'))) {
            fileSpec.set(PDFName.of('AFRelationship'), PDFName.of('Unspecified'));
        }
        af.push(ref);
    });
    catalog.set(PDFName.of('AF'), af);
}

function addOutputIntent(pdfDoc) {
    const { context, catalog } = pdfDoc;
    const outputIntents = getOrCreateArray(context, catalog, 'OutputIntents');

    for (let i = 0; i < outputIntents.size(); i++) {
        const intent = outputIntents.lookup(i, PDFDict);
        if (intent.get(PDFName.of('S')) === PDFName.of('GTS_PDFA1')) return;
    }

    const profileRef = context.register(context.flateStream(sRGBProfile, { N: 3 }));
    const outputIntentRef = context.register(context.obj({
        Type: 'OutputIntent',
        S: 'GTS_PDFA1',
        OutputConditionIdentifier: PDFString.of('sRGB'),
        RegistryName: PDFString.of('http://www.color.org'),
        Info: PDFString.of('sRGB IEC61966-2.1'),
        DestOutputProfile: profileRef,
    }));
    outputIntents.push(outputIntentRef);
}

/**
 * Embeds the XML invoice into the PDF as a ZUGFeRD 2.x / Factur-X (PDF/A-3B) hybrid invoice.
 *
 * Note: The source PDF must otherwise be PDF/A compliant (e.g. all fonts embedded) for the
 * result to pass a PDF/A validation.
 *
 * @param {Buffer|Uint8Array|ArrayBuffer} pdfBuffer
 * @param {string} xmlString
 * @return {Promise<Uint8Array>}
 */
async function embedFacturX(pdfBuffer, xmlString) {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { updateMetadata: false });
    const { context, catalog } = pdfDoc;
    const now = new Date();
    const xmlBytes = Buffer.from(xmlString, 'utf8');

    // Embedded XML file
    const fileStreamRef = context.register(context.flateStream(xmlBytes, {
        Type: 'EmbeddedFile',
        Subtype: 'text/xml',
        Params: {
            Size: xmlBytes.length,
            CreationDate: PDFString.fromDate(now),
            ModDate: PDFString.fromDate(now),
        },
    }));
    const fileSpecRef = context.register(context.obj({
        Type: 'Filespec',
        F: PDFString.of(XML_FILE_NAME),
        UF: PDFHexString.fromText(XML_FILE_NAME),
        Desc: PDFHexString.fromText('Factur-X/ZUGFeRD invoice'),
        AFRelationship: 'Alternative',
        EF: { F: fileStreamRef, UF: fileStreamRef },
    }));

    const fileSpecRefs = addToEmbeddedFiles(pdfDoc, XML_FILE_NAME, fileSpecRef);
    normalizeAssociatedFiles(pdfDoc, fileSpecRefs);
    addOutputIntent(pdfDoc);

    // Document info and XMP metadata have to be in sync for PDF/A
    const creationDate = pdfDoc.getCreationDate() || now;
    pdfDoc.setCreationDate(creationDate);
    pdfDoc.setModificationDate(now);
    pdfDoc.setProducer(PRODUCER);

    const xmp = generateXMPMetadata({
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
        keywords: pdfDoc.getKeywords(),
        creator: pdfDoc.getCreator(),
        producer: PRODUCER,
        creationDate,
        modificationDate: now,
    });
    const metadataRef = context.register(context.stream(Buffer.from(xmp, 'utf8'), {
        Type: 'Metadata',
        Subtype: 'XML',
    }));
    catalog.set(PDFName.of('Metadata'), metadataRef);

    // PDF/A requires a file identifier in the trailer
    if (!context.trailerInfo.ID) {
        const id = PDFHexString.of(crypto.randomBytes(16).toString('hex'));
        context.trailerInfo.ID = context.obj([id, id]);
    }

    return pdfDoc.save({ useObjectStreams: false });
}

module.exports = {
    embedFacturX,
    XML_FILE_NAME,
};

import { XMLParser } from 'fast-xml-parser';

export interface ODataMetadata {
    'edmx:Edmx': {
        'edmx:DataServices': {
            Schema: {
                EntityType?: Array<{
                    Name: string;
                    Property?: Array<{
                        Name: string;
                        Type: string;
                    }>;
                    NavigationProperty?: Array<{
                        Name: string;
                        Type: string;
                        Partner?: string;
                    }>;
                }>;
                EntityContainer?: {
                    EntitySet?: Array<{
                        Name: string;
                        EntityType: string;
                    }>;
                    FunctionImport?: Array<{
                        Name: string;
                        Function: string;
                    }>;
                };
            };
        };
    };
}

export class ODataMetadataParser {
    private parser: XMLParser;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '',
            isArray: (name, jpath) => {
                // Only convert to array if it's a direct child of Schema or EntityContainer
                if (jpath === 'edmx:Edmx.edmx:DataServices.Schema') {
                    return ['EntityType'].includes(name);
                }
                if (jpath === 'edmx:Edmx.edmx:DataServices.Schema.EntityContainer') {
                    return ['EntitySet', 'FunctionImport'].includes(name);
                }
                if (jpath.includes('EntityType')) {
                    return ['Property', 'NavigationProperty'].includes(name);
                }
                return false;
            },
        });
    }

    /**
     * Parse OData metadata XML string
     * @param xmlString The XML string to parse
     * @returns Parsed OData metadata object
     * @throws Error if XML is invalid or doesn't match OData metadata structure
     */
    parseMetadata(xmlString: string): ODataMetadata {
        if (!xmlString || typeof xmlString !== 'string') {
            throw new Error('Invalid input: XML string is required');
        }

        let parsed: any;
        try {
            parsed = this.parser.parse(xmlString);
        } catch (error) {
            throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Validate the basic structure
        if (!parsed['edmx:Edmx']?.['edmx:DataServices']?.Schema) {
            throw new Error('Invalid OData metadata: Missing required elements (edmx:Edmx, edmx:DataServices, or Schema)');
        }

        return parsed as ODataMetadata;
    }

    /**
     * Extract entity types from parsed metadata
     * @param metadata Parsed OData metadata
     * @returns Array of entity types with their properties
     */
    getEntityTypes(metadata: ODataMetadata) {
        const schema = metadata['edmx:Edmx']['edmx:DataServices'].Schema;
        return schema.EntityType || [];
    }

    /**
     * Extract entity sets from parsed metadata
     * @param metadata Parsed OData metadata
     * @returns Array of entity sets
     */
    getEntitySets(metadata: ODataMetadata) {
        const schema = metadata['edmx:Edmx']['edmx:DataServices'].Schema;
        return schema.EntityContainer?.EntitySet || [];
    }
}

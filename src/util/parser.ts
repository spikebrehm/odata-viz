import { XMLParser } from 'fast-xml-parser';

export interface ODataMetadata {
    'edmx:Edmx': {
        'edmx:DataServices': {
            Schema: {
                Namespace?: string;
                EntityType?: Array<{
                    Name: string;
                    Namespace?: string;
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
            } | Array<{
                Namespace?: string;
                EntityType?: Array<{
                    Name: string;
                    Namespace?: string;
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
            }>;
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
                // Convert Schema to array if it's a direct child of edmx:DataServices
                if (jpath === 'edmx:Edmx.edmx:DataServices') {
                    return ['Schema'].includes(name);
                }
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

        // Add namespace to each entity type
        const dataServices = parsed['edmx:Edmx']['edmx:DataServices'];
        const schemas = Array.isArray(dataServices.Schema) ? dataServices.Schema : [dataServices.Schema];

        schemas.forEach((schema: any) => {
            if (schema.Namespace && schema.EntityType) {
                // Ensure EntityType is an array
                const entityTypes = Array.isArray(schema.EntityType) ? schema.EntityType : [schema.EntityType];
                entityTypes.forEach((entityType: any) => {
                    entityType.Namespace = schema.Namespace;
                });
            }
        });

        return parsed as ODataMetadata;
    }

    /**
     * Extract entity types from parsed metadata
     * @param metadata Parsed OData metadata
     * @returns Array of entity types with their properties
     */
    getEntityTypes(metadata: ODataMetadata) {
        const dataServices = metadata['edmx:Edmx']['edmx:DataServices'];
        const schemas = Array.isArray(dataServices.Schema) ? dataServices.Schema : [dataServices.Schema];

        // Flatten all entity types from all schemas
        return schemas.reduce((entityTypes: any[], schema: any) => {
            if (schema.EntityType) {
                // Ensure EntityType is an array
                const schemaEntityTypes = Array.isArray(schema.EntityType) ? schema.EntityType : [schema.EntityType];
                return [...entityTypes, ...schemaEntityTypes];
            }
            return entityTypes;
        }, []);
    }

    /**
     * Extract entity sets from parsed metadata
     * @param metadata Parsed OData metadata
     * @returns Array of entity sets
     */
    getEntitySets(metadata: ODataMetadata) {
        const dataServices = metadata['edmx:Edmx']['edmx:DataServices'];
        const schemas = Array.isArray(dataServices.Schema) ? dataServices.Schema : [dataServices.Schema];

        // Find the schema with EntityContainer
        const containerSchema = schemas.find((schema: any) => schema.EntityContainer);
        if (!containerSchema || !containerSchema.EntityContainer) {
            return [];
        }

        return containerSchema.EntityContainer.EntitySet || [];
    }
}

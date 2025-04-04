import { XMLParser } from 'fast-xml-parser';

export interface ODataEntityType {
  Name: string;
  Namespace?: string;
  Property?: Array<{
    Name: string;
    Type: string;
    Nullable?: boolean;
  }>;
  NavigationProperty?: Array<{
    Name: string;
    Type: string;
    Partner?: string;
  }>;
}

export interface ODataSchema {
  Namespace?: string;
  Alias?: string;
  EntityType?: Array<ODataEntityType>;
  EntityContainer?: {
    EntitySet?: Array<{
      Name: string;
      EntityType: string;
      NavigationPropertyBinding?: Array<{
        Path: string;
        Target: string;
      }>;
    }>;
    FunctionImport?: Array<{
      Name: string;
      Function: string;
    }>;
  };
}

export interface ODataMetadata {
  'edmx:Edmx': {
    'edmx:DataServices': {
      Schema: ODataSchema | Array<ODataSchema>
    };
  };
}

export class ODataMetadataParser {
  private parser: XMLParser;
  metadata: ODataMetadata;
  private namespaceAliases: Map<string, string> = new Map();

  constructor(xmlString: string) {
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
    this.metadata = this.parseMetadata(xmlString);
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

    // Add namespace to each entity type and build namespace aliases map
    const dataServices = parsed['edmx:Edmx']['edmx:DataServices'];
    const schemas = Array.isArray(dataServices.Schema) ? dataServices.Schema : [dataServices.Schema];

    schemas.forEach((schema: any) => {
      if (schema.Namespace) {
        // Store namespace alias if present
        if (schema.Alias) {
          this.namespaceAliases.set(schema.Alias, schema.Namespace);
        }

        if (schema.EntityType) {
          // Ensure EntityType is an array
          const entityTypes = Array.isArray(schema.EntityType) ? schema.EntityType : [schema.EntityType];
          entityTypes.forEach((entityType: any) => {
            entityType.Namespace = schema.Namespace;
          });
        }
      }
    });

    return parsed as ODataMetadata;
  }

  /**
   * Extract entity types from parsed metadata
   * @returns Array of entity types with their properties
   */
  getEntityTypes() {
    const dataServices = this.metadata['edmx:Edmx']['edmx:DataServices'];
    const schemas = Array.isArray(dataServices.Schema) ? dataServices.Schema : [dataServices.Schema];

    // Flatten all entity types from all schemas
    return schemas.reduce((entityTypes: ODataEntityType[], schema) => {
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
   * @returns Array of entity sets
   */
  getEntitySets() {
    const dataServices = this.metadata['edmx:Edmx']['edmx:DataServices'];
    const schemas = Array.isArray(dataServices.Schema) ? dataServices.Schema : [dataServices.Schema];

    // Find the schema with EntityContainer
    const containerSchema = schemas.find((schema: any) => schema.EntityContainer);
    if (!containerSchema || !containerSchema.EntityContainer) {
      return [];
    }

    return containerSchema.EntityContainer.EntitySet || [];
  }

  /**
   * Expand a type reference that might use an alias
   * @param typeReference The type reference that might use an alias
   * @returns The expanded type reference with the full namespace
   */
  expandTypeReference(typeReference: string): string {
    // Handle collection types
    if (typeReference.startsWith('Collection(') && typeReference.endsWith(')')) {
      const innerType = typeReference.substring(11, typeReference.length - 1);
      return `Collection(${this.expandTypeReference(innerType)})`;
    }

    // Check if it's using an alias
    const parts = typeReference.split('.');
    if (parts.length === 2) {
      const alias = parts[0];
      const typeName = parts[1];

      // If the alias is in our map, replace it with the full namespace
      if (this.namespaceAliases.has(alias)) {
        return `${this.namespaceAliases.get(alias)}.${typeName}`;
      }
    }

    return typeReference;
  }
}

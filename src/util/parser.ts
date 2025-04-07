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

export interface ODataEntitySet {
  Name: string;
  EntityType: string;
  NavigationPropertyBinding?: Array<{
    Path: string;
    Target: string;
  }>;
}

export interface ODataSchema {
  Namespace?: string;
  Alias?: string;
  EntityType?: Array<ODataEntityType>;
  EntityContainer?: {
    EntitySet?: Array<ODataEntitySet>;
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
  private namespaceAliases: Map<string, string> = new Map();
  private _entityTypes: ODataEntityType[] = [];
  private _entitySets: ODataEntitySet[] = [];
  private _entityTypeMap: Map<string, ODataEntityType> = new Map();
  metadata!: ODataMetadata;

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
    this.parseMetadata(xmlString);
  }

  /**
   * Parse OData metadata XML string
   * @param xmlString The XML string to parse
   * @returns Parsed OData metadata object
   * @throws Error if XML is invalid or doesn't match OData metadata structure
   */
  parseMetadata(xmlString: string) {
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

    this.metadata = parsed as ODataMetadata;
    this._entityTypes = this.getEntityTypes();
    this._entitySets = this.getEntitySets();
    this._entityTypeMap = new Map(this._entityTypes.map(entityType => [
      this.expandTypeReference(getFullEntityTypeName(entityType)), entityType]));
  }

  get entityTypes() {
    return this._entityTypes;
  }

  get entitySets() {
    return this._entitySets;
  }

  /**
   * Extract entity types from parsed metadata
   * @returns Array of entity types with their properties
   */
  private getEntityTypes() {
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
  private getEntitySets() {
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
    if (isCollection(typeReference)) {
      const innerType = stripCollection(typeReference);
      return `Collection(${this.expandTypeReference(innerType)})`;
    }

    // Check if it's using an alias
    const parts = typeReference.split('.');
    if (parts.length === 2) {
      const [alias, typeName] = parts;

      // If the alias is in our map, replace it with the full namespace
      if (this.namespaceAliases.has(alias)) {
        return `${this.namespaceAliases.get(alias)}.${typeName}`;
      }
    }

    return typeReference;
  }

  getEntityType(entityTypeName: string) {
    const lookup = stripCollection(this.expandTypeReference(entityTypeName));
    return this._entityTypeMap.get(lookup);
  }

  entityTypeExists(entityTypeName: string) {
    const lookup = stripCollection(this.expandTypeReference(entityTypeName));
    return this._entityTypeMap.has(lookup);
  }
}

/**
 * Utility functions
 */
export function getFullEntityTypeName(entityType: ODataEntityType) {
  if (!entityType.Namespace) return entityType.Name;
  return `${entityType.Namespace}.${entityType.Name}`;
}

export function getBaseName(entityTypeName: string) {
  return entityTypeName.split('.').pop() || entityTypeName;
}

export function isCollection(entityTypeName: string) {
  return entityTypeName.startsWith('Collection(') && entityTypeName.endsWith(')');
}

export function stripCollection(entityTypeName: string) {
  return isCollection(entityTypeName) ? entityTypeName.slice(11, -1) : entityTypeName;
}
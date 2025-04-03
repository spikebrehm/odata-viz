import { describe, expect, test, beforeEach } from '@jest/globals';
import { ODataMetadataParser, } from './parser';

// Sample OData metadata XML string
const sampleXml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="ODataDemo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Product">
        <Property Name="ID" Type="Edm.Int32" Nullable="false" />
        <Property Name="Name" Type="Edm.String" />
        <Property Name="Description" Type="Edm.String" />
        <Property Name="ReleaseDate" Type="Edm.DateTimeOffset" />
        <Property Name="DiscontinuedDate" Type="Edm.DateTimeOffset" />
        <Property Name="Rating" Type="Edm.Int16" />
        <Property Name="Price" Type="Edm.Decimal" />
        <NavigationProperty Name="Category" Type="ODataDemo.Category" Partner="Products" />
        <NavigationProperty Name="Supplier" Type="ODataDemo.Supplier" Partner="Products" />
      </EntityType>
      <EntityType Name="Category">
        <Property Name="ID" Type="Edm.Int32" Nullable="false" />
        <Property Name="Name" Type="Edm.String" />
        <NavigationProperty Name="Products" Type="Collection(ODataDemo.Product)" Partner="Category" />
      </EntityType>
      <EntityContainer Name="DemoService">
        <EntitySet Name="Products" EntityType="ODataDemo.Product" />
        <EntitySet Name="Categories" EntityType="ODataDemo.Category" />
        <FunctionImport Name="GetProductsByRating" Function="ODataDemo.GetProductsByRating" />
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

// Sample OData metadata XML with multiple schemas
const multiSchemaXml = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="Microsoft.OData.SampleService.Models.TripPin" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Photo">
        <Property Name="Id" Type="Edm.Int32" Nullable="false" />
        <Property Name="Name" Type="Edm.String" />
      </EntityType>
    </Schema>
    <Schema Namespace="ODataDemo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Product">
        <Property Name="ID" Type="Edm.Int32" Nullable="false" />
        <Property Name="Name" Type="Edm.String" />
      </EntityType>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

describe('ODataMetadataParser', () => {
    describe('simpleXml', () => {
        let parser: ODataMetadataParser;

        beforeEach(() => {
            parser = new ODataMetadataParser(sampleXml);
        });

        test('should parse OData metadata XML', () => {
            expect(parser.metadata).toBeDefined();
            expect(parser.metadata['edmx:Edmx']).toBeDefined();
            expect(parser.metadata['edmx:Edmx']['edmx:DataServices']).toBeDefined();
        });

        test('should extract entity types', () => {
            const entityTypes = parser.getEntityTypes();

            expect(entityTypes).toHaveLength(2);
            expect(entityTypes[0].Name).toBe('Product');
            expect(entityTypes[1].Name).toBe('Category');

            // Check Product entity type properties
            const productType = entityTypes[0];
            expect(productType.Property).toHaveLength(7);
            expect(productType.Property?.[0].Name).toBe('ID');
            expect(productType.Property?.[0].Type).toBe('Edm.Int32');

            // Check navigation properties
            expect(productType.NavigationProperty).toHaveLength(2);
            expect(productType.NavigationProperty?.[0].Name).toBe('Category');
            expect(productType.NavigationProperty?.[0].Type).toBe('ODataDemo.Category');
        });

        test('should extract entity sets', () => {
            const entitySets = parser.getEntitySets();

            expect(entitySets).toHaveLength(2);
            expect(entitySets[0].Name).toBe('Products');
            expect(entitySets[0].EntityType).toBe('ODataDemo.Product');
            expect(entitySets[1].Name).toBe('Categories');
            expect(entitySets[1].EntityType).toBe('ODataDemo.Category');
        });

        test('should capture namespace for entity types', () => {
            const entityTypes = parser.getEntityTypes()

            // Check that each entity type has the correct namespace
            entityTypes.forEach(entityType => {
                expect(entityType.Namespace).toBe('ODataDemo');
            });
        });
    });

    describe('multiSchemaXml', () => {
        let parser: ODataMetadataParser;

        beforeEach(() => {
            parser = new ODataMetadataParser(multiSchemaXml);
        });

        test('should handle multiple schemas with different namespaces', () => {
            const entityTypes = parser.getEntityTypes();

            // Check that entity types have the correct namespaces
            const photoType = entityTypes.find(et => et.Name === 'Photo');
            const productType = entityTypes.find(et => et.Name === 'Product');

            expect(photoType).toBeDefined();
            expect(photoType?.Namespace).toBe('Microsoft.OData.SampleService.Models.TripPin');

            expect(productType).toBeDefined();
            expect(productType?.Namespace).toBe('ODataDemo');
        });
    });

    test('should handle invalid XML', () => {
        const invalidXml = '<invalid>xml';
        expect(() => new ODataMetadataParser(invalidXml)).toThrow('Invalid OData metadata: Missing required elements (edmx:Edmx, edmx:DataServices, or Schema)');
    });

    test('should handle empty input', () => {
        expect(() => new ODataMetadataParser('')).toThrow('Invalid input: XML string is required');
        expect(() => new ODataMetadataParser(null as any)).toThrow('Invalid input: XML string is required');
        expect(() => new ODataMetadataParser(undefined as any)).toThrow('Invalid input: XML string is required');
    });

    test('should handle XML without required OData elements', () => {
        const invalidODataXml = '<?xml version="1.0"?><root><child>test</child></root>';
        expect(() => new ODataMetadataParser(invalidODataXml)).toThrow('Invalid OData metadata: Missing required elements');
    });
}); 
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ODataMetadataParser, ODataMetadata } from '../util/parser';

const ODataMetadataViewer: React.FC = () => {
  const [parser, setParser] = useState<ODataMetadataParser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>('');
  const entityTypeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle hash changes for direct linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#') && parser) {
        const entityTypeId = hash.substring(1);
        setActiveEntityType(entityTypeId);
      }
    };

    // Check hash on initial load
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [parser]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const xmlContent = e.target?.result as string;
        try {
          setParser(new ODataMetadataParser(xmlContent));
          // Reset active entity type and filter when new file is loaded
          setActiveEntityType(null);
          setFilterText('');
          // Clear hash when new file is loaded
          window.location.hash = '';
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Unknown error occurred');
          setParser(null);
        }
      };
      reader.onerror = () => {
        setError('Error reading file');
        setParser(null);
      };
      reader.readAsText(file);
    }
  };

  const setEntityTypeRef = (entityTypeName: string, element: HTMLDivElement | null) => {
    entityTypeRefs.current[entityTypeName] = element;
  };

  // Filter entity types based on the filter text
  const filteredEntityTypes = useMemo(() => {
    if (!parser) return [];

    const allEntityTypes = parser.getEntityTypes();
    if (!filterText.trim()) return allEntityTypes;

    const searchTerm = filterText.toLowerCase();
    return allEntityTypes.filter(entityType =>
      entityType.Name.toLowerCase().includes(searchTerm)
    );
  }, [parser, filterText]);

  // Check if a type exists in our schema
  const isTypeInSchema = (typeName: string): boolean => {
    if (!parser) return false;

    // Handle collection types
    if (typeName.startsWith('Collection(') && typeName.endsWith(')')) {
      typeName = typeName.substring(11, typeName.length - 1);
    }

    // Check if it's a fully qualified name (namespace.type)
    if (typeName.includes('.')) {
      const lastDot = typeName.lastIndexOf('.');
      const namespace = typeName.substring(0, lastDot);
      const name = typeName.substring(lastDot + 1);
      const entityTypes = parser.getEntityTypes();
      return entityTypes.some(et => et.Name === name && et.Namespace === namespace);
    }

    // Check if it's just a type name (in the same namespace)
    const entityTypes = parser.getEntityTypes();
    return entityTypes.some(et => et.Name === typeName);
  };

  // Get the full entity type ID (namespace + name) for anchor links
  const getEntityTypeId = (typeName: string): string => {
    if (!parser) return typeName;

    // Handle collection types
    if (typeName.startsWith('Collection(') && typeName.endsWith(')')) {
      typeName = typeName.substring(11, typeName.length - 1);
    }

    // If it's already a fully qualified name, return it
    if (typeName.includes('.')) {
      return typeName;
    }

    // Find the entity type to get its namespace
    const entityTypes = parser.getEntityTypes();
    const entityType = entityTypes.find(et => et.Name === typeName);
    if (entityType && entityType.Namespace) {
      return `${entityType.Namespace}.${entityType.Name}`;
    }

    return typeName;
  };

  const renderEntityType = (entityType: any) => {
    const entityTypeId = entityType.Namespace ? `${entityType.Namespace}.${entityType.Name}` : entityType.Name;

    return (
      <div
        key={entityType.Name}
        ref={(el) => setEntityTypeRef(entityType.Name, el)}
        id={entityTypeId}
        className="bg-gray-100 rounded-md p-4 mb-5 scroll-mt-20"
      >
        <h3 className="text-blue-600 text-xl font-semibold mt-0">{entityType.Name}</h3>
        {entityType.Namespace && (
          <div className="text-sm text-gray-500 mb-2">
            Namespace: <span className="font-mono text-[0.9em]">{entityType.Namespace}</span>
          </div>
        )}
        {entityType.Property && (
          <div className="mt-4">
            <h4 className="text-gray-600 font-medium mb-2">Properties</h4>
            <ul className="list-none pl-0">
              {entityType.Property.map((prop: any) => (
                <li key={prop.Name} className="py-1 border-b border-gray-200">
                  {prop.Name}: <span className="font-mono text-[0.9em]">{prop.Type}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {entityType.NavigationProperty && (
          <div className="mt-4">
            <h4 className="text-gray-600 font-medium mb-2">Navigation Properties</h4>
            <ul className="list-none pl-0">
              {entityType.NavigationProperty.map((nav: any) => (
                <li key={nav.Name} className="py-1 border-b border-gray-200">
                  {nav.Name}: {isTypeInSchema(nav.Type) ? (
                    <a
                      href={`#${getEntityTypeId(nav.Type)}`}
                      className="font-mono text-[0.9em] text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {nav.Type}
                    </a>
                  ) : (
                    <span className="font-mono text-[0.9em]">{nav.Type}</span>
                  )}
                  {nav.Partner && <span className="font-mono text-[0.9em]"> (Partner: {nav.Partner})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderEntitySet = (entitySet: any) => (
    <li key={entitySet.Name} className="py-2 border-b border-gray-200">
      {entitySet.Name} ({isTypeInSchema(entitySet.EntityType) ? (
        <a
          href={`#${getEntityTypeId(entitySet.EntityType)}`}
          className="font-mono text-[0.9em] text-blue-600 hover:text-blue-800 hover:underline"
        >
          {entitySet.EntityType}
        </a>
      ) : (
        <span className="font-mono text-[0.9em]">{entitySet.EntityType}</span>
      )})
    </li>
  );

  return (
    <div className="flex">
      {/* Sidebar */}
      {parser && (
        <div className="w-64 sticky top-0 h-screen bg-white shadow-md flex flex-col">
          {/* Fixed header and filter section */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Entity Types</h3>

            {/* Filter input */}
            <div className="mb-2">
              <input
                type="text"
                placeholder="Filter entity types..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Scrollable entity types list */}
          <div className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {filteredEntityTypes.map((entityType: any) => {
                const entityTypeId = entityType.Namespace ? `${entityType.Namespace}.${entityType.Name}` : entityType.Name;
                return (
                  <li key={entityType.Name}>
                    <a
                      href={`#${entityTypeId}`}
                      className={`w-full text-left px-2 py-1 rounded hover:bg-blue-50 block ${activeEntityType === entityTypeId ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                        }`}
                    >
                      {entityType.Name}
                    </a>
                  </li>
                );
              })}
              {filteredEntityTypes.length === 0 && (
                <li className="text-gray-500 italic py-2">No entity types match your filter</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 p-5">
        <h2 className="text-2xl font-bold mb-4">OData Metadata Viewer</h2>
        <div className="my-5 p-5 border-2 border-dashed border-gray-300 rounded-md text-center">
          <input
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            className="p-2 border border-gray-300 rounded-md w-full max-w-md"
          />
        </div>

        {error && (
          <div className="text-red-600 bg-red-50 p-3 rounded-md my-3">
            {error}
          </div>
        )}

        {parser && (
          <div className="mt-5">
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3">Entity Types</h3>
              {parser.getEntityTypes().map(renderEntityType)}
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-3">Entity Sets</h3>
              <ul className="list-none pl-0">
                {parser.getEntitySets().map(renderEntitySet)}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ODataMetadataViewer; 
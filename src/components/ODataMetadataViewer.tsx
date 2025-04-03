import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ODataMetadataParser } from '../util/parser';
import EntityRelationshipDiagram from './EntityRelationshipDiagram';

const ODataMetadataViewer: React.FC = () => {
  const [parser, setParser] = useState<ODataMetadataParser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDiagram, setShowDiagram] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const xmlContent = e.target?.result as string;
        try {
          setParser(new ODataMetadataParser(xmlContent));
          // Reset state when new file is loaded
          setSelectedEntityType(null);
          setSearchTerm('');
          setEntityTypeFilter('');
          setFilterError(null);
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

  // Memoize the entity types to avoid recalculating on every render
  const entityTypes = useMemo(() => {
    if (!parser) return [];
    return parser.getEntityTypes()
  }, [parser]);

  // Memoize the entity sets to avoid recalculating on every render
  const entitySets = useMemo(() => {
    if (!parser) return [];
    return parser.getEntitySets()
  }, [parser]);

  // Filter entity types based on the regex filter
  const filteredEntityTypes = useMemo(() => {
    if (!entityTypeFilter) return entityTypes;

    try {
      const regex = new RegExp(entityTypeFilter);
      return entityTypes.filter(entityType =>
        regex.test(entityType.Name) ||
        (entityType.Namespace && regex.test(entityType.Namespace))
      );
    } catch (error) {
      return entityTypes;
    }
  }, [entityTypes, entityTypeFilter]);

  // Filter entity sets based on the filtered entity types
  const filteredEntitySets = useMemo(() => {
    if (!entityTypeFilter) return entitySets;

    try {
      const regex = new RegExp(entityTypeFilter);
      return entitySets.filter(entitySet =>
        regex.test(entitySet.Name) ||
        (entitySet.EntityType && regex.test(entitySet.EntityType))
      );
    } catch (error) {
      return entitySets;
    }
  }, [entitySets, entityTypeFilter]);

  // Validate the regex filter
  const validateFilter = (filter: string) => {
    if (!filter) {
      setFilterError(null);
      return true;
    }

    try {
      new RegExp(filter);
      setFilterError(null);
      return true;
    } catch (error) {
      setFilterError('Invalid regex pattern');
      return false;
    }
  };

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFilter = e.target.value;
    setEntityTypeFilter(newFilter);
    validateFilter(newFilter);
  };

  // Filter entity types based on search term
  const filteredEntityTypesWithSearch = useMemo(() => {
    return filteredEntityTypes.filter(entityType =>
      entityType.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entityType.Namespace && entityType.Namespace.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [filteredEntityTypes, searchTerm]);

  // Filter entity sets based on search term
  const filteredEntitySetsWithSearch = useMemo(() => {
    return filteredEntitySets.filter(entitySet =>
      entitySet.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entitySet.EntityType && entitySet.EntityType.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [filteredEntitySets, searchTerm]);

  // Handle entity type selection
  const handleEntityTypeClick = (entityTypeName: string) => {
    setSelectedEntityType(entityTypeName);
  };

  // Handle entity set selection
  const handleEntitySetClick = (entitySetName: string) => {
    setSelectedEntityType(entitySetName);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle diagram toggle
  const handleToggleDiagram = () => {
    setShowDiagram(!showDiagram);
  };

  // Handle settings toggle
  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Get the selected entity type details
  const selectedEntityTypeDetails = useMemo(() => {
    if (!selectedEntityType) return null;
    return filteredEntityTypes.find(entityType => entityType.Name === selectedEntityType);
  }, [filteredEntityTypes, selectedEntityType]);

  // Get the selected entity set details
  const selectedEntitySetDetails = useMemo(() => {
    if (!selectedEntityType) return null;
    return filteredEntitySets.find(entitySet => entitySet.Name === selectedEntityType);
  }, [filteredEntitySets, selectedEntityType]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* File upload section */}
      {!parser && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-center">OData Metadata Viewer</h2>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Upload OData Metadata XML
              </label>
              <input
                type="file"
                accept=".xml"
                onChange={handleFileUpload}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm mt-2">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main viewer (only shown when parser is loaded) */}
      {parser && (
        <>
          {/* Sidebar */}
          <div ref={sidebarRef} className="w-64 bg-gray-100 p-4 overflow-y-auto border-r border-gray-200">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Entity Types</h2>

                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={handleToggleDiagram}
                  title="View Entity Relationship Diagram"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {/* Entity 1 */}
                    <rect x="2" y="4" width="8" height="6" rx="1" />
                    <line x1="6" y1="7" x2="6" y2="7" strokeWidth="2" />

                    {/* Entity 2 */}
                    <rect x="14" y="4" width="8" height="6" rx="1" />
                    <line x1="18" y1="7" x2="18" y2="7" strokeWidth="2" />

                    {/* Entity 3 */}
                    <rect x="8" y="14" width="8" height="6" rx="1" />
                    <line x1="12" y1="17" x2="12" y2="17" strokeWidth="2" />

                    {/* Relationship lines */}
                    <line x1="10" y1="7" x2="14" y2="7" />
                    <line x1="6" y1="10" x2="12" y2="14" />
                    <line x1="18" y1="10" x2="12" y2="14" />

                    {/* Relationship diamonds */}
                    <path d="M10 7 L12 6 L14 7 L12 8 Z" />
                    <path d="M6 10 L8 9 L12 14 L10 15 Z" />
                    <path d="M18 10 L16 9 L12 14 L14 15 Z" />
                  </svg>
                </button>

                <button
                  onClick={handleToggleSettings}
                  className="text-gray-500 hover:text-gray-700"
                  title="Settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="w-full p-2 border border-gray-300 rounded mb-2"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {showSettings && (
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Filter entity types (regex)"
                    className={`w-full p-2 border ${filterError ? 'border-red-500' : 'border-gray-300'} rounded`}
                    value={entityTypeFilter}
                    onChange={handleFilterChange}
                  />
                  {filterError && (
                    <div className="text-red-500 text-xs mt-1">{filterError}</div>
                  )}
                </div>
              )}
              <ul className="space-y-1">
                {filteredEntityTypesWithSearch.map(entityType => (
                  <li key={entityType.Name}>
                    <button
                      className={`w-full text-left p-2 rounded ${selectedEntityType === entityType.Name
                        ? 'bg-blue-100 text-blue-800'
                        : 'hover:bg-gray-200'
                        }`}
                      onClick={() => handleEntityTypeClick(entityType.Name)}
                    >
                      {entityType.Name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Entity Sets</h2>
              <ul className="space-y-1">
                {filteredEntitySetsWithSearch.map(entitySet => (
                  <li key={entitySet.Name}>
                    <button
                      className={`w-full text-left p-2 rounded ${selectedEntityType === entitySet.Name
                        ? 'bg-blue-100 text-blue-800'
                        : 'hover:bg-gray-200'
                        }`}
                      onClick={() => handleEntitySetClick(entitySet.Name)}
                    >
                      {entitySet.Name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Main content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-4">
            {selectedEntityTypeDetails ? (
              <div data-entity-type={selectedEntityTypeDetails.Name}>
                <h2 className="text-2xl font-bold mb-4">{selectedEntityTypeDetails.Name}</h2>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Namespace</h3>
                  <p>{selectedEntityTypeDetails.Namespace || 'No namespace'}</p>
                </div>
                {selectedEntityTypeDetails.Property && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Properties</h3>
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead>
                        <tr>
                          <th className="py-2 px-4 border-b text-left">Name</th>
                          <th className="py-2 px-4 border-b text-left">Type</th>
                          <th className="py-2 px-4 border-b text-left">Nullable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEntityTypeDetails.Property.map((property) => (
                          <tr key={property.Name}>
                            <td className="py-2 px-4 border-b">{property.Name}</td>
                            <td className="py-2 px-4 border-b">{property.Type}</td>
                            <td className="py-2 px-4 border-b">{property.Nullable ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {selectedEntityTypeDetails.NavigationProperty && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Navigation Properties</h3>
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead>
                        <tr>
                          <th className="py-2 px-4 border-b text-left">Name</th>
                          <th className="py-2 px-4 border-b text-left">Type</th>
                          <th className="py-2 px-4 border-b text-left">Partner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEntityTypeDetails.NavigationProperty.map((navProp) => (
                          <tr key={navProp.Name}>
                            <td className="py-2 px-4 border-b">{navProp.Name}</td>
                            <td className="py-2 px-4 border-b">{navProp.Type}</td>
                            <td className="py-2 px-4 border-b">{navProp.Partner || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : selectedEntitySetDetails ? (
              <div data-entity-type={selectedEntitySetDetails.Name}>
                <h2 className="text-2xl font-bold mb-4">{selectedEntitySetDetails.Name}</h2>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Entity Type</h3>
                  <p>{selectedEntitySetDetails.EntityType}</p>
                </div>
                {selectedEntitySetDetails.NavigationPropertyBinding && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Navigation Property Bindings</h3>
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead>
                        <tr>
                          <th className="py-2 px-4 border-b text-left">Path</th>
                          <th className="py-2 px-4 border-b text-left">Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEntitySetDetails.NavigationPropertyBinding.map((binding) => (
                          <tr key={binding.Path}>
                            <td className="py-2 px-4 border-b">{binding.Path}</td>
                            <td className="py-2 px-4 border-b">{binding.Target}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-10">
                <p>Select an entity type or entity set to view its details</p>
              </div>
            )}
          </div>

          {/* Entity Relationship Diagram Modal */}
          {showDiagram && (
            <EntityRelationshipDiagram
              parser={parser}
              onClose={handleToggleDiagram}
              entityTypeFilter={entityTypeFilter}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ODataMetadataViewer; 
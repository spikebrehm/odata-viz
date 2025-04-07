import React, { useState, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFullEntityTypeName, isCollection, ODataEntityType, ODataMetadataParser, stripCollection } from '../util/parser';
import EntityRelationshipDiagram from './EntityRelationshipDiagram';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const ODataMetadataViewer: React.FC<{ parser: ODataMetadataParser }> = ({ parser }) => {
  const navigate = useNavigate();
  const { selectedEntityType } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [showDiagram, setShowDiagram] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [filterError, setFilterError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Filter entity types based on the regex filter
  const filteredEntityTypes = useMemo(() => {
    if (!entityTypeFilter) return parser.entityTypes;

    try {
      const regex = new RegExp(entityTypeFilter, 'i');
      return parser.entityTypes.filter(entityType =>
        regex.test(entityType.Name) ||
        (entityType.Namespace && regex.test(entityType.Namespace))
      );
    } catch (error) {
      return parser.entityTypes;
    }
  }, [parser, entityTypeFilter]);

  // Filter entity sets based on the filtered entity types
  const filteredEntitySets = useMemo(() => {
    if (!entityTypeFilter) return parser.entitySets;

    try {
      const regex = new RegExp(entityTypeFilter, 'i');
      return parser.entitySets.filter(entitySet =>
        regex.test(entitySet.Name) ||
        (entitySet.EntityType && regex.test(entitySet.EntityType))
      );
    } catch (error) {
      return parser.entitySets;
    }
  }, [parser, entityTypeFilter]);

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
  const handleEntityTypeClick = (entityType: ODataEntityType | string) => {
    const fullEntityTypeName = typeof entityType === 'string' ? entityType : getFullEntityTypeName(entityType);
    const expandedType = parser.expandTypeReference(fullEntityTypeName);
    navigate(`/entity/${expandedType}`);
  };

  // Handle entity set selection
  const handleEntitySetClick = (entitySetName: string) => {
    navigate(`/entity/${entitySetName}`);
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
    return filteredEntityTypes.find(entityType => parser.expandTypeReference(getFullEntityTypeName(entityType)) === selectedEntityType);
  }, [filteredEntityTypes, selectedEntityType]);

  // Get the selected entity set details
  const selectedEntitySetDetails = useMemo(() => {
    if (!selectedEntityType) return null;
    return filteredEntitySets.find(entitySet => entitySet.Name === selectedEntityType);
  }, [filteredEntitySets, selectedEntityType]);

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Sidebar */}
      <div ref={sidebarRef} className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col h-screen">
        {/* Fixed header section */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2 gap-1">
            <h2 className="text-lg font-semibold mr-auto">Entity types</h2>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="text-gray-500 hover:text-gray-700"
                    onClick={handleToggleDiagram}
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
                </TooltipTrigger>
                <TooltipContent>
                  <p>View Entity Relationship Diagram</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleToggleSettings}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="w-full p-2 border border-gray-300 rounded mb-1"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          {showSettings && (
            <div className="mb-1">
              <label htmlFor="entityTypeFilter" className="text-sm font-medium mb-1">
                Filter entity types (regex)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="ml-1 text-gray-500 hover:text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Filter out certain entity types completely. Can e.g.
                        improve performance of Entity Relation Diagram for very
                        large schemas.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

              </label>
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
        </div>

        {/* Scrollable content section */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-4">
            <ul className="space-y-1">
              {filteredEntityTypesWithSearch.map(entityType => (
                <li key={entityType.Name}>
                  <button
                    className={`w-full text-left p-2 rounded ${selectedEntityType === parser.expandTypeReference(getFullEntityTypeName(entityType))
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-200'
                      }`}
                    onClick={() => handleEntityTypeClick(entityType)}
                  >
                    {entityType.Name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Entity sets</h2>
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
      </div>

      {/* Main content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto p-4">
        {selectedEntityType ? (
          <div data-entity-type={selectedEntityType}>
            <h2 className="text-2xl font-bold mb-4">{selectedEntityTypeDetails?.Name}</h2>
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Namespace</h3>
              <p>{selectedEntityTypeDetails?.Namespace || 'No namespace'}</p>
            </div>
            {selectedEntityTypeDetails?.Property && (
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
            {selectedEntityTypeDetails?.NavigationProperty && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Navigation properties</h3>
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
                        <td className="py-2 px-4 border-b">{
                          parser.entityTypeExists(navProp.Type) ?
                            <>
                              {isCollection(navProp.Type) && 'Collection('}
                              <button
                                className="text-blue-800 hover:underline"
                                onClick={() => handleEntityTypeClick(stripCollection(navProp.Type))}
                              >
                                {stripCollection(navProp.Type)}
                              </button>
                              {isCollection(navProp.Type) && ')'}
                            </>
                            : navProp.Type
                        }</td>
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
              <h3 className="text-lg font-semibold mb-2">Entity type</h3>
              <p>{selectedEntitySetDetails.EntityType}</p>
            </div>
            {selectedEntitySetDetails.NavigationPropertyBinding && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Navigation property bindings</h3>
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
    </div>
  );
};

export default ODataMetadataViewer; 
import React, { useState, useRef, useMemo } from 'react';
import { ODataMetadataParser, ODataMetadata } from '../util/parser';

const ODataMetadataViewer: React.FC = () => {
    const [metadata, setMetadata] = useState<ODataMetadata | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeEntityType, setActiveEntityType] = useState<string | null>(null);
    const [filterText, setFilterText] = useState<string>('');
    const entityTypeRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const parser = new ODataMetadataParser();

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setError(null);
            const reader = new FileReader();
            reader.onload = (e) => {
                const xmlContent = e.target?.result as string;
                try {
                    const parsedMetadata = parser.parseMetadata(xmlContent);
                    setMetadata(parsedMetadata);
                    // Reset active entity type and filter when new file is loaded
                    setActiveEntityType(null);
                    setFilterText('');
                } catch (error) {
                    setError(error instanceof Error ? error.message : 'Unknown error occurred');
                    setMetadata(null);
                }
            };
            reader.onerror = () => {
                setError('Error reading file');
                setMetadata(null);
            };
            reader.readAsText(file);
        }
    };

    const scrollToEntityType = (entityTypeName: string) => {
        const element = entityTypeRefs.current[entityTypeName];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveEntityType(entityTypeName);
        }
    };

    const setEntityTypeRef = (entityTypeName: string, element: HTMLDivElement | null) => {
        entityTypeRefs.current[entityTypeName] = element;
    };

    // Filter entity types based on the filter text
    const filteredEntityTypes = useMemo(() => {
        if (!metadata) return [];

        const allEntityTypes = parser.getEntityTypes(metadata);
        if (!filterText.trim()) return allEntityTypes;

        const searchTerm = filterText.toLowerCase();
        return allEntityTypes.filter(entityType =>
            entityType.Name.toLowerCase().includes(searchTerm)
        );
    }, [metadata, filterText, parser]);

    const renderEntityType = (entityType: any) => (
        <div
            key={entityType.Name}
            ref={(el) => setEntityTypeRef(entityType.Name, el)}
            id={`entity-type-${entityType.Name}`}
            className="bg-gray-100 rounded-md p-4 mb-5 scroll-mt-20"
        >
            <h3 className="text-blue-600 text-xl font-semibold mt-0">{entityType.Name}</h3>
            {entityType.Property && (
                <div className="mt-4">
                    <h4 className="text-gray-600 font-medium mb-2">Properties</h4>
                    <ul className="list-none pl-0">
                        {entityType.Property.map((prop: any) => (
                            <li key={prop.Name} className="py-1 border-b border-gray-200">
                                {prop.Name}: {prop.Type}
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
                                {nav.Name}: {nav.Type}
                                {nav.Partner && ` (Partner: ${nav.Partner})`}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );

    const renderEntitySet = (entitySet: any) => (
        <li key={entitySet.Name} className="py-2 border-b border-gray-200">
            {entitySet.Name} ({entitySet.EntityType})
        </li>
    );

    return (
        <div className="flex">
            {/* Sidebar */}
            {metadata && (
                <div className="w-64 sticky top-0 h-screen overflow-y-auto bg-white shadow-md p-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">Entity Types</h3>

                    {/* Filter input */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Filter entity types..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <ul className="space-y-1">
                        {filteredEntityTypes.map((entityType: any) => (
                            <li key={entityType.Name}>
                                <button
                                    onClick={() => scrollToEntityType(entityType.Name)}
                                    className={`w-full text-left px-2 py-1 rounded hover:bg-blue-50 ${activeEntityType === entityType.Name ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                                        }`}
                                >
                                    {entityType.Name}
                                </button>
                            </li>
                        ))}
                        {filteredEntityTypes.length === 0 && (
                            <li className="text-gray-500 italic py-2">No entity types match your filter</li>
                        )}
                    </ul>
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

                {metadata && (
                    <div className="mt-5">
                        <div className="mb-8">
                            <h3 className="text-xl font-semibold mb-3">Entity Types</h3>
                            {parser.getEntityTypes(metadata).map(renderEntityType)}
                        </div>

                        <div className="mt-8">
                            <h3 className="text-xl font-semibold mb-3">Entity Sets</h3>
                            <ul className="list-none pl-0">
                                {parser.getEntitySets(metadata).map(renderEntitySet)}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ODataMetadataViewer; 
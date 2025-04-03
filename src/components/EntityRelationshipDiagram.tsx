import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Position,
    Handle,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ODataMetadataParser } from '../util/parser';

interface EntityRelationshipDiagramProps {
    parser: ODataMetadataParser;
    onClose: () => void;
    entityTypeFilter?: string;
}

// Define the NavigationProperty interface
interface NavigationProperty {
    Name: string;
    Type: string;
    Partner?: string;
}

const EntityRelationshipDiagram: React.FC<EntityRelationshipDiagramProps> = ({ parser, onClose, entityTypeFilter = '' }) => {
    // Generate nodes and edges from the parser data
    const { initialNodes, initialEdges } = useMemo(() => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        // Get all entity types
        let entityTypes = parser.getEntityTypes();

        // Filter entity types based on the regex filter if provided
        if (entityTypeFilter) {
            try {
                const regex = new RegExp(entityTypeFilter);
                entityTypes = entityTypes.filter(entityType =>
                    regex.test(entityType.Name) ||
                    (entityType.Namespace && regex.test(entityType.Namespace))
                );
            } catch (error) {
                // If regex is invalid, use all entity types
                console.error('Invalid regex filter:', error);
            }
        }

        // Create nodes for each entity type
        entityTypes.forEach((entityType, index) => {
            const nodeId = entityType.Namespace
                ? `${entityType.Namespace}.${entityType.Name}`
                : entityType.Name;

            // Position nodes in a grid layout
            const row = Math.floor(index / 3);
            const col = index % 3;
            const x = col * 300 + 100;
            const y = row * 200 + 100;

            nodes.push({
                id: nodeId,
                position: { x, y },
                data: {
                    label: entityType.Name,
                    namespace: entityType.Namespace || 'No namespace'
                },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
                style: {
                    background: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '10px',
                    width: 250,
                },
                type: 'entityNode',
            });
        });

        // Create edges for navigation properties
        entityTypes.forEach(entityType => {
            if (entityType.NavigationProperty) {
                entityType.NavigationProperty.forEach((navProp: NavigationProperty) => {
                    // Get the target entity type
                    let targetType = navProp.Type;

                    // Handle collection types
                    if (targetType.startsWith('Collection(') && targetType.endsWith(')')) {
                        targetType = targetType.substring(11, targetType.length - 1);
                    }

                    // Expand the type reference to handle aliases
                    const expandedType = parser.expandTypeReference(targetType);

                    // Find the target node
                    const targetNode = nodes.find(node => node.id === expandedType);

                    if (targetNode) {
                        const sourceId = entityType.Namespace
                            ? `${entityType.Namespace}.${entityType.Name}`
                            : entityType.Name;

                        edges.push({
                            id: `${sourceId}-${targetNode.id}-${navProp.Name}`,
                            source: sourceId,
                            target: targetNode.id,
                            sourceHandle: 'right',
                            targetHandle: 'left',
                            label: navProp.Name,
                            type: 'smoothstep',
                            animated: true,
                            style: { stroke: '#6c757d' },
                            labelStyle: { fill: '#495057', fontWeight: 500 },
                        });
                    }
                });
            }
        });

        return { initialNodes: nodes, initialEdges: edges };
    }, [parser, entityTypeFilter]);

    // Use React Flow's state hooks
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Custom node component
    const EntityNode = useCallback(({ data }: { data: { label: string; namespace: string } }) => {
        return (
            <div className="p-3 rounded-lg shadow-sm border border-gray-200 bg-white">
                <Handle type="target" position={Position.Left} id="left" />
                <div className="font-semibold text-blue-600">{data.label}</div>
                <div className="text-xs text-gray-500 mt-1 font-mono">{data.namespace}</div>
                <Handle type="source" position={Position.Right} id="right" />
            </div>
        );
    }, []);

    // Node types
    const nodeTypes = useMemo(() => ({
        entityNode: EntityNode,
    }), [EntityNode]);

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
                <h2 className="text-xl font-semibold">Entity Relationship Diagram</h2>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={nodeTypes}
                    fitView
                >
                    <Background />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
};

export default EntityRelationshipDiagram; 
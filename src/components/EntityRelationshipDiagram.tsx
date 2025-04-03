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
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { ODataMetadataParser } from '../util/parser';

interface EntityRelationshipDiagramProps {
    parser: ODataMetadataParser;
    onClose: () => void;
    entityTypeFilter?: string;
}

// Dagre graph configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 250;
const nodeHeight = 80;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    // Clear the graph before adding new nodes
    dagreGraph.setGraph({});

    // Add nodes to the dagre graph
    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    // Add edges to the dagre graph
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    // Calculate the layout
    dagre.layout(dagreGraph);

    // Get the positioned nodes from dagre
    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
            targetPosition: isHorizontal ? Position.Left : Position.Top,
            sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        };
    });

    return { nodes: layoutedNodes, edges };
};

const EntityRelationshipDiagram: React.FC<EntityRelationshipDiagramProps> = ({ parser, onClose, entityTypeFilter = '' }) => {
    // Get entity types filtered by the filter if provided
    const entityTypes = useMemo(() => {
        const types = parser.getEntityTypes();
        if (!entityTypeFilter) return types;

        try {
            const regex = new RegExp(entityTypeFilter, 'i');
            return types.filter(entityType =>
                regex.test(entityType.Name) ||
                (entityType.Namespace && regex.test(entityType.Namespace))
            );
        } catch (error) {
            return types;
        }
    }, [parser, entityTypeFilter]);

    const { initialNodes, initialEdges } = useMemo(() => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        // Create nodes for each entity type
        entityTypes.forEach((entityType) => {
            const nodeId = entityType.Namespace
                ? `${entityType.Namespace}.${entityType.Name}`
                : entityType.Name;

            nodes.push({
                id: nodeId,
                position: { x: 0, y: 0 }, // Initial position will be calculated by dagre
                data: {
                    label: entityType.Name,
                    namespace: entityType.Namespace || 'No namespace'
                },
                style: {
                    background: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '10px',
                    width: nodeWidth,
                },
                type: 'entityNode',
            });
        });

        // Create edges for navigation properties
        entityTypes.forEach(entityType => {
            if (entityType.NavigationProperty) {
                entityType.NavigationProperty.forEach((navProp: any) => {
                    let targetType = navProp.Type;

                    // Handle collection types
                    if (targetType.startsWith('Collection(') && targetType.endsWith(')')) {
                        targetType = targetType.substring(11, targetType.length - 1);
                    }

                    // Expand the type reference to handle aliases
                    const expandedType = parser.expandTypeReference(targetType);

                    // Find the target node
                    const targetNode = nodes.find(node => node.id === expandedType);
                    const sourceId = entityType.Namespace
                        ? `${entityType.Namespace}.${entityType.Name}`
                        : entityType.Name;

                    if (targetNode) {
                        edges.push({
                            id: `${sourceId}-${targetNode.id}-${navProp.Name}`,
                            source: sourceId,
                            target: targetNode.id,
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

        // Apply the layout
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, 'LR');
        return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
    }, [parser, entityTypes]);

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
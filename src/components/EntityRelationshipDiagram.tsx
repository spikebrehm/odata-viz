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
import { getBaseName, getFullEntityTypeName, ODataMetadataParser, stripCollection } from '../util/parser';
import { Link } from 'react-router';

interface EntityRelationshipDiagramProps {
    parser: ODataMetadataParser;
    onClose: () => void;
    entityTypeFilter?: string;
    oneHopFrom?: string;
}

// Dagre graph configuration
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 350;
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

const EntityRelationshipDiagram: React.FC<EntityRelationshipDiagramProps> = ({ parser, onClose, entityTypeFilter = '',
    oneHopFrom
}) => {
    // Get entity types filtered by the filter if provided
    let entityTypes = useMemo(() => {
        const types = parser.entityTypes;
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

    // Filter for one-hop case
    if (oneHopFrom) {
        entityTypes = entityTypes.filter(entityType => {
            const type = parser.expandTypeReference(getFullEntityTypeName(entityType));
            if (type === oneHopFrom) return true;
            for (const navProp of entityType.NavigationProperty || []) {
                if (parser.expandTypeReference(navProp.Type) === oneHopFrom) return true;
            }
            return false;
        });
    }

    const { initialNodes, initialEdges } = useMemo(() => {
        const nodes = new Map<string, Node>();
        const edges: Edge[] = [];

        // Create nodes for each entity type
        entityTypes.forEach((entityType) => {
            const nodeId = getFullEntityTypeName(entityType);

            nodes.set(nodeId, {
                id: nodeId,
                position: { x: 0, y: 0 }, // Initial position will be calculated by dagre
                data: {
                    label: entityType.Name,
                    namespace: entityType.Namespace || 'No namespace',
                    type: getFullEntityTypeName(entityType)
                } satisfies NodeData,
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
                entityType.NavigationProperty.forEach((navProp) => {
                    // Expand the type reference to handle aliases
                    const expandedType = parser.expandTypeReference(navProp.Type);

                    // Find the target node
                    const targetNode = nodes.get(expandedType);
                    const sourceId = getFullEntityTypeName(entityType);

                    if (targetNode) {
                        edges.push({
                            id: `${sourceId}-${targetNode.id}-${navProp.Name}`,
                            source: sourceId,
                            target: targetNode.id,
                            label: navProp.Partner,
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
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(Array.from(nodes.values()), edges, 'LR');
        return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
    }, [parser, entityTypes]);

    // Use React Flow's state hooks
    const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Node types
    const nodeTypes = useMemo(() => ({
        entityNode: EntityNode,
    }), []);

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
                <h2 className="text-xl font-semibold">Entity Relationship Diagram
                    {oneHopFrom && <>: one hop from <span className="font-mono">{getBaseName(oneHopFrom)}</span></>}
                </h2>
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

// Custom node component
function EntityNode({ data }: { data: NodeData }) {
    return (
        <div className="p-3 rounded-lg shadow-sm border border-gray-200 bg-white">
            <Handle type="target" position={Position.Left} id="left" />
            <div className="font-semibold text-blue-600">
                <Link to={`/entity/${data.type}`}>
                    {data.label}
                </Link>
            </div>
            <div className="text-xs text-gray-500 mt-1 font-mono">{data.namespace}</div>
            <Handle type="source" position={Position.Right} id="right" />
        </div>
    );
}

interface NodeData {
    label: string;
    namespace: string;
    type: string
}
import React, { useEffect, useMemo, useRef } from 'react';
import RelationGraph, { RGOptions, RGNode, RGLine, RGLink, RGUserEvent, RGJsonData, RelationGraphComponent } from 'relation-graph-react';
import { getFullEntityTypeName, ODataEntityType, ODataMetadataParser, stripCollection } from '../util/parser';
import { calculateOrthogonalLayout } from '../util/layout';


interface EntityRelationshipDiagramProps {
  parser: ODataMetadataParser;
  onClose: () => void;
  entityTypeFilter?: string;
}



const EntityRelationshipDiagram: React.FC<EntityRelationshipDiagramProps> = ({ parser, onClose, entityTypeFilter = '' }) => {
  // Get entity types filtered by the filter if provided
  const entityTypes = useMemo(() => {
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


  const graphRef = useRef<RelationGraphComponent | null>(null);

  useEffect(() => {
    showGraph();
  }, []);

  const graphOptions: RGOptions = {
    debug: false,
    allowSwitchLineShape: true,
    allowSwitchJunctionPoint: true,
    allowShowDownloadButton: true,
    defaultJunctionPoint: 'border',
    placeOtherNodes: false,
    placeSingleNode: false,
    graphOffset_x: -200,
    graphOffset_y: 100,
    defaultNodeColor: '#f39930',
    defaultLineMarker: {
      markerWidth: 20,
      markerHeight: 20,
      refX: 3,
      refY: 3,
      data: "M 0 0, V 6, L 4 3, Z"
    },
    layout: {
      layoutName: 'fixed'
    }
  };

  const showGraph = async () => {
    // Create nodes with initial positions
    const entities = entityTypes.map(entityType => ({
      id: getFullEntityTypeName(entityType),
      x: 0,
      y: 0,
      width: 350, // Approximate width of node
      height: 100, // Approximate height of node
      data: entityType
    }));

    // Create edges from navigation properties
    const edges = entityTypes.flatMap(entityType =>
      (entityType.NavigationProperty ?? []).map(navProp => ({
        source: getFullEntityTypeName(entityType),
        target: stripCollection(navProp.Type)
      }))
    );

    // Calculate positions using orthogonal layout
    const positionedNodes = calculateOrthogonalLayout(entities, edges, {
      gridSize: 300, // Larger grid size for better spacing
      padding: 100,
      maxIterations: 200,
      temperature: 200,
      coolingFactor: 0.95
    });

    console.log(positionedNodes)

    // Convert to graph format
    const graphNodes = positionedNodes.map(node => ({
      id: node.id,
      text: node.data.Namespace,
      x: node.x,
      y: node.y,
      nodeShape: 1 as const,
      data: {
        entityType: node.data
      } satisfies NodeData,
    }));

    const graphLines = edges.map(edge => ({
      from: edge.source,
      to: edge.target,
      color: 'rgba(29,169,245,0.76)',
      text: '',
      fromJunctionPoint: 'left',
      toJunctionPoint: 'lr',
      lineShape: 6,
      lineWidth: 3
    }));

    const graphJsonData: RGJsonData = {
      nodes: graphNodes,
      lines: [],
      elementLines: graphLines
    };

    const graphInstance = graphRef.current?.getInstance();
    if (graphInstance) {
      await graphInstance.setJsonData(graphJsonData);
      graphInstance.moveToCenter();
      graphInstance.zoomToFit();
    }
  };

  const onNodeClick = (nodeObject: RGNode, $event: RGUserEvent) => {
    console.log('onNodeClick:', nodeObject);
  };

  const onLineClick = (lineObject: RGLine, linkObject: RGLink, $event: RGUserEvent) => {
    console.log('onLineClick:', lineObject);
  };


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
        <RelationGraph
          ref={graphRef}
          options={graphOptions}
          onNodeClick={onNodeClick}
          onLineClick={onLineClick}
          nodeSlot={NodeSlot}
        />
      </div>
    </div>
  );
}

export default EntityRelationshipDiagram;

function NodeSlot({ node }: { node: RGNode }) {
  const { entityType } = node.data as NodeData;
  return (
    <div
      id={node.id}
      style={{ minWidth: 350, minHeight: 100, backgroundColor: '#f39930' }}>
      <h3>{entityType.Name}</h3>
      <h4>
        {entityType.Namespace}
      </h4>
      {entityType.NavigationProperty && (
        <table className="c-data-table">
          <thead>
            <tr>
              <th>Navigation property</th>
              <th>Partner</th>
            </tr>
          </thead>
          <tbody>
            {(entityType.NavigationProperty ?? []).map(navProp => (
              <tr key={navProp.Name}>
                <td>
                  <div id={`${node.id}-${navProp.Type}`}>{navProp.Type}</div>
                </td>
                <td>{navProp.Partner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

interface NodeData {
  entityType: ODataEntityType
}
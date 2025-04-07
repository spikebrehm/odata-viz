interface EntityNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    data: any;
}

interface EntityEdge {
    source: string;
    target: string;
}

interface LayoutOptions {
    gridSize?: number;
    padding?: number;
    maxIterations?: number;
    temperature?: number;
    coolingFactor?: number;
}

export function calculateOrthogonalLayout(
    nodes: EntityNode[],
    edges: EntityEdge[],
    options: LayoutOptions = {}
): EntityNode[] {
    const {
        gridSize = 100,
        padding = 50,
        maxIterations = 100,
        temperature = 100,
        coolingFactor = 0.95
    } = options;

    // Initialize positions in a grid with more spacing
    const gridWidth = Math.ceil(Math.sqrt(nodes.length));
    nodes.forEach((node, index) => {
        const row = Math.floor(index / gridWidth);
        const col = index % gridWidth;
        node.x = col * (gridSize * 2 + padding); // Double the grid size for initial spacing
        node.y = row * (gridSize * 2 + padding);
    });

    // Force-directed layout with orthogonal constraints
    let currentTemp = temperature;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        // Calculate repulsive forces (between all nodes)
        nodes.forEach(node => {
            let fx = 0;
            let fy = 0;

            nodes.forEach(otherNode => {
                if (node.id === otherNode.id) return;

                const dx = node.x - otherNode.x;
                const dy = node.y - otherNode.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 0) {
                    // Increase repulsive force and add minimum distance
                    const minDistance = gridSize * 1.5; // Minimum distance between nodes
                    const force = distance < minDistance
                        ? (gridSize * 4) / (distance * distance) // Stronger repulsion when too close
                        : Math.min((gridSize * 2) / (distance * distance), gridSize);
                    fx += (dx / distance) * force;
                    fy += (dy / distance) * force;
                }
            });

            // Apply forces with temperature and limit maximum movement
            const maxMovement = gridSize * 0.5;
            node.x += Math.max(Math.min(fx * currentTemp, maxMovement), -maxMovement);
            node.y += Math.max(Math.min(fy * currentTemp, maxMovement), -maxMovement);
        });

        // Calculate attractive forces (between connected nodes)
        edges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (!sourceNode || !targetNode) return;

            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                // Scale force by gridSize and limit maximum force
                const force = Math.min(distance / (gridSize * 2), gridSize * 0.5);
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                // Apply forces with temperature and limit maximum movement
                const maxMovement = gridSize * 0.5;
                sourceNode.x += Math.max(Math.min(fx * currentTemp, maxMovement), -maxMovement);
                sourceNode.y += Math.max(Math.min(fy * currentTemp, maxMovement), -maxMovement);
                targetNode.x -= Math.max(Math.min(fx * currentTemp, maxMovement), -maxMovement);
                targetNode.y -= Math.max(Math.min(fy * currentTemp, maxMovement), -maxMovement);
            }
        });

        // Snap to grid with more precision
        nodes.forEach(node => {
            // Round to nearest grid point but ensure minimum spacing
            const roundedX = Math.round(node.x / gridSize) * gridSize;
            const roundedY = Math.round(node.y / gridSize) * gridSize;

            // Check for overlap with other nodes
            const hasOverlap = nodes.some(otherNode => {
                if (otherNode.id === node.id) return false;
                const dx = roundedX - otherNode.x;
                const dy = roundedY - otherNode.y;
                return Math.abs(dx) < gridSize && Math.abs(dy) < gridSize;
            });

            // If overlap, try to find a nearby grid point without overlap
            if (hasOverlap) {
                let newX = roundedX;
                let newY = roundedY;
                let foundPosition = false;

                // Try positions in a spiral pattern around the original position
                for (let r = 1; r <= 3 && !foundPosition; r++) {
                    for (let i = 0; i < r * 8 && !foundPosition; i++) {
                        const angle = (i * Math.PI) / (r * 4);
                        const testX = roundedX + Math.round(Math.cos(angle) * r) * gridSize;
                        const testY = roundedY + Math.round(Math.sin(angle) * r) * gridSize;

                        const noOverlap = nodes.every(otherNode => {
                            if (otherNode.id === node.id) return true;
                            const dx = testX - otherNode.x;
                            const dy = testY - otherNode.y;
                            return Math.abs(dx) >= gridSize || Math.abs(dy) >= gridSize;
                        });

                        if (noOverlap) {
                            newX = testX;
                            newY = testY;
                            foundPosition = true;
                        }
                    }
                }

                node.x = newX;
                node.y = newY;
            } else {
                node.x = roundedX;
                node.y = roundedY;
            }
        });

        // Cool down
        currentTemp *= coolingFactor;
    }

    // Center the layout
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.x));
    const maxY = Math.max(...nodes.map(n => n.y));

    nodes.forEach(node => {
        node.x -= minX - padding;
        node.y -= minY - padding;
    });

    return nodes;
} 
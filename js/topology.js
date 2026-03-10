// Topology management and visual packet animation
class NetworkTopology {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svgNS = "http://www.w3.org/2000/svg";

        // Logical Node Definitions
        this.nodes = {
            attacker: { x: 50, y: 150, label: "Attacker\n(Spoofed IP)", type: "external" },
            internet: { x: 180, y: 150, label: "Internet", type: "cloud" },
            igw: { x: 330, y: 150, label: "IGW\n(Layer 1)", type: "router" },
            bgw: { x: 480, y: 150, label: "BGW\n(Layer 2)", type: "router" },
            bng: { x: 630, y: 150, label: "BNG\n(Layer 3)", type: "router" },
            cpe: { x: 780, y: 150, label: "CPE\n(Public IP)", type: "router" },
            lan: { x: 910, y: 150, label: "LAN Devices\n(UPnP)", type: "device" },
            victim: { x: 550, y: 280, label: "Victim\n(Target)", type: "external" }
        };

        // Network Links (Edges)
        this.links = [
            { source: 'attacker', target: 'internet' },
            { source: 'internet', target: 'igw' },
            { source: 'igw', target: 'bgw' },
            { source: 'bgw', target: 'bng' },
            { source: 'bng', target: 'cpe', label: 'PPPoE' },
            { source: 'cpe', target: 'lan', label: 'LAN' },

            // Return Path for Amplified response (simulated routing via Internet)
            { source: 'cpe', target: 'bng', hidden: true }, // bi-directional logic
            { source: 'bng', target: 'bgw', hidden: true },
            { source: 'bgw', target: 'igw', hidden: true },
            { source: 'igw', target: 'internet', hidden: true },
            { source: 'internet', target: 'victim', strokeDash: "5,5" }
        ];

        this.initSVG();

        // Container for running packet DOM elements overlay
        this.packetsContainer = document.createElement('div');
        this.packetsContainer.id = "packetsOverlay";
        this.packetsContainer.style.position = 'absolute';
        this.packetsContainer.style.top = '0';
        this.packetsContainer.style.left = '0';
        this.packetsContainer.style.width = '100%';
        this.packetsContainer.style.height = '100%';
        this.packetsContainer.style.pointerEvents = 'none';
        this.container.appendChild(this.packetsContainer);

        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
    }

    initSVG() {
        this.svg = document.createElementNS(this.svgNS, "svg");
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");
        this.svg.setAttribute("viewBox", "0 0 1000 350"); // Fixed coordinate system
        this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        this.container.appendChild(this.svg);

        this.drawLinks();
        this.drawNodes();

        this.svgRect = this.svg.getBoundingClientRect();
    }

    drawLinks() {
        this.linksLayer = document.createElementNS(this.svgNS, "g");
        this.svg.appendChild(this.linksLayer);

        this.links.forEach(link => {
            if (link.hidden) return; // Skip bi-directional overlays for visual simplicity

            const sourceInfo = this.nodes[link.source];
            const targetInfo = this.nodes[link.target];

            const line = document.createElementNS(this.svgNS, "line");
            line.setAttribute("x1", sourceInfo.x);
            line.setAttribute("y1", sourceInfo.y);
            line.setAttribute("x2", targetInfo.x);
            line.setAttribute("y2", targetInfo.y);
            line.setAttribute("class", "link-line");
            line.id = `link-${link.source}-${link.target}`;

            if (link.strokeDash) {
                line.setAttribute("stroke-dasharray", link.strokeDash);
            }

            this.linksLayer.appendChild(line);

            if (link.label) {
                const text = document.createElementNS(this.svgNS, "text");
                // Midpoint
                text.setAttribute("x", (sourceInfo.x + targetInfo.x) / 2);
                text.setAttribute("y", (sourceInfo.y + targetInfo.y) / 2 - 10);
                text.setAttribute("fill", "#64748b");
                text.setAttribute("font-size", "10px");
                text.setAttribute("text-anchor", "middle");
                text.textContent = link.label;
                this.linksLayer.appendChild(text);
            }
        });
    }

    drawNodes() {
        this.nodesLayer = document.createElementNS(this.svgNS, "g");
        this.svg.appendChild(this.nodesLayer);

        Object.keys(this.nodes).forEach(nodeId => {
            const nodeInfo = this.nodes[nodeId];

            const group = document.createElementNS(this.svgNS, "g");
            group.setAttribute("class", "node-group");
            group.setAttribute("id", `node-${nodeId}`);
            group.setAttribute("transform", `translate(${nodeInfo.x}, ${nodeInfo.y})`);

            // Node Circle
            const circle = document.createElementNS(this.svgNS, "circle");
            circle.setAttribute("r", 25);
            circle.setAttribute("class", "node-circle");
            group.appendChild(circle);

            // Icon/Text container (Simplified for now using text)
            const lines = nodeInfo.label.split('\n');
            const mainText = document.createElementNS(this.svgNS, "text");
            mainText.setAttribute("class", "node-text");
            mainText.setAttribute("y", "-35");
            mainText.textContent = lines[0];
            group.appendChild(mainText);

            if (lines[1]) {
                const subText = document.createElementNS(this.svgNS, "text");
                subText.setAttribute("class", "node-subtext");
                subText.setAttribute("y", "-22");
                subText.textContent = lines[1];
                group.appendChild(subText);
            }

            this.nodesLayer.appendChild(group);
        });
    }

    // Set node visual state (normal, attack, protect)
    setNodeState(nodeId, state) {
        const group = document.getElementById(`node-${nodeId}`);
        if (!group) return;

        group.classList.remove("node-attack", "node-protect", "node-target");
        if (state) {
            group.classList.add(`node-${state}`);
        }
    }

    handleResize() {
        this.svgRect = this.svg.getBoundingClientRect();
    }

    // Get actual on-screen pixels for a viewBox coordinate
    getPixelPosition(vbX, vbY) {
        if (!this.svgRect) this.svgRect = this.svg.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        // ViewBox dimensions
        const vbW = 1000;
        const vbH = 350;

        // Container dimensions
        const cW = this.svgRect.width;
        const cH = this.svgRect.height;

        // "meet" scaling ratio
        const scale = Math.min(cW / vbW, cH / vbH);

        // Actual rendered SVG dimensions
        const actualW = vbW * scale;
        const actualH = vbH * scale;

        // Offsets because of "xMidYMid meet" (centering)
        const offsetX = (cW - actualW) / 2;
        const offsetY = (cH - actualH) / 2;

        // Final pixel position relative to the container
        return {
            x: (vbX * scale) + offsetX,
            y: (vbY * scale) + offsetY
        };
    }

    /**
     * Animate a packet from source node to target node
     * @param {string} type 'lan', 'spoofed', 'amp'
     * @param {string} sourceId node id
     * @param {string} targetId node id
     * @param {number} duration ms
     * @param {string|null} dropAtLayer where to drop it (node id)
     */
    animatePacket(type, sourcePath, duration = 1000, dropAt = null) {
        // sourcePath is an array of node IDs, e.g. ['attacker', 'internet', 'igw', 'bgw', 'bng', 'cpe']
        if (!sourcePath || sourcePath.length < 2) return;

        const packet = document.createElement('div');
        packet.classList.add('packet', `packet-${type}`);
        this.packetsContainer.appendChild(packet);

        // Calculate path segments
        const segments = [];
        let totalDistance = 0;

        for (let i = 0; i < sourcePath.length - 1; i++) {
            const n1 = this.nodes[sourcePath[i]];
            const n2 = this.nodes[sourcePath[i + 1]];

            const p1 = this.getPixelPosition(n1.x, n1.y);
            const p2 = this.getPixelPosition(n2.x, n2.y);

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            segments.push({
                startNode: sourcePath[i],
                endNode: sourcePath[i + 1],
                p1, p2, dist
            });
            totalDistance += dist;
        }

        let currentProgress = 0;
        let startTime = performance.now();

        // If it drops, it stops at the midway or node of the drop layer
        const dropSegmentIndex = dropAt ? sourcePath.indexOf(dropAt) : -1;

        const animate = (time) => {
            let elapsed = time - startTime;
            let progress = elapsed / duration;

            if (progress >= 1) progress = 1;

            // Find current segment
            let distanceTarget = progress * totalDistance;
            let currentDist = 0;
            let segment = segments[0];
            let segProgress = 0;

            for (let i = 0; i < segments.length; i++) {
                if (currentDist + segments[i].dist >= distanceTarget) {
                    segment = segments[i];
                    segProgress = (distanceTarget - currentDist) / segment.dist;

                    // Check if we reached the drop node
                    if (dropAt && segment.endNode === dropAt && segProgress >= 0.9) {
                        this.dropPacketDOM(packet);
                        return; // Stop animation
                    }
                    if (dropAt && sourcePath.indexOf(segment.endNode) > sourcePath.indexOf(dropAt)) {
                        this.dropPacketDOM(packet);
                        return;
                    }

                    break;
                }
                currentDist += segments[i].dist;
            }

            let x, y;
            if (progress >= 1) {
                // Snap to exact final node to avoid floating point math gaps
                const finalSegment = segments[segments.length - 1];
                x = finalSegment.p2.x;
                y = finalSegment.p2.y;
            } else {
                x = segment.p1.x + (segment.p2.x - segment.p1.x) * segProgress;
                y = segment.p1.y + (segment.p2.y - segment.p1.y) * segProgress;
            }

            packet.style.left = `${x}px`;
            packet.style.top = `${y}px`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Done
                packet.classList.add('packet-fading');
                setTimeout(() => packet.remove(), 200);
            }
        };

        requestAnimationFrame(animate);
    }

    dropPacketDOM(packet) {
        packet.classList.add('packet-dropping');
        setTimeout(() => {
            if (packet.parentNode) {
                packet.parentNode.removeChild(packet);
            }
        }, 300);
    }
}

// Global instance to be initialized in app.js
window.topologyAPI = null;

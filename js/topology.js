// Topology management and visual packet animation
class NetworkTopology {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svgNS = "http://www.w3.org/2000/svg";

        // Logical Node Definitions
        this.nodes = {
            attacker: { x: 50,  y: 150, label: "Attacker\n(Spoofed IP)", type: "attacker" },
            internet: { x: 180, y: 150, label: "Internet",                type: "cloud" },
            igw:      { x: 310, y: 150, label: "IGW\n(Layer 1)",          type: "router" },
            bgw:      { x: 440, y: 150, label: "BGW\n(Layer 2)",          type: "router" },
            bng:      { x: 570, y: 150, label: "BNG\n(Layer 3)",          type: "router" },
            cpe:      { x: 700, y: 150, label: "CPE\n(Public IP)",        type: "cpe" },
            lan1:     { x: 870, y: 60,  label: "Device 1\n(UPnP)",        type: "device" },
            lan2:     { x: 870, y: 150, label: "Device 2\n(UPnP)",        type: "device" },
            lan3:     { x: 870, y: 240, label: "Device 3\n(UPnP)",        type: "device" },
            victim:   { x: 440, y: 300, label: "Victim\n(Target)",        type: "victim" }
        };

        // Network Links (Edges)
        this.links = [
            { source: 'attacker', target: 'internet' },
            { source: 'internet', target: 'igw' },
            { source: 'igw',      target: 'bgw' },
            { source: 'bgw',      target: 'bng' },
            { source: 'bng',      target: 'cpe', label: 'PPPoE' },
            // CPE fans out to 3 LAN devices
            { source: 'cpe',  target: 'lan1', label: 'LAN' },
            { source: 'cpe',  target: 'lan2' },
            { source: 'cpe',  target: 'lan3' },

            // Return Path for Amplified responses (reverse through ISPs)
            { source: 'cpe', target: 'bng', hidden: true },
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
        this.svg.setAttribute("viewBox", "0 0 1000 380"); // Fixed coordinate system, tall for 3 LAN devices
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

    // Returns an SVG icon element for a given node type
    getNodeIcon(nodeId, type) {
        const g = document.createElementNS(this.svgNS, "g");
        g.setAttribute("class", "node-icon");

        const addPath = (d, extraAttrs = {}) => {
            const p = document.createElementNS(this.svgNS, "path");
            p.setAttribute("d", d);
            p.setAttribute("fill", "currentColor");
            Object.entries(extraAttrs).forEach(([k, v]) => p.setAttribute(k, v));
            g.appendChild(p);
        };

        switch (type) {
            case 'attacker':
                // Skull icon
                g.setAttribute("transform", "translate(-10,-10) scale(1.25)");
                addPath("M8 0a8 8 0 1 0 0 13.5H8A8 8 0 0 0 8 0zm0 1.5a6.5 6.5 0 1 1 0 10.6V12H5.5v-1H4v-.5a.5.5 0 0 0-.5-.5H3a.5.5 0 0 0-.5.5V12H1.5v1H0V12a8 8 0 0 0 8-10.5zM5.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z");
                break;
            case 'cloud':
                // Cloud icon
                g.setAttribute("transform", "translate(-13,-9) scale(1.6)");
                addPath("M4.406 3.342A5.53 5.53 0 0 1 8 2c2.69 0 4.923 2 5.166 4.579C14.758 6.804 16 8.137 16 9.773 16 11.569 14.502 13 12.687 13H3.781C1.708 13 0 11.366 0 9.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383z");
                break;
            case 'router':
                // Circle Router Icon (Classic Networking Symbol)
                g.setAttribute("transform", "translate(-12,-12) scale(1.5)");
                // Inner circle
                addPath("M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z", { opacity: 0.5 });
                // Arrows (cross pattern)
                addPath("M8 3.5a.5.5 0 0 1 .5.5v1.5h1.5a.5.5 0 0 1 0 1H8.5V8a.5.5 0 0 1-1 0V6.5H6a.5.5 0 0 1 0-1h1.5V4a.5.5 0 0 1 .5-.5z"); // Just a placeholder cross, let's do better arrows
                addPath("M3.5 8a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1h-8a.5.5 0 0 1-.5-.5z"); // Horizontal line
                addPath("M8 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0v-8a.5.5 0 0 1 .5-.5z"); // Vertical line
                // Arrow heads
                addPath("M7.5 4.5l.5-.5.5.5M7.5 11.5l.5.5.5-.5M4.5 7.5l-.5.5.5.5M11.5 7.5l.5.5-.5.5", { fill: "none", stroke: "currentColor", "stroke-width": "1" });
                break;
            case 'cpe':
                // Home router with antennas
                g.setAttribute("transform", "translate(-12,-10) scale(1.5)");
                // Body
                addPath("M2 9h12v3H2z");
                // Antennas
                addPath("M4 9V5M12 9V5", { fill: "none", stroke: "currentColor", "stroke-width": "1.2" });
                // Front panel dots
                addPath("M4 10.5h1v1H4zm3 0h1v1H7zm3 0h1v1H10z", { opacity: 0.8 });
                break;
            case 'device':
                // Monitor / PC screen
                g.setAttribute("transform", "translate(-9,-9) scale(1.12)");
                addPath("M0 4s0-2 2-2h12s2 0 2 2v6s0 2-2 2h-4c0 .667.083 1.167.25 1.5H11a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1h.75c.167-.333.25-.833.25-1.5H2s-2 0-2-2V4zm1.398-.855L1 4v.01V10s0 1 1 1h12s1 0 1-1V4.01L14.602 3.145A1 1 0 0 0 14 3H2a1 1 0 0 0-.602.145z");
                break;
            case 'victim':
                // Target / crosshair icon
                g.setAttribute("transform", "translate(-10,-10) scale(1.25)");
                addPath("M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z");
                addPath("M8 13A5 5 0 1 1 8 3a5 5 0 0 1 0 10zm0 1A6 6 0 1 0 8 2a6 6 0 0 0 0 12z");
                addPath("M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8z");
                addPath("M9.5 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z");
                break;
            default:
                break;
        }
        return g;
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

            // Proper SVG icon inside the circle
            const icon = this.getNodeIcon(nodeId, nodeInfo.type);
            group.appendChild(icon);

            // Label text above the node
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
        const vbH = 380;

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

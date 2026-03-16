// SSDP Packet Simulation Engine
class SimulationEngine {
    constructor() {
        this.packetIdCounter = 1;
        this.startTime = performance.now();
        this.params = {
            mode: 'normal',       // normal | attack | mitigation
            attackRate: 100,      // pps
            reflectors: 10,       // targets in the botnet (mocked for multiplier)
            ampFactor: 30,        // response / request size
            victimIP: "203.0.113.99",
            attackerIP: "198.51.100.1",
            cpeIP: "192.0.2.1"
        };
        this.lanDevices = [
            { nodeId: 'lan1', ip: '192.168.1.11' },
            { nodeId: 'lan2', ip: '192.168.1.22' },
            { nodeId: 'lan3', ip: '192.168.1.33' }
        ];
        this.onPacketGenerated = null; // Callback for when a new packet is created
    }

    setMode(mode) {
        this.params.mode = mode;
    }

    updateParams(params) {
        this.params = { ...this.params, ...params };
    }

    getTimestamp() {
        return ((performance.now() - this.startTime) / 1000).toFixed(3);
    }

    /**
     * Generate a batch of packets for this tick based on current rate and mode
     * @param {number} tickDeltaMs time elapsed since last tick
     */
    tick(tickDeltaMs) {
        if (!this.onPacketGenerated) return;

        if (this.params.mode === 'normal') {
            this.generateNormalTraffic(tickDeltaMs);
        } else if (this.params.mode === 'attack' || this.params.mode === 'mitigation') {
            this.generateAttackTraffic(tickDeltaMs);
        }
    }

    generateNormalTraffic(tickDeltaMs) {
        // Normal LAN traffic: 1-2 packets per second for visual effect
        if (Math.random() < (1.5 * (tickDeltaMs / 1000))) {
            // Pick two random different LAN devices
            const shuffle = [...this.lanDevices].sort(() => Math.random() - 0.5);
            const src = shuffle[0];
            const dst = shuffle[1];

            const req = this.createPacket({
                srcIP: src.ip,
                dstIP: "239.255.255.250", // multicast
                method: "M-SEARCH",
                size: 120,
                type: 'lan',
                path: [src.nodeId, 'cpe', dst.nodeId]
            });
            this.onPacketGenerated(req);

            // Mock a response a tiny bit later (the queried device replies)
            setTimeout(() => {
                const res = this.createPacket({
                    srcIP: dst.ip,
                    dstIP: src.ip,
                    method: "HTTP/1.1 200 OK",
                    size: 450,
                    type: 'lan',
                    path: [dst.nodeId, 'cpe', src.nodeId]
                });
                this.onPacketGenerated(res);
            }, 200);
        }
    }

    generateAttackTraffic(tickDeltaMs) {
        // Calculate how many spoofed requests to generate in this tick
        const expectedPackets = this.params.attackRate * (tickDeltaMs / 1000);

        // Cap visual packets to max 5 per second (each generates 3 fans from LAN devices)
        const visualCap = 5 * (tickDeltaMs / 1000);
        let packetsToGenerate = expectedPackets;

        let rateMultiplier = 1;
        if (expectedPackets > visualCap) {
            rateMultiplier = expectedPackets / visualCap;
            packetsToGenerate = visualCap;
        }

        const wholePackets = Math.floor(packetsToGenerate);
        const fraction = packetsToGenerate - wholePackets;
        let actualToGenerate = wholePackets + (Math.random() < fraction ? 1 : 0);

        for (let i = 0; i < actualToGenerate; i++) {
            // --- Phase 1: Spoofed M-SEARCH from attacker -> CPE ---
            const reqReq = this.createPacket({
                srcIP: this.params.victimIP, // SPOOFED source
                dstIP: this.params.cpeIP,
                method: "M-SEARCH",
                size: 120,
                isSpoofed: true,
                realSrcIP: this.params.attackerIP,
                type: 'spoofed',
                path: ['attacker', 'internet', 'igw', 'bgw', 'bng', 'cpe'],
                multiplier: rateMultiplier
            });

            // --- Phase 2: CPE broadcasts M-SEARCH to all 3 LAN devices ---
            // Then each LAN device sends an amplified response to the (spoofed) victim IP.
            reqReq.theoreticalResponse = () => {
                // Returns an array of 3 response packets, one per LAN device
                return this.lanDevices.map(device => {
                    // First, a "fan-out" packet from CPE -> LAN device
                    const fanOut = this.createPacket({
                        srcIP: this.params.cpeIP,
                        dstIP: device.ip,
                        method: "M-SEARCH (Broadcast)",
                        size: 120,
                        type: 'spoofed',
                        path: ['cpe', device.nodeId]
                    });
                    // Then, the amplified response from the LAN device -> victim through ISPs
                    fanOut.deviceResponse = this.createPacket({
                        srcIP: device.ip,
                        dstIP: this.params.victimIP,
                        method: "HTTP/1.1 200 OK (Amplified)",
                        size: 120 * this.params.ampFactor,
                        type: 'amp',
                        path: [device.nodeId, 'cpe', 'bng', 'bgw', 'igw', 'internet', 'victim'],
                        multiplier: rateMultiplier * (this.params.reflectors / 3)
                    });
                    return fanOut;
                });
            };

            this.onPacketGenerated(reqReq);
        }
    }

    createPacket(data) {
        const p = {
            id: this.packetIdCounter++,
            time: this.getTimestamp(),
            protocol: "SSDP",
            srcPort: Math.floor(Math.random() * (65535 - 49152 + 1)) + 49152,
            dstPort: 1900,
            status: 'normal',
            blockedAt: null,
            multiplier: 1, // for math scaling when visual cap is hit
            ...data
        };
        return p;
    }
}

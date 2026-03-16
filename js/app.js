// Main Application Controller
document.addEventListener('DOMContentLoaded', () => {

    // Initialize Systems
    const topology = new NetworkTopology('topologyContainer');
    const simulation = new SimulationEngine();
    const mitigation = new MitigationEngine();
    const metrics = new MetricsController();
    const inspector = new PacketInspector(40);

    // Global exposed for debugging
    window.app = { topology, simulation, mitigation, metrics, inspector };

    // DOM Elements
    const modeSelect = document.getElementById('simMode');

    // Attack Params
    const rateSlider = document.getElementById('param_rate');
    const rateVal = document.getElementById('param_rate_val');
    const reflectorSlider = document.getElementById('param_reflectors');
    const reflectorVal = document.getElementById('param_reflectors_val');

    // Mitigation Toggles
    const mitigCheckboxes = document.querySelectorAll('.mitigation-layers input[type="checkbox"]');

    // --- Event Listeners ---

    // Mode Switcher
    modeSelect.addEventListener('change', (e) => {
        const mode = e.target.value;
        simulation.setMode(mode);

        // Reset state
        metrics.reset();

        // UI toggles based on mode
        const isAttackOrMitig = mode === 'attack' || mode === 'mitigation';
        const isMitigation = mode === 'mitigation';

        rateSlider.disabled = !isAttackOrMitig;
        reflectorSlider.disabled = !isAttackOrMitig;

        mitigCheckboxes.forEach(cb => {
            cb.disabled = !isMitigation;
            cb.parentElement.classList.toggle('active-mode', isMitigation);
            if (!isMitigation) cb.checked = false; // Reset rules visually
        });

        // Reset engine rules
        if (!isMitigation) {
            ['igw', 'bgw', 'bng', 'cpe'].forEach(layer => {
                Object.keys(mitigation.activeRules[layer]).forEach(rule => {
                    mitigation.setRule(layer, rule, false);
                });
            });
        }

        // Set topology colors
        topology.setNodeState('attacker', isAttackOrMitig ? 'attack' : null);
        topology.setNodeState('victim', isAttackOrMitig ? 'target' : null);
        topology.setNodeState('cpe', isAttackOrMitig ? 'attack' : null);
        topology.setNodeState('lan1', isAttackOrMitig ? 'attack' : null);
        topology.setNodeState('lan2', isAttackOrMitig ? 'attack' : null);
        topology.setNodeState('lan3', isAttackOrMitig ? 'attack' : null);
    });

    // Params
    rateSlider.addEventListener('input', (e) => {
        rateVal.textContent = e.target.value;
        simulation.updateParams({ attackRate: parseInt(e.target.value) });
    });
    reflectorSlider.addEventListener('input', (e) => {
        reflectorVal.textContent = e.target.value;
        simulation.updateParams({ reflectors: parseInt(e.target.value) });
        // Update amp logic metric (approximate)
        metrics.setAmpFactor(30 * parseInt(e.target.value) / 10);
    });

    // Mitigations
    mitigCheckboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            const idParts = e.target.id.split('_'); // e.g. mitig_igw_urpf
            if (idParts.length === 3) {
                const layer = idParts[1];
                const rule = idParts[2];
                mitigation.setRule(layer, rule, e.target.checked);

                // Color node
                topology.setNodeState(layer, e.target.checked ? 'protect' : null);
            }
        });
    });

    // --- Simulation Core Loop Wiring ---

    simulation.onPacketGenerated = (packet) => {
        // Normal LAN traffic stays within the LAN nodes
        if (packet.type === 'lan') {
            topology.animatePacket('lan', packet.path, 800);
            inspector.logPacket(packet);
            return;
        }

        // --- Attack / Mitigation Traffic ---

        // 1. Process inbound spoofed M-SEARCH through ISP layers
        const blockedAtReq = mitigation.processTraffic(packet);

        // Animate the spoofed request path (Attacker -> CPE)
        topology.animatePacket(packet.type, packet.path, 800, blockedAtReq);
        inspector.logPacket(packet);

        if (blockedAtReq) {
            metrics.logBlockedPacket(packet.multiplier);
            return; // Blocked — no amplification occurs
        }

        // 2. Packet reached CPE — get the array of fan-out packets (one per LAN device)
        const fanOuts = packet.theoreticalResponse();

        fanOuts.forEach((fanOut, idx) => {
            const deviceOffset = idx * 100; // Stagger fan-outs for visual clarity

            // Phase A: Animate CPE broadcasting M-SEARCH to this LAN device
            setTimeout(() => {
                topology.animatePacket(fanOut.type, fanOut.path, 400);
                inspector.logPacket(fanOut);

                // Phase B: After the request reaches the LAN device, animate the amplified response
                setTimeout(() => {
                    const responsePacket = fanOut.deviceResponse;
                    const blockedAtRes = mitigation.processTraffic(responsePacket);

                    topology.animatePacket(responsePacket.type, responsePacket.path, 900, blockedAtRes);
                    inspector.logPacket(responsePacket);

                    if (blockedAtRes) {
                        metrics.logBlockedPacket(responsePacket.multiplier);
                    } else {
                        // Victim gets hit
                        metrics.logAttackPacketArrived(responsePacket.size, responsePacket.multiplier);
                    }
                }, 450); // Wait for CPE->Device traversal before firing response

            }, 820 + deviceOffset); // Wait for inbound spoofed packet to reach CPE
        });
    };

    // Main interval driver
    const TICK_RATE_MS = 100; // 10 ticks per sec
    let lastTick = performance.now();

    setInterval(() => {
        const now = performance.now();
        const delta = now - lastTick;
        lastTick = now;

        simulation.tick(delta);
    }, TICK_RATE_MS);

    // Metric sec driver
    setInterval(() => {
        metrics.tickSecond();
    }, 1000);

    // Init values
    simulation.updateParams({ attackRate: parseInt(rateSlider.value), reflectors: parseInt(reflectorSlider.value) });

    // Trigger initial mode state
    modeSelect.dispatchEvent(new Event('change'));
});

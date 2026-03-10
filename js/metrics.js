// Metrics calculation and DOM updates
class MetricsController {
    constructor() {
        this.dom = {
            bw: document.getElementById('metric_bw'),
            pps: document.getElementById('metric_pps'),
            blocked: document.getElementById('metric_blocked'),
            amp: document.getElementById('metric_amp')
        };
        this.reset();
    }

    reset() {
        this.stats = {
            totalBitsVictim: 0, // for bandwidth tracking per interval
            ppsVictim: 0,
            packetsBlockedTotal: 0,
            currentAmp: 30
        };
        // Explicitly clear DOM values
        this.dom.bw.innerHTML = '0.00 <span class="unit">Mbps</span>';
        this.dom.pps.innerHTML = '0 <span class="unit">pps</span>';
        this.dom.blocked.textContent = '0';
        this.dom.amp.textContent = this.stats.currentAmp + 'x';
        this.dom.bw.classList.remove('warning', 'safe');
    }

    setAmpFactor(factor) {
        this.stats.currentAmp = factor;
        this.dom.amp.textContent = factor + 'x';
    }

    logAttackPacketArrived(packetSize, count = 1) {
        this.stats.totalBitsVictim += (packetSize * 8 * count);
        this.stats.ppsVictim += count;
    }

    logBlockedPacket(count = 1) {
        this.stats.packetsBlockedTotal += count;
        this.dom.blocked.textContent = Math.floor(this.stats.packetsBlockedTotal).toLocaleString();
    }

    /**
     * Called every second to calculate moving averages for rates
     */
    tickSecond() {
        // Mbps = (Bits added in 1 sec) / 1,000,000
        const mbps = (this.stats.totalBitsVictim / 1000000).toFixed(2);

        this.dom.bw.innerHTML = `${mbps} <span class="unit">Mbps</span>`;
        this.dom.pps.innerHTML = `${Math.floor(this.stats.ppsVictim).toLocaleString()} <span class="unit">pps</span>`;

        // Visual warning state based on traffic
        if (parseFloat(mbps) > 10) {
            this.dom.bw.classList.add('warning');
            this.dom.bw.classList.remove('safe');
        } else if (parseFloat(mbps) > 0 && parseFloat(mbps) <= 0.1) {
            this.dom.bw.classList.remove('warning');
            this.dom.bw.classList.add('safe');
        } else if (parseFloat(mbps) === 0) {
            this.dom.bw.classList.remove('warning', 'safe');
        }

        // Reset per-second accumulators
        this.stats.totalBitsVictim *= 0.1; // Smooth decay representing rolling window
        this.stats.ppsVictim *= 0.1;
    }
}

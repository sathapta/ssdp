// Wireshark-like Packet Inspector UI
class PacketInspector {
    constructor(maxRows = 50) {
        this.tbody = document.getElementById('packetLogBody');
        this.maxRows = maxRows;
        this.isPaused = false;

        document.getElementById('btnPause').addEventListener('click', (e) => {
            this.isPaused = !this.isPaused;
            e.target.textContent = this.isPaused ? 'Resume Feed' : 'Pause Feed';
        });

        document.getElementById('btnClear').addEventListener('click', () => {
            this.tbody.innerHTML = '';
        });
    }

    /**
     * @param {Object} packet The packet to log
     */
    logPacket(packet) {
        if (this.isPaused) return;

        const row = document.createElement('tr');

        let rowClass = 'row-normal';
        if (packet.status === 'blocked') rowClass = 'row-blocked';
        else if (packet.type === 'spoofed') rowClass = 'row-spoofed';
        else if (packet.type === 'amp') rowClass = 'row-amp';

        row.className = rowClass;

        // Source highlighting based on spoofing status
        let sourceHtml = packet.srcIP;
        if (packet.isSpoofed) {
            sourceHtml = `<span class="spoofed-text" title="Spoofed! Real IP: ${packet.realSrcIP}">${packet.srcIP}</span>`;
        }

        row.innerHTML = `
            <td>${packet.id}</td>
            <td>${packet.time}</td>
            <td>${sourceHtml}:${packet.srcPort}</td>
            <td>${packet.dstIP}:${packet.dstPort}</td>
            <td>${packet.protocol}</td>
            <td>${packet.method}</td>
            <td>${this.formatStatus(packet)}</td>
        `;

        this.tbody.prepend(row);

        // Limit size
        while (this.tbody.children.length > this.maxRows) {
            this.tbody.removeChild(this.tbody.lastChild);
        }
    }

    formatStatus(packet) {
        if (packet.status === 'blocked') {
            return `BLOCKED (${packet.blockedAt.toUpperCase()})`;
        }
        if (packet.type === 'spoofed') return "Spoofed";
        if (packet.type === 'amp') return "Amplified";
        return "Normal";
    }
}

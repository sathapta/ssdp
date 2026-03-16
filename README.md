# SSDP Reflection Attack Simulator (DrDoS)

An interactive, educational dashboard designed for junior network engineers to understand and simulate Simple Service Discovery Protocol (SSDP) Reflection/Amplification attacks. The simulation provides real-time visualizations of DDoS traffic flow and demonstrates how different ISP layers can mitigate these threats.

## 🚀 Features

*   **Advanced Attack Flow (Fan-out Model):**
    *   Simulates realistic DrDoS where a single CPE acts as a gateway to multiple internal LAN devices.
    *   A spoofed M-SEARCH request hits the CPE and "fans out" to multiple LAN devices.
    *   Each LAN device independently generates an amplified response back to the victim.
*   **Interactive Simulation Modes:**
    *   `Normal Mode`: Demonstrates standard LAN traffic between internal devices.
    *   `Attack Mode`: Simulates the spoof-and-reflect cycle with high-volume DrDoS traffic.
    *   `Mitigation Mode`: Allows toggling defensive rules to observe their real-time impact.
*   **Premium Visual Topology:**
    *   **Custom SVG Icons:** Detailed network symbols (Skull for Attacker, Cloud for Internet, Circle Routers for ISPs, Monitor for LAN devices).
    *   **Dynamic Pathing:** Real-time animated paths across the entire stack (`Attacker -> Internet -> ISP Layers -> CPE -> Multiple LAN Devices`).
    *   **Responsive Layout:** Compacted management panel designed to fit modern screens without excessive scrolling.
*   **Multi-layer ISP Mitigations:**
    *   **IGW (Tier 1):** BCP38/uRPF (Anti-spoofing) and Inbound Rate Limiting.
    *   **BGW (Tier 2):** ACL Block for UDP 1900 from WAN.
    *   **BNG (Tier 3):** Strict ACL Block for UDP 1900.
    *   **CPE (Customer):** WAN-side SSDP firewall.
*   **Live Metrics & Packet Inspector:**
    *   Real-time counters for Victim Bandwidth (Mbps), Packet Rate (pps), and Packets Blocked.
    *   Live Wireshark-style stream showing packet lifecycle from generation to block/delivery.

## 🛠️ Technology Stack

This project is built purely with frontend web technologies for maximum portability.

*   **HTML5 / SVG** (Custom drawn vector networking icons)
*   **CSS3** (Variables, Grid, Flexbox, Keyframe Animations, Neon Glows)
*   **Vanilla JavaScript** (ES6+, Functional simulation logic)

## 💻 How to Run

1.  Clone or download this repository.
2.  Open the directory: `e:\ssdp`
3.  Double-click **`index.html`** to run in any modern browser.

## 📖 Educational Context

This simulator teaches the **3 Phased DrDoS Cycle**:
1.  **Spoofing:** The attacker forges the Source IP of a tiny 100-byte `M-SEARCH` request to match the Victim's IP.
2.  **Reflection:** The request hits the CPE (gateway) which scatters it to internal UPnP devices.
3.  **Amplification:** Every internal device responds with a massive (3,000+ byte) descriptor XML. These responses converge on the Victim simultaneously, creating a multi-Gbps flood from a tiny attacker stream.

Effective mitigation involves **Anti-Spoofing (BCP38)** at the Internet Gateway, which prevents spoofed traffic from even entering the ISP's network core.

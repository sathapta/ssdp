# SSDP Reflection Attack Simulator (DrDoS)

An interactive, educational dashboard designed for junior network engineers to understand and simulate Simple Service Discovery Protocol (SSDP) Reflection/Amplification attacks. The simulation provides real-time visualizations of DDoS traffic flow and demonstrates how different ISP layers can mitigate these threats.

## 🚀 Features

*   **Interactive Simulation Modes:**
    *   `Normal Mode`: Demonstrates standard LAN-based SSDP M-SEARCH traffic.
    *   `Attack Mode`: Simulates a Distributed Reflection Denial of Service (DrDoS) attack utilizing source-IP spoofing to trick CPEs into amplifying traffic toward a victim.
    *   `Mitigation Mode`: Allows toggling defensive rules across various network layers to observe their impact on the attack.
*   **Real-time Visual Topology:**
    *   Dynamic SVG network path mapping (`Attacker -> Internet -> IGW -> BGW -> BNG -> CPE -> LAN`).
    *   Animated packet flows highlighting spoofed requests (red) and amplified responses (orange).
*   **Multi-layer ISP Mitigations:**
    *   **IGW (Tier 1):** BCP38/uRPF to drop spoofed IPs, and inbound UDP 1900 rate limiting.
    *   **BGW (Tier 2):** ACL blocks on inbound UDP 1900 from the WAN.
    *   **BNG (Tier 3):** Per-subscriber traffic rate limits.
    *   **CPE (Customer):** Disabling WAN-side UPnP/SSDP responses.
*   **Live Metrics & Packet Inspector:**
    *   Real-time counters for Victim Bandwidth (Mbps), Packet Rate (pps), Packets Blocked, and Amplification Factor.
    *   A Wireshark-style packet log detailing source/destination IPs (including spoofed indicators) and packet status.

## 🛠️ Technology Stack

This project is built purely with frontend web technologies, requiring no backend or build tools, ensuring maximum portability.

*   **HTML5**
*   **CSS3** (Variables, Grid, Flexbox, Keyframe Animations, Glassmorphism)
*   **Vanilla JavaScript** (ES6+)

## 💻 How to Run

Because this is a static frontend application, no installation or web server is required.

1.  Clone or download this repository to your local machine.
2.  Open the `e:\ssdp` directory.
3.  Double-click **`index.html`** to open it directly in your modern web browser (Chrome, Firefox, Edge, Safari).

## 📖 Educational Context

This simulator is designed to teach the mechanics of an Amplification Attack:
1.  **Spoofing:** The attacker forges the Source IP address of their SSDP `M-SEARCH` request to match the IP of the *Victim*.
2.  **Reflection:** The attacker sends this tiny crafted packet to millions of publicly exposed, vulnerable routers (CPEs). 
3.  **Amplification:** The CPEs process the request and send a massive `HTTP 200 OK` device descriptor response back to the Source IP. Because the Source IP was spoofed, the massive response hits the Victim, overwhelming their bandwidth.

Mitigating these attacks requires defense-in-depth, preferably stopping the spoofed packets at the Internet Gateway (IGW) using Anti-Spoofing (BCP38) before they ever reach the vulnerable CPEs.

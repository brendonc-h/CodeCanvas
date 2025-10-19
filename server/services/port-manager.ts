export class PortManager {
  private static instance: PortManager;
  private allocatedPorts: Set<number> = new Set();

  // Port range for sandboxes
  private readonly MIN_PORT = 8000;
  private readonly MAX_PORT = 8999;

  private constructor() {}

  static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  /**
   * Allocate a unique port for a sandbox
   */
  allocatePort(): number {
    // Find an available port
    for (let port = this.MIN_PORT; port <= this.MAX_PORT; port++) {
      if (!this.allocatedPorts.has(port)) {
        this.allocatedPorts.add(port);
        return port;
      }
    }

    throw new Error('No available ports in the pool');
  }

  /**
   * Release a port back to the pool
   */
  releasePort(port: number): void {
    this.allocatedPorts.delete(port);
  }

  /**
   * Check if a port is available
   */
  isPortAvailable(port: number): boolean {
    return port >= this.MIN_PORT && port <= this.MAX_PORT && !this.allocatedPorts.has(port);
  }

  /**
   * Get all allocated ports
   */
  getAllocatedPorts(): number[] {
    return Array.from(this.allocatedPorts);
  }

  /**
   * Get available port count
   */
  getAvailablePortCount(): number {
    return (this.MAX_PORT - this.MIN_PORT + 1) - this.allocatedPorts.size;
  }
}

export const portManager = PortManager.getInstance();

import Docker from 'dockerode';
import { randomUUID } from 'crypto';
import { portManager } from './services/port-manager';

const docker = new Docker();

// Default resource limits (configurable via environment variables)
const DEFAULT_CPU_LIMIT = parseFloat(process.env.SANDBOX_CPU_LIMIT || '0.5');
const DEFAULT_MEMORY_MB = parseInt(process.env.SANDBOX_MEMORY_MB || '512');
const DEFAULT_PIDS_LIMIT = parseInt(process.env.SANDBOX_PIDS_LIMIT || '256');

export interface SandboxConfig {
  projectId: string;
  userId: string;
  workingDir: string;
  cpus?: number;
  memory?: number; // in MB
  pidsLimit?: number;
}

export class DockerManager {
  public docker: Docker;

  constructor() {
    this.docker = docker;
  }

  async createSandbox(config: SandboxConfig): Promise<{
    containerId: string;
    port: number;
  }> {
    const containerName = `sandbox-${config.projectId}-${randomUUID().slice(0, 8)}`;
    
    // Allocate a port from the pool
    const hostPort = portManager.allocatePort();

    // Use provided values or defaults
    const cpus = config.cpus ?? DEFAULT_CPU_LIMIT;
    const memory = config.memory ?? DEFAULT_MEMORY_MB;
    const pidsLimit = config.pidsLimit ?? DEFAULT_PIDS_LIMIT;

    const container = await docker.createContainer({
      Image: 'node:20-alpine',
      name: containerName,
      Cmd: ['/bin/sh'],
      Tty: true,
      OpenStdin: true,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: '/workspace',
      HostConfig: {
        Binds: [`${config.workingDir}:/workspace`],
        AutoRemove: true,
        CpuQuota: cpus * 100000, // 0.5 CPU = 50000
        Memory: memory * 1024 * 1024,
        PidsLimit: pidsLimit,
        PortBindings: {
          // Map common dev server ports to same host port (app will bind to one)
          '5173/tcp': [{ HostPort: hostPort.toString() }],
          '3000/tcp': [{ HostPort: (hostPort + 1).toString() }],
          '8000/tcp': [{ HostPort: (hostPort + 2).toString() }],
        },
      },
      ExposedPorts: {
        '5173/tcp': {},
        '3000/tcp': {},
        '8000/tcp': {},
      },
      User: 'node', // Run as non-root
    });

    await container.start();

    return {
      containerId: container.id,
      port: hostPort, // Return the allocated port
    };
  }

  async execCommand(
    containerId: string,
    command: string[],
    onOutput: (data: string) => void,
    onError?: (data: string) => void
  ): Promise<void> {
    const container = docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });

    const stream = await exec.start({ Tty: false, stdin: false });

    stream.on('data', (chunk: Buffer) => {
      // Docker multiplexes stdout/stderr, first byte indicates stream type
      const data = chunk.toString('utf8');
      onOutput(data);
    });

    stream.on('error', (error: Error) => {
      if (onError) onError(error.message);
    });

    return new Promise((resolve) => {
      stream.on('end', resolve);
    });
  }

  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = docker.getContainer(containerId);
      await container.stop();
    } catch (error) {
      console.error('Error stopping container:', error);
    }
  }

  async stopAndReleaseContainer(containerId: string, port?: number): Promise<void> {
    try {
      await this.stopContainer(containerId);
      // Release the port back to the pool if provided
      if (port) {
        portManager.releasePort(port);
      }
    } catch (error) {
      console.error('Error stopping and releasing container:', error);
    }
  }

  async removeContainer(containerId: string): Promise<void> {
    try {
      const container = docker.getContainer(containerId);
      await container.remove({ force: true });
    } catch (error) {
      console.error('Error removing container:', error);
    }
  }

  async getContainerStats(containerId: string): Promise<any> {
    const container = docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });
    return stats;
  }
}

export const dockerManager = new DockerManager();

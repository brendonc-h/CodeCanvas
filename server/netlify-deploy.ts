import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import FormData from 'form-data';
import archiver from 'archiver';
import { createWriteStream } from 'fs';

const NETLIFY_API_URL = 'https://api.netlify.com/api/v1';
const NETLIFY_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;

export interface DeployConfig {
  projectPath: string;
  buildDir: string; // e.g., 'dist' or 'out' or '.'
  siteId?: string;
}

export class NetlifyDeploy {
  async deploy(config: DeployConfig): Promise<{
    siteId: string;
    deployUrl: string;
    siteUrl: string;
  }> {
    if (!NETLIFY_TOKEN) {
      throw new Error('NETLIFY_ACCESS_TOKEN not configured');
    }

    const headers = {
      Authorization: `Bearer ${NETLIFY_TOKEN}`,
    };

    // Create or get site
    let siteId = config.siteId;
    if (!siteId) {
      const site = await axios.post(
        `${NETLIFY_API_URL}/sites`,
        {},
        { headers }
      );
      siteId = site.data.id;
    }

    // Create zip of build directory
    const buildPath = path.join(config.projectPath, config.buildDir);
    const zipPath = path.join(config.projectPath, 'deploy.zip');
    
    await this.zipDirectory(buildPath, zipPath);

    // Upload zip to Netlify
    const zipBuffer = await fs.readFile(zipPath);
    
    const deployResponse = await axios.post(
      `${NETLIFY_API_URL}/sites/${siteId}/deploys`,
      zipBuffer,
      {
        headers: {
          ...headers,
          'Content-Type': 'application/zip',
        },
      }
    );

    // Clean up zip
    await fs.unlink(zipPath).catch(() => {});

    return {
      siteId: siteId || '',
      deployUrl: deployResponse.data.deploy_ssl_url || deployResponse.data.ssl_url || '',
      siteUrl: deployResponse.data.ssl_url || '',
    };
  }

  private async zipDirectory(sourceDir: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = createWriteStream(outPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', resolve);
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }
}

export const netlifyDeploy = new NetlifyDeploy();

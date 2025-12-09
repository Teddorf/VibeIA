import { Injectable } from '@nestjs/common';
import { DependencyInfo, Dependency, OutdatedDependency } from '../dto/analysis-result.dto';

@Injectable()
export class DependenciesAnalyzer {
  analyze(
    packageJson?: Record<string, any>,
    requirementsTxt?: string,
    goMod?: string,
    cargoToml?: string,
  ): DependencyInfo {
    const production: Dependency[] = [];
    const development: Dependency[] = [];

    // Parse npm dependencies
    if (packageJson) {
      const npmProd = this.parseNpmDependencies(packageJson.dependencies || {}, 'npm');
      const npmDev = this.parseNpmDependencies(packageJson.devDependencies || {}, 'npm');
      production.push(...npmProd);
      development.push(...npmDev);
    }

    // Parse Python dependencies
    if (requirementsTxt) {
      const pyDeps = this.parsePythonDependencies(requirementsTxt);
      production.push(...pyDeps);
    }

    // Parse Go dependencies
    if (goMod) {
      const goDeps = this.parseGoDependencies(goMod);
      production.push(...goDeps);
    }

    // Parse Rust dependencies
    if (cargoToml) {
      const rustDeps = this.parseCargoToml(cargoToml);
      production.push(...rustDeps);
    }

    return {
      production,
      development,
      outdated: [], // Would require external API calls to check versions
      total: production.length + development.length,
    };
  }

  private parseNpmDependencies(
    deps: Record<string, string>,
    type: string,
  ): Dependency[] {
    return Object.entries(deps).map(([name, version]) => ({
      name,
      version: this.cleanVersion(version),
      type,
    }));
  }

  private parsePythonDependencies(requirementsTxt: string): Dependency[] {
    const deps: Dependency[] = [];
    const lines = requirementsTxt.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) {
        continue;
      }

      // Parse different formats: package==version, package>=version, package
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:[=<>!~]+(.+))?/);
      if (match) {
        deps.push({
          name: match[1],
          version: match[2] || 'latest',
          type: 'pip',
        });
      }
    }

    return deps;
  }

  private parseGoDependencies(goMod: string): Dependency[] {
    const deps: Dependency[] = [];
    const lines = goMod.split('\n');
    let inRequireBlock = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('require (')) {
        inRequireBlock = true;
        continue;
      }

      if (trimmed === ')') {
        inRequireBlock = false;
        continue;
      }

      // Single require statement or inside block
      const requireMatch = trimmed.match(/^(?:require\s+)?([^\s]+)\s+v?([^\s]+)/);
      if (requireMatch && (inRequireBlock || trimmed.startsWith('require'))) {
        deps.push({
          name: requireMatch[1],
          version: requireMatch[2],
          type: 'go',
        });
      }
    }

    return deps;
  }

  private parseCargoToml(cargoToml: string): Dependency[] {
    const deps: Dependency[] = [];
    const lines = cargoToml.split('\n');
    let inDependencies = false;
    let inDevDependencies = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '[dependencies]') {
        inDependencies = true;
        inDevDependencies = false;
        continue;
      }

      if (trimmed === '[dev-dependencies]') {
        inDependencies = false;
        inDevDependencies = true;
        continue;
      }

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        inDependencies = false;
        inDevDependencies = false;
        continue;
      }

      if (inDependencies || inDevDependencies) {
        // Parse: package = "version" or package = { version = "x.y.z" }
        const simpleMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
        const complexMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/);

        const match = simpleMatch || complexMatch;
        if (match) {
          deps.push({
            name: match[1],
            version: match[2],
            type: 'cargo',
          });
        }
      }
    }

    return deps;
  }

  private cleanVersion(version: string): string {
    // Remove ^ and ~ prefixes
    return version.replace(/^[\^~]/, '');
  }
}

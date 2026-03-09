import { ImportedProjectWizardData } from '../interfaces/llm-provider.interface';

const PLAN_TYPE_DESCRIPTIONS: Record<string, string> = {
  feature: 'Add new functionality to the existing codebase',
  refactor: 'Improve code quality, structure, and maintainability',
  fix: 'Fix bugs, issues, or technical debt',
  upgrade: 'Update dependencies, frameworks, or migrate to newer versions',
  optimize:
    'Improve performance, reduce resource usage, or optimize algorithms',
  security: 'Fix security vulnerabilities and improve security posture',
};

export function buildPlanPrompt(wizardData: any): string {
  const { stage1, stage2, stage3 } = wizardData;

  return `You are an expert software architect. Generate an ultra-granular implementation plan based on the following project requirements.

PROJECT: ${stage1.projectName}
DESCRIPTION: ${stage1.description}

BUSINESS REQUIREMENTS:
${Object.entries(stage2)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

SELECTED ARCHITECTURE PATTERNS:
${stage3.selectedArchetypes.join(', ')}

RULES:
1. Each task MUST be 10 minutes
2. Tasks must have clear dependencies
3. Group tasks into logical phases (Infrastructure, Features, Testing)
4. Provide realistic time estimates
5. Include test generation for each feature

OUTPUT FORMAT (JSON):
{
  "phases": [
    {
      "name": "Phase Name",
      "estimatedTime": 60,
      "tasks": [
        {
          "id": "t1",
          "name": "Task Name",
          "description": "Detailed description",
          "estimatedTime": 10,
          "dependencies": []
        }
      ]
    }
  ],
  "estimatedTime": 180
}

Generate the plan now:`;
}

export function buildImportedProjectPlanPrompt(
  wizardData: ImportedProjectWizardData,
): string {
  const { stage1, stage2, stage3, existingCodebase, importContext, planType } =
    wizardData;

  const planTypeDesc = planType
    ? PLAN_TYPE_DESCRIPTIONS[planType] || planType
    : 'new feature';

  const structureInfo = formatStructureInfo(existingCodebase);
  const techStackInfo = formatTechStackInfo(existingCodebase);
  const depsInfo = formatDependenciesInfo(existingCodebase);
  const qualityInfo = formatCodeQualityInfo(existingCodebase);
  const suggestionsInfo = existingCodebase?.suggestions?.length
    ? existingCodebase.suggestions.map((s) => `- ${s}`).join('\n')
    : 'None';
  const contextInfo = formatImportContextInfo(importContext);

  return `You are an expert software architect analyzing an EXISTING project. Generate a plan to ${planTypeDesc}.

IMPORTANT: This is an EXISTING codebase. You must:
1. RESPECT the existing architecture and patterns
2. NOT break existing functionality
3. Build upon what already exists
4. Suggest incremental, safe changes

PROJECT: ${stage1.projectName}
USER'S GOAL: ${stage1.description}
PLAN TYPE: ${planType || 'feature'} - ${planTypeDesc}

EXISTING CODEBASE ANALYSIS:
STRUCTURE:${structureInfo}
TECH STACK:${techStackInfo}
DEPENDENCIES:${depsInfo}
CODE QUALITY:${qualityInfo}

EXISTING SUGGESTIONS FOR IMPROVEMENT:
${suggestionsInfo}

USER REQUIREMENTS:
${Object.entries(stage2)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

SELECTED PATTERNS/APPROACHES:
${stage3.selectedArchetypes.join(', ')}
${contextInfo}

PHASE SUGGESTIONS FOR "${planType || 'feature'}" TYPE PLANS:
${getPhaseSuggestions(planType)}

RULES:
1. Each task MUST be approximately 10 minutes of work
2. Tasks must have clear dependencies (reference by task ID)
3. Start with analysis/preparation tasks
4. Include tasks for updating existing tests
5. Include a final verification/testing phase

OUTPUT FORMAT (JSON only, no markdown):
{
  "phases": [
    {
      "name": "Phase Name",
      "estimatedTime": 60,
      "tasks": [
        {
          "id": "t1",
          "name": "Task Name",
          "description": "Detailed description including which files to modify",
          "estimatedTime": 10,
          "dependencies": []
        }
      ]
    }
  ],
  "estimatedTime": 180
}

Generate the plan now:`;
}

function formatStructureInfo(
  existingCodebase: ImportedProjectWizardData['existingCodebase'],
): string {
  if (!existingCodebase?.structure) return 'Not available';
  const s = existingCodebase.structure;
  return `
- Has Backend: ${s.hasBackend ? 'Yes' : 'No'}
- Has Frontend: ${s.hasFrontend ? 'Yes' : 'No'}
- Is Monorepo: ${s.isMonorepo ? 'Yes' : 'No'}
- Total Files: ${s.totalFiles}
- Root Directories: ${s.directories.join(', ')}`;
}

function formatTechStackInfo(
  existingCodebase: ImportedProjectWizardData['existingCodebase'],
): string {
  if (!existingCodebase?.techStack) return 'Not available';
  const t = existingCodebase.techStack;
  return `
- Languages: ${t.languages.map((l) => `${l.name} (${l.percentage}%)`).join(', ')}
- Frameworks: ${t.frameworks.map((f) => f.name).join(', ') || 'None detected'}
- Databases: ${t.databases.join(', ') || 'None detected'}
- Testing: ${t.testing.join(', ') || 'None detected'}
- Build Tools: ${t.buildTools.join(', ') || 'None detected'}`;
}

function formatDependenciesInfo(
  existingCodebase: ImportedProjectWizardData['existingCodebase'],
): string {
  if (!existingCodebase?.dependencies) return 'Not available';
  const d = existingCodebase.dependencies;
  return `
- Total Dependencies: ${d.total}
- Production: ${d.production.length} packages
- Development: ${d.development.length} packages`;
}

function formatCodeQualityInfo(
  existingCodebase: ImportedProjectWizardData['existingCodebase'],
): string {
  if (!existingCodebase?.codeQuality) return 'Not available';
  const q = existingCodebase.codeQuality;
  return `
- Has Linting: ${q.hasLinting ? 'Yes' : 'No'}
- Has TypeScript: ${q.hasTypeScript ? 'Yes' : 'No'}
- Has Tests: ${q.hasTests ? 'Yes' : 'No'}
- Has CI/CD: ${q.hasCI ? 'Yes' : 'No'}`;
}

function formatImportContextInfo(
  importContext: ImportedProjectWizardData['importContext'],
): string {
  if (!importContext) return '';
  let contextInfo = '';
  if (importContext.focusAreas?.length) {
    contextInfo += `\nFocus Areas: ${importContext.focusAreas.join(', ')}`;
  }
  if (importContext.excludeAreas?.length) {
    contextInfo += `\nExclude Areas: ${importContext.excludeAreas.join(', ')}`;
  }
  if (importContext.targetFiles?.length) {
    contextInfo += `\nTarget Files: ${importContext.targetFiles.join(', ')}`;
  }
  return contextInfo;
}

function getPhaseSuggestions(planType?: string): string {
  switch (planType) {
    case 'feature':
      return '- Analysis & Design\n- Implementation\n- Testing\n- Documentation';
    case 'refactor':
      return '- Analysis\n- Preparation (add tests)\n- Refactoring\n- Verification';
    case 'fix':
      return '- Investigation\n- Fix Implementation\n- Testing\n- Verification';
    case 'upgrade':
      return '- Compatibility Check\n- Dependency Updates\n- Code Migration\n- Testing';
    case 'optimize':
      return '- Profiling\n- Optimization\n- Benchmarking\n- Verification';
    case 'security':
      return '- Audit\n- Remediation\n- Hardening\n- Security Testing';
    default:
      return '- Planning\n- Implementation\n- Testing\n- Documentation';
  }
}

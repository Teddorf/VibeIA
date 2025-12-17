'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Copy, Upload, ArrowLeft } from 'lucide-react';

export interface ExpertModeConfig {
  projectName: string;
  description: string;
  stack: string;
  features: string[];
  infra: string;
  autoExecute: boolean;
}

interface ExpertModeProps {
  onComplete: (config: ExpertModeConfig) => void;
  onBack?: () => void;
  initialData?: Partial<ExpertModeConfig>;
}

interface Template {
  id: string;
  name: string;
  features: string[];
  stack: string;
}

const TEMPLATES: Template[] = [
  { id: 'custom', name: 'Custom', features: [], stack: '' },
  { id: 'saas', name: 'SaaS', features: ['auth', 'payments'], stack: 'nextjs' },
  { id: 'ecommerce', name: 'E-commerce', features: ['auth', 'payments', 'email'], stack: 'nextjs' },
  { id: 'api', name: 'API', features: ['auth'], stack: 'nestjs' },
  { id: 'landing', name: 'Landing', features: [], stack: 'nextjs' },
];

const STACKS = [
  { id: '', name: 'Seleccionar...' },
  { id: 'nextjs', name: 'Next.js' },
  { id: 'nestjs', name: 'NestJS' },
  { id: 'react', name: 'React' },
  { id: 'vue', name: 'Vue.js' },
  { id: 'express', name: 'Express' },
];

const INFRA_OPTIONS = [
  { id: 'auto', name: 'Auto-detectar' },
  { id: 'vercel', name: 'Vercel' },
  { id: 'railway', name: 'Railway' },
  { id: 'render', name: 'Render' },
  { id: 'aws', name: 'AWS' },
];

const FEATURES = [
  { id: 'auth', name: 'Auth', time: 4 },
  { id: 'payments', name: 'Payments', time: 6 },
  { id: 'email', name: 'Email', time: 2 },
  { id: 'storage', name: 'Storage', time: 2 },
  { id: 'analytics', name: 'Analytics', time: 1 },
];

// Base time in hours
const BASE_TIME = 8;
const COST_PER_HOUR = 0.15; // $0.15 per hour of LLM usage

export function ExpertMode({ onComplete, onBack, initialData }: ExpertModeProps) {
  const [projectName, setProjectName] = useState(initialData?.projectName || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [stack, setStack] = useState(initialData?.stack || '');
  const [features, setFeatures] = useState<string[]>(initialData?.features || []);
  const [infra, setInfra] = useState(initialData?.infra || 'auto');
  const [template, setTemplate] = useState('custom');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const isValid = projectName.trim().length > 0;

  const estimatedTime = useMemo(() => {
    let time = BASE_TIME;
    features.forEach((f) => {
      const feature = FEATURES.find((feat) => feat.id === f);
      if (feature) time += feature.time;
    });
    return time;
  }, [features]);

  const estimatedCost = useMemo(() => {
    return (estimatedTime * COST_PER_HOUR).toFixed(2);
  }, [estimatedTime]);

  const yamlPreview = useMemo(() => {
    return `project: ${projectName || '(sin nombre)'}
description: ${description || '(sin descripción)'}
stack: ${stack || 'auto'}
features:
${features.length > 0 ? features.map((f) => `  - ${f}`).join('\n') : '  # ninguna seleccionada'}
infra: ${infra}`;
  }, [projectName, description, stack, features, infra]);

  const handleTemplateChange = (templateId: string) => {
    setTemplate(templateId);
    const selectedTemplate = TEMPLATES.find((t) => t.id === templateId);
    if (selectedTemplate && templateId !== 'custom') {
      setFeatures(selectedTemplate.features);
      if (selectedTemplate.stack) {
        setStack(selectedTemplate.stack);
      }
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    setFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId]
    );
  };

  const handleCopyConfig = useCallback(async () => {
    await navigator.clipboard.writeText(yamlPreview);
  }, [yamlPreview]);

  const handleImport = () => {
    setImportError(null);

    // Don't process empty input
    if (!importText.trim()) {
      setImportError('Por favor ingresa una configuración para importar');
      return;
    }

    try {
      let parsed: Record<string, unknown>;

      // Try JSON first
      if (importText.trim().startsWith('{')) {
        parsed = JSON.parse(importText);
      } else {
        // Parse simple YAML
        parsed = parseSimpleYaml(importText);
      }

      if (parsed.project || parsed.projectName) {
        setProjectName((parsed.project || parsed.projectName) as string);
      }
      if (parsed.description) {
        setDescription(parsed.description as string);
      }
      if (parsed.stack) {
        setStack(parsed.stack as string);
      }
      if (parsed.features && Array.isArray(parsed.features)) {
        setFeatures(parsed.features as string[]);
      }
      if (parsed.infra) {
        setInfra(parsed.infra as string);
      }

      setShowImportModal(false);
      setImportText('');
    } catch {
      setImportError('Error de sintaxis: YAML/JSON inválido');
    }
  };

  const parseSimpleYaml = (yaml: string): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');

    // Check for syntax errors (multiple colons in key position)
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
        const colonCount = (trimmed.match(/:/g) || []).length;
        if (colonCount > 1) {
          const parts = trimmed.split(':');
          // If the key part itself contains a colon, that's invalid
          if (parts[0].includes(':')) {
            throw new Error('Invalid YAML syntax');
          }
        }
      }
    }

    let currentKey = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('-')) {
        // Array item
        if (currentKey && !result[currentKey]) {
          result[currentKey] = [];
        }
        if (currentKey && Array.isArray(result[currentKey])) {
          (result[currentKey] as string[]).push(trimmed.slice(1).trim());
        }
      } else if (trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        currentKey = key.trim();
        if (value) {
          result[currentKey] = value;
        }
      }
    }

    return result;
  };

  const handleGenerate = (autoExecute: boolean) => {
    if (!isValid) {
      setHasAttemptedSubmit(true);
      return;
    }

    onComplete({
      projectName,
      description,
      stack,
      features,
      infra,
      autoExecute,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Modo Experto</h2>
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config Column */}
        <div data-testid="config-column" className="space-y-6">
          {/* Template & Import */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="template-select">Template</Label>
              <select
                id="template-select"
                aria-label="Template"
                value={template}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </Button>
            </div>
          </div>

          {/* Project Name */}
          <div>
            <Label htmlFor="project-name">Nombre del Proyecto</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Mi Proyecto"
              aria-invalid={hasAttemptedSubmit && !isValid}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu proyecto..."
              rows={3}
            />
          </div>

          {/* Stack */}
          <div>
            <Label htmlFor="stack-select">Stack</Label>
            <select
              id="stack-select"
              aria-label="Stack"
              value={stack}
              onChange={(e) => setStack(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            >
              {STACKS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Features */}
          <div>
            <Label>Features</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {FEATURES.map((feature) => (
                <div key={feature.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`feature-${feature.id}`}
                    checked={features.includes(feature.id)}
                    onCheckedChange={() => handleFeatureToggle(feature.id)}
                    aria-label={feature.name}
                  />
                  <Label
                    htmlFor={`feature-${feature.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {feature.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Infra */}
          <div>
            <Label htmlFor="infra-select">Infra</Label>
            <select
              id="infra-select"
              aria-label="Infra"
              value={infra}
              onChange={(e) => setInfra(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background"
            >
              {INFRA_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview Column */}
        <div data-testid="preview-column" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Preview YAML</Label>
            <Button variant="ghost" size="sm" onClick={handleCopyConfig}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
          </div>

          <div
            data-testid="yaml-preview"
            className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm overflow-auto"
          >
            <pre>
              <code>{yamlPreview}</code>
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Tiempo estimado</div>
              <div data-testid="estimated-time" className="text-2xl font-bold">
                {estimatedTime}h
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Costo LLM estimado</div>
              <div data-testid="estimated-cost" className="text-2xl font-bold">
                ${estimatedCost}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!isValid}
              onClick={() => handleGenerate(false)}
            >
              Generar Plan
            </Button>
            <Button
              className="flex-1"
              disabled={!isValid}
              onClick={() => handleGenerate(true)}
            >
              Generar y Ejecutar
            </Button>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Configuración</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-config">YAML o JSON</Label>
              <Textarea
                id="import-config"
                aria-label="config"
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError(null);
                }}
                placeholder={`project: Mi App\nstack: nextjs\nfeatures:\n  - auth\n  - payments`}
                rows={8}
                className="font-mono"
              />
            </div>
            {importError && (
              <div className="text-sm text-red-500">{importError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

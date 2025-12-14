'use client';

import { useState } from 'react';
import { documentationApi } from '@/lib/api-client';

type DocumentationType = 'readme' | 'architecture' | 'changelog' | 'adr' | 'diagram';
type DiagramType = 'sequence' | 'flowchart' | 'erd' | 'class';

interface GeneratedDoc {
  type: string;
  title: string;
  content: string;
  filePath: string;
}

interface GeneratedDiagram {
  type: string;
  title: string;
  code: string;
}

export function DocumentationGenerator({ projectId }: { projectId?: string }) {
  const [activeTab, setActiveTab] = useState<DocumentationType>('readme');
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  // Form states
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [adrTitle, setAdrTitle] = useState('');
  const [adrContext, setAdrContext] = useState('');
  const [adrDecision, setAdrDecision] = useState('');
  const [adrPositive, setAdrPositive] = useState('');
  const [adrNegative, setAdrNegative] = useState('');
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [diagramTitle, setDiagramTitle] = useState('');
  const [diagramEntities, setDiagramEntities] = useState('');
  const [diagramConnections, setDiagramConnections] = useState('');

  const handleGenerateReadme = async () => {
    setLoading(true);
    try {
      const result = await documentationApi.generateDocument({
        projectId: projectId || 'temp',
        type: 'readme',
        context: {
          featureName: projectName,
          description: projectDescription,
        },
      });
      setGeneratedContent(result.content);
    } catch (error) {
      console.error('Error generating README:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateArchitecture = async () => {
    setLoading(true);
    try {
      const result = await documentationApi.generateDocument({
        projectId: projectId || 'temp',
        type: 'architecture',
        context: {
          featureName: projectName,
          description: projectDescription,
        },
      });
      setGeneratedContent(result.content);
    } catch (error) {
      console.error('Error generating Architecture doc:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChangelog = async () => {
    setLoading(true);
    try {
      const result = await documentationApi.generateDocument({
        projectId: projectId || 'temp',
        type: 'changelog',
      });
      setGeneratedContent(result.content);
    } catch (error) {
      console.error('Error generating Changelog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateADR = async () => {
    setLoading(true);
    try {
      const result = await documentationApi.generateADR({
        projectId: projectId || 'temp',
        title: adrTitle,
        context: adrContext,
        decision: adrDecision,
        consequences: {
          positive: adrPositive.split('\n').filter((s) => s.trim()),
          negative: adrNegative.split('\n').filter((s) => s.trim()),
        },
      });
      setGeneratedContent(result.content);
    } catch (error) {
      console.error('Error generating ADR:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDiagram = async () => {
    setLoading(true);
    try {
      // Parse entities (format: "name:type" per line)
      const entities = diagramEntities.split('\n').filter((s) => s.trim()).map((line) => {
        const [name, type] = line.split(':').map((s) => s.trim());
        return { name, type: type || 'service' };
      });

      // Parse connections (format: "from->to:label" per line)
      const relationships = diagramConnections.split('\n').filter((s) => s.trim()).map((line) => {
        const [connection, label] = line.split(':').map((s) => s.trim());
        const [from, to] = connection.split('->').map((s) => s.trim());
        return { from, to, label };
      });

      const result = await documentationApi.generateDiagram({
        projectId: projectId || 'temp',
        type: diagramType,
        title: diagramTitle,
        entities,
        relationships,
      });
      setGeneratedContent('```mermaid\n' + result.code + '\n```');
    } catch (error) {
      console.error('Error generating Diagram:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
    }
  };

  const downloadContent = () => {
    if (generatedContent) {
      const blob = new Blob([generatedContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="border-b">
        <div className="flex">
          {(['readme', 'architecture', 'changelog', 'adr', 'diagram'] as DocumentationType[]).map((tab) => (
            <button
              key={tab}
              className={`px-4 py-3 text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => {
                setActiveTab(tab);
                setGeneratedContent(null);
              }}
            >
              {tab === 'adr' ? 'ADR' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* README Tab */}
        {activeTab === 'readme' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generate README</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="My Awesome Project"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="A brief description of your project..."
              />
            </div>
            <button
              onClick={handleGenerateReadme}
              disabled={loading || !projectName}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate README'}
            </button>
          </div>
        )}

        {/* Architecture Tab */}
        {activeTab === 'architecture' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generate Architecture Documentation</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="My Project"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Describe the architecture..."
              />
            </div>
            <button
              onClick={handleGenerateArchitecture}
              disabled={loading || !projectName}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Architecture Doc'}
            </button>
          </div>
        )}

        {/* Changelog Tab */}
        {activeTab === 'changelog' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generate Changelog</h3>
            <p className="text-gray-600">
              Generate a new changelog file following the Keep a Changelog format.
            </p>
            <button
              onClick={handleGenerateChangelog}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Changelog'}
            </button>
          </div>
        )}

        {/* ADR Tab */}
        {activeTab === 'adr' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generate Architecture Decision Record</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={adrTitle}
                onChange={(e) => setAdrTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Use PostgreSQL as Primary Database"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Context</label>
              <textarea
                value={adrContext}
                onChange={(e) => setAdrContext(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="What is the issue that requires a decision?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
              <textarea
                value={adrDecision}
                onChange={(e) => setAdrDecision(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="What decision was made?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Positive Consequences (one per line)
                </label>
                <textarea
                  value={adrPositive}
                  onChange={(e) => setAdrPositive(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={4}
                  placeholder="Better performance&#10;Easier maintenance"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Negative Consequences (one per line)
                </label>
                <textarea
                  value={adrNegative}
                  onChange={(e) => setAdrNegative(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={4}
                  placeholder="More complexity&#10;Learning curve"
                />
              </div>
            </div>
            <button
              onClick={handleGenerateADR}
              disabled={loading || !adrTitle || !adrContext || !adrDecision}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate ADR'}
            </button>
          </div>
        )}

        {/* Diagram Tab */}
        {activeTab === 'diagram' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generate Mermaid Diagram</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Diagram Type</label>
              <select
                value={diagramType}
                onChange={(e) => setDiagramType(e.target.value as DiagramType)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="flowchart">Flowchart</option>
                <option value="sequence">Sequence Diagram</option>
                <option value="erd">Entity Relationship</option>
                <option value="class">Class Diagram</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={diagramTitle}
                onChange={(e) => setDiagramTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="System Architecture"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entities (name:type per line)
              </label>
              <textarea
                value={diagramEntities}
                onChange={(e) => setDiagramEntities(e.target.value)}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                rows={4}
                placeholder="Frontend:service&#10;Backend:service&#10;Database:database"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connections (from-&gt;to:label per line)
              </label>
              <textarea
                value={diagramConnections}
                onChange={(e) => setDiagramConnections(e.target.value)}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                rows={4}
                placeholder="Frontend->Backend:API&#10;Backend->Database:Query"
              />
            </div>
            <button
              onClick={handleGenerateDiagram}
              disabled={loading || !diagramTitle}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Diagram'}
            </button>
          </div>
        )}

        {/* Generated Content */}
        {generatedContent && (
          <div className="mt-6 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">Generated Content</h4>
              <div className="space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  Copy
                </button>
                <button
                  onClick={downloadContent}
                  className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                >
                  Download
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-sm font-mono whitespace-pre-wrap">{generatedContent}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentationGenerator;

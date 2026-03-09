export function buildCodePrompt(task: any, context: any): string {
  return `You are an expert senior software engineer. Your task is to implement the following task.

TASK: ${task.name}
DESCRIPTION: ${task.description}

PROJECT CONTEXT:
- Project: ${context.projectName}
- Tech Stack: ${context.technologies?.join(', ') || 'Not specified'}
- Architecture: ${context.architecture?.join(', ') || 'Not specified'}

INSTRUCTIONS:
1. Generate the necessary code files to complete this task.
2. Ensure code is production-ready, typed (if TS), and follows best practices.
3. Return ONLY valid JSON with the following structure:

{
  "files": [
    {
      "path": "src/path/to/file.ts",
      "content": "full code content here"
    }
  ]
}

Do not include markdown formatting or explanations outside the JSON.`;
}

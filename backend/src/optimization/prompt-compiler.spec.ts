import { PromptCompiler, PromptModule } from './prompt-compiler';

describe('PromptCompiler', () => {
  let compiler: PromptCompiler;

  beforeEach(() => {
    compiler = new PromptCompiler();
  });

  it('should register and compile prompt modules', () => {
    compiler.registerModule({
      id: 'base',
      content: 'You are a coding assistant.',
      tokenCount: 10,
      applicableTo: ['*'],
      requiredFor: ['coder'],
    });

    compiler.registerModule({
      id: 'review-rules',
      content: 'Follow code review best practices.',
      tokenCount: 15,
      applicableTo: ['reviewer'],
      requiredFor: ['reviewer'],
    });

    const prompt = compiler.compileSystemPrompt('coder', 'code-generation');
    expect(prompt).toContain('coding assistant');
    expect(prompt).not.toContain('review best practices');
  });

  it('should include modules applicable to task type', () => {
    compiler.registerModule({
      id: 'testing-guide',
      content: 'Write comprehensive tests.',
      tokenCount: 12,
      applicableTo: ['testing'],
      requiredFor: [],
    });

    const prompt = compiler.compileSystemPrompt('tester', 'testing');
    expect(prompt).toContain('comprehensive tests');
  });

  it('should prioritize required modules', () => {
    compiler.registerModule({
      id: 'optional',
      content: 'Optional content.',
      tokenCount: 5,
      applicableTo: ['*'],
      requiredFor: [],
    });

    compiler.registerModule({
      id: 'required',
      content: 'Required content.',
      tokenCount: 100,
      applicableTo: ['*'],
      requiredFor: ['coder'],
    });

    const prompt = compiler.compileSystemPrompt('coder', 'code-generation');
    const reqIdx = prompt.indexOf('Required');
    const optIdx = prompt.indexOf('Optional');
    expect(reqIdx).toBeLessThan(optIdx);
  });

  it('should include additional modules by id', () => {
    compiler.registerModule({
      id: 'special',
      content: 'Special instructions.',
      tokenCount: 8,
      applicableTo: [],
      requiredFor: [],
    });

    const prompt = compiler.compileSystemPrompt('coder', 'code-generation', [
      'special',
    ]);
    expect(prompt).toContain('Special instructions');
  });

  it('should track module count', () => {
    expect(compiler.getModuleCount()).toBe(0);
    compiler.registerModule({
      id: 'm1',
      content: 'test',
      tokenCount: 1,
      applicableTo: [],
      requiredFor: [],
    });
    expect(compiler.getModuleCount()).toBe(1);
  });
});

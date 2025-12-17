# Plan TDD: Mejora UX del Wizard de Nuevo Proyecto

> **Metodologia**: Test-Driven Development (RED -> GREEN -> REFACTOR)
> **Estimacion Total**: ~40-50 horas de desarrollo
> **Prioridad**: Alta

---

## Resumen Ejecutivo

Este plan implementa mejoras de UX para el wizard de creacion de proyectos, haciendo la experiencia:
- **Adaptativa**: Diferente flujo para principiantes vs expertos
- **Interactiva**: Feedback en tiempo real, streaming
- **Intuitiva**: Templates, preguntas condicionales, ayuda contextual
- **Agil**: Modo rapido para usuarios avanzados

---

## Arquitectura de Tests

```
vibeia/src/
├── components/wizard/
│   ├── __tests__/
│   │   ├── WizardModeSelector.test.tsx     # NUEVO - Fase 1
│   │   ├── WizardContainer.test.tsx        # ACTUALIZAR
│   │   ├── Stage1IntentDeclaration.test.tsx # ACTUALIZAR
│   │   ├── Stage2BusinessAnalysis.test.tsx  # ACTUALIZAR
│   │   ├── Stage3TechnicalAnalysis.test.tsx # ACTUALIZAR
│   │   ├── Stage3InfraStep.test.tsx         # NUEVO - Fase 1
│   │   ├── Stage4ExecutionPreview.test.tsx  # ACTUALIZAR
│   │   ├── ExpertMode.test.tsx              # NUEVO - Fase 2
│   │   ├── GuidedMode.test.tsx              # NUEVO - Fase 2
│   │   ├── ProjectTemplates.test.tsx        # NUEVO - Fase 2
│   │   ├── StreamingPlanPreview.test.tsx    # NUEVO - Fase 3
│   │   └── PlanEditor.test.tsx              # NUEVO - Fase 3
│   ├── hooks/
│   │   └── __tests__/
│   │       ├── useWizardMode.test.ts        # NUEVO - Fase 1
│   │       ├── useWizardProgress.test.ts    # NUEVO - Fase 1
│   │       └── useStreamingPlan.test.ts     # NUEVO - Fase 3
│   └── utils/
│       └── __tests__/
│           ├── conditionalQuestions.test.ts  # NUEVO - Fase 2
│           └── planValidator.test.ts         # NUEVO - Fase 3

backend/src/modules/
├── plans/
│   ├── __tests__/
│   │   ├── plans.service.spec.ts            # ACTUALIZAR
│   │   ├── plans.controller.spec.ts         # ACTUALIZAR
│   │   └── streaming.service.spec.ts        # NUEVO - Fase 3
├── users/
│   └── __tests__/
│       └── user-preferences.spec.ts         # NUEVO - Fase 1
└── templates/
    └── __tests__/
        └── templates.service.spec.ts        # NUEVO - Fase 2
```

---

## FASE 1: Quick Wins (8-10 horas)

### 1.1 Selector de Modo del Wizard

**Objetivo**: Permitir al usuario elegir entre modo Guiado, Estandar o Experto.

#### Tests Frontend (WizardModeSelector.test.tsx)

```typescript
// RED: Escribir primero estos tests

describe('WizardModeSelector', () => {
  describe('Renderizado inicial', () => {
    it('should render three mode options: Guided, Standard, Expert', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByText(/Guiado/i)).toBeInTheDocument();
      expect(screen.getByText(/Estandar/i)).toBeInTheDocument();
      expect(screen.getByText(/Experto/i)).toBeInTheDocument();
    });

    it('should show description for each mode', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByText(/paso a paso con ayuda/i)).toBeInTheDocument();
      expect(screen.getByText(/flujo normal con opciones/i)).toBeInTheDocument();
      expect(screen.getByText(/modo rapido sin fricciones/i)).toBeInTheDocument();
    });

    it('should show estimated time for each mode', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByText(/~10 min/i)).toBeInTheDocument();
      expect(screen.getByText(/~5 min/i)).toBeInTheDocument();
      expect(screen.getByText(/~1 min/i)).toBeInTheDocument();
    });

    it('should show recommended badge based on user experience level', () => {
      render(<WizardModeSelector onSelect={jest.fn()} userExperience="beginner" />);

      const guidedOption = screen.getByTestId('mode-guided');
      expect(within(guidedOption).getByText(/Recomendado/i)).toBeInTheDocument();
    });
  });

  describe('Seleccion de modo', () => {
    it('should call onSelect with "guided" when Guided mode is clicked', async () => {
      const onSelect = jest.fn();
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={onSelect} />);

      await user.click(screen.getByTestId('mode-guided'));

      expect(onSelect).toHaveBeenCalledWith('guided');
    });

    it('should call onSelect with "standard" when Standard mode is clicked', async () => {
      const onSelect = jest.fn();
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={onSelect} />);

      await user.click(screen.getByTestId('mode-standard'));

      expect(onSelect).toHaveBeenCalledWith('standard');
    });

    it('should call onSelect with "expert" when Expert mode is clicked', async () => {
      const onSelect = jest.fn();
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={onSelect} />);

      await user.click(screen.getByTestId('mode-expert'));

      expect(onSelect).toHaveBeenCalledWith('expert');
    });
  });

  describe('Persistencia de preferencia', () => {
    it('should show "Remember my preference" checkbox', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByRole('checkbox', { name: /recordar/i })).toBeInTheDocument();
    });

    it('should save preference to localStorage when checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={jest.fn()} />);

      await user.click(screen.getByRole('checkbox', { name: /recordar/i }));
      await user.click(screen.getByTestId('mode-expert'));

      expect(localStorage.getItem('wizard_mode_preference')).toBe('expert');
    });

    it('should skip selector if preference exists in localStorage', () => {
      localStorage.setItem('wizard_mode_preference', 'expert');
      const onSelect = jest.fn();

      render(<WizardModeSelector onSelect={onSelect} />);

      expect(onSelect).toHaveBeenCalledWith('expert');
    });

    it('should show "change mode" link when preference is saved', () => {
      localStorage.setItem('wizard_mode_preference', 'expert');

      render(<WizardModeSelector onSelect={jest.fn()} showChangeOption />);

      expect(screen.getByText(/cambiar modo/i)).toBeInTheDocument();
    });
  });

  describe('Adaptacion por nivel de usuario', () => {
    it('should pre-select Guided mode for beginner users', () => {
      render(<WizardModeSelector onSelect={jest.fn()} userExperience="beginner" />);

      expect(screen.getByTestId('mode-guided')).toHaveClass('suggested');
    });

    it('should pre-select Standard mode for intermediate users', () => {
      render(<WizardModeSelector onSelect={jest.fn()} userExperience="intermediate" />);

      expect(screen.getByTestId('mode-standard')).toHaveClass('suggested');
    });

    it('should pre-select Expert mode for advanced users', () => {
      render(<WizardModeSelector onSelect={jest.fn()} userExperience="advanced" />);

      expect(screen.getByTestId('mode-expert')).toHaveClass('suggested');
    });
  });
});
```

#### Tests Hook (useWizardMode.test.ts)

```typescript
describe('useWizardMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return null mode when no preference set', () => {
    const { result } = renderHook(() => useWizardMode());

    expect(result.current.mode).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should return saved mode from localStorage', () => {
    localStorage.setItem('wizard_mode_preference', 'expert');

    const { result } = renderHook(() => useWizardMode());

    expect(result.current.mode).toBe('expert');
  });

  it('should fetch user experience level from API', async () => {
    const mockUser = { experienceLevel: 'beginner' };
    jest.spyOn(authApi, 'getMe').mockResolvedValue(mockUser);

    const { result } = renderHook(() => useWizardMode());

    await waitFor(() => {
      expect(result.current.userExperience).toBe('beginner');
    });
  });

  it('should setMode and optionally persist', () => {
    const { result } = renderHook(() => useWizardMode());

    act(() => {
      result.current.setMode('standard', true);
    });

    expect(result.current.mode).toBe('standard');
    expect(localStorage.getItem('wizard_mode_preference')).toBe('standard');
  });

  it('should clearPreference remove from localStorage', () => {
    localStorage.setItem('wizard_mode_preference', 'expert');
    const { result } = renderHook(() => useWizardMode());

    act(() => {
      result.current.clearPreference();
    });

    expect(localStorage.getItem('wizard_mode_preference')).toBeNull();
    expect(result.current.mode).toBeNull();
  });
});
```

---

### 1.2 Mostrar Todas las Preguntas en Stage 2

**Objetivo**: Cambiar de una pregunta a la vez a mostrar todas con secciones colapsables.

#### Tests (Stage2BusinessAnalysis.test.tsx - ACTUALIZAR)

```typescript
describe('Stage2BusinessAnalysis - All Questions View', () => {
  describe('Visualizacion de preguntas', () => {
    it('should render all 5 questions visible at once', () => {
      render(<Stage2BusinessAnalysis onNext={jest.fn()} onBack={jest.fn()} />);

      expect(screen.getByText(/usuarios objetivo/i)).toBeInTheDocument();
      expect(screen.getByText(/funcionalidades principales/i)).toBeInTheDocument();
      expect(screen.getByText(/monetizacion/i)).toBeInTheDocument();
      expect(screen.getByText(/escala esperada/i)).toBeInTheDocument();
      expect(screen.getByText(/integraciones/i)).toBeInTheDocument();
    });

    it('should show all questions as expandable sections', () => {
      render(<Stage2BusinessAnalysis onNext={jest.fn()} onBack={jest.fn()} />);

      const sections = screen.getAllByRole('button', { name: /expandir/i });
      expect(sections).toHaveLength(5);
    });

    it('should expand first question by default', () => {
      render(<Stage2BusinessAnalysis onNext={jest.fn()} onBack={jest.fn()} />);

      const firstSection = screen.getByTestId('question-0');
      expect(firstSection).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Validacion', () => {
    it('should show completion indicator for each question', () => {
      render(<Stage2BusinessAnalysis onNext={jest.fn()} onBack={jest.fn()} />);

      const indicators = screen.getAllByTestId(/completion-indicator/);
      expect(indicators).toHaveLength(5);
    });

    it('should mark question as complete when answered', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis onNext={jest.fn()} onBack={jest.fn()} />);

      await user.type(screen.getByTestId('answer-0'), 'Developers');

      expect(screen.getByTestId('completion-indicator-0')).toHaveClass('completed');
    });

    it('should show progress bar with completion percentage', () => {
      render(<Stage2BusinessAnalysis onNext={jest.fn()} onBack={jest.fn()} />);

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    it('should update progress bar as questions are answered', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis onNext={jest.fn()} onBack={jest.fn()} />);

      await user.type(screen.getByTestId('answer-0'), 'Answer 1');

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
    });

    it('should enable Next button when minimum questions answered', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis onNext={jest.fn()} onBack={jest.fn()} />);

      // Answer 3 questions (minimum)
      await user.type(screen.getByTestId('answer-0'), 'A1');
      await user.type(screen.getByTestId('answer-1'), 'A2');
      await user.type(screen.getByTestId('answer-2'), 'A3');

      expect(screen.getByRole('button', { name: /siguiente/i })).not.toBeDisabled();
    });
  });

  describe('Skip opcional', () => {
    it('should show skip option for non-essential questions', () => {
      render(<Stage2BusinessAnalysis onNext={jest.fn()} onBack={jest.fn()} />);

      // Questions 4 and 5 are optional
      expect(screen.getByTestId('skip-question-3')).toBeInTheDocument();
      expect(screen.getByTestId('skip-question-4')).toBeInTheDocument();
    });

    it('should mark question as skipped when skip is clicked', async () => {
      const user = userEvent.setup();
      render(<Stage2BusinessAnalysis onNext={jest.fn()} onBack={jest.fn()} />);

      await user.click(screen.getByTestId('skip-question-3'));

      expect(screen.getByTestId('question-3')).toHaveClass('skipped');
    });
  });
});
```

---

### 1.3 Integrar InfraRecommendations (Stage 3.5)

**Objetivo**: Agregar paso de recomendaciones de infraestructura.

#### Tests (Stage3InfraStep.test.tsx - NUEVO)

```typescript
describe('Stage3InfraStep', () => {
  const mockProjectContext = {
    projectName: 'My SaaS',
    description: 'A SaaS application',
    techStack: ['nextjs', 'nestjs', 'postgresql'],
    scale: 'medium',
  };

  describe('Renderizado', () => {
    it('should render database recommendations section', () => {
      render(<Stage3InfraStep context={mockProjectContext} onNext={jest.fn()} onBack={jest.fn()} />);

      expect(screen.getByText(/Base de Datos/i)).toBeInTheDocument();
    });

    it('should render deploy platform recommendations section', () => {
      render(<Stage3InfraStep context={mockProjectContext} onNext={jest.fn()} onBack={jest.fn()} />);

      expect(screen.getByText(/Plataforma de Deploy/i)).toBeInTheDocument();
    });

    it('should render cost estimation section', () => {
      render(<Stage3InfraStep context={mockProjectContext} onNext={jest.fn()} onBack={jest.fn()} />);

      expect(screen.getByText(/Estimacion de Costos/i)).toBeInTheDocument();
    });

    it('should show recommended option with badge', () => {
      render(<Stage3InfraStep context={mockProjectContext} onNext={jest.fn()} onBack={jest.fn()} />);

      expect(screen.getByText(/Recomendado/i)).toBeInTheDocument();
    });
  });

  describe('Seleccion de infraestructura', () => {
    it('should allow selecting a database provider', async () => {
      const user = userEvent.setup();
      render(<Stage3InfraStep context={mockProjectContext} onNext={jest.fn()} onBack={jest.fn()} />);

      await user.click(screen.getByTestId('db-option-neon'));

      expect(screen.getByTestId('db-option-neon')).toHaveClass('selected');
    });

    it('should allow selecting a deploy platform', async () => {
      const user = userEvent.setup();
      render(<Stage3InfraStep context={mockProjectContext} onNext={jest.fn()} onBack={jest.fn()} />);

      await user.click(screen.getByTestId('deploy-option-vercel'));

      expect(screen.getByTestId('deploy-option-vercel')).toHaveClass('selected');
    });

    it('should update cost estimation when selections change', async () => {
      const user = userEvent.setup();
      render(<Stage3InfraStep context={mockProjectContext} onNext={jest.fn()} onBack={jest.fn()} />);

      const initialCost = screen.getByTestId('monthly-cost').textContent;

      await user.click(screen.getByTestId('db-option-supabase'));

      expect(screen.getByTestId('monthly-cost').textContent).not.toBe(initialCost);
    });
  });

  describe('Skip opcional', () => {
    it('should show "Auto-detect" option', () => {
      render(<Stage3InfraStep context={mockProjectContext} onNext={jest.fn()} onBack={jest.fn()} />);

      expect(screen.getByRole('button', { name: /auto-detectar/i })).toBeInTheDocument();
    });

    it('should call onNext with auto-detect flag when clicked', async () => {
      const onNext = jest.fn();
      const user = userEvent.setup();
      render(<Stage3InfraStep context={mockProjectContext} onNext={onNext} onBack={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: /auto-detectar/i }));

      expect(onNext).toHaveBeenCalledWith({ autoDetect: true });
    });
  });

  describe('Integracion con API', () => {
    it('should fetch recommendations from API on mount', async () => {
      const mockFetch = jest.spyOn(recommendationsApi, 'getRecommendations')
        .mockResolvedValue({ database: [...], deploy: [...] });

      render(<Stage3InfraStep context={mockProjectContext} onNext={jest.fn()} onBack={jest.fn()} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(mockProjectContext);
      });
    });

    it('should show loading state while fetching', () => {
      jest.spyOn(recommendationsApi, 'getRecommendations')
        .mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<Stage3InfraStep context={mockProjectContext} onNext={jest.fn()} onBack={jest.fn()} />);

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    });
  });
});
```

---

### 1.4 Progress con Auto-Save

**Objetivo**: Guardar progreso automaticamente y permitir restaurar.

#### Tests (useWizardProgress.test.ts - NUEVO)

```typescript
describe('useWizardProgress', () => {
  const mockWizardData = {
    stage1: { projectName: 'Test', description: 'Desc' },
    stage2: { target_users: 'Devs' },
    currentStage: 2,
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Auto-save', () => {
    it('should save progress to localStorage on data change', () => {
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.updateProgress(mockWizardData);
      });

      const saved = JSON.parse(localStorage.getItem('wizard_progress') || '{}');
      expect(saved.stage1.projectName).toBe('Test');
    });

    it('should debounce saves to avoid excessive writes', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.updateProgress({ ...mockWizardData, stage1: { projectName: 'A' } });
        result.current.updateProgress({ ...mockWizardData, stage1: { projectName: 'AB' } });
        result.current.updateProgress({ ...mockWizardData, stage1: { projectName: 'ABC' } });
      });

      // Before debounce
      expect(localStorage.getItem('wizard_progress')).toBeNull();

      // After debounce (500ms)
      jest.advanceTimersByTime(500);

      const saved = JSON.parse(localStorage.getItem('wizard_progress') || '{}');
      expect(saved.stage1.projectName).toBe('ABC');

      jest.useRealTimers();
    });

    it('should include timestamp in saved data', () => {
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.updateProgress(mockWizardData);
      });

      const saved = JSON.parse(localStorage.getItem('wizard_progress') || '{}');
      expect(saved.savedAt).toBeDefined();
    });
  });

  describe('Restore', () => {
    it('should restore progress from localStorage on mount', () => {
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: Date.now(),
      }));

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.savedProgress).toEqual(expect.objectContaining({
        stage1: mockWizardData.stage1,
      }));
    });

    it('should not restore progress older than 24 hours', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: oldTimestamp,
      }));

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.savedProgress).toBeNull();
    });

    it('should show restore prompt when saved progress exists', () => {
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: Date.now(),
      }));

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.hasRestorable).toBe(true);
    });
  });

  describe('Clear', () => {
    it('should clear saved progress', () => {
      localStorage.setItem('wizard_progress', JSON.stringify(mockWizardData));
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.clearProgress();
      });

      expect(localStorage.getItem('wizard_progress')).toBeNull();
    });
  });
});
```

---

## FASE 2: Modo Adaptativo (12-15 horas)

### 2.1 Modo Experto (1 Pantalla)

#### Tests (ExpertMode.test.tsx - NUEVO)

```typescript
describe('ExpertMode', () => {
  describe('Layout', () => {
    it('should render single-page layout with two columns', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByTestId('config-column')).toBeInTheDocument();
      expect(screen.getByTestId('preview-column')).toBeInTheDocument();
    });

    it('should show template selector', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByRole('combobox', { name: /template/i })).toBeInTheDocument();
    });

    it('should show YAML/JSON import button', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByRole('button', { name: /importar/i })).toBeInTheDocument();
    });
  });

  describe('Configuracion rapida', () => {
    it('should render project name input', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });

    it('should render description textarea', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByLabelText(/descripcion/i)).toBeInTheDocument();
    });

    it('should render stack selector', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByRole('combobox', { name: /stack/i })).toBeInTheDocument();
    });

    it('should render feature checkboxes', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByRole('checkbox', { name: /auth/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /payments/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /email/i })).toBeInTheDocument();
    });

    it('should render infra selector with auto-detect option', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByRole('combobox', { name: /infra/i })).toBeInTheDocument();
      expect(screen.getByText(/auto-detectar/i)).toBeInTheDocument();
    });
  });

  describe('Preview en tiempo real', () => {
    it('should show YAML preview of configuration', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByTestId('yaml-preview')).toBeInTheDocument();
    });

    it('should update preview when config changes', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Mi Proyecto');

      expect(screen.getByTestId('yaml-preview')).toHaveTextContent('Mi Proyecto');
    });

    it('should show estimated time', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByTestId('estimated-time')).toBeInTheDocument();
    });

    it('should show estimated LLM cost', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByTestId('estimated-cost')).toBeInTheDocument();
    });

    it('should have copy config button', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: /copiar/i }));

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('Templates', () => {
    it('should load template when selected', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.selectOptions(screen.getByRole('combobox', { name: /template/i }), 'saas');

      expect(screen.getByLabelText(/nombre/i)).toHaveValue('');
      expect(screen.getByRole('checkbox', { name: /auth/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /payments/i })).toBeChecked();
    });

    it('should show template options: SaaS, E-commerce, API, Landing', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      const select = screen.getByRole('combobox', { name: /template/i });
      expect(within(select).getByText(/SaaS/i)).toBeInTheDocument();
      expect(within(select).getByText(/E-commerce/i)).toBeInTheDocument();
      expect(within(select).getByText(/API/i)).toBeInTheDocument();
      expect(within(select).getByText(/Landing/i)).toBeInTheDocument();
    });
  });

  describe('Import YAML/JSON', () => {
    it('should open modal when import button clicked', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: /importar/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should parse valid YAML and populate form', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: /importar/i }));
      await user.type(screen.getByRole('textbox'), 'project: Mi App\nstack: nextjs');
      await user.click(screen.getByRole('button', { name: /aplicar/i }));

      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Mi App');
    });

    it('should show error for invalid YAML', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: /importar/i }));
      await user.type(screen.getByRole('textbox'), 'invalid: yaml: syntax:');
      await user.click(screen.getByRole('button', { name: /aplicar/i }));

      expect(screen.getByText(/error de sintaxis/i)).toBeInTheDocument();
    });
  });

  describe('Generacion', () => {
    it('should have "Generate Plan" button', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByRole('button', { name: /generar plan/i })).toBeInTheDocument();
    });

    it('should have "Generate and Execute" button', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByRole('button', { name: /generar y ejecutar/i })).toBeInTheDocument();
    });

    it('should disable buttons when name is empty', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByRole('button', { name: /generar plan/i })).toBeDisabled();
    });

    it('should call onComplete with config when Generate clicked', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup();
      render(<ExpertMode onComplete={onComplete} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Test');
      await user.type(screen.getByLabelText(/descripcion/i), 'Description');
      await user.click(screen.getByRole('button', { name: /generar plan/i }));

      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        projectName: 'Test',
        description: 'Description',
        autoExecute: false,
      }));
    });
  });
});
```

---

### 2.2 Modo Guiado (Tutorial)

#### Tests (GuidedMode.test.tsx - NUEVO)

```typescript
describe('GuidedMode', () => {
  describe('Seleccion de tipo de proyecto', () => {
    it('should render project type cards', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByTestId('type-saas')).toBeInTheDocument();
      expect(screen.getByTestId('type-ecommerce')).toBeInTheDocument();
      expect(screen.getByTestId('type-api')).toBeInTheDocument();
      expect(screen.getByTestId('type-landing')).toBeInTheDocument();
      expect(screen.getByTestId('type-mobile')).toBeInTheDocument();
      expect(screen.getByTestId('type-custom')).toBeInTheDocument();
    });

    it('should show description for each type', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByText(/software como servicio/i)).toBeInTheDocument();
    });

    it('should highlight selected type', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));

      expect(screen.getByTestId('type-saas')).toHaveClass('selected');
    });
  });

  describe('Asistente IA contextual', () => {
    it('should show AI assistant panel', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByTestId('ai-assistant')).toBeInTheDocument();
    });

    it('should show contextual message based on selected type', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));

      expect(screen.getByText(/SaaS típicamente necesitan/i)).toBeInTheDocument();
    });

    it('should show suggested features for project type', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-ecommerce'));

      expect(screen.getByText(/carrito de compras/i)).toBeInTheDocument();
      expect(screen.getByText(/pagos/i)).toBeInTheDocument();
    });

    it('should have Yes/No buttons for AI suggestions', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));

      expect(screen.getByRole('button', { name: /sí/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /no/i })).toBeInTheDocument();
    });
  });

  describe('Tooltips y ayuda', () => {
    it('should show tooltip on info icon hover', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.hover(screen.getByTestId('info-icon-auth'));

      expect(screen.getByRole('tooltip')).toHaveTextContent(/autenticación permite/i);
    });

    it('should have "Learn more" links', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getAllByText(/aprender más/i).length).toBeGreaterThan(0);
    });
  });

  describe('Navegacion paso a paso', () => {
    it('should show step indicator', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByText(/paso 1 de 6/i)).toBeInTheDocument();
    });

    it('should have Next and Back buttons', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
    });

    it('should show "Switch to Standard Mode" option', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByText(/saltar al modo estándar/i)).toBeInTheDocument();
    });
  });
});
```

---

### 2.3 Templates de Proyectos

#### Tests Backend (templates.service.spec.ts - NUEVO)

```typescript
describe('TemplatesService', () => {
  let service: TemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplatesService],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  describe('getTemplates', () => {
    it('should return list of available templates', async () => {
      const templates = await service.getTemplates();

      expect(templates).toContainEqual(expect.objectContaining({ id: 'saas' }));
      expect(templates).toContainEqual(expect.objectContaining({ id: 'ecommerce' }));
      expect(templates).toContainEqual(expect.objectContaining({ id: 'api' }));
      expect(templates).toContainEqual(expect.objectContaining({ id: 'landing' }));
    });

    it('should include default configuration for each template', async () => {
      const templates = await service.getTemplates();
      const saas = templates.find(t => t.id === 'saas');

      expect(saas.defaultConfig).toEqual(expect.objectContaining({
        stack: expect.any(Array),
        features: expect.any(Array),
        infra: expect.any(Object),
      }));
    });
  });

  describe('getTemplateById', () => {
    it('should return template by id', async () => {
      const template = await service.getTemplateById('saas');

      expect(template.id).toBe('saas');
      expect(template.name).toBe('SaaS Application');
    });

    it('should throw NotFoundException for invalid id', async () => {
      await expect(service.getTemplateById('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyTemplate', () => {
    it('should merge template config with user overrides', async () => {
      const result = await service.applyTemplate('saas', {
        projectName: 'My SaaS',
        features: { auth: true, payments: false },
      });

      expect(result.projectName).toBe('My SaaS');
      expect(result.features).toContain('auth');
      expect(result.features).not.toContain('payments');
    });
  });
});
```

#### Tests Frontend (ProjectTemplates.test.tsx - NUEVO)

```typescript
describe('ProjectTemplates', () => {
  it('should fetch templates from API on mount', async () => {
    const mockFetch = jest.spyOn(templatesApi, 'getAll').mockResolvedValue([]);

    render(<ProjectTemplates onSelect={jest.fn()} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should render template cards', async () => {
    jest.spyOn(templatesApi, 'getAll').mockResolvedValue([
      { id: 'saas', name: 'SaaS', description: 'Software as a Service', icon: '🚀' },
      { id: 'ecommerce', name: 'E-commerce', description: 'Online store', icon: '🛒' },
    ]);

    render(<ProjectTemplates onSelect={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SaaS')).toBeInTheDocument();
      expect(screen.getByText('E-commerce')).toBeInTheDocument();
    });
  });

  it('should call onSelect with template when clicked', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    jest.spyOn(templatesApi, 'getAll').mockResolvedValue([
      { id: 'saas', name: 'SaaS', description: 'Software as a Service' },
    ]);

    render(<ProjectTemplates onSelect={onSelect} />);

    await waitFor(() => screen.getByText('SaaS'));
    await user.click(screen.getByText('SaaS'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'saas' }));
  });

  it('should show "Custom" option', async () => {
    jest.spyOn(templatesApi, 'getAll').mockResolvedValue([]);

    render(<ProjectTemplates onSelect={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/personalizado/i)).toBeInTheDocument();
    });
  });
});
```

---

### 2.4 Preguntas Condicionales

#### Tests (conditionalQuestions.test.ts - NUEVO)

```typescript
describe('conditionalQuestions', () => {
  describe('getQuestionsForProjectType', () => {
    it('should return e-commerce specific questions for e-commerce type', () => {
      const questions = getQuestionsForProjectType('ecommerce');

      expect(questions).toContainEqual(expect.objectContaining({
        id: 'product_count',
        question: expect.stringContaining('productos'),
      }));
      expect(questions).toContainEqual(expect.objectContaining({
        id: 'multi_vendor',
        question: expect.stringContaining('multi-vendor'),
      }));
    });

    it('should return SaaS specific questions for saas type', () => {
      const questions = getQuestionsForProjectType('saas');

      expect(questions).toContainEqual(expect.objectContaining({
        id: 'tenant_model',
        question: expect.stringContaining('multi-tenant'),
      }));
      expect(questions).toContainEqual(expect.objectContaining({
        id: 'pricing_model',
        question: expect.stringContaining('pricing'),
      }));
    });

    it('should return common questions for all types', () => {
      const questions = getQuestionsForProjectType('api');

      expect(questions).toContainEqual(expect.objectContaining({
        id: 'target_users',
      }));
      expect(questions).toContainEqual(expect.objectContaining({
        id: 'scale',
      }));
    });
  });

  describe('getFollowUpQuestions', () => {
    it('should return real-time questions when description mentions real-time', () => {
      const followUps = getFollowUpQuestions({
        description: 'A real-time chat application',
      });

      expect(followUps).toContainEqual(expect.objectContaining({
        id: 'realtime_latency',
      }));
      expect(followUps).toContainEqual(expect.objectContaining({
        id: 'concurrent_users',
      }));
    });

    it('should return AI questions when description mentions AI/ML', () => {
      const followUps = getFollowUpQuestions({
        description: 'An AI-powered recommendation engine',
      });

      expect(followUps).toContainEqual(expect.objectContaining({
        id: 'ai_model',
      }));
    });

    it('should return empty array when no special keywords', () => {
      const followUps = getFollowUpQuestions({
        description: 'A simple todo app',
      });

      expect(followUps).toHaveLength(0);
    });
  });

  describe('filterQuestionsByExperience', () => {
    it('should include all questions for advanced users', () => {
      const allQuestions = [
        { id: 'q1', difficulty: 'basic' },
        { id: 'q2', difficulty: 'intermediate' },
        { id: 'q3', difficulty: 'advanced' },
      ];

      const filtered = filterQuestionsByExperience(allQuestions, 'advanced');

      expect(filtered).toHaveLength(3);
    });

    it('should exclude advanced questions for beginners', () => {
      const allQuestions = [
        { id: 'q1', difficulty: 'basic' },
        { id: 'q2', difficulty: 'intermediate' },
        { id: 'q3', difficulty: 'advanced' },
      ];

      const filtered = filterQuestionsByExperience(allQuestions, 'beginner');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('q1');
    });

    it('should show basic and intermediate for intermediate users', () => {
      const allQuestions = [
        { id: 'q1', difficulty: 'basic' },
        { id: 'q2', difficulty: 'intermediate' },
        { id: 'q3', difficulty: 'advanced' },
      ];

      const filtered = filterQuestionsByExperience(allQuestions, 'intermediate');

      expect(filtered).toHaveLength(2);
    });
  });
});
```

---

## FASE 3: Experiencia Premium (15-20 horas)

### 3.1 Streaming de Generacion

#### Tests Backend (streaming.service.spec.ts - NUEVO)

```typescript
describe('StreamingService', () => {
  let service: StreamingService;
  let llmService: LlmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamingService,
        {
          provide: LlmService,
          useValue: {
            generatePlanStream: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StreamingService>(StreamingService);
    llmService = module.get<LlmService>(LlmService);
  });

  describe('streamPlanGeneration', () => {
    it('should emit progress events during generation', async () => {
      const progressEvents: any[] = [];
      const mockStream = new Readable({
        read() {
          this.push(JSON.stringify({ type: 'progress', stage: 'analyzing', percent: 20 }));
          this.push(JSON.stringify({ type: 'progress', stage: 'designing', percent: 50 }));
          this.push(null);
        },
      });

      (llmService.generatePlanStream as jest.Mock).mockReturnValue(mockStream);

      const stream = service.streamPlanGeneration({}, {});
      stream.on('data', (event) => progressEvents.push(JSON.parse(event)));

      await new Promise(resolve => stream.on('end', resolve));

      expect(progressEvents).toContainEqual(expect.objectContaining({
        type: 'progress',
        stage: 'analyzing',
      }));
    });

    it('should emit partial plan as it is generated', async () => {
      const events: any[] = [];
      const mockStream = new Readable({
        read() {
          this.push(JSON.stringify({ type: 'partial', phase: { name: 'Phase 1' } }));
          this.push(null);
        },
      });

      (llmService.generatePlanStream as jest.Mock).mockReturnValue(mockStream);

      const stream = service.streamPlanGeneration({}, {});
      stream.on('data', (event) => events.push(JSON.parse(event)));

      await new Promise(resolve => stream.on('end', resolve));

      expect(events).toContainEqual(expect.objectContaining({
        type: 'partial',
        phase: expect.objectContaining({ name: 'Phase 1' }),
      }));
    });

    it('should emit final complete plan', async () => {
      const events: any[] = [];
      const mockStream = new Readable({
        read() {
          this.push(JSON.stringify({ type: 'complete', plan: { phases: [] } }));
          this.push(null);
        },
      });

      (llmService.generatePlanStream as jest.Mock).mockReturnValue(mockStream);

      const stream = service.streamPlanGeneration({}, {});
      stream.on('data', (event) => events.push(JSON.parse(event)));

      await new Promise(resolve => stream.on('end', resolve));

      expect(events).toContainEqual(expect.objectContaining({
        type: 'complete',
      }));
    });

    it('should emit error event on failure', async () => {
      const mockStream = new Readable({
        read() {
          this.destroy(new Error('LLM API error'));
        },
      });

      (llmService.generatePlanStream as jest.Mock).mockReturnValue(mockStream);

      const stream = service.streamPlanGeneration({}, {});

      await expect(new Promise((_, reject) => {
        stream.on('error', reject);
      })).rejects.toThrow('LLM API error');
    });
  });
});
```

#### Tests Frontend (StreamingPlanPreview.test.tsx - NUEVO)

```typescript
describe('StreamingPlanPreview', () => {
  describe('Progress display', () => {
    it('should show progress bar', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={0} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should update progress bar value', () => {
      const { rerender } = render(<StreamingPlanPreview isGenerating={true} progress={25} />);

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');

      rerender(<StreamingPlanPreview isGenerating={true} progress={75} />);

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
    });

    it('should show current stage label', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={30} currentStage="analyzing" />);

      expect(screen.getByText(/analizando requisitos/i)).toBeInTheDocument();
    });
  });

  describe('Stage indicators', () => {
    it('should show all generation stages', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={0} />);

      expect(screen.getByText(/analizando/i)).toBeInTheDocument();
      expect(screen.getByText(/diseñando/i)).toBeInTheDocument();
      expect(screen.getByText(/generando tareas/i)).toBeInTheDocument();
      expect(screen.getByText(/estimando/i)).toBeInTheDocument();
      expect(screen.getByText(/validando/i)).toBeInTheDocument();
    });

    it('should mark completed stages with checkmark', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={50} currentStage="generating" />);

      expect(screen.getByTestId('stage-analyzing')).toHaveClass('completed');
      expect(screen.getByTestId('stage-designing')).toHaveClass('completed');
      expect(screen.getByTestId('stage-generating')).toHaveClass('in-progress');
    });
  });

  describe('Partial plan preview', () => {
    it('should show phases as they are generated', () => {
      render(
        <StreamingPlanPreview
          isGenerating={true}
          progress={60}
          partialPlan={{
            phases: [
              { name: 'Phase 1: Setup', status: 'complete' },
              { name: 'Phase 2: Auth', status: 'generating' },
            ],
          }}
        />
      );

      expect(screen.getByText('Phase 1: Setup')).toBeInTheDocument();
      expect(screen.getByText('Phase 2: Auth')).toBeInTheDocument();
    });

    it('should show skeleton for phases being generated', () => {
      render(
        <StreamingPlanPreview
          isGenerating={true}
          progress={60}
          partialPlan={{
            phases: [
              { name: 'Phase 1', status: 'complete' },
            ],
          }}
        />
      );

      expect(screen.getByTestId('phase-skeleton')).toBeInTheDocument();
    });

    it('should collapse/expand phases', async () => {
      const user = userEvent.setup();
      render(
        <StreamingPlanPreview
          isGenerating={false}
          progress={100}
          partialPlan={{
            phases: [
              { name: 'Phase 1', tasks: [{ name: 'Task 1' }] },
            ],
          }}
        />
      );

      await user.click(screen.getByText('Phase 1'));

      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });
  });

  describe('AI thinking display', () => {
    it('should show AI thinking message', () => {
      render(
        <StreamingPlanPreview
          isGenerating={true}
          progress={40}
          aiThinking="Diseñando arquitectura de autenticación..."
        />
      );

      expect(screen.getByTestId('ai-thinking')).toHaveTextContent(/autenticación/i);
    });

    it('should show token count', () => {
      render(
        <StreamingPlanPreview
          isGenerating={true}
          progress={40}
          tokensUsed={1234}
        />
      );

      expect(screen.getByText(/1,234/)).toBeInTheDocument();
    });
  });

  describe('Real-time stats', () => {
    it('should show phases count', () => {
      render(
        <StreamingPlanPreview
          isGenerating={true}
          progress={60}
          stats={{ phasesComplete: 2, phasesTotal: 5 }}
        />
      );

      expect(screen.getByText(/2\/5/)).toBeInTheDocument();
    });

    it('should show estimated time', () => {
      render(
        <StreamingPlanPreview
          isGenerating={true}
          progress={80}
          stats={{ estimatedTime: 240 }}
        />
      );

      expect(screen.getByText(/4 horas/i)).toBeInTheDocument();
    });
  });

  describe('Cancel action', () => {
    it('should show cancel button during generation', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={50} />);

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('should call onCancel when clicked', async () => {
      const onCancel = jest.fn();
      const user = userEvent.setup();
      render(<StreamingPlanPreview isGenerating={true} progress={50} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(onCancel).toHaveBeenCalled();
    });
  });
});
```

#### Tests Hook (useStreamingPlan.test.ts - NUEVO)

```typescript
describe('useStreamingPlan', () => {
  const mockWizardData = {
    stage1: { projectName: 'Test', description: 'Test' },
    stage2: {},
    stage3: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startGeneration', () => {
    it('should set isGenerating to true', async () => {
      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      expect(result.current.isGenerating).toBe(true);
    });

    it('should connect to streaming endpoint', async () => {
      const mockEventSource = jest.fn();
      global.EventSource = mockEventSource;

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      expect(mockEventSource).toHaveBeenCalledWith(
        expect.stringContaining('/api/plans/generate/stream')
      );
    });

    it('should update progress on progress events', async () => {
      const mockEventSource = {
        onmessage: null as any,
        close: jest.fn(),
      };
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        mockEventSource.onmessage({
          data: JSON.stringify({ type: 'progress', percent: 50 }),
        });
      });

      expect(result.current.progress).toBe(50);
    });

    it('should update partialPlan on partial events', async () => {
      const mockEventSource = {
        onmessage: null as any,
        close: jest.fn(),
      };
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        mockEventSource.onmessage({
          data: JSON.stringify({ type: 'partial', phase: { name: 'Phase 1' } }),
        });
      });

      expect(result.current.partialPlan.phases).toHaveLength(1);
    });

    it('should set completePlan on complete event', async () => {
      const mockEventSource = {
        onmessage: null as any,
        close: jest.fn(),
      };
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        mockEventSource.onmessage({
          data: JSON.stringify({ type: 'complete', plan: { phases: [] } }),
        });
      });

      expect(result.current.completePlan).toBeDefined();
      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('cancelGeneration', () => {
    it('should close EventSource connection', async () => {
      const mockEventSource = {
        onmessage: null as any,
        close: jest.fn(),
      };
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        result.current.cancelGeneration();
      });

      expect(mockEventSource.close).toHaveBeenCalled();
      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should set error on EventSource error', async () => {
      const mockEventSource = {
        onmessage: null as any,
        onerror: null as any,
        close: jest.fn(),
      };
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        mockEventSource.onerror(new Error('Connection failed'));
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.isGenerating).toBe(false);
    });
  });
});
```

---

### 3.2 Editor de Plan

#### Tests (PlanEditor.test.tsx - NUEVO)

```typescript
describe('PlanEditor', () => {
  const mockPlan = {
    phases: [
      {
        name: 'Phase 1: Setup',
        tasks: [
          { id: 't1', name: 'Init project', estimatedTime: 10 },
          { id: 't2', name: 'Configure DB', estimatedTime: 15 },
        ],
      },
      {
        name: 'Phase 2: Auth',
        tasks: [
          { id: 't3', name: 'JWT setup', estimatedTime: 20 },
        ],
      },
    ],
    estimatedTime: 45,
  };

  describe('Visualizacion', () => {
    it('should render all phases', () => {
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      expect(screen.getByText('Phase 1: Setup')).toBeInTheDocument();
      expect(screen.getByText('Phase 2: Auth')).toBeInTheDocument();
    });

    it('should render tasks within phases', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));

      expect(screen.getByText('Init project')).toBeInTheDocument();
      expect(screen.getByText('Configure DB')).toBeInTheDocument();
    });

    it('should show total estimated time', () => {
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      expect(screen.getByText(/45 min/)).toBeInTheDocument();
    });
  });

  describe('Edicion de tareas', () => {
    it('should allow editing task name', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));
      await user.click(screen.getByTestId('edit-task-t1'));
      await user.clear(screen.getByDisplayValue('Init project'));
      await user.type(screen.getByRole('textbox'), 'Initialize Next.js project');

      expect(screen.getByDisplayValue('Initialize Next.js project')).toBeInTheDocument();
    });

    it('should allow editing task time estimate', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));
      await user.click(screen.getByTestId('edit-task-t1'));

      const timeInput = screen.getByLabelText(/tiempo/i);
      await user.clear(timeInput);
      await user.type(timeInput, '20');

      expect(timeInput).toHaveValue(20);
    });

    it('should allow deleting a task', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));
      await user.click(screen.getByTestId('delete-task-t1'));

      expect(screen.queryByText('Init project')).not.toBeInTheDocument();
    });

    it('should allow adding a new task', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));
      await user.click(screen.getByTestId('add-task-phase-0'));
      await user.type(screen.getByPlaceholderText(/nombre de tarea/i), 'New Task');
      await user.click(screen.getByRole('button', { name: /agregar/i }));

      expect(screen.getByText('New Task')).toBeInTheDocument();
    });
  });

  describe('Reordenamiento', () => {
    it('should allow drag and drop reorder of tasks', async () => {
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      // Simulate drag and drop (using react-beautiful-dnd test utils)
      const dragHandle = screen.getByTestId('drag-handle-t1');

      expect(dragHandle).toHaveAttribute('draggable', 'true');
    });

    it('should allow moving task between phases', async () => {
      // Test drag from phase 1 to phase 2
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      // Complex DnD test - verify structure supports cross-phase drag
      expect(screen.getByTestId('droppable-phase-0')).toBeInTheDocument();
      expect(screen.getByTestId('droppable-phase-1')).toBeInTheDocument();
    });
  });

  describe('Guardar cambios', () => {
    it('should call onSave with modified plan', async () => {
      const onSave = jest.fn();
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={onSave} />);

      await user.click(screen.getByRole('button', { name: /guardar/i }));

      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        phases: expect.any(Array),
      }));
    });

    it('should show unsaved changes indicator', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));
      await user.click(screen.getByTestId('delete-task-t1'));

      expect(screen.getByText(/cambios sin guardar/i)).toBeInTheDocument();
    });

    it('should recalculate total time on changes', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));
      await user.click(screen.getByTestId('delete-task-t1')); // Remove 10 min task

      expect(screen.getByText(/35 min/)).toBeInTheDocument();
    });
  });

  describe('Deshacer/Rehacer', () => {
    it('should support undo', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));
      await user.click(screen.getByTestId('delete-task-t1'));

      expect(screen.queryByText('Init project')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /deshacer/i }));

      expect(screen.getByText('Init project')).toBeInTheDocument();
    });

    it('should support redo', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));
      await user.click(screen.getByTestId('delete-task-t1'));
      await user.click(screen.getByRole('button', { name: /deshacer/i }));
      await user.click(screen.getByRole('button', { name: /rehacer/i }));

      expect(screen.queryByText('Init project')).not.toBeInTheDocument();
    });

    it('should support keyboard shortcuts Ctrl+Z and Ctrl+Y', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));
      await user.click(screen.getByTestId('delete-task-t1'));
      await user.keyboard('{Control>}z{/Control}');

      expect(screen.getByText('Init project')).toBeInTheDocument();
    });
  });
});
```

---

## Resumen de Archivos

### Frontend (vibeia/src/)

| Archivo | Accion | Tests |
|---------|--------|-------|
| components/wizard/WizardModeSelector.tsx | CREAR | 15 tests |
| components/wizard/WizardContainer.tsx | MODIFICAR | +5 tests |
| components/wizard/Stage1IntentDeclaration.tsx | MODIFICAR | +3 tests |
| components/wizard/Stage2BusinessAnalysis.tsx | MODIFICAR | +12 tests |
| components/wizard/Stage3TechnicalAnalysis.tsx | MODIFICAR | +5 tests |
| components/wizard/Stage3InfraStep.tsx | CREAR | 12 tests |
| components/wizard/Stage4ExecutionPreview.tsx | MODIFICAR | +3 tests |
| components/wizard/ExpertMode.tsx | CREAR | 25 tests |
| components/wizard/GuidedMode.tsx | CREAR | 15 tests |
| components/wizard/ProjectTemplates.tsx | CREAR | 8 tests |
| components/wizard/StreamingPlanPreview.tsx | CREAR | 18 tests |
| components/wizard/PlanEditor.tsx | CREAR | 20 tests |
| hooks/useWizardMode.ts | CREAR | 8 tests |
| hooks/useWizardProgress.ts | CREAR | 10 tests |
| hooks/useStreamingPlan.ts | CREAR | 10 tests |
| utils/conditionalQuestions.ts | CREAR | 8 tests |

### Backend (backend/src/)

| Archivo | Accion | Tests |
|---------|--------|-------|
| modules/plans/streaming.service.ts | CREAR | 6 tests |
| modules/plans/plans.controller.ts | MODIFICAR | +3 tests |
| modules/templates/templates.service.ts | CREAR | 5 tests |
| modules/templates/templates.controller.ts | CREAR | 4 tests |
| modules/users/user-preferences.service.ts | CREAR | 5 tests |

---

## Orden de Implementacion TDD

### Semana 1: Fase 1
```
Dia 1-2:
  RED:   WizardModeSelector.test.tsx (15 tests)
  GREEN: WizardModeSelector.tsx

  RED:   useWizardMode.test.ts (8 tests)
  GREEN: useWizardMode.ts

Dia 3:
  RED:   Stage2BusinessAnalysis.test.tsx actualizados (12 tests)
  GREEN: Stage2BusinessAnalysis.tsx modificado

Dia 4:
  RED:   Stage3InfraStep.test.tsx (12 tests)
  GREEN: Stage3InfraStep.tsx

Dia 5:
  RED:   useWizardProgress.test.ts (10 tests)
  GREEN: useWizardProgress.ts

  REFACTOR: WizardContainer para integrar todo
```

### Semana 2: Fase 2
```
Dia 1-2:
  RED:   ExpertMode.test.tsx (25 tests)
  GREEN: ExpertMode.tsx

Dia 3:
  RED:   GuidedMode.test.tsx (15 tests)
  GREEN: GuidedMode.tsx

Dia 4:
  RED:   templates.service.spec.ts (5 tests)
  GREEN: templates.service.ts + controller

  RED:   ProjectTemplates.test.tsx (8 tests)
  GREEN: ProjectTemplates.tsx

Dia 5:
  RED:   conditionalQuestions.test.ts (8 tests)
  GREEN: conditionalQuestions.ts

  REFACTOR: Integrar en Stage2
```

### Semana 3: Fase 3
```
Dia 1-2:
  RED:   streaming.service.spec.ts (6 tests)
  GREEN: streaming.service.ts + LLM changes

Dia 3:
  RED:   useStreamingPlan.test.ts (10 tests)
  GREEN: useStreamingPlan.ts

  RED:   StreamingPlanPreview.test.tsx (18 tests)
  GREEN: StreamingPlanPreview.tsx

Dia 4-5:
  RED:   PlanEditor.test.tsx (20 tests)
  GREEN: PlanEditor.tsx

  REFACTOR: Stage4 para usar editor
```

---

## Metricas de Exito

| Metrica | Actual | Objetivo |
|---------|--------|----------|
| Tests Wizard | ~45 | ~200 |
| Cobertura Wizard | ~60% | >90% |
| Tiempo promedio flujo | ~8 min | <3 min (experto) |
| Abandono wizard | ? | -50% |
| Satisfaccion UX | ? | >4.5/5 |

---

## Comandos de Ejecucion

```bash
# Frontend - Correr tests especificos
cd vibeia
npm test -- --testPathPattern="wizard" --watch

# Backend - Correr tests especificos
cd backend
npm test -- --testPathPattern="plans|templates|streaming" --watch

# Correr todos los tests nuevos
npm test -- --testPathPattern="WizardMode|ExpertMode|GuidedMode|Streaming|PlanEditor"

# Coverage
npm test -- --coverage --collectCoverageFrom="src/components/wizard/**/*"
```

---

**Plan creado**: 2025-12-17
**Metodologia**: TDD (Test-Driven Development)
**Autor**: Claude AI Assistant

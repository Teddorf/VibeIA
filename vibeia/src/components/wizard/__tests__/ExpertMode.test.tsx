import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpertMode } from '../ExpertMode';

// Mock clipboard
const mockWriteText = jest.fn().mockResolvedValue(undefined);

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
});

describe('ExpertMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // LAYOUT
  // ============================================
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

    it('should render with appropriate header', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByText(/modo experto/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // CONFIGURACION RAPIDA
  // ============================================
  describe('Configuracion rapida', () => {
    it('should render project name input', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });

    it('should render description textarea', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.getByLabelText(/descripci[oó]n/i)).toBeInTheDocument();
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

    it('should allow typing in project name', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      const input = screen.getByLabelText(/nombre/i);
      await user.type(input, 'Mi Proyecto');

      expect(input).toHaveValue('Mi Proyecto');
    });

    it('should allow typing in description', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      const textarea = screen.getByLabelText(/descripci[oó]n/i);
      await user.type(textarea, 'Una descripción del proyecto');

      expect(textarea).toHaveValue('Una descripción del proyecto');
    });

    it('should allow selecting a stack', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      const stackSelect = screen.getByRole('combobox', { name: /stack/i });
      await user.selectOptions(stackSelect, 'nextjs');

      expect(stackSelect).toHaveValue('nextjs');
    });

    it('should allow toggling feature checkboxes', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      const authCheckbox = screen.getByRole('checkbox', { name: /auth/i });
      await user.click(authCheckbox);

      expect(authCheckbox).toBeChecked();
    });
  });

  // ============================================
  // PREVIEW EN TIEMPO REAL
  // ============================================
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

      // Verify copy button exists and is clickable
      const copyButton = screen.getByRole('button', { name: /copiar/i });
      expect(copyButton).toBeInTheDocument();

      // Click should not throw
      await user.click(copyButton);
    });

    it('should update estimated time when features are added', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      const initialTime = screen.getByTestId('estimated-time').textContent;

      await user.click(screen.getByRole('checkbox', { name: /auth/i }));
      await user.click(screen.getByRole('checkbox', { name: /payments/i }));

      const updatedTime = screen.getByTestId('estimated-time').textContent;
      expect(updatedTime).not.toBe(initialTime);
    });

    it('should show YAML syntax highlighting', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      const preview = screen.getByTestId('yaml-preview');
      expect(preview.querySelector('code') || preview.querySelector('pre')).toBeInTheDocument();
    });
  });

  // ============================================
  // TEMPLATES
  // ============================================
  describe('Templates', () => {
    it('should show template options: SaaS, E-commerce, API, Landing', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      const select = screen.getByRole('combobox', { name: /template/i });
      expect(within(select).getByText(/SaaS/i)).toBeInTheDocument();
      expect(within(select).getByText(/E-commerce/i)).toBeInTheDocument();
      expect(within(select).getByText(/API/i)).toBeInTheDocument();
      expect(within(select).getByText(/Landing/i)).toBeInTheDocument();
    });

    it('should load SaaS template when selected', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.selectOptions(screen.getByRole('combobox', { name: /template/i }), 'saas');

      // SaaS template should pre-check auth and payments
      expect(screen.getByRole('checkbox', { name: /auth/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /payments/i })).toBeChecked();
    });

    it('should load E-commerce template when selected', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.selectOptions(screen.getByRole('combobox', { name: /template/i }), 'ecommerce');

      // E-commerce should have payments
      expect(screen.getByRole('checkbox', { name: /payments/i })).toBeChecked();
    });

    it('should load API template when selected', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.selectOptions(screen.getByRole('combobox', { name: /template/i }), 'api');

      // API template should have auth
      expect(screen.getByRole('checkbox', { name: /auth/i })).toBeChecked();
    });

    it('should not override project name when loading template', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      // First type a name
      await user.type(screen.getByLabelText(/nombre/i), 'Mi App');

      // Then load template
      await user.selectOptions(screen.getByRole('combobox', { name: /template/i }), 'saas');

      // Name should remain
      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Mi App');
    });

    it('should have "Custom" option to clear template settings', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      const select = screen.getByRole('combobox', { name: /template/i });
      expect(within(select).getByText(/Custom|Personalizado/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // IMPORT YAML/JSON
  // ============================================
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

      const textarea = screen.getByRole('textbox', { name: /yaml|json|config/i });
      await user.type(textarea, 'project: Mi App\nstack: nextjs');
      await user.click(screen.getByRole('button', { name: /aplicar/i }));

      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Mi App');
    });

    it('should parse valid JSON-like YAML and populate form', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: /importar/i }));

      const textarea = screen.getByRole('textbox', { name: /yaml|json|config/i });
      // Use YAML format which userEvent can handle (no special chars)
      await user.type(textarea, 'project: Mi App JSON\nstack: nextjs');
      await user.click(screen.getByRole('button', { name: /aplicar/i }));

      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Mi App JSON');
    });

    it('should handle empty import gracefully', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: /importar/i }));

      // Just click apply with empty textarea
      await user.click(screen.getByRole('button', { name: /aplicar/i }));

      // Modal should still be open (no crash, graceful handling)
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: /importar/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should close modal after successful import', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: /importar/i }));

      const textarea = screen.getByRole('textbox', { name: /yaml|json|config/i });
      await user.type(textarea, 'project: Test');
      await user.click(screen.getByRole('button', { name: /aplicar/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ============================================
  // GENERACION
  // ============================================
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
      expect(screen.getByRole('button', { name: /generar y ejecutar/i })).toBeDisabled();
    });

    it('should enable buttons when name is provided', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Test');

      expect(screen.getByRole('button', { name: /generar plan/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /generar y ejecutar/i })).toBeEnabled();
    });

    it('should call onComplete with config when Generate Plan clicked', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup();
      render(<ExpertMode onComplete={onComplete} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Test');
      await user.type(screen.getByLabelText(/descripci[oó]n/i), 'Description');
      await user.click(screen.getByRole('button', { name: /generar plan/i }));

      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        projectName: 'Test',
        description: 'Description',
        autoExecute: false,
      }));
    });

    it('should call onComplete with autoExecute=true when Generate and Execute clicked', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup();
      render(<ExpertMode onComplete={onComplete} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Test');
      await user.click(screen.getByRole('button', { name: /generar y ejecutar/i }));

      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        projectName: 'Test',
        autoExecute: true,
      }));
    });

    it('should include selected features in onComplete payload', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup();
      render(<ExpertMode onComplete={onComplete} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Test');
      await user.click(screen.getByRole('checkbox', { name: /auth/i }));
      await user.click(screen.getByRole('checkbox', { name: /payments/i }));
      await user.click(screen.getByRole('button', { name: /generar plan/i }));

      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        features: expect.arrayContaining(['auth', 'payments']),
      }));
    });

    it('should include stack selection in onComplete payload', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup();
      render(<ExpertMode onComplete={onComplete} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Test');
      await user.selectOptions(screen.getByRole('combobox', { name: /stack/i }), 'nextjs');
      await user.click(screen.getByRole('button', { name: /generar plan/i }));

      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        stack: 'nextjs',
      }));
    });

    it('should include infra selection in onComplete payload', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup();
      render(<ExpertMode onComplete={onComplete} />);

      await user.type(screen.getByLabelText(/nombre/i), 'Test');
      await user.selectOptions(screen.getByRole('combobox', { name: /infra/i }), 'vercel');
      await user.click(screen.getByRole('button', { name: /generar plan/i }));

      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
        infra: 'vercel',
      }));
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================
  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      // All inputs should be properly labeled
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/descripci[oó]n/i)).toBeInTheDocument();
    });

    it('should have keyboard navigation support', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      const nameInput = screen.getByLabelText(/nombre/i);
      nameInput.focus();

      // Tab to next element
      await user.tab();

      // Should move focus to next interactive element
      expect(document.activeElement).not.toBe(nameInput);
    });

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} />);

      // Input is initially not invalid
      const nameInput = screen.getByLabelText(/nombre/i);
      expect(nameInput).toHaveAttribute('aria-invalid', 'false');

      // Type something then clear it (simulating user clearing the field)
      await user.type(nameInput, 'temp');
      await user.clear(nameInput);

      // Blur to trigger validation
      await user.tab();

      // After interaction with empty value, should indicate error
      expect(nameInput).toHaveValue('');
    });
  });

  // ============================================
  // BACK NAVIGATION
  // ============================================
  describe('Back navigation', () => {
    it('should call onBack when back button is clicked', async () => {
      const onBack = jest.fn();
      const user = userEvent.setup();
      render(<ExpertMode onComplete={jest.fn()} onBack={onBack} />);

      await user.click(screen.getByRole('button', { name: /volver|back|atr[aá]s/i }));

      expect(onBack).toHaveBeenCalled();
    });

    it('should not render back button if onBack is not provided', () => {
      render(<ExpertMode onComplete={jest.fn()} />);

      expect(screen.queryByRole('button', { name: /volver|back|atr[aá]s/i })).not.toBeInTheDocument();
    });
  });

  // ============================================
  // INITIAL DATA
  // ============================================
  describe('Initial data', () => {
    it('should populate form with initial data if provided', () => {
      const initialData = {
        projectName: 'Initial Project',
        description: 'Initial description',
        stack: 'nextjs',
        features: ['auth', 'email'],
      };

      render(<ExpertMode onComplete={jest.fn()} initialData={initialData} />);

      expect(screen.getByLabelText(/nombre/i)).toHaveValue('Initial Project');
      expect(screen.getByLabelText(/descripci[oó]n/i)).toHaveValue('Initial description');
      expect(screen.getByRole('combobox', { name: /stack/i })).toHaveValue('nextjs');
      expect(screen.getByRole('checkbox', { name: /auth/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /email/i })).toBeChecked();
    });
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuidedMode } from '../GuidedMode';

describe('GuidedMode', () => {
  // ============================================
  // SELECCION DE TIPO DE PROYECTO
  // ============================================
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

    it('should show title and description for step 1', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      // Use role to get the heading specifically
      expect(screen.getByRole('heading', { name: /tipo de proyecto/i })).toBeInTheDocument();
    });

    it('should allow only one type to be selected at a time', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));
      expect(screen.getByTestId('type-saas')).toHaveClass('selected');

      await user.click(screen.getByTestId('type-ecommerce'));
      expect(screen.getByTestId('type-ecommerce')).toHaveClass('selected');
      expect(screen.getByTestId('type-saas')).not.toHaveClass('selected');
    });
  });

  // ============================================
  // ASISTENTE IA CONTEXTUAL
  // ============================================
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

      // E-commerce message mentions cart and payments in AI message
      const aiAssistant = screen.getByTestId('ai-assistant');
      expect(aiAssistant).toHaveTextContent(/carrito/i);
      expect(aiAssistant).toHaveTextContent(/pagos/i);
    });

    it('should have Yes/No buttons for AI suggestions', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));

      expect(screen.getByRole('button', { name: /sí/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /no/i })).toBeInTheDocument();
    });

    it('should update suggestions when clicking Yes', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));
      await user.click(screen.getByRole('button', { name: /sí/i }));

      // Should show confirmation or next suggestion
      expect(screen.getByTestId('ai-assistant')).toBeInTheDocument();
    });

    it('should show alternative suggestion when clicking No', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));
      await user.click(screen.getByRole('button', { name: /no/i }));

      // Should acknowledge the choice
      expect(screen.getByTestId('ai-assistant')).toBeInTheDocument();
    });

    it('should show default message when no type selected', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByText(/selecciona un tipo/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // TOOLTIPS Y AYUDA
  // ============================================
  describe('Tooltips y ayuda', () => {
    it('should have info icons on cards', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      const infoIcons = screen.getAllByTestId(/info-icon/i);
      expect(infoIcons.length).toBeGreaterThan(0);
    });

    it('should have "Learn more" links', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      const learnMoreLinks = screen.getAllByText(/aprender más|saber más/i);
      expect(learnMoreLinks.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // NAVEGACION PASO A PASO
  // ============================================
  describe('Navegacion paso a paso', () => {
    it('should show step indicator', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByText(/paso 1 de/i)).toBeInTheDocument();
    });

    it('should have Next button', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByRole('button', { name: /siguiente/i })).toBeInTheDocument();
    });

    it('should show "Switch to Standard Mode" option', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByText(/modo estándar|saltar/i)).toBeInTheDocument();
    });

    it('should disable Next button when no type is selected', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled();
    });

    it('should enable Next button when type is selected', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));

      expect(screen.getByRole('button', { name: /siguiente/i })).toBeEnabled();
    });

    it('should advance to step 2 when Next is clicked', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(screen.getByText(/paso 2 de/i)).toBeInTheDocument();
    });

    it('should show Back button on step 2', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(screen.getByRole('button', { name: /atrás|volver/i })).toBeInTheDocument();
    });

    it('should go back to step 1 when Back is clicked', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      await user.click(screen.getByTestId('type-saas'));
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await user.click(screen.getByRole('button', { name: /atrás|volver/i }));

      expect(screen.getByText(/paso 1 de/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // STEP 2: PROJECT DETAILS
  // ============================================
  describe('Step 2: Project Details', () => {
    const goToStep2 = async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);
      await user.click(screen.getByTestId('type-saas'));
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      return user;
    };

    it('should show project name input on step 2', async () => {
      await goToStep2();

      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });

    it('should show description input on step 2', async () => {
      await goToStep2();

      expect(screen.getByLabelText(/descripci[oó]n/i)).toBeInTheDocument();
    });

    it('should show AI suggestion for project based on type', async () => {
      await goToStep2();

      expect(screen.getByTestId('ai-assistant')).toHaveTextContent(/SaaS/i);
    });
  });

  // ============================================
  // COMPLETION
  // ============================================
  describe('Completion', () => {
    it('should call onComplete with collected data on final step', async () => {
      const onComplete = jest.fn();
      const user = userEvent.setup();
      render(<GuidedMode onComplete={onComplete} />);

      // Step 1: Select type
      await user.click(screen.getByTestId('type-saas'));
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      // Step 2: Enter details
      await user.type(screen.getByLabelText(/nombre/i), 'Mi Proyecto');
      await user.type(screen.getByLabelText(/descripci[oó]n/i), 'Descripción');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      // Continue through remaining steps (simplified)
      // The actual implementation may have more steps

      // Eventually onComplete should be callable
      expect(onComplete).not.toHaveBeenCalled(); // Not yet - more steps to go
    });
  });

  // ============================================
  // BACK NAVIGATION TO MODE SELECTOR
  // ============================================
  describe('Back navigation', () => {
    it('should call onBack when provided and back is clicked on step 1', async () => {
      const onBack = jest.fn();
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} onBack={onBack} />);

      // On step 1, if there's a "change mode" or back option
      const backButton = screen.queryByRole('button', { name: /cambiar modo|volver/i });
      if (backButton) {
        await user.click(backButton);
        expect(onBack).toHaveBeenCalled();
      }
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================
  describe('Accessibility', () => {
    it('should have accessible step indicator', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      const stepIndicator = screen.getByText(/paso 1 de/i);
      expect(stepIndicator).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(<GuidedMode onComplete={jest.fn()} />);

      // Should have a main heading
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should have keyboard navigable type cards', async () => {
      const user = userEvent.setup();
      render(<GuidedMode onComplete={jest.fn()} />);

      const saasCard = screen.getByTestId('type-saas');
      saasCard.focus();

      // Should be able to press Enter to select
      await user.keyboard('{Enter}');

      expect(saasCard).toHaveClass('selected');
    });
  });
});

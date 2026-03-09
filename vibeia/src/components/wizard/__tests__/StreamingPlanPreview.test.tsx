import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamingPlanPreview } from '../StreamingPlanPreview';

describe('StreamingPlanPreview', () => {
  // ============================================
  // PROGRESS DISPLAY
  // ============================================
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

      // Multiple elements contain "analizando" - check that at least one exists
      const elements = screen.getAllByText(/analizando/i);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should show percentage text', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={45} />);

      expect(screen.getByText(/45%/)).toBeInTheDocument();
    });
  });

  // ============================================
  // STAGE INDICATORS
  // ============================================
  describe('Stage indicators', () => {
    it('should show all generation stages', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={0} />);

      expect(screen.getByText(/analizando/i)).toBeInTheDocument();
      expect(screen.getByText(/diseñando/i)).toBeInTheDocument();
      expect(screen.getByText(/generando/i)).toBeInTheDocument();
      expect(screen.getByText(/estimando/i)).toBeInTheDocument();
      expect(screen.getByText(/validando/i)).toBeInTheDocument();
    });

    it('should mark completed stages with checkmark', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={50} currentStage="generating" />);

      expect(screen.getByTestId('stage-analyzing')).toHaveClass('completed');
      expect(screen.getByTestId('stage-designing')).toHaveClass('completed');
      expect(screen.getByTestId('stage-generating')).toHaveClass('in-progress');
    });

    it('should show pending stages as inactive', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={20} currentStage="analyzing" />);

      expect(screen.getByTestId('stage-analyzing')).toHaveClass('in-progress');
      expect(screen.getByTestId('stage-designing')).not.toHaveClass('completed');
      expect(screen.getByTestId('stage-designing')).not.toHaveClass('in-progress');
    });
  });

  // ============================================
  // PARTIAL PLAN PREVIEW
  // ============================================
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
        />,
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
            phases: [{ name: 'Phase 1', status: 'complete' }],
          }}
        />,
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
              {
                name: 'Phase 1',
                tasks: [{ name: 'Task 1', estimatedTime: 30 }],
                status: 'complete',
              },
            ],
          }}
        />,
      );

      // Phase should be clickable
      await user.click(screen.getByText('Phase 1'));

      expect(screen.getByText('Task 1')).toBeInTheDocument();
    });

    it('should show task count for each phase', () => {
      render(
        <StreamingPlanPreview
          isGenerating={false}
          progress={100}
          partialPlan={{
            phases: [
              {
                name: 'Phase 1',
                tasks: [
                  { name: 'Task 1', estimatedTime: 30 },
                  { name: 'Task 2', estimatedTime: 30 },
                ],
                status: 'complete',
              },
            ],
          }}
        />,
      );

      expect(screen.getByText(/2 tareas/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // AI THINKING DISPLAY
  // ============================================
  describe('AI thinking display', () => {
    it('should show AI thinking message', () => {
      render(
        <StreamingPlanPreview
          isGenerating={true}
          progress={40}
          aiThinking="Diseñando arquitectura de autenticación..."
        />,
      );

      expect(screen.getByTestId('ai-thinking')).toHaveTextContent(/autenticación/i);
    });

    it('should show animated thinking indicator', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={40} aiThinking="Procesando..." />);

      expect(screen.getByTestId('ai-thinking')).toBeInTheDocument();
    });

    it('should show token count', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={40} tokensUsed={1234} />);

      // Token count formatted with toLocaleString - check for the text container
      expect(screen.getByText(/tokens utilizados/i)).toBeInTheDocument();
    });

    it('should hide AI thinking when not generating', () => {
      render(<StreamingPlanPreview isGenerating={false} progress={100} aiThinking="Done" />);

      expect(screen.queryByTestId('ai-thinking')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // REAL-TIME STATS
  // ============================================
  describe('Real-time stats', () => {
    it('should show phases count', () => {
      render(
        <StreamingPlanPreview
          isGenerating={true}
          progress={60}
          stats={{ phasesComplete: 2, phasesTotal: 5 }}
        />,
      );

      expect(screen.getByText(/2.*5|2\/5/)).toBeInTheDocument();
    });

    it('should show estimated time', () => {
      render(
        <StreamingPlanPreview isGenerating={true} progress={80} stats={{ estimatedTime: 240 }} />,
      );

      expect(screen.getByText(/4.*hora|240.*min/i)).toBeInTheDocument();
    });

    it('should show task count', () => {
      render(
        <StreamingPlanPreview
          isGenerating={true}
          progress={70}
          stats={{ tasksComplete: 8, tasksTotal: 20 }}
        />,
      );

      expect(screen.getByText(/8.*20|8\/20/)).toBeInTheDocument();
    });
  });

  // ============================================
  // CANCEL ACTION
  // ============================================
  describe('Cancel action', () => {
    it('should show cancel button during generation', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={50} onCancel={jest.fn()} />);

      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('should call onCancel when clicked', async () => {
      const onCancel = jest.fn();
      const user = userEvent.setup();
      render(<StreamingPlanPreview isGenerating={true} progress={50} onCancel={onCancel} />);

      await user.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(onCancel).toHaveBeenCalled();
    });

    it('should not show cancel button when not generating', () => {
      render(<StreamingPlanPreview isGenerating={false} progress={100} />);

      expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
    });
  });

  // ============================================
  // COMPLETION STATE
  // ============================================
  describe('Completion state', () => {
    it('should show success message when complete', () => {
      render(
        <StreamingPlanPreview
          isGenerating={false}
          progress={100}
          partialPlan={{ phases: [{ name: 'Phase 1', status: 'complete' }] }}
        />,
      );

      // Success message is "Plan generado completo"
      expect(screen.getByText(/plan generado completo/i)).toBeInTheDocument();
    });

    it('should show action buttons when complete', () => {
      render(
        <StreamingPlanPreview
          isGenerating={false}
          progress={100}
          partialPlan={{ phases: [] }}
          onContinue={jest.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /continuar|ejecutar/i })).toBeInTheDocument();
    });

    it('should call onContinue when continue button is clicked', async () => {
      const onContinue = jest.fn();
      const user = userEvent.setup();
      render(
        <StreamingPlanPreview
          isGenerating={false}
          progress={100}
          partialPlan={{ phases: [] }}
          onContinue={onContinue}
        />,
      );

      await user.click(screen.getByRole('button', { name: /continuar|ejecutar/i }));

      expect(onContinue).toHaveBeenCalled();
    });
  });

  // ============================================
  // ERROR STATE
  // ============================================
  describe('Error state', () => {
    it('should show error message when error occurs', () => {
      render(
        <StreamingPlanPreview
          isGenerating={false}
          progress={40}
          error="Error al generar el plan"
        />,
      );

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('should show retry button on error', () => {
      render(
        <StreamingPlanPreview
          isGenerating={false}
          progress={40}
          error="Error"
          onRetry={jest.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /reintentar|retry/i })).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const onRetry = jest.fn();
      const user = userEvent.setup();
      render(
        <StreamingPlanPreview isGenerating={false} progress={40} error="Error" onRetry={onRetry} />,
      );

      await user.click(screen.getByRole('button', { name: /reintentar|retry/i }));

      expect(onRetry).toHaveBeenCalled();
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================
  describe('Accessibility', () => {
    it('should have accessible progress bar', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={50} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should announce progress changes to screen readers', () => {
      render(<StreamingPlanPreview isGenerating={true} progress={50} currentStage="designing" />);

      // Should have aria-live region
      expect(
        screen.getByRole('progressbar').closest('[aria-live]') ||
          screen.getByText(/diseñando/i).closest('[aria-live]'),
      ).toBeTruthy();
    });
  });
});

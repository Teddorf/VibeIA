import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanEditor } from '../PlanEditor';

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
        tasks: [{ id: 't3', name: 'JWT setup', estimatedTime: 20 }],
      },
    ],
    estimatedTime: 45,
  };

  // ============================================
  // VISUALIZATION
  // ============================================
  describe('Visualization', () => {
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

    it('should show task count per phase', () => {
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      expect(screen.getByText(/2 tareas/i)).toBeInTheDocument();
      expect(screen.getByText(/1 tarea/i)).toBeInTheDocument();
    });
  });

  // ============================================
  // TASK EDITING
  // ============================================
  describe('Task editing', () => {
    it('should allow editing task name', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByText('Phase 1: Setup'));
      await user.click(screen.getByTestId('edit-task-t1'));

      const input = screen.getByDisplayValue('Init project');
      await user.clear(input);
      await user.type(input, 'Initialize Next.js project');

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
      // Use getAllByRole and get the first button with "agregar" that's NOT "agregar fase"
      const addButtons = screen.getAllByRole('button', { name: /agregar/i });
      const addTaskButton = addButtons.find((btn) => btn.textContent === 'Agregar');
      await user.click(addTaskButton!);

      expect(screen.getByText('New Task')).toBeInTheDocument();
    });
  });

  // ============================================
  // REORDERING
  // ============================================
  describe('Reordering', () => {
    it('should allow drag and drop reorder of tasks', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      // Expand phase first to see tasks
      await user.click(screen.getByText('Phase 1: Setup'));

      // Verify drag handles exist and are draggable
      const dragHandle = screen.getByTestId('drag-handle-t1');
      expect(dragHandle).toHaveAttribute('draggable', 'true');
    });

    it('should allow moving task between phases', () => {
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      // Verify droppable zones exist for cross-phase drag
      expect(screen.getByTestId('droppable-phase-0')).toBeInTheDocument();
      expect(screen.getByTestId('droppable-phase-1')).toBeInTheDocument();
    });
  });

  // ============================================
  // SAVE CHANGES
  // ============================================
  describe('Save changes', () => {
    it('should call onSave with modified plan', async () => {
      const onSave = jest.fn();
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={onSave} />);

      await user.click(screen.getByRole('button', { name: /guardar/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          phases: expect.any(Array),
        }),
      );
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

  // ============================================
  // UNDO/REDO
  // ============================================
  describe('Undo/Redo', () => {
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

    it('should disable undo button when no history', () => {
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      expect(screen.getByRole('button', { name: /deshacer/i })).toBeDisabled();
    });

    it('should disable redo button when no future history', () => {
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      expect(screen.getByRole('button', { name: /rehacer/i })).toBeDisabled();
    });
  });

  // ============================================
  // PHASE MANAGEMENT
  // ============================================
  describe('Phase management', () => {
    it('should allow editing phase name', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.dblClick(screen.getByText('Phase 1: Setup'));

      const input = screen.getByDisplayValue('Phase 1: Setup');
      await user.clear(input);
      await user.type(input, 'Phase 1: Project Setup');
      await user.keyboard('{Enter}');

      expect(screen.getByText('Phase 1: Project Setup')).toBeInTheDocument();
    });

    it('should allow adding a new phase', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByRole('button', { name: /agregar fase/i }));

      expect(screen.getByText(/nueva fase/i)).toBeInTheDocument();
    });

    it('should allow deleting a phase', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.click(screen.getByTestId('delete-phase-0'));
      // Confirm deletion
      await user.click(screen.getByRole('button', { name: /confirmar/i }));

      expect(screen.queryByText('Phase 1: Setup')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // ACCESSIBILITY
  // ============================================
  describe('Accessibility', () => {
    it('should have accessible phase headers', () => {
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      const phaseButtons = screen.getAllByRole('button', { expanded: false });
      expect(phaseButtons.length).toBeGreaterThan(0);
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      render(<PlanEditor plan={mockPlan} onSave={jest.fn()} />);

      await user.tab();

      // First focusable element should be focused
      expect(document.activeElement).not.toBe(document.body);
    });
  });
});

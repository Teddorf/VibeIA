'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type Question = {
  id: string;
  question: string;
  questionEs: string; // Spanish version for all-view mode
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  required: boolean;
};

const businessQuestions: Question[] = [
  {
    id: 'target_users',
    question: 'Who are your target users?',
    questionEs: '¿Quiénes son tus usuarios objetivo?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'main_features',
    question: 'What are the 3-5 main features you need?',
    questionEs: '¿Cuáles son las 3-5 funcionalidades principales que necesitas?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'scalability',
    question: 'How many users do you expect?',
    questionEs: '¿Cuántos usuarios esperas?',
    type: 'select',
    options: ['1-100', '100-1000', '1000-10000', '10000+'],
    required: true,
  },
  {
    id: 'integrations',
    question: 'Do you need integrations with external services? (e.g., Stripe, SendGrid)',
    questionEs: '¿Necesitas integraciones con servicios externos? (ej: Stripe, SendGrid)',
    type: 'textarea',
    required: false,
  },
  {
    id: 'auth_requirements',
    question: 'What authentication methods do you need?',
    questionEs: '¿Qué métodos de autenticación necesitas?',
    type: 'select',
    options: ['Email/Password', 'Social Login (Google, GitHub)', 'Magic Link', 'All of the above'],
    required: false,
  },
];

const MINIMUM_REQUIRED = 3;

interface Stage2Props {
  onNext: (data: Record<string, string>) => void;
  onBack: () => void;
  initialData?: Record<string, string>;
  viewMode?: 'single' | 'all';
}

export function Stage2BusinessAnalysis({
  onNext,
  onBack,
  initialData,
  viewMode = 'single',
}: Stage2Props) {
  // Original single-question mode state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialData || {});

  // All-questions mode state
  const [expandedSections, setExpandedSections] = useState<boolean[]>(
    businessQuestions.map((_, i) => i === 0), // First question expanded by default
  );
  const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set());

  // Calculate completion status
  const getCompletedCount = useCallback(() => {
    return businessQuestions.filter((q, i) => {
      if (skippedQuestions.has(i)) return false;
      return answers[q.id]?.trim().length > 0;
    }).length;
  }, [answers, skippedQuestions]);

  const completedCount = getCompletedCount();
  const progressPercent = Math.round((completedCount / businessQuestions.length) * 100);
  const canProceed = completedCount >= MINIMUM_REQUIRED;

  // Auto-expand next question when current is answered
  useEffect(() => {
    if (viewMode !== 'all') return;

    const currentExpandedIndex = expandedSections.findIndex(
      (expanded, i) => expanded && !skippedQuestions.has(i),
    );
    if (currentExpandedIndex === -1) return;

    const currentQuestion = businessQuestions[currentExpandedIndex];
    const isAnswered = answers[currentQuestion.id]?.trim().length > 0;

    if (isAnswered && currentExpandedIndex < businessQuestions.length - 1) {
      // Find next non-skipped question
      let nextIndex = currentExpandedIndex + 1;
      while (nextIndex < businessQuestions.length && skippedQuestions.has(nextIndex)) {
        nextIndex++;
      }
      if (nextIndex < businessQuestions.length) {
        setExpandedSections((prev) => {
          const next = [...prev];
          next[nextIndex] = true;
          return next;
        });
      }
    }
  }, [answers, viewMode, expandedSections, skippedQuestions]);

  // Single question mode handlers
  const currentQuestion = businessQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === businessQuestions.length - 1;

  const handleNext = () => {
    if (viewMode === 'all') {
      // Submit only non-skipped answers
      const filteredAnswers: Record<string, string> = {};
      businessQuestions.forEach((q, i) => {
        if (!skippedQuestions.has(i) && answers[q.id]?.trim()) {
          filteredAnswers[q.id] = answers[q.id];
        }
      });
      onNext(filteredAnswers);
    } else {
      if (isLastQuestion) {
        onNext(answers);
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      onBack();
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const toggleSection = (index: number) => {
    // If skipped, unskip it
    if (skippedQuestions.has(index)) {
      setSkippedQuestions((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }

    setExpandedSections((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleSkip = (index: number) => {
    setSkippedQuestions((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setExpandedSections((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
  };

  // Render input based on question type
  const renderInput = (question: Question, index: number, testIdPrefix: string = '') => {
    const testIdSuffix = testIdPrefix ? `-${index}` : '';

    if (question.type === 'textarea') {
      return (
        <Textarea
          data-testid={`answer-input${testIdSuffix}`}
          placeholder="Your answer..."
          rows={6}
          value={answers[question.id] || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          className="resize-none"
        />
      );
    }

    if (question.type === 'text') {
      return (
        <Input
          data-testid={`answer-input${testIdSuffix}`}
          placeholder="Your answer..."
          value={answers[question.id] || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
        />
      );
    }

    if (question.type === 'select') {
      return (
        <select
          data-testid={`answer-select${testIdSuffix}`}
          className="w-full p-3 border rounded-md bg-white dark:bg-slate-800"
          value={answers[question.id] || ''}
          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
        >
          <option value="">Select an option...</option>
          {question.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return null;
  };

  // ALL QUESTIONS VIEW MODE
  if (viewMode === 'all') {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Stage 2: Business Analysis</CardTitle>
          <CardDescription>Responde al menos 3 preguntas para continuar</CardDescription>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-500 mb-1">
              <span>{completedCount}/5 completadas</span>
              <span>{progressPercent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Question Accordions */}
          {businessQuestions.map((question, index) => {
            const isAnswered = answers[question.id]?.trim().length > 0;
            const isExpanded = expandedSections[index];
            const isSkipped = skippedQuestions.has(index);
            const isOptional = !question.required;

            return (
              <div
                key={question.id}
                data-testid={`question-section-${index}`}
                data-expanded={isExpanded ? 'true' : 'false'}
                className={`
                  border rounded-lg overflow-hidden transition-all
                  ${isSkipped ? 'skipped opacity-50 border-slate-600/50' : 'border-slate-200 dark:border-slate-700'}
                  ${isExpanded ? 'ring-2 ring-purple-500/30' : ''}
                `}
              >
                {/* Question Header */}
                <button
                  data-testid={`question-header-${index}`}
                  onClick={() => toggleSection(index)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Completion Indicator */}
                    <div
                      data-testid={`completion-indicator-${index}`}
                      className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                        ${isAnswered ? 'completed bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}
                        ${isSkipped ? 'bg-slate-300' : ''}
                      `}
                    >
                      {isAnswered ? (
                        <svg
                          data-testid={`checkmark-${index}`}
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>

                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {question.questionEs}
                    </span>

                    {isOptional && (
                      <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded">
                        Opcional
                      </span>
                    )}
                  </div>

                  <svg
                    className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Question Content */}
                {isExpanded && !isSkipped && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                    {renderInput(question, index, 'answer')}

                    {/* Skip button for optional questions */}
                    {isOptional && (
                      <button
                        data-testid={`skip-question-${index}`}
                        onClick={() => handleSkip(index)}
                        className="mt-2 text-sm text-slate-400 hover:text-slate-200 underline"
                      >
                        Omitir esta pregunta
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button onClick={onBack} variant="outline">
              Atrás
            </Button>
            <Button onClick={handleNext} disabled={!canProceed}>
              Siguiente: Análisis Técnico
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // SINGLE QUESTION VIEW MODE (Original)
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl">Stage 2: Business Analysis</CardTitle>
        <CardDescription>
          Question {currentQuestionIndex + 1} of {businessQuestions.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <label className="text-lg font-medium">{currentQuestion.question}</label>

          {currentQuestion.type === 'textarea' && (
            <Textarea
              placeholder="Your answer..."
              rows={6}
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              className="resize-none"
            />
          )}

          {currentQuestion.type === 'text' && (
            <Input
              placeholder="Your answer..."
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            />
          )}

          {currentQuestion.type === 'select' && (
            <select
              className="w-full p-3 border rounded-md bg-slate-800 border-slate-700 text-white"
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            >
              <option value="">Select an option...</option>
              {currentQuestion.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-between">
          <Button onClick={handleBack} variant="outline">
            Back
          </Button>
          <Button onClick={handleNext} disabled={!answers[currentQuestion.id]}>
            {isLastQuestion ? 'Next: Technical Analysis ' : 'Next Question '}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

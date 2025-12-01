'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type Question = {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
};

const businessQuestions: Question[] = [
  { id: 'target_users', question: 'Who are your target users?', type: 'textarea' },
  { id: 'main_features', question: 'What are the 3-5 main features you need?', type: 'textarea' },
  { id: 'scalability', question: 'How many users do you expect?', type: 'select', options: ['1-100', '100-1000', '1000-10000', '10000+'] },
  { id: 'integrations', question: 'Do you need integrations with external services? (e.g., Stripe, SendGrid)', type: 'textarea' },
  { id: 'auth_requirements', question: 'What authentication methods do you need?', type: 'select', options: ['Email/Password', 'Social Login (Google, GitHub)', 'Magic Link', 'All of the above'] },
];

export function Stage2BusinessAnalysis({ onNext, onBack, initialData }: { onNext: (data: any) => void; onBack: () => void; initialData?: any }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState\u003cRecord\u003cstring, string\u003e\u003e(initialData || {});

  const currentQuestion = businessQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === businessQuestions.length - 1;

  const handleNext = () => {
    if (isLastQuestion) {
      onNext(answers);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex \u003e 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      onBack();
    }
  };

  const handleAnswerChange = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  return (
    \u003cCard className="w-full max-w-3xl mx-auto"\u003e
      \u003cCardHeader\u003e
        \u003cCardTitle className="text-3xl"\u003eStage 2: Business Analysis\u003c/CardTitle\u003e
        \u003cCardDescription\u003e
          Question {currentQuestionIndex + 1} of {businessQuestions.length}
        \u003c/CardDescription\u003e
      \u003c/CardHeader\u003e
      \u003cCardContent className="space-y-6"\u003e
        \u003cdiv className="space-y-4"\u003e
          \u003clabel className="text-lg font-medium"\u003e
            {currentQuestion.question}
          \u003c/label\u003e

          {currentQuestion.type === 'textarea' && (
            \u003cTextarea
              placeholder="Your answer..."
              rows={6}
              value={answers[currentQuestion.id] || ''}
              onChange={(e) =\u003e handleAnswerChange(e.target.value)}
              className="resize-none"
            /\u003e
          )}

          {currentQuestion.type === 'text' && (
            \u003cInput
              placeholder="Your answer..."
              value={answers[currentQuestion.id] || ''}
              onChange={(e) =\u003e handleAnswerChange(e.target.value)}
            /\u003e
          )}

          {currentQuestion.type === 'select' && (
            \u003cselect
              className="w-full p-3 border rounded-md"
              value={answers[currentQuestion.id] || ''}
              onChange={(e) =\u003e handleAnswerChange(e.target.value)}
            \u003e
              \u003coption value=""\u003eSelect an option...\u003c/option\u003e
              {currentQuestion.options?.map((option) =\u003e (
                \u003coption key={option} value={option}\u003e
                  {option}
                \u003c/option\u003e
              ))}
            \u003c/select\u003e
          )}
        \u003c/div\u003e

        \u003cdiv className="flex justify-between"\u003e
          \u003cButton onClick={handleBack} variant="outline"\u003e
             Back
          \u003c/Button\u003e
          \u003cButton 
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
          \u003e
            {isLastQuestion ? 'Next: Technical Analysis ' : 'Next Question '}
          \u003c/Button\u003e
        \u003c/div\u003e
      \u003c/CardContent\u003e
    \u003c/Card\u003e
  );
}

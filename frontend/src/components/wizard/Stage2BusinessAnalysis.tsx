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
  const [answers, setAnswers] = useState<Record<string, string>>(initialData || {});

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
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      onBack();
    }
  };

  const handleAnswerChange = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

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
          <label className="text-lg font-medium">
            {currentQuestion.question}
          </label>

          {currentQuestion.type === 'textarea' && (
            <Textarea
              placeholder="Your answer..."
              rows={6}
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              className="resize-none"
            />
          )}

          {currentQuestion.type === 'text' && (
            <Input
              placeholder="Your answer..."
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
            />
          )}

          {currentQuestion.type === 'select' && (
            <select
              className="w-full p-3 border rounded-md"
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
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
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion.id]}
          >
            {isLastQuestion ? 'Next: Technical Analysis ' : 'Next Question '}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

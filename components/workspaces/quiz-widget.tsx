'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { telemetry } from '@/lib/telemetry';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

interface QuizWidgetProps {
  questions: QuizQuestion[];
  onComplete?: (result: QuizResult) => void;
}

interface QuizResult {
  correct: number;
  total: number;
  answers: { questionId: string; selectedIndex: number; correct: boolean }[];
}

export function QuizWidget({ questions, onComplete }: QuizWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<QuizResult['answers']>([]);
  const [completed, setCompleted] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isCorrect = selectedOption === currentQuestion?.correct_index;
  const progress = ((currentIndex + (showFeedback ? 1 : 0)) / questions.length) * 100;

  const handleOptionSelect = (index: number) => {
    if (showFeedback) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;

    setShowFeedback(true);

    const answer = {
      questionId: currentQuestion.id,
      selectedIndex: selectedOption,
      correct: isCorrect,
    };

    setAnswers((prev) => [...prev, answer]);

    telemetry.track('inline_content_interaction', {
      content_type: 'quiz',
      action: 'answer_submitted',
      correct: isCorrect,
      question_index: currentIndex,
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
    } else {
      // Quiz complete
      const result: QuizResult = {
        correct: answers.filter((a) => a.correct).length + (isCorrect ? 1 : 0),
        total: questions.length,
        answers: [...answers, { questionId: currentQuestion.id, selectedIndex: selectedOption!, correct: isCorrect }],
      };

      setCompleted(true);
      onComplete?.(result);

      telemetry.track('inline_content_interaction', {
        content_type: 'quiz',
        action: 'quiz_completed',
        score: result.correct,
        total: result.total,
        percentage: Math.round((result.correct / result.total) * 100),
      });
    }
  };

  if (completed) {
    const finalScore = answers.filter((a) => a.correct).length;
    const percentage = Math.round((finalScore / questions.length) * 100);

    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950/20 dark:to-emerald-950/20">
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
              Quiz Complete!
            </h3>
            <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
              {finalScore} / {questions.length} correct ({percentage}%)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Question {currentIndex + 1} of {questions.length}
        </p>
        <p className="text-base font-medium">{currentQuestion.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedOption === index;
          const isCorrectOption = index === currentQuestion.correct_index;

          let optionClass = 'border-border hover:border-violet-300 hover:bg-violet-50/50 dark:hover:border-violet-700 dark:hover:bg-violet-950/30';

          if (showFeedback) {
            if (isCorrectOption) {
              optionClass = 'border-green-500 bg-green-50 dark:border-green-600 dark:bg-green-950/30';
            } else if (isSelected && !isCorrectOption) {
              optionClass = 'border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/30';
            } else {
              optionClass = 'border-border opacity-50';
            }
          } else if (isSelected) {
            optionClass = 'border-violet-500 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/30';
          }

          return (
            <button
              key={index}
              onClick={() => handleOptionSelect(index)}
              disabled={showFeedback}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all',
                optionClass
              )}
            >
              <div
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-medium',
                  isSelected && !showFeedback && 'border-violet-500 bg-violet-500 text-white',
                  showFeedback && isCorrectOption && 'border-green-500 bg-green-500 text-white',
                  showFeedback && isSelected && !isCorrectOption && 'border-red-500 bg-red-500 text-white'
                )}
              >
                {showFeedback && isCorrectOption ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : showFeedback && isSelected && !isCorrectOption ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  String.fromCharCode(65 + index)
                )}
              </div>
              <span className="text-sm">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showFeedback && currentQuestion.explanation && (
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-medium">Explanation: </span>
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-2">
        {!showFeedback ? (
          <Button
            onClick={handleSubmit}
            disabled={selectedOption === null}
            size="sm"
          >
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNext} size="sm">
            {currentIndex < questions.length - 1 ? (
              <>
                Next Question
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            ) : (
              'Finish Quiz'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

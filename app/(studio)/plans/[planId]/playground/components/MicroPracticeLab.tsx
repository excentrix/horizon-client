import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BrainCircuit, CheckCircle2, ChevronRight, RefreshCw, XCircle } from "lucide-react";
import { telemetry } from "@/lib/telemetry";
import type { DailyTask } from "@/types";

type LessonBlock = NonNullable<DailyTask["lesson_blocks"]>[number];

interface MicroPracticeQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface MicroPracticeLabProps {
  taskId: string;
  lessonBlocks: LessonBlock[];
  onComplete: () => void;
}

export function MicroPracticeLab({ taskId, lessonBlocks, onComplete }: MicroPracticeLabProps) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<MicroPracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);
  const lessonBlockCount = lessonBlocks.length;

  // Simulate AI generating micro-practice from lesson blocks
  useEffect(() => {
    // In a real implementation this would call `planningApi.generateMicroPractice(taskId, lessonBlocks)`
    // Here we simulate the AI extraction for immediate UI feedback.
    
    const timer = setTimeout(() => {
      // Mock generated questions based on the typical 'Refactor' or 'Coding' task context
      const generated = [
        {
          question: "Which of the following adheres to PEP 8 variable naming conventions?",
          options: [
            "myVariableMap = {}",
            "MyVariableMap = {}",
            "my_variable_map = {}",
            "my-variable-map = {}"
          ],
          correctIndex: 2,
          explanation: "PEP 8 specifies that variable names in Python should be lowercase, with words separated by underscores (snake_case)."
        },
        {
          question: "When refactoring a large function, what is the primary goal of extracting smaller helper functions?",
          options: [
            "To make the code run faster on the CPU.",
            "To improve readability and adhere to the Single Responsibility Principle.",
            "To increase the overall line count of the file.",
            "To avoid using built-in methods."
          ],
          correctIndex: 1,
          explanation: "Extracting helper functions makes code more modular, readable, and easier to test. It rarely impacts raw execution speed."
        }
      ];
      setQuestions(generated);
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [taskId, lessonBlockCount]);

  const handleSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
  };

  const handleCheck = () => {
    if (selectedAnswer === null) return;
    const isCorrect = selectedAnswer === questions[currentIndex].correctIndex;
    
    setShowExplanation(true);
    setScores(prev => {
      const newScores = [...prev];
      newScores[currentIndex] = isCorrect;
      return newScores;
    });

    if (isCorrect) {
      telemetry.toastSuccess("Correct!");
    } else {
      telemetry.toastError("Not quite right. Check the explanation.");
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Finished all micro-practices
      onComplete();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-xl bg-slate-50 border-slate-200">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">Synthesizing Micro-Practice...</h3>
        <p className="text-sm text-slate-500 text-center max-w-sm mt-2">
          The Horizon AI is reading your lesson blocks and generating hyper-specific concept checks.
        </p>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];
  const isCorrect = selectedAnswer === currentQ.correctIndex;

  return (
    <div className="border border-indigo-100 bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 bg-indigo-50/50 px-5 py-3 border-b border-indigo-100">
        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
          <BrainCircuit className="w-4 h-4" />
        </div>
        <h3 className="font-semibold text-indigo-900 text-sm">Micro-Practice Lab</h3>
        <div className="ml-auto flex gap-1">
          {questions.map((_, idx) => (
            <div 
              key={idx} 
              className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-indigo-500 ring-2 ring-indigo-200' : idx < currentIndex ? (scores[idx] ? 'bg-emerald-500' : 'bg-red-500') : 'bg-slate-200'}`} 
            />
          ))}
        </div>
      </div>

      <div className="p-6">
        <h4 className="text-base font-medium text-slate-800 mb-4">{currentQ.question}</h4>
        
        <div className="space-y-2">
          {currentQ.options.map((opt: string, idx: number) => {
            let btnClass = "w-full justify-start text-left h-auto py-3 px-4 border text-sm font-normal ";
            
            if (showExplanation) {
              if (idx === currentQ.correctIndex) {
                btnClass += "bg-emerald-50 border-emerald-200 text-emerald-800";
              } else if (idx === selectedAnswer) {
                btnClass += "bg-red-50 border-red-200 text-red-800 opacity-70";
              } else {
                btnClass += "bg-slate-50 border-slate-200 text-slate-400 opacity-50";
              }
            } else {
              if (selectedAnswer === idx) {
                btnClass += "bg-indigo-50 border-indigo-300 text-indigo-800 shadow-sm";
              } else {
                btnClass += "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300";
              }
            }

            return (
              <Button
                key={idx}
                variant="outline"
                className={btnClass}
                onClick={() => handleSelect(idx)}
                disabled={showExplanation}
              >
                {opt}
                {showExplanation && idx === currentQ.correctIndex && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-600" />}
                {showExplanation && idx === selectedAnswer && idx !== currentQ.correctIndex && <XCircle className="w-4 h-4 ml-auto text-red-500" />}
              </Button>
            );
          })}
        </div>

        {showExplanation && (
          <div className={`mt-4 p-4 rounded-lg border ${isCorrect ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-orange-50 border-orange-100 text-orange-800'}`}>
            <p className="text-sm font-medium mb-1">{isCorrect ? 'Excellent!' : 'Review concept:'}</p>
            <p className="text-sm opacity-90">{currentQ.explanation}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {!showExplanation ? (
            <Button 
              onClick={handleCheck} 
              disabled={selectedAnswer === null}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Check Answer
            </Button>
          ) : (
            <Button 
              onClick={handleNext}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {currentIndex < questions.length - 1 ? "Next Question" : "Complete Lab"} <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

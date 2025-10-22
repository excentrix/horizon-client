'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const OnboardingPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [userData, setUserData] = useState({});
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const router = useRouter();

  const questions = [
    'What is your full name?',
    'What is your university?',
    'What are your learning goals?',
    'What is your learning style? (e.g., visual, auditory, reading/writing, kinesthetic)',
  ];

  useEffect(() => {
    setMessages([
      { from: 'ai', text: 'Hey there! I am your personal AI mentor. Before we start, tell me a bit about yourself.' },
      { from: 'ai', text: questions[0] },
    ]);
  }, []);

  const handleSend = () => {
    if (input.trim()) {
      const newMessages = [...messages, { from: 'user', text: input }];
      setMessages(newMessages);

      const nextStep = onboardingStep + 1;
      const questionKey = questions[onboardingStep].toLowerCase().replace(/\s/g, '_').replace(/\?/g, '');
      const updatedUserData = { ...userData, [questionKey]: input };
      setUserData(updatedUserData);

      if (nextStep < questions.length) {
        setMessages([...newMessages, { from: 'ai', text: questions[nextStep] }]);
        setOnboardingStep(nextStep);
      } else {
        // End of onboarding
        const summary = Object.entries(updatedUserData)
          .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
          .join('\n');
        setMessages([
          ...newMessages,
          { from: 'ai', text: 'Great! Here is a summary of your profile:' },
          { from: 'ai', text: summary },
          { from: 'ai', text: 'We can now proceed to your personalized dashboard.' },
        ]);
        setOnboardingCompleted(true);
      }

      setInput('');
    }
  };

  const handleContinue = async () => {
    // Here you would make the API call to save the user data
    console.log('User data to be saved:', userData);

    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Redirect to dashboard
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.from === 'ai' ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.from === 'ai'
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 border-t">
        {onboardingCompleted ? (
          <Button onClick={handleContinue} className="w-full">
            Continue to Dashboard
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
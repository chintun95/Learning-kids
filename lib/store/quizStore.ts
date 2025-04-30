import { create } from "zustand";

export type Choice = {
  text: string;
  isCorrect: boolean;
};

export type Question = {
  question_id: string;
  question: string;
  choices: Choice[];
  question_answer: string;
  difficulty: 0 | 1 | 2;
  isAnswered: boolean;
  userAnswer?: string; // store what the user picked
};

type QuizStore = {
  questions: Question[];
  questionBank: Question[];
  addQuestion: (q: Omit<Question, "question_id" | "isAnswered">) => void;
  generateQuiz: (count: number) => void;
  markAnswered: (id: string, selectedAnswer: string) => void;
  resetQuiz: () => void;
};

export const useQuizStore = create<QuizStore>((set, get) => ({
  questions: [],
  questionBank: [
    {
      question_id: "1",
      question: "What does a red octagon sign mean?",
      choices: [
        { text: "Go", isCorrect: false },
        { text: "Stop", isCorrect: true },
        { text: "Yield", isCorrect: false },
        { text: "Slow", isCorrect: false },
      ],
      question_answer: "Stop",
      difficulty: 0,
      isAnswered: false,
    },
    {
      question_id: "2",
      question: "What does a yellow triangle with an exclamation mark mean?",
      choices: [
        { text: "Danger", isCorrect: false },
        { text: "Watch out", isCorrect: true },
        { text: "Stop", isCorrect: false },
        { text: "No Entry", isCorrect: false },
      ],
      question_answer: "Watch out",
      difficulty: 0,
      isAnswered: false,
    },
    {
      question_id: "3",
      question: "What sign means you must let other cars go first?",
      choices: [
        { text: "Stop", isCorrect: false },
        { text: "Yield", isCorrect: true },
        { text: "Speed Limit", isCorrect: false },
        { text: "Railroad", isCorrect: false },
      ],
      question_answer: "Yield",
      difficulty: 1,
      isAnswered: false,
    },
    {
      question_id: "4",
      question: "What color is typically used for warning signs?",
      choices: [
        { text: "Red", isCorrect: false },
        { text: "Green", isCorrect: false },
        { text: "Yellow", isCorrect: true },
        { text: "Blue", isCorrect: false },
      ],
      question_answer: "Yellow",
      difficulty: 1,
      isAnswered: false,
    },
    {
      question_id: "5",
      question: "What does a red circle with a line through it mean?",
      choices: [
        { text: "Stop", isCorrect: false },
        { text: "Allowed", isCorrect: false },
        { text: "Do not do something", isCorrect: true },
        { text: "Caution", isCorrect: false },
      ],
      question_answer: "Do not do something",
      difficulty: 1,
      isAnswered: false,
    },
    {
      question_id: "6",
      question: "What should you do when you see a 'Slippery When Wet' sign?",
      choices: [
        { text: "Speed up", isCorrect: false },
        { text: "Turn around", isCorrect: false },
        { text: "Slow down", isCorrect: true },
        { text: "Stop immediately", isCorrect: false },
      ],
      question_answer: "Slow down",
      difficulty: 2,
      isAnswered: false,
    },
    {
      question_id: "7",
      question: "What is the purpose of a 'School Zone' sign?",
      choices: [
        { text: "To warn drivers of high-speed areas", isCorrect: false },
        { text: "To warn drivers children are nearby", isCorrect: true },
        { text: "To show where to park", isCorrect: false },
        { text: "To indicate construction", isCorrect: false },
      ],
      question_answer: "To warn drivers children are nearby",
      difficulty: 2,
      isAnswered: false,
    },
    {
      question_id: "8",
      question: "What does a railroad crossing sign tell you?",
      choices: [
        { text: "Turn right", isCorrect: false },
        { text: "Be ready to stop for a train", isCorrect: true },
        { text: "No parking", isCorrect: false },
        { text: "School zone", isCorrect: false },
      ],
      question_answer: "Be ready to stop for a train",
      difficulty: 2,
      isAnswered: false,
    },
  ],
  addQuestion: (q) => {
    const newQuestion: Question = {
      ...q,
      question_id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      isAnswered: false,
    };
    set((state) => ({
      questionBank: [...state.questionBank, newQuestion],
    }));
  },
  generateQuiz: (count) => {
    const shuffled = [...get().questionBank].sort(() => Math.random() - 0.5);
    set({ questions: shuffled.slice(0, count) });
  },
  markAnswered: (id, selectedAnswer) => {
    set((state) => ({
      questions: state.questions.map((q) =>
        q.question_id === id
          ? {
              ...q,
              isAnswered: true,
              userAnswer: selectedAnswer, 
            }
          : q
      ),
    }));
  },
  resetQuiz: () => {
    set((state) => ({
      questions: [],
      questionBank: state.questionBank.map((q) => ({
        ...q,
        isAnswered: false,
        userAnswer: undefined,
      })),
    }));
  },
}));

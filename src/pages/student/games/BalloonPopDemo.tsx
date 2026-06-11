import { useNavigate } from 'react-router-dom';
import BalloonPopGame from './BalloonPopGame';

const DEMO_QUESTIONS = [
  {
    questionText: 'Which letter is B?',
    illustration: '🅱️',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'B',
    hint: 'B looks like a butterfly!',
    explanation: 'B is the second letter of the alphabet.',
  },
  {
    questionText: 'What number comes after 3?',
    illustration: '🔢',
    options: ['2', '5', '4', '1'],
    correctAnswer: '4',
    hint: 'Count: 1, 2, 3, ...',
    explanation: '4 comes right after 3!',
  },
  {
    questionText: 'Which starts with the letter S?',
    illustration: '⭐',
    options: ['Star', 'Moon', 'Tree', 'Ball'],
    correctAnswer: 'Star',
    hint: 'Look at the picture!',
    explanation: 'Star starts with the letter S!',
  },
  {
    questionText: 'How many apples? 🍎🍎🍎',
    illustration: '🍎',
    options: ['2', '3', '4', '5'],
    correctAnswer: '3',
    hint: 'Count each apple carefully!',
    explanation: 'There are 3 apples!',
  },
  {
    questionText: 'What color is the sun?',
    illustration: '☀️',
    options: ['Blue', 'Green', 'Yellow', 'Red'],
    correctAnswer: 'Yellow',
    hint: 'Look up at the sky on a sunny day!',
    explanation: 'The sun is yellow!',
  },
];

export default function BalloonPopDemo() {
  const navigate = useNavigate();

  return (
    <BalloonPopGame
      questions={DEMO_QUESTIONS}
      onComplete={(results) => {
        console.log('BalloonPop results:', results);
        navigate('/student/play');
      }}
      onExit={() => navigate('/student/play')}
      domainName="Free Play"
      skillName="Fun Quiz"
    />
  );
}

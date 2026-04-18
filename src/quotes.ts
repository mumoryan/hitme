export type Category = 'stoic' | 'hustle' | 'calm' | 'none'

export interface Quote {
  id: string
  text: string
  category: Category
  author?: string
}

export const ESSENTIALS: Quote[] = [
  { id: 's01', category: 'stoic', text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
  { id: 's02', category: 'stoic', text: 'The obstacle is the way.', author: 'Ryan Holiday' },
  { id: 's03', category: 'stoic', text: 'Waste no more time arguing what a good man should be. Be one.', author: 'Marcus Aurelius' },
  { id: 's04', category: 'stoic', text: 'He who fears death will never do anything worthy of a living man.', author: 'Seneca' },
  { id: 's05', category: 'stoic', text: 'What stands in the way becomes the way.', author: 'Marcus Aurelius' },
  { id: 's06', category: 'stoic', text: 'Difficulties strengthen the mind, as labor does the body.', author: 'Seneca' },
  { id: 's07', category: 'stoic', text: 'If it is not right, do not do it. If it is not true, do not say it.', author: 'Marcus Aurelius' },
  { id: 's08', category: 'stoic', text: 'We suffer more in imagination than in reality.', author: 'Seneca' },
  { id: 's09', category: 'stoic', text: 'The best revenge is to be unlike him who performed the injury.', author: 'Marcus Aurelius' },
  { id: 's10', category: 'stoic', text: 'No man is free who is not master of himself.', author: 'Epictetus' },
  { id: 's11', category: 'stoic', text: 'First say to yourself what you would be; then do what you have to do.', author: 'Epictetus' },
  { id: 's12', category: 'stoic', text: 'A gem cannot be polished without friction, nor a man perfected without trials.', author: 'Seneca' },
  { id: 's13', category: 'stoic', text: "Don't explain your philosophy. Embody it.", author: 'Epictetus' },
  { id: 's14', category: 'stoic', text: 'The happiness of your life depends upon the quality of your thoughts.', author: 'Marcus Aurelius' },
  { id: 's15', category: 'stoic', text: 'It is not death that a man should fear, but never beginning to live.', author: 'Marcus Aurelius' },
  { id: 's16', category: 'stoic', text: 'Man conquers the world by conquering himself.' },
  { id: 's17', category: 'stoic', text: 'The universe is change; our life is what our thoughts make it.', author: 'Marcus Aurelius' },

  { id: 'h01', category: 'hustle', text: 'Show up before you feel ready.' },
  { id: 'h02', category: 'hustle', text: 'Do the thing and you will have the power.', author: 'Ralph Waldo Emerson' },
  { id: 'h03', category: 'hustle', text: "You miss 100% of the shots you don't take.", author: 'Wayne Gretzky' },
  { id: 'h04', category: 'hustle', text: 'Discipline equals freedom.', author: 'Jocko Willink' },
  { id: 'h05', category: 'hustle', text: 'Work while they sleep.' },
  { id: 'h06', category: 'hustle', text: 'Small hinges swing big doors.', author: 'W. Clement Stone' },
  { id: 'h07', category: 'hustle', text: 'Ship it. Fix it later.' },
  { id: 'h08', category: 'hustle', text: 'Dream big, start small, act now.', author: 'Robin Sharma' },
  { id: 'h09', category: 'hustle', text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { id: 'h10', category: 'hustle', text: 'Done beats perfect.' },
  { id: 'h11', category: 'hustle', text: "Hard work beats talent when talent doesn't work hard.", author: 'Tim Notke' },
  { id: 'h12', category: 'hustle', text: "The grind doesn't care about your mood." },
  { id: 'h13', category: 'hustle', text: 'Bet on yourself.' },
  { id: 'h14', category: 'hustle', text: 'Stay hungry. Stay foolish.', author: 'Stewart Brand' },
  { id: 'h15', category: 'hustle', text: 'Action is the antidote to despair.', author: 'Joan Baez' },
  { id: 'h16', category: 'hustle', text: 'One more rep.' },
  { id: 'h17', category: 'hustle', text: 'Pressure is a privilege.', author: 'Billie Jean King' },

  { id: 'c01', category: 'calm', text: 'Breathe in. Breathe out. Begin again.' },
  { id: 'c02', category: 'calm', text: 'You are not your thoughts.' },
  { id: 'c03', category: 'calm', text: 'The present moment is enough.' },
  { id: 'c04', category: 'calm', text: 'Feelings are visitors. Let them come and go.' },
  { id: 'c05', category: 'calm', text: "You can't calm the storm. Calm yourself.", author: 'Timber Hawkeye' },
  { id: 'c06', category: 'calm', text: 'Slow is smooth. Smooth is fast.' },
  { id: 'c07', category: 'calm', text: 'This too shall pass.' },
  { id: 'c08', category: 'calm', text: 'Softness is strength.' },
  { id: 'c09', category: 'calm', text: 'Less striving. More being.' },
  { id: 'c10', category: 'calm', text: 'Where attention goes, energy flows.', author: 'Tony Robbins' },
  { id: 'c11', category: 'calm', text: 'Peace begins with a pause.' },
  { id: 'c12', category: 'calm', text: "You've survived 100% of your worst days." },
  { id: 'c13', category: 'calm', text: "The river doesn't rush. It arrives." },
  { id: 'c14', category: 'calm', text: "Put down what you don't need to carry." },
  { id: 'c15', category: 'calm', text: 'Nothing to prove. Nowhere to be.' },
  { id: 'c16', category: 'calm', text: 'Let it be.', author: 'The Beatles' },

  // Networking / social overwhelm
  { id: 'n01', category: 'hustle', text: "Everyone you'll ever meet knows something you don't.", author: 'Bill Nye' },
  { id: 'n02', category: 'calm', text: 'Be curious, not impressive. Ask one good question.' },
  { id: 'n03', category: 'stoic', text: 'You can make more friends in two months by becoming interested in other people than in two years by trying to get other people interested in you.', author: 'Dale Carnegie' },
  { id: 'n04', category: 'calm', text: 'They are nervous too. You are not alone in this room.' },

  // Public speaking / presentation
  { id: 'p01', category: 'hustle', text: 'The audience wants you to succeed. They are rooting for you.' },
  { id: 'p02', category: 'stoic', text: 'Speak not because you have to say something, but because you have something to say.', author: 'Plato' },
  { id: 'p03', category: 'calm', text: 'Nervousness is just excitement without breath. Breathe.' },
  { id: 'p04', category: 'hustle', text: 'Once you start, the fear disappears. Start.' },

  // Post-rejection (dating or job)
  { id: 'r01', category: 'stoic', text: 'Rejection is redirection. The next door will open.' },
  { id: 'r02', category: 'calm', text: "It wasn't the right fit — for either of you." },
  { id: 'r03', category: 'hustle', text: 'The only way to guarantee failure is to stop trying.' },
  { id: 'r04', category: 'stoic', text: "What doesn't kill me makes me stronger.", author: 'Friedrich Nietzsche' },

  // Gym / last set / physical push
  { id: 'g01', category: 'hustle', text: 'The last rep is the only one that counts.' },
  { id: 'g02', category: 'hustle', text: 'Your body can stand almost anything. It is your mind you have to convince.' },
  { id: 'g03', category: 'hustle', text: 'Pain is temporary. Quitting lasts forever.', author: 'Lance Armstrong' },
  { id: 'g04', category: 'hustle', text: 'Do not stop when you are tired. Stop when you are done.' },

  // Morning / first thing
  { id: 'm01', category: 'hustle', text: 'Win the morning. Win the day.' },
  { id: 'm02', category: 'calm', text: 'Each morning we are born again. What we do today matters most.', author: 'Buddha' },
  { id: 'm03', category: 'stoic', text: 'Concentrate every minute on doing what is in front of you with precise and genuine seriousness.', author: 'Marcus Aurelius' },
  { id: 'm04', category: 'hustle', text: 'Get up. Show up. Grow up.' },

  // Dealing with a difficult person
  { id: 'd01', category: 'stoic', text: 'When you wake up in the morning, tell yourself: the people I deal with today will be meddling, ungrateful, arrogant. But I have seen the beauty of good.', author: 'Marcus Aurelius' },
  { id: 'd02', category: 'calm', text: "You can't control others. You can control your response." },
  { id: 'd03', category: 'stoic', text: 'Respond, do not react.' },
  { id: 'd04', category: 'calm', text: 'Hurt people hurt people. Lead with curiosity, not judgement.' },

  // Wind-down / bedtime / alone time
  { id: 'b01', category: 'calm', text: 'You did enough today. Rest is productive.' },
  { id: 'b02', category: 'calm', text: 'Let the day go. Tomorrow is a clean slate.' },
  { id: 'b03', category: 'calm', text: 'Silence is not empty. It is full of answers.' },
  { id: 'b04', category: 'calm', text: 'Solitude is where I place my chaos to rest and awaken my inner peace.', author: 'Nikki Rowe' },
]

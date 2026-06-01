export const successMessages = [
  "You cooked fr 🔥",
  "Absolutely sent it 🚀",
  "That's the move fam ✅",
  "Built different 💪",
  "No cap, that's clean code 🧹",
  "W submission, let's gooo 🎉",
  "Legendary behavior right here 👑",
  "Bro actually cooked 🍳",
  "Sheesh, look at you go 😤",
  "Pure drip in code form 💧",
];

export const failMessages = [
  "Almost fam, check your edge cases 👀",
  "Bruh you were so close 💀",
  "The code is in the walls... try again",
  "Not quite, but you got this 🤝",
  "One more look, you'll crack it 🔍",
  "L for now, W incoming 🙏",
  "Nah we keep going, don't fold 💪",
  "The answer is right there, I can feel it 👁",
  "Minor setback for a major comeback 🔄",
  "You'll get it, just think it through 🧠",
];

export function randomMessage(passed: boolean): string {
  const pool = passed ? successMessages : failMessages;
  return pool[Math.floor(Math.random() * pool.length)];
}

import "dotenv/config";
import { PrismaClient, Difficulty } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

const problems = [
  {
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "BEGINNER" as Difficulty,
    tags: ["Array", "Hash Map"],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return **indices** of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
      { input: "nums = [3,3], target = 6", output: "[0,1]" },
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    starterJs: `function twoSum(nums, target) {
  // your code here
}`,
    starterPy: `def two_sum(nums, target):
    # your code here
    pass`,
    fnNameJs: "twoSum",
    fnNamePy: "two_sum",
    hints: [
      { order: 1, body: "Try using a hash map to store numbers you've seen so far. For each number, check if `target - num` is in the map." },
      { order: 2, body: "Loop through the array once. For each index `i`, check if `target - nums[i]` exists in your map. If yes, return the indices. If no, add `nums[i]` to the map with its index." },
    ],
    testCases: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1], isVisible: true },
      { input: [[3, 2, 4], 6], expected: [1, 2], isVisible: true },
      { input: [[3, 3], 6], expected: [0, 1], isVisible: true },
      { input: [[-1, -2, -3, -4, -5], -8], expected: [2, 4], isVisible: false },
      { input: [[1, 5], 6], expected: [0, 1], isVisible: false },
      { input: [[0, 4, 3, 0], 0], expected: [0, 3], isVisible: false },
      { input: [[2, 5, 5, 11], 10], expected: [1, 2], isVisible: false },
      { input: [[1, 2, 3, 4, 5, 6], 11], expected: [4, 5], isVisible: false },
    ],
  },
  {
    title: "Reverse a String",
    slug: "reverse-string",
    difficulty: "BEGINNER" as Difficulty,
    tags: ["String"],
    description: `Given a string \`s\`, return the string reversed.`,
    examples: [
      { input: 's = "hello"', output: '"olleh"' },
      { input: 's = "world"', output: '"dlrow"' },
    ],
    constraints: [
      "1 <= s.length <= 10^5",
      "s consists of printable ASCII characters",
    ],
    starterJs: `function reverseString(s) {
  // your code here
}`,
    starterPy: `def reverse_string(s):
    # your code here
    pass`,
    fnNameJs: "reverseString",
    fnNamePy: "reverse_string",
    hints: [
      { order: 1, body: "Try converting the string to an array, reversing it, and joining it back." },
      { order: 2, body: "In Python, you can use slicing: `s[::-1]`. In JavaScript, use `s.split('').reverse().join('')`." },
    ],
    testCases: [
      { input: ["hello"], expected: "olleh", isVisible: true },
      { input: ["world"], expected: "dlrow", isVisible: true },
      { input: ["a"], expected: "a", isVisible: true },
      { input: ["Hannah"], expected: "hannaH", isVisible: false },
      { input: ["abcdefg"], expected: "gfedcba", isVisible: false },
      { input: ["racecar"], expected: "racecar", isVisible: false },
      { input: ["12345"], expected: "54321", isVisible: false },
      { input: ["abc"], expected: "cba", isVisible: false },
    ],
  },
  {
    title: "FizzBuzz",
    slug: "fizzbuzz",
    difficulty: "BEGINNER" as Difficulty,
    tags: ["Math", "String"],
    description: `Given an integer \`n\`, return a string array where:

- \`answer[i] == "FizzBuzz"\` if \`i\` is divisible by 3 and 5.
- \`answer[i] == "Fizz"\` if \`i\` is divisible by 3.
- \`answer[i] == "Buzz"\` if \`i\` is divisible by 5.
- \`answer[i] == i\` (as a string) if none of the above conditions are true.

**Note:** \`i\` starts from 1 and goes up to \`n\` (inclusive).`,
    examples: [
      { input: "n = 3", output: '["1","2","Fizz"]' },
      { input: "n = 5", output: '["1","2","Fizz","4","Buzz"]' },
      { input: "n = 15", output: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]' },
    ],
    constraints: ["1 <= n <= 10^4"],
    starterJs: `function fizzBuzz(n) {
  // your code here
}`,
    starterPy: `def fizz_buzz(n):
    # your code here
    pass`,
    fnNameJs: "fizzBuzz",
    fnNamePy: "fizz_buzz",
    hints: [
      { order: 1, body: "Loop from 1 to n (inclusive). For each number, check divisibility with the `%` operator." },
      { order: 2, body: "Check for FizzBuzz (divisible by both 3 and 5) **first**, before checking Fizz or Buzz separately!" },
    ],
    testCases: [
      { input: [3], expected: ["1", "2", "Fizz"], isVisible: true },
      { input: [5], expected: ["1", "2", "Fizz", "4", "Buzz"], isVisible: true },
      { input: [15], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"], isVisible: true },
      { input: [1], expected: ["1"], isVisible: false },
      { input: [10], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz"], isVisible: false },
      { input: [2], expected: ["1", "2"], isVisible: false },
      { input: [6], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz"], isVisible: false },
      { input: [20], expected: ["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz", "16", "17", "Fizz", "19", "Buzz"], isVisible: false },
    ],
  },
  {
    title: "Palindrome Check",
    slug: "palindrome-check",
    difficulty: "BEGINNER" as Difficulty,
    tags: ["String", "Two Pointers"],
    description: `Given a string \`s\`, return \`true\` if it is a palindrome, or \`false\` otherwise.

A string is a **palindrome** if it reads the same forward and backward.`,
    examples: [
      { input: 's = "racecar"', output: "true" },
      { input: 's = "hello"', output: "false" },
      { input: 's = "a"', output: "true" },
    ],
    constraints: [
      "1 <= s.length <= 2 * 10^5",
      "s consists only of printable ASCII characters",
    ],
    starterJs: `function isPalindrome(s) {
  // your code here
}`,
    starterPy: `def is_palindrome(s):
    # your code here
    pass`,
    fnNameJs: "isPalindrome",
    fnNamePy: "is_palindrome",
    hints: [
      { order: 1, body: "Reverse the string and check if it equals the original." },
      { order: 2, body: "Or use two pointers — one starting from the left, one from the right — moving toward the center, comparing characters." },
    ],
    testCases: [
      { input: ["racecar"], expected: true, isVisible: true },
      { input: ["hello"], expected: false, isVisible: true },
      { input: ["a"], expected: true, isVisible: true },
      { input: ["abba"], expected: true, isVisible: false },
      { input: ["abcba"], expected: true, isVisible: false },
      { input: ["abcd"], expected: false, isVisible: false },
      { input: ["madam"], expected: true, isVisible: false },
      { input: ["noon"], expected: true, isVisible: false },
    ],
  },
  {
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    difficulty: "AMATEUR" as Difficulty,
    tags: ["Stack", "String"],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'",
    ],
    starterJs: `function isValid(s) {
  // your code here
}`,
    starterPy: `def is_valid(s):
    # your code here
    pass`,
    fnNameJs: "isValid",
    fnNamePy: "is_valid",
    hints: [
      { order: 1, body: "Use a **stack** data structure. Push opening brackets onto the stack. When you see a closing bracket, check if it matches the top of the stack." },
      { order: 2, body: "Use a map to store matching pairs: `)` → `(`, `}` → `{`, `]` → `[`. If the stack is empty when you need to pop, or if the brackets don't match, return false." },
    ],
    testCases: [
      { input: ["()"], expected: true, isVisible: true },
      { input: ["()[]{}"], expected: true, isVisible: true },
      { input: ["(]"], expected: false, isVisible: true },
      { input: ["([{}])"], expected: true, isVisible: false },
      { input: ["{[]}"], expected: true, isVisible: false },
      { input: ["([)]"], expected: false, isVisible: false },
      { input: ["{"], expected: false, isVisible: false },
      { input: [""], expected: true, isVisible: false },
    ],
  },
  {
    title: "Move Zeros",
    slug: "move-zeros",
    difficulty: "AMATEUR" as Difficulty,
    tags: ["Array", "Two Pointers"],
    description: `Given an integer array \`nums\`, move all \`0\`'s to the end of it while maintaining the relative order of the non-zero elements.

Return the resulting array.`,
    examples: [
      { input: "nums = [0,1,0,3,12]", output: "[1,3,12,0,0]" },
      { input: "nums = [0]", output: "[0]" },
    ],
    constraints: [
      "1 <= nums.length <= 10^4",
      "-2^31 <= nums[i] <= 2^31 - 1",
    ],
    starterJs: `function moveZeroes(nums) {
  // your code here
}`,
    starterPy: `def move_zeroes(nums):
    # your code here
    pass`,
    fnNameJs: "moveZeroes",
    fnNamePy: "move_zeroes",
    hints: [
      { order: 1, body: "Try using two pointers — one to track the position for the next non-zero element." },
      { order: 2, body: "Loop through the array. Keep a `writeIdx` at 0. Every time you see a non-zero, place it at `writeIdx` and increment. Then fill remaining spots with 0s." },
    ],
    testCases: [
      { input: [[0, 1, 0, 3, 12]], expected: [1, 3, 12, 0, 0], isVisible: true },
      { input: [[0]], expected: [0], isVisible: true },
      { input: [[1]], expected: [1], isVisible: true },
      { input: [[0, 0, 1]], expected: [1, 0, 0], isVisible: false },
      { input: [[1, 0, 2, 0, 3]], expected: [1, 2, 3, 0, 0], isVisible: false },
      { input: [[1, 2, 3]], expected: [1, 2, 3], isVisible: false },
      { input: [[0, 0, 0, 1]], expected: [1, 0, 0, 0], isVisible: false },
      { input: [[4, 2, 4, 0, 0, 3, 0, 5, 1, 0]], expected: [4, 2, 4, 3, 5, 1, 0, 0, 0, 0], isVisible: false },
    ],
  },
  {
    title: "Fibonacci Number",
    slug: "fibonacci-number",
    difficulty: "AMATEUR" as Difficulty,
    tags: ["Math", "Dynamic Programming", "Recursion"],
    description: `The **Fibonacci numbers**, commonly denoted \`F(n)\`, form a sequence such that each number is the sum of the two preceding ones, starting from \`0\` and \`1\`.

That is, \`F(0) = 0\`, \`F(1) = 1\`, and \`F(n) = F(n-1) + F(n-2)\` for \`n > 1\`.

Given \`n\`, calculate \`F(n)\`.`,
    examples: [
      { input: "n = 2", output: "1", explanation: "F(2) = F(1) + F(0) = 1 + 0 = 1." },
      { input: "n = 3", output: "2", explanation: "F(3) = F(2) + F(1) = 1 + 1 = 2." },
      { input: "n = 4", output: "3", explanation: "F(4) = F(3) + F(2) = 2 + 1 = 3." },
    ],
    constraints: ["0 <= n <= 30"],
    starterJs: `function fib(n) {
  // your code here
}`,
    starterPy: `def fib(n):
    # your code here
    pass`,
    fnNameJs: "fib",
    fnNamePy: "fib",
    hints: [
      { order: 1, body: "You can solve this recursively: `fib(n) = fib(n-1) + fib(n-2)`. But be careful — pure recursion is exponential. Try iterating instead." },
      { order: 2, body: "Iterative approach: keep track of the previous two Fibonacci numbers. Start with `a=0, b=1`. In each step, `a, b = b, a+b`. Repeat n times." },
    ],
    testCases: [
      { input: [2], expected: 1, isVisible: true },
      { input: [3], expected: 2, isVisible: true },
      { input: [4], expected: 3, isVisible: true },
      { input: [0], expected: 0, isVisible: false },
      { input: [1], expected: 1, isVisible: false },
      { input: [10], expected: 55, isVisible: false },
      { input: [20], expected: 6765, isVisible: false },
      { input: [30], expected: 832040, isVisible: false },
    ],
  },
  {
    title: "Remove Duplicates from Sorted Array",
    slug: "remove-duplicates",
    difficulty: "AMATEUR" as Difficulty,
    tags: ["Array", "Two Pointers"],
    description: `Given an integer array \`nums\` sorted in **non-decreasing order**, return an array of the **unique elements** in order.`,
    examples: [
      { input: "nums = [1,1,2]", output: "[1,2]" },
      { input: "nums = [0,0,1,1,1,2,2,3,3,4]", output: "[0,1,2,3,4]" },
    ],
    constraints: [
      "1 <= nums.length <= 3 * 10^4",
      "-100 <= nums[i] <= 100",
      "nums is sorted in non-decreasing order",
    ],
    starterJs: `function removeDuplicates(nums) {
  // your code here
}`,
    starterPy: `def remove_duplicates(nums):
    # your code here
    pass`,
    fnNameJs: "removeDuplicates",
    fnNamePy: "remove_duplicates",
    hints: [
      { order: 1, body: "The array is already sorted, so duplicates are adjacent. Use a two-pointer approach — one slow and one fast pointer." },
      { order: 2, body: "Walk `fast` through the array. When `nums[fast] !== nums[fast-1]`, it's a new unique — copy it to the `slow` position and advance `slow`." },
    ],
    testCases: [
      { input: [[1, 1, 2]], expected: [1, 2], isVisible: true },
      { input: [[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]], expected: [0, 1, 2, 3, 4], isVisible: true },
      { input: [[1]], expected: [1], isVisible: true },
      { input: [[1, 2, 3, 4, 5]], expected: [1, 2, 3, 4, 5], isVisible: false },
      { input: [[1, 1, 1, 1]], expected: [1], isVisible: false },
      { input: [[-3, -1, -1, 0, 0, 1, 2]], expected: [-3, -1, 0, 1, 2], isVisible: false },
      { input: [[1, 1, 2, 3, 3, 4]], expected: [1, 2, 3, 4], isVisible: false },
      { input: [[5, 5, 5, 5, 5]], expected: [5], isVisible: false },
    ],
  },
  {
    title: "Longest Common Prefix",
    slug: "longest-common-prefix",
    difficulty: "SEMI_PRO" as Difficulty,
    tags: ["String"],
    description: `Write a function to find the longest common prefix string amongst an array of strings.

If there is no common prefix, return an empty string \`""\`.`,
    examples: [
      { input: 'strs = ["flower","flow","flight"]', output: '"fl"' },
      { input: 'strs = ["dog","racecar","car"]', output: '""', explanation: "There is no common prefix among the input strings." },
    ],
    constraints: [
      "1 <= strs.length <= 200",
      "0 <= strs[i].length <= 200",
      "strs[i] consists of only lowercase English letters",
    ],
    starterJs: `function longestCommonPrefix(strs) {
  // your code here
}`,
    starterPy: `def longest_common_prefix(strs):
    # your code here
    pass`,
    fnNameJs: "longestCommonPrefix",
    fnNamePy: "longest_common_prefix",
    hints: [
      { order: 1, body: "Take the first string as the reference. Compare it character by character with each other string, shortening it as you find mismatches." },
      { order: 2, body: "Start with `prefix = strs[0]`. For each string in the array, shrink `prefix` until `string.startsWith(prefix)` is true. If `prefix` becomes empty, return `\"\"`." },
    ],
    testCases: [
      { input: [["flower", "flow", "flight"]], expected: "fl", isVisible: true },
      { input: [["dog", "racecar", "car"]], expected: "", isVisible: true },
      { input: [["interview", "internal", "inter"]], expected: "inter", isVisible: true },
      { input: [["a"]], expected: "a", isVisible: false },
      { input: [["ab", "a"]], expected: "a", isVisible: false },
      { input: [["abc", "abc", "abc"]], expected: "abc", isVisible: false },
      { input: [["prefix", "preface", "prepare"]], expected: "pre", isVisible: false },
      { input: [["apple", "app", "application"]], expected: "app", isVisible: false },
    ],
  },
  {
    title: "Maximum Subarray",
    slug: "maximum-subarray",
    difficulty: "SEMI_PRO" as Difficulty,
    tags: ["Array", "Dynamic Programming"],
    description: `Given an integer array \`nums\`, find the **subarray** with the largest sum, and return its sum.

A **subarray** is a contiguous non-empty part of an array.`,
    examples: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] has the largest sum = 6." },
      { input: "nums = [1]", output: "1" },
      { input: "nums = [5,4,-1,7,8]", output: "23" },
    ],
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4",
    ],
    starterJs: `function maxSubArray(nums) {
  // your code here
}`,
    starterPy: `def max_sub_array(nums):
    # your code here
    pass`,
    fnNameJs: "maxSubArray",
    fnNamePy: "max_sub_array",
    hints: [
      { order: 1, body: "This is the classic **Kadane's Algorithm** problem. Maintain two variables: `currentSum` (the max sum ending at the current index) and `maxSum` (the global max so far)." },
      { order: 2, body: "At each index: `currentSum = max(nums[i], currentSum + nums[i])`. This means: either start fresh at `nums[i]` or extend the previous subarray. Update `maxSum = max(maxSum, currentSum)`." },
    ],
    testCases: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6, isVisible: true },
      { input: [[1]], expected: 1, isVisible: true },
      { input: [[5, 4, -1, 7, 8]], expected: 23, isVisible: true },
      { input: [[-1]], expected: -1, isVisible: false },
      { input: [[-2, -1]], expected: -1, isVisible: false },
      { input: [[1, -2, 3]], expected: 3, isVisible: false },
      { input: [[-3, -2, -1, -4]], expected: -1, isVisible: false },
      { input: [[8, -19, 5, -4, 20]], expected: 21, isVisible: false },
    ],
  },
];

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.submission.deleteMany();
  await prisma.hint.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.user.deleteMany();

  for (const problem of problems) {
    const { hints, testCases, ...problemData } = problem;

    await prisma.problem.create({
      data: {
        ...problemData,
        examples: problemData.examples as object[],
        hints: {
          createMany: { data: hints },
        },
        testCases: {
          createMany: { data: testCases },
        },
      },
    });

    console.log(`  ✅ ${problem.title}`);
  }

  console.log(`\n🎉 Seeded ${problems.length} problems!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

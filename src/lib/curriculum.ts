export const TRACKS = [
  "CS fundamentals",
  "Visual design",
  "Behavioral",
] as const;
export type Track = (typeof TRACKS)[number];

export type Question = {
  id: string;
  title: string;
  track: "CS fundamentals" | "Behavioral";
  quick: string;
  example: string;
  transfer: string;
  followup: string;
  rubric: readonly string[];
};

export const QUESTIONS: readonly Question[] = [
  {
    id: "semantic-html",
    title: "Semantic HTML",
    track: "CS fundamentals",
    quick: "What does semantic HTML tell a browser about a control?",
    example:
      "A native button represents an action. Its label and button role can be announced by a screen reader. With keyboard navigation enabled, Tab can focus it, and Enter or Space can activate it. A plain div with a click handler responds to a pointer but has no built-in button role, tab stop, or keyboard activation.",
    transfer:
      "A sign-up form uses a styled div to submit. What would you change so someone can submit from the keyboard, and what does the markup communicate?",
    followup:
      'What would adding only role="button" to the div change, and what would you still need to implement?',
    rubric: [
      "Use a native button with a clear name and the appropriate submit type.",
      "Separate a control’s meaning (role and name) from its built-in focus and activation.",
      "Explain that an ARIA role alone adds neither keyboard focus nor activation.",
    ],
  },
  {
    id: "http",
    title: "HTTP requests and responses",
    track: "CS fundamentals",
    quick:
      "When a client asks for data over HTTP, what information goes in each direction?",
    example:
      "A library app sends GET /books/42. The method describes the intended operation and the path identifies the resource. The server can return 200 OK with JSON for the book, or 404 Not Found when it cannot provide that resource. Headers carry metadata such as the response’s content type.",
    transfer:
      "A task app sends a new task to POST /tasks and receives 201 Created. What did the client send, and what does the response tell it?",
    followup:
      "If the same request returns 400 instead, what would you check before retrying?",
    rubric: [
      "Name the method, target, and request data, plus the status and any response data.",
      "Explain that 201 indicates creation, while 400 calls for checking the request.",
      "Name a specific input, header, or validation error to inspect.",
    ],
  },
  {
    id: "indexes",
    title: "Database indexes",
    track: "CS fundamentals",
    quick:
      "How can a database find matching rows without reading the whole table?",
    example:
      "Think of a book’s index: it points you to pages with a term. A database index on a frequently searched column can similarly help find matching rows. The database may still read the table directly if most rows match. Indexes take space and add work when affected rows change.",
    transfer:
      "A large orders table frequently looks up all orders for one customer by customer_id. What would you try, and how would you check whether it helped?",
    followup:
      "Why might you avoid adding an index to every column in a table that gets frequent writes?",
    rubric: [
      "Tie an index on customer_id to the query’s filter.",
      "Compare the query plan or timings on representative data.",
      "Mention storage, write overhead, or why a scan can still be cheaper.",
    ],
  },
  {
    id: "processes-threads",
    title: "Processes and threads",
    track: "CS fundamentals",
    quick:
      "What do threads in a process share, and how does that differ from separate processes?",
    example:
      "A photo editor can run its interface and a background preview on different threads in one process. Threads share the process’s address space, though each has its own stack and execution state. Separate processes generally have separate virtual address spaces and need a way to pass data or explicitly share it.",
    transfer:
      "A document app adds a background spell checker. Compare putting it on another thread with running it as a separate process.",
    followup:
      "If two threads can update the same document state, what can go wrong and how could you prevent it?",
    rubric: [
      "Explain shared address space for threads and isolation between processes.",
      "Name a trade-off such as easy data sharing versus process isolation and communication.",
      "Describe a race and a concrete guard such as a lock or single owner.",
    ],
  },
  {
    id: "debugging",
    title: "Debugging a failing request",
    track: "CS fundamentals",
    quick:
      "What evidence would you collect before changing code for a failing request?",
    example:
      "A profile save shows a generic error. Reproduce it and inspect the request in the Network panel, including the method, URL, status and response. If the server returned a 500, use the request ID if available to find its log entry and test the suspected failure. Verify the same request after the fix.",
    transfer:
      "A search works for short terms but errors when you enter a two-word phrase. How would you narrow down where it breaks?",
    followup:
      "How would you show that your fix handles the original failure and keeps single-word searches working?",
    rubric: [
      "Compare one failing request with a known working request and change one variable.",
      "Use request details or correlated logs to test a specific hypothesis.",
      "Re-run the original input and a working input, or add a regression test for both.",
    ],
  },
  {
    id: "testing",
    title: "Choosing a useful test",
    track: "CS fundamentals",
    quick:
      "What makes a test useful when you are trying to prevent a specific bug?",
    example:
      "A shipping fee is free at $50 and above. A good test sets the subtotal to exactly $50 and checks the displayed charge. A second case just below the cutoff helps catch an off-by-one mistake. Test the behavior people rely on so the test remains useful when the implementation changes.",
    transfer:
      "After a checkout fix, a $5 discount must apply exactly once even when someone hits Apply twice. What test would catch the original bug?",
    followup:
      "When would you test the discount function alone, and when would you test the checkout UI?",
    rubric: [
      "Give a starting total and the action sequence that reproduces the bug.",
      "Assert the exact final total or other user-visible outcome.",
      "Choose a narrow test for pricing logic or a UI test when repeated clicks and wiring are the risk.",
    ],
  },
  {
    id: "teamwork",
    title: "Teamwork",
    track: "Behavioral",
    quick:
      "Recall a real time you and someone else had to get work done together.",
    example:
      "In a class project, a teammate and I were both changing the same screen. I suggested splitting ownership and held a short check-in to agree on the interface. We merged both parts and demoed the whole flow.",
    transfer:
      "Tell me about a time you helped a team move forward when people were working differently.",
    followup:
      "How did you find out whether your approach worked for the rest of the team?",
    rubric: [
      "Set the scene and name your responsibility.",
      "Describe your own collaboration choice and why you made it.",
      "Give an observable result and specific evidence for the follow-up.",
    ],
  },
  {
    id: "mistakes",
    title: "Mistakes",
    track: "Behavioral",
    quick: "Recall a mistake you made and something you changed afterward.",
    example:
      "I sent my team a build with the wrong configuration. I told them what happened, sent a corrected build, and added a short release checklist. On the next handoff, a teammate could verify the settings before sending it.",
    transfer:
      "Tell me about a time you owned up to an error that affected someone else.",
    followup:
      "What safeguard did you put in place, and how do you know it helped?",
    rubric: [
      "Name the mistake and its impact plainly.",
      "Explain how you communicated and acted to correct it.",
      "Name a specific safeguard and an observed result.",
    ],
  },
  {
    id: "ambiguity",
    title: "Ambiguity",
    track: "Behavioral",
    quick:
      "Think of a task you started with incomplete or unclear instructions.",
    example:
      "Our club asked for a better signup page. I asked what was hardest about the current one and learned that members couldn’t find the dates. I sketched a page with dates next to the form and tested it with two organizers.",
    transfer:
      "Describe a time you made progress on a task before all the requirements were clear.",
    followup: "Which assumption mattered most, and how did you check it?",
    rubric: [
      "Say what was unclear and what you needed to learn.",
      "Describe a question, experiment, or reversible step you took.",
      "Connect the result and the follow-up to evidence you actually observed.",
    ],
  },
];

export type Activity = {
  id: string;
  title: string;
  track: Track;
  href: string;
};

const questionActivity = ({ id, title, track }: Question): Activity => ({
  id,
  title,
  track,
  href: "/practice/" + id,
});

export const ACTIVITIES: readonly Activity[] = [
  ...QUESTIONS.filter((item) => item.track === "CS fundamentals").map(
    questionActivity,
  ),
  { id: "api", title: "What is an API?", track: "CS fundamentals", href: "/" },
  {
    id: "cache",
    title: "Design a cache",
    track: "Visual design",
    href: "/practice/cache",
  },
  {
    id: "offline-chat",
    title: "Offline chat",
    track: "Visual design",
    href: "/offline-chat",
  },
  ...QUESTIONS.filter((item) => item.track === "Behavioral").map(
    questionActivity,
  ),
];

import { useState } from "react";
import { RotateCcwIcon, BrainIcon } from "lucide-react";

// This bank is intentionally fixed: every play-through uses the same questions in the same order.
const questions = [
  ["What has keys but opens no locks?", "A piano"], ["What gets wetter the more it dries?", "A towel"],
  ["What has a face and two hands but no arms or legs?", "A clock"], ["What has to be broken before you can use it?", "An egg"],
  ["What has a neck but no head?", "A bottle"], ["What can travel around the world while staying in one corner?", "A stamp"],
  ["What has many teeth but cannot bite?", "A comb"], ["What goes up but never comes down?", "Your age"],
  ["What has one eye but cannot see?", "A needle"], ["What has cities but no houses, forests but no trees, and water but no fish?", "A map"],
  ["What begins with T, ends with T, and has T in it?", "A teapot"], ["What has four wheels and flies?", "A garbage truck"],
  ["What has a thumb and four fingers but is not alive?", "A glove"], ["What can you catch but not throw?", "A cold"],
  ["What has words but never speaks?", "A book"], ["What runs but never walks, has a bed but never sleeps?", "A river"],
  ["What has a head and a tail but no body?", "A coin"], ["What can fill a room but takes up no space?", "Light"],
  ["What has branches but no fruit, trunk, or leaves?", "A bank"], ["What kind of band never plays music?", "A rubber band"],
  ["What has 13 hearts but no other organs?", "A deck of cards"], ["What has lots of eyes but cannot see?", "A potato"],
  ["What has legs but does not walk?", "A table"], ["What can you keep after giving it to someone?", "Your word"],
  ["What goes through towns and over hills but never moves?", "A road"], ["What has a ring but no finger?", "A telephone"],
  ["What is full of holes but still holds water?", "A sponge"], ["What has an end but no beginning, a home but no family?", "A key"],
  ["What can be cracked, made, told, and played?", "A joke"], ["What has ears but cannot hear?", "Corn"],
  ["What kind of room has no doors or windows?", "A mushroom"], ["What comes once in a minute, twice in a moment, but never in a thousand years?", "The letter M"],
  ["What is always in front of you but cannot be seen?", "The future"], ["What has a bottom at the top?", "Your legs"],
  ["What can you hold without ever touching it?", "Your breath"], ["What has one head, one foot, and four legs?", "A bed"],
  ["What has a spine but no bones?", "A book"], ["What has a bark but no bite?", "A tree"],
  ["What has a crown but is not a king?", "A tooth"], ["What can you serve but never eat?", "A tennis ball"],
  ["What has a bottom, a top, and four sides, but no legs?", "A box"], ["What building has the most stories?", "A library"],
  ["What can go up a chimney down, but not down a chimney up?", "An umbrella"], ["What has six faces and twenty-one eyes but cannot see?", "A die"],
  ["What has a foot but no legs?", "A ruler"], ["What is easy to lift but hard to throw?", "A feather"],
  ["What belongs to you but is used more by others?", "Your name"], ["What gets bigger the more you take away?", "A hole"],
  ["What has no life but can die?", "A battery"], ["What can be seen in water but never gets wet?", "Your reflection"],
];

export function QuizPanel() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const progress = done ? 100 : Math.round((index / questions.length) * 100);
  const submit = (event) => {
    event.preventDefault();
    if (!answer.trim()) return;
    const correct = answer.trim().toLowerCase() === questions[index][1].toLowerCase();
    if (index === questions.length - 1) { setScore((value) => value + Number(correct)); setDone(true); }
    else { setScore((value) => value + Number(correct)); setIndex((value) => value + 1); setAnswer(""); }
  };
  const again = () => { setIndex(0); setAnswer(""); setScore(0); setDone(false); };
  return <section className="mx-auto w-full max-w-2xl p-4 sm:p-8" aria-label="Riddle quiz">
    <header className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent"><BrainIcon /></span><div><h1 className="text-xl font-semibold">Riddle quiz</h1><p className="text-sm text-muted">50 fixed riddles. Some silly, some serious.</p></div></header>
    <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div>
    {done ? <div className="mt-8 rounded-3xl border border-border bg-background p-8 text-center"><h2 className="text-2xl font-bold">Quiz complete!</h2><p className="mt-3 text-lg">Your score: <strong>{score} / {questions.length}</strong></p><button onClick={again} className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-semibold text-accent-foreground"><RotateCcwIcon className="size-4" />Try again</button></div> : <form onSubmit={submit} className="mt-6 rounded-3xl border border-border bg-background p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Question {index + 1} of {questions.length}</p><h2 className="mt-4 text-xl font-semibold leading-relaxed">{questions[index][0]}</h2><input autoComplete="off" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Your answer" className="mt-6 w-full rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-accent" /><button className="mt-4 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground">Submit answer</button></form>}
  </section>;
}

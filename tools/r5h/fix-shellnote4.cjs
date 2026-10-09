const { once, edit } = require("./lib.cjs");
edit("src/components/layout/app-shell.tsx", (s) => once(s,
  "      {/* ⭐ AND THE SHELL'S MARK, IN THE SERVER'S HTML (`lib/journey/shell-mark.ts`): the flag above arrives with its own\n"
  + "          chunk, at hydration at the earliest, and the Needle once drew for a few frames before it landed. With the mark on the page\n"
  + "          from the first byte, every overlay reads the answer right after hydrating. A classic page never carries it. */}\n",
  "      {/* ⭐ AND THE SHELL'S MARK, IN THE SERVER'S HTML (`lib/journey/shell-mark.ts`): the flag above arrives with its own\n"
  + "          chunk, at hydration at the earliest, and the Needle once drew for a few frames before it landed. With the mark\n"
  + "          on the page from the first byte, every overlay reads the answer right after hydrating. A classic page never\n"
  + "          carries it. */}\n", "as.mark2"));

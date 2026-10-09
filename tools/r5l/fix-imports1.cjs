const { once, edit } = require("./lib.cjs");
edit("src/app/live/loading.tsx", (s) => once(s, 'import { sideWord } from "@/lib/side-label";\n', "", "sideWord"));

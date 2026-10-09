// R5-L · the bar kit's note: the paragraph reflowed to the file's measure (a line broke after "`filterPillClass`'s").
const { once, edit } = require("./lib.cjs");
edit("src/components/ui/query-bar-ghost.tsx", (s) => once(s,
  " * promise. So every part here is the page's own box (`filterPillClass`'s\n"
  + " * geometry, the key's type, the sort's and the topic menu's summary) with the page's words set and not shown, and a\n"
  + " * group stands in `QUERY_GROUP_CLASS` behind the page's own `QueryGroupDivider`: the ghost's row wraps where the page's\n"
  + " * does, in every language and at every width.\n",
  " * promise. So every part here is the page's own box (`filterPillClass`'s geometry, the key's type, the sort's and the\n"
  + " * topic menu's summary) with the page's words set and not shown, and a group stands in `QUERY_GROUP_CLASS` behind the\n"
  + " * page's own `QueryGroupDivider`: the ghost's row wraps where the page's does, in every language and at every width.\n",
  "kit wrap"));

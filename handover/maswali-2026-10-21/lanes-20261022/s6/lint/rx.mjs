// Hand-copied regex literals from src/lib/marketing/millionea-claims.ts @ bd74c982c (no repo import).
// Used only to confirm how each regex behaves on substrings derived by hand from the traces.
const CURRENCY = String.raw`(?:tshs|tzs|tsh|shs|shillingi|shilingi|shillings?|sh)`;
const CURRENCY_SIGN = String.raw`(?:[/]=|[/]-)`;
export const RX = {
  SENTENCE_END: /[.!?;](?=\s|$)/,
  LIMIT_BEFORE: /\b(?:(?:u|ni|tu|m|wa|a|ku)?(?:ki|me|li|ta|na|nge)?(?:toa|weka|tuma)|withdraw(?:s|n|ing|als?)?|withdrew|deposit(?:s|ed|ing)?|transfer(?:s|red|ring)?|kikomo|limit|amana)\b[^.!?;,]{0,24}$/,
  GET_BEFORE: /(?:pat(?:a|ia|ie|e)|\b(?:get|gets|getting|got|earn|earns|score|scores|scored|collect|collects|claim|claims|chukua|jichukulie)|\b(?:take|takes|took|taking)\s+home|\b(?:walk(?:s|ed|ing)?\s+away|go(?:es|ing)?\s+home|went\s+home)\s+with|\b(?:a|wa)(?:me|li|na|ta)chukua)\s*$/,
  TAKE_BEFORE: /\b(?:take|takes|took|taking)\s*$/,
  SHOT_BEFORE: /(?:\b(?:shot|chance)\s+at|\bnafasi\s+ya)\s*$/,
  CURRENCY_AFTER: new RegExp(String.raw`^\s*(?:${CURRENCY}\b(?![.:]?\s*[0-9])|${CURRENCY_SIGN})`),
  CURRENCY_BEFORE: new RegExp(String.raw`\b${CURRENCY}[.:]?\s*$`),
  HOME_AFTER: new RegExp(String.raw`^\s*(?:${CURRENCY}\b[.:]?\s*)?home\b`),
  PRICE_BEFORE: /\b(?:bei|price|costs?|kiingilio|entry|inauzwa|sells\s+for)\b[^.!?;,]{0,24}$/,
  PHONE_AFTER: /^\s*(?:(?:kwenye|kwa|on|via|kupitia)\s+)?(?:whatsapp|simu|sms|telegram)\b/,
  COUNT_AFTER: /^\s*[+]?\s*(?:tanzanians?|watanzania|kenyans?|wakenya|views?|likes?|followers?|fans?|subscribers?|downloads?|players?|members?|people|users?|shares?|comments?|streams?|plays?|votes?|wafuasi|watazamaji|wachezaji|watu|wanachama|watumiaji|mashabiki|wapiga\s+kura|kura|maoni|vipakuliwa|watazamaji|tickets?\s+sold|zimeuzwa)\b/,
  PRIZE_WORDS: new RegExp([
    String.raw`shind|\bpots?\b|\breward|\b(?:wins?|winning\w*|won|winners?|prizes?)\b|\bjac?k[^a-z0-9]{0,6}pot(?:s|i)?\b|\bj[ae]ki?poti?\b`,
    String.raw`zawadi|tuz[ow]|(?:na|ta|me)ku(?:subiri|ngoj)|\bawait(?:s|ing)?\s+you\b|\bwaiting\s+for\s+you\b|\bup\s+for\s+grabs\b`,
    String.raw`(?:ta|me|na)?kuwa\s+(?:yako|zako|yenu|zenu)\b`,
    String.raw`\bmfuko\s+(?:(?:mkubwa|mnono|huu|wetu|wenu|wako|mpya)\s+)?(?:wa|ya)\s+(?:wiki|zawadi|milioni|bilioni|laki|${CURRENCY}\b|[0-9])`,
  ].join("|")),
  YOURS_BEFORE: /\b(?:it.?s|ni|is)\s+(?:yours|yako|zako|yenu|zenu)\s*[:-]?\s*$/,
  YOURS_AFTER: new RegExp(String.raw`^\s*(?:\b${CURRENCY}\b[.:]?\s*)?(?:(?:ni|is|are)\s+|(?:[a-z]+\s+){0,3}?(?:could|can|will|may|might)\s+be\s+)?(?:yako|zako|yenu|zenu|yours)\b`),
  READER: /\byou(?:r|rs)?\b|\bwewe\b|\b(?:yako|zako|lako|chako|kwako|wako|yenu|zenu|wenu|lenu|kwenu)\b|\bu(?:ta|na|me|li|ki|nge)[a-z]{3,}/,
  WHO: /\b(?:who|nani)\b/,
  MARKET_ASKS: /^\s*(?:50\s*pick\s*:\s*)?(?:je|will|would|can|could|does|do|did|is|are|has|have|what|which|how|when|where)\b/,
  FRAME: new RegExp([
    String.raw`\byours\b|change\s+a\s+life|\bwaiting\s+for\s+you\b|\bawait(?:s|ing)?\s+you\b`,
    String.raw`\b(?:you|youre|wewe|who)\b[^.!?;]{0,12}\bnext\b|\bnext\b[^.!?;]{0,12}\b(?:you|wewe)\b`,
    String.raw`\b(?:u|i|zi|ki|vi|li|ya)(?:na|ta|me)(?:ku|wa)?(?:subiri|ngoj)|\b[a-z]{0,4}?(?:na|ta|me)ku(?:subiri|ngoj)`,
    String.raw`\b(?:nani|wewe)\b[^.!?;]{0,12}\b(?:ajaye|atafuata|anayefuata)\b|\b(?:ajaye|atafuata|anayefuata)\b[^.!?;]{0,12}\b(?:nani|wewe)\b`,
  ].join("|")),
  WAIT_AFTER: new RegExp(String.raw`^\s*(?:${CURRENCY}\b[.:]?\s*)?(?:(?:is|are|now|still)\s+)*(?:waiting|awaits?|awaiting)\b`),
};
const PAY_AUX = String.raw`(?:has|have|had|is|are|was|were|will|would|shall|been|be|being|just|already|now|also|again|still|ever|even|once|recently|finally|proudly|officially|successfully|so\s+far|to\s+date|today|yesterday|in\s+total|altogether|this\s+(?:week|month|year|season)|last\s+(?:week|month|year|season))`;
const PAYER_EN = String.raw`\b(?:50\s*pick|we|our(?:\s+[a-z]+){1,2})(?:['’](?:ve|ll|d|re))?(?:\s+${PAY_AUX})*\s+`;
RX.PLATFORM_PAYS = new RegExp([
  String.raw`${PAYER_EN}(?:paid|pays|pay|paying)\b`,
  String.raw`${PAYER_EN}(?:made|makes|make|making|sent|sends|send|sending|issued|issues)\s+(?:[a-z-]+\s+){0,2}payouts?\b`,
  String.raw`\b50\s*pick['’]s\s+(?:[a-z-]+\s+){0,2}payouts?\b`,
  String.raw`\b(?:paid|payments?|payouts?)\b[^.!?;]{0,40}\bby\s+50\s*pick\b`,
  String.raw`\bpaid\s+(?:out\s+)?to\s+(?:[a-z0-9]+\s+){0,2}(?:players?|winners?|users?|members?|customers?|punters?|people|tanzanians?|you)\b`,
  String.raw`\b(?:players?|winners?|users?|members?|customers?|punters?)\s+(?:were|are|was|is|have\s+been|has\s+been|had\s+been|will\s+be|got|get|gets|getting)\s+(?:[a-z]+\s+)?paid\b`,
  String.raw`\btu(?:me|li|na|ta|mesha|lisha|ki|nge)(?:wa|ku|m|mw)?lip[ae]\b`,
  String.raw`\bwa(?:me|li|na|ta|mesha|lisha|ki|nge)lipw[ae]\b`,
].join("|"));
RX.PLATFORM_PAYS_NAMED = /\bi(?:me|li|na|ta|mesha|lisha)(?:wa|ku|m|mw)?(?:lipa|toa)\b|\b[a-z]*lipw[ae]\b|\b[a-z]*(?:lipa|toa|tolewa)\b[^.!?;]{0,40}\b(?:na|kutoka\s+kwa)\s+50\s*pick\b/;
RX.NAMES_50PICK = /\b50\s*pick\b/;
const TAX_NOUN = String.raw`(?:tax(?:es)?|fees?|lev(?:y|ies)|dut(?:y|ies)|kodi|ada|ushuru|tozo)`;
RX.TAX_HEADS = new RegExp(String.raw`\b${TAX_NOUN}(?:\s+(?:ya\s+|la\s+|za\s+|on\s+)?[a-z]+)?\s*(?:(?:of|ya|za|la|totall?ing|worth|amounting\s+to)\s*)?[:]?\s*(?:${CURRENCY}[.:]?\s*)?$`);
RX.TAX_FOLLOWS = new RegExp(String.raw`^\s*(?:${CURRENCY}\b[.:]?\s*)?(?:(?:in|as|for|kama|kwa)\s+(?:[a-z]+\s+)?)?${TAX_NOUN}\b`);
RX.TAX_NEGATED = new RegExp(String.raw`\b(?:no|zero|without|nil|free\s+of|bila|hakuna|pasipo)\s+(?:[a-z]+\s+)?(?:${TAX_NOUN}|makato|deductions?|charges?)\b|\b(?:tax|fee|levy|duty|commission|charge)[\s-]*free\b`);
RX.QUESTION_BEFORE = /(?:^|[.!?;]\s+)([^.!?;]+\?)\s*$/;
RX.WINNINGS_BEFORE = /\b(?:payouts?|winnings?|malipo)\b[^.!?;,]{0,24}$/;
RX.INCOME_QUESTION = /\btajir|\b(?:rich|riches|wealth|wealthy|money|cash|income|fortune|pesa|fedha|hela|kipato|mapato|faida)\b/;
RX.NEXT_YOU = /\bnext\b[^.!?;]{0,16}\b(?:could|might|may|will|can)\s+be\s+you\b|\b(?:you|it)\s+(?:could|might|may|will|can)\s+be\s+next\b|\byou(?:['’]re|\s+are)\s+next\b|\bcould\s+be\s+you\b|\bwewe\s+je\b|\b(?:wewe|ni\s+wewe)\b[^.!?;]{0,12}\b(?:ajaye|atafuata|anayefuata)\b/;
RX.TICKET_WORD = /\b(?:tiketi|tikiti|tickets?)\b/;
RX.THIRD_PERSON = /\b(?:a|wa)(?:na|ta|me|li|nge|ki)[a-z]{2,}\b|\b(?:he|she|they)\s+(?:is|was|were|are|will|has|had|gets?|got|earns?|earned|makes?|made)\b|\b[a-z]{3,}\s+(?:earns|gets|makes|is\s+paid|was\s+paid)\b/;
RX.READER_ALL = new RegExp(RX.READER.source, "g");
RX.READER_AFTER = /\b(?:you|your|yours|wewe|yako|zako|lako|chako|wako|kwako|yenu|zenu|wenu|lenu|kwenu)\b/;
RX.THIRD_PARTY = new RegExp(RX.THIRD_PERSON.source + String.raw`|\b(?:kwamba|that)\b|\b(?:i|zi|li|ki|vi|ya)(?:na|ta|me|li|ki)[a-z]{3,}\b|\b(?:signed|signs|spent|spends|raised|raises|raise|cost|costs|paid|bought|built|sold)\b`);
RX.ACCOUNT_FACT = /\b(?:balance|salio|holds?|holding)\b|\b(?:up\s+to|hadi|mpaka)\b[^.!?;]{0,40}\b(?:wallet|pochi|account|akaunti)\b|\b(?:wallet|pochi|account|akaunti)\s+(?:yako\s+|your\s+)?(?:has|have|holds|ina|zina)\b|\byou\s+have\b[^.!?;]{0,40}\bin\s+your\s+(?:wallet|account|balance)\b|\buna\b[^.!?;]{0,40}\b(?:kwenye|katika|ndani\s+ya)\s+(?:pochi|akaunti)\s+yako\b|\bamana\s+(?:ya\s+)?(?:hadi|mpaka)\b/;
RX.HYPOTHETICAL = /\b(?:imagine|imagining|picture|suppose|supposing|dream|dreaming|what\s+if|could|might|would|will|land|lands|landing|fikiria|wazia|tuseme|inaweza|zinaweza)\b|\b(?:i|zi)ta[a-z]{2,}|\b(?:u|i|zi|a|wa)nge[a-z]{2,}/;
RX.THIRD_SPEND = /\b(?!(?:you|we|i)\b)[a-z]{2,}\s+(?:(?:has|have|had|just|already|will|would)\s+)?(?:spent|spends|spend|paid|pays|bought|buys|signed|signs|raised|raises|sold|sells|built|builds|invested|invests|earned|earns|owes|owed)\b|\b(?:a|wa|i|zi|ki|vi|li|ya)(?:li|me|na|ta|mesha)(?:sajili|tumia|lipa|lipwa|nunua|uza|jenga|wekeza|changia)\b/;
RX.CLAUSE_START = /(?:^|[.,:;!?\-]\s*|\b(?:je|sasa|leo|kesho|wewe|basi|kama|ili|hata|pia|tayari|pick)\s+)$/;
const MONEY_SIZE = String.raw`millions?|milioni|billions?|bilioni|mill|mil|mln|mn|bil|bn|b|m|k`;
RX.MONEY_IN = new RegExp(String.raw`\b${CURRENCY}[.:]?\s*([0-9]+(?:[,. ][0-9]{3})*(?:[.,][0-9]+)?)(?:\s*(${MONEY_SIZE})\b)?|\b([0-9]+(?:[,. ][0-9]{3})*(?:[.,][0-9]+)?)(?:\s*(${MONEY_SIZE}))?\s*(?:${CURRENCY}\b|${CURRENCY_SIGN})`, "g");
RX.GENERIC_SUBJECT = /\b(?:anyone|anybody|someone|somebody|mtu|mshindi|washindi|winners?|wachezaji|players?|tickets?|tiketi|mmoja)\b/;
RX.UP_TO_BEFORE = /\b(?:hadi|mpaka|up\s+to)\s*$/;
RX.FIGURE_O = /(?<![a-z0-9])[0-9li|][0-9o]*(?:(?:[,.][0-9o]{3})+|(?: [0-9o]{3}){2,})(?![a-z0-9])/g;
RX.GROUPED_MARKS = /(?<![0-9])(?<![0-9][.,])[0-9]{1,3}(?:[,.][0-9]{3})+(?![0-9])(?![.,][0-9])/g;
RX.GROUPED_SPACES = /(?<![0-9+])(?<![0-9][.,])[0-9]{1,3}(?: [0-9]{3})+(?![0-9])(?![.,][0-9])/g;
RX.BARE = /(?<![0-9+])(?<![0-9][.,])[0-9]+(?![0-9])(?![.,][0-9])/g;
RX.SIZED = /(?<![0-9])(?<![0-9][.,])([0-9]+(?:[.,][0-9]+)*)\s*(millions?|milioni|billions?|bilioni|mill|mil|mln|mn|bil|bn|b|m|k)\b(?!-)/g;
RX.WORD_FIGURES = /\b(?:millions?|billions?|bilioni)\b/g;
RX.SIGNAL_WORDS = /\b(?:ma)?mill?ionea\b|\bmill?ionai?res?\b|\bjac?k[^a-z0-9]{0,6}pot(?:s|i)?\b|\bj[ae]ki?poti?\b|\b(?:ma)?milioni\b/g;
RX.HAN = /\p{Script=Han}/u;
RX.WIN_OR_GET = /shind|\b(?:wins?|winning|won|get|gets|got|take|takes|collect|collects|claim|claims)\b|pat(?:a|ia|ie|e)\b|chukua/;

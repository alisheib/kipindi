const mod = await import(process.argv[2]);
const html = mod.offlineDocument({ licenceNumber: "LICENCE-X" });
console.log("bytes", html.length);
console.log(html.slice(0, 1400));
console.log("...");
console.log(html.slice(html.indexOf("<body>"), html.indexOf("<body>") + 900));

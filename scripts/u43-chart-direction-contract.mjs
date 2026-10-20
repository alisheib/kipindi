/** The expanded terminal paints observed direction; the 56px card spark stays aqua. */
import ts from "typescript";

export function chartDirectionIssues(source, microSource) {
  const issues = [];
  const sf = ts.createSourceFile("terminal-chart.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const compact = (node) => node?.getText(sf).replace(/\s+/g, "") ?? "";
  const visit = (root, predicate) => {
    const found = [];
    const walk = (node) => {
      if (predicate(node)) found.push(node);
      ts.forEachChild(node, walk);
    };
    if (root) walk(root);
    return found;
  };
  const variable = (root, name) => {
    const matches = visit(root, (node) => ts.isVariableDeclaration(node) && node.name.getText(sf) === name);
    return matches.length === 1 ? matches[0].initializer : null;
  };
  const property = (object, name) => ts.isObjectLiteralExpression(object)
    ? object.properties.find((entry) => ts.isPropertyAssignment(entry) && entry.name.getText(sf) === name)?.initializer
    : null;
  const series = (root, kind) => {
    const calls = visit(root, (node) => ts.isCallExpression(node)
      && compact(node.expression) === "chart.addSeries"
      && compact(node.arguments[0]) === `lib.${kind}`);
    return calls.length === 1 ? calls[0].arguments[1] : null;
  };
  const expect = (id, good) => { if (!good) issues.push(id); };

  const draw = variable(sf, "draw");
  const body = ts.isCallExpression(draw) && ts.isArrowFunction(draw.arguments[0]) ? draw.arguments[0].body : null;
  expect("draw branch", body != null);
  if (!body) return issues;

  expect("direction tokens", compact(variable(body, "upInk")) === 'ink("--yes-400")'
    && compact(variable(body, "downInk")) === 'ink("--no-400")');
  const candles = series(body, "CandlestickSeries");
  expect("candle series", candles != null);
  if (candles) {
    expect("candle body", ["upColor", "borderUpColor", "wickUpColor"].every((name) => compact(property(candles, name)) === "upInk")
      && ["downColor", "borderDownColor", "wickDownColor"].every((name) => compact(property(candles, name)) === "downInk"));
  }
  expect("forming tokens", compact(variable(body, "formingUp")) === 'ink("--yes-400",0.45)'
    && compact(variable(body, "formingDown")) === 'ink("--no-400",0.45)');
  const bars = variable(body, "bars");
  const forming = visit(bars, (node) => ts.isObjectLiteralExpression(node)
    && ["color", "borderColor", "wickColor"].every((name) => property(node, name) != null));
  expect("forming candle direction", forming.length === 1
    && ["color", "borderColor", "wickColor"].every((name) => compact(property(forming[0], name)) === "c.c>=c.o?formingUp:formingDown")
    && visit(body, (node) => ts.isCallExpression(node) && compact(node) === "s.setData(ascUnique(bars))").length === 1);
  const volumeCalls = visit(body, (node) => ts.isCallExpression(node) && compact(node.expression) === "hv.setData");
  expect("volume candle direction", volumeCalls.length === 1
    && compact(volumeCalls[0]).includes('color:c.c>=c.o?ink("--yes-400",c.forming?0.18:0.3):ink("--no-400",c.forming?0.18:0.3)'));

  expect("curve endpoints", compact(variable(body, "real")) === "data.series.points.filter((pt)=>pt.price!=null)"
    && compact(variable(body, "first")) === "real[0]?.price??null"
    && compact(variable(body, "last")) === "real[real.length-1]?.price??null");
  const dirToken = variable(body, "dirToken");
  let direction = null;
  try {
    // This expression is the product's actual choice, evaluated over rising,
    // falling, flat and missing reads instead of re-implementing its mapping.
    direction = new Function("first", "last", `return (${dirToken?.getText(sf) ?? "undefined"});`);
  } catch { /* malformed expression fails below */ }
  expect("curve direction", direction != null
    && direction(100, 101) === "--yes-400"
    && direction(101, 100) === "--no-400"
    && direction(100, 100) === "--text-muted"
    && direction(null, 100) === "--text-muted");
  expect("curve ink bridge", compact(variable(body, "dirInk")) === "ink(dirToken)");
  const curve = series(body, "AreaSeries");
  expect("curve series", curve != null);
  if (curve) {
    expect("curve paint", compact(property(curve, "lineColor")) === "dirInk"
      && compact(property(curve, "topColor")) === 'ink(dirToken,dirToken==="--text-muted"?0.16:0.24)'
      && compact(property(curve, "bottomColor")) === "ink(dirToken,0.02)");
  }
  expect("micro line stays aqua", microSource.includes('stroke="var(--aqua-300)" strokeWidth="1.5"')
    && microSource.includes('r="2.5" fill="var(--aqua-300)"'));
  return issues;
}

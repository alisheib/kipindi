# S8 first-load factory reader — reviewed QA checkpoint

Status: isolated QA checkpoint on `codex/normal-visual-repairs`, after the unrelated collection-ownership checkpoint
`31526cafdb9edfcfb8a214de21a7f5246a0ec765`. No application change, integration, release closure or live deployment is
claimed. Root independently reviewed the mapping/parser and reran all103 controls, syntax and diff checks before
authorizing this checkpoint. The delegated peer review supplied the three reproduced parser defects addressed
below; root supplied the conditional-return and method-overwrite controls. This review does not replace fresh
browser proof of the final application source. The separate collection-ownership app gate is now38/38 at root
checkpoint `5c7748c00`, after root integrated31526 and measured the empty-only markers and native disabled Checkbox.

S7-PLAN A9(2) requires a HEAD-tied local build, route client-reference entries, each next/dynamic loader's declared
files, source marker uniqueness, and controls before verdicts. The previous structural reader treated *any* declared
dependency that appeared among entries as the selected component's first load. That inference is false on measured
Next16.4 Turbopack output: common Input/kit/runtime dependencies can be entries while the chosen component's executable
module remains in a lazy file. The instrument needs a precise measurement clarification, rather than a new exception
for any named component: structural first load means the registered module exporting the loader's selected name is
in an actual entry file. Every declared dependency must still exist and be readable.

`scripts/qa-first-load.mjs` now parses, without executing it, each client chunk's JavaScript using Next's bundled
Acorn. It recognizes direct Turbopack registrations, including the measured synchronous shell IIFE, grouped and scope-hoisted module ids, nested reused module
tables, and direct literal ESM export tables, including `.s(table, literalModuleId)` virtual-module ownership. For
each individual loadable row it searches that row's named files plus the route's explicit entry files, requires
exactly one definition of the selected export, and binds its identity through the actual client `.A(shimId)` loader,
the shim's literal `.v` namespace import, and any direct `.n(.i(targetId))` namespace reexports. The imported namespace
must match that individual LMF row's module ID; matching the export name alone is insufficient. All rows selecting
that name must agree on the primary definition. Route-specific preload variants of an async-shim ID are accepted
only when every measured variant imports the same literal namespace and every preload file exists. This does not
deduplicate or permit multiple primary component definitions. An unmeasured property-forwarding export facade is
refused rather than labeled as the underlying component's executable code.
An export name duplicated in distinct virtual modules is ambiguous, even when both inhabit one physical factory.
WinCelebration is a measured reason to include actual entries in this search: its loader lists only a dependency,
while its component module already belongs to an entry file.

Only the matching `/page` or `/route/page` namespace's explicit `entryJSFiles` establishes the route entry set.
Missing entries never fall back to a union of `clientModules`. There is no Webpack fallback. Runtime behavior or
unsupported async/conditional export registration is not guessed. Missing files, unknown loader exports, malformed
JavaScript, unsupported registrations, absent/renamed primary exports and multiple primary definitions refuse the
whole reading, including `--no-expect`. Other source and compiled-string marker verdicts, HomeLazy's existing
client-reference verdict, route parsing, deployment-query normalization and the HEAD tie remain in force. Declared
files are printed separately from the selected primary factory.

The instrument's 103 fixture controls pass; all previous 79 (including the original49) controls remain. Fifty-four additions use valid Turbopack
registration syntax and the same whole-build verdict. They include shared-dependency-only acceptance; moving the
actual primary into entries while leaving its marker lazy; missing nonprimary dependency; deleted, renamed,
ambiguous and unreadable primary definitions; distinct virtual-module ambiguity; unknown chosen export; per-loader
scope isolation; unreachable, callback, short-circuit and registry-string decoys; exact route-entry ownership; and
literal export-table and reused-module-table positives. Independent review added terminating returns (direct and
conditional), reassigned contexts and overwritten context methods, dynamic spread tuples, counterfeit same-export
module IDs, valid namespace chains, cyclic/missing/dynamic namespace paths, changed or conflicting async-shim
namespaces, missing shim preloads, and directly invoked versus unreachable shell wrappers. Unsupported control
flow or mutation prevents a claimed unconditional export mapping; ordinary block-local shadowing remains valid.
These fixtures do not require a server or execute client
code.

Measured artifact read, distinct from browser proof:

- Exact proof HEAD and `.next/kp-head`: `87c90055c30a5b552e60b1352e77d2dd6f061d94`.
- BUILD_ID: `build-TfctsWXpff2fKS`; HEAD and BUILD_ID stayed unchanged during the read.
- All ten default routes: controls pass, source marker table holds, all expected structural/module/marker verdicts
  pass. No entry/lazy files are missing, no referenced factory parse failures, no unresolved primary mappings.
- Evidence: `F:/50pick-work/generated/s8-turbo164-flush-entry-factory/factory-aware-reader.json`, recording reader
  source SHA256, explicit entry files, primary module ids, declared file lists, compiled file hashes and verdicts.
- The earlier overly narrow parser refusal is retained as `factory-reader-refused-v1.json` in that directory. It
  rejected valid scope-hoisted syntax; its failure is not rewritten as a product failure or a passing measurement.

The earlier twenty actual GET reads belong to predecessor app source
`7c95c0c6939c2b38840b46fc4d454b0a361f384f` and remain at
`F:/50pick-work/generated/s8-turbo164-min0-final-entry-read/evidence.json`. They are not relabeled as87: the later
native-capture flushSync application change required a real rebuild. A fresh twenty-cell browser read of the final
integrated source is still owed. Parent owns build integration, A21, final browser capture and release decisions.

The real Webpack HomeLazy leak remains a failure in the independently preserved
`F:/50pick-work/generated/s8-webpack-entry-read/evidence.json`: home factory66053 was in actual literal scripts on
seven off-home classic routes. This Turbopack-only measurement clarification neither accepts that artifact nor
replaces its observed scripts with a global manifest union.

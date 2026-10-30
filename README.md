# Academic Meta Tool Playground | LEIZA Edition

The original playground of the Academic Meta Tool (AMT), the tool behind the
article Unold, Thiery and Mees (2019), <https://doi.org/10.17175/sb004_004>.
It shows the *Personen-Interessen-Netzwerk* of mainzed: add persons and
interests, connect them with weights and watch the fuzzy-logic reasoning.

Live: <https://leiza-rse.github.io/amt-playground/>

## How it works

Everything runs in the browser, there is no server and no triplestore.

- `docs/ontology_mainzed.ttl` is the ontology with its axioms, read with
  [N3.js](https://github.com/rdfjs/N3.js).
- `docs/network_mainzed.ttl` is a small starting network (invented persons and interests, weighted statements). The file is optional; without it the playground starts empty, as the original did.
- `docs/amt-reasoner.js` is the reasoner. It is a copy of the one in
  [amt-engine](https://github.com/alpaca-fair-framework/amt-engine) (`docs/js/amt-reasoner.js`,
  release 0.6.0), which is the source: it is tested there against the Python engine. Update the
  copy from the engine, do not edit it here.
- `docs/amt.js` is the model of the playground, `docs/index.html` the page.

The graph you build is not stored. Use the export buttons to keep it.

## Type and method of a statement

A statement can say what kind of fuzziness its weight expresses (`fw:hasType`: `fw:Uncertainty`,
`fw:Vagueness`, `fw:FuzzinessWobbliness`) and how the weight was obtained (`fw:hasMethod`), with the
terms of the [FW ontology](https://github.com/caa-datadragons/FW_Ontology). The starting network can
use them, and so can a statement written with `fw:hasDegreeOfConnection` instead of `amt:weight`.
Without a type a statement counts as `fw:Vagueness`. The reasoner passes type and method on: a
derived statement takes the type of what it was derived from, or `fw:FuzzinessWobbliness` if these
differ, and a role chain adds its logic as the method. The tooltip of an edge shows both, and the
JSON and RDF exports contain them. The CSV and Cypher exports do not.

The maintained, general version with more examples and loading of your own
Turtle files is the Explorer of amt-engine:
<https://alpaca-fair-framework.github.io/amt-engine/explorer/>.

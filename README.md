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
- `docs/amt-reasoner.js` is the reasoner. It is a copy of the one in
  [amt-engine](https://github.com/n4o-rse/amt-engine) (`docs/js/amt-reasoner.js`),
  which is the source: it is tested there against the Python engine. Update the
  copy from the engine, do not edit it here.
- `docs/amt.js` is the model of the playground, `docs/index.html` the page.

The graph you build is not stored. Use the export buttons to keep it.

The maintained, general version with more examples and loading of your own
Turtle files is the Explorer of amt-engine:
<https://n4o-rse.github.io/amt-engine/explorer/>.

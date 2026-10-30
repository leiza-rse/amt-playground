# Changelog

All notable changes to the AMT Playground | LEIZA Edition are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The playground has no
version number of its own; `CITATION.cff` still describes the original viewer examples (2020).

## [Unreleased]

### Added
- Type and method of a statement (`fw:hasType`, `fw:hasMethod` of the FW ontology). The starting network can carry them, the reasoner passes them on, the tooltip of an edge shows them, and the JSON and RDF exports contain them. A statement written with `fw:hasDegreeOfConnection` instead of `amt:weight` is read as well. Two statements of `docs/network_mainzed.ttl` carry a type as an example; no weight changed.

### Changed
- `docs/amt-reasoner.js` is the reasoner of AMT.engine 0.6.0 (was 0.5.0). Weights stay the same; edges now also carry `type` and `method`.
- The starting network reads every statement that has `rdf:subject`, not only those typed `rdf:Statement`.
- The links in `README.md` and `docs/amt.js` point to `alpaca-fair-framework/amt-engine` (the repository moved from `n4o-rse`).

### Fixed
- The RDF export wrote the weight as `xsd:integer` (`"0.5"^^xsd:integer` is not a valid literal); it is `xsd:decimal` now, as `amt:WeightShape` of the engine requires.

// ============================================================
// AMT Playground | LEIZA Edition - amt.js
//
// The model behind the playground. It used to ask an RDF4J triplestore at
// java-dev.rgzm.de (SPARQL over JSONP); now the ontology is a Turtle file next
// to the page, read with N3.js, and everything happens in the browser. The
// graph the visitor builds lives in memory (export it with the buttons of the
// page); reasoning is done by amt-reasoner.js, the same code as the Explorer of
// amt-engine (https://n4o-rse.github.io/amt-engine/explorer/).
// ============================================================

function StrID() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (var i = 0; i < 12; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
}

function UUID() {
  var dt = new Date().getTime();
  var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
  return uuid;
}

function copyToClipboard(element) {
  var text = $(element).clone().find("br").prepend("\r\n").end().text();
  element = $("<textarea>").appendTo("body").val(text).select();
  document.execCommand("copy");
  element.remove();
}

var AMT = function () {
  var CONCEPTS = [];
  var ROLES = [];
  var GRAPH = { original: { nodes: [], edges: [] }, edited: { nodes: [], edges: [] } };
  var AXIOMS = [];

  var ONTOLOGY = "ontology_mainzed.ttl";
  var NETWORK = "network_mainzed.ttl"; // optional starting network
  var PREFIX = "http://academic-meta-tool.xyz/vocab#";
  var RDF = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
  var RDFS = "http://www.w3.org/2000/01/rdf-schema#";

  // ----------------------------------------------------------
  // The ontology: triples from the Turtle file, looked up by pattern
  // ----------------------------------------------------------
  var triples = [];
  var match = function (s, p, o) {
    return triples.filter(function (t) {
      return (s === null || t.s === s) && (p === null || t.p === p) && (o === null || t.o === o);
    });
  };
  var objectOf = function (s, p) {
    var r = match(s, p, null);
    return r.length ? r[0].o : null;
  };
  var subjectsOf = function (p, o) {
    return match(null, p, o).map(function (t) { return t.s; });
  };
  var readList = function (head) {
    var items = [], seen = {};
    while (head && head !== RDF + "nil" && !seen[head]) {
      seen[head] = true;
      var first = objectOf(head, RDF + "first");
      if (first !== null) items.push(first);
      head = objectOf(head, RDF + "rest");
    }
    return items;
  };

  var parse = function (text, callback) {
    var parser = new N3.Parser();
    var out = [], done = false;
    parser.parse(text, function (error, quad) {
      if (done) return;
      if (error) { done = true; callback(error); return; }
      if (quad) { out.push({ s: quad.subject.value, p: quad.predicate.value, o: quad.object.value }); return; }
      done = true;
      triples = out;
      callback(null);
    });
  };

  var loadOntology = function (callback) {
    fetch(ONTOLOGY)
      .then(function (r) {
        if (!r.ok) throw new Error("Could not load " + ONTOLOGY + " (HTTP " + r.status + ")");
        return r.text();
      })
      .then(function (text) { parse(text, callback); })
      .catch(function (err) { callback(err); });
  };

  var readOntology = function () {
    // concepts
    CONCEPTS = [];
    subjectsOf(RDF + "type", PREFIX + "Concept").forEach(function (c) {
      var label = objectOf(c, RDFS + "label");
      if (label !== null) CONCEPTS.push({ concept: c, label: label, placeholder: objectOf(c, PREFIX + "placeholder") });
    });
    // roles, ordered by label
    ROLES = [];
    subjectsOf(RDF + "type", PREFIX + "Role").forEach(function (r) {
      var label = objectOf(r, RDFS + "label");
      if (label !== null) ROLES.push({ role: r, label: label, domain: objectOf(r, RDFS + "domain"), range: objectOf(r, RDFS + "range") });
    });
    ROLES.sort(function (a, b) { return a.label.localeCompare(b.label); });
    // axioms: the five kinds of the engine
    var types = ["RoleChainAxiom", "InverseAxiom", "SubsumptionAxiom", "DisjointAxiom", "SelfDisjointAxiom"];
    var raw = [];
    types.forEach(function (name) {
      subjectsOf(RDF + "type", PREFIX + name).forEach(function (axiom) {
        var entry = { iri: axiom, type: name };
        match(axiom, null, null).forEach(function (t) {
          if (t.p === RDF + "type") return;
          if (t.p === PREFIX + "antecedents") { entry.antecedents = readList(t.o); return; }
          entry[t.p.indexOf(PREFIX) === 0 ? t.p.substr(PREFIX.length) : t.p] = t.o;
        });
        raw.push(entry);
      });
    });
    AXIOMS = AMTReasoner.normaliseAxioms(raw);
  };

  // The starting network: individuals and reified, weighted statements.
  // The file is optional; without it the playground starts empty.
  var loadNetwork = function (callback) {
    fetch(NETWORK)
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (text) {
        if (!text) return callback({ nodes: [], edges: [] });
        var parser = new N3.Parser();
        var out = [], done = false;
        parser.parse(text, function (error, quad) {
          if (done) return;
          if (error) { done = true; console.error(error); callback({ nodes: [], edges: [] }); return; }
          if (quad) { out.push({ s: quad.subject.value, p: quad.predicate.value, o: quad.object.value }); return; }
          done = true;
          var at = function (s, p) { var r = out.filter(function (t) { return t.s === s && t.p === p; }); return r.length ? r[0].o : null; };
          var graph = { nodes: [], edges: [] };
          CONCEPTS.forEach(function (c) {
            out.filter(function (t) { return t.p === RDF + "type" && t.o === c.concept; }).forEach(function (t) {
              graph.nodes.push({ id: t.s, label: at(t.s, RDFS + "label"), concept: c.concept });
            });
          });
          out.filter(function (t) { return t.p === RDF + "type" && t.o === RDF + "Statement"; }).forEach(function (t) {
            var w = parseFloat(at(t.s, PREFIX + "weight"));
            graph.edges.push({ role: at(t.s, RDF + "predicate"), from: at(t.s, RDF + "subject"), to: at(t.s, RDF + "object"), width: isNaN(w) ? 1 : w });
          });
          callback(graph);
        });
      })
      .catch(function () { callback({ nodes: [], edges: [] }); });
  };

  this.load = function (callback) {
    loadOntology(function (err) {
      if (err) {
        console.error(err);
        alert("Die Ontologie konnte nicht geladen werden: " + err.message);
        return;
      }
      readOntology();
      loadNetwork(function (graph) {
        GRAPH.original = graph;
        GRAPH.edited = copy(graph);
        callback();
      });
    });
  };

  // ----------------------------------------------------------
  // Graph helpers
  // ----------------------------------------------------------
  var copy = function (graph) {
    var cpy = { nodes: [], edges: [] };
    for (var i in graph.nodes) {
      cpy.nodes.push({ id: graph.nodes[i].id, label: graph.nodes[i].label, concept: graph.nodes[i].concept });
    }
    for (var j in graph.edges) {
      cpy.edges.push({ role: graph.edges[j].role, from: graph.edges[j].from, to: graph.edges[j].to, width: graph.edges[j].width });
    }
    return cpy;
  };
  var search = function (edges, role, from, to) {
    for (var i in edges) {
      if (edges[i].role == role && edges[i].from == from && edges[i].to == to) return i;
    }
    return -1;
  };

  // ----------------------------------------------------------
  // Reasoning: amt-reasoner.js, the port of the Python engine
  // ----------------------------------------------------------
  var toEngineEdges = function (edges) {
    return edges.map(function (e) {
      var w = parseFloat(e.width);
      return { role: e.role, from: e.from, to: e.to, weight: isNaN(w) ? 0 : Math.min(w, 1.0), inferred: false, provenance: [] };
    });
  };
  var doReasoning = function (graph) {
    var n = graph.edges.length;
    var reasoned = AMTReasoner.reason(toEngineEdges(graph.edges), AXIOMS).edges;
    for (var j = n; j < reasoned.length; j++) {
      var e = reasoned[j];
      graph.edges.push({
        role: e.role, from: e.from, to: e.to, width: e.weight, inferred: true, provenance: e.provenance,
        font: { align: "middle", size: 16, color: "red", face: "monospace" },
      });
    }
    return graph;
  };
  var consistent = function () {
    var asserted = toEngineEdges(GRAPH.edited.edges);
    var reasoned = AMTReasoner.reason(asserted, AXIOMS).edges;
    return AMTReasoner.checkConsistency(asserted, AXIOMS, reasoned).consistent;
  };

  // ----------------------------------------------------------
  // Editing (unchanged API)
  // ----------------------------------------------------------
  this.addIndividual = function (label, concept) {
    var id = PREFIX + StrID();
    GRAPH.edited.nodes.push({ id: id, label: label, concept: concept });
    return id;
  };
  this.addExistingIndividual = function (id, label, concept) {
    GRAPH.edited.nodes.push({ id: id, label: label, concept: concept });
    return id;
  };
  this.removeIndividual = function (id) {
    var change = true;
    while (change) {
      change = false;
      for (var i in GRAPH.edited.edges) {
        if (GRAPH.edited.edges[i].from == id || GRAPH.edited.edges[i].to == id) {
          GRAPH.edited.edges.splice(i, 1);
          change = true;
          break;
        }
      }
    }
    for (var j in GRAPH.edited.nodes) {
      if (GRAPH.edited.nodes[j].id == id) {
        GRAPH.edited.nodes.splice(j, 1);
        break;
      }
    }
    return consistent();
  };
  this.editAssertion = function (role, from, to, width) {
    var index = search(GRAPH.edited.edges, role, from, to);
    if (index >= 0) {
      if (width > 0) GRAPH.edited.edges[index].width = width;
      else GRAPH.edited.edges.splice(index, 1);
    } else if (width > 0) {
      GRAPH.edited.edges.push({ role: role, from: from, to: to, width: width });
    }
    return consistent();
  };
  this.addExistingAssertion = function (id, role, from, to, width) {
    GRAPH.edited.edges.push({ role: role, from: from, to: to, width: width });
    return consistent();
  };
  this.cancel = function () {
    GRAPH.edited = copy(GRAPH.original);
  };
  this.getConcepts = function () {
    return CONCEPTS;
  };
  this.getRoles = function () {
    return ROLES;
  };
  this.getGraph = function (reasoning, edited) {
    var g = copy(edited ? GRAPH.edited : GRAPH.original);
    return reasoning ? doReasoning(g) : g;
  };
};

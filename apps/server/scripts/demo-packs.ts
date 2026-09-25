import type { Difficulty, MemeTemplate } from "@zpl/shared-types";

/**
 * Hand-written study packs used to seed a demo environment.
 *
 * These exist so the app can be shown end to end without spending a single
 * Claude call, and so a live demo never depends on generation latency. The
 * shape mirrors exactly what the pipeline produces.
 */
export interface DemoPack {
  slug: string;
  title: string;
  subject: string;
  sourceText: string;
  summary: { executive_overview: string; bullet_breakdown: { point: string; detail: string }[] };
  definitions: { term: string; definition: string }[];
  formulas: { name: string; expression: string; explanation: string }[];
  topics: { topic: string; subtopics: string[]; importance: "high" | "medium" | "low"; explanation: string }[];
  mindmap: {
    nodes: { id: string; label: string; parent_id: string | null; explanation: string }[];
    edges: { from: string; to: string; label: string }[];
  };
  flashcards: { front: string; back: string; difficulty: Difficulty; topic: string }[];
  mcqs: {
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
    topic: string;
    difficulty: Difficulty;
  }[];
  memes: { template: MemeTemplate; captions: string[]; topic: string }[];
  resources: {
    topic: string;
    title: string;
    url: string;
    source: string;
    kind: "video" | "course" | "paper" | "article";
    relevance: number;
  }[];
  community: { author: string; description: string; tags: string[] };
}

export const DEMO_PACKS: DemoPack[] = [
  {
    slug: "electromagnetic-induction",
    title: "Electromagnetic Induction",
    subject: "Physics",
    sourceText: `Electromagnetic induction is the production of an electromotive force across a conductor exposed to a changing magnetic field. Michael Faraday discovered it in 1831, and it underpins generators, transformers and induction motors.

Magnetic flux through a surface is the product of the magnetic field, the area, and the cosine of the angle between the field and the surface normal. Faraday's law states that the induced EMF equals the negative rate of change of magnetic flux. The minus sign is Lenz's law: the induced current opposes the change that produced it, which is a direct consequence of energy conservation.

Self-inductance describes a coil opposing changes in its own current; mutual inductance describes one coil inducing an EMF in another. Eddy currents are loops of induced current inside bulk conductors, useful in induction heating and magnetic braking but wasteful in transformer cores, where lamination reduces them.`,
    summary: {
      executive_overview:
        "Electromagnetic induction is the generation of an electromotive force by a changing magnetic flux. Faraday's law fixes its magnitude and Lenz's law fixes its direction, and together they explain how generators, transformers, and induction motors convert between mechanical and electrical energy.",
      bullet_breakdown: [
        {
          point: "Magnetic flux measures how much field passes through a surface",
          detail:
            "Flux Φ = B·A·cos θ, where θ is the angle between the field and the surface normal. Flux is maximum when the field is perpendicular to the surface (θ = 0) and zero when it lies in the plane of the surface (θ = 90°). Flux, not field strength, is what induction responds to.",
        },
        {
          point: "Faraday's law: induced EMF is the rate of change of flux",
          detail:
            "EMF = −N·dΦ/dt for a coil of N turns. Three things can change the flux: the field strength, the area, or the orientation. A generator works by rotating a coil so that θ changes continuously, producing a sinusoidal EMF.",
        },
        {
          point: "Lenz's law supplies the minus sign, and it is energy conservation",
          detail:
            "The induced current always flows in the direction that opposes the change creating it. Push a magnet toward a coil and the coil repels it; you must do work against that repulsion, and that work is exactly the electrical energy produced. Without the minus sign you would have free energy.",
        },
        {
          point: "A static field induces nothing",
          detail:
            "This is the most common misconception. A coil sitting motionless in the strongest possible constant magnetic field has a large flux but zero EMF, because dΦ/dt is zero. Only change induces.",
        },
        {
          point: "Self-inductance opposes changes in a coil's own current",
          detail:
            "A changing current creates a changing flux, which induces a back-EMF in the same coil: EMF = −L·dI/dt. This is why current in an inductor cannot change instantaneously and why breaking an inductive circuit produces a spark.",
        },
        {
          point: "Mutual inductance is how transformers work",
          detail:
            "A changing current in a primary coil induces an EMF in a nearby secondary coil. The voltage ratio follows the turns ratio, Vs/Vp = Ns/Np. Because it depends on dΦ/dt, a transformer works only with alternating current — it does nothing with DC.",
        },
        {
          point: "Eddy currents are induction inside a solid conductor",
          detail:
            "Loops of current induced in bulk metal. They are exploited for induction cooktops and magnetic braking, but in a transformer core they waste energy as heat, which is why cores are built from thin laminations separated by insulation.",
        },
      ],
    },
    definitions: [
      {
        term: "Electromagnetic induction",
        definition:
          "The production of an electromotive force across a conductor exposed to a changing magnetic field, discovered by Michael Faraday in 1831.",
      },
      {
        term: "Magnetic flux",
        definition:
          "A measure of the magnetic field passing through a given surface, equal to the field strength times the projected area, measured in webers.",
      },
      {
        term: "Lenz's law",
        definition:
          "The induced current flows in whichever direction opposes the change in flux that produced it — the physical statement of energy conservation in induction.",
      },
      {
        term: "Self-inductance",
        definition:
          "The property by which a coil opposes changes in its own current, generating a back-EMF proportional to the rate of current change.",
      },
      {
        term: "Eddy current",
        definition:
          "A loop of electric current induced within the body of a bulk conductor by a changing magnetic field.",
      },
    ],
    formulas: [
      {
        name: "Magnetic flux",
        expression: "Φ = B · A · cos θ",
        explanation:
          "Φ is flux in webers, B the field in teslas, A the area in square metres, and θ the angle between the field and the surface normal.",
      },
      {
        name: "Faraday's law of induction",
        expression: "EMF = −N · (dΦ/dt)",
        explanation:
          "N is the number of turns. The minus sign is Lenz's law; the magnitude is set by how fast the flux changes, not by how large it is.",
      },
      {
        name: "Self-induced EMF",
        expression: "EMF = −L · (dI/dt)",
        explanation:
          "L is the self-inductance in henries. This is why current through an inductor cannot change instantaneously.",
      },
      {
        name: "Transformer turns ratio",
        expression: "Vs / Vp = Ns / Np",
        explanation:
          "Secondary voltage relates to primary voltage as the turns do. Power is conserved, so stepping voltage up steps current down.",
      },
    ],
    topics: [
      {
        topic: "Magnetic Flux",
        subtopics: ["Field strength", "Area", "Orientation", "Weber"],
        importance: "high",
        explanation:
          "Flux is the quantity induction actually responds to. It combines field strength, the area it passes through, and the angle between them. Understanding that flux can change three different ways explains every induction device.",
      },
      {
        topic: "Faraday's Law",
        subtopics: ["Rate of change", "Number of turns", "Generators"],
        importance: "high",
        explanation:
          "Faraday's law says the induced EMF equals the rate of change of flux, multiplied by the number of turns. It is the quantitative core of the topic and the basis of every generator.",
      },
      {
        topic: "Lenz's Law",
        subtopics: ["Direction of induced current", "Energy conservation", "Magnetic braking"],
        importance: "high",
        explanation:
          "Lenz's law determines the direction of the induced current: always opposing the change that caused it. It is not an extra rule but a restatement of energy conservation, and it explains magnetic braking.",
      },
      {
        topic: "Inductance",
        subtopics: ["Self-inductance", "Mutual inductance", "Transformers", "Back-EMF"],
        importance: "medium",
        explanation:
          "Inductance quantifies how strongly a circuit opposes current change. Self-inductance acts within one coil; mutual inductance couples two, which is how transformers move energy between circuits without a conductive path.",
      },
      {
        topic: "Eddy Currents",
        subtopics: ["Induction heating", "Magnetic braking", "Core lamination"],
        importance: "medium",
        explanation:
          "Eddy currents are induced loops inside solid conductors. They are the operating principle of induction cooktops and the loss mechanism that transformer laminations are designed to suppress.",
      },
    ],
    mindmap: {
      nodes: [
        {
          id: "1",
          label: "Electromagnetic Induction",
          parent_id: null,
          explanation:
            "Producing an EMF with a changing magnetic field. Faraday, 1831. The basis of generators, transformers, and induction motors.",
        },
        {
          id: "1.1",
          label: "Magnetic Flux",
          parent_id: "1",
          explanation: "Φ = B·A·cos θ. The quantity that must change for induction to occur.",
        },
        { id: "1.1.1", label: "Field strength B", parent_id: "1.1", explanation: "Stronger field means more flux through the same area." },
        { id: "1.1.2", label: "Area A", parent_id: "1.1", explanation: "A larger loop intercepts more of the field." },
        { id: "1.1.3", label: "Orientation θ", parent_id: "1.1", explanation: "Maximum flux when the field is perpendicular to the surface; zero when parallel to it." },
        {
          id: "1.2",
          label: "Faraday's Law",
          parent_id: "1",
          explanation: "EMF = −N·dΦ/dt. The induced EMF depends on the rate of flux change, not the flux itself.",
        },
        { id: "1.2.1", label: "Generators", parent_id: "1.2", explanation: "Rotate a coil in a field so θ changes continuously, producing sinusoidal AC." },
        {
          id: "1.3",
          label: "Lenz's Law",
          parent_id: "1",
          explanation: "The induced current opposes the change that created it. Supplies the minus sign, and is energy conservation in disguise.",
        },
        { id: "1.3.1", label: "Magnetic braking", parent_id: "1.3", explanation: "Opposition to motion converts kinetic energy into heat without physical contact." },
        {
          id: "1.4",
          label: "Inductance",
          parent_id: "1",
          explanation: "How strongly a circuit opposes changes in current.",
        },
        { id: "1.4.1", label: "Self-inductance", parent_id: "1.4", explanation: "EMF = −L·dI/dt. A coil opposing changes in its own current." },
        { id: "1.4.2", label: "Mutual inductance", parent_id: "1.4", explanation: "One coil inducing an EMF in another. The mechanism of a transformer." },
        { id: "1.4.3", label: "Transformers", parent_id: "1.4.2", explanation: "Vs/Vp = Ns/Np. Works with AC only, because it needs a changing flux." },
        {
          id: "1.5",
          label: "Eddy Currents",
          parent_id: "1",
          explanation: "Induced current loops inside bulk conductors. Useful for heating and braking, wasteful in transformer cores.",
        },
        { id: "1.5.1", label: "Core lamination", parent_id: "1.5", explanation: "Thin insulated sheets break up the current loops and cut losses." },
      ],
      edges: [
        { from: "1", to: "1.1", label: "depends on" },
        { from: "1.1", to: "1.1.1", label: "component" },
        { from: "1.1", to: "1.1.2", label: "component" },
        { from: "1.1", to: "1.1.3", label: "component" },
        { from: "1", to: "1.2", label: "magnitude from" },
        { from: "1.2", to: "1.2.1", label: "applied in" },
        { from: "1", to: "1.3", label: "direction from" },
        { from: "1.3", to: "1.3.1", label: "applied in" },
        { from: "1", to: "1.4", label: "quantified by" },
        { from: "1.4", to: "1.4.1", label: "type" },
        { from: "1.4", to: "1.4.2", label: "type" },
        { from: "1.4.2", to: "1.4.3", label: "used by" },
        { from: "1", to: "1.5", label: "produces" },
        { from: "1.5", to: "1.5.1", label: "mitigated by" },
        { from: "1.1", to: "1.2", label: "rate of change gives" },
        { from: "1.3", to: "1.5", label: "explains opposition in" },
      ],
    },
    flashcards: [
      { front: "What three quantities determine magnetic flux?", back: "Field strength B, area A, and the angle θ between the field and the surface normal: Φ = B·A·cos θ.", difficulty: "easy", topic: "Magnetic Flux" },
      { front: "A coil sits motionless in a very strong constant magnetic field. What EMF is induced?", back: "Zero. Induction responds to the rate of change of flux, not its magnitude — dΦ/dt = 0, so EMF = 0.", difficulty: "medium", topic: "Faraday's Law" },
      { front: "Why does Faraday's law carry a minus sign?", back: "It encodes Lenz's law: the induced current opposes the change producing it. Without it, induction would create energy from nothing.", difficulty: "medium", topic: "Lenz's Law" },
      { front: "Why does a transformer do nothing with DC?", back: "Transformers rely on mutual inductance, which needs a changing flux. Steady DC produces constant flux, so no EMF is induced in the secondary.", difficulty: "medium", topic: "Inductance" },
      { front: "You drop a magnet down a copper pipe and it falls slowly. Why?", back: "The moving magnet induces eddy currents in the pipe. By Lenz's law those currents oppose its motion, producing magnetic braking — even though copper is not ferromagnetic.", difficulty: "hard", topic: "Eddy Currents" },
      { front: "Why are transformer cores built from thin laminations?", back: "To interrupt eddy current loops. Solid cores would carry large induced currents that waste energy as heat; insulated laminations sharply reduce that loss.", difficulty: "hard", topic: "Eddy Currents" },
      { front: "State the relationship between a transformer's turns and its voltages.", back: "Vs/Vp = Ns/Np. Power is conserved, so stepping voltage up steps current down proportionally.", difficulty: "easy", topic: "Inductance" },
      { front: "Name the three ways flux through a fixed coil can change.", back: "The field strength can change, the coil's area can change, or the coil's orientation relative to the field can change. A generator uses the third.", difficulty: "medium", topic: "Magnetic Flux" },
    ],
    mcqs: [
      {
        question: "A conducting loop is held stationary in a uniform, constant magnetic field. What is the induced EMF?",
        options: ["Proportional to the field strength", "Zero", "Proportional to the loop's area", "Maximum, since flux is maximum"],
        correct_index: 1,
        explanation:
          "EMF depends on dΦ/dt, not Φ. The flux here is large but unchanging, so the EMF is zero. The tempting wrong answer is 'proportional to the field strength' — it confuses flux with its rate of change, which is the single most common error in this topic.",
        topic: "Faraday's Law",
        difficulty: "easy",
      },
      {
        question: "A bar magnet is pushed north-pole-first toward a coil. What does the induced current do?",
        options: [
          "Creates a south pole facing the magnet, attracting it",
          "Creates a north pole facing the magnet, repelling it",
          "Flows only after the magnet stops moving",
          "Flows in a direction depending on the coil's resistance",
        ],
        correct_index: 1,
        explanation:
          "Lenz's law: the induced current opposes the approach, so the coil presents a north pole and repels the magnet. Option A inverts this and would mean the magnet accelerates itself — free energy. Resistance sets the current's size, never its direction.",
        topic: "Lenz's Law",
        difficulty: "medium",
      },
      {
        question: "A coil of 200 turns has its flux change from 0.010 Wb to 0.030 Wb in 0.40 s. What is the magnitude of the average induced EMF?",
        options: ["1.0 V", "5.0 V", "10 V", "0.10 V"],
        correct_index: 2,
        explanation:
          "EMF = N·ΔΦ/Δt = 200 × (0.020 Wb / 0.40 s) = 10 V. The common slip is forgetting to multiply by the 200 turns, which gives 0.05 V, or dividing by turns instead, which gives the distractor values.",
        topic: "Faraday's Law",
        difficulty: "medium",
      },
      {
        question: "A transformer's secondary has one quarter the turns of its primary. Ignoring losses, what happens?",
        options: [
          "Voltage is quartered and current is quadrupled",
          "Both voltage and current are quartered",
          "Voltage is quadrupled and current is quartered",
          "Voltage is quartered and current is unchanged",
        ],
        correct_index: 0,
        explanation:
          "Vs/Vp = Ns/Np, so voltage drops to a quarter. Power is conserved, so current rises by four to compensate. Option B would mean output power is one sixteenth of input, violating energy conservation.",
        topic: "Inductance",
        difficulty: "medium",
      },
      {
        question: "Why is a transformer core made of thin insulated laminations rather than solid iron?",
        options: [
          "To increase the magnetic flux through the core",
          "To reduce energy lost to eddy currents",
          "To make the core lighter and cheaper",
          "To increase the mutual inductance between coils",
        ],
        correct_index: 1,
        explanation:
          "Laminations break up the paths available to eddy currents, cutting resistive heating losses. Flux and mutual inductance are governed by the core's permeability and the coil geometry, not by lamination — laminating actually reduces the usable cross-section slightly.",
        topic: "Eddy Currents",
        difficulty: "hard",
      },
      {
        question: "A magnet dropped through a vertical copper pipe falls far slower than in free air. What explains this?",
        options: [
          "Copper is weakly ferromagnetic and attracts the magnet",
          "Air resistance inside the narrow pipe dominates",
          "Induced eddy currents in the pipe oppose the magnet's motion",
          "The pipe shields the magnet from Earth's magnetic field",
        ],
        correct_index: 2,
        explanation:
          "The moving magnet changes the flux through each ring of pipe, inducing eddy currents whose fields oppose the motion by Lenz's law. Copper is not ferromagnetic, which rules out option A — and this is exactly why the demonstration is striking.",
        topic: "Eddy Currents",
        difficulty: "hard",
      },
    ],
    memes: [
      { template: "drake", captions: ["Memorising that EMF = −N dΦ/dt", "Understanding that only CHANGE induces anything"], topic: "Faraday's Law" },
      {
        template: "expanding-brain",
        captions: [
          "Magnet near coil makes current",
          "Moving magnet makes current",
          "Changing flux makes current",
          "Nature refuses to let flux change quietly",
        ],
        topic: "Lenz's Law",
      },
      { template: "two-buttons", captions: ["Blame the minus sign on convention", "Admit it is energy conservation"], topic: "Lenz's Law" },
      { template: "change-my-mind", captions: ["A transformer plugged into DC is just an expensive heater"], topic: "Inductance" },
    ],
    resources: [
      { topic: "Faraday's Law", title: "Faraday's Law of Induction", url: "https://www.khanacademy.org/science/physics/magnetic-forces-and-magnetic-fields", source: "khanacademy.org", kind: "course", relevance: 0.92 },
      { topic: "Faraday's Law", title: "MIT 8.02 Physics II: Electricity and Magnetism", url: "https://ocw.mit.edu/courses/8-02-physics-ii-electricity-and-magnetism-spring-2007/", source: "ocw.mit.edu", kind: "course", relevance: 0.95 },
      { topic: "Lenz's Law", title: "Lenz's Law", url: "https://en.wikipedia.org/wiki/Lenz%27s_law", source: "en.wikipedia.org", kind: "article", relevance: 0.74 },
      { topic: "Eddy Currents", title: "Eddy Current Braking: A Review", url: "https://arxiv.org/abs/1902.03871", source: "arxiv.org", kind: "paper", relevance: 0.81 },
      { topic: "Magnetic Flux", title: "Magnetic Flux and Faraday's Law", url: "https://www.feynmanlectures.caltech.edu/II_17.html", source: "feynmanlectures.caltech.edu", kind: "article", relevance: 0.88 },
    ],
    community: {
      author: "Demo",
      description:
        "Full Class 12 / first-year physics treatment of induction: flux, Faraday, Lenz, inductance and eddy currents, with the misconceptions that cost marks.",
      tags: ["physics", "electromagnetism", "class-12", "jee"],
    },
  },
  {
    slug: "trees-and-graphs",
    title: "Data Structures: Trees and Graphs",
    subject: "Computer Science",
    sourceText: `A tree is a connected acyclic graph. A binary tree gives each node at most two children; a binary search tree additionally keeps every key in the left subtree below the node and every key in the right subtree above it, which makes lookup O(h) where h is the height.

An unbalanced BST degenerates to a linked list, making operations O(n). Self-balancing trees such as AVL and red-black trees bound the height at O(log n) by rotating on insert and delete.

A graph generalises a tree: vertices joined by edges, possibly with cycles, possibly directed, possibly weighted. Adjacency lists cost O(V + E) space and suit sparse graphs; adjacency matrices cost O(V^2) and answer edge queries in O(1).

Breadth-first search explores level by level using a queue and finds shortest paths in unweighted graphs. Depth-first search follows one branch as far as possible using a stack or recursion, and underpins cycle detection and topological sorting. Dijkstra's algorithm finds shortest paths with non-negative weights; Bellman-Ford tolerates negative edges and detects negative cycles.`,
    summary: {
      executive_overview:
        "Trees are connected acyclic graphs, and graphs generalise them to allow cycles, direction and weights. The practical questions are how you store them, how you traverse them, and what the shape of the data does to your complexity guarantees.",
      bullet_breakdown: [
        {
          point: "A tree is a connected acyclic graph",
          detail:
            "N nodes joined by exactly N−1 edges with no cycles. Every tree is a graph; most graphs are not trees. This single definition is what makes recursion natural on trees — there is exactly one path between any two nodes.",
        },
        {
          point: "A BST's guarantees depend entirely on its shape",
          detail:
            "Search, insert and delete are O(h) where h is the height. On a balanced tree h = log n. Insert already-sorted data into a naive BST and it degenerates to a linked list: h = n, and every operation becomes O(n). The average case is not the guarantee.",
        },
        {
          point: "Self-balancing trees buy worst-case guarantees with rotations",
          detail:
            "AVL trees keep left and right subtree heights within one, giving faster lookups. Red-black trees allow looser balance, giving cheaper insertion and deletion. Both bound height at O(log n); the choice is a read-heavy versus write-heavy tradeoff.",
        },
        {
          point: "Adjacency list versus matrix is a space-time tradeoff",
          detail:
            "Lists use O(V + E) space and iterate a vertex's neighbours efficiently — right for sparse graphs. Matrices use O(V²) but answer 'is there an edge u→v?' in O(1) — right for dense graphs or heavy edge queries.",
        },
        {
          point: "BFS finds shortest paths only when edges are unweighted",
          detail:
            "BFS uses a queue and visits vertices in order of edge count from the source, so the first time it reaches a vertex is via a minimum-edge path. Add weights and that guarantee vanishes — you need Dijkstra.",
        },
        {
          point: "DFS is the backbone of structural algorithms",
          detail:
            "Using a stack or recursion, DFS commits to one branch before backtracking. Cycle detection, topological sorting, and strongly-connected-component algorithms are all built on its traversal order.",
        },
        {
          point: "Dijkstra fails on negative edges; Bellman-Ford does not",
          detail:
            "Dijkstra finalises a vertex's distance once it is dequeued, which a later negative edge could invalidate. Bellman-Ford relaxes every edge V−1 times at O(V·E) and can detect negative cycles, which have no well-defined shortest path at all.",
        },
      ],
    },
    definitions: [
      { term: "Tree", definition: "A connected acyclic graph; N nodes joined by exactly N−1 edges, with exactly one path between any two nodes." },
      { term: "Binary search tree", definition: "A binary tree where every key in a node's left subtree is smaller than the node's key and every key in its right subtree is larger." },
      { term: "Balanced tree", definition: "A tree whose height is bounded by O(log n), keeping search, insert and delete logarithmic in the worst case." },
      { term: "Topological sort", definition: "A linear ordering of a directed acyclic graph's vertices such that every edge points forward in the ordering." },
      { term: "Negative cycle", definition: "A cycle in a weighted graph whose edge weights sum to a negative value, making shortest paths undefined because the cycle can be traversed indefinitely." },
    ],
    formulas: [
      { name: "Tree edge count", expression: "E = V − 1", explanation: "Any tree with V vertices has exactly V−1 edges. Adding one more edge necessarily creates a cycle." },
      { name: "BST operation cost", expression: "O(h), h = height", explanation: "Balanced gives h = log n; fully degenerate gives h = n. The shape of the data, not the algorithm, decides which you get." },
      { name: "Adjacency list space", expression: "O(V + E)", explanation: "Preferred for sparse graphs where E is much smaller than V²." },
      { name: "Dijkstra with a binary heap", expression: "O((V + E) log V)", explanation: "Each vertex is extracted once and each edge can trigger one decrease-key, both costing log V." },
      { name: "Bellman-Ford", expression: "O(V · E)", explanation: "Relax all E edges V−1 times. Slower than Dijkstra, but tolerates negative weights and detects negative cycles." },
    ],
    topics: [
      { topic: "Tree Fundamentals", subtopics: ["Nodes and edges", "Height and depth", "Binary trees", "Traversals"], importance: "high", explanation: "Trees are connected acyclic graphs with exactly one path between any two nodes. Height drives the cost of every operation, and in-order, pre-order and post-order traversals give the three standard ways to visit every node." },
      { topic: "Binary Search Trees", subtopics: ["Ordering invariant", "Search and insert", "Degeneration"], importance: "high", explanation: "A BST maintains a strict ordering invariant that turns search into a sequence of comparisons costing O(h). Inserting sorted data without balancing degenerates it into a linked list, destroying the guarantee." },
      { topic: "Balanced Trees", subtopics: ["AVL", "Red-black", "Rotations"], importance: "medium", explanation: "Self-balancing trees restore an O(log n) height bound by rotating on modification. AVL is more rigidly balanced and favours reads; red-black is looser and favours writes." },
      { topic: "Graph Representation", subtopics: ["Adjacency list", "Adjacency matrix", "Sparse vs dense"], importance: "high", explanation: "Adjacency lists cost O(V + E) and iterate neighbours cheaply; matrices cost O(V²) but test edges in O(1). The density of the graph decides which is right." },
      { topic: "Graph Traversal", subtopics: ["BFS", "DFS", "Cycle detection", "Topological sort"], importance: "high", explanation: "BFS explores by levels using a queue and gives shortest paths in unweighted graphs. DFS drives one branch to exhaustion using a stack, and underpins cycle detection and topological sorting." },
      { topic: "Shortest Paths", subtopics: ["Dijkstra", "Bellman-Ford", "Negative weights"], importance: "medium", explanation: "Dijkstra is the fast choice for non-negative weights. Bellman-Ford is slower but correct with negative edges and able to report negative cycles." },
    ],
    mindmap: {
      nodes: [
        { id: "1", label: "Trees and Graphs", parent_id: null, explanation: "Trees are a special case of graphs: connected and acyclic. Everything else follows from that relationship." },
        { id: "1.1", label: "Trees", parent_id: "1", explanation: "Connected acyclic graphs with V−1 edges and exactly one path between any two nodes." },
        { id: "1.1.1", label: "Binary Search Trees", parent_id: "1.1", explanation: "Ordering invariant makes search O(h). Height, not node count, sets the cost." },
        { id: "1.1.2", label: "Degeneration", parent_id: "1.1.1", explanation: "Sorted input into a naive BST produces a linked list, turning every operation into O(n)." },
        { id: "1.1.3", label: "Balanced Trees", parent_id: "1.1", explanation: "AVL and red-black trees rotate on modification to bound height at O(log n)." },
        { id: "1.1.4", label: "Traversals", parent_id: "1.1", explanation: "In-order yields sorted keys for a BST; pre-order and post-order suit copying and deletion." },
        { id: "1.2", label: "Graphs", parent_id: "1", explanation: "Vertices and edges, possibly cyclic, directed or weighted." },
        { id: "1.2.1", label: "Adjacency List", parent_id: "1.2", explanation: "O(V + E) space. The right default for sparse graphs." },
        { id: "1.2.2", label: "Adjacency Matrix", parent_id: "1.2", explanation: "O(V²) space, O(1) edge lookup. Suits dense graphs." },
        { id: "1.3", label: "Traversal", parent_id: "1", explanation: "The two ways to visit every vertex, and the basis of most graph algorithms." },
        { id: "1.3.1", label: "BFS", parent_id: "1.3", explanation: "Queue-based, level by level. Shortest paths in unweighted graphs." },
        { id: "1.3.2", label: "DFS", parent_id: "1.3", explanation: "Stack or recursion, one branch at a time. Cycle detection and topological sort." },
        { id: "1.4", label: "Shortest Paths", parent_id: "1", explanation: "Finding minimum-cost routes in weighted graphs." },
        { id: "1.4.1", label: "Dijkstra", parent_id: "1.4", explanation: "O((V+E) log V) with a heap. Requires non-negative weights." },
        { id: "1.4.2", label: "Bellman-Ford", parent_id: "1.4", explanation: "O(V·E). Handles negative edges and detects negative cycles." },
      ],
      edges: [
        { from: "1", to: "1.1", label: "special case" },
        { from: "1.1", to: "1.1.1", label: "type" },
        { from: "1.1.1", to: "1.1.2", label: "risk" },
        { from: "1.1", to: "1.1.3", label: "fixes with" },
        { from: "1.1.3", to: "1.1.2", label: "prevents" },
        { from: "1.1", to: "1.1.4", label: "visited by" },
        { from: "1", to: "1.2", label: "general case" },
        { from: "1.2", to: "1.2.1", label: "stored as" },
        { from: "1.2", to: "1.2.2", label: "stored as" },
        { from: "1", to: "1.3", label: "explored by" },
        { from: "1.3", to: "1.3.1", label: "method" },
        { from: "1.3", to: "1.3.2", label: "method" },
        { from: "1", to: "1.4", label: "optimised by" },
        { from: "1.4", to: "1.4.1", label: "algorithm" },
        { from: "1.4", to: "1.4.2", label: "algorithm" },
        { from: "1.3.1", to: "1.4", label: "solves unweighted case of" },
      ],
    },
    flashcards: [
      { front: "How many edges does a tree with V vertices have, and why can't it have more?", back: "Exactly V−1. Adding any further edge creates a second path between two nodes, which is a cycle — and a tree is acyclic by definition.", difficulty: "easy", topic: "Tree Fundamentals" },
      { front: "You insert 1,2,3,…,n into an empty unbalanced BST. What is the cost of searching it?", back: "O(n). Sorted input makes every node a right child, so the tree degenerates into a linked list of height n.", difficulty: "medium", topic: "Binary Search Trees" },
      { front: "When would you choose an adjacency matrix over an adjacency list?", back: "When the graph is dense (E approaches V²) or you need O(1) 'is u adjacent to v?' queries. Lists win on sparse graphs and on iterating a vertex's neighbours.", difficulty: "medium", topic: "Graph Representation" },
      { front: "Why does BFS find shortest paths only in unweighted graphs?", back: "BFS orders vertices by edge count, so the first arrival uses the fewest edges. With weights, fewest edges is not the same as lowest cost, so you need Dijkstra.", difficulty: "medium", topic: "Graph Traversal" },
      { front: "Why does Dijkstra's algorithm break on negative edge weights?", back: "It finalises a vertex's distance the moment it is dequeued, assuming no cheaper route can appear later. A negative edge can produce exactly that, so the finalised value is wrong.", difficulty: "hard", topic: "Shortest Paths" },
      { front: "What does an in-order traversal of a BST produce?", back: "The keys in sorted ascending order — a direct consequence of the ordering invariant, and the cheapest way to check a BST is valid.", difficulty: "easy", topic: "Tree Fundamentals" },
      { front: "AVL or red-black: which for a write-heavy workload, and why?", back: "Red-black. Its looser balance needs fewer rotations per insert or delete. AVL is more rigidly balanced, which costs more on writes but gives slightly faster lookups.", difficulty: "hard", topic: "Balanced Trees" },
      { front: "How do you detect a cycle in a directed graph?", back: "Run DFS and look for a back edge — an edge to a vertex currently on the recursion stack. Equivalently, attempt a topological sort: it fails precisely when a cycle exists.", difficulty: "medium", topic: "Graph Traversal" },
    ],
    mcqs: [
      {
        question: "Keys 10, 20, 30, 40, 50 are inserted in that order into an empty unbalanced BST. What is the resulting height?",
        options: ["log₂(5) ≈ 2", "5", "3", "1"],
        correct_index: 1,
        explanation:
          "Each key exceeds all before it, so every node becomes the right child of its predecessor — a linked list of height 5. The distractor log₂(5) assumes balance, which nothing here provides; that assumption is exactly the trap.",
        topic: "Binary Search Trees",
        difficulty: "medium",
      },
      {
        question: "Which traversal of a binary search tree visits keys in ascending sorted order?",
        options: ["Pre-order", "Post-order", "In-order", "Level-order"],
        correct_index: 2,
        explanation:
          "In-order visits left subtree, node, then right subtree, which matches the BST invariant exactly. Level-order is tempting because it looks organised, but it groups by depth and ignores key ordering entirely.",
        topic: "Tree Fundamentals",
        difficulty: "easy",
      },
      {
        question: "A graph has 10,000 vertices and roughly 30,000 edges. Which representation should you choose?",
        options: [
          "Adjacency matrix, for O(1) edge lookup",
          "Adjacency list, because the graph is sparse",
          "Edge list, because it uses the least memory",
          "Either — space is identical at this size",
        ],
        correct_index: 1,
        explanation:
          "A matrix needs 10⁸ entries; the list needs about 4×10⁴. With E far below V², the list wins decisively. O(1) edge lookup is real but rarely worth four orders of magnitude of memory.",
        topic: "Graph Representation",
        difficulty: "medium",
      },
      {
        question: "You need shortest paths in a weighted graph containing some negative edges but no negative cycles. Which algorithm?",
        options: ["Dijkstra with a binary heap", "Breadth-first search", "Bellman-Ford", "Depth-first search"],
        correct_index: 2,
        explanation:
          "Bellman-Ford relaxes every edge V−1 times and handles negative weights correctly. Dijkstra finalises distances greedily and is wrong here; BFS ignores weights altogether, and DFS does not compute shortest paths at all.",
        topic: "Shortest Paths",
        difficulty: "hard",
      },
      {
        question: "Which task is depth-first search, rather than breadth-first search, the natural basis for?",
        options: [
          "Finding the minimum number of edges between two vertices",
          "Topological sorting of a directed acyclic graph",
          "Finding all vertices within k edges of a source",
          "Level-order printing of a tree",
        ],
        correct_index: 1,
        explanation:
          "Topological sort falls out of DFS finish times. The other three are all distance- or level-oriented, which is exactly what BFS's queue gives you and what DFS's branch-first order destroys.",
        topic: "Graph Traversal",
        difficulty: "medium",
      },
      {
        question: "What is the time complexity of Dijkstra's algorithm implemented with a binary heap?",
        options: ["O(V²)", "O(V · E)", "O((V + E) log V)", "O(V + E)"],
        correct_index: 2,
        explanation:
          "Each vertex is extracted once at log V, and each edge may trigger one decrease-key at log V. O(V²) is the simple array implementation, and O(V·E) is Bellman-Ford — both are plausible-looking but describe different algorithms or implementations.",
        topic: "Shortest Paths",
        difficulty: "medium",
      },
    ],
    memes: [
      { template: "drake", captions: ["Average case O(log n)", "Worst case O(n) because you inserted sorted data"], topic: "Binary Search Trees" },
      { template: "distracted-boyfriend", captions: ["Adjacency matrix", "You, with 10,000 vertices", "Adjacency list"], topic: "Graph Representation" },
      { template: "two-buttons", captions: ["Use Dijkstra on negative weights", "Actually read the constraints"], topic: "Shortest Paths" },
      {
        template: "expanding-brain",
        captions: ["A tree is a data structure", "A tree is a graph", "A tree is a connected acyclic graph", "A tree is the only graph where recursion just works"],
        topic: "Tree Fundamentals",
      },
    ],
    resources: [
      { topic: "Binary Search Trees", title: "MIT 6.006: Introduction to Algorithms", url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/", source: "ocw.mit.edu", kind: "course", relevance: 0.95 },
      { topic: "Graph Traversal", title: "Breadth-First Search and Depth-First Search", url: "https://www.khanacademy.org/computing/computer-science/algorithms", source: "khanacademy.org", kind: "course", relevance: 0.86 },
      { topic: "Shortest Paths", title: "Dijkstra's Algorithm", url: "https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm", source: "en.wikipedia.org", kind: "article", relevance: 0.72 },
      { topic: "Balanced Trees", title: "Red-Black Trees in a Functional Setting", url: "https://www.cs.tufts.edu/~nr/cs257/archive/chris-okasaki/redblack99.pdf", source: "cs.tufts.edu", kind: "paper", relevance: 0.83 },
      { topic: "Graph Representation", title: "Graph Representations Compared", url: "https://cp-algorithms.com/graph/breadth-first-search.html", source: "cp-algorithms.com", kind: "article", relevance: 0.79 },
    ],
    community: {
      author: "Demo",
      description:
        "Interview-and-exam coverage of trees and graphs: BST degeneration, representation tradeoffs, BFS versus DFS, and when Dijkstra is the wrong call.",
      tags: ["computer-science", "algorithms", "interview", "dsa"],
    },
  },
];

declare module "graphlib" {
	class Graph<TNode, TEdge> {
		constructor(options?: GraphOptions);
		isDirected(): boolean;
		isMultigraph(): boolean;
		isCompound(): boolean;
		
		graph(): string;
		setGraph(label: string);
		
		nodeCount(): number;
		edgeCount(): number;
		
		setDefaultNodeLabel(label: TNode | ((id: string) => TNode)): void;
		setDefaultEdgeLabel(label: TEdge | ((v: string, w: string, name: string) => TEdge)): void;
		
		nodes(): string[];
		edges(): string[];
		sources(): string[];
		sinks(): string[];
		
		hasNode(id: string): boolean;
		node(id: string): TNode;
		setNode(id: string, label?: TNode): void;
		
		removeNode(id: string): Graph<TNode, TEdge>;
		predecessors(id: string): string[];
		successors(id: string): string[];
		neighbors(id: string): string[];
		
		inEdges(v: string, u?: string): Edge[];
		outEdges(v: string, u?: string): Edge[];
		nodeEdges(v: string, u?: string): Edge[];
		parent(v: string): string;
		children(v: string): string[];
		setParent(v: string, parent: string): Graph<TNode, TEdge>;
		
		hasEdge(v: string, w: string, name?: string): boolean;
		hasEdge(edgeObj: Edge): boolean;
		edge(v: string, w: string, name?: string): TEdge;
		edge(edgeObj: Edge): TEdge;
		setEdge(v: string, w: string, label?: TEdge, name?: string): void;
		setEdge(edgeObj: Edge, label?: TEdge): void;
		removeEdge(v: string, w: string): void;
		
	}
	interface GraphOptions {
		directed?: boolean;
		multigraph?: boolean;
		compound?: boolean;
	}
	interface Edge {
		v: string;
		w: string;
		name?: string;
	}
	module json {
		function write(graph: Graph<any, any>): {};
		function read(obj: {}): Graph<any, any>;
	}
	module alg {
		function components(graph: Graph<any, any>): string[][];
		function dijkstra(graph: Graph<any, any>, source: string, weight?: (edge: string) => number, edges?: (edge: string) => string[]): DijkstraResult;
		function dijkstraAll(graph: Graph<any, any>, weigth?: (edge: string) => number, edges?: (edge: string) => string[]): { [ source: string ]: DijkstraResult };
		function findCycles(graph: Graph<any, any>): string[][];
		function floydWarshall(graph: Graph<any, any>, weigth?: (edge: string) => number, edges?: (edge: string) => string[]): { [ source: string ]: DijkstraResult };
		function isAcyclic(graph: Graph<any, any>): boolean;
		function postorder(graph: Graph<any, any>, node: string): string[];
		function preorder(graph: Graph<any, any>, node: string): string[];
		function prim(graph: Graph<any, any>, weigth: (edge: string) => number): Graph<{}, {}>;
		function tarjan(graph: Graph<any, any>): string[][];
		function topsort(graph: Graph<any, any>): string[];
		
		interface DijkstraResult {
			[ node: string ]: { distance: number, predecessor?: string };
		}
	}
	const version: number;
}

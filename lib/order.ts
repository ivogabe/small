/// <reference path="../definitions/ref.d.ts" />
import { Graph, alg } from 'graphlib';
import project = require('./project');
import file = require('./file');

interface FileInput {
	file: file.SourceFile;
	groupName: string;
}
interface FileGroup {
	filenames: string[];
}

export function generateOrder(proj: project.Project) {
	const inputGraph = new Graph<FileInput, {}>({ directed: true });

	for (const file of proj.files) {
		inputGraph.setNode(file.filename, {
			file,
			groupName: undefined
		});
	}

	for (const file of proj.files) {
		for (const dependency of file.dependencies) {
			inputGraph.setEdge(file.filename, dependency.filename);
		}
	}

	const acyclicGraph = new Graph<FileGroup, {}>({ directed: true });

	for (const group of alg.tarjan(inputGraph)) {
		acyclicGraph.setNode(group[0], {
			filenames: group
		});

		for (const member of group) {
			inputGraph.node(member).groupName = group[0];
		}
	}

	for (const filename of inputGraph.nodes()) {
		const groupName = inputGraph.node(filename).groupName;
		for (const edge of inputGraph.inEdges(filename)) {
			const otherGroup = inputGraph.node(edge.w).groupName;
			if (groupName !== otherGroup) acyclicGraph.setEdge(groupName, otherGroup);
		}
	}

	const order = alg.topsort(acyclicGraph);
	let index = 0;

	for (const groupName of order) {
		const group = acyclicGraph.node(groupName);
		const component: file.SourceFile[] = [];
		const cyclic = group.filenames.length !== 1;
		for (const filename of group.filenames) {
			const file = inputGraph.node(filename).file;
			if (cyclic) {
				file.hasCircularDependencies = true;
				file.connectedComponent = component;
				component.push(file);
			} else {
				file.hasCircularDependencies = false;
			}
			file.orderIndex = index++;
			proj.orderFiles.push(file);
		}
	}
}

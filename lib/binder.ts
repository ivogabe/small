import { SourceFile } from './file';
import { ImportNode, ExportNode, Binding } from './node';

export class Binder {
	private files: SourceFile[];

	constructor(files: SourceFile[]) {
		this.files = files;
		for (const file of this.files) {
			this.bindFile(file);
		}

		for (const file of this.files) {
			for (const node of file.exportNodes) {
				this.bindExport(node);
			}
		}

		for (const file of this.files) {
			for (const node of file.importNodes) {
				this.bindImport(node);

				if (!node.targetFile) continue; // global module

				if (file.dependencies.indexOf(node.targetFile) === -1) {
					file.dependencies.push(node.targetFile);
				}
				if (node.targetFile.dependants.indexOf(file) === -1) {
					node.targetFile.dependants.push(file);
				}
			}
		}
	}

	private bindFile(file: SourceFile) {
		for (const importNode of file.importNodes) {
			importNode.file = file;
			for (const reference of importNode.references) {
				reference.file = file;
			}
		}
		for (const exportNode of file.exportNodes) {
			exportNode.file = file;
		}
	}

	private findExports(file: SourceFile, name: string) {
		const nodes: ExportNode[] = [];
		for (const exportNode of file.exportNodes) {
			if (exportNode.name === name) {
				nodes.push(exportNode);
			}
		}
		return nodes;
	}
	private findExportedBinding(file: SourceFile, name: string) {
		for (const exportNode of file.exportNodes) {
			if (exportNode.name === name) {
				return exportNode.binding;
			}
		}
		return undefined;
	}

	private bindExport(node: ExportNode) {
		if (node.binding) return;
		const all = this.findExports(node.file, node.name);

		if (node.assignmentValue && !node.compoundAssignment) {
			// TODO: Check whether this node is a re-export, like
			// `exports.foo = require('foo');` or
			// `var foo = require('foo'); exports.foo = foo;`
		}

		const binding = new Binding(all);
		for (const exportNode of all) {
			exportNode.binding = binding;
		}
	}

	private bindImport(node: ImportNode) {
		if (node.targetFile === undefined) return;
		const binding = this.findExportedBinding(node.targetFile, node.dotArray[0]);
		if (binding) {
			node.binding = binding;
			for (const reference of node.references) {
				reference.binding = binding;
			}
		}
	}
}

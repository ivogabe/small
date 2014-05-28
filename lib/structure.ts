import project = require('./project');
import file = require('./file');

interface FindCommonParentResult {
	parent: file.SourceFile;
	level: number;
}

function findCommonParent(files: file.SourceFile[]): FindCommonParentResult {
	if (files.length === 0) return {
		parent: undefined,
		level: 0
	};

	var parent: file.SourceFile = files[0];
	var parentParents: file.SourceFile[];

	var setParentParents = () => {
		parentParents = [];
		var p = parent;
		while (p) {
			parentParents.push(p);
			p = p.structureParent;
		}
	};

	setParentParents();

	for (var i = 1; i < files.length; ++i) {
		var f = files[i];
		var p = f;

		while (p) {
			var ind = parentParents.indexOf(p);

			if (ind === -1) {
				p = p.structureParent;
			} else {
				parent = p;
				setParentParents();
				break;
			}
		}
	}

	return {
		parent: parent,
		level: parentParents.length
	};
}

export function generateStructure(proj: project.Project) {
	var files = proj.orderFiles;

	for (var i = files.length - 1; i>=0; --i) {
		var f = files[i];

		var commonParent = findCommonParent(f.dependants.filter((item) => {
			return item.orderIndex > i;
		}));

		f.structureParent = commonParent.parent;
		f.structureLevel = commonParent.level;

		if (f.structureParent) f.structureParent.structureChildren.splice(0, 0, f);
	}
}

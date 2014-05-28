import project = require('./project');
import file = require('./file');

export function generateOrder(proj: project.Project) {
	var unhandledFiles: file.SourceFile[] = [].concat(proj.files);

	var prev: file.SourceFile;
	var nextPrev: file.SourceFile;
	var deleteIndex: number;
	var ok: boolean;

	var index = 0;

	while (unhandledFiles.length !== 0) {
		ok = false;

		for (var i = 0; i < unhandledFiles.length; ++i) {
			var f = unhandledFiles[i];

			// Remove previous file from unhandled dependencies.
			var ind = f.unhandledDependencies.indexOf(prev);
			if (ind !== -1) f.unhandledDependencies.splice(ind, 1);

			// If there are no unhandledDependencies
			if (!ok && f.unhandledDependencies.length === 0) {
				ok = true;
				deleteIndex = i;
				nextPrev = f;
				f.orderIndex = index++;
				proj.orderFiles.push(f);
			}
		}

		prev = nextPrev;

		if (ok) {
			unhandledFiles.splice(deleteIndex, 1);
		} else {
			// Circular dependencies
			// TODO: Implement circular dependencies
			proj.emit('error', Error('Circular dependencies are not yet supported'));
			proj.failed = true;
			return;
		}
	}
}

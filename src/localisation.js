const { FluentBundle, FluentResource } = require("@fluent/bundle");
const { opendirSync, openSync, readFileSync } = require("fs");

const LOCALISATION_PATH = './localisation';

const localisation_dir = opendirSync(LOCALISATION_PATH);

const bundles = {};

while (dirent = localisation_dir.readSync()) {
	if (dirent.isDirectory()) {
		const name = dirent.name;
		bundles[name] = new FluentBundle(name, {useIsolating: false});
		dir = opendirSync(`${LOCALISATION_PATH}/${name}`);
		while (dirent = dir.readSync()) {
			if (dirent.isFile()) {
				const resource = new FluentResource(readFileSync(`${LOCALISATION_PATH}/${name}/${dirent.name}`, {encoding: "utf8"}));
				const errors = bundles[name].addResource(resource);
				if (errors.length) {
					console.log(errors);
				}
			}
		}
		dir.close();
	}
}

localisation_dir.close();

module.exports = bundles;

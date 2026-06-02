"use strict";

const assert = require("node:assert/strict");

const { sortCacheFiles } = require("../component/cache-index-sort");

const files = [
	{ name: "beta.html", path: "cache/beta.html", modifiedMs: 20 },
	{ name: "alpha.html", path: "cache/alpha.html", modifiedMs: 30 },
	{ name: "gamma.html", path: "cache/gamma.html", modifiedMs: 10 },
];

assert.deepEqual(
	sortCacheFiles(files, { field: "time", direction: "asc" }).map(file => file.name),
	["gamma.html", "beta.html", "alpha.html"],
	"time ascending should put older files first"
);

assert.deepEqual(
	sortCacheFiles(files, { field: "time", direction: "desc" }).map(file => file.name),
	["alpha.html", "beta.html", "gamma.html"],
	"time descending should put newer files first"
);

assert.deepEqual(
	sortCacheFiles(files, { field: "name", direction: "asc" }).map(file => file.name),
	["alpha.html", "beta.html", "gamma.html"],
	"name ascending should sort A to Z"
);

assert.deepEqual(
	sortCacheFiles(files, { field: "name", direction: "desc" }).map(file => file.name),
	["gamma.html", "beta.html", "alpha.html"],
	"name descending should sort Z to A"
);

assert.deepEqual(
	files.map(file => file.name),
	["beta.html", "alpha.html", "gamma.html"],
	"sorting should not mutate the original file list"
);

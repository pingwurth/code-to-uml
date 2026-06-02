"use strict";

(function exposeCacheIndexSort(root) {
	function normalizedDirection(direction) {
		return direction === "desc" ? "desc" : "asc";
	}

	function compareNames(left, right) {
		const leftName = String((left && (left.name || left.path)) || "");
		const rightName = String((right && (right.name || right.path)) || "");
		return leftName.localeCompare(rightName, undefined, { numeric: true, sensitivity: "base" });
	}

	function compareTimes(left, right) {
		const leftTime = Number(left && left.modifiedMs) || 0;
		const rightTime = Number(right && right.modifiedMs) || 0;
		if (leftTime !== rightTime) return leftTime - rightTime;
		return compareNames(left, right);
	}

	function sortCacheFiles(files, sortState) {
		const state = sortState || {};
		const field = state.field === "name" ? "name" : "time";
		const direction = normalizedDirection(state.direction);
		const sign = direction === "desc" ? -1 : 1;
		const comparator = field === "name" ? compareNames : compareTimes;

		return (Array.isArray(files) ? files : []).slice().sort((left, right) => sign * comparator(left, right));
	}

	const api = { sortCacheFiles };
	if (typeof module !== "undefined" && module.exports) {
		module.exports = api;
	}
	root.CacheIndexSort = api;
})(typeof globalThis !== "undefined" ? globalThis : window);

"use strict";

(function exposeTocComponent(root) {
	function buildAnchor(item) {
		const anchor = document.createElement("a");
		anchor.href = item.href || "#";
		anchor.textContent = item.label || "";
		const level = Number(item.level || 0);
		if (level >= 2) {
			anchor.classList.add(`toc-level-${level}`);
		}
		if (typeof item.onClick === "function") {
			anchor.addEventListener("click", evt => {
				evt.preventDefault();
				item.onClick(item, evt);
			});
		}
		return anchor;
	}

	function render(options) {
		const {
			sideContainer,
			mobileContainer,
			titleText,
			titleLink,
			items
		} = options || {};

		if (!Array.isArray(items) || items.length === 0) {
			return;
		}

		if (sideContainer) {
			sideContainer.classList.add("toc");
			sideContainer.setAttribute("aria-label", "章节目录");
			sideContainer.innerHTML = "";

			const heading = document.createElement("h2");
			heading.textContent = titleText || "目录";
			if (titleLink && titleLink.href && titleLink.label) {
				const extra = document.createElement("a");
				extra.className = "toc-demo-link";
				extra.href = titleLink.href;
				extra.textContent = titleLink.label;
				heading.appendChild(document.createTextNode(" "));
				heading.appendChild(extra);
			}
			sideContainer.appendChild(heading);

			for (const item of items) {
				sideContainer.appendChild(buildAnchor(item));
			}
		}

		if (mobileContainer) {
			mobileContainer.classList.add("mobile-toc");
			mobileContainer.setAttribute("aria-label", "移动端章节目录");
			mobileContainer.innerHTML = "";
			for (const item of items) {
				mobileContainer.appendChild(buildAnchor(item));
			}
		}
	}

	function setActive(sideContainer, href) {
		if (!sideContainer) return;
		const targetHref = String(href || "");
		const anchors = sideContainer.querySelectorAll('a[href^="#"]');
		for (const anchor of anchors) {
			const currentHref = anchor.getAttribute("href");
			const isActive = Boolean(targetHref) && currentHref === targetHref;
			anchor.classList.toggle("is-active", isActive);
			if (isActive) {
				anchor.setAttribute("aria-current", "location");
			} else {
				anchor.removeAttribute("aria-current");
			}
		}
	}

	root.PlantUmlToc = { render, setActive };
})(typeof window !== "undefined" ? window : globalThis);

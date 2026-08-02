import { fromHtmlIsomorphic } from "hast-util-from-html-isomorphic";
import { toText } from "hast-util-to-text";
import { createMermaidRenderer } from "mermaid-isomorphic";
import { visitParents } from "unist-util-visit-parents";

const nonWhitespacePattern = /\w/;

function isMermaidCode(element) {
  if (!element || element.tagName !== "code") {
    return false;
  }
  const className = element.properties?.className;
  const classes =
    typeof className === "string"
      ? className.trim().split(/\s+/)
      : Array.isArray(className)
        ? className
        : [];
  return classes.includes("language-mermaid");
}

export default function rehypeMermaidDualTheme(options = {}) {
  const renderer = createMermaidRenderer(options);

  return (ast, file) => {
    const instances = [];

    visitParents(ast, "element", (node, ancestors) => {
      if (!isMermaidCode(node)) {
        return;
      }

      const parent = ancestors.at(-1);
      let inclusiveAncestors = ancestors;

      if (parent.type === "element" && parent.tagName === "pre") {
        for (const child of parent.children) {
          if (child.type === "text") {
            if (nonWhitespacePattern.test(child.value)) {
              return;
            }
          } else if (child !== node) {
            return;
          }
        }
      } else {
        inclusiveAncestors = [...inclusiveAncestors, node];
      }

      instances.push({
        diagram: toText(node, { whitespace: "pre" }),
        ancestors: inclusiveAncestors,
      });
    });

    if (!instances.length) {
      return;
    }

    const diagrams = instances.map((instance) => instance.diagram);
    const mermaidConfig = options.mermaidConfig;

    return Promise.all([
      renderer(diagrams, {
        ...options,
        prefix: "mermaid",
        mermaidConfig: { theme: "default", ...mermaidConfig },
      }),
      renderer(diagrams, {
        ...options,
        prefix: "mermaid-dark",
        mermaidConfig: { theme: "dark", ...mermaidConfig },
      }),
    ]).then(([lightResults, darkResults]) => {
      for (const [index, instance] of instances.entries()) {
        const light = lightResults[index];
        const dark = darkResults[index];
        const node = instance.ancestors.at(-1);
        const parent = instance.ancestors.at(-2);
        const nodeIndex = parent.children.indexOf(node);

        if (light.status === "rejected" || dark.status === "rejected") {
          file.message(
            light.status === "rejected" ? light.reason : dark.reason,
            node,
            "rehype-mermaid-dual",
          );
          continue;
        }

        const lightSvg = fromHtmlIsomorphic(light.value.svg, {
          fragment: true,
        }).children[0];
        const darkSvg = fromHtmlIsomorphic(dark.value.svg, {
          fragment: true,
        }).children[0];

        lightSvg.properties.className = ["mermaid-theme-light"];
        darkSvg.properties.className = ["mermaid-theme-dark"];

        parent.children[nodeIndex] = {
          type: "element",
          tagName: "div",
          properties: { className: ["mermaid"] },
          children: [lightSvg, darkSvg],
        };
      }
    });
  };
}

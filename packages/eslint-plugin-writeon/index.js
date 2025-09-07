"use strict";

module.exports = {
  rules: {
    // Disallow direct DOM access APIs; prefer refs within React components
    "no-direct-dom-manipulation": {
      meta: { type: "problem", docs: { description: "Disallow direct DOM manipulation" } },
      create(context) {
        return {
          MemberExpression(node) {
            const txt = context.getSourceCode().getText(node);
            if (/document\.(getElementById|querySelector|querySelectorAll)/.test(txt)) {
              context.report({ node, message: "Avoid direct DOM access; use refs instead." });
            }
            if (/window\.document\./.test(txt)) {
              context.report({ node, message: "Avoid window.document usage; use refs instead." });
            }
          },
        };
      },
    },

    // Warn when accessing Zustand store internals directly
    "store-access-via-hooks": {
      meta: { type: "suggestion", docs: { description: "Prefer using store hooks, avoid getState/subscribe directly" } },
      create(context) {
        const filename = context.getFilename().replace(/\\/g, "/");
        const allow = /\/src\/state\//.test(filename) || /WorkspaceErrorBoundary\.tsx$/.test(filename);
        if (allow) return {};
        return {
          MemberExpression(node) {
            const prop = node.property && node.property.name;
            if (prop === "getState" || prop === "setState" || prop === "subscribe") {
              context.report({ node, message: "Access stores via hooks and actions; avoid direct {{prop}}() calls.", data: { prop } });
            }
          },
        };
      },
    },

    // Prevent arbitrary CSS transform application outside allowed components
    "no-unauthorized-transform": {
      meta: { type: "problem", docs: { description: "Only specific components may set CSS transform" } },
      create(context) {
        const filename = context.getFilename();
        const allowed = /WorkspaceViewport\.tsx$|WorkspaceScaler\.tsx$/;
        const isAllowedFile = allowed.test(filename);
        return {
          JSXAttribute(node) {
            if (!isAllowedFile && node.name && node.name.name === "style") {
              const value = node.value && node.value.expression;
              if (value && value.properties) {
                const hasTransform = value.properties.some((p) => p.key && p.key.name === "transform");
                if (hasTransform) {
                  context.report({ node, message: "Only WorkspaceViewport/WorkspaceScaler may set CSS transform." });
                }
              }
            }
          },
        };
      },
    },

    // Heuristic: Components importing CanvasMount should also import WorkspaceErrorBoundary
    "require-canvas-error-boundary": {
      meta: { type: "suggestion", docs: { description: "Ensure canvas is wrapped with an error boundary" } },
      create(context) {
        let importsCanvasMount = false;
        let importsBoundary = false;
        return {
          ImportDeclaration(node) {
            if (/CanvasMount/.test(node.source.value)) importsCanvasMount = true;
            if (/WorkspaceErrorBoundary/.test(node.source.value)) importsBoundary = true;
          },
          'Program:exit'() {
            if (importsCanvasMount && !importsBoundary) {
              context.report({ loc: { line: 1, column: 0 }, message: "Files using CanvasMount should import and wrap with WorkspaceErrorBoundary." });
            }
          },
        };
      },
    },

    // Enforce use[Name]Store for hooks and [Name]Store for types in src/state
    "store-naming-convention": {
      meta: { type: "suggestion", docs: { description: "State store naming conventions" } },
      create(context) {
        const filename = context.getFilename().replace(/\\/g, "/");
        const inState = /\/(src|packages)\/.*\/state\//.test(filename);
        return inState
          ? {
              ExportNamedDeclaration(node) {
                if (node.declaration) {
                  const decl = node.declaration;
                  if (decl.type === "FunctionDeclaration" && decl.id) {
                    const name = decl.id.name;
                    if (!/^use[A-Z].*Store$/.test(name)) {
                      context.report({ node: decl.id, message: "Store hooks should be named use[Name]Store (e.g., useViewportStore)." });
                    }
                  }
                  if ((decl.type === "TSTypeAliasDeclaration" || decl.type === "TSInterfaceDeclaration") && decl.id) {
                    const name = decl.id.name;
                    if (!/(Store|Actions|Slice)$/.test(name)) {
                      context.report({ node: decl.id, message: "Store types should end with Store/Actions/Slice." });
                    }
                  }
                }
              },
            }
          : {};
      },
    },

    // Hooks must follow use[Feature][Action] pattern in hooks directory
    "hook-naming-convention": {
      meta: { type: "suggestion", docs: { description: "Hooks naming convention" } },
      create(context) {
        const filename = context.getFilename().replace(/\\/g, "/");
        const inHooks = /\/(src|packages)\/.*\/hooks\//.test(filename);
        return inHooks
          ? {
              FunctionDeclaration(node) {
                // only check top-level exported functions
                const isTopLevel = node.parent && node.parent.type === "Program";
                const isExported = node && (node.type === "FunctionDeclaration") && (node.parent.body ? false : false);
                // simpler: only enforce when function name starts with 'use' or the file exports default a function
                if (isTopLevel && node.id && !/^use[A-Z]/.test(node.id.name)) {
                  context.report({ node: node.id, message: "Hook names should start with use[Feature][Action]." });
                }
              },
              // ignore inner variable function declarations to avoid flagging local handlers
            }
          : {};
      },
    },

    // Event prop names should follow on[Noun][Verb] (start with on + capital letter)
    "event-prop-naming": {
      meta: { type: "suggestion", docs: { description: "Event prop naming should be on[Noun][Verb]" } },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name && typeof node.name.name === "string") {
              const n = node.name.name;
              if (n.startsWith("on") && n.length > 2 && n[2] === n[2].toLowerCase()) {
                context.report({ node: node.name, message: "Event props should be named on[Noun][Verb] (capitalize after 'on')." });
              }
            }
          },
        };
      },
    },

    // In workspace components, enforce CSS class prefix `workspace-`
    "workspace-css-prefix": {
      meta: { type: "suggestion", docs: { description: "Require at least one 'workspace-' class in workspace components" } },
      create(context) {
        const filename = context.getFilename().replace(/\\/g, "/");
        const inWorkspace = /\/components\/workspace\//.test(filename);
        const excluded = /\/components\/workspace\/hooks\//.test(filename) || /WorkspaceProvider\.tsx$/.test(filename);
        if (!inWorkspace || excluded) return {};
        let found = false;
        let sawJSX = false;
        return {
          JSXOpeningElement() { sawJSX = true; },
          JSXAttribute(node) {
            if (node.name && node.name.name === "className") {
              const v = node.value;
              if (v && v.type === "Literal" && typeof v.value === "string") {
                if (/\bworkspace-/.test(v.value)) found = true;
              }
              if (v && v.type === "JSXExpressionContainer" && v.expression && v.expression.type === "TemplateLiteral") {
                const txt = v.expression.quasis.map(q => q.value.raw).join("");
                if (/workspace-/.test(txt)) found = true;
              }
            }
          },
          'Program:exit'() {
            if (sawJSX && !found) {
              context.report({ loc: { line: 1, column: 0 }, message: "At least one className should include the 'workspace-' prefix in workspace components." });
            }
          },
        };
      },
    },

    // In chrome components, enforce CSS class prefix `chrome-`
    "chrome-css-prefix": {
      meta: { type: "suggestion", docs: { description: "Require at least one 'chrome-' class in chrome components" } },
      create(context) {
        const filename = context.getFilename().replace(/\\/g, "/");
        const inChrome = /\/components\/chrome\//.test(filename);
        if (!inChrome) return {};
        let found = false;
        let sawJSX = false;
        return {
          JSXOpeningElement() { sawJSX = true; },
          JSXAttribute(node) {
            if (node.name && node.name.name === "className") {
              const v = node.value;
              if (v && v.type === "Literal" && typeof v.value === "string") {
                if (/\bchrome-/.test(v.value)) found = true;
              }
              if (v && v.type === "JSXExpressionContainer" && v.expression && v.expression.type === "TemplateLiteral") {
                const txt = v.expression.quasis.map(q => q.value.raw).join("");
                if (/chrome-/.test(txt)) found = true;
              }
            }
          },
          'Program:exit'() {
            if (sawJSX && !found) {
              context.report({ loc: { line: 1, column: 0 }, message: "At least one className should include the 'chrome-' prefix in chrome components." });
            }
          },
        };
      },
    },

    // Disallow transforms on elements with chrome-* classes
    "no-transform-on-chrome": {
      meta: { type: "problem", docs: { description: "Do not apply CSS transforms to chrome-* elements" } },
      create(context) {
        function hasChromeClass(classAttr) {
          if (!classAttr) return false;
          if (classAttr.type === "Literal" && typeof classAttr.value === "string") {
            return /\bchrome-/.test(classAttr.value);
          }
          return false;
        }
        function isTransformUtility(str) {
          return /(\btransform\b|\bscale-[^\s]+|\btranslate-[^\s]+|\brotate-[^\s]+|\bskew-[^\s]+|\borigin-[^\s]+)/.test(str);
        }
        return {
          JSXOpeningElement(node) {
            const attrs = node.attributes || [];
            const classAttr = attrs.find((a) => a.type === "JSXAttribute" && a.name && a.name.name === "className");
            if (!classAttr) return;
            const isChrome = hasChromeClass(classAttr.value);
            if (!isChrome) return;

            // Check inline style transform
            const styleAttr = attrs.find((a) => a.type === "JSXAttribute" && a.name && a.name.name === "style");
            if (styleAttr && styleAttr.value && styleAttr.value.expression && styleAttr.value.expression.properties) {
              const hasTransform = styleAttr.value.expression.properties.some((p) => p.key && p.key.name === "transform");
              if (hasTransform) {
                context.report({ node: styleAttr, message: "Do not apply CSS transform on chrome-* elements." });
              }
            }

            // Check Tailwind transform utilities in className
            if (classAttr.value && classAttr.value.type === "Literal" && typeof classAttr.value.value === "string") {
              const cls = classAttr.value.value;
              if (isTransformUtility(cls)) {
                context.report({ node: classAttr, message: "Do not use transform utilities on chrome-* elements." });
              }
            }
          },
        };
      },
    },

  },
};

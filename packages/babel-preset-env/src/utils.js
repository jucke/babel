// @flow

import semver from "semver";
import unreleasedLabels from "../data/unreleased-labels";
import { semverMin } from "./targets-parser";
import type { Targets } from "./types";

// Convert version to a semver value.
// 2.5 -> 2.5.0; 1 -> 1.0.0;
export const semverify = (version: string | number): string => {
  if (typeof version === "string" && semver.valid(version)) {
    return version;
  }

  const split = version.toString().split(".");

  while (split.length < 3) {
    split.push("0");
  }

  return split.join(".");
};

export const prettifyVersion = (version: string): string => {
  if (typeof version !== "string") {
    return version;
  }

  const parts = [semver.major(version)];
  const minor = semver.minor(version);
  const patch = semver.patch(version);

  if (minor || patch) {
    parts.push(minor);
  }

  if (patch) {
    parts.push(patch);
  }

  return parts.join(".");
};

export const prettifyTargets = (targets: Targets): Object => {
  return Object.keys(targets).reduce((results, target) => {
    let value = targets[target];

    const unreleasedLabel = unreleasedLabels[target];
    if (typeof value === "string" && unreleasedLabel !== value) {
      value = prettifyVersion(value);
    }

    results[target] = value;
    return results;
  }, {});
};

export const isUnreleasedVersion = (version: string, env: string): boolean => {
  const unreleasedLabel = unreleasedLabels[env];
  return (
    unreleasedLabel && unreleasedLabel === version.toString().toLowerCase()
  );
};

export const getLowestUnreleased = (
  a: string,
  b: string,
  env: string,
): string => {
  const unreleasedLabel = unreleasedLabels[env];
  const hasUnreleased = [a, b].some(item => item === unreleasedLabel);
  if (hasUnreleased) {
    return a === hasUnreleased ? b : a || b;
  }
  return semverMin(a, b);
};

export const filterStageFromList = (list: any, stageList: any) => {
  return Object.keys(list).reduce((result, item) => {
    if (!stageList[item]) {
      result[item] = list[item];
    }

    return result;
  }, {});
};

export const isPolyfillSource = (source: string): boolean =>
  source === "@babel/polyfill";

export const isRequire = (t: Object, path: Object): boolean =>
  t.isExpressionStatement(path.node) &&
  t.isCallExpression(path.node.expression) &&
  t.isIdentifier(path.node.expression.callee) &&
  path.node.expression.callee.name === "require" &&
  path.node.expression.arguments.length === 1 &&
  t.isStringLiteral(path.node.expression.arguments[0]) &&
  isPolyfillSource(path.node.expression.arguments[0].value);

const modulePathMap = {
  "regenerator-runtime": "regenerator-runtime/runtime",
};

export const getModulePath = (mod: string) =>
  modulePathMap[mod] || `core-js/modules/${mod}`;

export type RequireType = "require" | "import";

export const createImport = (
  t: Object,
  polyfill: string,
  requireType?: RequireType = "import",
): Object => {
  const modulePath = getModulePath(polyfill);

  if (requireType === "import") {
    const declar = t.importDeclaration([], t.stringLiteral(modulePath));
    declar._blockHoist = 3;
    return declar;
  }

  return t.expressionStatement(
    t.callExpression(t.identifier("require"), [t.stringLiteral(modulePath)]),
  );
};

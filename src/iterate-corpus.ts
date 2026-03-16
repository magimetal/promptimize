import { basename } from "node:path";
import { classifyDocument } from "./classify";
import type { DocClass } from "./types";

const DOC_CLASSES: DocClass[] = ["discipline", "guidance", "collaborative", "reference"];

export interface CorpusSplit {
  train: string[];
  holdOut: string[];
}

export function classifyFixturePath(filePath: string): DocClass {
  const fixtureName = basename(filePath).toLowerCase();
  if (fixtureName.startsWith("discipline-")) {
    return "discipline";
  }

  if (fixtureName.startsWith("guidance-")) {
    return "guidance";
  }

  if (fixtureName.startsWith("collaborative-")) {
    return "collaborative";
  }

  if (fixtureName.startsWith("reference-")) {
    return "reference";
  }

  return classifyDocument(filePath, "");
}

export function splitCorpus(
  files: string[],
  holdOutFraction: number,
  classifyFn: (filePath: string) => DocClass = classifyFixturePath,
): CorpusSplit {
  const grouped = new Map<DocClass, string[]>(DOC_CLASSES.map((docClass) => [docClass, []]));

  for (const file of files) {
    const docClass = classifyFn(file);
    const current = grouped.get(docClass);
    if (!current) {
      grouped.set(docClass, [file]);
      continue;
    }

    current.push(file);
  }

  const train: string[] = [];
  const holdOut: string[] = [];

  for (const docClass of DOC_CLASSES) {
    const classFiles = [...(grouped.get(docClass) ?? [])].sort((a, b) => a.localeCompare(b));
    if (classFiles.length === 0) {
      continue;
    }

    const computed = Math.max(1, Math.round(classFiles.length * holdOutFraction));
    const holdOutCount = classFiles.length === 1 ? 1 : Math.min(classFiles.length - 1, computed);
    const splitIndex = classFiles.length - holdOutCount;
    train.push(...classFiles.slice(0, splitIndex));
    holdOut.push(...classFiles.slice(splitIndex));
  }

  return {
    train,
    holdOut,
  };
}

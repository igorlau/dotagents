# Layers

Group the changed files of a diff into layers by dependency, such as types and contracts, core logic, callers, tests, then docs and config. A reader understands layer 1 on its own, and each later layer from the layers above it.

## Group the layers

- Derive each dependency from the imports and the diff. File A depends on file B when A imports, calls, links, or names something that the diff adds or changes in B. A folder name is a hint only.
- A layer holds whole files. Split a file into hunks only when it holds changes for 2 layers. List the file in both layers, each with its own hunks.
- Order the layers in the order that a reader must understand them. Each layer depends only on layers with a lower number. Merge 2 layers that depend on each other.

Show the layer map, one line per layer: the number, the name, and the files.

A grouping is done when each changed hunk is in exactly one layer, and no layer depends on a layer below it.

## Layers JSON

The `layers` array of a layers file has one object per layer, in layer order. Sort the keys. `dependsOn` has the 1-based numbers of the layers that a layer needs. Each finding names a file of its layer.

```json
[
  {
    "dependsOn": [],
    "files": ["src/types.ts"],
    "findings": [
      {
        "body": "**Scenario:** ...\n**Fix:** ...",
        "file": "src/types.ts",
        "kind": "correctness",
        "line": 42,
        "severity": "high",
        "summary": "One-line summary"
      }
    ],
    "name": "Contracts",
    "purpose": "One line"
  }
]
```

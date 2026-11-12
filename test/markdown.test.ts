import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { headingAnchors, headingSlug } from "../scripts/markdown.ts";

describe("headingSlug", () => {
  test("lowercases the heading and joins words with hyphens", () => {
    assert.equal(headingSlug("Add a skill"), "add-a-skill");
  });

  test("removes punctuation and backticks but keeps hyphens and underscores", () => {
    assert.equal(headingSlug("The `dot-flow` skill: make_sut, v1.0!"), "the-dot-flow-skill-make_sut-v10");
  });

  test("keeps the text of a link and drops its target", () => {
    assert.equal(headingSlug("See [the spec](SPEC.md)"), "see-the-spec");
  });

  test("keeps one hyphen for each space", () => {
    assert.equal(headingSlug("Install & update"), "install--update");
  });
});

describe("headingAnchors", () => {
  test("numbers repeated headings from 1", () => {
    assert.deepEqual(headingAnchors("# Notes\n## Notes\n### Notes\n"), new Set(["notes", "notes-1", "notes-2"]));
  });

  test("ignores headings inside fenced code blocks", () => {
    assert.deepEqual(headingAnchors("# Real\n```bash\n# comment\n```\n"), new Set(["real"]));
  });

  test("ignores headings inside fenced code blocks in a list item", () => {
    assert.deepEqual(headingAnchors("1. Step\n\n    ```bash\n    # comment\n    ```\n"), new Set());
  });

  test("removes a closing sequence of hashes but keeps a hash inside a word", () => {
    assert.deepEqual(headingAnchors("## Setup ##\n## C# tips\n"), new Set(["setup", "c-tips"]));
  });
});

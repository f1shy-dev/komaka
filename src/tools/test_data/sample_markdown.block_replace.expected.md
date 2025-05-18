# Markdown Test Document

This document is for testing various text manipulation features, specifically for the `edit_file_segment` tool.

## Section 1: Introduction

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

- Item 1
- Item 2
  - Sub-item 2.1
  - Sub-item 2.2
- Item 3

```typescript
// A code block for testing
function greet(name: string): string {
  return `Hello, ${name}!`;
}
const message = greet("World");
console.log(message);
```

## Section 2: Block Replacement Target

START_MARKER
**NEW CONTENT REPLACED THE OLD BLOCK**
This new block is also multi-line.
END_MARKER

This text is outside the block and should remain untouched.

## Section 3: Line Range Target

This section tests line range replacements.
Line A
Line B - Target for replacement
Line C - Target for replacement
Line D - Target for replacement
Line E
This is the end of the line range test section.

### Subsection 3.1

More content here.

## Section 4: Find and Replace

This document contains the word 'target' multiple times. We can use this to test find and replace functionality. Another target word is here. And one more target.

---

End of document. 
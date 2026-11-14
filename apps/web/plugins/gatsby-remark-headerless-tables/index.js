/**
 * A table with no header row.
 *
 * Markdown cannot write one: a pipe table is its header row, the rule under
 * it, and then the body, so a table of labels and values — which has nothing
 * to say over either column — gets written with the header's cells left
 * blank. Rendered as written, that is a row of empty header cells: a blank
 * band and a rule over the first real row for anyone looking, and "column
 * header, blank; column header, blank" for anyone listening.
 *
 * So a table whose header cells are all blank is rendered as what was meant.
 * The blank row is kept out of sight and out of the accessibility tree
 * (`hidden`; the renderer will not leave it out of the markup), and the first
 * cell of every row below it becomes that row's header, which is what a
 * label beside its value is.
 *
 * A plugin for gatsby-transformer-remark: it marks the markdown tree, and
 * the marks (`data.hName`, `data.hProperties`) are how a node asks the
 * renderer for a different element or an extra attribute.
 */
const textOf = node =>
  typeof node.value === 'string'
    ? node.value
    : (node.children || []).map(textOf).join('');

const isBlank = node => textOf(node).trim() === '';

const mark = (node, data) => {
  node.data = {
    ...node.data,
    ...data,
    hProperties: { ...(node.data || {}).hProperties, ...data.hProperties },
  };
};

const walk = (node, visit) => {
  visit(node);
  (node.children || []).forEach(child => walk(child, visit));
};

const markHeaderlessTables = tree => {
  walk(tree, node => {
    if (node.type !== 'table') return;
    const [head, ...rows] = node.children || [];
    if (!head || !head.children.length || !head.children.every(isBlank)) return;

    mark(head, { hProperties: { hidden: true } });
    for (const row of rows) {
      const [label] = row.children || [];
      // A row that opens on a blank cell has no label to be a header.
      if (label && !isBlank(label)) {
        mark(label, { hName: 'th', hProperties: { scope: 'row' } });
      }
    }
  });
  return tree;
};

module.exports = ({ markdownAST }) => markHeaderlessTables(markdownAST);
module.exports.markHeaderlessTables = markHeaderlessTables;

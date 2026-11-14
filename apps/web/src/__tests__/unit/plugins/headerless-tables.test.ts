// eslint-disable-next-line @typescript-eslint/no-require-imports
const plugin = require('../../../../plugins/gatsby-remark-headerless-tables');

/**
 * A pipe table cannot be written without a header row, so a table of labels
 * and values is written with a blank one. The plugin has it rendered as the
 * table that was meant: no header row to see or hear, and each row's label
 * as that row's header.
 */
interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

const text = (value: string): MdNode => ({ type: 'text', value });
const cell = (...children: MdNode[]): MdNode => ({
  type: 'tableCell',
  children,
});
const row = (...cells: MdNode[]): MdNode => ({
  type: 'tableRow',
  children: cells,
});
const table = (...rows: MdNode[]): MdNode => ({
  type: 'table',
  children: rows,
});
const root = (...children: MdNode[]): MdNode => ({ type: 'root', children });

describe('gatsby-remark-headerless-tables', () => {
  it('hides a blank header row and makes each row’s label its header', () => {
    const blank = row(cell(), cell(text('  ')));
    const first = row(cell(text('cold load')), cell(text('~21s')));
    const second = row(
      cell({ type: 'strong', children: [text('search')] }),
      cell(text('~26ms'))
    );
    plugin({ markdownAST: root(table(blank, first, second)) });

    expect(blank.data).toEqual({ hProperties: { hidden: true } });
    for (const body of [first, second]) {
      const [label, value] = body.children!;
      expect(label.data).toEqual({
        hName: 'th',
        hProperties: { scope: 'row' },
      });
      expect(value.data).toBeUndefined();
    }
  });

  it('leaves a table that has a header exactly as it was written', () => {
    const tree = root(
      table(
        row(cell(text('step')), cell()),
        row(cell(text('cold load')), cell(text('~21s')))
      )
    );
    const before = JSON.stringify(tree);
    plugin({ markdownAST: tree });
    expect(JSON.stringify(tree)).toBe(before);
  });

  it('gives no header to a row that opens on a blank cell', () => {
    const odd = row(cell(), cell(text('~21s')));
    plugin({ markdownAST: root(table(row(cell(), cell()), odd)) });
    expect(odd.children![0].data).toBeUndefined();
  });

  it('keeps what a node already asked the renderer for', () => {
    const head = row(cell(), cell());
    head.data = { hProperties: { className: 'kept' } };
    plugin({ markdownAST: root(table(head)) });
    expect(head.data.hProperties).toEqual({ className: 'kept', hidden: true });
  });

  it('finds a table wherever it is nested, and returns the tree', () => {
    const head = row(cell(), cell());
    const tree = root({ type: 'blockquote', children: [table(head)] });
    expect(plugin({ markdownAST: tree })).toBe(tree);
    expect(head.data?.hProperties).toEqual({ hidden: true });
  });
});

// A module, so the names above are this file's own.
export {};

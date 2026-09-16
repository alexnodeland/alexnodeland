import { render, screen } from '@testing-library/react';
import React from 'react';
import { VOCABULARY } from '../../../config/linked-data';
import VocabPage from '../../../pages/vocab';

jest.mock('../../../components/seo', () => ({
  __esModule: true,
  default: ({
    title,
    alternates,
  }: {
    title?: string;
    alternates?: Array<{ href: string; type: string }>;
  }) => (
    <div
      data-testid="seo"
      data-title={title}
      data-alternates={alternates?.map(a => a.type).join(' ')}
    />
  ),
}));

jest.mock('../../../styles/index.scss', () => ({}));
jest.mock('../../../styles/vocab.scss', () => ({}));

describe('Vocab page', () => {
  it('defines every concept once, under a heading that carries its id', () => {
    const { container } = render(<VocabPage />);
    for (const concept of VOCABULARY.concepts) {
      const cards = container.querySelectorAll(`article#${concept.id}`);
      expect(cards).toHaveLength(1);
      expect(cards[0].querySelector('h3')).toHaveTextContent(concept.prefLabel);
      expect(cards[0]).toHaveTextContent(concept.definition);
    }
  });

  it('lists a collection under its own heading, pointing at a concept defined earlier', () => {
    const { container } = render(<VocabPage />);
    expect(
      Array.from(container.querySelectorAll('h2')).map(h => h.textContent)
    ).toEqual([
      ...VOCABULARY.collections.map(c => c.label),
      'where it is used',
    ]);
    // "music" is a post category and an audience; the audiences section
    // points at the definition rather than repeating it.
    const audiences = container.querySelector('#audiences-collection')!;
    expect(audiences.querySelectorAll('article#music')).toHaveLength(0);
    expect(audiences.querySelector('a[href="#music"]')).toBeInTheDocument();
  });

  it('links related concepts by fragment', () => {
    const { container } = render(<VocabPage />);
    const ai = container.querySelector('article#ai')!;
    expect(ai.querySelector('a[href="#ai-eng"]')).toHaveTextContent(
      'ai engineering'
    );
  });

  it('offers the scheme as Turtle and JSON-LD', () => {
    render(<VocabPage />);
    expect(screen.getByTestId('seo')).toHaveAttribute(
      'data-alternates',
      'text/turtle application/ld+json'
    );
    expect(screen.getByRole('link', { name: 'turtle' })).toHaveAttribute(
      'href',
      'https://alexnodeland.com/vocab.ttl'
    );
  });
});

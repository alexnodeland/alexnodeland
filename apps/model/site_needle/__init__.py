"""Fine-tunes Needle 2 into an intent router for alexnodeland.com.

The site's in-browser chat retrieves passages and hands them to a 1.2B
language model. This package trains the 14MB Needle 2 to sit in front of
that: it turns a visitor's question into one of five typed site tools, or
refuses it — off-topic, injected, and negated requests all come back as
the empty call. The corpus is derived from the site's own content, so the
model tracks the site: new post, new corpus, new model.
"""

__version__ = "0.1.0"

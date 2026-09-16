---
id: ai-engineer-08
family: ai-engineer
title: Senior Staff Applied AI Engineer, Context Retrieval
seniority: staff
years_experience: '10+'
employer_type: data-platform
work_mode: hybrid
travel: unspecified
retrieved: 2026-09-16
---

## About the role

A zero-to-one senior staff role at a large data and AI platform company, owning context retrieval for the company's AI agents across enterprise SaaS data sources. The role has two linked charters: build the retrieval stack (query understanding, content understanding, ranking, retrieval and evaluation), and build the search subagents on top of it that decide what context is needed, fetch it, and check whether what came back is sufficient. The engineer also sets multi-year technical direction and grows the team.

## Responsibilities

- Build the end-to-end retrieval system from scratch: query understanding, content understanding and indexing, hybrid retrieval, ranking and evaluation, and make the foundational architecture decisions
- Index and rank across structured assets (tables, columns, SQL queries, dashboards, code, notebooks, jobs) and unstructured content (docs, wikis, tickets, chat, images, video, audio), exploiting each modality's own signals
- Build connectors and retrieval adapters for the SaaS systems where enterprise knowledge lives, handling per-source freshness, permissions and ranking signals
- Serve two consumers at once: grounded, token-efficient, hallucination-resistant context for LLMs, and intuitive, explainable discovery for humans
- Build query rewriting, query decomposition, intent classification and entity resolution tuned for multi-turn agent queries
- Build pipelines that extract structure, entities, embeddings, summaries and metadata from every asset type and keep them fresh
- Design search subagents that plan multi-hop searches, route queries across sources, re-query when results are weak, ground claims in retrieved evidence, and report failure upstream when retrieval is insufficient
- Stand up an evaluation flywheel: offline IR metrics (nDCG, MRR, Recall@K, Precision@K), LLM-as-judge harnesses, human-in-the-loop labeling and online experimentation, extended to judge subagent decision quality
- Set the multi-year roadmap, mentor senior engineers and partner with research, product and platform leaders

## Required qualifications

- 10+ years of software engineering, with substantial time building production retrieval, search or RAG systems at scale
- Deep information retrieval expertise: lexical retrieval (BM25, Lucene/Elasticsearch/OpenSearch), dense retrieval (embeddings, ANN indexes such as FAISS, ScaNN, HNSW), hybrid retrieval and learning-to-rank
- Hands-on LLM-era retrieval experience: RAG architectures, query rewriting, cross-encoder re-ranking, long-context strategies and grounding techniques that reduce hallucination
- Experience designing agentic systems over retrieval: search planners, multi-hop / iterative retrieval, self-reflection and sufficiency checks, tool-using agents that verify results
- Strong relevance evaluation skills: nDCG, MRR, Precision@K, Recall@K, offline/online experimentation, LLM-as-judge frameworks and human labeling pipelines
- Experience indexing and ranking structured and unstructured data (tables, code, documents) in one system
- Track record of standing up a retrieval system from an empty repository and growing it into something customers rely on
- Technical leadership across teams, including mentoring senior engineers and influencing roadmap

## Preferred qualifications

- Retrieval over enterprise SaaS sources: permissions, freshness, multi-tenancy, ACL-aware indexing
- Background in agentic systems, tool use or multi-turn retrieval for LLM agents
- Open-source IR/search contributions or publications at venues such as SIGIR, KDD, WWW or EMNLP
- Experience training or fine-tuning embedding models, rerankers or query-understanding models

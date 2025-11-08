#!/usr/bin/env python3
"""
MVP converter: convert older extracted JSON (like .github/extractedtext.txt) into the
StudyStreak canonical raw schema (ai-service/schemas/raw_schema.json).

This is a heuristic MVP to bootstrap downstream pipeline stages. It should be replaced
by the proper extraction -> cleaning -> segmentation pipeline later.

Usage:
    python convert_extracted_to_canonical.py --in extractedtext.txt --out canonical.json

Notes:
- This script is intentionally conservative: it preserves source text and adds TODO flags
  where enrichment is required.
- It does not attempt heavy NLP enrichment; it organizes available fields into the
  canonical layout.
"""
import argparse
import json
import os
import uuid
from datetime import datetime


def mkid(prefix="id"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def split_into_units(text: str, min_tokens: int = 6):
    # Naive paragraph split; later replace with sentence tokenizer
    parts = [p.strip() for p in text.split('\n\n') if p.strip()]
    units = []
    for p in parts:
        tok = len(p.split())
        if tok < min_tokens:
            continue
        units.append(p)
    return units


def convert(input_path: str, output_path: str):
    with open(input_path, 'r', encoding='utf-8') as f:
        raw = json.load(f)

    # Build skeleton canonical object
    canonical = {
        "materialId": raw.get('doc', {}).get('materialId') or mkid('material'),
        "sourceMeta": {
            "filename": os.path.basename(input_path),
            "contentType": "text",
            "pageCount": None,
            "extractionMethod": "native",
            "language": "en",
        },
        "rawChunks": [],
        "cleanedUnits": [],
        "concepts": [],
        "sections": [],
        "summaryDraft": {},
        "flashcardsDraft": [],
        "quizDraft": [],
        "processingMeta": {
            "createdAt": datetime.utcnow().isoformat() + 'Z',
            "pipelineVersion": "v1.0-converter"
        }
    }

    # If doc.documentMarkdown exists, treat as main text
    doc = raw.get('doc', {})
    doc_md = doc.get('documentMarkdown') or doc.get('documentText') or ''

    if doc_md:
        # Create a rawChunk for whole doc
        canonical['rawChunks'].append({
            'id': mkid('c'),
            'text': doc_md,
            'page': None,
            'span': None
        })

        # Create cleanedUnits by splitting doc_md into paragraphs
        units = split_into_units(doc_md)
        for u in units:
            canonical['cleanedUnits'].append({
                'id': mkid('u'),
                'text': u,
                'tokens': len(u.split()),
                'origin': {'rawChunkId': canonical['rawChunks'][0]['id']}
            })

    # Try to extract cards if provided
    cards = raw.get('cards', {}).get('items') if raw.get('cards') else None
    if cards and isinstance(cards, list):
        for card in cards:
            term = card.get('term') or card.get('title') or card.get('shortDefinition')
            definition = card.get('definition') or card.get('fullDefinition') or card.get('shortDefinition')
            if not term and not definition:
                continue
            cid = mkid('k')
            canonical['concepts'].append({
                'id': cid,
                'term': term or f"Concept {cid}",
                'conceptType': 'DEFINITION',
                'shortDefinition': (definition[:200] + '...') if definition and len(definition) > 200 else (definition or ''),
                'fullDefinition': definition or '',
                'examples': card.get('bulletedHighlights') or [],
                'subtypes': [],
                'relatedIds': [],
                'importance': round(card.get('importance', 0.6), 2),
                'sourceSpan': card.get('sourceSpan') or None,
                'todoFlag': False
            })

    # If we didn't find concept cards, generate simple concepts from top cleanedUnits
    if not canonical['concepts'] and canonical['cleanedUnits']:
        for u in canonical['cleanedUnits'][:30]:  # limit
            text = u['text']
            # take first 12 words as term candidate
            words = text.split()
            term = ' '.join(words[:6])
            cid = mkid('k')
            canonical['concepts'].append({
                'id': cid,
                'term': term,
                'conceptType': 'SIMPLE',
                'shortDefinition': (text[:120] + '...') if len(text) > 120 else text,
                'fullDefinition': text,
                'examples': [],
                'subtypes': [],
                'relatedIds': [],
                'importance': 0.5,
                'sourceSpan': u.get('id'),
                'todoFlag': True
            })

    # Simple section grouping: cluster by heuristic headings if present
    # Look for lines starting with '##' in doc_md
    sections = []
    if doc_md and '##' in doc_md:
        lines = doc_md.splitlines()
        current = None
        current_concepts = []
        for line in lines:
            if line.startswith('##'):
                if current:
                    sections.append({'id': mkid('s'), 'title': current, 'icon': '📌', 'conceptIds': current_concepts})
                current = line.lstrip('#').strip()
                current_concepts = []
            else:
                # naive: if a concept term appears in the line, add
                for c in canonical['concepts']:
                    if c['term'] and c['term'] in line and c['id'] not in current_concepts:
                        current_concepts.append(c['id'])
        if current:
            sections.append({'id': mkid('s'), 'title': current, 'icon': '📌', 'conceptIds': current_concepts})

    # Fallback: create one section with all concepts
    if not sections:
        sections = [{'id': mkid('s'), 'title': 'Overview', 'icon': '📘', 'conceptIds': [c['id'] for c in canonical['concepts']]}]

    canonical['sections'] = sections

    # Create a lightweight summaryDraft from doc.doc.summary if present
    summary = doc.get('documentMarkdown') or doc.get('documentText') or ''
    if summary:
        # try to pick first 2 paragraphs
        paras = [p for p in summary.split('\n\n') if p.strip()]
        overview = paras[0] if paras else summary[:400]
        mainIdeas = [p.strip() for p in paras[1:4]] if len(paras) > 1 else []
        canonical['summaryDraft'] = {
            'overview': (overview[:1500] + '...') if len(overview) > 1500 else overview,
            'mainIdeas': mainIdeas,
            'keyTakeaway': mainIdeas[0] if mainIdeas else ''
        }

    # Output JSON
    with open(output_path, 'w', encoding='utf-8') as out:
        json.dump(canonical, out, indent=2, ensure_ascii=False)
    print(f"Wrote canonical file to: {output_path}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--in', dest='input', required=True, help='Input extracted JSON file')
    parser.add_argument('--out', dest='output', required=True, help='Output canonical JSON file')
    args = parser.parse_args()
    convert(args.input, args.output)

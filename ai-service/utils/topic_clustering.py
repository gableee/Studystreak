"""
Topic clustering using semantic embeddings.
Groups related concepts into thematic sections for better reviewer organization.
"""

import logging
import numpy as np
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from sentence_transformers import SentenceTransformer
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class TopicClusterer:
    """Cluster text segments into semantic topics using embeddings."""
    
    def __init__(self, embedding_model: Optional[SentenceTransformer] = None):
        """
        Initialize topic clusterer.
        
        Args:
            embedding_model: Pre-loaded SentenceTransformer model (optional)
        """
        self.model = embedding_model
        if self.model is None:
            logger.info("Loading embedding model for topic clustering...")
            self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    
    def cluster_text_segments(
        self,
        segments: List[str],
        min_clusters: int = 2,
        max_clusters: int = 8,
        similarity_threshold: float = 0.7
    ) -> Dict[int, List[int]]:
        """
        Cluster text segments by semantic similarity.
        
        Args:
            segments: List of text segments to cluster
            min_clusters: Minimum number of clusters (default: 2)
            max_clusters: Maximum number of clusters (default: 8)
            similarity_threshold: Threshold for merging clusters (default: 0.7)
        
        Returns:
            Dictionary mapping cluster_id -> list of segment indices
        """
        if len(segments) < min_clusters:
            # Not enough segments to cluster meaningfully
            return {0: list(range(len(segments)))}
        
        # Generate embeddings
        logger.info(f"Generating embeddings for {len(segments)} segments...")
        embeddings = self.model.encode(segments, show_progress_bar=False)
        
        # Determine optimal number of clusters
        n_clusters = min(max_clusters, max(min_clusters, len(segments) // 3))
        
        # Perform agglomerative clustering
        logger.info(f"Clustering into {n_clusters} groups...")
        clustering = AgglomerativeClustering(
            n_clusters=n_clusters,
            metric='cosine',
            linkage='average'
        )
        labels = clustering.fit_predict(embeddings)
        
        # Group segments by cluster
        clusters = defaultdict(list)
        for idx, label in enumerate(labels):
            clusters[int(label)].append(idx)
        
        return dict(clusters)
    
    def generate_cluster_labels(
        self,
        segments: List[str],
        clusters: Dict[int, List[int]],
        max_label_words: int = 3
    ) -> Dict[int, str]:
        """
        Generate descriptive labels for each cluster.
        
        Args:
            segments: Original text segments
            clusters: Cluster assignments (from cluster_text_segments)
            max_label_words: Maximum words in label (default: 3)
        
        Returns:
            Dictionary mapping cluster_id -> label
        """
        labels = {}
        
        for cluster_id, segment_indices in clusters.items():
            # Get all segments in this cluster
            cluster_segments = [segments[i] for i in segment_indices]
            
            # Generate label from most common keywords
            label = self._extract_cluster_label(cluster_segments, max_label_words)
            labels[cluster_id] = label
        
        return labels
    
    def cluster_keypoints(
        self,
        keypoints: List[Dict],
        target_sections: int = 5
    ) -> List[Dict]:
        """
        Cluster keypoints into thematic sections.
        
        Args:
            keypoints: List of keypoint dicts with 'text' or similar field
            target_sections: Target number of sections (default: 5)
        
        Returns:
            List of section dicts with 'title' and 'keypoints'
        """
        if not keypoints:
            return []
        
        # Extract text from keypoints
        texts = []
        for kp in keypoints:
            text = kp.get('text') or kp.get('term') or kp.get('definition') or str(kp)
            texts.append(text)
        
        # Cluster
        clusters = self.cluster_text_segments(
            texts,
            min_clusters=2,
            max_clusters=target_sections
        )
        
        # Generate labels
        labels = self.generate_cluster_labels(texts, clusters)
        
        # Build sections
        sections = []
        for cluster_id in sorted(clusters.keys()):
            section = {
                'title': labels[cluster_id],
                'keypoints': [keypoints[i] for i in clusters[cluster_id]]
            }
            sections.append(section)
        
        return sections
    
    def find_similar_segments(
        self,
        query: str,
        segments: List[str],
        top_k: int = 5,
        min_similarity: float = 0.6
    ) -> List[Tuple[int, str, float]]:
        """
        Find segments most similar to a query.
        
        Args:
            query: Query text
            segments: List of text segments to search
            top_k: Number of results to return (default: 5)
            min_similarity: Minimum similarity score (default: 0.6)
        
        Returns:
            List of (index, segment, similarity_score) tuples
        """
        # Generate embeddings
        query_embedding = self.model.encode([query], show_progress_bar=False)[0]
        segment_embeddings = self.model.encode(segments, show_progress_bar=False)
        
        # Compute similarities
        similarities = cosine_similarity([query_embedding], segment_embeddings)[0]
        
        # Get top-k above threshold
        results = []
        for idx, score in enumerate(similarities):
            if score >= min_similarity:
                results.append((idx, segments[idx], float(score)))
        
        # Sort by score descending and take top-k
        results.sort(key=lambda x: x[2], reverse=True)
        return results[:top_k]
    
    # Private helper methods
    
    def _extract_cluster_label(self, segments: List[str], max_words: int) -> str:
        """Extract a descriptive label from cluster segments."""
        # Combine all segments
        combined = ' '.join(segments)
        
        # Extract most frequent meaningful words (nouns, adjectives)
        words = combined.lower().split()
        
        # Filter out common stop words
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
            'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
        }
        
        # Count word frequencies (excluding stop words and short words)
        word_counts = defaultdict(int)
        for word in words:
            clean_word = word.strip('.,;:!?()[]{}""\'')
            if len(clean_word) > 3 and clean_word not in stop_words:
                word_counts[clean_word] += 1
        
        # Get top keywords
        if not word_counts:
            return "General Concepts"
        
        top_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
        keywords = [word for word, count in top_words[:max_words]]
        
        # Capitalize and format
        label = ' '.join(word.capitalize() for word in keywords)
        
        return label if label else "General Concepts"


class ReviewerSectionBuilder:
    """Build organized sections for student reviewers."""
    
    def __init__(self, clusterer: Optional[TopicClusterer] = None):
        """
        Initialize section builder.
        
        Args:
            clusterer: Pre-initialized TopicClusterer (optional)
        """
        self.clusterer = clusterer or TopicClusterer()
    
    def build_sections_from_keypoints(
        self,
        keypoints: List[Dict],
        target_sections: int = 5
    ) -> List[Dict]:
        """
        Build organized sections from flat keypoints list.
        
        Args:
            keypoints: List of keypoint dictionaries
            target_sections: Target number of sections (default: 5)
        
        Returns:
            List of section dicts with 'title', 'keypoints', 'icon'
        """
        # Cluster keypoints
        sections = self.clusterer.cluster_keypoints(keypoints, target_sections)
        
        # Add icons and clean up
        for section in sections:
            section['icon'] = self._assign_section_icon(section['title'])
            section['keypoint_count'] = len(section['keypoints'])
        
        # Sort sections by importance (size and keyword matching)
        sections = self._sort_sections_by_importance(sections)
        
        return sections
    
    def build_sections_from_text(
        self,
        text: str,
        target_sections: int = 5,
        min_segment_words: int = 30
    ) -> List[Dict]:
        """
        Build sections by analyzing and clustering raw text.
        
        Args:
            text: Input text to analyze
            target_sections: Target number of sections (default: 5)
            min_segment_words: Minimum words per segment (default: 30)
        
        Returns:
            List of section dicts
        """
        # Split into paragraphs/segments
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        # Filter by minimum length
        segments = [
            p for p in paragraphs
            if len(p.split()) >= min_segment_words
        ]
        
        if not segments:
            return []
        
        # Cluster segments
        clusters = self.clusterer.cluster_text_segments(
            segments,
            min_clusters=2,
            max_clusters=target_sections
        )
        
        # Generate labels
        labels = self.clusterer.generate_cluster_labels(segments, clusters)
        
        # Build sections
        sections = []
        for cluster_id in sorted(clusters.keys()):
            section_segments = [segments[i] for i in clusters[cluster_id]]
            
            section = {
                'title': labels[cluster_id],
                'icon': self._assign_section_icon(labels[cluster_id]),
                'content': '\n\n'.join(section_segments),
                'segment_count': len(section_segments)
            }
            sections.append(section)
        
        return sections
    
    def _assign_section_icon(self, title: str) -> str:
        """Assign an appropriate icon based on section title."""
        title_lower = title.lower()
        
        # Icon mapping based on keywords
        if any(word in title_lower for word in ['anatomy', 'structure', 'part', 'component']):
            return '🧬'
        elif any(word in title_lower for word in ['function', 'role', 'purpose', 'mechanism']):
            return '⚙️'
        elif any(word in title_lower for word in ['symptom', 'sign', 'disorder', 'disease', 'lesion']):
            return '🩺'
        elif any(word in title_lower for word in ['pathway', 'connection', 'circuit', 'network']):
            return '🔗'
        elif any(word in title_lower for word in ['test', 'exam', 'assessment', 'diagnosis']):
            return '🔬'
        elif any(word in title_lower for word in ['treatment', 'therapy', 'intervention']):
            return '💊'
        elif any(word in title_lower for word in ['definition', 'terminology', 'concept', 'term']):
            return '📚'
        elif any(word in title_lower for word in ['clinical', 'practice', 'application']):
            return '🏥'
        else:
            return '📌'  # Default icon
    
    def _sort_sections_by_importance(self, sections: List[Dict]) -> List[Dict]:
        """Sort sections by pedagogical importance."""
        def importance_score(section: Dict) -> float:
            score = 0.0
            title = section['title'].lower()
            
            # Anatomy/structure first
            if any(word in title for word in ['anatomy', 'structure', 'overview']):
                score += 10.0
            
            # Function/mechanism second
            if any(word in title for word in ['function', 'mechanism', 'role']):
                score += 8.0
            
            # Clinical/practical third
            if any(word in title for word in ['clinical', 'disorder', 'lesion', 'symptom']):
                score += 6.0
            
            # Size matters (but not too much)
            score += len(section.get('keypoints', [])) * 0.5
            
            return score
        
        return sorted(sections, key=importance_score, reverse=True)


# Convenience functions

def cluster_keypoints(keypoints: List[Dict], target_sections: int = 5) -> List[Dict]:
    """Cluster keypoints into thematic sections."""
    clusterer = TopicClusterer()
    return clusterer.cluster_keypoints(keypoints, target_sections)


def build_reviewer_sections(keypoints: List[Dict], target_sections: int = 5) -> List[Dict]:
    """Build organized reviewer sections from keypoints."""
    builder = ReviewerSectionBuilder()
    return builder.build_sections_from_keypoints(keypoints, target_sections)

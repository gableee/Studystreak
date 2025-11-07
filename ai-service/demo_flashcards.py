"""
Demo script for enhanced flashcard generator.
Shows examples of flashcard generation with different types of content.
"""

import sys
import os
import json

# Add parent directory to path to import models
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.flashcard_generator import FlashcardGenerator


# Sample texts for demonstration
SAMPLE_TEXTS = {
    "machine_learning": """
# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that enables computer systems to learn and improve from experience without being explicitly programmed.

## Types of Machine Learning

There are three main types of machine learning:

- **Supervised Learning**: The algorithm learns from labeled training data
- **Unsupervised Learning**: The algorithm finds patterns in unlabeled data
- **Reinforcement Learning**: The algorithm learns through trial and error

## Deep Learning

Deep learning is a subset of machine learning that uses neural networks with multiple layers. These neural networks are inspired by the structure of the human brain and can learn complex patterns in large amounts of data.

### Applications of Deep Learning

Deep learning has revolutionized many fields including computer vision, natural language processing, and speech recognition. Modern applications include self-driving cars, medical diagnosis, and language translation.

## Key Concepts

**Neural Networks**: Computational models inspired by biological neurons that process information through interconnected nodes.

**Training Data**: The dataset used to teach a machine learning model to make predictions or decisions.

**Overfitting**: A modeling error that occurs when a model learns the training data too well, including its noise and outliers.
""",
    
    "biology": """
# Cell Biology Fundamentals

## Cell Structure

Cells are the basic building blocks of all living organisms. The cell membrane is a semi-permeable barrier that controls what enters and exits the cell.

### Organelles

**Mitochondria** are the powerhouses of the cell, generating ATP through cellular respiration.

**Ribosomes** are molecular machines that synthesize proteins by translating messenger RNA.

**The Nucleus** contains the cell's genetic material (DNA) and controls cellular activities.

## Cellular Processes

### Photosynthesis

Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose. This process occurs in chloroplasts and requires carbon dioxide, water, and sunlight.

### Cell Division

**Mitosis** is the process of cell division that results in two identical daughter cells, each with the same number of chromosomes as the parent cell.

**Meiosis** is a type of cell division that produces four gametes (sex cells) with half the number of chromosomes, essential for sexual reproduction.

## Cellular Transport

**Osmosis** refers to the movement of water molecules across a semi-permeable membrane from an area of lower solute concentration to higher solute concentration.

**Active Transport** is the movement of molecules against their concentration gradient, requiring energy in the form of ATP.
""",
    
    "history": """
The Industrial Revolution began in Britain during the late 18th century and transformed society from an agrarian economy to an industrial one. This period saw the mechanization of textile production, the development of iron-making techniques, and the increased use of steam power.

The steam engine, improved by James Watt in the 1760s, became the driving force of the Industrial Revolution. It powered factories, locomotives, and ships, fundamentally changing transportation and manufacturing.

Working conditions in early factories were extremely harsh. Workers, including children, often labored 12-16 hours per day in dangerous conditions for minimal wages. This led to the rise of labor movements and eventually to labor reforms in the 19th century.

The revolution had profound social impacts. Urbanization accelerated as people moved from rural areas to cities seeking factory work. This rapid urban growth created overcrowding, poor sanitation, and public health challenges.

Technological innovations continued throughout the 19th century. The development of the telegraph revolutionized communication, allowing messages to be sent instantly across long distances. The railroad network expanded dramatically, connecting cities and facilitating trade.
"""
}


def print_separator(char='=', length=80):
    """Print a separator line."""
    print(char * length)


def demonstrate_flashcard_generation(text_name: str, text: str, num_cards: int = 8):
    """
    Generate and display flashcards for a given text.
    
    Args:
        text_name: Name/description of the text
        text: The text content
        num_cards: Number of flashcards to generate
    """
    print_separator()
    print(f"📚 GENERATING FLASHCARDS FOR: {text_name.upper()}")
    print_separator()
    print(f"\nText length: {len(text)} characters")
    print(f"Requested flashcards: {num_cards}\n")
    
    # Initialize generator
    generator = FlashcardGenerator()
    
    try:
        # Generate flashcards
        result = generator.generate_flashcards(text, num_cards=num_cards)
        
        # Display statistics
        print("📊 GENERATION STATISTICS:")
        print(f"   Total generated: {result['total_generated']}")
        print(f"   Filtered out: {result['filtered_count']}")
        print(f"   Final count: {result['count']}")
        print(f"   Average confidence: {result['confidence']:.2f}")
        print()
        
        # Display flashcards
        print_separator('-')
        print("🎴 GENERATED FLASHCARDS:")
        print_separator('-')
        
        for i, card in enumerate(result['flashcards'], 1):
            print(f"\n[CARD {i}]")
            print(f"📍 Source: {card['source_section']}")
            print(f"⭐ Confidence: {card['confidence']:.2f} | Importance: {card['importance_score']:.2f}")
            print()
            print(f"❓ FRONT:")
            print(f"   {card['front']}")
            print()
            print(f"✅ BACK:")
            # Wrap long text
            back_lines = card['back'].split('\n')
            for line in back_lines:
                if len(line) <= 75:
                    print(f"   {line}")
                else:
                    # Simple word wrap
                    words = line.split()
                    current_line = "   "
                    for word in words:
                        if len(current_line) + len(word) + 1 <= 75:
                            current_line += word + " "
                        else:
                            print(current_line.rstrip())
                            current_line = "   " + word + " "
                    if current_line.strip():
                        print(current_line.rstrip())
            print()
            print_separator('-')
        
        # Save to JSON for reference
        output_filename = f"flashcards_{text_name}.json"
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Flashcards saved to: {output_filename}\n")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Run demonstrations for all sample texts."""
    print("\n" + "=" * 80)
    print(" " * 20 + "ENHANCED FLASHCARD GENERATOR DEMO")
    print("=" * 80)
    print()
    print("This demo showcases the enhanced flashcard generation system with:")
    print("  • Document structure analysis (headings, definitions, lists)")
    print("  • TF-IDF importance ranking")
    print("  • Semantic deduplication")
    print("  • Quality filtering")
    print()
    
    # Generate flashcards for each sample text
    for text_name, text_content in SAMPLE_TEXTS.items():
        demonstrate_flashcard_generation(text_name, text_content, num_cards=8)
        print("\n")
    
    print_separator('=')
    print(" " * 25 + "DEMO COMPLETE")
    print_separator('=')
    print()


if __name__ == "__main__":
    main()

<?php
declare(strict_types=1);

namespace App\Utils;

/**
 * Parser for AI service JSON responses.
 * Transforms AI output into database-ready format.
 */
final class AiResponseParser
{
    /**
     * Parse summary response from AI service.
     * @param array<string,mixed> $aiResponse
     * @return array<string,mixed> Database-ready content
     */
    public static function parseSummary(array $aiResponse): array
    {
        // Expected AI response format:
        // {
        //   "summary": "The main text...",
        //   "word_count": 150,
        //   "confidence": 0.95
        // }
        
        $summary = isset($aiResponse['summary']) ? trim((string)$aiResponse['summary']) : '';
        $wordCount = isset($aiResponse['word_count']) ? (int)$aiResponse['word_count'] : null;
        $confidence = isset($aiResponse['confidence']) ? (float)$aiResponse['confidence'] : null;

        return [
            'text' => $summary,
            'word_count' => $wordCount,
            'confidence' => $confidence,
            'metadata' => $aiResponse, // Store full response for debugging
        ];
    }

    /**
     * Parse keypoints response from AI service.
     * @return array<string,mixed>
     */
    public static function parseKeyPoints(array $aiResponse): array
    {
        // Expected format:
        // {
        //   "keypoints": ["Point 1", "Point 2", ...],
        //   "count": 5,
        //   "confidence": 0.92
        // }

        $keypoints = [];
        if (isset($aiResponse['keypoints']) && is_array($aiResponse['keypoints'])) {
            $keypoints = array_values(array_filter(
                array_map('strval', $aiResponse['keypoints']),
                fn($point) => trim($point) !== ''
            ));
        }

        $confidence = isset($aiResponse['confidence']) ? (float)$aiResponse['confidence'] : null;

        return [
            'keypoints' => $keypoints,
            'count' => count($keypoints),
            'confidence' => $confidence,
            'metadata' => $aiResponse,
        ];
    }

    /**
     * Parse quiz response from AI service.
     * @return array<string,mixed>
     */
    public static function parseQuiz(array $aiResponse): array
    {
        // Expected format:
        // {
        //   "questions": [
        //     {
        //       "question": "What is...?",
        //       "options": ["A", "B", "C", "D"],
        //       "correct_answer": "B",
        //       "explanation": "Because..."
        //     }
        //   ],
        //   "confidence": 0.88
        // }

        $questions = [];
        if (isset($aiResponse['questions']) && is_array($aiResponse['questions'])) {
            foreach ($aiResponse['questions'] as $q) {
                if (!is_array($q)) {
                    continue;
                }

                $questions[] = [
                    'question' => isset($q['question']) ? trim((string)$q['question']) : '',
                    'options' => isset($q['options']) && is_array($q['options']) ? $q['options'] : [],
                    'correct_answer' => isset($q['correct_answer']) ? trim((string)$q['correct_answer']) : '',
                    'explanation' => isset($q['explanation']) ? trim((string)$q['explanation']) : null,
                ];
            }
        }

        $confidence = isset($aiResponse['confidence']) ? (float)$aiResponse['confidence'] : null;

        return [
            'questions' => $questions,
            'count' => count($questions),
            'confidence' => $confidence,
            'metadata' => $aiResponse,
        ];
    }

    /**
     * Parse flashcards response from AI service.
     * @return array<string,mixed>
     */
    public static function parseFlashcards(array $aiResponse): array
    {
        // Expected format:
        // {
        //   "flashcards": [
        //     {
        //       "front": "Question/Term",
        //       "back": "Answer/Definition"
        //     }
        //   ],
        //   "confidence": 0.90
        // }

        $flashcards = [];
        if (isset($aiResponse['flashcards']) && is_array($aiResponse['flashcards'])) {
            foreach ($aiResponse['flashcards'] as $card) {
                if (!is_array($card)) {
                    continue;
                }

                $flashcards[] = [
                    'front' => isset($card['front']) ? trim((string)$card['front']) : '',
                    'back' => isset($card['back']) ? trim((string)$card['back']) : '',
                ];
            }
        }

        $confidence = isset($aiResponse['confidence']) ? (float)$aiResponse['confidence'] : null;

        return [
            'flashcards' => $flashcards,
            'count' => count($flashcards),
            'confidence' => $confidence,
            'metadata' => $aiResponse,
        ];
    }

    /**
     * Generate content preview from parsed content (first 200 chars).
     */
    public static function generatePreview(array $content): ?string
    {
        // Try to extract meaningful text from different content types
        if (isset($content['text']) && is_string($content['text'])) {
            $text = trim($content['text']);
            return $text !== '' ? substr($text, 0, 200) : null;
        }

        if (isset($content['keypoints']) && is_array($content['keypoints']) && !empty($content['keypoints'])) {
            $first = (string)$content['keypoints'][0];
            return substr($first, 0, 200);
        }

        if (isset($content['questions']) && is_array($content['questions']) && !empty($content['questions'])) {
            $first = $content['questions'][0];
            if (is_array($first) && isset($first['question'])) {
                return substr((string)$first['question'], 0, 200);
            }
        }

        if (isset($content['flashcards']) && is_array($content['flashcards']) && !empty($content['flashcards'])) {
            $first = $content['flashcards'][0];
            if (is_array($first) && isset($first['front'])) {
                return substr((string)$first['front'], 0, 200);
            }
        }

        return null;
    }
}

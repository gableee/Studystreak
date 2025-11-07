"""
Test utility for extraction debug endpoints.

Usage:
    python test_extraction_debug.py <file_path>
    python test_extraction_debug.py --url <supabase_url>

Examples:
    python test_extraction_debug.py samples/sample.pdf
    python test_extraction_debug.py --url "https://xxx.supabase.co/storage/..."
"""

import asyncio
import httpx
import json
import sys
from pathlib import Path
from typing import Dict, Any


API_BASE = "http://localhost:8000"
__test__ = False


def print_section(title: str):
    """Print a formatted section header."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def analyze_result(result: Dict[str, Any]):
    """Analyze and print extraction results."""
    
    print_section("EXTRACTION SUMMARY")
    
    print(f"Success:           {result['success']}")
    print(f"Detected Format:   {result['detected_format']}")
    print(f"Extraction Method: {result['extraction_method']}")
    print(f"Word Count:        {result['word_count']}")
    print(f"Character Count:   {result['char_count']}")
    
    if result['pages']:
        print(f"Pages:             {result['pages']}")
    
    print_section("PERFORMANCE METRICS")
    
    metadata = result.get('metadata', {})
    
    if metadata.get('file_size_bytes'):
        size_mb = metadata['file_size_bytes'] / (1024 * 1024)
        print(f"File Size:         {size_mb:.2f} MB ({metadata['file_size_bytes']:,} bytes)")
    
    if metadata.get('download_time_ms'):
        print(f"Download Time:     {metadata['download_time_ms']:.0f} ms")
    
    if result.get('extraction_time_ms'):
        print(f"Extraction Time:   {result['extraction_time_ms']:.0f} ms")
    
    if metadata.get('total_time_ms'):
        print(f"Total Time:        {metadata['total_time_ms']:.0f} ms")
    
    print_section("QUALITY METRICS")
    
    if metadata.get('avg_words_per_page') is not None:
        avg_wpp = metadata['avg_words_per_page']
        print(f"Avg Words/Page:    {avg_wpp:.1f}")
        
        if avg_wpp < 10:
            print("  ⚠️  WARNING: Very low word density - likely scanned/image PDF")
        elif avg_wpp < 50:
            print("  ⚠️  CAUTION: Low word density - check for image content")
        else:
            print("  ✓  Good text density")
    
    if result['word_count'] < 20:
        print(f"  ⚠️  WARNING: Very low word count ({result['word_count']} words)")
    elif result['word_count'] < 50:
        print(f"  ⚠️  CAUTION: Low word count ({result['word_count']} words)")
    else:
        print(f"  ✓  Sufficient word count ({result['word_count']} words)")
    
    print_section("WARNINGS")
    
    warnings = result.get('warnings', [])
    if warnings:
        for i, warning in enumerate(warnings, 1):
            print(f"{i}. {warning}")
    else:
        print("✓ No warnings - extraction looks good!")
    
    print_section("TEXT PREVIEW")
    
    preview = result.get('text_preview', '')
    if preview:
        print(preview)
        if len(result.get('extracted_text', '')) > len(preview):
            print(f"\n... (showing first 500 chars of {len(result['extracted_text'])} total)")
    else:
        print("(No text extracted)")
    
    print_section("RAW METADATA")
    
    print(json.dumps(metadata, indent=2))


async def test_file_upload(file_path: str):
    """Test extraction using file upload endpoint."""
    
    path = Path(file_path)
    if not path.exists():
        print(f"❌ Error: File not found: {file_path}")
        return None
    
    print(f"📄 Testing extraction for: {path.name}")
    print(f"   File size: {path.stat().st_size / 1024:.1f} KB")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        with open(path, 'rb') as f:
            files = {'file': (path.name, f, 'application/octet-stream')}
            
            print(f"\n🔄 Uploading to {API_BASE}/extract/debug-extraction-no-auth...")
            
            try:
                response = await client.post(
                    f'{API_BASE}/extract/debug-extraction-no-auth',
                    files=files
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                print(f"❌ HTTP Error {e.response.status_code}:")
                print(e.response.text)
                return None
            except Exception as e:
                print(f"❌ Error: {e}")
                return None
    
    result = response.json()
    analyze_result(result)
    
    return result


async def test_url(url: str, content_type: str = None):
    """Test extraction using URL endpoint."""
    
    print(f"🔗 Testing extraction from URL:")
    print(f"   {url[:80]}{'...' if len(url) > 80 else ''}")
    
    payload = {'url': url}
    if content_type:
        payload['content_type'] = content_type
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        print(f"\n🔄 Sending request to {API_BASE}/extract/debug...")
        
        try:
            response = await client.post(
                f'{API_BASE}/extract/debug',
                json=payload
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            print(f"❌ HTTP Error {e.response.status_code}:")
            print(e.response.text)
            return None
        except Exception as e:
            print(f"❌ Error: {e}")
            return None
    
    result = response.json()
    analyze_result(result)
    
    return result


async def interactive_test():
    """Interactive mode for testing multiple files."""
    
    print_section("EXTRACTION DEBUG TOOL - Interactive Mode")
    print("\nCommands:")
    print("  file <path>        - Test local file")
    print("  url <url>          - Test URL extraction")
    print("  quit               - Exit")
    
    while True:
        try:
            cmd = input("\n> ").strip()
            
            if not cmd:
                continue
            
            if cmd.lower() in ('quit', 'exit', 'q'):
                print("👋 Goodbye!")
                break
            
            parts = cmd.split(maxsplit=1)
            
            if len(parts) < 2:
                print("❌ Invalid command. Use: file <path> or url <url>")
                continue
            
            command, arg = parts
            
            if command.lower() == 'file':
                await test_file_upload(arg)
            elif command.lower() == 'url':
                await test_url(arg)
            else:
                print(f"❌ Unknown command: {command}")
        
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"❌ Error: {e}")


def main():
    """Main entry point."""
    
    if len(sys.argv) < 2:
        print(__doc__)
        print("\n💡 Tip: Run without arguments for interactive mode")
        
        try:
            asyncio.run(interactive_test())
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
        
        return
    
    if sys.argv[1] == '--url' and len(sys.argv) >= 3:
        url = sys.argv[2]
        content_type = sys.argv[3] if len(sys.argv) >= 4 else None
        asyncio.run(test_url(url, content_type))
    elif sys.argv[1] == '--interactive' or sys.argv[1] == '-i':
        asyncio.run(interactive_test())
    else:
        file_path = sys.argv[1]
        asyncio.run(test_file_upload(file_path))


if __name__ == "__main__":
    main()

"""
Supabase storage client for fetching files from learning-materials-v2 bucket.
"""

import logging
import os
from typing import Optional, BinaryIO
import httpx
from pathlib import Path

logger = logging.getLogger(__name__)


class SupabaseStorageClient:
    """Client for accessing Supabase storage buckets."""
    
    def __init__(
        self, 
        url: Optional[str] = None, 
        key: Optional[str] = None,
        bucket_name: str = "learning-materials-v2"
    ):
        """
        Initialize Supabase storage client.
        
        Args:
            url: Supabase project URL (default: from SUPABASE_URL env var)
            key: Supabase anon/service key (default: from SUPABASE_KEY env var)
            bucket_name: Storage bucket name (default: 'learning-materials-v2')
        """
        self.url = url or os.getenv('SUPABASE_URL')
        self.key = key or os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY')
        self.bucket_name = bucket_name
        
        if not self.url:
            raise ValueError("Supabase URL not provided. Set SUPABASE_URL environment variable.")
        if not self.key:
            raise ValueError("Supabase key not provided. Set SUPABASE_KEY environment variable.")
        
        # Remove trailing slash from URL
        self.url = self.url.rstrip('/')
        
        # Storage API endpoint
        self.storage_url = f"{self.url}/storage/v1"
        
        logger.info(f"✅ Supabase storage client initialized for bucket '{bucket_name}'")
    
    def download_file(self, file_path: str) -> bytes:
        """
        Download file from Supabase storage bucket.
        
        Args:
            file_path: Path to file in bucket (e.g., 'folder/document.pdf')
        
        Returns:
            File content as bytes
        """
        try:
            url = f"{self.storage_url}/object/{self.bucket_name}/{file_path}"
            
            headers = {
                'apikey': self.key,
                'Authorization': f'Bearer {self.key}'
            }
            
            logger.info(f"Downloading file: {file_path}")
            
            with httpx.Client(timeout=60.0) as client:
                response = client.get(url, headers=headers)
                response.raise_for_status()
                
                content = response.content
                logger.info(f"✅ Downloaded {len(content)} bytes from {file_path}")
                return content
        
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ HTTP error downloading {file_path}: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ Failed to download {file_path}: {e}")
            raise
    
    def download_file_to_path(self, file_path: str, local_path: str) -> str:
        """
        Download file and save to local path.
        
        Args:
            file_path: Path to file in bucket
            local_path: Local filesystem path to save file
        
        Returns:
            Local file path
        """
        try:
            content = self.download_file(file_path)
            
            # Create parent directory if needed
            Path(local_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(local_path, 'wb') as f:
                f.write(content)
            
            logger.info(f"✅ Saved to {local_path}")
            return local_path
        
        except Exception as e:
            logger.error(f"❌ Failed to save file to {local_path}: {e}")
            raise
    
    def list_files(self, prefix: str = "") -> list:
        """
        List files in bucket with optional prefix filter.
        
        Args:
            prefix: Optional prefix to filter files (e.g., 'folder/')
        
        Returns:
            List of file objects
        """
        try:
            url = f"{self.storage_url}/object/list/{self.bucket_name}"
            
            headers = {
                'apikey': self.key,
                'Authorization': f'Bearer {self.key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'prefix': prefix,
                'limit': 1000,
                'offset': 0
            }
            
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                
                files = response.json()
                logger.info(f"✅ Listed {len(files)} files with prefix '{prefix}'")
                return files
        
        except httpx.HTTPStatusError as e:
            logger.error(f"❌ HTTP error listing files: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"❌ Failed to list files: {e}")
            raise
    
    def file_exists(self, file_path: str) -> bool:
        """
        Check if file exists in bucket.
        
        Args:
            file_path: Path to file in bucket
        
        Returns:
            True if file exists, False otherwise
        """
        try:
            # Try to get file metadata using HEAD request
            url = f"{self.storage_url}/object/{self.bucket_name}/{file_path}"
            
            headers = {
                'apikey': self.key,
                'Authorization': f'Bearer {self.key}'
            }
            
            with httpx.Client(timeout=10.0) as client:
                response = client.head(url, headers=headers)
                return response.status_code == 200
        
        except Exception:
            return False
    
    def get_public_url(self, file_path: str) -> str:
        """
        Get public URL for a file (if bucket is public).
        
        Args:
            file_path: Path to file in bucket
        
        Returns:
            Public URL
        """
        return f"{self.storage_url}/object/public/{self.bucket_name}/{file_path}"


def get_storage_client(bucket_name: str = "learning-materials-v2") -> SupabaseStorageClient:
    """
    Factory function to get configured Supabase storage client.
    
    Args:
        bucket_name: Storage bucket name
    
    Returns:
        Configured SupabaseStorageClient instance
    """
    return SupabaseStorageClient(bucket_name=bucket_name)

"""
Playwright Wrapper with Auto-Repair Functionality

This module provides a robust wrapper around Playwright that automatically handles:
- Browser installation issues
- Version conflicts between Python and Node.js Playwright
- Environment separation 
- Automatic browser downloads when needed
"""

import os
import subprocess
import sys
import logging
from pathlib import Path
from typing import Optional
from playwright.sync_api import sync_playwright, Browser, Page

logger = logging.getLogger(__name__)


class PlaywrightWrapper:
    """Playwright wrapper with auto-repair functionality."""
    
    def __init__(self, browser_type: str = "webkit", headless: bool = True):
        self.browser_type = browser_type
        self.headless = headless
        self.playwright = None
        self.browser = None
        self._load_environment()
        self._ensure_browsers_installed()
    
    def _load_environment(self):
        """Load environment variables from .env.playwright."""
        env_file = Path(__file__).parent.parent / ".env.playwright"
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.replace('export ', '')
                        value = value.strip('"')
                        os.environ[key] = value
                        logger.debug(f"Set environment variable: {key}={value}")
    
    def _ensure_browsers_installed(self):
        """Ensure Playwright browsers are installed."""
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser_executable = getattr(p, self.browser_type).executable_path
                if browser_executable and os.path.exists(browser_executable):
                    logger.info(f"{self.browser_type} browser is available")
                    return
        except Exception as e:
            logger.warning(f"Browser check failed: {e}")
        
        logger.info(f"Installing {self.browser_type} browser...")
        self._install_browser()
    
    def _install_browser(self):
        """Install Playwright browser."""
        try:
            cmd = [sys.executable, "-m", "playwright", "install", self.browser_type]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info(f"Browser installation successful: {result.stdout}")
        except subprocess.CalledProcessError as e:
            logger.error(f"Browser installation failed: {e.stderr}")
            # Try installing with dependencies
            try:
                cmd = [sys.executable, "-m", "playwright", "install", "--with-deps", self.browser_type]
                result = subprocess.run(cmd, capture_output=True, text=True, check=True)
                logger.info(f"Browser installation with deps successful: {result.stdout}")
            except subprocess.CalledProcessError as e2:
                logger.error(f"Browser installation with deps failed: {e2.stderr}")
                raise RuntimeError(f"Failed to install {self.browser_type} browser")
    
    def __enter__(self):
        """Enter context manager."""
        try:
            self.playwright = sync_playwright().start()
            browser_launcher = getattr(self.playwright, self.browser_type)
            
            # Set launch options for M1 Mac compatibility
            launch_options = {
                "headless": self.headless
            }
            
            # Additional options for webkit on M1 Mac
            if self.browser_type == "webkit":
                launch_options.update({
                    "args": [
                        "--no-sandbox",
                        "--disable-web-security"
                    ]
                })
            
            self.browser = browser_launcher.launch(**launch_options)
            logger.info(f"Successfully launched {self.browser_type} browser")
            return self
            
        except Exception as e:
            logger.error(f"Failed to launch browser: {e}")
            # Try to repair and retry once
            if "Executable doesn't exist" in str(e):
                logger.info("Browser executable not found, attempting to install...")
                self._install_browser()
                try:
                    self.browser = getattr(self.playwright, self.browser_type).launch(**launch_options)
                    logger.info(f"Successfully launched {self.browser_type} browser after repair")
                    return self
                except Exception as e2:
                    logger.error(f"Failed to launch browser after repair: {e2}")
                    raise
            raise
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager."""
        if self.browser:
            self.browser.close()
            logger.debug("Browser closed")
        if self.playwright:
            self.playwright.stop()
            logger.debug("Playwright stopped")
    
    def new_page(self) -> Page:
        """Create a new page."""
        if not self.browser:
            raise RuntimeError("Browser not initialized. Use within context manager.")
        return self.browser.new_page()
    
    def get_browser(self) -> Browser:
        """Get the browser instance."""
        if not self.browser:
            raise RuntimeError("Browser not initialized. Use within context manager.")
        return self.browser


def create_playwright_wrapper(browser_type: str = "webkit", headless: bool = True) -> PlaywrightWrapper:
    """Factory function to create a PlaywrightWrapper instance."""
    return PlaywrightWrapper(browser_type=browser_type, headless=headless)


# Convenience functions for common usage patterns
def with_playwright(func):
    """Decorator to automatically handle Playwright setup and teardown."""
    def wrapper(*args, **kwargs):
        with create_playwright_wrapper() as pw:
            return func(pw, *args, **kwargs)
    return wrapper


if __name__ == "__main__":
    # Test the wrapper
    with create_playwright_wrapper() as pw:
        page = pw.new_page()
        page.goto("https://example.com")
        print(f"Page title: {page.title()}")
"""
Warmup Scheduler for maintaining Azure Web App and Cosmos DB connections
"""
import os
import threading
import time
import logging
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
root_env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(root_env_path)

# Configure logging
logger = logging.getLogger(__name__)


class WarmupScheduler:
    """
    定期的にwarmupを実行してAzure Web Appとデータベース接続を維持するスケジューラー
    """
    
    def __init__(self, interval_minutes: Optional[int] = None):
        """
        Initialize the warmup scheduler
        
        Args:
            interval_minutes: Warmup interval in minutes (default from env or 15)
        """
        # Get configuration from environment variables
        self.enabled = os.getenv('WARMUP_ENABLED', 'true').lower() == 'true'
        
        # Set interval (priority: parameter > env > default)
        if interval_minutes:
            self.interval_seconds = interval_minutes * 60
        else:
            env_interval = os.getenv('WARMUP_INTERVAL_MINUTES', '15')
            try:
                self.interval_seconds = int(env_interval) * 60
            except ValueError:
                logger.warning(f"Invalid WARMUP_INTERVAL_MINUTES: {env_interval}, using default 15 minutes")
                self.interval_seconds = 15 * 60
        
        self.running = False
        self.thread = None
        self._stop_event = threading.Event()
        
        logger.info(f"WarmupScheduler initialized - Enabled: {self.enabled}, Interval: {self.interval_seconds//60} minutes")
    
    def start(self):
        """
        Start the warmup scheduler in a background thread
        """
        if not self.enabled:
            logger.info("WarmupScheduler is disabled by configuration")
            return
        
        if self.running:
            logger.warning("WarmupScheduler is already running")
            return
        
        self.running = True
        self._stop_event.clear()
        
        # Start background thread as daemon
        self.thread = threading.Thread(target=self._run_warmup_loop, daemon=True)
        self.thread.start()
        
        logger.info(f"WarmupScheduler started - will run every {self.interval_seconds//60} minutes")
    
    def stop(self):
        """
        Stop the warmup scheduler gracefully
        """
        if not self.running:
            return
        
        logger.info("Stopping WarmupScheduler...")
        self.running = False
        self._stop_event.set()
        
        # Wait for thread to complete (max 5 seconds)
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)
        
        logger.info("WarmupScheduler stopped")
    
    def _run_warmup_loop(self):
        """
        Main loop that runs warmup periodically
        """
        logger.info("WarmupScheduler loop started")
        
        # Initial delay (30 seconds) to let the app fully start
        initial_delay = 30
        if self._stop_event.wait(initial_delay):
            return
        
        while self.running:
            try:
                self._execute_warmup()
            except Exception as e:
                # Log error but continue running
                logger.error(f"Error in warmup execution: {str(e)}", exc_info=True)
            
            # Wait for the interval or until stop event
            if self._stop_event.wait(self.interval_seconds):
                break
        
        logger.info("WarmupScheduler loop ended")
    
    def _execute_warmup(self):
        """
        Execute the actual warmup operation
        """
        start_time = time.time()
        logger.info(f"Executing scheduled warmup at {time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        try:
            # Import here to avoid circular dependencies
            from src.repositories.cosmos_repository import CosmosWriter
            
            # Create Cosmos DB connection and execute warmup
            cosmos_writer = CosmosWriter()
            result = cosmos_writer.warm_up()
            
            execution_time = time.time() - start_time
            
            if result['status'] == 'success':
                logger.info(
                    f"Scheduled warmup successful - "
                    f"Execution time: {execution_time:.2f}s, "
                    f"Items found: {result.get('items_found', 0)}"
                )
            else:
                logger.warning(
                    f"Scheduled warmup failed - "
                    f"Execution time: {execution_time:.2f}s, "
                    f"Error: {result.get('message', 'Unknown error')}"
                )
        
        except ImportError as e:
            logger.error(f"Failed to import required modules for warmup: {str(e)}")
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"Unexpected error in scheduled warmup - "
                f"Execution time: {execution_time:.2f}s, "
                f"Error: {str(e)}"
            )
    
    def force_warmup(self):
        """
        Force an immediate warmup execution (for testing or manual trigger)
        """
        logger.info("Force warmup requested")
        try:
            self._execute_warmup()
            return {'status': 'success', 'message': 'Forced warmup completed'}
        except Exception as e:
            logger.error(f"Force warmup failed: {str(e)}")
            return {'status': 'error', 'message': str(e)}


# Global instance (singleton pattern)
_scheduler_instance = None


def get_scheduler() -> WarmupScheduler:
    """
    Get the global warmup scheduler instance (singleton)
    
    Returns:
        WarmupScheduler: The global scheduler instance
    """
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = WarmupScheduler()
    return _scheduler_instance
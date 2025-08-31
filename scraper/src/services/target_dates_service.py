"""
Target dates service for managing target dates from Cosmos DB
"""
import logging
from datetime import datetime
from typing import List, Optional
from azure.cosmos import CosmosClient, exceptions
from ..config.settings import get_settings
from ..domain.entities import TargetDate
from ..domain.exceptions import CosmosDBError, ValidationError


logger = logging.getLogger(__name__)


class TargetDatesService:
    """Service for managing target dates"""
    
    def __init__(self):
        self.settings = get_settings()
        self._client = None
        self._database = None
        self._target_dates_container = None
        
    def _get_client(self):
        """Get or create Cosmos client"""
        if self._client is None:
            self._client = CosmosClient(
                self.settings.cosmos_endpoint,
                self.settings.cosmos_key
            )
            self._database = self._client.get_database_client(
                self.settings.cosmos_database
            )
            self._target_dates_container = self._database.get_container_client(
                self.settings.cosmos_target_dates_container
            )
        return self._client
    
    def get_all_target_dates(self) -> List[TargetDate]:
        """
        Get all target dates from Cosmos DB
        
        Returns:
            List of target dates sorted by date
        """
        try:
            self._get_client()
            
            # Query all target dates
            query = "SELECT * FROM c ORDER BY c.date"
            items = list(self._target_dates_container.query_items(
                query=query,
                enable_cross_partition_query=True
            ))
            
            # Convert to domain objects
            target_dates = []
            for item in items:
                target_date = TargetDate.from_cosmos(item)
                target_dates.append(target_date)
            
            logger.info(f"Retrieved {len(target_dates)} target dates")
            return target_dates
            
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Cosmos DB error getting target dates: {e.message}")
            raise CosmosDBError(f"Failed to get target dates: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error getting target dates: {str(e)}")
            raise CosmosDBError(f"Unexpected error: {str(e)}")
    
    def get_target_date(self, date: str) -> Optional[TargetDate]:
        """
        Get a specific target date
        
        Args:
            date: Date in YYYY-MM-DD format
            
        Returns:
            TargetDate if found, None otherwise
        """
        try:
            self._get_client()
            
            # Query for specific date
            item = self._target_dates_container.read_item(
                item=date,
                partition_key=date
            )
            
            if item:
                return TargetDate.from_cosmos(item)
            return None
            
        except exceptions.CosmosResourceNotFoundError:
            logger.debug(f"Target date not found: {date}")
            return None
        except Exception as e:
            logger.error(f"Failed to get target date {date}: {str(e)}")
            return None
    
    def add_target_date(self, date: str, label: str) -> TargetDate:
        """
        Add a new target date
        
        Args:
            date: Date in YYYY-MM-DD format
            label: Label for the date
            
        Returns:
            Created TargetDate
        """
        try:
            self._get_client()
            
            # Create target date item
            item = {
                'id': date,
                'date': date,
                'label': label,
                'updatedAt': datetime.utcnow().isoformat() + 'Z'
            }
            
            # Insert to Cosmos DB
            created = self._target_dates_container.create_item(body=item)
            
            logger.info(f"Added target date: {date} - {label}")
            return TargetDate.from_cosmos(created)
            
        except exceptions.CosmosResourceExistsError:
            logger.warning(f"Target date already exists: {date}")
            raise ValidationError(f"Target date {date} already exists")
        except Exception as e:
            logger.error(f"Failed to add target date: {str(e)}")
            raise CosmosDBError(f"Failed to add target date: {str(e)}")
    
    def delete_target_date(self, date: str) -> bool:
        """
        Delete a target date
        
        Args:
            date: Date in YYYY-MM-DD format
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            self._get_client()
            
            # Delete from Cosmos DB
            self._target_dates_container.delete_item(
                item=date,
                partition_key=date
            )
            
            logger.info(f"Deleted target date: {date}")
            return True
            
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(f"Target date not found: {date}")
            return False
        except Exception as e:
            logger.error(f"Failed to delete target date: {str(e)}")
            return False
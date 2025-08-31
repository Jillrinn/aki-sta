"""
Cosmos DB service for data persistence
"""
import logging
from typing import List, Optional
from azure.cosmos import CosmosClient, exceptions
from ..config.settings import get_settings
from ..domain.entities import AvailabilityData, Facility
from ..domain.exceptions import CosmosDBError


logger = logging.getLogger(__name__)


class CosmosService:
    """Service for Cosmos DB operations"""
    
    def __init__(self):
        self.settings = get_settings()
        self._client = None
        self._database = None
        self._availability_container = None
        
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
            self._availability_container = self._database.get_container_client(
                self.settings.cosmos_availability_container
            )
        return self._client
    
    def save_availability(self, availability_data: AvailabilityData) -> bool:
        """
        Save availability data to Cosmos DB
        
        Args:
            availability_data: Availability data to save
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self._get_client()
            
            for facility in availability_data.facilities:
                # Convert to Cosmos format
                item = facility.to_cosmos_dict(availability_data.date)
                
                # Upsert to Cosmos DB
                self._availability_container.upsert_item(body=item)
                logger.debug(f"Saved to Cosmos DB: {availability_data.date} - {facility.facility_name}")
            
            logger.info(f"Saved {len(availability_data.facilities)} facilities for {availability_data.date}")
            return True
            
        except exceptions.CosmosHttpResponseError as e:
            logger.error(f"Cosmos DB error: {e.message}")
            raise CosmosDBError(f"Failed to save to Cosmos DB: {e.message}")
        except Exception as e:
            logger.error(f"Unexpected error saving to Cosmos DB: {str(e)}")
            raise CosmosDBError(f"Unexpected error: {str(e)}")
    
    def get_availability(self, date: str) -> Optional[AvailabilityData]:
        """
        Get availability data for a specific date
        
        Args:
            date: Date in YYYY-MM-DD format
            
        Returns:
            AvailabilityData if found, None otherwise
        """
        try:
            self._get_client()
            
            # Query for the date
            query = f"SELECT * FROM c WHERE c.date = '{date}'"
            items = list(self._availability_container.query_items(
                query=query,
                enable_cross_partition_query=True
            ))
            
            if not items:
                return None
            
            # Convert to domain objects
            facilities = []
            for item in items:
                # Note: This is simplified. In production, you'd need proper conversion
                # from Cosmos format back to Facility objects
                pass
            
            return AvailabilityData(
                date=date,
                facilities=facilities
            )
            
        except Exception as e:
            logger.error(f"Failed to get availability for {date}: {str(e)}")
            return None
    
    def delete_availability(self, date: str) -> bool:
        """
        Delete availability data for a specific date
        
        Args:
            date: Date in YYYY-MM-DD format
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self._get_client()
            
            # Query for items to delete
            query = f"SELECT c.id, c.partitionKey FROM c WHERE c.date = '{date}'"
            items = list(self._availability_container.query_items(
                query=query,
                enable_cross_partition_query=True
            ))
            
            # Delete each item
            for item in items:
                self._availability_container.delete_item(
                    item=item['id'],
                    partition_key=item['partitionKey']
                )
            
            logger.info(f"Deleted {len(items)} items for {date}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete availability for {date}: {str(e)}")
            return False
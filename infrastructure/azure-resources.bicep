@description('The environment name (e.g., dev, staging, production)')
@allowed([
  'dev'
  'staging'
  'production'
])
param environment string = 'production'

@description('The location for all resources')
param location string = resourceGroup().location

@description('The base name for resources')
param baseName string = 'aki-sta'

// Variables
var uniqueString = substring(uniqueString(resourceGroup().id), 0, 6)
var resourceNamePrefix = '${baseName}-${environment}'
var cosmosAccountName = 'cosmos-${resourceNamePrefix}'
var functionAppName = 'func-${resourceNamePrefix}'
var appInsightsName = 'appi-${resourceNamePrefix}'
var staticWebAppName = 'swa-${resourceNamePrefix}'
var webAppScraperName = 'webapp-scraper-${environment}'
var appServicePlanScraperName = 'asp-scraper-${environment}'
var logicAppName = 'logic-${baseName}-scheduler'

// ============================================
// Application Insights
// ============================================
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Flow_Type: 'Bluefield'
    Request_Source: 'rest'
    RetentionInDays: 30
  }
}

// ============================================
// Cosmos DB Account
// ============================================
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
      maxStalenessPrefix: 100
      maxIntervalInSeconds: 5
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: 'studio-reservations'
  properties: {
    resource: {
      id: 'studio-reservations'
    }
  }
}

// Cosmos DB Containers
resource availabilityContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDatabase
  name: 'availability'
  properties: {
    resource: {
      id: 'availability'
      partitionKey: {
        paths: [
          '/date'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        automatic: true
        indexingMode: 'consistent'
      }
    }
  }
}

resource targetDatesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDatabase
  name: 'target_dates'
  properties: {
    resource: {
      id: 'target_dates'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
  }
}

resource rateLimitsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDatabase
  name: 'rate_limits'
  properties: {
    resource: {
      id: 'rate_limits'
      partitionKey: {
        paths: [
          '/date'
        ]
        kind: 'Hash'
      }
    }
  }
}

// ============================================
// Azure Functions App
// ============================================
resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|20'
      appSettings: [
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'COSMOS_ENDPOINT'
          value: cosmosAccount.properties.documentEndpoint
        }
        {
          name: 'COSMOS_KEY'
          value: cosmosAccount.listKeys().primaryMasterKey
        }
        {
          name: 'COSMOS_DATABASE'
          value: 'studio-reservations'
        }
        {
          name: 'NODE_ENV'
          value: environment
        }
      ]
      cors: {
        allowedOrigins: [
          'https://portal.azure.com'
          'https://${staticWebAppName}.azurestaticapps.net'
          'http://localhost:3300'
        ]
        supportCredentials: false
      }
    }
    httpsOnly: true
  }
}

// App Service Plan (Consumption)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: 'asp-${resourceNamePrefix}'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
    size: 'Y1'
    family: 'Y'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// ============================================
// Static Web Apps
// ============================================
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: staticWebAppName
  location: 'East Asia' // Static Web Apps は限られたリージョンでのみ利用可能
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: 'https://github.com/YOUR_GITHUB_ORG/aki-sta'
    branch: 'main'
    buildProperties: {
      appLocation: '/frontend'
      apiLocation: ''
      outputLocation: 'build'
    }
  }
}

// ============================================
// App Service Plan for Scraper (Free Tier)
// ============================================
resource appServicePlanScraper 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanScraperName
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
    size: 'F1'
    family: 'F'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// ============================================
// Web Apps for Scraper (Python)
// ============================================
resource webAppScraper 'Microsoft.Web/sites@2023-01-01' = {
  name: webAppScraperName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlanScraper.id
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      appSettings: [
        {
          name: 'COSMOS_ENDPOINT'
          value: cosmosAccount.properties.documentEndpoint
        }
        {
          name: 'COSMOS_KEY'
          value: cosmosAccount.listKeys().primaryMasterKey
        }
        {
          name: 'COSMOS_DATABASE'
          value: 'studio-reservations'
        }
        {
          name: 'FUNCTIONS_API_URL'
          value: 'https://${functionApp.properties.defaultHostName}'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
      ]
      cors: {
        allowedOrigins: [
          'https://${functionApp.properties.defaultHostName}'
        ]
      }
    }
    httpsOnly: true
  }
}

// ============================================
// Logic Apps Workflow
// ============================================
resource logicApp 'Microsoft.Logic/workflows@2019-05-01' = {
  name: logicAppName
  location: location
  properties: {
    state: 'Enabled'
    definition: {
      '$schema': 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#'
      contentVersion: '1.0.0.0'
      triggers: {
        Recurrence: {
          type: 'Recurrence'
          recurrence: {
            frequency: 'Day'
            interval: 1
            timeZone: 'Tokyo Standard Time'
            schedule: {
              hours: [
                '8'
                '17'
              ]
            }
          }
        }
      }
      actions: {
        HTTP: {
          type: 'Http'
          inputs: {
            method: 'POST'
            uri: 'https://${webAppScraper.properties.defaultHostName}/scrape'
            headers: {
              'Content-Type': 'application/json'
            }
            body: {
              triggeredBy: 'scheduler'
              dates: [
                '@{formatDateTime(utcNow(), \'yyyy-MM-dd\')}'
                '@{formatDateTime(addDays(utcNow(), 1), \'yyyy-MM-dd\')}'
                '@{formatDateTime(addDays(utcNow(), 2), \'yyyy-MM-dd\')}'
              ]
            }
          }
          runAfter: {}
        }
      }
    }
  }
}

// ============================================
// Outputs
// ============================================
output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output webAppScraperUrl string = 'https://${webAppScraper.properties.defaultHostName}'
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output logicAppName string = logicApp.name
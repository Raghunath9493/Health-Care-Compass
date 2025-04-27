/**
 * Data Service for HealthCare Compass
 * Handles loading and parsing CSV data
 */

class DataService {
  constructor() {
    this.hospitalsData = [];
    this.rawHospitalEntries = []; // Stores all entries from merged_data.csv
    this.hospitalStats = {}; // Stores statistics for each hospital
    this.dataLoaded = false;
  }

  /**
   * Load hospitals data from CSV
   * @returns {Promise} Promise that resolves when data is loaded
   */
  async loadHospitalsData() {
    try {
      // Fetch the CSV data
      const response = await fetch('data/merged_data.csv');
      const csvText = await response.text();
      
      // Parse CSV
      this.rawHospitalEntries = this.parseCSV(csvText);
      
      // Process the data
      this.processHospitalData();
      
      this.dataLoaded = true;
      return true;
    } catch (error) {
      console.error('Error loading hospitals data:', error);
      throw error;
    }
  }

  /**
   * Parse CSV text into array of objects
   * @param {string} csvText - CSV text to parse
   * @returns {Array} Array of objects representing CSV rows
   */
  parseCSV(csvText) {
    if (!csvText || typeof csvText !== 'string') {
      console.error('Invalid CSV data:', csvText);
      return [];
    }
    
    const lines = csvText.split('\n');
    if (lines.length < 2) {
      console.error('CSV data has insufficient lines:', lines.length);
      return [];
    }
    
    const headers = lines[0].split(',').map(header => header.trim());
    if (headers.length < 1) {
      console.error('CSV headers are invalid:', headers);
      return [];
    }
    
    return lines.slice(1)
      .filter(line => line && line.trim() !== '')
      .map(line => {
        const values = this.parseCSVLine(line);
        const entry = {};
        
        headers.forEach((header, index) => {
          if (header === 'BASE_ENCOUNTER_COST') {
            entry[header] = values[index] ? parseFloat(values[index]) : 0;
          } else if (header === 'UTILIZED') {
            entry[header] = values[index] ? parseInt(values[index], 10) : 0;
          } else if (header === 'LATITUDE' || header === 'LONGITUDE') {
            entry[header] = values[index] ? parseFloat(values[index]) : null;
          } else {
            entry[header] = values[index] || '';
          }
        });
        
        return entry;
      });
  }

  /**
   * Parse a single CSV line, handling quoted values correctly
   * @param {string} line - CSV line to parse
   * @returns {Array} Array of values
   */
  parseCSVLine(line) {
    if (!line) return [];
    
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    values.push(currentValue.trim()); // Add the last value
    return values;
  }

  /**
   * Process raw hospital entries to get unique hospitals with statistics
   */
  processHospitalData() {
    // Create a map to store unique hospitals and their statistics
    const hospitalMap = new Map();
    
    // Process each entry
    this.rawHospitalEntries.forEach(entry => {
      // Skip entries with missing required fields
      if (!entry.NAME || !entry.CITY) {
        console.warn('Skipping entry with missing NAME or CITY:', entry);
        return;
      }
      
      const hospitalKey = `${entry.NAME}-${entry.CITY}`;
      
      if (!hospitalMap.has(hospitalKey)) {
        // Validate coordinates
        const latitude = entry.LATITUDE;
        const longitude = entry.LONGITUDE;
        if (latitude !== null && longitude !== null) {
          if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            console.warn(`Invalid coordinates for ${entry.NAME}, ${entry.CITY}: LATITUDE=${latitude}, LONGITUDE=${longitude}`);
          }
        }
        
        // Create a new hospital entry
        hospitalMap.set(hospitalKey, {
          NAME: entry.NAME,
          ADDRESS: entry.ADDRESS || '',
          CITY: entry.CITY,
          LATITUDE: latitude !== null && !isNaN(latitude) ? latitude : null,
          LONGITUDE: longitude !== null && !isNaN(longitude) ? longitude : null,
          treatments: {},
          totalCases: 0,
          totalCost: 0,
          averageCost: 0,
          utilization: 0
        });
      }
      
      const hospital = hospitalMap.get(hospitalKey);
      
      // Count this treatment
      const treatment = entry.DESCRIPTION ? entry.DESCRIPTION.trim() : 'Unknown Treatment';
      if (!hospital.treatments[treatment]) {
        hospital.treatments[treatment] = {
          count: 0,
          totalCost: 0,
          averageCost: 0,
          utilization: 0
        };
      }
      
      const cost = parseFloat(entry.BASE_ENCOUNTER_COST) || 0;
      const utilization = parseInt(entry.UTILIZED) || 0;
      
      // Update treatment statistics
      hospital.treatments[treatment].count++;
      hospital.treatments[treatment].totalCost += cost;
      hospital.treatments[treatment].utilization += utilization;
      hospital.treatments[treatment].averageCost = 
        hospital.treatments[treatment].totalCost / hospital.treatments[treatment].count;
      
      // Update hospital statistics
      hospital.totalCases++;
      hospital.totalCost += cost;
      hospital.utilization += utilization;
      hospital.averageCost = hospital.totalCost / hospital.totalCases;
    });
    
    // Convert map to array
    this.hospitalsData = Array.from(hospitalMap.values());
    
    // Log statistics for debugging
    console.log(`Processed ${this.hospitalsData.length} unique hospitals with ${this.rawHospitalEntries.length} total entries`);
    
    // Log hospitals with missing or invalid coordinates
    const missingCoords = this.hospitalsData.filter(h => h.LATITUDE === null || h.LONGITUDE === null);
    if (missingCoords.length > 0) {
      console.warn(`Hospitals with missing or invalid coordinates:`, missingCoords.map(h => `${h.NAME}, ${h.CITY}`));
    }
  }

  /**
   * Get unique treatment descriptions from all hospital data
   * @param {number} minCount - Minimum number of occurrences to include
   * @returns {Array} Array of unique treatment descriptions
   */
  getUniqueTreatmentDescriptions(minCount = 10) {
    const treatmentCounts = new Map();
    
    this.hospitalsData.forEach(hospital => {
      Object.keys(hospital.treatments || {}).forEach(treatment => {
        const count = treatmentCounts.get(treatment) || 0;
        treatmentCounts.set(treatment, count + hospital.treatments[treatment].count);
      });
    });
    
    return Array.from(treatmentCounts.entries())
      .filter(([_, count]) => count >= minCount)
      .sort((a, b) => b[1] - a[1])
      .map(([treatment]) => treatment);
  }

  /**
   * Get top hospitals by utilization
   * @param {number} limit - Maximum number of hospitals to return
   * @returns {Array} Top hospitals sorted by utilization
   */
  getTopHospitals(limit = 50) {
    const sortedHospitals = [...this.hospitalsData].sort((a, b) => {
      return (b.utilization || 0) - (a.utilization || 0);
    });
    
    return sortedHospitals.slice(0, limit);
  }

  /**
   * Get hospitals by treatment
   * @param {string} treatment - Treatment to filter by
   * @returns {Array} Hospitals that offer the specified treatment
   */
  getHospitalsByTreatment(treatment) {
    if (!treatment) return this.hospitalsData;
    
    return this.hospitalsData.filter(hospital => {
      return hospital.treatments && hospital.treatments[treatment];
    }).sort((a, b) => {
      const aUtil = a.treatments[treatment]?.utilization || 0;
      const bUtil = b.treatments[treatment]?.utilization || 0;
      return bUtil - aUtil;
    });
  }

  /**
   * Search hospitals by name, city, or treatment description
   * @param {string} query - Search query
   * @returns {Array} Filtered hospitals
   */
  searchHospitals(query) {
    if (!query) return this.hospitalsData;
    
    const searchTerms = query.toLowerCase().split(' ');
    
    const matchingHospitals = this.hospitalsData.filter(hospital => {
      const searchableText = `${hospital.NAME} ${hospital.CITY}`.toLowerCase();
      return searchTerms.some(term => searchableText.includes(term));
    });
    
    if (matchingHospitals.length > 0) {
      return matchingHospitals;
    }
    
    return this.hospitalsData.filter(hospital => {
      return Object.keys(hospital.treatments || {}).some(treatment => {
        const treatmentLower = treatment.toLowerCase();
        return searchTerms.some(term => treatmentLower.includes(term));
      });
    });
  }

  /**
   * Filter hospitals by location (city)
   * @param {string} location - Location to filter by
   * @returns {Array} Filtered hospitals
   */
  filterByLocation(location) {
    if (!location) return this.hospitalsData;
    
    const locationLower = location.toLowerCase();
    
    return this.hospitalsData.filter(hospital => 
      hospital.CITY && hospital.CITY.toLowerCase().includes(locationLower)
    );
  }

  /**
   * Search hospitals by treatment description and location
   * @param {string} treatment - Treatment description
   * @param {string} location - Location
   * @returns {Array} Filtered hospitals
   */
  searchByTreatmentAndLocation(treatment, location) {
    let results = this.hospitalsData;
    
    if (!treatment && !location) {
      return results;
    }
    
    if (treatment) {
      const treatmentLower = treatment.toLowerCase();
      results = results.filter(hospital => {
        if (hospital.NAME && hospital.NAME.toLowerCase().includes(treatmentLower)) {
          return true;
        }
        
        if (hospital.DESCRIPTION && hospital.DESCRIPTION.toLowerCase().includes(treatmentLower)) {
          return true;
        }
        
        return Object.keys(hospital.treatments || {}).some(t => 
          t.toLowerCase().includes(treatmentLower)
        );
      });
    }
    
    if (location) {
      const locationLower = location.toLowerCase();
      results = results.filter(hospital => 
        (hospital.ADDRESS && hospital.ADDRESS.toLowerCase().includes(locationLower)) ||
        (hospital.CITY && hospital.CITY.toLowerCase().includes(locationLower))
      );
    }
    
    return results;
  }

  /**
   * Get treatment cost for a specific hospital and treatment
   * @param {Object} hospital - Hospital object
   * @param {string} treatment - Treatment description
   * @returns {number} Average cost of the treatment
   */
  getTreatmentCost(hospital, treatment) {
    if (!hospital || !hospital.NAME || !hospital.CITY) {
      return 0;
    }
    
    const hospitalKey = `${hospital.NAME}-${hospital.CITY}`;
    const stats = this.hospitalStats[hospitalKey];
    
    if (!stats) return 0;
    
    if (treatment && stats.treatments && stats.treatments[treatment]) {
      return stats.treatments[treatment].averageCost;
    }
    
    if (treatment && stats.treatments) {
      const treatmentLower = treatment.toLowerCase();
      const matchingTreatment = Object.keys(stats.treatments).find(t => 
        t.toLowerCase().includes(treatmentLower)
      );
      
      if (matchingTreatment) {
        return stats.treatments[matchingTreatment].averageCost;
      }
    }
    
    return stats.averageCost || 0;
  }

  /**
   * Compare hospitals based on treatment costs
   * @param {Array} hospitals - Array of hospitals to compare
   * @param {string} treatment - Treatment description
   * @returns {Array} Hospitals with cost comparison data
   */
  compareHospitalCosts(hospitals, treatment) {
    if (!hospitals || hospitals.length === 0) return [];
    
    const comparisonData = hospitals.map(hospital => {
      const cost = this.getTreatmentCost(hospital, treatment);
      
      return {
        ...hospital,
        cost: cost,
        costCategory: this.getCostCategory(cost, hospitals.map(h => this.getTreatmentCost(h, treatment)))
      };
    });
    
    return comparisonData.sort((a, b) => a.cost - b.cost);
  }

  /**
   * Determine cost category (low, medium, high) based on relative costs
   * @param {number} cost - Cost to categorize
   * @param {Array} allCosts - All costs to compare against
   * @returns {string} Cost category ('low', 'medium', or 'high')
   */
  getCostCategory(cost, allCosts) {
    if (cost === undefined || cost === null || allCosts.length === 0) return 'medium';
    
    const validCosts = allCosts.filter(c => c !== null && c !== undefined);
    if (validCosts.length === 0) return 'medium';
    
    const sortedCosts = [...validCosts].sort((a, b) => a - b);
    const lowestCost = sortedCosts[0];
    const highestCost = sortedCosts[sortedCosts.length - 1];
    
    if (lowestCost === highestCost) return 'medium';
    
    const range = highestCost - lowestCost;
    const lowThreshold = lowestCost + (range * 0.33);
    const highThreshold = lowestCost + (range * 0.66);
    
    if (cost <= lowThreshold) return 'low';
    if (cost >= highThreshold) return 'high';
    return 'medium';
  }

  /**
   * Generate mock ratings for hospitals
   * @returns {void}
   */
  generateMockRatings() {
    this.hospitalsData.forEach(hospital => {
      hospital.rating = (3 + Math.random() * 2).toFixed(1);
      hospital.reviews = Math.floor(50 + Math.random() * 300);
    });
  }

  /**
   * Get unique cities from hospital data
   * @returns {Array} Array of unique city names
   */
  getUniqueCities() {
    const cities = new Set();
    this.hospitalsData.forEach(hospital => {
      if (hospital.CITY) {
        cities.add(hospital.CITY);
      }
    });
    return Array.from(cities).sort();
  }

  /**
   * Get user's current location using browser geolocation
   * @returns {Promise} Promise that resolves with user location coordinates
   */
  getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }

  /**
   * Calculate distance between two coordinates using the Haversine formula
   * @param {Object} coord1 - First coordinate {latitude, longitude}
   * @param {Object} coord2 - Second coordinate {latitude, longitude}
   * @returns {number} Distance in miles
   */
  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return null;
    
    const R = 3959; // Earth's radius in miles
    const lat1 = this.toRadians(coord1.latitude);
    const lat2 = this.toRadians(coord2.latitude);
    const deltaLat = this.toRadians(coord2.latitude - coord1.latitude);
    const deltaLon = this.toRadians(coord2.longitude - coord1.longitude);
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

// Create and export a singleton instance
const dataService = new DataService();